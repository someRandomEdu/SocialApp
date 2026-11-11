import React, { createContext, useContext, useEffect, useState } from "react";

import {
    Alert,
    Autocomplete,
    Box,
    Button,
    CssBaseline,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Snackbar,
    TextField,
    ThemeProvider,
    Typography
} from "@mui/material";

import { LoginData, loginDataSchema, Account } from "../shared/account";
import LoginIcon from '@mui/icons-material/Login';
import ExploreIcon from '@mui/icons-material/Explore';
import SettingsIcon from '@mui/icons-material/Settings';
import SendIcon from '@mui/icons-material/Send';
import { invoke, isNullish, Nullable } from "../shared/utils";

import {
    AccountContext,
    accountNameOfId,
    AuthOpsContext,
    AuthOps,
    RoomContext,
    getRoomsOf,
    log,
    LoginDataContext,
    MessagesContext,
    RoomArrayContext,
    ServerOriginsContext,
    socket,
    theme,
    TokenContext
} from "./utils";

import { Room, RoomArray } from "../shared/room";
import { Message, messageArraySchema, messageIdEq, messageIdNe } from "../shared/message";
import z from "zod";
import { io } from "socket.io-client";
import { ORIGIN, ServerToClientEvents } from "../shared/routes";

// https://react-typescript-cheatsheet.netlify.app/
// https://www.mui-treasury.com/
// https://mui.com/material-ui/material-icons/

function MessageView({ message }: { message: Message }) {
    const [accName, setAccName] = useState("");

    useEffect(() => {
        invoke(async () => {
            const name = await accountNameOfId(message.senderAccount);

            if (name.success) {
                setAccName(name.data);
            }
        }).then();
    }, [message.senderAccount]);

    return <>
        <Box>
            <Typography sx={{}} variant="h6">{accName}</Typography>
            <Typography sx={{ color: "gray" }} variant="caption">{message.createdAt.toString()}</Typography>
            <Typography sx={{}} variant="body1">{message.content}</Typography>
        </Box>
    </>;
}

function SideBar() {
    const { roomArray, setRoomArray } = useContext(RoomArrayContext);
    const { setRoom: setCurrentRoom } = useContext(RoomContext);
    const token = useContext(TokenContext);
    const account = useContext(AccountContext);

    function onClickServer(room: Room) {
        if (isNullish(token)) {
            setCurrentRoom(room);
        }
    }

    useEffect(() => {
        invoke(async () => {
            if (isNullish(token) || isNullish(account)) {
                return;
            }

            const roomList = await getRoomsOf(token, account.origin);
            setRoomArray(roomList);
        }).then();
    }, [token, account]);

    return <>
        <Typography>Servers</Typography>

        <ul>
            {roomArray.map((room, i) =>
                <li key={i}>
                    <Button onClick={(_) =>
                        onClickServer(room)}>{room.name}</Button>
                </li>)}
        </ul>
    </>;
}

function ServerVisitor() {
    const serverOrigins = useContext(ServerOriginsContext);

    async function onVisitServer(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const serverOrigin = formData.get("serverOrigin");

        if (typeof serverOrigin !== "string" || serverOrigin === "") {
            return;
        }
    }

    return <>
        <Box component="form" onSubmit={onVisitServer} sx={{ display: "flex", border: "2px solid", borderColor: "pink" }}>
            <Autocomplete freeSolo={true} options={serverOrigins}
                renderInput={(params) =>
                    <TextField {...params} name="serverOrigin" label="Server"></TextField>}
                sx={{
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "pink" },
                    "& .MuiInputLabel-root": { color: "white" },
                    "& .MuiInputLabel-root.Mui-focused": { color: "white" },
                    flex: 1
                }}
                slotProps={{
                    popper: {
                        placement: "top-start"
                    },

                    listbox: {
                        sx: {
                            "& .MuiAutocomplete-option": {
                                border: "2px solid",
                                borderColor: "pink"
                            }
                        }
                    }
                }}>
            </Autocomplete>

            <IconButton color="primary" type="submit">
                <ExploreIcon></ExploreIcon>
            </IconButton>
        </Box>
    </>;
}

