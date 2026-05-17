import React from "react";
import type { ResolvedSourceFormat } from "../../core/sourceFormat";
import { tokenizePrettyLine } from "./prettyTokens";
import type { JSONViewerRowDecorator, JSONViewerRowRenderer } from "./rowCustomization";
import { createPlainRowContext } from "./rowCustomization";

interface JSONViewerPlainContentProps {
  topSpacerHeight: number;
  bottomSpacerHeight: number;
  showLineNumbers: boolean;
  rowHeight: number;
  startIndex: number;
  visiblePrettyLines: string[];
  visiblePrettyLineIndexes: number[];
  visiblePrettyLineNumbers: string;
  matchedPrettyLineIndexes: ReadonlySet<number>;
  activeMatchLineIndex: number | null;
  sourceFormat: ResolvedSourceFormat;
  rowDecorator?: JSONViewerRowDecorator;
  rowRenderer?: JSONViewerRowRenderer;
}

export function JSONViewerPlainContent({
  topSpacerHeight,
  bottomSpacerHeight,
  showLineNumbers,
  rowHeight,
  startIndex,
  visiblePrettyLines,
  visiblePrettyLineIndexes,
  visiblePrettyLineNumbers,
  matchedPrettyLineIndexes,
  activeMatchLineIndex,
  sourceFormat,
  rowDecorator,
  rowRenderer
}: JSONViewerPlainContentProps): React.ReactElement {
  return (
    <>
      <div style={{ height: `${topSpacerHeight}px` }} />
      <div className="rjv-plain-frame">
        {showLineNumbers && (
          <pre className="rjv-plain-gutter" style={{ lineHeight: `${rowHeight}px` }}>
            {visiblePrettyLineNumbers || " "}
          </pre>
        )}
        <div className="rjv-plain-window" style={{ lineHeight: `${rowHeight}px` }}>
          {visiblePrettyLines.length === 0 ? (
            <div className="rjv-plain-line">&nbsp;</div>
          ) : (
            visiblePrettyLines.map((line, lineOffset) => {
              const lineIndex = visiblePrettyLineIndexes[lineOffset];
              const lineNumber = lineIndex + 1;
              const hasCustomization = Boolean(rowDecorator || rowRenderer);
              const context = hasCustomization
                ? createPlainRowContext(line, lineIndex, sourceFormat)
                : null;
              let decoration = undefined;
              if (context && rowDecorator) {
                decoration = rowDecorator(context) ?? undefined;
              }
              const isMatch = matchedPrettyLineIndexes.has(lineIndex);
              const isActive = activeMatchLineIndex === lineIndex;
              const className = [
                "rjv-plain-line",
                isMatch ? "rjv-plain-line-match" : "",
                isActive ? "rjv-plain-line-active-match" : "",
                decoration?.className ?? ""
              ]
                .filter(Boolean)
                .join(" ");
              const defaultContent = (
                <span className="rjv-plain-line-body">
                  {tokenizePrettyLine(line).map((token, tokenIndex) => (
                    <span key={`${startIndex + lineOffset}-${tokenIndex}`} className={token.className}>
                      {token.text || " "}
                    </span>
                  ))}
                </span>
              );
              let resolvedContent = defaultContent;
              if (context && rowRenderer) {
                resolvedContent = rowRenderer(context, defaultContent);
              }

              return (
                <div
                  className={className}
                  key={startIndex + lineOffset}
                  data-row-id={`line:${lineNumber}`}
                  data-line-number={lineNumber}
                  data-line-index={lineIndex}
                  style={decoration?.style}
                >
                  <div className="rjv-plain-line-content">
                    {decoration?.leading && <span className="rjv-row-leading">{decoration.leading}</span>}
                    {resolvedContent}
                    {decoration?.trailing && <span className="rjv-row-trailing">{decoration.trailing}</span>}
                  </div>
                  {decoration?.actions && (
                    <div className="rjv-row-actions">
                      {decoration.actions}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      <div style={{ height: `${bottomSpacerHeight}px` }} />
    </>
  );
}
