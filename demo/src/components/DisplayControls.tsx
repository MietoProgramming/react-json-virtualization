import { filterModeOptions, sourceFormatOptions, themePresets, searchHighlightOptions } from "../constants";
import type { PathFilterMode, SourceFormat, SearchHighlightMode } from "../constants";

interface DisplayControlsProps {
  metadata: boolean;
  showLineNumbers: boolean;
  viewerMode: "collapsable" | "static";
  initialExpandDepth: number;
  pathFilterMode: PathFilterMode;
  sourceFormat: SourceFormat;
  themePresetName: string;
  searchHighlightMode: SearchHighlightMode;
  onMetadataChange: (v: boolean) => void;
  onShowLineNumbersChange: (v: boolean) => void;
  onViewerModeChange: (v: "collapsable" | "static") => void;
  onInitialExpandDepthChange: (v: number) => void;
  onPathFilterModeChange: (v: PathFilterMode) => void;
  onSourceFormatChange: (v: SourceFormat) => void;
  onThemePresetChange: (v: string) => void;
  onSearchHighlightChange: (v: SearchHighlightMode) => void;
}

export function DisplayControls({
  metadata, showLineNumbers, viewerMode, initialExpandDepth,
  pathFilterMode, sourceFormat, themePresetName, searchHighlightMode,
  onMetadataChange, onShowLineNumbersChange, onViewerModeChange,
  onInitialExpandDepthChange, onPathFilterModeChange, onSourceFormatChange,
  onThemePresetChange, onSearchHighlightChange
}: DisplayControlsProps): JSX.Element {
  return (
    <div className="field-grid four-col">
      <label>
        Metadata
        <select value={metadata ? "enabled" : "disabled"}
          onChange={(e) => onMetadataChange(e.target.value === "enabled")}>
          <option value="enabled">enabled (tree + Object/Array meta)</option>
          <option value="disabled">disabled (virtualized pretty JSON)</option>
        </select>
      </label>
      <label>
        Pretty line numbers
        <select value={showLineNumbers ? "on" : "off"}
          onChange={(e) => onShowLineNumbersChange(e.target.value === "on")}
          disabled={metadata}>
          <option value="on">on</option>
          <option value="off">off</option>
        </select>
      </label>
      <label>
        Viewer mode
        <select value={viewerMode}
          onChange={(e) => onViewerModeChange(e.target.value as "collapsable" | "static")}>
          <option value="collapsable">Collapsable</option>
          <option value="static">Static</option>
        </select>
      </label>
      <label>
        Initial expand depth
        <input type="number" min={0} max={8} value={initialExpandDepth}
          disabled={viewerMode === "static"}
          onChange={(e) => onInitialExpandDepthChange(Number(e.target.value))} />
      </label>
      <label>
        Filter mode
        <select value={pathFilterMode}
          onChange={(e) => onPathFilterModeChange(e.target.value as PathFilterMode)}>
          {filterModeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>
      <label>
        Source format
        <select value={sourceFormat}
          onChange={(e) => onSourceFormatChange(e.target.value as SourceFormat)}>
          {sourceFormatOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>
      <label>
        Theme preset
        <select value={themePresetName}
          onChange={(e) => onThemePresetChange(e.target.value)}>
          {themePresets.map((preset) => (
            <option key={preset.name} value={preset.name}>{preset.name}</option>
          ))}
        </select>
      </label>
      <label>
        Search highlight style
        <select value={searchHighlightMode}
          onChange={(e) => onSearchHighlightChange(e.target.value as SearchHighlightMode)}>
          {searchHighlightOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
