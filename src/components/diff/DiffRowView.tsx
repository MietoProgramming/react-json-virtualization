import React from "react";
import type { DiffRow } from "./buildDiffRows";

interface DiffRowViewProps {
  row: DiffRow;
  isExpanded: boolean;
  isActive: boolean;
  rowHeight: number;
  onToggle: (path: string) => void;
}

const displayCell = (row: DiffRow["beforeRow"]): React.ReactNode => {
  if (!row) return <span className="rjv-diff-empty" aria-label="No value">—</span>;
  const value = row.valueType === "string" ? row.preview : row.preview;
  return (
    <span className="rjv-diff-cell-content" title={row.path}>
      {row.key !== undefined && <span className="rjv-token-key">{row.key}: </span>}
      <span className={`rjv-token-${row.valueType === "object" || row.valueType === "array" ? "punctuation" : row.valueType}`}>{value}</span>
    </span>
  );
};

export function DiffRowView({ row, isExpanded, isActive, rowHeight, onToggle }: DiffRowViewProps): React.ReactElement {
  const isExpandable = Boolean(row.beforeRow?.isExpandable || row.afterRow?.isExpandable);
  const status = row.changeKind;
  return (
    <div className={`rjv-diff-row ${isActive ? "rjv-diff-row-active" : ""}`} role="row" style={{ height: rowHeight }} data-path={row.displayPath}>
      <div className="rjv-diff-gutter" style={{ paddingLeft: row.depth * 12 + 4 }}>
        {isExpandable ? (
          <button type="button" className="rjv-diff-toggle" aria-label={isExpanded ? "Collapse diff row" : "Expand diff row"} onClick={() => onToggle(row.expansionKey)}>
            {isExpanded ? "▾" : "▸"}
          </button>
        ) : <span className="rjv-diff-toggle-spacer" />}
        {status && <span className={`rjv-diff-badge rjv-diff-${status}`} title={status}>{status.slice(0, 3).toUpperCase()}</span>}
      </div>
      <div role="gridcell" className={`rjv-diff-cell ${row.changeKind === "removed" ? "rjv-diff-cell-removed" : row.changeKind === "changed" || row.changeKind === "moved" ? "rjv-diff-cell-changed" : ""}`}>
        {displayCell(row.beforeRow)}
      </div>
      <div role="gridcell" className={`rjv-diff-cell ${row.changeKind === "added" ? "rjv-diff-cell-added" : row.changeKind === "changed" || row.changeKind === "moved" ? "rjv-diff-cell-changed" : ""}`}>
        {displayCell(row.afterRow)}
      </div>
    </div>
  );
}
