import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

import electron from "vite-plugin-electron";
import electronRenderer from "vite-plugin-electron-renderer";
import polyfillExports from "vite-plugin-electron-renderer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode == "development" ? "" : "./",
  plugins: [
    vue(),
    electron([
      { entry: "./electron/main.ts" },
    ]),
    electronRenderer(),
    polyfillExports(),
  ],
  server: {
    port: 4396,
    hmr: true,
    cors: true,
  }
}));
