import { DimensionControls } from "./DimensionControls";
import { DisplayControls } from "./DisplayControls";
import { FilterSearchControls } from "./FilterSearchControls";
import { ToggleControls } from "./ToggleControls";
import type { PathFilterMode, SourceFormat, SearchHighlightMode } from "../constants";

interface ViewerControlsPanelProps {
  height: number;
  rowHeight: number;
  overscan: number;
  metadata: boolean;
  showLineNumbers: boolean;
  viewerMode: "collapsable" | "static";
  initialExpandDepth: number;
  pathFilterMode: PathFilterMode;
  sourceFormat: SourceFormat;
  themePresetName: string;
  searchHighlightMode: SearchHighlightMode;
  pathFilterQuery: string;
  searchQuery: string;
  searchMetadataLimit: number;
  isFilterEnabled: boolean;
  pathFilterCaseSensitive: boolean;
  searchCaseSensitive: boolean;
  isControlledExpansion: boolean;
  availableMatches: number;
  matchCounterLabel: string;
  onHeightChange: (v: number) => void;
  onRowHeightChange: (v: number) => void;
  onOverscanChange: (v: number) => void;
  onMetadataChange: (v: boolean) => void;
  onShowLineNumbersChange: (v: boolean) => void;
  onViewerModeChange: (v: "collapsable" | "static") => void;
  onInitialExpandDepthChange: (v: number) => void;
  onPathFilterModeChange: (v: PathFilterMode) => void;
  onSourceFormatChange: (v: SourceFormat) => void;
  onThemePresetChange: (v: string) => void;
  onSearchHighlightChange: (v: SearchHighlightMode) => void;
  onPathFilterQueryChange: (v: string) => void;
  onSearchQueryChange: (v: string) => void;
  onSearchMetadataLimitChange: (v: number) => void;
  onIsFilterEnabledChange: (v: boolean) => void;
  onPathFilterCaseSensitiveChange: (v: boolean) => void;
  onSearchCaseSensitiveChange: (v: boolean) => void;
  onIsControlledExpansionChange: (v: boolean) => void;
  onGoToNextMatch: () => void;
  onGoToPreviousMatch: () => void;
  onResetState: () => void;
}

export function ViewerControlsPanel(props: ViewerControlsPanelProps): JSX.Element {
  return (
    <section className="panel controls-panel">
      <h2>Viewer Controls</h2>
      <DimensionControls {...props} onHeightChange={props.onHeightChange} onRowHeightChange={props.onRowHeightChange} onOverscanChange={props.onOverscanChange} />
      <DisplayControls
        metadata={props.metadata} showLineNumbers={props.showLineNumbers}
        viewerMode={props.viewerMode} initialExpandDepth={props.initialExpandDepth}
        pathFilterMode={props.pathFilterMode} sourceFormat={props.sourceFormat}
        themePresetName={props.themePresetName} searchHighlightMode={props.searchHighlightMode}
        onMetadataChange={props.onMetadataChange} onShowLineNumbersChange={props.onShowLineNumbersChange}
        onViewerModeChange={props.onViewerModeChange} onInitialExpandDepthChange={props.onInitialExpandDepthChange}
        onPathFilterModeChange={props.onPathFilterModeChange} onSourceFormatChange={props.onSourceFormatChange}
        onThemePresetChange={props.onThemePresetChange} onSearchHighlightChange={props.onSearchHighlightChange}
      />
      <FilterSearchControls
        pathFilterQuery={props.pathFilterQuery} searchQuery={props.searchQuery}
        searchMetadataLimit={props.searchMetadataLimit}
        onPathFilterQueryChange={props.onPathFilterQueryChange}
        onSearchQueryChange={props.onSearchQueryChange}
        onSearchMetadataLimitChange={props.onSearchMetadataLimitChange}
        onGoToNextMatch={props.onGoToNextMatch} onGoToPreviousMatch={props.onGoToPreviousMatch}
        availableMatches={props.availableMatches} matchCounterLabel={props.matchCounterLabel}
      />
      <ToggleControls
        isFilterEnabled={props.isFilterEnabled} pathFilterCaseSensitive={props.pathFilterCaseSensitive}
        searchCaseSensitive={props.searchCaseSensitive} isControlledExpansion={props.isControlledExpansion}
        viewerMode={props.viewerMode}
        onIsFilterEnabledChange={props.onIsFilterEnabledChange}
        onPathFilterCaseSensitiveChange={props.onPathFilterCaseSensitiveChange}
        onSearchCaseSensitiveChange={props.onSearchCaseSensitiveChange}
        onIsControlledExpansionChange={props.onIsControlledExpansionChange}
        onResetState={props.onResetState}
      />
    </section>
  );
}
