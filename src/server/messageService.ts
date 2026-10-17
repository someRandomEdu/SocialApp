import { initAccountService } from "./accountService";
import { AppService } from "./appService";

export async function initMessageServer(app: AppService) {
    const e = app.expressInstance;
    return app;
}
