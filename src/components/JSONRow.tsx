import type { KeyboardEvent, MouseEvent } from "react";
import React from "react";
import type { FlatJsonRow } from "../core/types";

interface JSONRowProps {
  row: FlatJsonRow;
  isSelected: boolean;
  isSearchMatch?: boolean;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  canToggle?: boolean;
}

const renderPrimitive = (row: FlatJsonRow): React.ReactNode => {
  if (row.valueType === "string") {
    return <span className="rjv-token-string">{row.preview}</span>;
  }
  if (row.valueType === "number") {
    return <span className="rjv-token-number">{row.preview}</span>;
  }
  if (row.valueType === "boolean") {
    return <span className="rjv-token-boolean">{row.preview}</span>;
  }
  if (row.valueType === "null") {
    return <span className="rjv-token-null">null</span>;
  }
  if (row.valueType === "array") {
    return (
      <span className="rjv-token-punctuation">
        [ ]
        {row.preview && <span className="rjv-token-meta"> {row.preview}</span>}
      </span>
    );
  }
  if (row.valueType === "object") {
    return (
      <span className="rjv-token-punctuation">
        {'{ }'}
        {row.preview && <span className="rjv-token-meta"> {row.preview}</span>}
      </span>
    );
  }
  return row.preview;
};

export const JSONRow = React.memo(function JSONRow({
  row,
  isSelected,
  isSearchMatch = false,
  onToggle,
  onSelect,
  canToggle = true
}: JSONRowProps) {
  const className = [
    "rjv-row",
    isSearchMatch ? "rjv-row-match" : "",
    isSelected ? "rjv-row-selected" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const showToggle = canToggle && row.isExpandable;

  return (
    <div
      className={className}
      role="treeitem"
      aria-level={row.depth + 1}
      aria-expanded={row.isExpandable ? row.isExpanded : undefined}
      tabIndex={0}
      onClick={() => onSelect(row.path)}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter") {
          onSelect(row.path);
        }
        if (event.key === "ArrowRight" && showToggle && !row.isExpanded) {
          onToggle(row.path);
          event.preventDefault();
        }
        if (event.key === "ArrowLeft" && showToggle && row.isExpanded) {
          onToggle(row.path);
          event.preventDefault();
        }
      }}
      style={{ paddingLeft: `${row.depth * 16 + 8}px` }}
    >
      {showToggle ? (
        <button
          className="rjv-toggle"
          type="button"
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            onToggle(row.path);
          }}
          aria-label={row.isExpanded ? "Collapse node" : "Expand node"}
        >
          {row.isExpanded ? "▾" : "▸"}
        </button>
      ) : (
        <span className="rjv-toggle" aria-hidden="true">
          
        </span>
      )}

      {row.key !== undefined ? (
        <>
          <span className="rjv-token-key">{row.key}</span>
          <span className="rjv-token-punctuation">: </span>
        </>
      ) : (
        <span className="rjv-token-key">$</span>
      )}

      {renderPrimitive(row)}
    </div>
  );
});
