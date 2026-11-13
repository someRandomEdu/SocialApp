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

import { SuccessfulLoginData, successfulLoginDataSchema, Account } from "../shared/account";
import LoginIcon from '@mui/icons-material/Login';
import ExploreIcon from '@mui/icons-material/Explore';
import SettingsIcon from '@mui/icons-material/Settings';
import SendIcon from '@mui/icons-material/Send';
import { invoke, isNullish, Json, Nullable } from "../shared/utils";

import {
    AccountContext,
    accountNameOfId,
    AccountOperationsContext,
    AccountOperations,
    RoomContext,
    getRoomsOf,
    log,
    LoginDataContext,
    RoomListContext,
    ServerOriginsContext,
    socket,
    theme,
    TokenContext
} from "./utils";

import { Room, RoomList } from "../shared/room";
import { Message, messageListSchema, messageIdEq, messageIdNe } from "../shared/message";
import z from "zod";
import { io } from "socket.io-client";
import { ORIGIN, routeNames, ServerToClientEvents } from "../shared/routes";
import { problemDetailSchema } from "../shared/net";

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
    const { roomList, setRoomList } = useContext(RoomListContext);
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
            setRoomList(roomList);
        }).then();
    }, [token, account]);

    return <>
        <Typography>Servers</Typography>

        <ul>
            {
                roomList.map((room, i) =>
                    <li key={i}>
                        <Button onClick={(_) =>
                            onClickServer(room)}>{room.name}</Button>
                    </li>)
            }
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
    const [loginError, setLoginError] = useState(null as Nullable<string>);
    const { login } = useContext(AccountOperationsContext);

    async function onSubmitLoginForm(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get("name");
        const password = formData.get("password");
        const origin = formData.get("origin");

        if (typeof name !== "string" || typeof password !== "string" || typeof origin !== "string") {
            log.withContext({ name, password, origin }).error(`"name", "password" and "origin" are not all strings!`);
            setLoginError(`"name", "password" and "origin" are not all strings!`);
            return;
        }

        const r = await login(name, password, origin);

        if (!r.success) {
            const { success, data, error } = problemDetailSchema.safeParse(r.error);
            const errLog = log.withContext({ error: r.error });

            if (!success) {
                setLoginError(`Unknown error!`);
                errLog.withContext({ errorBodyParseError: error }).warn(`Unknown error occurred!`);
                return;
            }

            const { title } = data;
            const loginError = `${title}`;
            errLog.withContext(data).info(loginError);
            setLoginError(loginError);
            return;
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
                    <DialogTitle sx={{ color: theme.palette.primary.main }}>{"Welcome back~"}</DialogTitle>

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
                        onClose={(_) => setDisplayErrorNotification(false)}>
                        <Alert variant="outlined" severity="error" sx={{}}>
                            {loginError}
                        </Alert>
                    </Snackbar>
                </Box>
            </Dialog>
        </Box>
    </>;
}

function ChatPanel() {
    const [messages, setMessages] = useState<Message[]>([]);
    const { room } = useContext(RoomContext);
    const token = useContext(TokenContext);

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
        
        async function fetchMessages() {
            if (!room) { 
                log.error("User hasn't selected a room yet!");
                return;
            }

            try {
                const response = await fetch(routeNames.roomMessages(room.origin, room.id), {
                    method: "GET",
                    headers: { Authorization: `Bearer ${token}` }
                });

                const body: Json = await response.json();

                if (!response.ok) {
                    log.withMetadata({ error: body }).error(`Fetching messages of room ${room.name} failed with status ${response.status}!`);
                    return;
                }

                const { success, data, error } = messageListSchema.safeParse(body);

                if (!success) {
                    log.withMetadata({ error }).error(`Error while parsing messages of room ${room.name}`);
                    return;
                }

                setMessages(data);
            } catch (error) {
                log.withMetadata({ error }).error(`Unknown error occurred while fetching message of room ${room.name}`);
            }
        }

        if (!room) {
            return;
        }

        socket.on("onMessageCreated" satisfies keyof ServerToClientEvents, onMessageCreated);
        socket.on("onMessageModified" satisfies keyof ServerToClientEvents, onMessageModified);
        socket.on("onMessageDeleted" satisfies keyof ServerToClientEvents, onMessageDeleted);
        fetchMessages().then();

        return () => {
            socket.off("onMessageCreated" satisfies keyof ServerToClientEvents, onMessageCreated);
            socket.off("onMessageModified" satisfies keyof ServerToClientEvents, onMessageModified);
            socket.off("onMessageDeleted" satisfies keyof ServerToClientEvents, onMessageDeleted);
        };
    }, [room]);

    if (!room) {
        return <>{"When you view a room, messages can be shown here"}</>;
    }

    return <>
        <Box sx={{display: "flex", flexDirection: "row"}}>
            <Box>
                <Typography variant="h6">${room.name}</Typography>
            </Box>

            <Box component="div" sx={{ overflow: "auto" }}>
                {messages.map((m) => <MessageView message={m}></MessageView>)}
            </Box>

            <Box component="form" sx={{ position: "relative", bottom: 0, left: 0, marginTop: "auto" }}>
                <TextField name="message" label="Type your message"></TextField>

                <IconButton color="primary" type="submit">
                    <SendIcon></SendIcon>
                </IconButton>
            </Box>
        </Box>
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
                <ChatPanel></ChatPanel>
            </Box>
        </Box>
    </>;
}

export function EntryPoint() {
    const [loginData, setLoginData] = useState(undefined as Nullable<SuccessfulLoginData>);
    const [roomList, setRoomList] = useState([] as RoomList);
    const [room, setRoom] = useState(null as Nullable<Room>);

    return <>
        <AccountOperations>
            <LoginDataContext value={{ loginData, setLoginData }}>
                <RoomListContext value={{ roomList, setRoomList }}>
                        <RoomContext value={{ room, setRoom }}>
                            <ThemeProvider theme={theme}>
                                <CssBaseline>
                                    <App></App>
                                </CssBaseline>
                            </ThemeProvider>
                        </RoomContext>
                </RoomListContext>
            </LoginDataContext>
        </AccountOperations>
    </>;
}
