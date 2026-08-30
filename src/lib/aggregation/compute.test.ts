import { describe, expect, it } from "vitest";
import { computeAggregation } from "./compute";
describe("aggregation", () => {
  it("computes all supported numeric operations", () => { const values = [10, 20, 30]; expect(computeAggregation("count", values)).toBe(3); expect(computeAggregation("sum", values)).toBe(60); expect(computeAggregation("average", values)).toBe(20); expect(computeAggregation("min", values)).toBe(10); expect(computeAggregation("max", values)).toBe(30); });
  it("uses useful empty-set semantics", () => { expect(computeAggregation("sum", [])).toBe(0); expect(computeAggregation("average", [])).toBeNull(); });
});
