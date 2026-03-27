import { describe, expect, it } from "vitest";
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

  it("handles fractional scrollTop consistently", () => {
    expect(
      calculateVirtualMetrics({
        rowCount: 100,
        rowHeight: 24,
        overscan: 8,
        scrollTop: 47,
        viewportHeight: 120
      })
    ).toEqual({
      startIndex: 0,
      endIndex: 14,
      topSpacerHeight: 0,
      bottomSpacerHeight: 2064
    });
  });
});
