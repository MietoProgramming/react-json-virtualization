import { readFile } from "node:fs/promises";

const demoUrl = process.env.RJV_DEMO_URL ?? "http://127.0.0.1:4179/";
const bidiUrl = process.env.RJV_BIDI_URL ?? "ws://127.0.0.1:9227/session";
const fixture = await readFile(new URL("./search-navigation.json", import.meta.url), "utf8");

async function verifyNavigation(json, { tree, rowHeight, overscan }) {
  async function waitFor(read, label) {
    for (let attempt = 0; attempt < 150; attempt++) {
      const result = read();
      if (result) return result;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw new Error(`Timed out waiting for ${label}`);
  }

  function setInput(input, value) {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function inputByLabel(text) {
    return [...document.querySelectorAll("label")]
      .find(label => label.firstChild?.textContent.trim() === text)
      .querySelector("input");
  }

  const fileInput = await waitFor(() => document.querySelector("input[type=file]"), "demo");
  if (!tree) {
    const metadata = document.querySelector('option[value="disabled"]').parentElement;
    metadata.value = "disabled";
    metadata.dispatchEvent(new Event("change", { bubbles: true }));
  }
  setInput(inputByLabel("Row height"), rowHeight);
  setInput(inputByLabel("Overscan"), overscan);

  const transfer = new DataTransfer();
  transfer.items.add(new File([json], "search-navigation.json", { type: "application/json" }));
  fileInput.files = transfer.files;
  fileInput.dispatchEvent(new Event("change", { bubbles: true }));
  const rowSelector = tree ? '[data-path="$[0]"]' : '[data-line-number="2"]';
  await waitFor(() => document.querySelector(rowSelector)?.textContent.includes("rjv-needle"), "fixture");

  const button = name => [...document.querySelectorAll("button")].find(el => el.textContent === name);
  const search = inputByLabel("Search query (highlights matches, no filtering)");
  const counter = document.querySelector(".search-counter");
  const viewer = document.querySelector(".rjv-container");
  const activeRowSelector = tree ? ".rjv-row-active-match" : ".rjv-plain-line-active-match";
  const matchIndexes = [0, 23, 63, 75, 87];
  const sequence = [
    ["Search", 1], ["Next", 2], ["Next", 3], ["Next", 4], ["Next", 5],
    ["Prev", 4], ["Prev", 3], ["Prev", 2], ["Prev", 1], ["Prev", 5], ["Next", 1]
  ];

  setInput(search, "rjv-needle");
  const measurements = [];
  for (const [action, match] of sequence) {
    if (action !== "Search") button(action).click();
    await waitFor(() => counter.textContent === `${match} / ${matchIndexes.length}`, `match ${match}`);
    for (let frame = 0; frame < 4; frame++) await new Promise(requestAnimationFrame);

    const activeRow = viewer.querySelector(activeRowSelector);
    const index = matchIndexes[match - 1];
    const expected = tree ? `$[${index}]` : String(index + 2);
    const actual = (tree ? activeRow?.dataset.path : activeRow?.dataset.lineNumber) ?? null;
    const viewportTop = viewer.getBoundingClientRect().top + viewer.clientTop;
    const row = activeRow?.getBoundingClientRect();
    const fullyVisible = Boolean(row && row.top >= viewportTop - 0.5 &&
      row.bottom <= viewportTop + viewer.clientHeight + 0.5);
    measurements.push({
      action, match, expected, actual,
      scrollTop: viewer.scrollTop,
      rowTop: row ? Math.round(row.top - viewportTop) : null,
      rowBottom: row ? Math.round(row.bottom - viewportTop) : null,
      viewportHeight: viewer.clientHeight,
      fullyVisible
    });
  }
  return JSON.stringify(measurements);
}

const socket = new WebSocket(bidiUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let commandId = 0;
const pending = new Map();
socket.addEventListener("message", ({ data }) => {
  const response = JSON.parse(data);
  pending.get(response.id)?.(response);
  pending.delete(response.id);
});

async function send(method, params) {
  const id = ++commandId;
  const response = await new Promise(resolve => {
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
  if (response.type === "error") throw new Error(`${method}: ${response.message}`);
  return response.result;
}

try {
  const { capabilities } = await send("session.new", { capabilities: {} });
  console.log(`${capabilities.browserName} ${capabilities.browserVersion}`);
  const { contexts } = await send("browsingContext.getTree", {});
  const context = contexts[0].context;
  await send("browsingContext.setViewport", { context, viewport: { width: 1280, height: 900 } });

  for (const scenario of [
    { tree: true, rowHeight: 24, overscan: 8 },
    { tree: false, rowHeight: 24, overscan: 8 },
    { tree: true, rowHeight: 32, overscan: 8 },
    { tree: true, rowHeight: 24, overscan: 0 }
  ]) {
    await send("browsingContext.navigate", { context, url: demoUrl, wait: "complete" });
    const { result, exceptionDetails } = await send("script.callFunction", {
      functionDeclaration: verifyNavigation.toString(),
      awaitPromise: true,
      target: { context },
      arguments: [
        { type: "string", value: fixture },
        { type: "object", value: Object.entries(scenario).map(([key, value]) =>
          [key, { type: typeof value, value }]) }
      ]
    });
    if (exceptionDetails) throw new Error(exceptionDetails.text);
    const measurements = JSON.parse(result.value);
    console.log(scenario);
    console.table(measurements);
    if (measurements.some(row => row.expected !== row.actual || !row.fullyVisible)) process.exitCode = 1;
  }
  await send("session.end", {});
} finally {
  socket.close();
}
