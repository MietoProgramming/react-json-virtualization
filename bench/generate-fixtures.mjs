import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const MB = 1024 * 1024;

const targets = [
  { sizeMb: 10, fileName: "large-10mb.json" },
  { sizeMb: 50, fileName: "large-50mb.json" },
  { sizeMb: 100, fileName: "large-100mb.json" }
];

const generatedDir = resolve("bench/fixtures/generated");

const makeRecord = (index) => ({
  id: index,
  key: `user-${index}`,
  name: `Name ${index}`,
  tags: ["alpha", "beta", "gamma", "delta"],
  metadata: {
    active: index % 2 === 0,
    score: Number((index * 1.137).toFixed(3)),
    region: index % 3 === 0 ? "eu" : "us"
  }
});

const estimateRecordSize = () => Buffer.byteLength(`${JSON.stringify(makeRecord(0))},`, "utf8");

const buildPayload = (targetBytes) => {
  const recordSize = estimateRecordSize();
  let count = Math.max(1, Math.floor((targetBytes - 128) / recordSize));
  let rows = [];
  let payload = "";
  let payloadSize = 0;

  while (count > 0) {
    rows = new Array(count);
    for (let index = 0; index < count; index += 1) {
      rows[index] = makeRecord(index);
    }

    payload = JSON.stringify({
      generatedAt: new Date().toISOString(),
      count,
      rows,
      padding: ""
    });
    payloadSize = Buffer.byteLength(payload, "utf8");

    if (payloadSize <= targetBytes) {
      break;
    }

    count = Math.max(1, Math.floor(count * 0.9));
  }

  const paddingBytes = Math.max(0, targetBytes - payloadSize);
  const finalPayload = JSON.stringify({
    generatedAt: new Date().toISOString(),
    count,
    rows,
    padding: "x".repeat(paddingBytes)
  });

  return finalPayload;
};

const ensureParent = async (filePath) => {
  await mkdir(dirname(filePath), { recursive: true });
};

const run = async () => {
  await mkdir(generatedDir, { recursive: true });

  for (const target of targets) {
    const targetBytes = target.sizeMb * MB;
    const filePath = resolve(generatedDir, target.fileName);

    const payload = buildPayload(targetBytes);

    await ensureParent(filePath);
    await writeFile(filePath, payload, "utf8");

    const actualBytes = Buffer.byteLength(payload, "utf8");
    const actualMb = (actualBytes / MB).toFixed(2);
    console.log(`Wrote ${target.fileName} (${actualMb} MB)`);
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
