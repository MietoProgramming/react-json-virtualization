import type { RefObject, UIEvent } from "react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

export interface UseVirtualizationOptions {
  rowCount: number;
  rowHeight: number;
  overscan: number;
}

export interface UseVirtualizationResult {
  containerRef: RefObject<HTMLDivElement>;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
  startIndex: number;
  endIndex: number;
  topSpacerHeight: number;
  bottomSpacerHeight: number;
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

  const firstVisibleIndex = Math.floor(scrollTop / rowHeight);
  const visibleCount = Math.ceil(viewportHeight / rowHeight);
  const startIndex = Math.max(0, firstVisibleIndex - overscan);
  const endIndex = Math.min(rowCount, firstVisibleIndex + visibleCount + overscan);

  const topSpacerHeight = startIndex * rowHeight;
  const bottomSpacerHeight = Math.max(0, (rowCount - endIndex) * rowHeight);

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
    if (!element || viewportHeight === 0) {
      return;
    }

    const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight);
    const currentScrollTop = element.scrollTop;
    const nextScrollTop = clampScrollTop(currentScrollTop, maxScrollTop);

    if (nextScrollTop === currentScrollTop) {
      return;
    }

    element.scrollTop = nextScrollTop;
    setScrollTop(nextScrollTop);
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

  return {
    containerRef,
    onScroll,
    ...metrics
  };
}
