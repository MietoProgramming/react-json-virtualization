import type { KeyboardEvent, MouseEvent } from "react";
import React from "react";
import type { ResolvedSourceFormat } from "../core/sourceFormat";
import type { FlatJsonRow } from "../core/types";
import type { JSONViewerRowDecorator, JSONViewerRowRenderer } from "./jsonViewer/rowCustomization";
import { createTreeRowContext } from "./jsonViewer/rowCustomization";

interface JSONRowProps {
  row: FlatJsonRow;
  isSelected: boolean;
  isSearchMatch?: boolean;
  isActiveMatch?: boolean;
  sourceFormat: ResolvedSourceFormat;
  rowDecorator?: JSONViewerRowDecorator;
  rowRenderer?: JSONViewerRowRenderer;
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
  isActiveMatch = false,
  sourceFormat,
  rowDecorator,
  rowRenderer,
  onToggle,
  onSelect,
  canToggle = true
}: JSONRowProps) {
  const hasCustomization = Boolean(rowDecorator || rowRenderer);
  const context = hasCustomization ? createTreeRowContext(row, sourceFormat) : null;
  let decoration = undefined;
  if (context && rowDecorator) {
    decoration = rowDecorator(context) ?? undefined;
  }
  const className = [
    "rjv-row",
    isSearchMatch ? "rjv-row-match" : "",
    isActiveMatch ? "rjv-row-active-match" : "",
    isSelected ? "rjv-row-selected" : "",
    decoration?.className ?? ""
  ]
    .filter(Boolean)
    .join(" ");
  const showToggle = canToggle && row.isExpandable;
  const baseStyle = { paddingLeft: `${row.depth * 16 + 8}px` };
  const style = decoration?.style ? { ...baseStyle, ...decoration.style } : baseStyle;
  const defaultContent = (
    <span className="rjv-row-body">
      {row.key !== undefined ? (
        <>
          <span className="rjv-token-key">{row.key}</span>
          <span className="rjv-token-punctuation">: </span>
        </>
      ) : (
        <span className="rjv-token-key">$</span>
      )}

      {renderPrimitive(row)}
    </span>
  );
  let resolvedContent = defaultContent;
  if (context && rowRenderer) {
    resolvedContent = rowRenderer(context, defaultContent);
  }

  return (
    <div
      className={className}
      role="treeitem"
      aria-level={row.depth + 1}
      aria-expanded={row.isExpandable ? row.isExpanded : undefined}
      tabIndex={0}
      onClick={() => onSelect(row.path)}
      data-row-id={row.id}
      data-path={row.path}
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
      style={style}
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
      <div className="rjv-row-content">
        {decoration?.leading && <span className="rjv-row-leading">{decoration.leading}</span>}
        {resolvedContent}
        {decoration?.trailing && <span className="rjv-row-trailing">{decoration.trailing}</span>}
      </div>
      {decoration?.actions && (
        <div className="rjv-row-actions" onClick={(event) => event.stopPropagation()}>
          {decoration.actions}
        </div>
      )}
    </div>
  );
});
