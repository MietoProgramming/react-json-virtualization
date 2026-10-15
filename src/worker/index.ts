import {
  compareDocuments,
  filterDocument,
  parseDocument,
  searchDocument,
  DocumentError
} from "../core/documents";
import type {
  CompareOptions,
  DocumentInput,
  DocumentOperationOptions,
  DocumentProcessor,
  DocumentQueryOptions,
  ParsedDocument,
  StructuredFormat
} from "../core/documents";

type WorkerOperation = "parse" | "search" | "filter" | "compare";
type RequestMessage = { type: "request"; id: number; operation: WorkerOperation; args: unknown[]; options?: Record<string, unknown> };
type CancelMessage = { type: "cancel"; id: number };
type WorkerMessage = RequestMessage | CancelMessage;
type WorkerResponse =
  | { type: "result"; id: number; result: unknown }
  | { type: "progress"; id: number; progress: { phase: string; processed: number; total: number } }
  | { type: "error"; id: number; error: { name: string; message: string; code?: string; format?: string; line?: number; column?: number; index?: number } };
type WorkerError = Extract<WorkerResponse, { type: "error" }>["error"];

interface WorkerLike {
  postMessage(message: WorkerMessage): void;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  terminate(): void;
}

interface WorkerScopeLike {
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  postMessage(message: WorkerResponse): void;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  onProgress?: DocumentOperationOptions["onProgress"];
  signal?: AbortSignal;
  abortListener?: () => void;
}

const serializeOptions = (options: Record<string, unknown> = {}): Record<string, unknown> => {
  const { signal: _signal, onProgress: _onProgress, ...serializable } = options;
  return serializable;
};

const errorFromWire = (error: WorkerError): Error => {
  const details = error;
  if (details.code) {
    return new DocumentError(details.code as ConstructorParameters<typeof DocumentError>[0], details.message ?? "Worker operation failed", {
      format: details.format as StructuredFormat | undefined,
      line: details.line,
      column: details.column,
      index: details.index
    });
  }
  const normalized = new Error(details.message ?? "Worker operation failed");
  normalized.name = details.name ?? "Error";
  return normalized;
};

export const createWorkerProcessor = (factory: () => WorkerLike): DocumentProcessor => {
  const worker = factory();
  const pending = new Map<number, PendingRequest>();
  let nextId = 1;
  let disposed = false;
  let failure: Error | null = null;

  const settleAll = (error: Error): void => {
    pending.forEach((request) => {
      if (request.abortListener) request.signal?.removeEventListener("abort", request.abortListener);
      request.reject(error);
    });
    pending.clear();
  };

  const onMessage: EventListener = (event): void => {
    const message = (event as MessageEvent<WorkerResponse>).data;
    const request = pending.get(message.id);
    if (!request) return;
    if (message.type === "progress") {
      request.onProgress?.(message.progress as Parameters<NonNullable<DocumentOperationOptions["onProgress"]>>[0]);
      return;
    }
    pending.delete(message.id);
    if (request.abortListener) request.signal?.removeEventListener("abort", request.abortListener);
    if (message.type === "result") request.resolve(message.result);
    else request.reject(errorFromWire(message.error));
  };
  const onWorkerError: EventListener = () => {
    failure = new Error("Document worker failed");
    settleAll(failure);
  };
  worker.addEventListener("message", onMessage);
  worker.addEventListener("error", onWorkerError);
  worker.addEventListener("messageerror", onWorkerError);

  const request = <T>(operation: WorkerOperation, args: unknown[], options: DocumentOperationOptions = {}): Promise<T> => {
    if (disposed) return Promise.reject(new Error("Document worker processor has been disposed"));
    if (failure) return Promise.reject(failure);
    if (options.signal?.aborted) return Promise.reject(new DocumentError("OPERATION_ABORTED", "Document operation was aborted"));
    const id = nextId++;
    return new Promise<T>((resolve, reject) => {
      const pendingRequest: PendingRequest = {
        resolve: (result) => resolve(result as T),
        reject,
        onProgress: options.onProgress,
        signal: options.signal
      };
      if (options.signal) {
        pendingRequest.abortListener = () => {
          if (!pending.delete(id)) return;
          worker.postMessage({ type: "cancel", id });
          reject(new DocumentError("OPERATION_ABORTED", "Document operation was aborted"));
        };
        options.signal.addEventListener("abort", pendingRequest.abortListener, { once: true });
      }
      pending.set(id, pendingRequest);
      try {
        worker.postMessage({ type: "request", id, operation, args, options: serializeOptions(options as Record<string, unknown>) });
      } catch (candidate) {
        pending.delete(id);
        if (pendingRequest.abortListener) options.signal?.removeEventListener("abort", pendingRequest.abortListener);
        reject(candidate instanceof Error ? candidate : new Error("Unable to send work to document worker"));
      }
    });
  };

  return {
    parse: (input: DocumentInput, options?: DocumentOperationOptions) => request("parse", [input], options),
    search: (document: ParsedDocument, query: string, options?: DocumentQueryOptions) => request("search", [document, query], options),
    filter: (document: ParsedDocument, query: string, options?: DocumentQueryOptions) => request("filter", [document, query], options),
    compare: (before: ParsedDocument, after: ParsedDocument, options?: CompareOptions) => request("compare", [before, after], options),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onWorkerError);
      worker.removeEventListener("messageerror", onWorkerError);
      worker.terminate();
      settleAll(new DocumentError("OPERATION_ABORTED", "Document worker processor was disposed"));
    }
  };
};

export const installDocumentWorker = (scope: WorkerScopeLike): (() => void) => {
  const controllers = new Map<number, AbortController>();
  let disposed = false;
  const onMessage: EventListener = async (event): Promise<void> => {
    const message = (event as MessageEvent<WorkerMessage>).data;
    if (message.type === "cancel") {
      controllers.get(message.id)?.abort();
      controllers.delete(message.id);
      return;
    }
    const controller = new AbortController();
    controllers.set(message.id, controller);
    const options = {
      ...(message.options ?? {}),
      signal: controller.signal,
      onProgress: (progress: { phase: string; processed: number; total: number }) => {
        if (!disposed) scope.postMessage({ type: "progress", id: message.id, progress });
      }
    };
    try {
      let result: unknown;
      if (message.operation === "parse") result = await parseDocument(message.args[0] as DocumentInput, options);
      else if (message.operation === "search") result = await searchDocument(message.args[0] as ParsedDocument, String(message.args[1] ?? ""), options);
      else if (message.operation === "filter") result = await filterDocument(message.args[0] as ParsedDocument, String(message.args[1] ?? ""), options);
      else result = await compareDocuments(message.args[0] as ParsedDocument, message.args[1] as ParsedDocument, options);
      if (!disposed && !controller.signal.aborted) scope.postMessage({ type: "result", id: message.id, result });
    } catch (error) {
      if (!disposed && !controller.signal.aborted) {
        const candidate = error as Error & { code?: string; format?: string; line?: number; column?: number; index?: number };
        scope.postMessage({
          type: "error",
          id: message.id,
          error: {
            name: candidate.name ?? "Error",
            message: candidate.message ?? "Worker operation failed",
            code: candidate.code,
            format: candidate.format,
            line: candidate.line,
            column: candidate.column,
            index: candidate.index
          }
        });
      }
    } finally {
      controllers.delete(message.id);
    }
  };
  scope.addEventListener("message", onMessage);
  return () => {
    disposed = true;
    scope.removeEventListener("message", onMessage);
    controllers.forEach((controller) => controller.abort());
    controllers.clear();
  };
};
