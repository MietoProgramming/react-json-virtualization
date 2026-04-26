import React from "react";
import { tokenizePrettyLine } from "./prettyTokens";

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
  matchedPrettyLineIndexes
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
            visiblePrettyLines.map((line, lineOffset) => (
              <div
                className={
                  matchedPrettyLineIndexes.has(visiblePrettyLineIndexes[lineOffset])
                    ? "rjv-plain-line rjv-plain-line-match"
                    : "rjv-plain-line"
                }
                key={startIndex + lineOffset}
              >
                {tokenizePrettyLine(line).map((token, tokenIndex) => (
                  <span key={`${startIndex + lineOffset}-${tokenIndex}`} className={token.className}>
                    {token.text || " "}
                  </span>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
      <div style={{ height: `${bottomSpacerHeight}px` }} />
    </>
  );
}
