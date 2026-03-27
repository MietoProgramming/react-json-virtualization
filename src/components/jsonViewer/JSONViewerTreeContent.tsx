import React from "react";
import type { FlatJsonRow } from "../../core/types";
import { JSONRow } from "../JSONRow";

interface JSONViewerTreeContentProps {
  topSpacerHeight: number;
  bottomSpacerHeight: number;
  visibleRows: FlatJsonRow[];
  activeSelectedPath: string;
  alwaysExpanded: boolean;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}

export function JSONViewerTreeContent({
  topSpacerHeight,
  bottomSpacerHeight,
  visibleRows,
  activeSelectedPath,
  alwaysExpanded,
  onToggle,
  onSelect
}: JSONViewerTreeContentProps): React.ReactElement {
  return (
    <>
      <div style={{ height: `${topSpacerHeight}px` }} />
      {visibleRows.map((row: FlatJsonRow) => (
        <JSONRow
          key={row.id}
          row={row}
          isSelected={activeSelectedPath === row.path}
          onToggle={onToggle}
          onSelect={onSelect}
          canToggle={!alwaysExpanded}
        />
      ))}
      <div style={{ height: `${bottomSpacerHeight}px` }} />
    </>
  );
}
