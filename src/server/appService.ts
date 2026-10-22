import express, { Express } from "express";
import cors from "cors";
import { Server } from "node:http";
import { DataSource } from "typeorm";
import cookieParser from "cookie-parser";
import { createDataSource } from "./db.ts";
import * as https from "node:https";
import { readFile } from "node:fs/promises";
import path from "node:path";

export class AppService {
    public readonly url: URL;
    public readonly expressInstance: Express;
    public readonly server: Server;
    public readonly dataSource: DataSource;
    
    public constructor(url: URL, expressInstance: Express, server: Server, dataSource: DataSource) {
        this.url = url;
        this.expressInstance = expressInstance;
        this.server = server;
        this.dataSource = dataSource;
    }

    public get scheme() {
        return this.url.protocol;
    }

    public get domain() {
        return this.url.hostname;
    }

    public get port() {
        return this.url.port;
    }

    public get origin() {
        return this.url.origin;
    }
}

export async function initAppService(domain: string, port: number) {
    const expressInstance = express();
    expressInstance.use(express.json({ strict: false }));
    expressInstance.use(express.urlencoded());
    expressInstance.use(cors());
    expressInstance.use(cookieParser());

    const server = https.createServer({
        cert: await readFile(path.join(import.meta.dirname, "..", "..", "certs", "localhost.pem")),
        key: await readFile(path.join(import.meta.dirname, "..", "..", "certs", "localhost-key.pem"))
    }, expressInstance);

    const url = new URL(`https://${domain}:${port}`);

    server.listen(port, () => {
        console.log(`Hosting the Api at ${url.origin}`);
    });

    return new AppService(url, expressInstance, server, await createDataSource(port));
}

// export const app = await initApp();
