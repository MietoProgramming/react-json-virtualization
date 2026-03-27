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

  const metrics = useMemo(() => {
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
