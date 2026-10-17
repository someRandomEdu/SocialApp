import { roomMemberSchema } from "../shared/room.ts";
import { AccountService, initAccountService } from "./accountService.ts";
import { AppService } from "./appService.ts";
import { DbRoom, DbRoomMember, dbRoomMemberSchema, dbRoomSchema } from "./db.ts";
import { originServerHeaderName, ServerService } from "./serverService.ts";
import { serverApiRoute } from "./utils.ts";

export function initRoomService(app: AppService, accountService: AccountService, serverService: ServerService) {
    const e = app.expressInstance;
    const route = "rooms";
    const roomRepo = app.dataSource.getRepository(dbRoomSchema);
    const roomMemberRepo = app.dataSource.getRepository(dbRoomMemberSchema);

    return Object.freeze({

    } as const);
}
