import React from "react";
import { Nullable, Result } from "../shared/utils";
import { SuccessfulLoginData, Account, ModifyAccountData } from "../shared/account";
import { Room, RoomList } from "../shared/room";
import { UntypedId } from "../shared/id.ts";
import { ClientToServerEvents, ServerToClientEvents } from "../shared/routes.ts";
import { Socket as ClientSocket } from "socket.io-client";
import { LogLayer } from "loglayer";
export declare const socket: ClientSocket<ServerToClientEvents, ClientToServerEvents>;
export declare const theme: import("@mui/material").Theme;
export declare const homeOrigin = "https://localhost:3000";
export declare const log: LogLayer;
export declare const LoginDataContext: React.Context<{
    loginData: Nullable<SuccessfulLoginData>;
    setLoginData(value: Nullable<SuccessfulLoginData>): void;
}>;
export declare const RoomListContext: React.Context<{
    roomList: RoomList;
    setRoomList(value: RoomList): void;
}>;
export declare const ServerOriginsContext: React.Context<string[]>;
export declare const RoomContext: React.Context<{
    room: Nullable<Room>;
    setRoom(value: Nullable<Room>): void;
}>;
export declare function getRoomsOf(token: string, origin: string): Promise<{
    id: number;
    origin: string;
    name: string;
    isPublic: boolean;
    createdAt: Date;
    description: string;
    ownerAccount: {
        id: number;
        origin: string;
    };
}[]>;
export declare const AccountOperationsContext: React.Context<{
    login(name: string, password: string, origin: string): Promise<Result<Account, unknown>>;
    logout(): Promise<boolean>;
    changeAccountInfo({ currentPassword, name, password, description }: ModifyAccountData): Promise<Result<Account, string>>;
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
export declare function AccountOperations({ children }: {
    children?: React.ReactNode;
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