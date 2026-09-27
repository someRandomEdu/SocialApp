import { Account, AccountCredentials, accountCredentialsSchema, AccountSignUpData, accountSignUpDataSchema, accountEntitySchema } from "../shared/account.ts";
import { App } from "./app.ts";
import { HttpStatusCodes } from "../shared/net.ts";

export async function initAccountService(app: App) {
    const repo = app.dataSource.getRepository(accountEntitySchema);
    app.customData.accountRepo = repo;
    const e = app.expressApp;
    const route = "/account";

    e.get(`${route}/:username`, async (req, res) => {
        const u = await repo.findOneBy({ username: req.params.username });
        
        if (u === null) {
            res.status(HttpStatusCodes.NotFound).send("Account not found!");
            return;
        }

        res.status(HttpStatusCodes.Ok).send(u);
    });

    e.post(route, async (req, res) => {
        const data = accountSignUpDataSchema.safeParse(req.body);

        if (!data.success) {
            res.status(HttpStatusCodes.BadRequest).send("username and password must be strings; bio must be absent or a string!");
            return;
        }

        const username = data.data.username;

        const u = await repo.findOneBy({ username: username });

        if (u !== null) {
            res.status(HttpStatusCodes.Conflict).send("Account already exists!");
            return;
        }

        const password = data.data.password;
        const bio = data.data.bio;
        
        const r: Account = await repo.save({
            id: undefined,
            username,
            password,
            bio,
            createdAt: new Date()
        });

        res.status(HttpStatusCodes.Created).send(r);
    });

    e.put(route, async (req, res) => {
        const data = accountCredentialsSchema.safeParse(req.body.credentials);

        if (!data.success) {
            res.status(HttpStatusCodes.BadRequest).send("Username and password must be strings!");
            return;
        }

        const credentials: AccountCredentials = data.data;
        const username = credentials.username;

        const u = await repo.findOneBy({ username: username });

        if (u === null) {
            res.status(HttpStatusCodes.NotFound).send("Account not found!");
            return;
        }

        const password = String(credentials.password);

        if (u.password !== password) {
            res.status(HttpStatusCodes.BadRequest).send("Username and password don't match!");
            return;
        }

        const newData: Partial<AccountSignUpData> = req.body.newData;

        if (newData.username !== undefined) {
            u.username = newData.username;
        }

        if (newData.password !== undefined) {
            u.password = newData.password;
        }

        if (newData.bio !== undefined) {
            u.bio = newData.bio;
        }

        const r: Account = await repo.save(u);
        res.status(HttpStatusCodes.Ok).send(r);
    });

    e.delete(route, async (req, res) => {
        const data = accountCredentialsSchema.safeParse(req.body.credentials);

        if (!data.success) {
            res.status(HttpStatusCodes.BadRequest).send("Username and password must be strings!");
            return;
        }

        const credentials: AccountCredentials = data.data;

        const u = await repo.findOneBy({ username: credentials.username });

        if (u === null) {
            res.status(HttpStatusCodes.NotFound).send("Account not found!");
            return;
        }

        if (u.password !== credentials.password) {
            res.status(HttpStatusCodes.BadRequest).send("Username and password don't match!")
            return;
        }
    })

    return app;
}
