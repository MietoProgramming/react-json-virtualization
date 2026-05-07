interface FilterSearchControlsProps {
  pathFilterQuery: string;
  searchQuery: string;
  searchMetadataLimit: number;
  onPathFilterQueryChange: (v: string) => void;
  onSearchQueryChange: (v: string) => void;
  onSearchMetadataLimitChange: (v: number) => void;
  onGoToNextMatch: () => void;
  onGoToPreviousMatch: () => void;
  availableMatches: number;
  matchCounterLabel: string;
}

export function FilterSearchControls({
  pathFilterQuery, searchQuery, searchMetadataLimit,
  onPathFilterQueryChange, onSearchQueryChange, onSearchMetadataLimitChange,
  onGoToNextMatch, onGoToPreviousMatch, availableMatches, matchCounterLabel
}: FilterSearchControlsProps): JSX.Element {
  return (
    <>
      <div className="field-grid">
        <label>
          Path/value filter query
          <input type="text" placeholder='e.g. zero hello, "new york" name, or $.users[1]'
            value={pathFilterQuery} onChange={(e) => onPathFilterQueryChange(e.target.value)} />
        </label>
        <label>
          Search query (highlights matches, no filtering)
          <input type="text" placeholder='e.g. Ada active or "new york"'
            value={searchQuery} onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (e.shiftKey) onGoToPreviousMatch();
              else onGoToNextMatch();
            }} />
        </label>
        <label>
          Search metadata limit
          <input type="number" min={0} max={2000} value={searchMetadataLimit}
            onChange={(e) => onSearchMetadataLimitChange(Number(e.target.value))} />
        </label>
      </div>
      <div className="search-nav-compact">
        <button type="button" onClick={onGoToPreviousMatch} disabled={availableMatches === 0}>Prev</button>
        <button type="button" onClick={onGoToNextMatch} disabled={availableMatches === 0}>Next</button>
        <span className="search-counter">{matchCounterLabel}</span>
      </div>
    </>
  );
}
