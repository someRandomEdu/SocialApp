import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { err, isNullish, Json, NotNull, Nullable, ok, Result } from "../shared/utils";
import { AccountCredentials, SuccessfulLoginData, successfulLoginDataSchema, Account, accountSchema, ModifyAccountData, modifyAccountDataSchema } from "../shared/account";
import { Room, RoomList, roomListSchema } from "../shared/room";
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
    loginData: undefined as Nullable<SuccessfulLoginData>,
    setLoginData(value: Nullable<SuccessfulLoginData>) { this.loginData = value; }
});

export const RoomListContext = createContext({
    roomList: [] as RoomList,
    setRoomList(value: RoomList): void { throw new NotImplementedError(); }
});

export const ServerOriginsContext = createContext([homeOrigin] as string[]);

export const RoomContext = createContext({
    room: null as Nullable<Room>,
    setRoom(value: Nullable<Room>): void { throw new NotImplementedError(); }
});

export async function getRoomsOf(token: string, origin: string) {
    try {
        const r = await fetch(`${origin}/rooms/public`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
        });

        return roomListSchema.parse(await r.json());
    } catch (e) {
        console.error(e);
        return [];
    }
}

export const AccountOperationsContext = createContext({
    async login(name: string, password: string, origin: string): Promise<Result<Account, unknown>> { 
        throw new NotImplementedError();
    },

    async logout(): Promise<boolean> { throw new NotImplementedError(); },

    async changeAccountInfo({ currentPassword, name, password, description }: ModifyAccountData): Promise<Result<Account, string>> { 
        throw new NotImplementedError(); 
    }
});

export const ErrorContext = createContext({
    error: null as Nullable<string>,
    setError(value: Nullable<string>) { this.error = value; }
});

export const TokenContext = createContext(null as Nullable<string>);
export const AccountContext = createContext(null as Nullable<Account>);
export const MessagesContext = createContext(null as Nullable<Message[]>);

export function AccountOperations({ children }: { children?: React.ReactNode }) {
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

    const login = useCallback(async (name: string, password: string, origin: string) => {
        try {
            const res = await fetch(`${origin}/accounts/sessions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, password })
            });

            const body: Json = await res.json();

            if (!res.ok) {
                return err(body);    
            }
            
            const { data, error, success } = successfulLoginDataSchema.safeParse(body);

            if (!success) {
                const e = z.prettifyError(error);
                return err(e);
            }

            setToken(data.token);
            setAccount(data.account);
            return ok(data.account);
        } catch (e) {
            return err(e);
        }
    }, [token, account]);

    const logout = useCallback(async () => {
        const r = !isNullish(token);
        setToken(null);
        setAccount(null);
        return r;
    }, [token, account]);

    const changeAccountInfo = useCallback(async (d: ModifyAccountData) => {
        if (!account) {
            return err("Can't change account info without logging in!");
        }
        
        const { id, origin } = account;
        const b = modifyAccountDataSchema.safeParse(d);

        if (!b.success) {
            return err(z.prettifyError(b.error));
        }

        const response = await fetch(`${origin}/accounts/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(b.data satisfies ModifyAccountData)
        });

        return err("");
    }, []);

    const ops = useMemo(() => { 
        return { login, logout, changeAccountInfo }; }, [login, logout, changeAccountInfo]);

    return <>
        <TokenContext value={token}>
            <AccountContext value={account}>
                <AccountOperationsContext value={ops}>
                    {children}
                </AccountOperationsContext>
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
            log.withContext(pubAccData.error).warn(`Error occurred while parsing server data`);
            return err(`Error occurred while parsing server data`);
        }

        return ok(pubAccData.data.name);
    } catch (e) {
        return err(String(e));
    }
}
