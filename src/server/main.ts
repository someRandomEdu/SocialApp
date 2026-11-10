import { initAppService } from "./appService.ts";
import { initAccountService } from "./accountService.ts";
import { initServerService } from "./serverService.ts";
import { initRoomService } from "./roomService.ts";
import * as ngrok from "@ngrok/ngrok";
import * as dotenv from "dotenv";
import { expressLogLayerErrorHandler } from "@loglayer/express";

async function main(argv: readonly string[]) {
    const port = argv[2];
    const appService = await initAppService("localhost", Number(port));
    appService.log.info(`Initializing the server!`);
    const serverService = await initServerService(appService);
    const accountService = await initAccountService(appService, serverService);
    const roomService = await initRoomService(appService, serverService, accountService);
    appService.expressInstance.use(expressLogLayerErrorHandler());
    dotenv.config();

    const listener = await ngrok.forward({
        addr: appService.origin,
        authtoken_from_env: true,
        verify_upstream_tls: true
    });

    appService.log.info(`Server ${appService.origin} is hosted at ${listener.url()} by Ngrok!`);
    appService.log.info("Finished initializing the server!");
}

await main(process.argv);
