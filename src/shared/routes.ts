// https://web.dev/articles/url-parts

import { Account } from "./account.ts";
import { UntypedId } from "./id.ts";
import { Message } from "./message.ts";
import { Room } from "./room.ts";
import { Fn, Result } from "./utils.ts";

export const HOST = `localhost`;
export const PORT = 3000;
export const DOMAIN = `${HOST}:${PORT}`;
export const ORIGIN = `https://${DOMAIN}`;
export const SERVER_URL = new URL(ORIGIN);

export const socketRoomNames = Object.freeze({
    account(id: number) { return `/accounts/${id}` as const; },
    room(id: number) { return `/rooms/${id}` as const; },
    dm(id: number) { return `dms/${id}` as const; }
} as const);

// https://socket.io/docs/v4/emit-cheatsheet

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
