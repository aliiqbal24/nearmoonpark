import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
export default defineConfig({
  root,
  resolve: { alias: { "@": root } },
  envPrefix: "ART_PUBLIC_",
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    fs: {
      strict: true,
      allow: [root],
      deny: [
        "**/.env*",
        "**/.dev.vars*",
        "**/.near-local/**",
        "**/.openai/**",
        "**/.git/**",
      ],
    },
  },
});
