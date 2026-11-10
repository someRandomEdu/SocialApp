import { UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFile } from "node:fs/promises";
import path from "node:path";

export default {
    plugins: [react()],
    base: "./",

    build: {
        outDir: "dist/client",
        emptyOutDir: true
    }, 

    server: {
        host: "localhost",
        port: 5173,
        strictPort: false,

        https: {
            cert: await readFile(path.join(import.meta.dirname, "certs", "localhost.pem")),
            key: await readFile(path.join(import.meta.dirname, "certs", "localhost-key.pem"))
        }
    }
} satisfies UserConfig;
