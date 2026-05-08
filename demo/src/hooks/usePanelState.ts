import { useMemo, useState } from "react";
import { themePresets } from "../constants";
import type { DemoState, DemoStateActions } from "./useDemoStateTypes";

export function usePanelState(): [
  Pick<DemoState, "metadata" | "showLineNumbers" | "initialExpandDepth" | "pathFilterMode" | "searchMatchMode" | "sourceFormat" | "themePresetName" | "searchHighlightMode" | "selectedTheme" | "searchHighlightClassName" | "viewerMode" | "expandedPaths">,
  Pick<DemoStateActions, "setViewerMode" | "setExpandedPaths" | "setMetadata" | "setShowLineNumbers" | "setInitialExpandDepth" | "setPathFilterMode" | "setSearchMatchMode" | "setSourceFormat" | "setThemePresetName" | "setSearchHighlightMode">
] {
  const [viewerMode, setViewerMode] = useState<DemoState["viewerMode"]>("collapsable");
  const [expandedPaths, setExpandedPaths] = useState<DemoState["expandedPaths"]>(new Set());
  const [metadata, setMetadata] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [initialExpandDepth, setInitialExpandDepth] = useState(1);
  const [pathFilterMode, setPathFilterMode] = useState<DemoState["pathFilterMode"]>("auto");
  const [searchMatchMode, setSearchMatchMode] = useState<DemoState["searchMatchMode"]>("auto");
  const [sourceFormat, setSourceFormat] = useState<DemoState["sourceFormat"]>("json");
  const [themePresetName, setThemePresetName] = useState(themePresets[0].name);
  const [searchHighlightMode, setSearchHighlightMode] = useState<DemoState["searchHighlightMode"]>("default");

  const selectedTheme = useMemo(() => {
    return themePresets.find((p) => p.name === themePresetName)?.value ?? {};
  }, [themePresetName]);

  const searchHighlightClassName = useMemo(() => {
    return searchHighlightMode === "default" ? undefined : `demo-search-highlight-${searchHighlightMode}`;
  }, [searchHighlightMode]);

  return [{
    viewerMode, expandedPaths, metadata, showLineNumbers, initialExpandDepth,
    pathFilterMode, searchMatchMode, sourceFormat, themePresetName, searchHighlightMode,
    selectedTheme, searchHighlightClassName
  }, { setViewerMode, setExpandedPaths, setMetadata, setShowLineNumbers, setInitialExpandDepth, setPathFilterMode, setSearchMatchMode, setSourceFormat, setThemePresetName, setSearchHighlightMode }];
}
