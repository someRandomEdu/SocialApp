import * as uuid from "uuid";
import { EntityTypes, UntypedId } from "../shared/id.ts";
import { createMessageSchema, modifyMessageSchema } from "../shared/message.ts";
import { HttpStatusCodes, ProblemDetail } from "../shared/net.ts";
import { createRoomInviteSchema, createRoomSchema, Room } from "../shared/room.ts";
import { err, isInteger, ok, toUnixSeconds } from "../shared/utils.ts";
import { AppService } from "./appService.ts";
import { DbMessage, dbMessageSchema, DbRoom, DbRoomMember, dbRoomMemberSchema, dbRoomSchema } from "./db.ts";
import { customJwtPayloadClaims, ServerService } from "./serverService.ts";
import { jwtVerify } from "jose";
import z, { xid } from "zod";
import { AccountService } from "./accountService.ts";
import { ClientToServerEvents, ServerToClientEvents, socketRoomNames } from "../shared/routes.ts";

export const roomInviteTokenSchema = z.object({
    iss: z.url(),
    sub: z.string(),
    aud: z.literal([EntityTypes.Account]),
    iat: z.int(),
    jti: z.string(),
    exp: z.int().exactOptional(),
    [customJwtPayloadClaims.subjectType]: z.literal([EntityTypes.Room])
});

export const invitationSchema = z.object({
    inviteCode: z.string()
});

/** The type of the object representing the JWT payload of a room invite JWT token. */
export type RoomInviteTokenPayload = z.infer<typeof roomInviteTokenSchema>;

