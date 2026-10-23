import { useState } from "react";
import CloseIcon from '@mui/icons-material/Close';

import {
    Box,
    Button,
    Container,
    createTheme,
    CssBaseline,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField,
    ThemeProvider,
    Typography
} from "@mui/material";

import * as React from "react";
import { PublicAccount, publicAccountSchema } from "../shared/account";
import { HttpStatusCodes } from "../shared/net";
import SettingsIcon from '@mui/icons-material/Settings';
import LoginIcon from '@mui/icons-material/Login';
import { uuid } from "zod";

// https://react-typescript-cheatsheet.netlify.app/
// https://www.mui-treasury.com/
// https://mui.com/material-ui/material-icons/

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
        }
    }
});

export function App() {
    const [loggedIn, setLoggedIn] = useState(false);
    const [accView, setAccView] = useState(<></>);
    const [token, setToken] = useState(undefined as string | undefined);
    const [dialogOpened, setDialogOpened] = useState(false);

    return <>
        <ThemeProvider theme={theme}>
            <CssBaseline>
                <Box
                    sx={{
                        position: "fixed",
                        top: 0,
                        bottom: 0,
                        width: "60px",
                        color: "whitesmoke",
                        border: "2px solid",
                        borderColor: "pink"
                    }}
                >

                    server list
                </Box>

                <Box 
                    sx={{ position: "absolute", bottom: 0, left: 0, display: "inline-flex", flexDirection: "column", 
                    alignSelf: "flex-end", width: "fit-content", border: "2px solid", borderColor: "pink", 
                    marginTop: "auto", backgroundColor: "black" }}
                >
                    
                    {accView}

                    <IconButton color="primary" onClick={
                        (e) => { e.preventDefault(); setDialogOpened(true); }
                    }>
                        <Typography>Login</Typography>
                        <LoginIcon sx={{ color: "white" }}></LoginIcon>
                    </IconButton>
                </Box>
                
                <Dialog id="loginForm" open={dialogOpened} slotProps={{paper: {sx: {border: "2px solid pink"}}}} onClose={(e) => { setDialogOpened(false); }}>
                    <Box sx={{display: "inline-flex", flexDirection: "column"}}>
                        <DialogTitle sx={{color: theme.palette.primary.main}}>Welcome back~</DialogTitle>

                        <DialogContent sx={{display: "inline-flex", flexDirection: "column"}}>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const name = formData.get("name") as string;
                                const password = formData.get("password") as string;
                                const origin = formData.get("origin") as string;
                                console.log({name, password, origin});

                                try {
                                    const r = await fetch(`${origin}/accounts/sessions`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ name: name, password: password })
                                    });

                                    if (!r.ok) {
                                        console.log(`Fetch error: ${r.status} ${await r.json()}`);
                                        return;
                                    }

                                    console.log("Successfully requested data!");
                                    const j = await r.json();
                                    console.log(j);
                                    const a = publicAccountSchema.safeParse(j.account);

                                    if (!a.success) {
                                        console.log(`Parse error: ${a.error}`);
                                        return;
                                    }

                                    if (a.data.name !== name || a.data.origin !== origin) {
                                        console.log(`Server didn't return a matching account data...`);
                                        return;
                                    }

                                    console.log("Successfully logged in!");
                                    setLoggedIn(true);

                                    setAccView(<>
                                        <Box sx={{display: "inline-flex", flexDirection: "row"}}>
                                            <Typography>{name}@{origin}</Typography>
                                            
                                            <IconButton sx={{ color: "white" }} onClick={(e) => {
                                                e.preventDefault();
                                            }}>
                                                <SettingsIcon></SettingsIcon>
                                            </IconButton>
                                        </Box>
                                    </>);

                                    setDialogOpened(false);
                                } catch (e) {
                                    console.error(e);

                                    if (Error.isError(e)) {
                                        console.error({ ...e });
                                    }
                                }
                            }}>
                                <Box sx={{display: "inline-flex", flexDirection: "column", gap: "4px"}}>
                                    <TextField required={true} name="name" autoComplete="username" label="Username" type="text" variant="outlined"
                                        sx={{"& .MuiOutlinedInput-notchedOutline": {
                                            borderColor: "pink"
                                        }}}
                                        slotProps={{inputLabel: {sx: {color: theme.palette.primary.main}}}}>
                                    </TextField>

                                    <TextField required={true} name="password" autoComplete="current-password" label="Password" type="password" variant="outlined"
                                        sx={{"& .MuiOutlinedInput-notchedOutline": {
                                            borderColor: "pink"
                                        }}}
                                        slotProps={{inputLabel: {sx: {color: theme.palette.primary.main}}}}>
                                    </TextField>

                                    <TextField required={true} name="origin" autoComplete="url" label="Origin" type="url" variant="outlined"
                                        sx={{"& .MuiOutlinedInput-notchedOutline": {
                                            borderColor: "pink"
                                        }}}
                                        slotProps={{inputLabel: {sx: {color: theme.palette.primary.main}}}}>
                                    </TextField>

                                    <DialogActions>
                                        <Button type="submit" variant="contained">Login</Button>
                                    </DialogActions>
                                </Box>
                            </form>
                        </DialogContent>
                    </Box>
                </Dialog>
            </CssBaseline>
        </ThemeProvider>
    </>;
}
