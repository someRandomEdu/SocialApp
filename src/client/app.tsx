import { useState } from "react";
import { PublicAccount } from "../shared/account";
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
    ThemeProvider
} from "@mui/material";

import * as React from "react";

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
            dark: "#c2185a"
        },

        secondary: {
            main: "#6652ce",
            light: "#a899e1",
            dark: "#3931bf"
        },

        background: {
            default: "#000000"
        },

        text: {
            primary: "#ffffff"  
        },

        info: {
            main: "#2ea0f2"
        },
    }
});

export function App() {
    const [account, setAccount] = useState(undefined as PublicAccount | undefined);
    const [dialogOpened, setDialogOpened] = useState(false);

    return <ThemeProvider theme={theme}>
        <CssBaseline>
            <Box
                sx={{
                    position: "fixed",
                    left: 0,
                    bottom: 0,
                    width: "60px    ",
                    height: "100vh",
                    color: "whitesmoke",
                    backgroundColor: "#7f7f7f",
                    border: "1px solid",
                    borderColor: "divider",
                }}
            >
                Hu Tao cute qwq
            </Box>

            <Container style={{ display: "flex", flexDirection: "column" }}
                sx={{ width: "auto", height: "auto" }}>

                <Dialog open={dialogOpened} sx={{color: "#0099ff"}} style={{
                    display: "flex", flexDirection: "column"}}
                    fullWidth={true} maxWidth="sm" slotProps={{
                        paper: {
                            sx: {
                                backgroundColor: "#7f7f7f"
                            }
                        }
                    }}>

                    <DialogTitle style={{ display: "flex" }}>
                        Welcome back~
                        <IconButton type="button" sx={{marginLeft: "auto"}} 
                            onClick={(e) => { 
                                setDialogOpened(false); 
                            }}>

                            <CloseIcon></CloseIcon>
                        </IconButton>
                    </DialogTitle>

                    <DialogContent style={{display: "flex", flexDirection: "column"}}>
                        <TextField label={"Username"}></TextField>
                        <TextField label={"Password"} type="password"></TextField>
                    </DialogContent>

                    <DialogActions>
                        <Button type="submit">Login</Button>
                    </DialogActions>
                </Dialog>
                
                <Button onClick={(e) => {
                    setDialogOpened(true);
                }}>Login</Button>

            </Container>

            <Container>
                <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "flex-end",
                    alignItems: "flex-start", marginTop: "auto", height: "90vh" }}>
                    <Box>
                        not logged in qwq
                    </Box>

                    <Box>
                        meow...
                    </Box>
                </Box>
            </Container>
        </CssBaseline>
    </ThemeProvider>;
}
