export type AggregationOperation = "count" | "sum" | "average" | "min" | "max";

export function computeAggregation(operation: AggregationOperation, values: number[]) {
  const finite = values.filter(Number.isFinite);
  if (operation === "count") return finite.length;
  if (operation === "sum") return finite.reduce((total, value) => total + value, 0);
  if (!finite.length) return null;
  if (operation === "average") return finite.reduce((total, value) => total + value, 0) / finite.length;
  if (operation === "min") return Math.min(...finite);
  return Math.max(...finite);
}
