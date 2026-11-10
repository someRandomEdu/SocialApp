import { accountCredentialsSchema, createAccountSchema, modifyAccountSchema, Account } from "../shared/account.ts";
import { AppService } from "./appService.ts";
import { HttpStatusCodes, ProblemDetail } from "../shared/net.ts";
import { DbAccount, dbAccountSchema, DbMessage, dbMessageSchema, dbRoomMemberSchema, dbRoomSchema } from "./db.ts";
import { AccountTokenPayloadInput, accountTokenPayloadSchema, customJwtPayloadClaims, ServerService } from "./serverService.ts";
import * as bcrypt from "bcryptjs";
import * as uuid from "uuid";
import { createMessageSchema, modifyMessageSchema } from "../shared/message.ts";
import { EntityTypes } from "../shared/id.ts";
import { decodeJwt, jwtVerify } from "jose";
import { err, isInteger, ok, toUnixSeconds } from "../shared/utils.ts";
import z from "zod";
import { ClientToServerEvents, ServerToClientEvents, socketRoomNames } from "../shared/routes.ts";

// TODO: Implement DM message service here?
export async function initAccountService(appService: AppService, serverService: ServerService) {
    const e = appService.expressInstance;
    const accRepo = appService.dataSource.getRepository(dbAccountSchema);
    const msgRepo = appService.dataSource.getRepository(dbMessageSchema);
    const route = "/accounts";
    const io = appService.io;

    function toAccount({ id, name, description, createdAt, lastModifiedAt }: DbAccount): Account {
        return { id, name, origin: appService.origin, description, createdAt, lastModifiedAt };
    }

    async function hashPassword(password: string) {
        return await bcrypt.hash(password, 12);  
    }

    async function isPasswordOf(password: string, account: DbAccount) {
        return await bcrypt.compare(password, account.passwordHash);
    }

    async function createAccountToken({ id }: DbAccount, exp?: Date) {
        const payload: AccountTokenPayloadInput = { 
            iss: appService.origin, 
            sub: String(id), 
            iat: toUnixSeconds(new Date()),
            jti: crypto.randomUUID(),
            [customJwtPayloadClaims.subjectType]: EntityTypes.Account
        };

        if (exp) {
            payload.exp = toUnixSeconds(exp);
        }

        return await serverService.signJwt({ alg: "Ed25519", typ: "JWT" }, payload);
    }

    async function verifyAccountToken(token: string) {
        try {
            const { payload } = await jwtVerify(token, serverService.publicKey);
            const parsedPayload = accountTokenPayloadSchema.safeParse(payload);

            if (!parsedPayload.success) {
                return err({
                    status: HttpStatusCodes.Unauthorized,
                    title: `Token error`,
                    detail: z.prettifyError(parsedPayload.error)
                } satisfies ProblemDetail);
            }

            const accountId = parsedPayload.data.sub;
            const account = await accRepo.findOneBy({ id: accountId });

            return account ? ok(account) : err({
                status: HttpStatusCodes.NotFound,
                title: "Account error",
                detail: `Can't find the account with Id ${accountId}!`
            } satisfies ProblemDetail);
        } catch (e) {
            return err({
                status: HttpStatusCodes.Unauthorized,
                title: "Token error",
                detail: String(e)
            } satisfies ProblemDetail);
        }
    }

    async function verifyRawAccountToken(rawToken: unknown) {
        if (typeof rawToken !== "string") {
            return err({
                status: HttpStatusCodes.Unauthorized,
                title: "Token not found!"
            } satisfies ProblemDetail);
        }

        const s = rawToken.split(" ", 2);

        if (s.length !== 2 || s[0]?.toLowerCase() !== "bearer") {
            return err({
                status: HttpStatusCodes.Unauthorized,
                title: "Token doesn't follow the Bearer scheme!"
            } satisfies ProblemDetail);
        }

        const token = s[1]!;
        return verifyAccountToken(token);
    }

    async function verifyForeignAccountToken(token: string) {
        try {
            const unverifiedPayload = decodeJwt(token);
            const origin = unverifiedPayload.iss;

            if (typeof origin !== "string") {
                return err({
                    status: HttpStatusCodes.Unauthorized,
                    title: `Token error`,
                    detail: `Invalid token type!`
                } satisfies ProblemDetail);
            }

            const k = await serverService.tryGetPublicKeyOfOrigin(origin); 

            if (!k.success) {
                return err({
                    status: HttpStatusCodes.InternalServerError,
                    title: "Server error!",
                    detail: `Error while trying to get credentials of server ${origin}: ${k.error}`
                } satisfies ProblemDetail);
            }

            const publicKey = k.data;
            const { payload } = await jwtVerify(token, publicKey);
            const parsedPayload = accountTokenPayloadSchema.safeParse(payload);

            if (!parsedPayload.success) {
                return err({
                    status: HttpStatusCodes.Unauthorized,
                    title: `Token error!`,
                    detail: z.prettifyError(parsedPayload.error)
                } satisfies ProblemDetail);
            }

            const { iss, sub } = parsedPayload.data;
            return ok({ id: sub, origin: iss });
        } catch (e) {
            appService.log.withError(e).warn(`Failed to fetch public key from token ${token}`);

            return err({
                status: HttpStatusCodes.InternalServerError,
                title: "Unknown server error!",
                detail: String(e)
            } satisfies ProblemDetail);
        }
    }

    async function verifyRawForeignAccountToken(rawToken: unknown) {
        if (typeof rawToken !== "string") {
            return err({
                status: HttpStatusCodes.Unauthorized,
                title: "Token not found!"
            } satisfies ProblemDetail);
        }

        const s = rawToken.split(" ", 2);

        if (s.length !== 2 || s[0]?.toLowerCase() !== "bearer") {
            return err({
                status: HttpStatusCodes.Unauthorized,
                title: "Token doesn't follow the Bearer scheme!"
            } satisfies ProblemDetail);
        }

        const token = s[1]!;
        return verifyForeignAccountToken(token);
    }
    
    // socket here represents the server's view of a client socket
    io.on("connect", async (socket) => {
        const token = socket.handshake.auth.token;

        if (typeof token !== "string") {
            socket.disconnect();
            return;
        }

        const v = await verifyForeignAccountToken(token);

        if (!v.success) {
            socket.disconnect();
            return;
        }

        const { id, origin } = v.data;

        // // checks if the authenticated token represents an account local to this server
        // if (origin === appService.origin) {
        //     socket.join(socketRoomNames.account(id));
        // }

        socket.on("onRequestListenAccount", async (rawId, callback) => {
            const accountId = Number(rawId);

            if (!isInteger(accountId)) {
                callback(err("Invalid account Id!"));
                return;
            }

            const a = await accRepo.findOneBy({ id: accountId });

            if (!a) {
                callback(err("Invalid account Id!"))
                return;
            }

            callback(ok(toAccount(a)));
            socket.join(socketRoomNames.account(accountId));
        });

        socket.on("onRequestLeaveAccount", async (rawId) => {
            const accountId = Number(rawId);

            if (!isInteger(accountId)) {
                return;
            }

            socket.leave(socketRoomNames.account(accountId));
        });
    });

    // login
    e.post(`${route}/sessions`, async (req, res) => {
        const cred = accountCredentialsSchema.safeParse(req.body);

        if (!cred.success) {
            return res.status(HttpStatusCodes.BadRequest).type("application/problem+json").send({
                status: HttpStatusCodes.BadRequest,
                title: `Bad request body format! "name" and "password" must be strings!`
            } satisfies ProblemDetail);
        }

        const { name, password } = cred.data;
        const a: DbAccount | null = await accRepo.findOneBy({ name });

        if (!a) {
            return res.status(HttpStatusCodes.NotFound).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: `Can't find an account with that username!`
            } satisfies ProblemDetail);
        }

        if (!await isPasswordOf(password, a)) {
            return res.status(HttpStatusCodes.Unauthorized).type("application/problem+json").send({
                status: HttpStatusCodes.Unauthorized,
                title: `Incorrect password!`
            } satisfies ProblemDetail);
        }

        return res.status(HttpStatusCodes.Created).send({
            account: toAccount(a),
            token: await createAccountToken(a)
        });
    });

    // logout
    e.delete(`${route}/sessions/:id`, async (req, res) => {
        const r = await verifyRawAccountToken(req.headers.authorization);

        if (!r.success) {
            return res.status(r.error.status).send(r.error);
        }

        // TODO: Implement token revocation...
        return res.sendStatus(HttpStatusCodes.NoContent);
    });

    e.get(`${route}/name/:username`, async (req, res) => {
        const a: DbAccount | null = await accRepo.findOneBy({ name: req.params.username });
        
        if (!a) {
            return res.status(HttpStatusCodes.NotFound).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: `Can't find the account associated with that username!`
            } satisfies ProblemDetail);
        }

        return res.status(HttpStatusCodes.Ok).send(toAccount(a));
    });

    // gets acc by id
    e.get(`${route}/:id`, async (req, res) => {
        const id = Number(req.params.id);
        const a: DbAccount | null = await accRepo.findOneBy({ id });

        if (!a) {
            return res.status(HttpStatusCodes.NotFound).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: `Account not found!`
            } satisfies ProblemDetail);
        }

        return res.status(HttpStatusCodes.Ok).send(toAccount(a));
    });

    // registers a new account
    e.post(`${route}`, async (req, res) => {
        const data = createAccountSchema.safeParse(req.body);

        if (!data.success) {
            return res.status(HttpStatusCodes.BadRequest).type("application/problem+json").send({
                status: HttpStatusCodes.BadRequest,
                title: `Invalid body format!`,
                detail: `"name" and "password" must be strings, "bio" must be absent or a string!`
            } satisfies ProblemDetail);
        }

        const { name, password, description } = data.data;
        
        if (await accRepo.countBy({ name }) > 0) {
            return res.status(HttpStatusCodes.Conflict).type("application/problem+json").send({
                status: HttpStatusCodes.Conflict,
                title: `Collision error!`,
                detail: `An account with the name ${name} already exists in this server!`
            } satisfies ProblemDetail);
        }

        const now = new Date();

        const r = await accRepo.save({
            name,
            passwordHash: await hashPassword(password),
            description,
            createdAt: now,
            lastModifiedAt: now
        } satisfies Partial<DbAccount>);

        return res.status(HttpStatusCodes.Created).send(toAccount(r));
    });

    // modifies account
    e.put(`${route}/:id`, async (req, res) => {
        const acc = await verifyRawAccountToken(req.headers.authorization);

        if (!acc.success) {
            return res.status(acc.error.status).send(acc.error);
        }

        const a = acc.data;

        if (Number(req.params.id) !== a.id) {
            return res.status(HttpStatusCodes.Unauthorized).send({
                status: HttpStatusCodes.Unauthorized,
                title: "Invalid token!"
            } satisfies ProblemDetail);
        }

        const d = modifyAccountSchema.safeParse(req.body);

        if (!d.success) {
            return res.status(HttpStatusCodes.BadRequest).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: "Invalid request body!",
            } satisfies ProblemDetail);
        }

        const { currentPassword, name, password, description } = d.data;
        const oldData = toAccount(a);

        if (!isPasswordOf(currentPassword, a)) {
            return res.status(HttpStatusCodes.Unauthorized).send({
                status: HttpStatusCodes.Unauthorized,
                title: "Invalid password!"
            } satisfies ProblemDetail);
        }

        if (name !== undefined) {
            if (await accRepo.findOneBy({ name })) {
                return res.status(HttpStatusCodes.Conflict).type("application/problem+json").send({
                    status: HttpStatusCodes.Conflict,
                    title: "Collision error!",
                    detail: `An account with the name ${name} within this server already exists!`
                } satisfies ProblemDetail);
            }

            a.name = name;
        }

        if (password !== undefined) {
            a.passwordHash = await hashPassword(password);
        }

        if (description !== undefined) {
            a.description = description;
        }

        a.lastModifiedAt = new Date();
        const newData = toAccount(await accRepo.save(a));
        io.in(socketRoomNames.account(a.id)).emit("onAccountModified" satisfies keyof ServerToClientEvents, oldData, newData);
        return res.status(HttpStatusCodes.Ok).send(newData);
    });

    // deletes account
    e.delete(`${route}/:id`, async (req, res) => {
        const acc = await verifyRawAccountToken(req.headers.authorization);

        if (!acc.success) {
            return res.status(acc.error.status).send(acc.error);
        }

        const a = acc.data;

        if (Number(req.params.id) !== a.id) {
            return res.status(HttpStatusCodes.Unauthorized).send({
                status: HttpStatusCodes.Unauthorized,
                title: "Invalid token!"
            } satisfies ProblemDetail);
        }
        
        await accRepo.remove(a);

        // NOTE: setting the status code alone is not enough to end a request!
        return res.sendStatus(HttpStatusCodes.NoContent);
    });

    // gets all messages a user has received.
    e.get(`${route}/:id/messages/all`, async (req, res) => {
        const acc = await verifyRawAccountToken(req.headers.authorization);

        if (!acc.success) {
            return res.status(acc.error.status).send(acc.error);
        }

        const a = acc.data;

        if (Number(req.params.id) !== a.id) {
            return res.status(HttpStatusCodes.Unauthorized).send({
                status: HttpStatusCodes.Unauthorized,
                title: "Invalid token!"
            } satisfies ProblemDetail);
        }

        return res.status(HttpStatusCodes.Ok).send((await msgRepo.findBy({ 
            receiverId: a.id, receiverType: EntityTypes.Account })).map(serverService.toMessage));
    });

    e.get(`${route}/:id/messages`, async (req, res) => {
        const v = await verifyRawForeignAccountToken(req.headers.authorization);

        if (!v.success) {
            return res.status(v.error.status).send(v.error);
        }

        const { id, origin } = v.data;
        const receiverId = Number(req.params.id);

        if (!await accRepo.findOneBy({ id: receiverId })) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find the receiver account with that matching Id!"
            } satisfies ProblemDetail);
        }

        return res.status(HttpStatusCodes.Ok).send((await msgRepo.findBy({ 
            senderAccountId: id, senderAccountOrigin: origin, receiverId, receiverType: EntityTypes.Account 
        })).map(serverService.toMessage));
    });

    e.post(`${route}/:id/messages`, async (req, res) => {
        const v = await verifyRawForeignAccountToken(req.headers.authorization);

        if (!v.success) {
            return res.status(v.error.status).send(v.error);
        }

        const msgData = createMessageSchema.safeParse(req.body);

        if (!msgData.success) {
            return res.status(HttpStatusCodes.BadRequest).send({
                status: HttpStatusCodes.BadRequest,
                title: "Wrong request body format!"
            } satisfies ProblemDetail);
        }

        const receiverId = Number(req.params.id);

        if (!accRepo.findOneBy({ id: receiverId })) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find the receiver account with that Id!"
            } satisfies ProblemDetail);
        }

        const { id, origin } = v.data;
        const now = new Date();

        const r = await msgRepo.save({
            id: uuid.v7(),
            senderAccountId: id,
            senderAccountOrigin: origin,
            receiverId,
            receiverType: EntityTypes.Account,
            createdAt: now,
            lastModifiedAt: now,
            content: msgData.data.content
        } satisfies Partial<DbMessage>);

        return res.status(HttpStatusCodes.Created).send(serverService.toMessage(r));
    });

    e.get(`${route}/:id/messages/:msgId`, async (req, res) => {
        const v = await verifyRawForeignAccountToken(req.headers.authorization);

        if (!v.success) {
            return res.status(v.error.status).send(v.error);
        }

        const { id, origin } = v.data;
        const receiverId = Number(req.params.id);

        if (!await accRepo.findOneBy({ id: receiverId })) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find the receiver account with that matching Id!"
            } satisfies ProblemDetail);
        }

        const msgId = req.params.msgId;

        const msg = await msgRepo.findOneBy({ 
            id: msgId, senderAccountId: id, senderAccountOrigin: origin, receiverId, receiverType: EntityTypes.Account });

        if (!msg) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find the message with that specified message Id!"
            } satisfies ProblemDetail);
        }

        return res.status(HttpStatusCodes.Ok).send(serverService.toMessage(msg));
    });

    e.put(`${route}/:id/messages/:msgId`, async (req, res) => {
        const v = await verifyRawForeignAccountToken(req.headers.authorization);

        if (!v.success) {
            return res.status(v.error.status).send(v.error);
        }

        const { id, origin } = v.data;
        const receiverId = Number(req.params.id);

        if (!await accRepo.findOneBy({ id: receiverId })) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find the receiver account with that matching Id!"
            } satisfies ProblemDetail);
        }

        const msgId = req.params.msgId;

        const msg = await msgRepo.findOneBy({ 
            id: msgId, senderAccountId: id, senderAccountOrigin: origin, receiverId, receiverType: EntityTypes.Account });

        if (!msg) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find the message with that specified message Id!"
            } satisfies ProblemDetail);
        }

        const msgData = modifyMessageSchema.safeParse(req.body);

        if (!msgData.success) {
            return res.status(HttpStatusCodes.BadRequest).send({
                status: HttpStatusCodes.BadRequest,
                title: "Wrong request body format!"
            } satisfies ProblemDetail);
        }

        msg.content = msgData.data.content;
        msg.lastModifiedAt = new Date();
        const r = await msgRepo.save(msg);
        return res.status(HttpStatusCodes.Ok).send(serverService.toMessage(r));
    });

    e.delete(`${route}/:id/messages/:msgId`, async (req, res) => {
        // auth token of sender
        const v = await verifyRawForeignAccountToken(req.headers.authorization);

        if (!v.success) {
            return res.status(v.error.status).send(v);
        }

        const { id, origin } = v.data;

        // id of receiver
        const receiverId = Number(req.params.id);

        if (!await accRepo.findOneBy({ id: receiverId })) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find the receiver account with that matching Id!"
            } satisfies ProblemDetail);
        }

        const msgId = req.params.msgId;

        const msg = await msgRepo.findOneBy({ id: msgId, senderAccountId: id, 
            senderAccountOrigin: origin, receiverId, receiverType: EntityTypes.Account });
        
        if (!msg) {
            return res.status(HttpStatusCodes.NotFound).send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find the message with that specified message Id!"
            } satisfies ProblemDetail);
        }

        await msgRepo.remove(msg);
        return res.sendStatus(HttpStatusCodes.NoContent);
    });

    appService.log.info("Initialized account service!");

    return Object.freeze({
        async findAccBy(accData: Partial<DbAccount>)  {
            return await accRepo.findOneBy(accData);
        },

        verifyAccountToken,
        verifyRawAccountToken,
        verifyForeignAccountToken,
        verifyRawForeignAccountToken
    } as const);
}

export type AccountService = Awaited<ReturnType<typeof initAccountService>>;
