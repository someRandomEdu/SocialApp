import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { err, isNullish, NonNull, Nullable, ok, Result } from "../shared/utils";
import { AccountCredentials, LoginData, loginDataSchema, Account, accountSchema } from "../shared/account";
import { Room, RoomArray, roomArraySchema } from "../shared/room";
import { createTheme } from "@mui/material";
import { Message } from "../shared/message.ts";
import { UntypedId } from "../shared/id.ts";
import { ClientToServerEvents, ORIGIN, ServerToClientEvents } from "../shared/routes.ts";
import { io, Socket as ClientSocket } from "socket.io-client";
import { problemDetailSchema } from "../shared/net.ts";
import z from "zod";
import { ConsoleTransport, LogLayer } from "loglayer";
import { serializeError } from "serialize-error";
import { TsLogTransport } from "@loglayer/transport-tslog";
import { Logger } from "tslog";
import { NotImplementedError } from "../shared/error.ts";

// rules for hooks: 
// useState if the component owns the value, 
// useContext with a plain value for non-owning values, and with a value-setter pair if you need to mutate it on top

export const socket: ClientSocket<ServerToClientEvents, ClientToServerEvents> = io(ORIGIN, { autoConnect: false, auth: { token: "" } });

socket.on("connect", () => {});

socket.on("connect_error", (error) => {

});

export const theme = createTheme({
    typography: {
        fontFamily: "cursive"
    },

    palette: {
        primary: {
            main: "#e91e62",
            light: "#f06291",
            dark: "#c2185a",
        },

        secondary: {
            main: "#6652ce",
            light: "#a899e1",
            dark: "#3931bf"
        },

        background: {
            default: "#000000",
            paper: "#000000"
        },

        text: {
            primary: "#ffffff"
        },

        info: {
            main: "#2ea0f2"
        },

        divider: "pink"
    }
});

export const homeOrigin = ORIGIN;

export const log = new LogLayer({
    errorSerializer: serializeError,
    transport: [new TsLogTransport({ logger: new Logger() })]
});

export const LoginDataContext = createContext({
    loginData: undefined as Nullable<LoginData>,
    setLoginData(value: Nullable<LoginData>) { this.loginData = value; }
});

export const RoomArrayContext = createContext({
    roomArray: [] as RoomArray,
    setRoomArray(value: RoomArray) { this.roomArray = value; }
});

export const ServerOriginsContext = createContext([homeOrigin] as string[]);

export const CurrentRoomContext = createContext({
    currentRoom: null as Nullable<Room>,
    setCurrentRoom(value: Nullable<Room>) { this.currentRoom = value; }
});

export async function getRoomsOf(token: string, origin: string) {
    try {
        const r = await fetch(`${origin}/rooms/public`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
        });

        return roomArraySchema.parse(await r.json());
    } catch (e) {
        console.error(e);
        return [];
    }
}

export const AuthOpsContext = createContext({
    async login({ name, password }: AccountCredentials): Promise<Result<LoginData, string>> { 
        throw new NotImplementedError();
    },

    logout(): boolean { throw new NotImplementedError(); }
});

export const ErrorContext = createContext({
    error: null as Nullable<string>,
    setError(value: Nullable<string>) { this.error = value; }
});

export const TokenContext = createContext(null as Nullable<string>);
export const AccountContext = createContext(null as Nullable<Account>);
export const RoomContext = createContext(null as Nullable<Room>);
export const MessagesContext = createContext(null as Nullable<Message[]>);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState(null as Nullable<string>);
    const [account, setAccount] = useState(null as Nullable<Account>);
    const { setError } = useContext(ErrorContext);

    useEffect(() => {
        if (isNullish(token)) {
            socket.disconnect();
            return;
        }

        socket.auth = { token };
        socket.connect();

        return () => { 
            socket.disconnect();
        };
    }, [token]);

    const login = useCallback(async ({ name, password }: AccountCredentials) => {
        try {
            const res = await fetch(`${ORIGIN}/accounts/sessions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, password })
            });

            const body = await res.json();

            if (!res.ok) {
                const displayedError = `Failed to log in successfully!`;
                setError(displayedError);
                return err(JSON.stringify(body));    
            }
            
            const { data, error, success } = loginDataSchema.safeParse(body);

            if (!success) {
                const e = z.prettifyError(error);
                const displayedError = `Malformed server response! Detail: ${e}`;
                setError(displayedError);
                return err(e);
            }

            setToken(data.token);
            setAccount(data.account);
            return ok(data);
        } catch (e) {
            const error = String(e);
            const displayedError = `Unhandled error: ${e}`;
            setError(displayedError);
            return err(error);
        }
    }, []);

    const logout = useCallback(() => {
        const r = !isNullish(token);
        setToken(null);
        setAccount(null);
        return r;
    }, [token]);

    const value = useMemo(
        () => { return { login, logout }; }, [login, logout]);

    return <>
        <TokenContext value={token}>
            <AccountContext value={account}>
                <AuthOpsContext value={value}>
                    {children}
                </AuthOpsContext>
            </AccountContext>
        </TokenContext>
    </>;
}

const accNameCache: Record<string, Record<number, string>> = Object.create(null);

export function getAccNameCache({ id, origin }: UntypedId) {
    return origin in accNameCache ? accNameCache[origin]![id] : undefined;
}

export function isInAccNameCache({ id, origin }: UntypedId) {
    return origin in accNameCache && id in accNameCache[origin]!;
}

export function setAccNameCache({ id, origin }: UntypedId, name: string) {
    if (origin in accNameCache) {
        accNameCache[origin]![id] = name;
        return;
    }

    accNameCache[origin] = Object.setPrototypeOf({ [id]: name }, null);
}

export async function accountNameOfId(accId: UntypedId, forceFetch = false) {
    if (!forceFetch) {
        const c = getAccNameCache(accId);

        if (c !== undefined) {
            return ok(c);
        }
    }

    try {
        const { id, origin } = accId;
        const rawPubAccData = await fetch(`${origin}/accounts/id/${id}`);

        if (!rawPubAccData.ok) {
            return err(`Fetching username request failed with error code ${rawPubAccData.status}`);
        }

        const data = await rawPubAccData.json();
        const pubAccData = accountSchema.safeParse(data);

        if (!pubAccData.success) {
            console.error(`Error occurred while parsing server data`, pubAccData.error);
            return err(`Error occurred while parsing server data`);
        }

        return ok(pubAccData.data.name);
    } catch (e) {
        return err(String(e));
    }
}
