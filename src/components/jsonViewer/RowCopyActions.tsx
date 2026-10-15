import React from "react";
import type { FlatJsonRow } from "../../core/types";
import type { JSONViewerCopyActions } from "./JSONViewerProps";

interface RowCopyActionsProps {
  row: FlatJsonRow;
  actions: boolean | JSONViewerCopyActions;
  copyText?: (text: string) => void | Promise<void>;
  onCopyError?: (error: Error, path: string, kind: "path" | "value" | "subtree") => void;
}

const resolveActions = (actions: boolean | JSONViewerCopyActions): Required<JSONViewerCopyActions> =>
  actions === true
    ? { path: true, value: true, subtree: true }
    : actions === false
      ? { path: false, value: false, subtree: false }
      : { path: actions.path ?? false, value: actions.value ?? false, subtree: actions.subtree ?? false };

const writeClipboard = async (text: string): Promise<void> => {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    throw new Error("Clipboard API is unavailable in this browser");
  }
  await navigator.clipboard.writeText(text);
};

export function RowCopyActions({ row, actions, copyText, onCopyError }: RowCopyActionsProps): React.ReactElement | null {
  const enabled = resolveActions(actions);
  const copy = async (kind: "path" | "value" | "subtree"): Promise<void> => {
    let text: string;
    try {
      text = kind === "path"
        ? row.path
        : JSON.stringify(row.rawValue, null, kind === "subtree" ? 2 : undefined) ?? "undefined";
      await (copyText ?? writeClipboard)(text);
    } catch (candidate) {
      const error = candidate instanceof Error ? candidate : new Error("Unable to copy document data");
      onCopyError?.(error, row.path, kind);
    }
  };
  const actionsList = (["path", "value", "subtree"] as const).filter((kind) => enabled[kind]);
  if (actionsList.length === 0) return null;
  const labels = { path: "Copy path", value: "Copy value", subtree: "Copy subtree" };
  return (
    <div className="rjv-copy-actions">
      {actionsList.map((kind) => (
        <button
          key={kind}
          type="button"
          aria-label={`${labels[kind]} ${row.path}`}
          title={labels[kind]}
          onClick={(event) => { event.stopPropagation(); void copy(kind); }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {kind === "path" ? "Path" : kind === "value" ? "Value" : "Tree"}
        </button>
      ))}
    </div>
  );
}
