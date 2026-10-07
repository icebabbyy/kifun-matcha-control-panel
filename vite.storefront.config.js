import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "./",
  publicDir: "storefront-public",
  build: {
    outDir: "dist-public",
    emptyOutDir: true,
    rollupOptions: {
      input: { index: fileURLToPath(new URL("./storefront-entry.html", import.meta.url)) }
    }
  }
});
