interface LiveStatePanelProps {
  parseProgressLabel: string;
  parseError: string | null;
  viewerMode: string;
  sourceFormat: string;
  metadata: boolean;
  showLineNumbers: boolean;
  selectedPath: string;
  searchQuery: string;
  matchCounterLabel: string;
  searchHighlightMode: string;
  searchMatchCount: string;
  searchMatchMode: string;
  searchMode: string;
  searchCapped: string;
  expandedPathsCount: string;
  lastClickedRow: string;
}

export function LiveStatePanel({
  parseProgressLabel, parseError, viewerMode, sourceFormat, metadata,
  showLineNumbers, selectedPath, searchQuery, matchCounterLabel,
  searchHighlightMode, searchMatchCount, searchMatchMode, searchMode, searchCapped,
  expandedPathsCount, lastClickedRow
}: LiveStatePanelProps): JSX.Element {
  return (
    <section className="panel status-panel">
      <h2>Live State</h2>
      <ul>
        <li>Parse progress: {parseProgressLabel}</li>
        <li>Parse error: {parseError || "none"}</li>
        <li>Viewer mode: {viewerMode}</li>
        <li>Source format hint: {sourceFormat}</li>
        <li>Metadata mode: {metadata ? "enabled" : "disabled"}</li>
        <li>Pretty line numbers: {metadata ? "n/a" : showLineNumbers ? "on" : "off"}</li>
        <li>Selected path: {selectedPath}</li>
        <li>Search query: {searchQuery || "none"}</li>
        <li>Active match: {matchCounterLabel}</li>
        <li>Search highlight style: {searchHighlightMode}</li>
        <li>Search matches: {searchMatchCount}</li>
        <li>Search match mode: {searchMatchMode}</li>
        <li>Search metadata mode: {searchMode}</li>
        <li>Search capped: {searchCapped}</li>
        <li>Controlled expanded paths: {expandedPathsCount}</li>
        <li>Last clicked node: {lastClickedRow}</li>
      </ul>
    </section>
  );
}
