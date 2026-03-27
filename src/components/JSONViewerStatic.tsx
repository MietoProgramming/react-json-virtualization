import React from "react";
import { JSONViewer, type JSONViewerProps } from "./JSONViewer";

export type JSONViewerStaticProps = Omit<
  JSONViewerProps,
  "alwaysExpanded" | "initialExpandDepth" | "expandedPaths" | "defaultExpandedPaths" | "onExpandedPathsChange"
>;

export function JSONViewerStatic(props: JSONViewerStaticProps): React.ReactElement {
  return <JSONViewer {...props} alwaysExpanded />;
}
