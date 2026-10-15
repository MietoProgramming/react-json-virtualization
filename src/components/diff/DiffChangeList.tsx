import React, { useState } from "react";
import type { DocumentChange } from "../../core/documents";

interface DiffChangeListProps {
  changes: DocumentChange[];
  activeIndex: number | null;
  onSelect: (index: number) => void;
  height?: number;
}

const ROW_HEIGHT = 30;

export function DiffChangeList({ changes, activeIndex, onSelect, height = 150 }: DiffChangeListProps): React.ReactElement {
  const [scrollTop, setScrollTop] = useState(0);
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 2);
  const visibleCount = Math.ceil(height / ROW_HEIGHT) + 4;
  const end = Math.min(changes.length, start + visibleCount);
  return (
    <div
      className="rjv-diff-change-list"
      role="listbox"
      aria-label="Document changes"
      style={{ height }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div style={{ height: start * ROW_HEIGHT }} />
      {changes.slice(start, end).map((change, offset) => {
        const index = start + offset;
        return (
          <button
            key={`${change.kind}:${change.beforePath ?? ""}:${change.afterPath ?? ""}`}
            type="button"
            role="option"
            aria-selected={activeIndex === index}
            className={`rjv-diff-change rjv-diff-${change.kind}`}
            style={{ height: ROW_HEIGHT }}
            onClick={() => onSelect(index)}
          >
            <span className="rjv-diff-change-kind">{change.kind}</span>
            <span className="rjv-diff-change-path">{change.afterPath ?? change.beforePath ?? "$"}</span>
          </button>
        );
      })}
      <div style={{ height: Math.max(0, (changes.length - end) * ROW_HEIGHT) }} />
    </div>
  );
}
