import express, { Express } from "express";
import cors from "cors";
import { Server as HttpServer } from "node:http";
import { DataSource } from "typeorm";
import cookieParser from "cookie-parser";
import { createDataSource } from "./db.ts";
import * as https from "node:https";
import { readFile } from "node:fs/promises";
import path from "node:path";
import responseTime from "response-time";
import { Server } from "socket.io";
import { LogLayer } from "loglayer";
import { LogFileRotationTransport } from "@loglayer/transport-log-file-rotation";
import { serializeError } from "serialize-error";
import { Logger } from "tslog";
import { TsLogTransport } from "@loglayer/transport-tslog";
import { arch, endianness, homedir, hostname, machine, platform, type, version } from "node:os";
import { expressLogLayer } from "@loglayer/express";
import { ClientToServerEvents, ServerToClientEvents } from "../shared/routes.ts";

export const rootDirName = path.join(import.meta.dirname, "..", "..");

export class AppService {
    public readonly url: URL;
    public readonly expressInstance: Express;
    public readonly httpServer: HttpServer;
    public readonly dataSource: DataSource;
    public readonly io: Server<ClientToServerEvents, ServerToClientEvents>;
    public readonly log: LogLayer;

    public constructor(url: URL, expressInstance: Express, httpServer: HttpServer, dataSource: DataSource, log: LogLayer) {
        this.url = url;
        this.expressInstance = expressInstance;
        this.httpServer = httpServer;
        this.dataSource = dataSource;
        this.io = new Server(httpServer, { cors: { origin: true } });
        this.log = log;
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
    const log = new LogLayer({
        errorSerializer: serializeError,

        transport: [
            new LogFileRotationTransport({ filename: path.join(rootDirName, "logs", "server.log") }),
            new TsLogTransport({ logger: new Logger() })
        ],
    });

    const e = express();
    e.use(express.json({ strict: false }));
    e.use(express.text({}));
    e.use(express.raw({}));
    e.use(express.urlencoded({}));
    e.use(cors({}));
    e.use(cookieParser());
    e.use(responseTime({}))
    e.use(express.static(path.join(rootDirName, "dist", "client"), {}));
    e.use(expressLogLayer({ instance: log }));

    const httpServer = https.createServer({
        cert: await readFile(path.join(rootDirName, "certs", "localhost.pem")),
        key: await readFile(path.join(rootDirName, "certs", "localhost-key.pem"))
    }, e);

    const url = new URL(`https://${domain}:${port}`);

    httpServer.listen(port, () => {
        log.metadataOnly({
            hostname: hostname(),
            arch: arch(),
            platform: platform(),
            machine: machine(),
            type: type(),
            version: version(),
            homedir: homedir(),
            endianness: endianness()
        });

        log.info(`Hosting the Api at ${url.origin}`);
    });

    const r = new AppService(url, e, httpServer, await createDataSource(port), log);
    return r;
}
