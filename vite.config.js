import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiPort = Number(env.PORT || 4000);
  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
      proxy: { "/api": { target: `http://localhost:${apiPort}`, changeOrigin: true } },
    },
    preview: { host: "0.0.0.0", port: 4173, strictPort: true },
  };
});
