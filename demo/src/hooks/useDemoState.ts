import { useViewerState } from "./useViewerState";
import { usePanelState } from "./usePanelState";
import { useDataState } from "./useDemoStateHelpers";
import { useDimensionState } from "./useDemoStateHelpers";
import { useFilterState } from "./useDemoStateHelpers";
import { useSearchState } from "./useDemoStateHelpers";
import { useExpansionState } from "./useDemoStateHelpers";
import type { DemoState, DemoStateActions } from "./useDemoStateTypes";

export function useDemoState(): [DemoState, DemoStateActions] {
  const [viewerState, viewerActions] = useViewerState();
  const [panelState, panelActions] = usePanelState();
  const [dataState, dataActions] = useDataState();
  const [dimensionState, dimensionActions] = useDimensionState();
  const [filterState, filterActions] = useFilterState();
  const [searchState, searchActions] = useSearchState();
  const [expansionState, expansionActions] = useExpansionState();

  const state: DemoState = {
    ...viewerState, ...panelState, ...dataState,
    ...dimensionState, ...filterState, ...searchState, ...expansionState
  };

  const actions: DemoStateActions = {
    ...viewerActions, ...panelActions, ...dataActions,
    ...dimensionActions, ...filterActions, ...searchActions, ...expansionActions
  };

  return [state, actions];
}

export type { DemoState, DemoStateActions } from "./useDemoStateTypes";
