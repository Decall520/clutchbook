import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    allowedHosts: [".trycloudflare.com"]
  },
  preview: {
    allowedHosts: [".trycloudflare.com"]
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
