import { spawn } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function pythonApi() {
  return {
    name: "house-money-python-api",
    configureServer(server) {
      if (process.env.VITEST) return;
      const child = spawn("python", ["scripts/local_api.py"], {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
      const quiet = (buf) => {
        const text = String(buf).trim();
        if (text && !/sk-|api[_-]?key/i.test(text)) {
          server.config.logger.info(`[api] ${text}`);
        }
      };
      child.stdout?.on("data", quiet);
      child.stderr?.on("data", quiet);
      const stop = () => {
        if (!child.killed) child.kill();
      };
      process.on("exit", stop);
      server.httpServer?.once("close", stop);
    },
  };
}

export default defineConfig({
  plugins: [react(), pythonApi()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
  },
});
