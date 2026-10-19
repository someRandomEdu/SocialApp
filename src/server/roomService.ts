import { UntypedId, untypedIdSchema } from "../shared/id.ts";
import { HttpStatusCodes, ProblemDetail } from "../shared/net.ts";
import { createRoomSchema, roomSchema } from "../shared/room.ts";
import { AppService } from "./appService.ts";
import { dbMessageSchema, DbRoom, DbRoomMember, dbRoomMemberSchema, dbRoomSchema } from "./db.ts";
import { ServerService } from "./serverService.ts";
import * as z from "zod";

const changeRoomOwnerSchema = untypedIdSchema;
type ChangeRoomMember = z.infer<typeof changeRoomOwnerSchema>;

export function initRoomService(app: AppService, serverService: ServerService) {
    const e = app.expressInstance;
    const route = "rooms";
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

        async roomMembersOf(roomId: number) {
            return await roomMemberRepo.findBy({ roomId });
        }
    } as const);

    // creates a room
    e.post(`${route}`, async (req, res) => {
        const createRoomData = createRoomSchema.safeParse(req.body);

        if (!createRoomData.success) {
            return res.status(HttpStatusCodes.BadRequest).type("application/problem+json").send({
                status: HttpStatusCodes.BadRequest,
                title: `Badly formatted request body!`
            } satisfies ProblemDetail);
        }

        const v = await serverService.tryAuthRawBearerSessionToken(
            req.headers.authorization);

        if (!v.success) {
            return res.status(HttpStatusCodes.Unauthorized).send({
                status: HttpStatusCodes.Unauthorized,
                detail: `Error occurred while validating token: ${v.error}`
            } satisfies ProblemDetail);
        }
        
        // should be valid after successful validation...
        const { id, origin } = v.data;
        const { name, isPublic } = createRoomData.data;

        return res.status(HttpStatusCodes.Created).send(await roomRepo.save({
            name,
            isPublic,
            createdAt: new Date(),
            ownerAccountId: id,
            ownerAccountOrigin: origin
        } satisfies Partial<DbRoom>));
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

        const v = await serverService.tryAuthRawBearerSessionToken(
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
    e.get(`${route}/:id`, async (req, res) => {

    });

    // transfers the owner of a room to someone else
    e.put(`${route}/:id`, async (req, res) => {
        const roomId = Number(req.params.id);
        const v = await serverService.tryAuthRawBearerSessionToken(req.headers.authorization);

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

    return services;
}

export type RoomService = Awaited<ReturnType<typeof initRoomService>>;
