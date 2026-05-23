import { useDataState, useDimensionState, useExpansionState, useFilterState, useSearchState } from "./useDemoStateHelpers";
import type { DemoState, DemoStateActions } from "./useDemoStateTypes";
import { usePanelState } from "./usePanelState";
import { useRowCustomizationState } from "./useRowCustomizationState";
import { useViewerState } from "./useViewerState";

export function useDemoState(): [DemoState, DemoStateActions] {
  const [viewerState, viewerActions] = useViewerState();
  const [panelState, panelActions] = usePanelState();
  const [dataState, dataActions] = useDataState();
  const [dimensionState, dimensionActions] = useDimensionState();
  const [filterState, filterActions] = useFilterState();
  const [searchState, searchActions] = useSearchState();
  const [expansionState, expansionActions] = useExpansionState();
  const [rowCustomizationState, rowCustomizationActions] = useRowCustomizationState();

  const state: DemoState = {
    ...viewerState, ...panelState, ...dataState,
    ...dimensionState, ...filterState, ...searchState, ...expansionState,
    ...rowCustomizationState
  };

  const actions: DemoStateActions = {
    ...viewerActions, ...panelActions, ...dataActions,
    ...dimensionActions, ...filterActions, ...searchActions, ...expansionActions,
    ...rowCustomizationActions
  } as DemoStateActions;

  return [state, actions];
}

export type { DemoState, DemoStateActions } from "./useDemoStateTypes";
