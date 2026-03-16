import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
