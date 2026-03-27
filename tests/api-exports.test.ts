import { describe, expect, it } from "vitest";
import * as api from "../src/index";

describe("public API exports", () => {
  it("exports VirtualizeJSON namespace with requested members", () => {
    expect(typeof api.VirtualizeJSON.Collapsable).toBe("function");
    expect(typeof api.VirtualizeJSON.Static).toBe("function");
  });

  it("does not export legacy JSONViewer component", () => {
    expect("JSONViewer" in api).toBe(false);
  });
});
