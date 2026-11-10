// https://web.dev/articles/url-parts

import { Account } from "./account";
import { UntypedId } from "./id";
import { Message } from "./message";
import { Room } from "./room";
import { Fn, Result } from "./utils";

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
    onRequestJoinRoom(roomId: number, callback: Fn<[Result<Room, string>]>): void;
    onRequestLeaveRoom(roomId: number, callback: Fn<[Result<undefined, string>]>): void;
}

export interface ServerToClientEvents {
    onConnected(): void;
    onAccountModified(oldData: Account, newData: Account): void;
    onMessageCreated(data: Message): void;
    onMessageModified(oldData: Message, newData: Message): void;
    onMessageDeleted(data: Message): void;
    onRoomMemberJoined(member: UntypedId): void;
    onRoomMemberLeft(member: UntypedId): void;
}
