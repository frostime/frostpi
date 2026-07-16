import { resolve } from "node:path";

import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      $shared: resolve(import.meta.dirname, "src/shared"),
      $webview: resolve(import.meta.dirname, "src/webview"),
      "@frostime/pi-rpc": resolve(import.meta.dirname, "../../packages/pi-rpc/src/index.ts"),
    },
  },
  build: {
    outDir: "dist/webview",
    emptyOutDir: false,
    sourcemap: process.env.FROSTPI_SOURCEMAP === "1",
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(import.meta.dirname, "src/webview/main.ts"),
      output: {
        entryFileNames: "webview.js",
        assetFileNames: (assetInfo) => assetInfo.name?.endsWith(".css") ? "webview.css" : "assets/[name][extname]",
        chunkFileNames: "chunks/[name].js",
      },
    },
  },
});
