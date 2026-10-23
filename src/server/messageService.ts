import { UntypedId } from "../shared/id.ts";
import { createMessageSchema, modifyMessageSchema } from "../shared/message.ts";
import { HttpStatusCodes, ProblemDetail } from "../shared/net.ts";
import { AppService } from "./appService.ts";
import { DbMessage, dbMessageSchema } from "./db.ts";
import { RoomService } from "./roomService.ts";
import { ServerService } from "./serverService.ts";
import * as uuid from "uuid";

export async function initRoomMessageService(appService: AppService, serverService: ServerService, roomService: RoomService) {
    const e = appService.expressInstance;
    const route = "/messages/rooms";
    const msgRepo = appService.dataSource.getRepository(dbMessageSchema);

    function isSenderOf(id: UntypedId, msg: DbMessage) {
        return msg.senderAccountId === id.id && msg.senderAccountOrigin === id.origin;
    }

    // gets messages of a room
    e.get(`${route}/:roomId`, async (req, res) => {
        const roomId = Number(req.params.roomId);
        const room = await roomService.findOneRoomBy({ id: roomId });

        if (!room) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find a room with such Id!"
            } satisfies ProblemDetail);
        }

        const a = req.headers.authorization;

        if (a === undefined) {
            if (!room.isPublic) {
                return res.status(HttpStatusCodes.Forbidden).send({
                    status: HttpStatusCodes.Forbidden,
                    title: "Can't get messages of a private room without joining it!"
                } satisfies ProblemDetail);
            }
        } else {
            const v = await serverService.tryAuthRawBearerAccountSessionToken(a);

            if (!v.success) {
                return res.status(HttpStatusCodes.Unauthorized).send({
                    status: HttpStatusCodes.Unauthorized,
                    title: `Error occurred while validating session token: ${v.error}`
                } satisfies ProblemDetail);
            }

            if (!await roomService.accountIsInRoom(v.data, roomId)) {
                return res.status(HttpStatusCodes.Forbidden).send({
                    status: HttpStatusCodes.Forbidden,
                    title: "Can't get messages of a private room without joining it!"
                } satisfies ProblemDetail);
            }
        }

        return res.status(HttpStatusCodes.Ok).send(msgRepo.findBy({ receiverId: roomId, receiverType: "room" }));
    });

    // creates a room message
    e.post(`${route}/:roomId`, async (req, res) => {
        const roomId = Number(req.params.roomId);

        if (!Number.isSafeInteger(roomId)) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Room Id is not an integer!"
            } satisfies ProblemDetail);
        }
        
        const room = await roomService.findOneRoomBy({ id: roomId });

        if (!room) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find a room with such Id!"
            } satisfies ProblemDetail);
        }

        const d = createMessageSchema.safeParse(req.body);
        
        if (!d.success) {
            return res.status(HttpStatusCodes.BadRequest).send({
                status: HttpStatusCodes.BadRequest,
                title: "Invalid body format!"
            } satisfies ProblemDetail);
        }

        const v = await serverService.tryAuthRawBearerAccountSessionToken(req.headers.authorization);

        if (!v.success) {
            return res.status(HttpStatusCodes.Unauthorized).send({
                status: HttpStatusCodes.Unauthorized,
                title: `Error occurred while validating auth token: ${v.error}`
            } satisfies ProblemDetail);
        }

        if (!await roomService.accountIsInRoom(v.data, roomId)) {
            return res.status(HttpStatusCodes.Forbidden).send({
                status: HttpStatusCodes.Unauthorized,
                title: "Account hasn't joined this server!"
            } satisfies ProblemDetail); 
        }

        const { id, origin } = v.data;
        const { content } = d.data;
        const now = new Date();

        const r = await msgRepo.save({
            id: uuid.v7(),
            senderAccountId: id,
            senderAccountOrigin: origin,
            receiverId: room.id,
            receiverOrigin: appService.origin,
            receiverType: "room",
            content,
            createdAt: now,
            lastModifiedAt: now
        } satisfies Partial<DbMessage>);

        return res.status(HttpStatusCodes.Created).send(r);
    });

    // get a specific message of a room
    e.get(`${route}/:roomId/:msgId`, async (req, res) => {
        const roomId = Number(req.params.roomId);
        const room = await roomService.findOneRoomBy({ id: roomId });

        if (!room) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find a room with that room Id!"
            } satisfies ProblemDetail);
        }

        const a = req.headers.authorization;

        if (a === undefined) {
            if (!room.isPublic) {
                return res.status(HttpStatusCodes.Unauthorized).send({
                    status: HttpStatusCodes.Unauthorized,
                    title: "Can't view messages of a private room without joining it!"
                } satisfies ProblemDetail);
            }
        } else {
            const v = await serverService.tryAuthRawBearerAccountSessionToken(a);

            if (!v.success) {
                return res.status(HttpStatusCodes.Unauthorized).send({
                    status: HttpStatusCodes.Unauthorized,
                    title: `Error while validating auth token: ${v.error}`
                } satisfies ProblemDetail);
            }

            if (!await roomService.accountIsInRoom(v.data, roomId)) {
                return res.status(HttpStatusCodes.Unauthorized).send({
                    status: HttpStatusCodes.Unauthorized,
                    title: "Account hasn't joined this private room!"
                } satisfies ProblemDetail);
            }
        }
        
        const msgId = req.params.msgId;
        const m = await msgRepo.findOneBy({ id: msgId, receiverId: roomId, receiverType: "room" });

        if (!m) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find a message with such Id!"
            } satisfies ProblemDetail); 
        }

        return res.status(HttpStatusCodes.Created).send(m);
    });

    // modify a specific message of a room
    e.put(`${route}/:roomId/:msgId`, async (req, res) => {
        const roomId = Number(req.params.roomId);
        const room = await roomService.findOneRoomBy({ id: roomId });

        if (!room) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find a room with that room Id!"
            } satisfies ProblemDetail);
        }

        const a = req.headers.authorization;
        const v = await serverService.tryAuthRawBearerAccountSessionToken(a);

        if (!v.success) {
            return res.status(HttpStatusCodes.Unauthorized).send({
                status: HttpStatusCodes.Unauthorized,
                title: `Error while validating auth token: ${v.error}`
            } satisfies ProblemDetail);
        }

        if (!await roomService.accountIsInRoom(v.data, roomId)) {
            return res.status(HttpStatusCodes.Unauthorized).send({
                status: HttpStatusCodes.Unauthorized,
                title: "Account hasn't joined this room!"
            } satisfies ProblemDetail);
        }

        const msgId = req.params.msgId;
        const m = await msgRepo.findOneBy({ id: msgId, receiverId: roomId, receiverType: "room" });

        if (!m) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find a message with such Id!"
            } satisfies ProblemDetail); 
        }

        if (m.senderAccountId !== v.data.id || m.senderAccountOrigin !== v.data.origin) {
            return res.status(HttpStatusCodes.Forbidden).send({
                status: HttpStatusCodes.Forbidden,
                title: "Account isn't the one who created this message!"
            } satisfies ProblemDetail);
        }

        const msgData = modifyMessageSchema.safeParse(req.body);

        if (!msgData.success) {
            return res.status(HttpStatusCodes.BadRequest).send({
                status: HttpStatusCodes.BadRequest,
                title: "Invalid request body!"
            } satisfies ProblemDetail);
        }

        m.content = msgData.data.content;
        m.lastModifiedAt = new Date();
        return res.status(HttpStatusCodes.Ok).send(await msgRepo.save(m));
    });

    // deletes a particular message of a room
    e.delete(`${route}/:roomId/:msgId`, async (req, res) => {
        const roomId = Number(req.params.roomId);
        const room = await roomService.findOneRoomBy({ id: roomId });

        if (!room) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find a room with that room Id!"
            } satisfies ProblemDetail);
        }

        const a = req.headers.authorization;
        const v = await serverService.tryAuthRawBearerAccountSessionToken(a);

        if (!v.success) {
            return res.status(HttpStatusCodes.Unauthorized).send({
                status: HttpStatusCodes.Unauthorized,
                title: `Error while validating auth token: ${v.error}`
            } satisfies ProblemDetail);
        }

        if (!await roomService.accountIsInRoom(v.data, roomId)) {
            return res.status(HttpStatusCodes.Unauthorized).send({
                status: HttpStatusCodes.Unauthorized,
                title: "Account hasn't joined this room!"
            } satisfies ProblemDetail);
        }

        const msgId = req.params.msgId;
        const m = await msgRepo.findOneBy({ id: msgId, receiverId: roomId, receiverType: "room" });

        if (!m) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find a message with such Id!"
            } satisfies ProblemDetail); 
        }

        if (m.senderAccountId !== v.data.id || m.senderAccountOrigin !== v.data.origin) {
            return res.status(HttpStatusCodes.Forbidden).send({
                status: HttpStatusCodes.Forbidden,
                title: "Account isn't the one who created this message!"
            } satisfies ProblemDetail);
        }

        await msgRepo.remove(m);
        return res.sendStatus(HttpStatusCodes.NoContent);
    });

    return Object.freeze({} as const);
}

// TODO: DM support...
export async function initDmMessageService(appService: AppService, serverService: ServerService) {
    const e = appService.expressInstance;
    const route = "/messages/dms";
    return Object.freeze({} as const);
}

export async function initDmServerMessageService(appService: AppService, serverService: ServerService) {
    return Object.freeze({} as const);
}