export async function initRoomService(appService: AppService, serverService: ServerService, accountService: AccountService) {
    const e = appService.expressInstance;
    const route = "/rooms";
    const roomRepo = appService.dataSource.getRepository(dbRoomSchema);
    const roomMemberRepo = appService.dataSource.getRepository(dbRoomMemberSchema);
    const messageRepo = appService.dataSource.getRepository(dbMessageSchema);
    const io = appService.io;

    function toRoom({ id, name, isPublic, description, createdAt, ownerAccountId, ownerAccountOrigin }: DbRoom): Room {
        return {
            id,
            name,
            isPublic,
            createdAt,
            description,

            ownerAccount: {
                id: ownerAccountId,
                origin: ownerAccountOrigin
            }
        };
    }
    
    function isRoomOwner({ ownerAccountId, ownerAccountOrigin }: DbRoom, { id, origin }: UntypedId) {
        return ownerAccountId === id && ownerAccountOrigin === origin;
    }

    async function createRoomInviteToken({ id }: DbRoom, exp?: Date) {
        const payload: RoomInviteTokenPayload = { 
            iss: appService.origin, 
            sub: String(id), 
            aud: EntityTypes.Account,
            iat: toUnixSeconds(new Date()),
            jti: crypto.randomUUID(),
            [customJwtPayloadClaims.subjectType]: EntityTypes.Room
        };

        if (exp) {
            payload.exp = toUnixSeconds(exp);
        }

        return await serverService.signJwt({ alg: "Ed25519", typ: "JWT" }, payload);
    }

    async function verifyRoomInviteToken(token: string) {
        try {
            const { payload } = await jwtVerify(token, serverService.publicKey);
            const { iss, sub, aud } = payload;

            if (iss !== appService.origin) {
                return err(`Token comes from "${iss}", not "${appService.origin}"!`);
            }

            if (aud !== EntityTypes.Account) {
                return err(`Token is not for accounts!`);
            }

            const subType = payload[serverService.customJwtPayloadClaims.subjectType];

            if (subType !== EntityTypes.Room) {
                return err(`Token is of type ${subType}, not ${EntityTypes.Room}!`);
            }

            const id = Number(sub);
            const r = await roomRepo.findOneBy({ id });

            if (!r) {
                return err(`Can't find the room of this invite token!`);
            }

            return ok(r);
        } catch (e) {
            return err(String(e));
        }
    }

    const services = Object.freeze({
        async accountIsInRoom(account: UntypedId, roomId: number) {
            return await roomMemberRepo.findOneBy({
                accountId: account.id, accountOrigin: account.origin, roomId }) !== null;
        },

        async isPublicRoom(roomId: number) {
            const room = await roomRepo.findOneBy({ id: roomId });
            return room && room.isPublic;
        },

        async accountCanViewRoom(account: UntypedId, roomId: number) {
            return await this.isPublicRoom(roomId) || await this.accountIsInRoom(account, roomId);
        },

        async hasRoom(id: number) {
            return await roomRepo.findOneBy({ id }) !== null;
        },

        async findOneRoomBy(room: Partial<DbRoom>) {
            return await roomRepo.findOneBy(room);
        },

        async findRoomsBy(room: Partial<DbRoom>) {
            return await roomRepo.findBy(room);  
        },

        async roomMembersOf(roomId: number) {
            return await roomMemberRepo.findBy({ roomId });
        }
    } as const);

    io.on("connect", async (socket) => {
        const token = socket.handshake.auth.token;

        if (typeof token !== "string") {
            socket.disconnect();
            return;
        }

        const v = await accountService.verifyForeignAccountToken(token);

        if (!v.success) {
            socket.disconnect();
            return;
        }

        const { id, origin } = v.data;

        socket.on("onRequestListenRoom" satisfies keyof ClientToServerEvents, 
            async (rawRoomId, callback) => {
            const roomId = Number(rawRoomId);

            if (!Number.isInteger(roomId)) {
                callback(err("Invalid room Id!"));
                return;
            }

            const room = await roomRepo.findOneBy({ id: roomId });

            if (!room) {
                callback(err("Can't find a room with that specified Id!"));
                return;
            }

            if (!roomMemberRepo.findOneBy({ accountId: id, accountOrigin: origin }))
            {
                callback(err("Account hasn't joined this room!"));
                return;
            }

            await socket.join(socketRoomNames.room(roomId));
            callback(ok(toRoom(room)));
        });

        socket.on("onRequestLeaveRoom" satisfies keyof ClientToServerEvents,
            async (rawRoomId) => {
                const roomId = Number(rawRoomId);

                if (!isInteger(roomId)) {
                    return;
                }

                await socket.leave(socketRoomNames.room(roomId));
            }
        );
    });

    // creates a room invite
    e.post(`${route}/:id/invites`, async (req, res) => {
        const room = await roomRepo.findOneBy({ id: Number(req.params.id) });

        if (!room) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Room not found!"
            } satisfies ProblemDetail);
        }

        const v = await accountService.verifyRawForeignAccountToken(
            req.headers.authorization);

        if (!v.success) {
            return res.status(v.error.status).send(v.error);
        }

        const body = createRoomInviteSchema.safeParse(req.body);

        if (!body.success) {
            return res.status(HttpStatusCodes.BadRequest).send({
                status: HttpStatusCodes.BadRequest,
                title: `Invalid request body!`
            } satisfies ProblemDetail);
        }

        const { expireAt } = body.data;

        if (expireAt && expireAt.getTime() < Date.now()) {
            return res.status(HttpStatusCodes.BadRequest).send({
                status: HttpStatusCodes.BadRequest,
                title: `Invalid request body!`
            } satisfies ProblemDetail);
        }

        if (!isRoomOwner(room, v.data)) {
            return res.status(HttpStatusCodes.Forbidden).send({
                status: HttpStatusCodes.Forbidden,
                title: `Permission error!`,
                detail: `This account is not authorized for this action!`
            } satisfies ProblemDetail)
        }

        return res.status(HttpStatusCodes.Created).send(await createRoomInviteToken(room, expireAt));
    });

    // deletes a room invite
    e.delete(`${route}/:id/invites`, async (req, res) => {
        const room = await roomRepo.findOneBy({ id: Number(req.params.id) });

        if (!room) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Room not found!"
            } satisfies ProblemDetail);
        }

        const v = await accountService.verifyRawForeignAccountToken(req.headers.authorization);

        if (!v.success) {
            return res.status(v.error.status).send(v.error);
        }

        if (!isRoomOwner(room, v.data)) {
            return res.status(HttpStatusCodes.Forbidden).send({
                status: HttpStatusCodes.Forbidden,
                title: `Permission error!`,
                detail: `This account is not authorized for this action!`
            } satisfies ProblemDetail)
        }

        // TODO: Implement invite link revocation...
        return res.sendStatus(HttpStatusCodes.NoContent);
    });

    // gets all public rooms of a server
    e.get(`${route}/public`, async (_, res) => {
        return res.status(HttpStatusCodes.Ok).send((await roomRepo.findBy({ isPublic: true })).map(toRoom));
    });

    // gets rooms a user has joined in
    e.get(`${route}`, async (req, res) => {
        const v = await accountService.verifyRawForeignAccountToken(
            req.headers.authorization);

        if (!v.success) {
            return res.status(v.error.status).send(v.error);
        }
        
        const { id, origin } = v.data;

        const r = await roomRepo.createQueryBuilder("room")
            .innerJoin(dbRoomMemberSchema.options.name, "rm", `rm.${"roomId" satisfies keyof DbRoomMember} = room.${"id" satisfies keyof DbRoom}`)
            .where(`rm.${"accountId" satisfies keyof DbRoomMember} = :id`, { id })
            .andWhere(`rm.${"accountOrigin" satisfies keyof DbRoomMember} = :origin`, { origin })
            .getMany();

        return res.status(HttpStatusCodes.Ok).send(r.map(toRoom));
    });

    // creates a room
    e.post(`${route}`, async (req, res) => {
        const createRoomData = createRoomSchema.safeParse(req.body);

        if (!createRoomData.success) {
            return res.status(HttpStatusCodes.BadRequest).type("application/problem+json").send({
                status: HttpStatusCodes.BadRequest,
                title: `Badly formatted request body!`
            } satisfies ProblemDetail);
        }

        const v = await accountService.verifyRawForeignAccountToken(
            req.headers.authorization);

        if (!v.success) {
            return res.status(v.error.status).send(v.error);
        }
        
        // should be valid after successful validation...
        const { id, origin } = v.data;
        const { name, isPublic, description } = createRoomData.data;
        const d = new Date();

        const r = await roomRepo.save({
            name,
            isPublic,
            description,
            createdAt: d,
            lastModifiedAt: d,
            ownerAccountId: id,
            ownerAccountOrigin: origin
        } satisfies Partial<DbRoom>);

        await roomMemberRepo.save({ accountId: id, accountOrigin: origin, roomId: r.id } satisfies Partial<DbRoomMember>);
        return res.status(HttpStatusCodes.Created).send(r);
    });

    // deletes a room
    e.delete(`${route}/:id`, async (req, res) => {
        const roomId = Number(req.params.id);
        const room = await roomRepo.findOneBy({ id: roomId });

        if (!room) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Room not found!",
                detail: `Can't find a room with such Id!`
            } satisfies ProblemDetail);
        }

        const v = await accountService.verifyRawForeignAccountToken(
            req.headers.authorization);

        if (!v.success) {
            return res.status(v.error.status).send(v.error);
        }
        
        // should be valid after successful validation...
        const { id, origin } = v.data;

        if (room.ownerAccountId !== id || room.ownerAccountOrigin !== origin) {
            return res.status(HttpStatusCodes.Unauthorized).send({
                status: HttpStatusCodes.Unauthorized,
                detail: `Can't delete a room from an account that's not the room owner!`
            });
        }

        await roomMemberRepo.delete({ roomId: room.id } satisfies Partial<DbRoomMember>);
        await messageRepo.delete({ receiverId: room.id, receiverType: "room" });
        await roomRepo.remove(room);
        return res.sendStatus(HttpStatusCodes.NoContent);
    });

    // finds members of a room
    e.get(`${route}/:id/members`, async (req, res) => {
        const roomId = Number(req.params.id);
        const room = await roomRepo.findOneBy({ id: roomId });

        if (!room) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                detail: `Can't find a room with such Id!`
            } satisfies ProblemDetail);
        }

        if (!room.isPublic) {
            const v = await accountService.verifyRawForeignAccountToken(
                req.headers.authorization);

            if (!v.success) {
                return res.status(v.error.status).send(v.error);
            }

            const { id, origin } = v.data;
            
            if (!await roomMemberRepo.findOneBy({ accountId: id, accountOrigin: origin })) {
                return res.status(HttpStatusCodes.Forbidden).send({
                    status: HttpStatusCodes.Forbidden,
                    title: "Privacy error",
                    detail: "Account hasn't joined this private room!"
                } satisfies ProblemDetail);
            }
        }

        return res.status(HttpStatusCodes.Ok).send(roomMemberRepo.findBy({ roomId }));
    });

    // joins a room
    e.post(`${route}/:id/members`, async (req, res) => {
        const roomId = Number(req.params.id);
        const room = await roomRepo.findOneBy({ id: roomId });

        if (!room) {
            return res.status(HttpStatusCodes.NotFound).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find the room with that Id!"
            } satisfies ProblemDetail);
        }

        if (!room.isPublic) {
            const c = invitationSchema.safeParse(req.body);

            if (!c.success) {
                return res.status(HttpStatusCodes.Unauthorized).send({
                    status: HttpStatusCodes.Unauthorized,
                    title: "Invite code not found!",
                    detail: "Can't join a private room without an invite code!"
                } satisfies ProblemDetail);
            }

            const r = await verifyRoomInviteToken(c.data.inviteCode);

            if (!r.success || r.data.id !== roomId) {
                return res.status(HttpStatusCodes.Forbidden).send({
                    status: HttpStatusCodes.Forbidden,
                    title: "Invalid invite code!",
                    detail: "Invite code is invalid for this room!"
                } satisfies ProblemDetail); 
            }
        }

        const v = await accountService.verifyRawForeignAccountToken(
            req.headers.authorization);

        if (!v.success) {
            return res.status(v.error.status).send(v.error);
        }

        const { id, origin } = v.data;

        if (await roomMemberRepo.findOneBy({ accountId: id, accountOrigin: origin, roomId })) {
            return res.status(HttpStatusCodes.Conflict).send({
                status: HttpStatusCodes.Conflict,
                title: "Member's already joined this room!"
            } satisfies ProblemDetail);
        }

        const m = { 
            accountId: id, 
            accountOrigin: origin, 
            roomId
        } satisfies Partial<DbRoomMember>;

        await roomMemberRepo.save(m);
        io.in(socketRoomNames.room(room.id)).emit("onRoomMemberJoined" satisfies keyof ServerToClientEvents, v.data);
        return res.status(HttpStatusCodes.Created).send(v.data);
    });

    // leaves a room
    e.delete(`${route}/:id/members`, async (req, res) => {
        const roomId = Number(req.params.id);

        if (!await roomRepo.findOneBy({ id: roomId })) {
            return res.status(HttpStatusCodes.NotFound).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find the room with that Id!"
            } satisfies ProblemDetail);
        }

        const v = await accountService.verifyRawForeignAccountToken(
            req.headers.authorization);

        if (!v.success) {
            return res.status(v.error.status).send(v.error);
        }

        const { id, origin } = v.data;
        const r = await roomMemberRepo.findOneBy({ accountId: id, accountOrigin: origin, roomId });

        if (!r) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Room member not found!",
            } satisfies ProblemDetail);
        }

        await roomMemberRepo.remove(r);
        io.in(socketRoomNames.room(roomId)).emit("onRoomMemberLeft" satisfies keyof ServerToClientEvents, v.data);
        return res.sendStatus(HttpStatusCodes.NoContent);
    });

    /** 
     * Returns the account Id and room data if they successfully resolve to a valid one, 
     * and that account has joined that specific room; returns an error otherwise.
     */
    async function getRoomAndAccount(rawRoomId: string, rawToken: unknown) {
        const roomId = Number(rawRoomId);
        const room = await roomRepo.findOneBy({ id: roomId });

        if (!room) {
            return err({
                status: HttpStatusCodes.NotFound,
                title: "Can't find the room with the specified room id!"
            } satisfies ProblemDetail);
        }

        const v = await accountService.verifyRawForeignAccountToken(rawToken);

        if (!v.success) {
            return v;
        }

        const { id, origin } = v.data;

        if (!await roomMemberRepo.findOneBy({ roomId: room.id, accountId: id, accountOrigin: origin })) {
            return err({
                status: HttpStatusCodes.Forbidden,
                title: "Account hasn't joined this room yet!"
            } satisfies ProblemDetail);
        }

        return ok({ accountId: id, accountOrigin: origin, room });
    }
    
    // gets messages of a room
    e.get(`${route}/:id/messages`, async (req, res) => {
        const roomId = Number(req.params.id);
        const room = await roomRepo.findOneBy({ id: roomId });

        if (!room) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: `Room not found error!`
            } satisfies ProblemDetail);
        }

        if (!room.isPublic) {
            const v = await accountService.verifyRawForeignAccountToken(
                req.headers.authorization);

            if (!v.success) {
                return res.status(v.error.status).send(v.error);
            }
        }

        return res.status(HttpStatusCodes.Ok).send((await messageRepo.findBy({ 
            receiverId: roomId, receiverType: "room" })).map(serverService.toMessage));
    });

    // posts a message to a room
    e.post(`${route}/:id/messages`, async (req, res) => {
        const d = await getRoomAndAccount(req.params.id, req.headers.authorization);
        
        if (!d.success) {
            return res.status(d.error.status).send(d.error);
        }

        const msgData = createMessageSchema.safeParse(req.body);

        if (!msgData.success) {
            return res.status(HttpStatusCodes.BadRequest).send({
                status: HttpStatusCodes.BadRequest,
                title: `Wrong request body format!`
            } satisfies ProblemDetail);
        }

        const { accountId, accountOrigin, room } = d.data;
        const now = new Date();

        const msg = await messageRepo.save({
            id: uuid.v7(),
            senderAccountId: accountId,
            senderAccountOrigin: accountOrigin,
            receiverId: room.id,
            receiverType: "room",
            createdAt: now,
            lastModifiedAt: now,
            replyToMessageIsFromDmPartner: false,
            content: msgData.data.content
        } satisfies Partial<DbMessage>);

        const r = serverService.toMessage(msg);
        io.in(socketRoomNames.room(room.id)).emit("onMessageCreated" satisfies keyof ServerToClientEvents, r);
        return res.status(HttpStatusCodes.Created).send(r);
    });

    // gets a specific message of a room
    e.get(`${route}/:id/messages/:msgId`, async (req, res) => {
        const d = await getRoomAndAccount(req.params.id, req.headers.authorization);
        
        if (!d.success) {
            return res.status(d.error.status).send(d.error);
        }

        const { accountId, accountOrigin, room } = d.data;
        const msgId = req.params.msgId;

        const msg = await messageRepo.findOneBy({
            id: msgId,
            senderAccountId: accountId, 
            senderAccountOrigin: accountOrigin, 
            receiverId: room.id, 
            receiverType: "room"
        });

        if (!msg) {
            return res.status(HttpStatusCodes.BadRequest).send({
                status: HttpStatusCodes.BadRequest,
                title: `Can't find a matching message!`
            } satisfies ProblemDetail);
        }

        return res.status(HttpStatusCodes.Ok).send(serverService.toMessage(await messageRepo.save(msg)));
    });

    // modifies a specific message of a room
    e.put(`${route}/:id/messages/:msgId`, async (req, res) => {
        const d = await getRoomAndAccount(req.params.id, req.headers.authorization);
        
        if (!d.success) {
            return res.status(d.error.status).send(d.error);
        }

        const { accountId, accountOrigin, room } = d.data;
        const msgId = req.params.msgId;

        const msg = await messageRepo.findOneBy({
            id: msgId,
            senderAccountId: accountId, 
            senderAccountOrigin: accountOrigin, 
            receiverId: room.id, 
            receiverType: "room"
        });

        if (!msg) {
            return res.status(HttpStatusCodes.BadRequest).send({
                status: HttpStatusCodes.BadRequest,
                title: `Can't find a matching message!`
            } satisfies ProblemDetail);
        }

        const modifyMsgData = modifyMessageSchema.safeParse(req.body);

        if (!modifyMsgData.success) {
            return res.status(HttpStatusCodes.BadRequest).send({
                status: HttpStatusCodes.BadRequest,
                title: `Wrong request body format!`
            } satisfies ProblemDetail);
        }

        msg.content = modifyMsgData.data.content;
        msg.lastModifiedAt = new Date();
        return res.status(HttpStatusCodes.Ok).send(serverService.toMessage(await messageRepo.save(msg)));
    });

    // deletes a specific message of a room
    e.delete(`${route}/:id/messages/:msgId`, async (req, res) => {
        const d = await getRoomAndAccount(req.params.id, req.headers.authorization);
        
        if (!d.success) {
            return res.status(d.error.status).send(d.error);
        }

        const { accountId, accountOrigin, room } = d.data;
        const msgId = req.params.msgId;

        const msg = await messageRepo.findOneBy({
            id: msgId,
            senderAccountId: accountId, 
            senderAccountOrigin: accountOrigin, 
            receiverId: room.id, 
            receiverType: "room"
        });

        if (!msg) {
            return res.status(HttpStatusCodes.BadRequest).send({
                status: HttpStatusCodes.BadRequest,
                title: `Can't find a matching message!`
            } satisfies ProblemDetail);
        }

        await messageRepo.remove(msg);
        return res.sendStatus(HttpStatusCodes.NoContent);
    });

    appService.log.info("Initialized room services!");
    return services;
}

export type RoomService = Awaited<ReturnType<typeof initRoomService>>;
