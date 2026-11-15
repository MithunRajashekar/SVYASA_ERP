import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, "");
  const apiPort = Number(env.PORT || 4000);
  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5174,
      strictPort: true,
      proxy: { "/api": { target: `http://localhost:${apiPort}`, changeOrigin: true } },
    },
    preview: { host: "0.0.0.0", port: 4174, strictPort: true },
  };
});
