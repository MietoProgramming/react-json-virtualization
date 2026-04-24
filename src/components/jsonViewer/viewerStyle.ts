import type React from "react";
import type { JsonTheme } from "../../theme";

export const createViewerStyle = (
  height: number | string,
  resolvedTheme: JsonTheme
): React.CSSProperties => {
  return {
    height,
    "--rjv-background": resolvedTheme.background,
    "--rjv-row-hover": resolvedTheme.rowHover,
    "--rjv-row-selected": resolvedTheme.rowSelected,
    "--rjv-row-match": resolvedTheme.rowMatch,
    "--rjv-plain-line-match": resolvedTheme.plainLineMatch,
    "--rjv-token-key": resolvedTheme.key,
    "--rjv-token-punctuation": resolvedTheme.punctuation,
    "--rjv-token-string": resolvedTheme.string,
    "--rjv-token-number": resolvedTheme.number,
    "--rjv-token-boolean": resolvedTheme.boolean,
    "--rjv-token-null": resolvedTheme.null,
    "--rjv-focus-ring": resolvedTheme.focusRing
  } as React.CSSProperties;
};
