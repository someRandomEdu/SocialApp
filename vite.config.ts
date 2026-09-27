import { defineConfig } from "vite";

export default defineConfig({
    build: {
        outDir: "dist/client",
        emptyOutDir: true
    }, 

    server: {
        host: "localhost",
        port: 5173,
        strictPort: false
    }
});
