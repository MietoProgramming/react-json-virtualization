import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

const fixtureFiles = [
  "large-10mb.json",
  "large-50mb.json",
  "large-100mb.json"
];

const loadParser = async () => {
  const esmPath = resolve("dist/index.js");
  const altEsmPath = resolve("dist/index.mjs");
  const modulePath = existsSync(esmPath) ? esmPath : altEsmPath;
  const mod = await import(modulePath);
  if (typeof mod.parseJsonIncremental !== "function") {
    throw new Error("parseJsonIncremental export not found in dist build");
  }
  return mod.parseJsonIncremental;
};

const run = async () => {
  const parseJsonIncremental = await loadParser();

  for (const fileName of fixtureFiles) {
    const filePath = resolve("bench/fixtures/generated", fileName);
    const input = await readFile(filePath, "utf8");

    const startedAt = performance.now();
    await parseJsonIncremental(input, { yieldIntervalMs: 8 });
    const elapsedMs = performance.now() - startedAt;

    const sizeMb = (Buffer.byteLength(input, "utf8") / (1024 * 1024)).toFixed(2);
    console.log(`${fileName} (${sizeMb} MB): ${elapsedMs.toFixed(2)} ms`);
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
