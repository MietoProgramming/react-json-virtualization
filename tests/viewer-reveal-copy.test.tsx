// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JSONViewer } from "../src/components/JSONViewer";
import { createLocalDocumentProcessor } from "../src/core/documents";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class TestResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element): void {
    Object.defineProperty(target, "clientHeight", { configurable: true, value: 240 });
    Object.defineProperty(target, "scrollHeight", { configurable: true, value: 2000 });
    this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
  disconnect(): void {}
  unobserve(): void {}
}

const originalResizeObserver = globalThis.ResizeObserver;
globalThis.ResizeObserver = TestResizeObserver as unknown as typeof ResizeObserver;
const mounted: Array<{ root: Root; host: HTMLDivElement }> = [];

beforeEach(() => {
  globalThis.ResizeObserver = TestResizeObserver as unknown as typeof ResizeObserver;
});

afterEach(() => {
  mounted.splice(0).forEach(({ root, host }) => {
    act(() => root.unmount());
    host.remove();
  });
  globalThis.ResizeObserver = originalResizeObserver;
});

const mount = async (element: React.ReactElement): Promise<HTMLDivElement> => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  mounted.push({ root, host });
  await act(async () => {
    root.render(element);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return host;
};

describe("JSONViewer path reveal and copy actions", () => {
  it("renders the JSON null root as a valid tree node", async () => {
    const host = await mount(<JSONViewer json="null" />);
    expect(host.querySelector('[data-path="$"]')?.textContent).toContain("null");
  });

  it("delegates structural parsing to an injected document processor", async () => {
    const processor = createLocalDocumentProcessor();
    const parse = vi.spyOn(processor, "parse");
    const host = await mount(<JSONViewer json='{"name":"Ada"}' processor={processor} />);
    expect(parse).toHaveBeenCalledWith(
      { format: "json", text: '{"name":"Ada"}' },
      expect.objectContaining({ signal: expect.any(AbortSignal), onProgress: expect.any(Function) })
    );
    expect(host.querySelector('[data-path="$.name"]')?.textContent).toContain("Ada");
  });

  it("opens the ancestors of a path, scrolls to it, and reports the result", async () => {
    const onRevealResult = vi.fn();
    const host = await mount(
      <JSONViewer json='{"user":{"name":"Ada"}}' initialExpandDepth={0} revealPath="$.user.name" onRevealResult={onRevealResult} />
    );
    expect(host.querySelector('[data-path="$.user.name"]')).not.toBeNull();
    expect(onRevealResult).toHaveBeenCalledWith({ path: "$.user.name", status: "revealed" });
  });

  it("reports a target hidden by row filters and copies the selected row path", async () => {
    const onRevealResult = vi.fn();
    const copyText = vi.fn();
    const onCopyError = vi.fn();
    const host = await mount(
      <JSONViewer
        json='{"user":{"name":"Ada"}}'
        initialExpandDepth={0}
        revealPath="$.user.name"
        onRevealResult={onRevealResult}
        rowFilter={(context) => context.mode !== "tree" || context.path !== "$.user.name"}
        copyActions={{ path: true }}
        copyText={copyText}
        onCopyError={onCopyError}
      />
    );
    expect(onRevealResult).toHaveBeenCalledWith({ path: "$.user.name", status: "filtered-out" });
    const copyButton = host.querySelector<HTMLButtonElement>('[aria-label="Copy path $.user"]');
    expect(copyButton).not.toBeNull();
    await act(async () => {
      copyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(copyText).toHaveBeenCalledWith("$.user");
    expect(onCopyError).not.toHaveBeenCalled();
  });
});
