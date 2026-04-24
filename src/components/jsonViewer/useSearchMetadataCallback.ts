import { useEffect } from "react";
import type { JSONViewerSearchMetadata } from "../../core/types";

export const useSearchMetadataCallback = (
  onSearchMetadata: ((metadata: JSONViewerSearchMetadata) => void) | undefined,
  metadata: JSONViewerSearchMetadata
): void => {
  useEffect(() => {
    onSearchMetadata?.(metadata);
  }, [metadata, onSearchMetadata]);
};
