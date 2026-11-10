import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Main } from "./app.tsx";
import { log } from "./utils.tsx";

log.info(`React version: ${React.version}`);
log.info("Initializing the client!");
const r = document.getElementById("root");

if (!r) {
    log.error("Can't find the root of the client's document!");
} else {
    createRoot(r).render(
        <StrictMode>
            <Main></Main>
        </StrictMode>
    );

    log.info("Finished initializing the client!");
}
