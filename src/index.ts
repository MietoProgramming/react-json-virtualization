import "./styles.css";

import { JSONViewer, type JSONViewerProps } from "./components/JSONViewer";
import {
    JSONViewerStatic,
    type JSONViewerStaticProps
} from "./components/JSONViewerStatic";

export type VirtualizeJSONCollapsableProps = Omit<JSONViewerProps, "alwaysExpanded">;
export type VirtualizeJSONStaticProps = JSONViewerStaticProps;

export const VirtualizeJSON = {
    Collapsable: JSONViewer,
    Static: JSONViewerStatic
} as const;

export {
    collapsePath,
    createExpandedPathSet, expandedPathsFromDepth, expandPath, toggleExpandedPath
} from "./core/expansion";
export { createPathSearchIndex, filterRowsByPathQuery } from "./core/filter";
export type { PathFilterMode, PathSearchIndex } from "./core/filter";
export { flattenJson } from "./core/flatten";
export { parseJsonIncremental } from "./core/parser";
export type {
    FlatJsonRow,
    JSONValue,
    JSONValueType,
    JSONViewerSearchMetadata,
    SearchMetadataMode
} from "./core/types";
export { defaultTheme, resolveTheme, monokaiTheme, vscodeDarkTheme, solarizedLightTheme, solarizedDarkTheme, draculaTheme, nordTheme, oneDarkTheme } from "./theme";
export type { JsonTheme, JsonThemeOverride, VsCodeTheme } from "./theme";

