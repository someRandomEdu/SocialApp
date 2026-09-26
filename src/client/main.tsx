import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app.tsx";

console.log("Initializing the client!")

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App></App>
    </StrictMode>
);

console.log("Finished initializing the client!");
