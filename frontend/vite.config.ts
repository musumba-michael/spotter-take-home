/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// This function will be called with the current mode (development or production)
export default defineConfig(({ mode }) => {
    const isProduction = mode === "production";

    return {
        base: isProduction ? "/static/" : "/",
        plugins: [react()],
        preview: {
            port: 3001,
            strictPort: true,
        },
        server: {
            port: 3001,
            strictPort: true,
            host: true,
            origin: "http://localhost:3001",
        },
        build: {
            outDir: "dist",
            assetsDir: "static/assets",
            rollupOptions: {
                output: {
                    assetFileNames: (assetInfo) => {
                        return `static/assets/${assetInfo.name?.split(".")[0]}-[hash][extname]`;
                    },
                },
            },
        },
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
                "@components": path.resolve(__dirname, "./src/components"),
                "@pages": path.resolve(__dirname, "./src/pages/index.ts"),
                "@assets": path.resolve(__dirname, "./src/assets"),
                "@store": path.resolve(__dirname, "./src/store"),
                "@hooks": path.resolve(__dirname, "./src/hooks"),
                "@utils": path.resolve(__dirname, "./src/utils"),
                "@types": path.resolve(__dirname, "./src/types"),
                "@services": path.resolve(__dirname, "./src/services"),
                "@lib": path.resolve(__dirname, "./src/lib"),
            },
        },
        test: {
            globals: true,
            environment: "jsdom",
            setupFiles: ["./src/test/setup.ts"],
        },
    };
});
