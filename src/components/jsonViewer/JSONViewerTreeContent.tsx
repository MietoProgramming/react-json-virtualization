import React from "react";
import type { ResolvedSourceFormat } from "../../core/sourceFormat";
import type { FlatJsonRow } from "../../core/types";
import { JSONRow } from "../JSONRow";
import type { JSONViewerRowDecorator, JSONViewerRowRenderer } from "./rowCustomization";
import type { JSONViewerCopyActions } from "./JSONViewerProps";

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
  copyActions?: boolean | JSONViewerCopyActions;
  copyText?: (text: string) => void | Promise<void>;
  onCopyError?: (error: Error, path: string, kind: "path" | "value" | "subtree") => void;
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
  onSelect,
  copyActions,
  copyText,
  onCopyError
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
          copyActions={copyActions}
          copyText={copyText}
          onCopyError={onCopyError}
        />
      ))}
      <div style={{ height: `${bottomSpacerHeight}px` }} />
    </>
  );
}
