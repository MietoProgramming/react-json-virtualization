import { DocumentError } from "./types";

export const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) {
    throw new DocumentError("OPERATION_ABORTED", "Document operation was aborted");
  }
};
