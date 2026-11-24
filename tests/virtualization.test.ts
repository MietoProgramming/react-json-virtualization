import { describe, expect, it } from "vitest";
import { createScrollRange } from "../src/hooks/scrollRange";
import { calculateVirtualMetrics, clampScrollTop } from "../src/hooks/useVirtualization";

describe("clampScrollTop", () => {
  it("clamps negative values to zero", () => {
    expect(clampScrollTop(-10, 200)).toBe(0);
  });

  it("clamps values above max", () => {
    expect(clampScrollTop(240, 200)).toBe(200);
  });

  it("returns zero when max is zero or negative", () => {
    expect(clampScrollTop(50, 0)).toBe(0);
    expect(clampScrollTop(50, -20)).toBe(0);
  });

  it("keeps in-range values unchanged", () => {
    expect(clampScrollTop(120, 200)).toBe(120);
  });
});

describe("calculateVirtualMetrics", () => {
  it("returns empty metrics when there are no rows", () => {
    expect(
      calculateVirtualMetrics({
        rowCount: 0,
        rowHeight: 24,
        overscan: 8,
        scrollTop: 200,
        viewportHeight: 240
      })
    ).toEqual({
      startIndex: 0,
      endIndex: 0,
      topSpacerHeight: 0,
      bottomSpacerHeight: 0
    });
  });

  it("applies overscan and computes spacers", () => {
    expect(
      calculateVirtualMetrics({
        rowCount: 100,
        rowHeight: 24,
        overscan: 2,
        scrollTop: 240,
        viewportHeight: 120
      })
    ).toEqual({
      startIndex: 8,
      endIndex: 17,
      topSpacerHeight: 192,
      bottomSpacerHeight: 1992
    });
  });

  it("renders a partially visible last row at fractional scrollTop", () => {
    expect(
      calculateVirtualMetrics({
        rowCount: 100,
        rowHeight: 24,
        overscan: 8,
        scrollTop: 47.5,
        viewportHeight: 120
      })
    ).toEqual({
      startIndex: 0,
      endIndex: 15,
      topSpacerHeight: 0,
      bottomSpacerHeight: 2040
    });
  });

  it("keeps an extreme document scrollable with full-height rows", () => {
    const rowCount = 780_100;
    const rowHeight = 24;
    const options = { rowCount, rowHeight, overscan: 8, viewportHeight: 518 };
    const range = createScrollRange(rowCount, rowHeight, options.overscan, options.viewportHeight);
    expect(range.contentHeight).toBeLessThan(rowCount * rowHeight);

    for (const targetIndex of [0, 8, 749_980, rowCount - 9, rowCount - 1]) {
      const offset = (targetIndex + 0.5) * rowHeight - options.viewportHeight / 2;
      const scrollTop = clampScrollTop(range.toPhysical(offset), range.maxScrollTop);
      const metrics = calculateVirtualMetrics({ ...options, scrollTop });
      const renderedHeight = (metrics.endIndex - metrics.startIndex) * rowHeight;
      const targetTop = metrics.topSpacerHeight + (targetIndex - metrics.startIndex) * rowHeight;

      expect(metrics.startIndex).toBeLessThanOrEqual(targetIndex);
      expect(metrics.endIndex).toBeGreaterThan(targetIndex);
      expect(metrics.topSpacerHeight + renderedHeight + metrics.bottomSpacerHeight)
        .toBeCloseTo(range.contentHeight);
      expect(targetTop - scrollTop).toBeGreaterThanOrEqual(-0.01);
      expect(targetTop + rowHeight - scrollTop).toBeLessThanOrEqual(options.viewportHeight + 0.01);
    }
  });

  it("uses the new range when filtering or replacing a scrolled document", () => {
    expect(calculateVirtualMetrics({
      rowCount: 3, rowHeight: 24, overscan: 8, viewportHeight: 518, scrollTop: 7_000_000
    })).toEqual({
      startIndex: 0, endIndex: 3, topSpacerHeight: 0, bottomSpacerHeight: 0
    });
  });
});