function LoginPanel() {
    const [dialogOpened, setDialogOpened] = useState(false);
    const [displayErrorNotification, setDisplayErrorNotification] = useState(false);
    const [loginError, setLoginError] = useState("");
    const { login } = useContext(AuthOpsContext);

    async function onSubmitLoginForm(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;
        const password = formData.get("password") as string;
        const origin = formData.get("origin") as string;

        try {
            const rawLoginData = await fetch(`${origin}/accounts/sessions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name, password: password })
            });

            if (!rawLoginData.ok) {
                const e = `Fetch error: ${rawLoginData.status} ${await rawLoginData.json()}`;
                setLoginError(e);
                console.error(e);
                return;
            }

            console.log("Received login data from server!");
            const j = loginDataSchema.safeParse(await rawLoginData.json());
            console.log(j);

            if (!j.success) {
                const e = `Malformed server data received; parser error: ${j.error}`;
                console.error(e);
                setLoginError(e);
                setDisplayErrorNotification(true);
                return;
            }

            const a: Account = j.data.account;

            if (a.name !== name || a.origin !== origin) {
                const e = `Server didn't return matching account data...`;
                console.error(e);
                setLoginError(e);
                setDisplayErrorNotification(true);
                return;
            }

            console.log("Successfully logged in!");
            setDialogOpened(false);
        } catch (e) {
            setLoginError(`Possibly unknown error occurred: ${e}`);
            console.error(e);
            setDisplayErrorNotification(true);
        }
    }

    return <>
        <Box>
            <IconButton color="primary" onClick={
                (e) => setDialogOpened(true)
            }>
                <Typography>Login</Typography>
                <LoginIcon sx={{ color: "white" }}></LoginIcon>
            </IconButton>

            <Dialog id="loginForm" open={dialogOpened} slotProps={{ paper: { sx: { border: "2px solid pink" } } }}
                onClose={(e) => setDialogOpened(false)}>
                <Box sx={{ display: "inline-flex", flexDirection: "column" }}>
                    <DialogTitle sx={{ color: theme.palette.primary.main }}>Welcome back~</DialogTitle>

                    <DialogContent sx={{ display: "inline-flex", flexDirection: "column" }}>
                        <form onSubmit={onSubmitLoginForm}>
                            <Box sx={{ display: "inline-flex", flexDirection: "column", gap: "4px" }}>
                                <TextField required={true} name="name" autoComplete="username" label="Username"
                                    type="text" variant="outlined"
                                    sx={{
                                        "& .MuiOutlinedInput-notchedOutline": {
                                            borderColor: "pink"
                                        }
                                    }}
                                    slotProps={{ inputLabel: { sx: { color: theme.palette.primary.main } } }}>
                                </TextField>

                                <TextField required={true} name="password" autoComplete="current-password" label="Password"
                                    type="password" variant="outlined"
                                    sx={{
                                        "& .MuiOutlinedInput-notchedOutline": {
                                            borderColor: "pink"
                                        }
                                    }}
                                    slotProps={{ inputLabel: { sx: { color: theme.palette.primary.main } } }}>
                                </TextField>

                                {/* TODO: Remove explicit origin field? */}
                                <TextField required={true} name="origin" autoComplete="url" label="Origin"
                                    type="url" variant="outlined"
                                    sx={{
                                        "& .MuiOutlinedInput-notchedOutline": {
                                            borderColor: "pink"
                                        }
                                    }}
                                    slotProps={{ inputLabel: { sx: { color: theme.palette.primary.main } } }}>
                                </TextField>

                                <DialogActions>
                                    <Button type="submit" variant="outlined">Login</Button>
                                </DialogActions>
                            </Box>
                        </form>
                    </DialogContent>

                    <Snackbar open={displayErrorNotification} autoHideDuration={5000} message="Login error"
                        onClose={(e) => setDisplayErrorNotification(false)}>
                        <Alert variant="outlined" severity="error" sx={{}}>
                            An error occurred while logging in: {loginError}
                        </Alert>
                    </Snackbar>
                </Box>
            </Dialog>
        </Box>
    </>;
}

function ChatPanel() {
    const [messages, setMessages] = useState<Message[]>([]);
    const room = useContext(RoomContext);

    useEffect(() => {
        function onMessageCreated(data: Message) {
            setMessages([...messages, data]);
        }

        function onMessageModified(oldData: Message, newData: Message) {
            const i = messages.findIndex((m) => messageIdEq(m, oldData));

            if (i < 0) {
                log.withContext({ oldData, newData }).warn("Can't find the old message matching the one server sent!");
                return;
            }

            const msgs = [...messages];
            msgs[i] = newData;
            setMessages(msgs);
        }

        function onMessageDeleted(data: Message) {
            setMessages(messages.filter((m) => messageIdNe(m, data)));
        }

        socket.on("onMessageCreated" satisfies keyof ServerToClientEvents, onMessageCreated);
        socket.on("onMessageModified" satisfies keyof ServerToClientEvents, onMessageModified);
        socket.on("onMessageDeleted" satisfies keyof ServerToClientEvents, onMessageDeleted);

        return () => {
            socket.off("onMessageCreated" satisfies keyof ServerToClientEvents, onMessageCreated);
            socket.off("onMessageModified" satisfies keyof ServerToClientEvents, onMessageModified);
            socket.off("onMessageDeleted" satisfies keyof ServerToClientEvents, onMessageDeleted);
        };
    }, [socket]);

    return <>

    </>;
}

function App() {
    return <>
        <Box sx={{
            display: "flex",
            flexDirection: "row",
            minHeight: 0,
            height: "100vh"
        }}>
            <Box sx={{
                display: "flex",
                flexDirection: "column",
                width: "fit-content",
                height: "100%"
            }}>
                <Box sx={{
                    position: "relative",
                    top: 0,
                    left: 0,
                    overflowX: "auto",
                    border: "2px solid",
                    borderColor: "pink"
                }}>
                    <SideBar></SideBar>
                </Box>

                <Box sx={{
                    position: "relative", bottom: 0, left: 0, display: "inline-flex",
                    flexDirection: "column-reverse", alignSelf: "flex-end", width: "20vw",
                    height: "auto", marginTop: "auto", border: "2px solid", borderColor: "pink"
                }}>
                    <LoginPanel></LoginPanel>
                    <ServerVisitor></ServerVisitor>
                </Box>
            </Box>

            <Box sx={{
                flex: 1
            }}>

            </Box>
        </Box>
    </>;
}

export function Main() {
    const [loginData, setLoginData] = useState(undefined as Nullable<LoginData>);
    const [roomArray, setRoomArray] = useState([] as RoomArray);
    const [currentRoom, setCurrentRoom] = useState(null as Nullable<Room>);

    return <>
        <AuthOps>
            <LoginDataContext value={{ loginData, setLoginData }}>
                <RoomArrayContext value={{ roomArray, setRoomArray }}>
                        <RoomContext value={{ room: currentRoom, setRoom: setCurrentRoom }}>
                            <ThemeProvider theme={theme}>
                                <CssBaseline>
                                    <App></App>
                                </CssBaseline>
                            </ThemeProvider>
                        </RoomContext>
                </RoomArrayContext>
            </LoginDataContext>
        </AuthOps>
    </>;
}
