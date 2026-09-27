import { HttpStatusCodes } from "../shared/net.ts";
import { app } from "./app.ts";
import { initAccountService } from "./accountService.ts";

console.log("Initializing the server!");
await initAccountService(app);

app.expressApp.get("/", async (_, res) => {
    res.status(HttpStatusCodes.Ok).send("Server's entry point!");
});

app.expressApp.delete("/", async (req, res) => {
    app.server.close();
    res.status(HttpStatusCodes.Ok).send("Shutting down the server...");
    console.log("Shutting down the server...");
});

console.log("Finished initializing the server!");
