import express, { Express } from "express";
import cors from "cors";
import { Server } from "node:http";
import { DataSource } from "typeorm";
import { accountEntitySchema } from "../shared/account.ts";
import { rootRoute, rootPort, domain } from "../shared/apiRoutes.ts";

export class App {
    public readonly rootPort: number;
    public readonly rootRoute: string;
    public readonly domain: string;
    public readonly expressApp: Express;
    public readonly server: Server;
    public readonly dataSource: DataSource;
    public readonly customData: Record<string, unknown>;

    public constructor(rootPort: number, rootRoute: string, domain: string, expressApp: Express, server: Server, 
        dataSource: DataSource, customData: Record<string, unknown> = {}) {
        this.rootPort = rootPort;
        this.rootRoute = rootRoute;
        this.domain = domain;
        this.expressApp = expressApp;
        this.server = server;
        this.dataSource = dataSource;
        this.customData = customData
    }

    public initService<A1 extends App, A2 extends App>(this: A1, fn: (app: A1) => A2) {
        return fn(this);
    }

    public async initServiceAsync<A1 extends App, A2 extends App>(this: A1, fn: (app: A1) => Promise<A2>) {
        return await fn(this);
    }
}

export type AppWithData<K extends PropertyKey, V, A extends App = App> = A & { customData: { [_ in K]: V } };

export async function initApp(): Promise<App> {
    const expressApp = express();
    expressApp.use(express.json());
    expressApp.use(express.urlencoded());
    expressApp.use(cors());

    return new App(
        rootPort,
        rootRoute, 
        domain,
        expressApp, 
        expressApp.listen(rootPort), 

        await new DataSource({
            type: "better-sqlite3",
            database: ":memory:",
            synchronize: true,
            entities: [accountEntitySchema]
        }).initialize(),

        {}
    );
}

export const app = await initApp();
