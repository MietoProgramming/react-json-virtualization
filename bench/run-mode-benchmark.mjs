import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

const fixturesDir = resolve("bench/fixtures/generated");
const fixtureFiles = (process.env.MODE_BENCH_FIXTURES ?? "")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);
const iterations = Number.parseInt(process.env.MODE_BENCH_ITERATIONS ?? "5", 10);

const listAvailableFixtures = async () => {
  const entries = await readdir(fixturesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en", { numeric: true }));
};

const loadLibrary = async () => {
  const esmPath = resolve("dist/index.js");
  const altEsmPath = resolve("dist/index.mjs");
  const modulePath = existsSync(esmPath) ? esmPath : altEsmPath;
  const mod = await import(modulePath);

  const requiredExports = ["parseJsonIncremental", "expandedPathsFromDepth", "flattenJson"];
  for (const exportName of requiredExports) {
    if (typeof mod[exportName] !== "function") {
      throw new Error(`${exportName} export not found in dist build`);
    }
  }

  return {
    parseJsonIncremental: mod.parseJsonIncremental,
    expandedPathsFromDepth: mod.expandedPathsFromDepth,
    flattenJson: mod.flattenJson
  };
};

const summarizeDurations = (durations) => {
  if (durations.length === 0) {
    return { avgMs: 0, minMs: 0, maxMs: 0 };
  }

  let totalMs = 0;
  let minMs = Number.POSITIVE_INFINITY;
  let maxMs = Number.NEGATIVE_INFINITY;

  for (const value of durations) {
    totalMs += value;
    minMs = Math.min(minMs, value);
    maxMs = Math.max(maxMs, value);
  }

  return {
    avgMs: totalMs / durations.length,
    minMs,
    maxMs
  };
};

const toFixed2 = (value) => value.toFixed(2);

const formatMarkdown = (fixtureName, fixtureSizeMb, rows) => {
  const baseline = rows.find((row) => row.mode === "Collapsable (metadata=true, depth=1)")?.avgMs ?? 1;

  const lines = [
    `### ${fixtureName} (${fixtureSizeMb} MB)`,
    "",
    "| Mode | Avg (ms) | Min (ms) | Max (ms) | Output size | vs Collapsable |",
    "| --- | ---: | ---: | ---: | ---: | ---: |"
  ];

  for (const row of rows) {
    const ratio = baseline === 0 ? 0 : row.avgMs / baseline;
    lines.push(
      `| ${row.mode} | ${toFixed2(row.avgMs)} | ${toFixed2(row.minMs)} | ${toFixed2(row.maxMs)} | ${row.outputSize.toLocaleString()} | ${ratio.toFixed(2)}x |`
    );
  }

  return lines.join("\n");
};

const run = async () => {
  const { parseJsonIncremental, expandedPathsFromDepth, flattenJson } = await loadLibrary();
  const selectedFixtures = fixtureFiles.length > 0 ? fixtureFiles : await listAvailableFixtures();

  if (selectedFixtures.length === 0) {
    throw new Error(`No JSON fixtures found in ${fixturesDir}`);
  }

  console.log("# Viewer mode benchmark snapshot");
  console.log("");
  console.log(`Node: ${process.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
  console.log(`Iterations per mode: ${iterations}`);
  console.log("");
  console.log("This benchmark measures mode-specific content preparation work.");
  console.log("Collapsable and Static are measured on a pre-parsed JSON root.");
  console.log("Plain mode follows metadata=false behavior (pretty-line generation).");

  for (const fileName of selectedFixtures) {
    const filePath = resolve(fixturesDir, fileName);
    const input = await readFile(filePath, "utf8");
    const fixtureSizeMb = (Buffer.byteLength(input, "utf8") / (1024 * 1024)).toFixed(2);

    const root = await parseJsonIncremental(input, { yieldIntervalMs: 8 });

    const modeRunners = [
      {
        mode: "Collapsable (metadata=true, depth=1)",
        runMode: () => {
          const expandedPaths = expandedPathsFromDepth(root, 1);
          const rows = flattenJson(root, expandedPaths, { metadata: true });
          return rows.length;
        }
      },
      {
        mode: "Static (metadata=true, alwaysExpanded)",
        runMode: () => {
          const expandedPaths = expandedPathsFromDepth(root, Number.POSITIVE_INFINITY);
          const rows = flattenJson(root, expandedPaths, { metadata: true });
          return rows.length;
        }
      },
      {
        mode: "Plain (metadata=false)",
        runMode: () => {
          if (input.includes("\n") || input.includes("\r")) {
            return input.split(/\r?\n/).length;
          }

          const pretty = JSON.stringify(JSON.parse(input), null, 2);
          return pretty.split(/\r?\n/).length;
        }
      }
    ];

    const rows = [];

    for (const modeRunner of modeRunners) {
      modeRunner.runMode();

      const durations = [];
      let outputSize = 0;

      for (let index = 0; index < iterations; index += 1) {
        const startedAt = performance.now();
        outputSize = modeRunner.runMode();
        durations.push(performance.now() - startedAt);
      }

      const summary = summarizeDurations(durations);
      rows.push({
        mode: modeRunner.mode,
        avgMs: summary.avgMs,
        minMs: summary.minMs,
        maxMs: summary.maxMs,
        outputSize
      });
    }

    console.log("");
    console.log(formatMarkdown(fileName, fixtureSizeMb, rows));
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
