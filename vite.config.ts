import { UserConfig } from "vite";

export default {
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
