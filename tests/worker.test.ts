// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createWorkerProcessor, installDocumentWorker } from "../src/worker";

type Listener = (event: MessageEvent) => void;
const browserWorkerFactoryTypeCheck = (): void => {
  createWorkerProcessor(() => new Worker("document.worker.js"));
};
class LoopWorker {
  private clientListeners = new Set<Listener>();
  private hostListener?: Listener;
  terminated = false;
  addEventListener(type: string, listener: Listener): void {
    if (type === "message") this.clientListeners.add(listener);
  }
  removeEventListener(type: string, listener: Listener): void {
    if (type === "message") this.clientListeners.delete(listener);
  }
  postMessage(message: unknown): void {
    queueMicrotask(() => this.hostListener?.({ data: message } as MessageEvent));
  }
  terminate(): void { this.terminated = true; }
  setHost(listener: Listener): void { this.hostListener = listener; }
  sendToClient(message: unknown): void {
    this.clientListeners.forEach((listener) => listener({ data: message } as MessageEvent));
  }
}

describe("Web Worker document processor", () => {
  it("accepts the native browser Worker API", () => {
    expect(typeof browserWorkerFactoryTypeCheck).toBe("function");
  });

  it("matches the local processor for parallel parses and comparison", async () => {
    const worker = new LoopWorker();
    const hostListeners = new Set<Listener>();
    const scope = {
      addEventListener: (_type: string, listener: Listener) => { hostListeners.add(listener); worker.setHost(listener); },
      removeEventListener: (_type: string, listener: Listener) => { hostListeners.delete(listener); },
      postMessage: (message: unknown) => worker.sendToClient(message)
    };
    const disposeHost = installDocumentWorker(scope as never);
    const processor = createWorkerProcessor(() => worker as never);
    const [before, after] = await Promise.all([
      processor.parse({ format: "json", text: '{"value":1}' }),
      processor.parse({ format: "json", text: '{"value":2}' })
    ]);
    const result = await processor.compare(before, after);
    expect(result.counts.changed).toBe(1);
    processor.dispose?.();
    disposeHost();
    expect(worker.terminated).toBe(true);
  });

  it("routes progress, rejects cancelled work and does not retry failures", async () => {
    const listeners = new Set<Listener>();
    const posted: unknown[] = [];
    const worker = {
      postMessage: vi.fn((message: unknown) => { posted.push(message); }),
      addEventListener: vi.fn((type: string, listener: Listener) => { if (type === "message") listeners.add(listener); }),
      removeEventListener: vi.fn((type: string, listener: Listener) => { if (type === "message") listeners.delete(listener); }),
      terminate: vi.fn()
    };
    const processor = createWorkerProcessor(() => worker as never);
    const progress = vi.fn();
    const controller = new AbortController();
    const task = processor.parse({ format: "json", text: "null" }, { signal: controller.signal, onProgress: progress });
    const request = posted[0] as { id: number; type: string };
    listeners.forEach((listener) => listener({ data: { type: "progress", id: request.id, progress: { phase: "parse", processed: 1, total: 1 } } } as MessageEvent));
    expect(progress).toHaveBeenCalledOnce();
    controller.abort();
    await expect(task).rejects.toMatchObject({ code: "OPERATION_ABORTED" });
    expect(posted[1]).toEqual({ type: "cancel", id: request.id });

    const pending = processor.search({ format: "json", root: null }, "null");
    processor.dispose?.();
    await expect(pending).rejects.toMatchObject({ code: "OPERATION_ABORTED" });
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("rejects new operations after a worker runtime failure", async () => {
    const listeners = new Map<string, Set<Listener>>();
    const worker = {
      postMessage: vi.fn(),
      addEventListener: vi.fn((type: string, listener: Listener) => {
        const entries = listeners.get(type) ?? new Set<Listener>();
        entries.add(listener);
        listeners.set(type, entries);
      }),
      removeEventListener: vi.fn((type: string, listener: Listener) => listeners.get(type)?.delete(listener)),
      terminate: vi.fn()
    };
    const processor = createWorkerProcessor(() => worker as never);
    const pending = processor.parse({ format: "json", text: "null" });
    listeners.get("error")?.forEach((listener) => listener({} as MessageEvent));
    await expect(pending).rejects.toThrow("Document worker failed");
    await expect(processor.search({ format: "json", root: null }, "null")).rejects.toThrow("Document worker failed");
    processor.dispose?.();
  });
});
