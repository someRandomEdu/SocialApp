import { UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default {
    plugins: [
        react(), 

        // basicSsl({
        //     name: "socialApp",
        //     domains: ["*.com"],
        //     ttlDays: 30,
        //     certDir: "./certs"
        // })
    ],

    build: {
        outDir: "dist/client",
        emptyOutDir: true
    }, 

    server: {
        host: "localhost",
        port: 5173,
        strictPort: false
    },
} satisfies UserConfig;
