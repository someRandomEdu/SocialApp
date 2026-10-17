import { Account, accountCredSchema, createAccountSchema, modifyAccountSchema, PublicAccount } from "../shared/account.ts";
import { AppService } from "./appService.ts";
import { HttpStatusCodes, ProblemDetail } from "../shared/net.ts";
import { err, ok, toUnixSeconds, tryParseInt } from "../shared/utils.ts";
import { DbAccount, dbAccountSchema, DbAccountSession, dbAccountSessionSchema } from "./db.ts";
import { AccountSession } from "../shared/account.ts";
import { ServerService } from "./serverService.ts";
import { JWTPayload } from "jose";

export async function initAccountService(app: AppService, serverService: ServerService) {
    const accRepo = app.dataSource.getRepository(dbAccountSchema);
    const accSessionRepo = app.dataSource.getRepository(dbAccountSessionSchema);
    const e = app.expressInstance;
    const route = "/accounts";

    function tryGetBearerToken(rawToken: unknown) {
        if (typeof rawToken !== "string") {
            return undefined;
        }

        const s = rawToken.split(" ", 2);
        
        if (s.length !== 2 || s[0]?.toLowerCase() !== "bearer") {
            return undefined;
        }

        return s[1]!;
    }

    async function dbSessionOfAccountBearerToken(rawToken: unknown) {
        const token = tryGetBearerToken(rawToken);

        if (typeof token !== "string") {
            return err({
                status: HttpStatusCodes.BadRequest,
                title: `Token doesn't conform to the Bearer scheme!`
            } satisfies ProblemDetail);
        }

        const jwt = await serverService.tryVerifyLocalToken(token);

        if (!jwt.ok) {
            return err({
                status: HttpStatusCodes.BadRequest,
                title: `An error occurred while verifying the token: ${jwt.error}`
            } satisfies ProblemDetail);
        }

        const { payload } = jwt.value;
        const sessionId = Number(payload.jti);

        // invariant: there can be no sessions to a non-existent account (or one that doesn't live in this server)
        // checking the accounts db is not needed as long as that invariant is upheld
        const session = await accSessionRepo.findOneBy({ jti: sessionId });

        if (!session) {
            return err({
                status: HttpStatusCodes.NotFound,
                title: `Can't find a session token with that token Id!`
            } satisfies ProblemDetail);
        }

        if (sessionId !== session.jti || payload.iat !== toUnixSeconds(session.iat)
            || Number(payload.sub) !== session.sub) {
            return err({
                status: HttpStatusCodes.Unauthorized,
                title: `Not a valid token!`
            } satisfies ProblemDetail);
        }

        return ok(session);
    }

    async function dbAccountAndSessionOfAccountBearerToken(rawToken: unknown) {
        const r = await dbSessionOfAccountBearerToken(rawToken);

        if (!r.ok) {
            return r;
        }

        const accId = r.value.sub;
        const account = await accRepo.findOneBy({ id: accId });

        // should not happen...
        if (!account) {
            return err({
                status: HttpStatusCodes.NotFound,
                title: `Can't find a session token with that token Id!`
            } satisfies ProblemDetail);
        }

        return ok({ account, session: r.value });
    }

    // get acc by username. convenience wrapper... most operations will work on id instead
    e.get(`${route}/name/:username`, async (req, res) => {
        const a: DbAccount | null = await accRepo.findOneBy({ name: req.params.username });
        
        if (!a) {
            return res.status(HttpStatusCodes.NotFound).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: `Can't find the account associated with that username!`
            } satisfies ProblemDetail);
        }

        return res.status(HttpStatusCodes.Ok).send({
            id: a.id,
            name: a.name,
            origin: app.origin,
            description: a.description,
            createdAt: a.createdAt,
            lastModifiedAt: a.lastModifiedAt,
        } satisfies PublicAccount);
    });

    // get acc by id
    e.get(`${route}/id/:id`, async (req, res) => {
        const id = Number(req.params.id);
        const a: DbAccount | null = await accRepo.findOneBy({ id });

        if (!a) {
            return res.status(HttpStatusCodes.NotFound).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: `Can't find the account associated with that id!`
            } satisfies ProblemDetail);
        }

        return res.status(HttpStatusCodes.Ok).send({
            id: a.id,
            name: a.name,
            origin: app.origin,
            description: a.description,
            createdAt: a.createdAt,
            lastModifiedAt: a.lastModifiedAt,
        } satisfies PublicAccount);
    });

    // login
    // TODO: Allow more than one session per account or not?
    e.post(`${route}/sessions`, async (req, res) => {
        const cred = accountCredSchema.safeParse(req.body);

        if (!cred.success) {
            return res.status(HttpStatusCodes.BadRequest).type("application/problem+json").send({
                status: HttpStatusCodes.BadRequest,
                title: `"name" and "password" must be strings!`
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

        if (a.password !== password) {
            return res.status(HttpStatusCodes.Unauthorized).type("application/problem+json").send({
                status: HttpStatusCodes.Unauthorized,
                title: `Incorrect password!`
            } satisfies ProblemDetail);
        }

        if (await accSessionRepo.findOneBy({ sub: a.id })) {
            return res.status(HttpStatusCodes.Conflict).type("application/problem+json").send({
                status: HttpStatusCodes.Conflict,
                title: `Account's already logged in!`
            } satisfies ProblemDetail); 
        }

        const r: DbAccountSession = await accSessionRepo.save({
            iat: new Date(),
            sub: a.id,
            exp: null
        } satisfies Partial<DbAccountSession>);

        const accSession: AccountSession = { ...r, iss: app.url };

        let jwt: JWTPayload = {
            jti: String(accSession.jti),
            iss: String(accSession.iss),
            sub: String(accSession.sub),
            iat: toUnixSeconds(accSession.iat)
        };

        if (accSession.exp) {
            jwt.exp = toUnixSeconds(accSession.exp);
        }

        const acc: Account = {
            id: a.id,
            name: a.name,
            password: a.password,
            origin: app.origin,
            description: a.description,
            createdAt: a.createdAt,
            lastModifiedAt: a.lastModifiedAt
        };

        return res.status(HttpStatusCodes.Created).send({
            acc, 
            session: accSession, 
            jwt: await serverService.signJwt({ alg: "Ed25519" }, jwt) 
        });
    });

    // logout
    e.delete(`${route}/sessions`, async (req, res) => {
        const r = await dbSessionOfAccountBearerToken(req.headers.authorization);

        if (!r.ok) {
            return res.status(r.error.status).send(r.error);
        }

        await accSessionRepo.remove(r.value);
        return res.sendStatus(HttpStatusCodes.NoContent);
    });

    // register
    e.post(`${route}`, async (req, res) => {
        const data = createAccountSchema.safeParse(req.body);

        if (!data.success) {
            return res.status(HttpStatusCodes.BadRequest).type("application/problem+json").send({
                status: HttpStatusCodes.BadRequest,
                title: `Wrong body format! "name" and "password" must be strings, "bio" must be absent or a string!`
            } satisfies ProblemDetail);
        }

        const name = data.data.name;
        
        if (await accRepo.countBy({ name }) > 0) {
            return res.status(HttpStatusCodes.Conflict).type("application/problem+json").send({
                status: HttpStatusCodes.Conflict,
                title: `An account with the name ${name} already exists in this server!`
            } satisfies ProblemDetail);
        }

        const password = data.data.password;
        const description = data.data.description;
        const currentDate = new Date();

        const r: DbAccount = await accRepo.save({
            name,
            password,
            description,
            createdAt: currentDate,
            lastModifiedAt: currentDate
        } satisfies Partial<DbAccount>);

        return res.status(HttpStatusCodes.Created).send(r);
    });

    // modify account
    e.put(`${route}`, async (req, res) => {
        const v = await dbSessionOfAccountBearerToken(req.headers.authorization);

        if (!v.ok) {
            return res.status(v.error.status).type("application/problem+json").send(v.error);
        }

        const accId = v.value.sub;
        const a = await accRepo.findOneBy({ id: accId });

        if (!a) {
            // not supposed to happen, considering the invariant mentioned above...
            return res.status(HttpStatusCodes.NotFound).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: `Can't find the account with the matching account Id!`
            } satisfies ProblemDetail);
        }

        const d = modifyAccountSchema.safeParse(req.body);

        if (!d.success) {
            return res.status(HttpStatusCodes.BadRequest).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: `Request body didn't follow this schema { name?: string; password?: string; description?: string; }!`
            } satisfies ProblemDetail);
        }

        const { name, password, description } = d.data;

        if (name !== undefined) {
            if (await accRepo.findOneBy({ name })) {
                return res.status(HttpStatusCodes.Conflict).type("application/problem+json").send({
                    status: HttpStatusCodes.Conflict,
                    title: `An account with the name ${name} already exists!`
                } satisfies ProblemDetail);
            }

            a.name = name;
        }

        if (password !== undefined) {
            a.password = password;
        }

        if (description !== undefined) {
            a.description = description;
        }

        a.lastModifiedAt = new Date();
        return res.status(HttpStatusCodes.Accepted).send(await accRepo.save(a));
    });

    // delete account
    e.delete(`${route}`, async (req, res) => {
        const v = await dbAccountAndSessionOfAccountBearerToken(req.headers.authorization);

        if (!v.ok) {
            return res.status(v.error.status).type("application/problem+json").send(v.error);
        }

        const { account, session } = v.value;
        const accId = account.id;
        await accRepo.remove(account);
        await accSessionRepo.remove(session);
        await accSessionRepo.delete({ sub: accId });

        // NOTE: setting the status code alone is not enough to end a request!
        return res.sendStatus(HttpStatusCodes.NoContent);
    });

    return Object.freeze({
        async findAccBy(accData: Partial<DbAccount>): Promise<DbAccount | null>  {
            return await accRepo.findOneBy(accData);
        }
    } as const);
}

export type AccountService = Awaited<ReturnType<typeof initAccountService>>;
