import express, { Express } from "express";
import cors from "cors";
import { Server } from "node:http";
import { DataSource } from "typeorm";
import { userEntitySchema } from "../shared/account.ts";
import { rootRoute, rootPort } from "../shared/apiRoutes.ts";

export class App {
    public readonly rootRoute: string;
    public readonly rootPort: number;
    public readonly expressApp: Express;
    public readonly server: Server;
    public readonly dataSource: DataSource;
    public readonly customData: Record<string, unknown>;

    public constructor(rootRoute: string, rootPort: number, expressApp: Express, server: Server, 
        dataSource: DataSource, customData: Record<string, unknown> = {}) {
        this.rootRoute = rootRoute;
        this.rootPort = rootPort;
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
        rootRoute, 
        rootPort,
        expressApp, 
        expressApp.listen(rootPort), 

        await new DataSource({
            type: "better-sqlite3",
            database: ":memory:",
            synchronize: true,
            entities: [userEntitySchema]
        }).initialize(),

        {}
    );
}

export const app = await initApp();
