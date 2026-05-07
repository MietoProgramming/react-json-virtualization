import React, { useCallback, useState } from "react";
import { sourceFormatFromFileName } from "react-json-virtualization";
import { VirtualizeJSONModeDoc } from "./VirtualizeJSONModeDoc";
import { DataSourcePanel } from "./components/DataSourcePanel";
import { DemoHeader } from "./components/DemoHeader";
import { LiveStatePanel } from "./components/LiveStatePanel";
import { ScenarioPanel } from "./components/ScenarioPanel";
import { ViewerControlsPanel } from "./components/ViewerControlsPanel";
import { ViewerPanel } from "./components/ViewerPanel";
import { sampleSources } from "./constants";
import { useDemoState } from "./hooks/useDemoState";

export function App(): React.ReactElement {
  const [state, actions] = useDemoState();
  const [activeSamplePath, setActiveSamplePath] = useState(sampleSources[0].path);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [sourceLabel, setSourceLabel] = useState("none");

  const loadSample = useCallback(async (path: string, label: string) => {
    setIsLoadingSample(true);
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Failed to fetch sample ${label} (${response.status})`);
      const text = await response.text();
      actions.setJsonText(text);
      setActiveSamplePath(path as typeof activeSamplePath);
      actions.setSourceFormat(sourceFormatFromFileName(path));
      setSourceLabel(`sample: ${label}`);
      actions.resetInteractiveState();
    } catch (error) {
      actions.setParseError(error instanceof Error ? error.message : "Failed to load sample");
    } finally {
      setIsLoadingSample(false);
    }
  }, [actions]);

  const onFilePicked = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      actions.setJsonText(text);
      actions.setSourceFormat(sourceFormatFromFileName(file.name));
      setSourceLabel(`file: ${file.name}`);
      actions.resetInteractiveState();
    } catch (error) {
      actions.setParseError(error instanceof Error ? error.message : "Failed to read file");
    }
  }, [actions]);

  return (
    <main className="demo-shell">
      <DemoHeader />
      <VirtualizeJSONModeDoc />

      <DataSourcePanel
        activeSamplePath={activeSamplePath}
        isLoadingSample={isLoadingSample}
        sourceLabel={sourceLabel}
        onSampleSelect={loadSample}
        onFilePicked={onFilePicked}
      />

      <ScenarioPanel onScenarioApply={actions.applyScenario} />

      <ViewerControlsPanel
        height={state.height} rowHeight={state.rowHeight} overscan={state.overscan}
        metadata={state.metadata} showLineNumbers={state.showLineNumbers}
        viewerMode={state.viewerMode} initialExpandDepth={state.initialExpandDepth}
        pathFilterMode={state.pathFilterMode} sourceFormat={state.sourceFormat}
        themePresetName={state.themePresetName} searchHighlightMode={state.searchHighlightMode}
        pathFilterQuery={state.pathFilterQuery} searchQuery={state.searchQuery}
        searchMetadataLimit={state.searchMetadataLimit} isFilterEnabled={state.isFilterEnabled}
        pathFilterCaseSensitive={state.pathFilterCaseSensitive}
        searchCaseSensitive={state.searchCaseSensitive}
        isControlledExpansion={state.isControlledExpansion}
        availableMatches={state.availableMatches} matchCounterLabel={state.matchCounterLabel}
        onHeightChange={actions.setHeight} onRowHeightChange={actions.setRowHeight}
        onOverscanChange={actions.setOverscan} onMetadataChange={actions.setMetadata}
        onShowLineNumbersChange={actions.setShowLineNumbers}
        onViewerModeChange={actions.setViewerMode}
        onInitialExpandDepthChange={actions.setInitialExpandDepth}
        onPathFilterModeChange={actions.setPathFilterMode}
        onSourceFormatChange={actions.setSourceFormat}
        onThemePresetChange={actions.setThemePresetName}
        onSearchHighlightChange={actions.setSearchHighlightMode}
        onPathFilterQueryChange={actions.setPathFilterQuery}
        onSearchQueryChange={actions.setSearchQuery}
        onSearchMetadataLimitChange={actions.setSearchMetadataLimit}
        onIsFilterEnabledChange={actions.setIsFilterEnabled}
        onPathFilterCaseSensitiveChange={actions.setPathFilterCaseSensitive}
        onSearchCaseSensitiveChange={actions.setSearchCaseSensitive}
        onIsControlledExpansionChange={actions.setIsControlledExpansion}
        onGoToNextMatch={actions.goToNextMatch} onGoToPreviousMatch={actions.goToPreviousMatch}
        onResetState={actions.resetInteractiveState}
      />

      <LiveStatePanel
        parseProgressLabel={state.parseProgressLabel}
        parseError={state.parseError ?? ""}
        viewerMode={state.viewerMode} sourceFormat={state.sourceFormat}
        metadata={state.metadata} showLineNumbers={state.showLineNumbers}
        selectedPath={state.selectedPath} searchQuery={state.searchQuery}
        matchCounterLabel={state.matchCounterLabel} searchHighlightMode={state.searchHighlightMode}
        searchMatchCount={state.searchMatchCount} searchMode={state.searchMode}
        searchCapped={state.searchCapped} expandedPathsCount={state.expandedPathsCount}
        lastClickedRow={state.lastClickedRowStr}
      />

      <section className="panel viewer-panel">
        <ViewerPanel
          viewerMode={state.viewerMode} json={state.jsonText} sourceFormat={state.sourceFormat}
          metadata={state.metadata} showLineNumbers={state.showLineNumbers}
          height={state.height} rowHeight={state.rowHeight} overscan={state.overscan}
          initialExpandDepth={state.viewerMode === "collapsable" ? state.initialExpandDepth : undefined}
          expandedPaths={state.isControlledExpansion ? state.expandedPaths : undefined}
          pathFilterQuery={state.isFilterEnabled ? state.debouncedPathFilterQuery : ""}
          searchQuery={state.debouncedSearchQuery} activeMatchIndex={state.activeMatchIndex}
          pathFilterCaseSensitive={state.pathFilterCaseSensitive}
          searchCaseSensitive={state.searchCaseSensitive}
          pathFilterMode={state.pathFilterMode}
          searchMetadataLimit={state.debouncedSearchMetadataLimit}
          theme={state.selectedTheme} className={state.searchHighlightClassName}
          selectedPath={state.selectedPath}
          onNodeClick={(path, row) => { actions.setSelectedPath(path); actions.setLastClickedRow(row); }}
          onSearchMetadata={actions.setSearchMetadata}
          onParseProgress={(processed, total) => actions.setParseProgress({ processed, total })}
          onParseError={(error) => actions.setParseError(error.message)}
        />
      </section>
    </main>
  );
}
