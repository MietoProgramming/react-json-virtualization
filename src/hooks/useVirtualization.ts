import type { RefObject, UIEvent } from "react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createScrollRange } from "./scrollRange";

export interface UseVirtualizationOptions {
  rowCount: number;
  rowHeight: number;
  overscan: number;
}

type ScrollAlignment = "start" | "center" | "end" | "center-if-needed";

export interface UseVirtualizationResult {
  containerRef: RefObject<HTMLDivElement>;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
  startIndex: number;
  endIndex: number;
  topSpacerHeight: number;
  bottomSpacerHeight: number;
  scrollToIndex: (index: number, align?: ScrollAlignment) => void;
}

interface VirtualMetricsInput {
  rowCount: number;
  rowHeight: number;
  overscan: number;
  scrollTop: number;
  viewportHeight: number;
}

interface VirtualMetrics {
  startIndex: number;
  endIndex: number;
  topSpacerHeight: number;
  bottomSpacerHeight: number;
}

export function clampScrollTop(value: number, maxScrollTop: number): number {
  if (maxScrollTop <= 0) {
    return 0;
  }
  return Math.min(Math.max(value, 0), maxScrollTop);
}

export function calculateVirtualMetrics({
  rowCount,
  rowHeight,
  overscan,
  scrollTop,
  viewportHeight
}: VirtualMetricsInput): VirtualMetrics {
  if (rowCount === 0 || viewportHeight === 0) {
    return {
      startIndex: 0,
      endIndex: 0,
      topSpacerHeight: 0,
      bottomSpacerHeight: 0
    };
  }

  const range = createScrollRange(rowCount, rowHeight, overscan, viewportHeight);
  const viewportScrollTop = clampScrollTop(scrollTop, range.maxScrollTop);
  const logicalScrollTop = range.toLogical(viewportScrollTop);
  const firstVisibleIndex = Math.floor(logicalScrollTop / rowHeight);
  const visibleEndIndex = Math.ceil((logicalScrollTop + viewportHeight) / rowHeight);
  const startIndex = Math.max(0, firstVisibleIndex - range.overscan);
  const endIndex = Math.min(rowCount, visibleEndIndex + range.overscan);

  const topSpacerHeight = Math.max(0, startIndex * rowHeight - (logicalScrollTop - viewportScrollTop));
  const renderedHeight = (endIndex - startIndex) * rowHeight;
  const bottomSpacerHeight = Math.max(0, range.contentHeight - topSpacerHeight - renderedHeight);

  return {
    startIndex,
    endIndex,
    topSpacerHeight,
    bottomSpacerHeight
  };
}

export function useVirtualization({
  rowCount,
  rowHeight,
  overscan
}: UseVirtualizationOptions): UseVirtualizationResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateHeight = (): void => {
      setViewportHeight(element.clientHeight);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (element) {
      setScrollTop(element.scrollTop);
    }
  }, [rowCount, rowHeight, viewportHeight]);

  const metrics = useMemo(() => {
    return calculateVirtualMetrics({
      rowCount,
      rowHeight,
      overscan,
      scrollTop,
      viewportHeight
    });
  }, [overscan, rowCount, rowHeight, scrollTop, viewportHeight]);

  const onScroll = (event: UIEvent<HTMLDivElement>): void => {
    setScrollTop(event.currentTarget.scrollTop);
  };

  const scrollToIndex = useCallback((
    index: number,
    align: ScrollAlignment = "center"
  ): void => {
    const element = containerRef.current;
    if (!element || rowCount === 0) {
      return;
    }

    const clampedIndex = Math.min(Math.max(index, 0), Math.max(0, rowCount - 1));
    const rowTop = clampedIndex * rowHeight;
    const rowBottom = rowTop + rowHeight;
    const { clientHeight, scrollHeight, scrollTop } = element;
    const range = createScrollRange(rowCount, rowHeight, overscan, clientHeight);
    const logicalScrollTop = range.toLogical(scrollTop);
    if (
      align === "center-if-needed" &&
      rowTop >= logicalScrollTop &&
      rowBottom <= logicalScrollTop + clientHeight
    ) {
      return;
    }

    const maxScrollTop = Math.max(0, scrollHeight - clientHeight);
    let nextScrollTop: number;

    if (align === "start") {
      nextScrollTop = rowTop;
    } else if (align === "end") {
      nextScrollTop = rowBottom - clientHeight;
    } else {
      nextScrollTop = rowTop - (clientHeight - rowHeight) / 2;
    }

    const clampedScrollTop = clampScrollTop(range.toPhysical(nextScrollTop), maxScrollTop);
    if (scrollTop === clampedScrollTop) {
      return;
    }

    element.scrollTop = clampedScrollTop;
    setScrollTop(element.scrollTop);
  }, [overscan, rowCount, rowHeight]);

  return {
    containerRef,
    onScroll,
    ...metrics,
    scrollToIndex
  };
}
