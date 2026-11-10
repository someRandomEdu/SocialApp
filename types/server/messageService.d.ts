import { AppService } from "./appService.ts";
import { RoomService } from "./roomService.ts";
import { ServerService } from "./serverService.ts";
export declare function initRoomMessageService(appService: AppService, serverService: ServerService, roomService: RoomService): Promise<Readonly<{}>>;
export type RoomMessageService = Awaited<ReturnType<typeof initRoomMessageService>>;
export declare function initDmMessageService(appService: AppService, serverService: ServerService): Promise<Readonly<{}>>;
export type DmMessageService = Awaited<ReturnType<typeof initDmMessageService>>;
export declare function initDmServerMessageService(appService: AppService, serverService: ServerService): Promise<Readonly<{}>>;
//# sourceMappingURL=messageService.d.ts.map