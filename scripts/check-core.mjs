import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cjs = require("react-json-virtualization/core");
const esm = await import("react-json-virtualization/core");

for (const core of [cjs, esm]) {
  const parsed = await core.parseDocument({ format: "json", text: "null" });
  assert.equal(parsed.root, null);
  const next = await core.parseDocument({ format: "json", value: { a: 1 } });
  const comparison = await core.compareDocuments(next, { format: "json", root: { a: 2 } });
  assert.equal(comparison.counts.changed, 1);
  assert.equal(core.summarizeComparison(comparison).changed, 1);
}

console.log("Core ESM and CommonJS imports work in Node without importing the React entry.");
