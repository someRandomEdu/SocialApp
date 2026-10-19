import { createMessageSchema, modifyMessageSchema } from "../shared/message";
import { HttpStatusCodes, ProblemDetail } from "../shared/net";
import { AppService } from "./appService";
import { DbMessage, dbMessageSchema } from "./db";
import { RoomService } from "./roomService";
import { ServerService } from "./serverService";

export async function initRoomMessageService(app: AppService, serverService: ServerService, roomService: RoomService) {
    const e = app.expressInstance;
    const messageRepo = app.dataSource.getRepository(dbMessageSchema);
    const route = "messages";

    // creates a room
    e.post(`${route}/room`, async (req, res) => {
        const data = createMessageSchema.safeParse(req.body);

        if (!data.success) {
            return res.status(HttpStatusCodes.BadRequest).type("application/problem+json").send({
                status: HttpStatusCodes.BadRequest,
                title: `Wrong body format!`
            } satisfies ProblemDetail);
        }

        const v = await serverService.tryAuthRawBearerSessionToken(
            req.headers.authorization);

        if (!v.success) {
            return res.status(HttpStatusCodes.Unauthorized).type("application/problem+json").send({
                status: HttpStatusCodes.Unauthorized,
                title: `Error occurred while validating token: ${v.error}`
            } satisfies ProblemDetail);
        }

        const { id, origin } = v.data;
        const { receiverId, content } = data.data;

        if (!(await roomService.isPublicRoom(receiverId) || await roomService.accountIsInRoom({
            id: id, origin: origin
        }, receiverId))) {
            return res.status(HttpStatusCodes.Forbidden).type("application/problem+json").send({
                status: HttpStatusCodes.Forbidden,
                title: `Account hasn't joined this private room!`
            } satisfies ProblemDetail);
        }

        const now = new Date();

        return res.status(HttpStatusCodes.Created).send(await messageRepo.save({
            senderAccountId: id,
            senderAccountOrigin: origin,
            receiverId,
            receiverOrigin: app.origin,
            receiverType: "room",
            content,
            createdAt: now,
            lastModifiedAt: now
        } satisfies Partial<DbMessage>));
    });

    // gets all messages of a room with the specified Id
    e.get(`${route}/room/:roomId/messages`, async (req, res) => {
        const roomId = Number(req.params.roomId);
        const room = await roomService.findOneRoomBy({ id: roomId });

        if (!room) {
            return res.status(HttpStatusCodes.NotFound).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: `Can't find a room with such Id!`
            } satisfies ProblemDetail);
        }

        const a = req.headers.authorization;

        if (typeof a !== "string") {
            if (!room.isPublic) {
                return res.status(HttpStatusCodes.Unauthorized).type("application/problem+json").send({
                    status: HttpStatusCodes.Unauthorized,
                    title: `Account hasn't joined this private room!`
                } satisfies ProblemDetail);
            }
        } else {
            const v = await serverService.tryAuthRawBearerLocalSessionToken(a);

            if (!v.success) {
                return res.status(HttpStatusCodes.Unauthorized).type("application/problem+json").send({
                    status: HttpStatusCodes.Unauthorized,
                    title: `Error occurred while validating token: ${v.error}`
                } satisfies ProblemDetail);
            }

            const { id, origin } = v.data;

            if (!(await roomService.isPublicRoom(roomId) || await roomService.accountIsInRoom({
                id: id, origin: origin
            }, roomId))) {
                return res.status(HttpStatusCodes.Forbidden).type("application/problem+json").send({
                    status: HttpStatusCodes.Forbidden,
                    title: `Account hasn't joined this private room!`
                } satisfies ProblemDetail);
            }
        }

        return res.status(HttpStatusCodes.Ok).send(await messageRepo.findBy({ receiverId: roomId, receiverType: "room" }));
    });

    // gets a message of a room with a specific room Id and a message Id
    e.get(`${route}/room/:roomId/messages/:msgId`, async (req, res) => {
        const roomId = Number(req.params.roomId);
        const room = await roomService.findOneRoomBy({ id: roomId });

        if (!room) {
            return res.status(HttpStatusCodes.NotFound).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: `Can't find a room with such Id!`
            } satisfies ProblemDetail);
        }

        const a = req.headers.authorization;

        if (typeof a !== "string") {
            if (!room.isPublic) {
                return res.status(HttpStatusCodes.Unauthorized).type("application/problem+json").send({
                    status: HttpStatusCodes.Unauthorized,
                    title: `Account hasn't joined this private room!`
                } satisfies ProblemDetail);
            }
        } else {
            const v = await serverService.tryAuthRawBearerSessionToken(a);

            if (!v.success) {
                return res.status(HttpStatusCodes.Unauthorized).type("application/problem+json").send({
                    status: HttpStatusCodes.Unauthorized,
                    title: `Error occurred while validating token: ${v.error}`
                } satisfies ProblemDetail);
            }

            const { id, origin } = v.data;

            if (!(await roomService.isPublicRoom(roomId) || await roomService.accountIsInRoom({
                id: id, origin: origin
            }, roomId))) {
                return res.status(HttpStatusCodes.Forbidden).type("application/problem+json").send({
                    status: HttpStatusCodes.Forbidden,
                    title: `Account hasn't joined this private room!`
                } satisfies ProblemDetail);
            }
        }

        const msgId = Number(req.params.msgId);

        const msg = await messageRepo.findOneBy({ 
            id: msgId, 
            receiverId: roomId, 
            receiverOrigin: app.origin, 
            receiverType: "room" 
        });

        if (!msg) {
            return res.status(HttpStatusCodes.NotFound).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: `Can't find a message with such Id!`
            } satisfies ProblemDetail);
        }

        return res.status(HttpStatusCodes.Ok).send(msg);
    });

    // modifies the content of a room message with the specified Id
    e.put(`${route}/room/:roomId/messages/:msgId`, async (req, res) => {
        const roomId = Number(req.params.roomId);
        const room = await roomService.findOneRoomBy({ id: roomId });

        if (!room) {
            return res.status(HttpStatusCodes.NotFound).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: `Can't find a room with such Id!`
            } satisfies ProblemDetail);
        }

        const a = req.headers.authorization;

        if (typeof a !== "string") {
            return res.status(HttpStatusCodes.Unauthorized).type("application/problem+json").send({
                status: HttpStatusCodes.Unauthorized,
                title: `Account hasn't joined this private room!`
            } satisfies ProblemDetail);
        }

        const v = await serverService.tryAuthRawBearerSessionToken(a);

        if (!v.success) {
            return res.status(HttpStatusCodes.Unauthorized).type("application/problem+json").send({
                status: HttpStatusCodes.Unauthorized,
                title: `Error occurred while validating token: ${v.error}`
            } satisfies ProblemDetail);
        }

        const { id, origin } = v.data;
        const msgId = Number(req.params.msgId);

        const msg = await messageRepo.findOneBy({
            id: msgId,
            receiverId: roomId,
            receiverOrigin: app.origin,
            receiverType: "room"
        });

        if (!msg) {
            return res.status(HttpStatusCodes.NotFound).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: `Can't find a message with such Id!`
            } satisfies ProblemDetail);
        }

        if (msg.senderAccountId !== id || msg.senderAccountOrigin !== origin) {
            return res.status(HttpStatusCodes.Forbidden).type("application/problem+json").send({
                status: HttpStatusCodes.Forbidden,
                title: `Can't modify the message of another user!`
            } satisfies ProblemDetail);
        }

        const data = modifyMessageSchema.safeParse(req.body);

        if (!data.success) {
            return res.status(HttpStatusCodes.BadRequest).type("application/problem+json").send({
                status: HttpStatusCodes.BadRequest,
                title: `Badly formatted message body!`
            } satisfies ProblemDetail);
        }

        msg.content = data.data.content;
        msg.lastModifiedAt = new Date();
        return res.status(HttpStatusCodes.Ok).send();
    });

    // deletes a room message with the specified Id
    e.delete(`${route}/room/:roomId/messages/:msgId`, async (req, res) => {
        const roomId = Number(req.params.roomId);
        const room = await roomService.findOneRoomBy({ id: roomId });

        if (!room) {
            return res.status(HttpStatusCodes.NotFound).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: `Can't find a room with such Id!`
            } satisfies ProblemDetail);
        }

        const a = req.headers.authorization;

        if (typeof a !== "string") {
            return res.status(HttpStatusCodes.Unauthorized).type("application/problem+json").send({
                status: HttpStatusCodes.Unauthorized,
                title: `Account hasn't joined this private room!`
            } satisfies ProblemDetail);
        }

        const v = await serverService.tryAuthRawBearerSessionToken(a);

        if (!v.success) {
            return res.status(HttpStatusCodes.Unauthorized).type("application/problem+json").send({
                status: HttpStatusCodes.Unauthorized,
                title: `Error occurred while validating token: ${v.error}`
            } satisfies ProblemDetail);
        }

        const { id, origin } = v.data;
        const msgId = Number(req.params.msgId);

        const msg = await messageRepo.findOneBy({
            id: msgId,
            receiverId: roomId,
            receiverOrigin: app.origin,
            receiverType: "room"
        });

        if (!msg) {
            return res.status(HttpStatusCodes.NotFound).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: `Can't find a message with such Id!`
            } satisfies ProblemDetail);
        }

        if (msg.senderAccountId !== id || msg.senderAccountOrigin !== origin) {
            return res.status(HttpStatusCodes.Forbidden).type("application/problem+json").send({
                status: HttpStatusCodes.Forbidden,
                title: `Can't delete the message of another user!`
            } satisfies ProblemDetail);
        }

        await messageRepo.remove(msg);
        return res.sendStatus(HttpStatusCodes.NoContent);
    });

    return app;
}
