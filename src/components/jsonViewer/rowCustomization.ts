import type React from "react";
import type { ResolvedSourceFormat } from "../../core/sourceFormat";
import type { FlatJsonRow } from "../../core/types";

export type JSONViewerTreeRowContext = {
    mode: "tree";
    id: string;
    path: string;
    text: string;
    row: FlatJsonRow;
    sourceFormat: ResolvedSourceFormat;
};

export type JSONViewerPlainRowContext = {
    mode: "plain";
    id: string;
    lineIndex: number;
    lineNumber: number;
    line: string;
    text: string;
    sourceFormat: ResolvedSourceFormat;
};

export type JSONViewerRowContext = JSONViewerTreeRowContext | JSONViewerPlainRowContext;

export type JSONViewerRowDecoration = {
    className?: string;
    style?: React.CSSProperties;
    leading?: React.ReactNode;
    trailing?: React.ReactNode;
    actions?: React.ReactNode;
};

export type JSONViewerRowFilter = (context: JSONViewerRowContext) => boolean;

export type JSONViewerRowDecorator = (
    context: JSONViewerRowContext
) => JSONViewerRowDecoration | null | undefined;

export type JSONViewerRowRenderer = (
    context: JSONViewerRowContext,
    defaultContent: React.ReactNode
) => React.ReactNode;

const formatRowValueText = (row: FlatJsonRow): string => {
    if (row.valueType === "string" && typeof row.rawValue === "string") {
        return row.rawValue;
    }
    if (row.valueType === "number" || row.valueType === "boolean") {
        return String(row.rawValue);
    }
    if (row.valueType === "null") {
        return "null";
    }
    if (row.preview) {
        return row.preview;
    }
    return row.valueType;
};

export const createTreeRowContext = (
    row: FlatJsonRow,
    sourceFormat: ResolvedSourceFormat
): JSONViewerTreeRowContext => {
    const keyText = row.key !== undefined ? String(row.key) : "$";
    const valueText = row.key !== undefined ? formatRowValueText(row) : "";
    const text = valueText ? `${keyText}: ${valueText}` : keyText;

    return {
        mode: "tree",
        id: row.id,
        path: row.path,
        text,
        row,
        sourceFormat
    };
};

export const createPlainRowContext = (
    line: string,
    lineIndex: number,
    sourceFormat: ResolvedSourceFormat
): JSONViewerPlainRowContext => {
    const lineNumber = lineIndex + 1;
    return {
        mode: "plain",
        id: `line:${lineNumber}`,
        lineIndex,
        lineNumber,
        line,
        text: line,
        sourceFormat
    };
};
