import { computeAggregation, type AggregationOperation } from "@/lib/aggregation/compute";

export type AnalyticsFieldType = "text" | "number" | "money" | "date" | "boolean" | "select" | "relation";
export type AnalyticsFieldRef = { fieldKey: string; relatedFieldKey?: string; type: AnalyticsFieldType };
export type AnalyticsOperator = "equals" | "notEquals" | "contains" | "isEmpty" | "isNotEmpty" | "gt" | "gte" | "lt" | "lte" | "between";
export type AnalyticsFilter = AnalyticsFieldRef & { operator: AnalyticsOperator; value?: unknown; valueTo?: unknown };
export type AnalyticsRecord = { values: Record<string, unknown>; status: "draft" | "confirmed" };
export type DateBucket = "day" | "week" | "month" | "quarter" | "year";

export type AnalyticsConfig = {
  operation: AggregationOperation;
  valueFieldKey?: string;
  groupBy?: AnalyticsFieldRef;
  dateBucket?: DateBucket;
  filters: AnalyticsFilter[];
  status: "confirmed" | "draft" | "all";
  sort: "asc" | "desc";
  limit: number;
};

type ResolveValue = (record: AnalyticsRecord, field: AnalyticsFieldRef) => unknown;
type FormatLabel = (value: unknown, field: AnalyticsFieldRef, bucketKey?: string) => string;

function isEmpty(value: unknown) {
  return value === undefined || value === null || value === "";
}

function comparable(value: unknown, type: AnalyticsFieldType) {
  if (type === "number" || type === "money") return typeof value === "number" ? value : Number(value);
  if (type === "date" && typeof value === "string") return Date.parse(`${value}T00:00:00Z`);
  if (type === "boolean") return value === true ? 1 : value === false ? 0 : Number.NaN;
  return String(value ?? "").toLocaleLowerCase();
}

export function matchesAnalyticsFilter(value: unknown, filter: AnalyticsFilter) {
  if (filter.operator === "isEmpty") return isEmpty(value);
  if (filter.operator === "isNotEmpty") return !isEmpty(value);
  if (filter.operator === "contains") return String(value ?? "").toLocaleLowerCase().includes(String(filter.value ?? "").toLocaleLowerCase());
  if (filter.operator === "equals") return String(value ?? "") === String(filter.value ?? "");
  if (filter.operator === "notEquals") return String(value ?? "") !== String(filter.value ?? "");
  if (isEmpty(value)) return false;
  const actual = comparable(value, filter.type);
  const expected = comparable(filter.value, filter.type);
  if (typeof actual === "number" && (!Number.isFinite(actual) || !Number.isFinite(expected as number))) return false;
  if (filter.operator === "gt") return actual > expected;
  if (filter.operator === "gte") return actual >= expected;
  if (filter.operator === "lt") return actual < expected;
  if (filter.operator === "lte") return actual <= expected;
  const upper = comparable(filter.valueTo, filter.type);
  return actual >= expected && actual <= upper;
}

export function dateBucketKey(value: unknown, bucket: DateBucket) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) return null;
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  if (bucket === "year") return String(year);
  if (bucket === "quarter") return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
  if (bucket === "month") return `${year}-${String(month).padStart(2, "0")}`;
  if (bucket === "day") return value;
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const weekYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil((((date.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
  return `${weekYear}-W${String(week).padStart(2, "0")}`;
}

function metricValue(records: AnalyticsRecord[], config: AnalyticsConfig) {
  if (config.operation === "count") return records.length;
  const values = records.map((record) => record.values[config.valueFieldKey ?? ""]).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return computeAggregation(config.operation, values);
}

export function computeGroupedAnalytics(records: AnalyticsRecord[], config: AnalyticsConfig, resolveValue: ResolveValue = (record, field) => record.values[field.fieldKey], formatLabel: FormatLabel = (value) => isEmpty(value) ? "No value" : String(value)) {
  const filtered = records.filter((record) => (config.status === "all" || record.status === config.status) && config.filters.every((filter) => matchesAnalyticsFilter(resolveValue(record, filter), filter)));
  const groups = new Map<string, { label: string; records: AnalyticsRecord[] }>();

  for (const record of filtered) {
    const raw = config.groupBy ? resolveValue(record, config.groupBy) : "All records";
    const bucketKey = config.groupBy?.type === "date" ? dateBucketKey(raw, config.dateBucket ?? "month") : undefined;
    const key = bucketKey ?? (isEmpty(raw) ? "__empty__" : String(raw));
    const label = config.groupBy ? formatLabel(raw, config.groupBy, bucketKey ?? undefined) : "All records";
    const group = groups.get(key) ?? { label, records: [] };
    group.records.push(record);
    groups.set(key, group);
  }

  const result = [...groups.entries()].map(([key, group]) => ({
    key,
    label: group.label,
    value: metricValue(group.records, config),
    recordCount: group.records.length,
  })).sort((a, b) => {
    const left = a.value ?? Number.NEGATIVE_INFINITY;
    const right = b.value ?? Number.NEGATIVE_INFINITY;
    const compared = left === right ? a.label.localeCompare(b.label) : left - right;
    return config.sort === "asc" ? compared : -compared;
  });

  return {
    total: metricValue(filtered, config),
    matchedRecordCount: filtered.length,
    groups: result.slice(0, config.limit),
    totalGroupCount: result.length,
  };
}
