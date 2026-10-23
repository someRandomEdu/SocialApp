import { UntypedId, untypedIdSchema } from "../shared/id.ts";
import { HttpStatusCodes, ProblemDetail } from "../shared/net.ts";
import { createRoomSchema, roomMemberSchema } from "../shared/room.ts";
import { AppService } from "./appService.ts";
import { dbMessageSchema, DbRoom, DbRoomMember, dbRoomMemberSchema, dbRoomSchema } from "./db.ts";
import { ServerService } from "./serverService.ts";
import * as z from "zod";

const changeRoomOwnerSchema = untypedIdSchema;
type ChangeRoomMember = z.infer<typeof changeRoomOwnerSchema>;

export async function initRoomService(app: AppService, serverService: ServerService) {
    const e = app.expressInstance;
    const route = "/rooms";
    const roomRepo = app.dataSource.getRepository(dbRoomSchema);
    const roomMemberRepo = app.dataSource.getRepository(dbRoomMemberSchema);
    const messageRepo = app.dataSource.getRepository(dbMessageSchema);

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

    // gets rooms a user has joined in
    e.get(`${route}`, async (req, res) => {
        const v = await serverService.tryAuthRawBearerAccountSessionToken(
            req.headers.authorization);

        if (!v.success) {
            return res.status(HttpStatusCodes.Unauthorized).send({
                status: HttpStatusCodes.Unauthorized,
                detail: `Error occurred while validating token: ${v.error}`
            } satisfies ProblemDetail);
        }
        
        const { id, origin } = v.data;

        const r = await roomRepo.createQueryBuilder("room")
            .innerJoin(dbRoomMemberSchema.options.name, "rm", "rm.roomId = room.id")
            .where("rm.accountId = :id", { id })
            .andWhere("rm.accountOrigin = :origin", { origin })
            .getMany();

        return res.status(HttpStatusCodes.Ok).send(r);
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

        const v = await serverService.tryAuthRawBearerAccountSessionToken(
            req.headers.authorization);

        if (!v.success) {
            return res.status(HttpStatusCodes.Unauthorized).send({
                status: HttpStatusCodes.Unauthorized,
                detail: `Error occurred while validating token: ${v.error}`
            } satisfies ProblemDetail);
        }
        
        // should be valid after successful validation...
        const { id, origin } = v.data;
        const { name, isPublic, description } = createRoomData.data;

        const r = await roomRepo.save({
            name,
            isPublic,
            description,
            createdAt: new Date(),
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
                detail: `Can't find a room with such Id!`
            } satisfies ProblemDetail);
        }

        const v = await serverService.tryAuthRawBearerAccountSessionToken(
            req.headers.authorization);

        if (!v.success) {
            return res.status(HttpStatusCodes.Unauthorized).send({
                status: HttpStatusCodes.Unauthorized,
                detail: `Error occurred while validating token: ${v.error}`
            } satisfies ProblemDetail);
        }
        
        // should be valid after successful validation...
        const { id, origin } = v.data;

        if (room.ownerAccountId !== id || room.ownerAccountOrigin !== origin) {
            return res.status(HttpStatusCodes.Unauthorized).send({
                status: HttpStatusCodes.Unauthorized,
                detail: `Can't delete a room from an account that's not the room owner!`
            });
        }

        // TODO: Delete associated room members and messages!
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
            const v = await serverService.tryAuthRawBearerAccountSessionToken(
                req.headers.authorization);

            if (!v.success) {
                return res.status(HttpStatusCodes.Unauthorized).send({
                    status: HttpStatusCodes.Unauthorized,
                    title: `Error occurred while validating token: ${v.error}`
                } satisfies ProblemDetail);
            }

            const { id, origin } = v.data;
            
            if (!await roomMemberRepo.findOneBy({ accountId: id, accountOrigin: origin })) {
                return res.status(HttpStatusCodes.Forbidden).send({
                    status: HttpStatusCodes.Forbidden,
                    title: "Account hasn't joined this private room!"
                });
            }
        }

        return res.status(HttpStatusCodes.Ok).send(roomMemberRepo.findBy({ roomId }));
    });

    // transfers the owner of a room to someone else
    e.put(`${route}/:id/owner`, async (req, res) => {
        const roomId = Number(req.params.id);
        const v = await serverService.tryAuthRawBearerAccountSessionToken(req.headers.authorization);

        if (!v.success) {
            return res.status(HttpStatusCodes.Unauthorized).send({
                status: HttpStatusCodes.Unauthorized,
                detail: `Error occurred while validating token: ${v.error}`
            } satisfies ProblemDetail);
        }

        const { id, origin } = v.data;
        const room = await roomRepo.findOneBy({ id: roomId });

        if (!room) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                detail: `Can't find a room with such Id!`
            });
        }

        if (!await roomMemberRepo.findOneBy({ accountId: id, accountOrigin: origin, roomId })) {
            return res.status(HttpStatusCodes.Unauthorized).send({
                status: HttpStatusCodes.Unauthorized,
                detail: `Member hasn't joined this room!`
            });
        }

        room.ownerAccountId = id;
        room.ownerAccountOrigin = origin;
        return res.status(HttpStatusCodes.Ok).send(await roomRepo.save(room));
    });

    // joins a room
    e.post(`${route}/:id/members`, async (req, res) => {
        const roomId = Number(req.params.id);

        if (!await roomRepo.findOneBy({ id: roomId })) {
            return res.status(HttpStatusCodes.NotFound).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find the room with that Id!"
            } satisfies ProblemDetail);
        }

        const t = await serverService.tryAuthRawBearerAccountSessionToken(
            req.headers.authorization);

        if (!t.success) {
            return res.status(HttpStatusCodes.Unauthorized).send({
                status: HttpStatusCodes.Unauthorized,
                title: `Error occurred while validating token: ${t.error}`
            } satisfies ProblemDetail);
        }

        const { id, origin } = t.data;

        if (await roomMemberRepo.findOneBy({ accountId: id, accountOrigin: origin, roomId })) {
            return res.status(HttpStatusCodes.Conflict).send({
                status: HttpStatusCodes.Conflict,
                title: "Member's already joined this room!"
            } satisfies ProblemDetail);
        }

        const r = await roomMemberRepo.save({
            accountId: id,
            accountOrigin: origin,
            roomId
        } satisfies Partial<DbRoomMember>);

        return res.status(HttpStatusCodes.Created).send({
            accountId: r.accountId,
            accountOrigin: r.accountOrigin,
            roomId: r.roomId
        } satisfies Partial<DbRoomMember>);
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

        const t = await serverService.tryAuthRawBearerAccountSessionToken(
            req.headers.authorization);

        if (!t.success) {
            return res.status(HttpStatusCodes.Unauthorized).send({
                status: HttpStatusCodes.Unauthorized,
                title: "Can't find the room with that Id!"
            } satisfies ProblemDetail);
        }

        const { id, origin } = t.data;
        const r = await roomMemberRepo.findOneBy({ accountId: id, accountOrigin: origin, roomId });

        if (!r) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Member's not in this room!"
            } satisfies ProblemDetail);
        }

        await roomMemberRepo.remove(r);
        return res.sendStatus(HttpStatusCodes.NoContent);
    });

    console.log("Initialized room services!");
    return services;
}

export type RoomService = Awaited<ReturnType<typeof initRoomService>>;
