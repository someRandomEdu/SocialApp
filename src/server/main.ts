import { HttpStatusCodes, ProblemDetail } from "../shared/net.ts";
import { initAppService } from "./appService.ts";
import { initAccountService } from "./accountService.ts";
import { initServerService } from "./serverService.ts";
import { initRoomService } from "./roomService.ts";
import { initRoomMessageService } from "./messageService.ts";

// TODO: Custom routes support?
async function main(argv: readonly string[]) {
    console.log("Initializing the server!");
    const port = argv[2];
    const app = await initAppService("localhost", Number(port));
    const serverService = await initServerService(app);
    const accountService = await initAccountService(app, serverService);
    const roomService = await initRoomService(app, serverService);
    const roomMessageService = await initRoomMessageService(app, serverService, roomService);

    app.expressInstance.get("/", async (_, res) => {
        res.status(HttpStatusCodes.Ok).send("Server's entry point!");
    });

    app.expressInstance.post("/echo{/*pathParams}", async (req, res) => {
        return res.status(HttpStatusCodes.Ok).send({
            params: req.params.pathParams ?? [],
            query: req.query,
            header: req.headers,
            cookies: req.cookies,
            body: req.body
        });
    });

    // app.expressInstance.delete("/shutdown", async (req, res) => {
    //     app.server.close();
    //     res.status(HttpStatusCodes.Ok).send("Shutting down the server...");
    //     console.log("Shutting down the server...");
    // });

    console.log("Finished initializing the server!");
}

await main(process.argv);
