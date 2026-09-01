import { describe, expect, it } from "vitest";
import { computeGroupedAnalytics, dateBucketKey, matchesAnalyticsFilter, type AnalyticsRecord } from "./compute";

const rows: AnalyticsRecord[] = [
  { status: "confirmed", values: { product: "Eggs", quantity: 5, date: "2026-08-03" } },
  { status: "confirmed", values: { product: "Rice", quantity: 2, date: "2026-08-11" } },
  { status: "confirmed", values: { product: "Eggs", quantity: 8, date: "2026-09-01" } },
  { status: "draft", values: { product: "Eggs", quantity: 100, date: "2026-08-20" } },
];

describe("grouped analytics", () => {
  it("filters, groups, and sorts numeric metrics", () => {
    const result = computeGroupedAnalytics(rows, {
      operation: "sum", valueFieldKey: "quantity", groupBy: { fieldKey: "product", type: "text" },
      filters: [{ fieldKey: "date", type: "date", operator: "between", value: "2026-08-01", valueTo: "2026-08-31" }],
      status: "confirmed", sort: "desc", limit: 10,
    });
    expect(result.total).toBe(7);
    expect(result.groups.map((group) => [group.label, group.value])).toEqual([["Eggs", 5], ["Rice", 2]]);
  });

  it("supports relation-aware value resolvers", () => {
    const result = computeGroupedAnalytics(rows, {
      operation: "count", groupBy: { fieldKey: "delivery", relatedFieldKey: "region", type: "select" }, filters: [], status: "all", sort: "desc", limit: 10,
    }, (_record, field) => field.relatedFieldKey ? "North" : undefined);
    expect(result.groups).toEqual([{ key: "North", label: "North", value: 4, recordCount: 4 }]);
  });
});

describe("analytics filters", () => {
  it("handles numeric comparisons and emptiness", () => {
    expect(matchesAnalyticsFilter(12, { fieldKey: "quantity", type: "number", operator: "gte", value: 10 })).toBe(true);
    expect(matchesAnalyticsFilter("", { fieldKey: "name", type: "text", operator: "isEmpty" })).toBe(true);
  });

  it("creates stable calendar buckets", () => {
    expect(dateBucketKey("2026-08-30", "month")).toBe("2026-08");
    expect(dateBucketKey("2026-08-30", "quarter")).toBe("2026-Q3");
    expect(dateBucketKey("2026-08-30", "year")).toBe("2026");
  });
});
