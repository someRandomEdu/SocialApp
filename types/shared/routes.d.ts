import { Account } from "./account.ts";
import { UntypedId } from "./id.ts";
import { Message } from "./message.ts";
import { Room } from "./room.ts";
import { Fn, Result } from "./utils.ts";
export declare const HOST = "localhost";
export declare const PORT = 3000;
export declare const DOMAIN = "localhost:3000";
export declare const ORIGIN = "https://localhost:3000";
export declare const SERVER_URL: URL;
export declare const socketRoomNames: Readonly<{
    readonly account: (id: number) => `/accounts/${number}`;
    readonly room: (id: number) => `/rooms/${number}`;
    readonly dm: (id: number) => `dms/${number}`;
}>;
export declare const routeNames: Readonly<{
    readonly accounts: (origin: string) => `${string}/accounts`;
    readonly account: (origin: string, id: number) => `${string}/accounts/${number}`;
    readonly accountMessages: (origin: string, id: number) => `${string}/accounts/${number}/messages`;
    readonly accountMessage: (origin: string, accId: number, msgId: string) => `${string}/accounts/${number}/messages/${string}`;
    readonly rooms: (origin: string) => `${string}/rooms`;
    readonly room: (origin: string, id: number) => `${string}/rooms/${number}`;
    readonly roomMessages: (origin: string, id: number) => `${string}/rooms/${number}/messages`;
    readonly roomMessage: (origin: string, roomId: number, msgId: string) => `${string}/rooms/${number}/messages/${string}`;
}>;
export interface ClientToServerEvents {
    onRequestListenAccount(id: number, callback: Fn<[Result<Account, string>]>): void;
    onRequestLeaveAccount(id: number): void;
    onRequestListenRoom(id: number, callback: Fn<[Result<Room, string>]>): void;
    onRequestLeaveRoom(id: number): void;
}
export interface ServerToClientEvents {
    onAccountModified(oldData: Account, newData: Account): void;
    onMessageCreated(data: Message): void;
    onMessageModified(oldData: Message, newData: Message): void;
    onMessageDeleted(data: Message): void;
    onRoomMemberJoined(member: UntypedId): void;
    onRoomMemberLeft(member: UntypedId): void;
}
//# sourceMappingURL=routes.d.ts.map