import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App, theme } from "./app.tsx";
import { ThemeProvider } from "@emotion/react";

console.log("Initializing the client!");

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider theme={theme}>
            <App></App>
        </ThemeProvider>
    </StrictMode>
);

console.log("Finished initializing the client!");
