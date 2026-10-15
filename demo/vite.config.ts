import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base = process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : "/";

export default defineConfig({
  plugins: [react()],
  base,
  root: path.resolve(__dirname),
  resolve: {
    alias: [
      { find: /^react-json-virtualization\/core$/, replacement: path.resolve(__dirname, "../src/core/index.ts") },
      { find: /^react-json-virtualization\/worker$/, replacement: path.resolve(__dirname, "../src/worker/index.ts") },
      { find: /^react-json-virtualization$/, replacement: path.resolve(__dirname, "../src/index.ts") }
    ]
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, "..")]
    }
  },
  build: {
    outDir: path.resolve(__dirname, "dist")
  }
});
