import { useCallback, useEffect, useMemo, useState } from "react";
import { DEBOUNCE_MS } from "../constants";
import type { DemoState, DemoStateActions } from "./useDemoStateTypes";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useDataState(): [
  Pick<DemoState, "jsonText" | "sourceFormat">,
  Pick<DemoStateActions, "setJsonText" | "setSourceFormat">
] {
  const [jsonText, setJsonText] = useState("{}");
  const [sourceFormat, setSourceFormat] = useState<DemoState["sourceFormat"]>("json");
  return [{ jsonText, sourceFormat }, { setJsonText, setSourceFormat }];
}

export function useDimensionState(): [
  Pick<DemoState, "height" | "rowHeight" | "overscan">,
  Pick<DemoStateActions, "setHeight" | "setRowHeight" | "setOverscan">
] {
  const [height, setHeight] = useState(520);
  const [rowHeight, setRowHeight] = useState(24);
  const [overscan, setOverscan] = useState(8);
  return [{ height, rowHeight, overscan }, { setHeight, setRowHeight, setOverscan }];
}

export function useFilterState(): [
  Pick<DemoState, "pathFilterQuery" | "pathFilterCaseSensitive" | "isFilterEnabled" | "parseProgress" | "parseError" | "selectedPath" | "lastClickedRow" | "debouncedPathFilterQuery" | "parseProgressLabel" | "lastClickedRowStr">,
  Pick<DemoStateActions, "setPathFilterQuery" | "setPathFilterCaseSensitive" | "setIsFilterEnabled" | "setParseProgress" | "setParseError" | "setSelectedPath" | "setLastClickedRow" | "resetInteractiveState">
] {
  const [pathFilterQuery, setPathFilterQuery] = useState("");
  const [pathFilterCaseSensitive, setPathFilterCaseSensitive] = useState(false);
  const [isFilterEnabled, setIsFilterEnabled] = useState(true);
  const [parseProgress, setParseProgress] = useState<DemoState["parseProgress"]>(null);
  const [parseError, setParseError] = useState<DemoState["parseError"]>(null);
  const [selectedPath, setSelectedPath] = useState("$");
  const [lastClickedRow, setLastClickedRow] = useState<DemoState["lastClickedRow"]>(null);

  const debouncedPathFilterQuery = useDebouncedValue(pathFilterQuery, DEBOUNCE_MS);
  const parseProgressLabel = useMemo(() => {
    if (!parseProgress || parseProgress.total === 0) return "-";
    const percent = Math.min(100, Math.round((parseProgress.processed / parseProgress.total) * 100));
    return `${parseProgress.processed}/${parseProgress.total} chars (${percent}%)`;
  }, [parseProgress]);

  const lastClickedRowStr = lastClickedRow ? `${lastClickedRow.path} (${lastClickedRow.valueType})` : "none";

  const resetInteractiveState = useCallback(() => {
    setParseError(null);
    setParseProgress(null);
    setSelectedPath("$");
    setLastClickedRow(null);
    setIsFilterEnabled(true);
  }, []);

  return [{
    pathFilterQuery, pathFilterCaseSensitive, isFilterEnabled,
    parseProgress, parseError, selectedPath, lastClickedRow,
    debouncedPathFilterQuery, parseProgressLabel, lastClickedRowStr
  }, { setPathFilterQuery, setPathFilterCaseSensitive, setIsFilterEnabled, setParseProgress, setParseError, setSelectedPath, setLastClickedRow, resetInteractiveState }];
}

export function useSearchState(): [
  Pick<DemoState, "searchQuery" | "searchCaseSensitive" | "searchMetadataLimit" | "debouncedSearchQuery" | "debouncedSearchMetadataLimit">,
  Pick<DemoStateActions, "setSearchQuery" | "setSearchCaseSensitive" | "setSearchMetadataLimit" | "setSearchMetadata" | "setActiveMatchIndex" | "applyScenario">
] {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false);
  const [searchMetadataLimit, setSearchMetadataLimit] = useState(500);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, DEBOUNCE_MS);
  const debouncedSearchMetadataLimit = useDebouncedValue(searchMetadataLimit, DEBOUNCE_MS);

  const applyScenario = useCallback((scenario: { json: string; sourceFormat: DemoState["sourceFormat"]; pathFilterQuery: string; searchQuery: string; metadata: boolean; showLineNumbers: boolean }) => {
    setSearchQuery(scenario.searchQuery);
    setSearchCaseSensitive(false);
  }, []);

  return [{
    searchQuery, searchCaseSensitive, searchMetadataLimit,
    debouncedSearchQuery, debouncedSearchMetadataLimit
  }, { setSearchQuery, setSearchCaseSensitive, setSearchMetadataLimit, setSearchMetadata: () => { }, setActiveMatchIndex: () => { }, applyScenario }];
}

export function useExpansionState(): [
  Pick<DemoState, "isControlledExpansion">,
  Pick<DemoStateActions, "setIsControlledExpansion" | "setExpandedPaths">
] {
  const [isControlledExpansion, setIsControlledExpansion] = useState(false);
  return [{ isControlledExpansion }, { setIsControlledExpansion, setExpandedPaths: () => { } }];
}
