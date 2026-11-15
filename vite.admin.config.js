import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiPort = Number(env.PORT || 4000);
  return {
    root: path.resolve(process.cwd(), "admin-app"),
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5175,
      strictPort: true,
      proxy: { "/api": { target: `http://localhost:${apiPort}`, changeOrigin: true } },
    },
    preview: { host: "0.0.0.0", port: 4175, strictPort: true },
    build: { outDir: path.resolve(process.cwd(), "dist-admin"), emptyOutDir: true },
  };
});
