// Browsers cap layout dimensions. Keep the scroll surface below that limit
// while preserving the actual height of the rendered rows.
const MAX_SCROLL_CONTENT_HEIGHT = 8_000_000;

function mapScrollTop(scrollTop: number, fromMax: number, toMax: number, edge: number): number {
  if (fromMax === toMax || scrollTop <= edge) return scrollTop;
  if (scrollTop >= fromMax - edge) return scrollTop + (toMax - fromMax);

  return edge + (scrollTop - edge) * (toMax - 2 * edge) / (fromMax - 2 * edge);
}

export function createScrollRange(
  rowCount: number,
  rowHeight: number,
  overscan: number,
  viewportHeight: number
) {
  const logicalHeight = rowCount * rowHeight;
  const contentHeight = Math.min(logicalHeight, MAX_SCROLL_CONTENT_HEIGHT);
  const logicalMax = Math.max(0, logicalHeight - viewportHeight);
  const physicalMax = Math.max(0, contentHeight - viewportHeight);

  // Map both ends one-to-one so full-size rows and overscan fit against
  // either boundary without pushing the virtual window past the spacers.
  const availableOverscan = Math.max(0, Math.floor(physicalMax / (3 * rowHeight)) - 1);
  const windowOverscan = logicalMax === physicalMax ? overscan : Math.min(overscan, availableOverscan);
  const edge = Math.min((windowOverscan + 1) * rowHeight, physicalMax / 3);

  return {
    contentHeight,
    maxScrollTop: physicalMax,
    overscan: windowOverscan,
    toLogical: (scrollTop: number) => mapScrollTop(scrollTop, physicalMax, logicalMax, edge),
    toPhysical: (scrollTop: number) => mapScrollTop(scrollTop, logicalMax, physicalMax, edge)
  };
}
