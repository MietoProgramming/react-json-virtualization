interface ToggleControlsProps {
  isFilterEnabled: boolean;
  pathFilterCaseSensitive: boolean;
  searchCaseSensitive: boolean;
  isControlledExpansion: boolean;
  viewerMode: "collapsable" | "static";
  onIsFilterEnabledChange: (v: boolean) => void;
  onPathFilterCaseSensitiveChange: (v: boolean) => void;
  onSearchCaseSensitiveChange: (v: boolean) => void;
  onIsControlledExpansionChange: (v: boolean) => void;
  onResetState: () => void;
}

export function ToggleControls({
  isFilterEnabled, pathFilterCaseSensitive, searchCaseSensitive,
  isControlledExpansion, viewerMode,
  onIsFilterEnabledChange, onPathFilterCaseSensitiveChange,
  onSearchCaseSensitiveChange, onIsControlledExpansionChange, onResetState
}: ToggleControlsProps): JSX.Element {
  return (
    <div className="toggle-row">
      <label><input type="checkbox" checked={isFilterEnabled}
        onChange={(e) => onIsFilterEnabledChange(e.target.checked)} />Filter enabled</label>
      <label><input type="checkbox" checked={pathFilterCaseSensitive}
        onChange={(e) => onPathFilterCaseSensitiveChange(e.target.checked)} />Case sensitive filter</label>
      <label><input type="checkbox" checked={searchCaseSensitive}
        onChange={(e) => onSearchCaseSensitiveChange(e.target.checked)} />Case sensitive search</label>
      <label><input type="checkbox" checked={isControlledExpansion}
        disabled={viewerMode === "static"}
        onChange={(e) => onIsControlledExpansionChange(e.target.checked)} />Use controlled expansion</label>
      <button type="button" onClick={onResetState}>Reset viewer state</button>
    </div>
  );
}
