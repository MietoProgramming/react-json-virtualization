import { useEffect, useRef } from "react";
import { getDocumentPathAncestors, getValueAtPath } from "../../core/documents/paths";
import type { JSONValue, FlatJsonRow } from "../../core/types";
import type { JSONViewerRevealResult } from "./JSONViewerProps";

interface RevealRequest {
  key: string;
  sourceKey: string;
  path: string;
  parentPaths: string[];
  complete: boolean;
}

interface UseRevealPathNavigationParams {
  revealPath?: string;
  sourceKey: string;
  root: JSONValue | null;
  hasRoot: boolean;
  structuralMode: boolean;
  filteredRows: FlatJsonRow[];
  activeExpandedPaths: ReadonlySet<string>;
  isExpandedControlled: boolean;
  alwaysExpanded: boolean;
  selectedPath?: string;
  onExpandedPathsChange?: (paths: Set<string>) => void;
  setInternalExpandedPaths: React.Dispatch<React.SetStateAction<Set<string>>>;
  setInternalSelectedPath: React.Dispatch<React.SetStateAction<string>>;
  scrollToIndex: (index: number, align?: "start" | "center" | "end") => void;
  onRevealResult?: (result: JSONViewerRevealResult) => void;
}

export const useRevealPathNavigation = ({
  revealPath,
  sourceKey,
  root,
  hasRoot,
  structuralMode,
  filteredRows,
  activeExpandedPaths,
  isExpandedControlled,
  alwaysExpanded,
  selectedPath,
  onExpandedPathsChange,
  setInternalExpandedPaths,
  setInternalSelectedPath,
  scrollToIndex,
  onRevealResult
}: UseRevealPathNavigationParams): void => {
  const requestRef = useRef<RevealRequest | null>(null);
  const callbackRef = useRef(onRevealResult);
  callbackRef.current = onRevealResult;

  useEffect(() => {
    if (!revealPath) {
      requestRef.current = null;
      return;
    }
    const key = revealPath;
    if (requestRef.current?.key === key && requestRef.current.sourceKey === sourceKey) return;
    if (!structuralMode) {
      requestRef.current = { key, sourceKey, path: revealPath, parentPaths: [], complete: true };
      callbackRef.current?.({ path: revealPath, status: "unsupported-mode" });
      return;
    }
    if (!hasRoot) return;
    let lookup: ReturnType<typeof getValueAtPath>;
    try {
      lookup = getValueAtPath({ format: "json", root: root as JSONValue }, revealPath);
    } catch {
      lookup = { found: false };
    }
    if (!lookup.found) {
      requestRef.current = { key, sourceKey, path: revealPath, parentPaths: [], complete: true };
      callbackRef.current?.({ path: revealPath, status: "not-found" });
      return;
    }
    let ancestors: string[];
    try {
      ancestors = getDocumentPathAncestors(revealPath);
    } catch {
      requestRef.current = { key, sourceKey, path: revealPath, parentPaths: [], complete: true };
      callbackRef.current?.({ path: revealPath, status: "not-found" });
      return;
    }
    const parentPaths = ancestors.slice(0, -1);
    requestRef.current = { key, sourceKey, path: revealPath, parentPaths, complete: false };
    if (selectedPath === undefined) setInternalSelectedPath(revealPath);
    if (!alwaysExpanded) {
      const next = new Set(activeExpandedPaths);
      parentPaths.forEach((path) => next.add(path));
      if (isExpandedControlled) onExpandedPathsChange?.(next);
      else {
        setInternalExpandedPaths(next);
        onExpandedPathsChange?.(next);
      }
    }
  }, [
    activeExpandedPaths,
    alwaysExpanded,
    hasRoot,
    isExpandedControlled,
    onExpandedPathsChange,
    revealPath,
    root,
    selectedPath,
    setInternalExpandedPaths,
    setInternalSelectedPath,
    sourceKey,
    structuralMode
  ]);

  useEffect(() => {
    const request = requestRef.current;
    if (!request || request.complete || !hasRoot) return;
    const rowIndex = filteredRows.findIndex((row) => row.path === request.path);
    if (rowIndex >= 0) {
      request.complete = true;
      scrollToIndex(rowIndex, "center");
      callbackRef.current?.({ path: request.path, status: "revealed" });
      return;
    }
    if (request.parentPaths.every((path) => activeExpandedPaths.has(path))) {
      request.complete = true;
      callbackRef.current?.({ path: request.path, status: "filtered-out" });
    }
  }, [activeExpandedPaths, filteredRows, hasRoot, scrollToIndex]);
};
