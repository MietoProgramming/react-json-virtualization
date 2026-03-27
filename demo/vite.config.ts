import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base = process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : "/";

export default defineConfig({
  plugins: [react()],
  base,
  root: path.resolve(__dirname),
  resolve: {
    alias: {
      "react-json-virtualization": path.resolve(__dirname, "../src/index.ts")
    }
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
