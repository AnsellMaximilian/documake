import { computeAggregation } from "@/lib/aggregation/compute";

type NumericField = {
  key: string;
  label: string;
  type: string;
  config: Record<string, unknown>;
};

type RelatedRecord = {
  status: "draft" | "confirmed";
  values: Record<string, unknown>;
};

export function summarizeRelatedRecords(fields: NumericField[], records: RelatedRecord[]) {
  return fields
    .filter((field) => field.type === "number" || field.type === "money")
    .map((field) => {
      const allValues = records
        .map((record) => record.values[field.key])
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      const confirmedValues = records
        .filter((record) => record.status === "confirmed")
        .map((record) => record.values[field.key])
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

      return {
        fieldKey: field.key,
        label: field.label,
        type: field.type,
        config: field.config,
        working: {
          sum: computeAggregation("sum", allValues),
          average: computeAggregation("average", allValues),
          valueCount: allValues.length,
        },
        confirmed: {
          sum: computeAggregation("sum", confirmedValues),
          average: computeAggregation("average", confirmedValues),
          valueCount: confirmedValues.length,
        },
      };
    });
}
