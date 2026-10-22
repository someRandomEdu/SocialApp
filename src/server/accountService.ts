import { accountCredSchema, createAccountSchema, modifyAccountSchema, PublicAccount } from "../shared/account.ts";
import { AppService } from "./appService.ts";
import { HttpStatusCodes, ProblemDetail } from "../shared/net.ts";
import { DbAccount, dbAccountSchema } from "./db.ts";
import { ServerService } from "./serverService.ts";
import * as bcrypt from "bcryptjs";

export async function initAccountService(app: AppService, serverService: ServerService) {
    const accRepo = app.dataSource.getRepository(dbAccountSchema);
    const e = app.expressInstance;
    const route = "/accounts";

    async function hashPassword(password: string) {
        return await bcrypt.hash(password, 12);  
    }

    async function isPasswordOf(password: string, account: DbAccount) {
        return await bcrypt.compare(password, account.passwordHash);
    }

    // login
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

        if (!await isPasswordOf(password, a)) {
            return res.status(HttpStatusCodes.Unauthorized).type("application/problem+json").send({
                status: HttpStatusCodes.Unauthorized,
                title: `Incorrect password!`
            } satisfies ProblemDetail);
        }

        const acc: PublicAccount = {
            id: a.id,
            name: a.name,
            origin: app.origin,
            description: a.description,
            createdAt: a.createdAt,
            lastModifiedAt: a.lastModifiedAt
        };

        return res.status(HttpStatusCodes.Created).send({
            acc, jwt: await serverService.generateAccountSessionToken(a)
        });
    });

    // logout
    e.delete(`${route}/sessions`, async (req, res) => {
        const r = await serverService.tryAuthRawBearerAccountSessionToken(
            req.headers.authorization);
    
        if (!r.success) {
            return res.status(HttpStatusCodes.Unauthorized).type("application/problem+json").send({
                status: HttpStatusCodes.Unauthorized,
                title: r.error
            } satisfies ProblemDetail);
        }

        return res.sendStatus(HttpStatusCodes.NoContent);
    });

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

    // register
    e.post(`${route}`, async (req, res) => {
        const data = createAccountSchema.safeParse(req.body);

        if (!data.success) {
            return res.status(HttpStatusCodes.BadRequest).type("application/problem+json").send({
                status: HttpStatusCodes.BadRequest,
                title: `Wrong body format! "name" and "password" must be strings, "bio" must be absent or a string!`
            } satisfies ProblemDetail);
        }

        const { name, password, description } = data.data;
        
        if (await accRepo.countBy({ name }) > 0) {
            return res.status(HttpStatusCodes.Conflict).type("application/problem+json").send({
                status: HttpStatusCodes.Conflict,
                title: `An account with the name ${name} already exists in this server!`
            } satisfies ProblemDetail);
        }

        const currentDate = new Date();

        const r: DbAccount = await accRepo.save({
            name,
            passwordHash: await hashPassword(password),
            description,
            createdAt: currentDate,
            lastModifiedAt: currentDate
        } satisfies Partial<DbAccount>);

        return res.status(HttpStatusCodes.Created).send({
            id: r.id,
            name: r.name,
            origin: r.origin,
            description: r.description,
            createdAt: r.createdAt,
            lastModifiedAt: r.lastModifiedAt
        } satisfies PublicAccount);
    });

    // modify account
    e.put(`${route}`, async (req, res) => {
        const v = await serverService.tryAuthRawBearerLocalAccountSessionToken(req.headers.authorization);

        if (!v.success) {
            return res.status(HttpStatusCodes.Unauthorized).type("application/problem+json").send({
                status: HttpStatusCodes.Unauthorized,
                title: v.error
            } satisfies ProblemDetail);
        }

        const { id } = v.data;
        const a = await accRepo.findOneBy({ id });

        if (!a) {
            return res.status(HttpStatusCodes.NotFound).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: `Can't find the account with the matching account Id!`
            } satisfies ProblemDetail);
        }

        const d = modifyAccountSchema.safeParse(req.body);

        if (!d.success) {
            return res.status(HttpStatusCodes.BadRequest).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: `"name", "password" and "description" must be absent or strings!`
            } satisfies ProblemDetail);
        }

        const { name, password, description } = d.data;

        if (name !== undefined) {
            if (await accRepo.findOneBy({ name })) {
                return res.status(HttpStatusCodes.Conflict).type("application/problem+json").send({
                    status: HttpStatusCodes.Conflict,
                    title: `An account with the name ${name} within this server already exists!`
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
        const r = await accRepo.save(a);
        
        return res.status(HttpStatusCodes.Ok).send({
            id: r.id,
            name: r.name,
            origin: r.origin,
            description: r.description,
            createdAt: r.createdAt,
            lastModifiedAt: r.lastModifiedAt
        } satisfies PublicAccount);
    });

    // delete account
    e.delete(`${route}`, async (req, res) => {
        const v = await serverService.tryAuthRawBearerLocalAccountSessionToken(req.headers.authorization);

        if (!v.success) {
            return res.status(HttpStatusCodes.Unauthorized).type("application/problem+json").send({
                status: HttpStatusCodes.Unauthorized,
                title: v.error
            } satisfies ProblemDetail);
        }

        const { id } = v.data;
        const acc = await accRepo.findOneBy({ id });

        if (!acc) {
            return res.status(HttpStatusCodes.NotFound).type("application/problem+json").send({
                status: HttpStatusCodes.NotFound,
                title: "Can't find an account with that Id!"
            })
        }

        await accRepo.remove(acc);
        
        // NOTE: setting the status code alone is not enough to end a request!
        return res.sendStatus(HttpStatusCodes.NoContent);
    });

    console.log("Initialized account service!");

    return Object.freeze({
        async findAccBy(accData: Partial<DbAccount>)  {
            return await accRepo.findOneBy(accData);
        }
    } as const);
}

export type AccountService = Awaited<ReturnType<typeof initAccountService>>;
