import React from "react";
import { Nullable, Result } from "../shared/utils";
import { AccountCredentials, LoginData } from "../shared/account";
import { Room, RoomArray } from "../shared/room";
import { UntypedId } from "../shared/id.ts";
import { ClientToServerEvents, ServerToClientEvents } from "../shared/routes.ts";
import { Socket as ClientSocket } from "socket.io-client";
import { LogLayer } from "loglayer";
export declare const socket: ClientSocket<ServerToClientEvents, ClientToServerEvents>;
export declare const theme: import("@mui/material").Theme;
export declare const homeOrigin = "https://localhost:3000";
export declare const log: LogLayer;
export declare const LoginDataContext: React.Context<{
    loginData: Nullable<LoginData>;
    setLoginData(value: Nullable<LoginData>): void;
}>;
export declare const RoomArrayContext: React.Context<{
    roomArray: RoomArray;
    setRoomArray(value: RoomArray): void;
}>;
export declare const ServerOriginsContext: React.Context<string[]>;
export declare const CurrentRoomContext: React.Context<{
    currentRoom: Nullable<Room>;
    setCurrentRoom(value: Nullable<Room>): void;
}>;
export declare function getRoomsOf(token: string, origin: string): Promise<{
    id: number;
    name: string;
    isPublic: boolean;
    createdAt: Date;
    description: string;
    ownerAccount: {
        id: number;
        origin: string;
    };
}[]>;
export declare const AuthOpsContext: React.Context<{
    login({ name, password }: AccountCredentials): Promise<Result<LoginData, string>>;
    logout(): boolean;
}>;
export declare const ErrorContext: React.Context<{
    error: Nullable<string>;
    setError(value: Nullable<string>): void;
}>;
export declare const TokenContext: React.Context<Nullable<string>>;
export declare const AccountContext: React.Context<Nullable<{
    id: number;
    name: string;
    origin: string;
    description: string;
    createdAt: Date;
    lastModifiedAt: Date;
}>>;
export declare const RoomContext: React.Context<Nullable<{
    id: number;
    name: string;
    isPublic: boolean;
    createdAt: Date;
    description: string;
    ownerAccount: {
        id: number;
        origin: string;
    };
}>>;
export declare const MessagesContext: React.Context<Nullable<{
    id: string;
    senderAccount: {
        id: number;
        origin: string;
    };
    receiver: {
        id: number;
        origin: string;
        type: "room";
    } | {
        id: number;
        origin: string;
        type: "account";
    };
    replyToMessage?: {
        id: string;
        isFromDmPartner: boolean;
    } | undefined;
    content: string;
    createdAt: Date;
    lastModifiedAt: Date;
}[]>>;
export declare function AuthProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export declare function getAccNameCache({ id, origin }: UntypedId): string | undefined;
export declare function isInAccNameCache({ id, origin }: UntypedId): boolean;
export declare function setAccNameCache({ id, origin }: UntypedId, name: string): void;
export declare function accountNameOfId(accId: UntypedId, forceFetch?: boolean): Promise<{
    success: true;
    data: string;
} | {
    success: false;
    error: string;
}>;
//# sourceMappingURL=utils.d.ts.map