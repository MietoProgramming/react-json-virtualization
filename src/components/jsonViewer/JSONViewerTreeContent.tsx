import React from "react";
import type { ResolvedSourceFormat } from "../../core/sourceFormat";
import type { FlatJsonRow } from "../../core/types";
import { JSONRow } from "../JSONRow";
import type { JSONViewerRowDecorator, JSONViewerRowRenderer } from "./rowCustomization";

interface JSONViewerTreeContentProps {
  topSpacerHeight: number;
  bottomSpacerHeight: number;
  visibleRows: FlatJsonRow[];
  matchedPaths: ReadonlySet<string>;
  activeMatchPath: string | null;
  activeSelectedPath: string;
  alwaysExpanded: boolean;
  sourceFormat: ResolvedSourceFormat;
  rowDecorator?: JSONViewerRowDecorator;
  rowRenderer?: JSONViewerRowRenderer;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}

export function JSONViewerTreeContent({
  topSpacerHeight,
  bottomSpacerHeight,
  visibleRows,
  matchedPaths,
  activeMatchPath,
  activeSelectedPath,
  alwaysExpanded,
  sourceFormat,
  rowDecorator,
  rowRenderer,
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
          isSearchMatch={matchedPaths.has(row.path)}
          isActiveMatch={activeMatchPath === row.path}
          sourceFormat={sourceFormat}
          rowDecorator={rowDecorator}
          rowRenderer={rowRenderer}
          onToggle={onToggle}
          onSelect={onSelect}
          canToggle={!alwaysExpanded}
        />
      ))}
      <div style={{ height: `${bottomSpacerHeight}px` }} />
    </>
  );
}
