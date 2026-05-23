import { useState } from "react";
import type { DemoState, DemoStateActions } from "./useDemoStateTypes";

export function useRowCustomizationState(): [
    Pick<
        DemoState,
        | "rowHighlightQuery"
        | "rowHideQuery"
        | "rowHighlightEnabled"
        | "rowActionsEnabled"
        | "rowRendererEnabled"
        | "rowHideEnabled"
        | "rowToggleStyleEnabled"
    >,
    Pick<
        DemoStateActions,
        | "setRowHighlightQuery"
        | "setRowHideQuery"
        | "setRowHighlightEnabled"
        | "setRowActionsEnabled"
        | "setRowRendererEnabled"
        | "setRowHideEnabled"
        | "setRowToggleStyleEnabled"
    >
] {
    const [rowHighlightQuery, setRowHighlightQuery] = useState("name");
    const [rowHideQuery, setRowHideQuery] = useState("roles");
    const [rowHighlightEnabled, setRowHighlightEnabled] = useState(true);
    const [rowActionsEnabled, setRowActionsEnabled] = useState(true);
    const [rowRendererEnabled, setRowRendererEnabled] = useState(false);
    const [rowHideEnabled, setRowHideEnabled] = useState(false);
    const [rowToggleStyleEnabled, setRowToggleStyleEnabled] = useState(false);

    return [
        {
            rowHighlightQuery,
            rowHideQuery,
            rowHighlightEnabled,
            rowActionsEnabled,
            rowRendererEnabled,
            rowHideEnabled,
            rowToggleStyleEnabled
        },
        {
            setRowHighlightQuery,
            setRowHideQuery,
            setRowHighlightEnabled,
            setRowActionsEnabled,
            setRowRendererEnabled,
            setRowHideEnabled,
            setRowToggleStyleEnabled
        }
    ];
}
