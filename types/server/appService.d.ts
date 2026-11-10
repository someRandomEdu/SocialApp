import { Express } from "express";
import { Server as HttpServer } from "node:http";
import { DataSource } from "typeorm";
import { Server } from "socket.io";
import { LogLayer } from "loglayer";
export declare const rootDirName: string;
export declare class AppService {
    readonly url: URL;
    readonly expressInstance: Express;
    readonly httpServer: HttpServer;
    readonly dataSource: DataSource;
    readonly io: Server;
    readonly log: LogLayer;
    constructor(url: URL, expressInstance: Express, httpServer: HttpServer, dataSource: DataSource, log: LogLayer);
    get scheme(): string;
    get domain(): string;
    get port(): string;
    get origin(): string;
}
export declare function initAppService(domain: string, port: number): Promise<AppService>;
//# sourceMappingURL=appService.d.ts.map