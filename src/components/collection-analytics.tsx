"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, CalendarRange, Filter, LineChart, Plus, RefreshCw, Trash2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clientApi } from "@/lib/client-api";

type FieldType = "text" | "number" | "money" | "date" | "boolean" | "select" | "relation";
type Field = { id: string; key: string; label: string; type: FieldType; config: Record<string, unknown>; relationTarget?: { id: string; name: string } | null };
type Schema = { id: string; name: string; fields: Field[] };
type RecordRow = { id: string; values: Record<string, unknown> };
type FieldOption = { path: string; fieldKey: string; relatedFieldKey?: string; label: string; type: FieldType; config: Record<string, unknown>; sourceField: Field };
type FilterRow = { id: string; path: string; operator: string; value: string; valueTo: string };
type AnalyticsResult = { total: number | null; matchedRecordCount: number; totalGroupCount: number; groups: { key: string; label: string; value: number | null; recordCount: number }[]; operation: string; valueFieldType: FieldType | null; currency: string | null };

const inputClass = "h-10 w-full rounded-xl border bg-white px-3 text-sm text-ink";

function formatMetric(value: number | null, result: AnalyticsResult | null) {
  if (value === null) return "—";
  if (result?.valueFieldType === "money") return new Intl.NumberFormat(undefined, { style: "currency", currency: result.currency ?? "USD", maximumFractionDigits: 2 }).format(value);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: result?.operation === "average" ? 2 : 3 }).format(value);
}

function operatorsFor(type: FieldType) {
  if (["number", "money", "date"].includes(type)) return [["equals", "is"], ["gte", "at least"], ["lte", "at most"], ["gt", "greater than"], ["lt", "less than"], ["between", "between"], ["isEmpty", "is empty"], ["isNotEmpty", "is not empty"]];
  if (type === "text") return [["contains", "contains"], ["equals", "is"], ["notEquals", "is not"], ["isEmpty", "is empty"], ["isNotEmpty", "is not empty"]];
  return [["equals", "is"], ["notEquals", "is not"], ["isEmpty", "is empty"], ["isNotEmpty", "is not empty"]];
}

export function CollectionAnalytics({ schema, relations }: { schema: Schema; relations: Record<string, RecordRow[]> }) {
  const [relatedSchemas, setRelatedSchemas] = useState<Record<string, Schema>>({});
  const [operation, setOperation] = useState<"count" | "sum" | "average" | "min" | "max">("count");
  const numericFields = schema.fields.filter((field) => field.type === "number" || field.type === "money");
  const initialGroup = schema.fields.find((field) => ["text", "select", "relation", "date", "boolean"].includes(field.type));
  const [valueFieldKey, setValueFieldKey] = useState(numericFields[0]?.key ?? "");
  const [groupPath, setGroupPath] = useState(initialGroup?.key ?? "");
  const [dateBucket, setDateBucket] = useState<"day" | "week" | "month" | "quarter" | "year">("month");
  const [status, setStatus] = useState<"confirmed" | "draft" | "all">("confirmed");
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [result, setResult] = useState<AnalyticsResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const didAutoRun = useRef(false);

  useEffect(() => {
    const relationFields = schema.fields.filter((field) => field.type === "relation" && field.config.targetCollectionId);
    Promise.all(relationFields.map(async (field) => [String(field.config.targetCollectionId), await clientApi<Schema>(`/api/collections/${field.config.targetCollectionId}`)] as const))
      .then((pairs) => setRelatedSchemas(Object.fromEntries(pairs)))
      .catch(() => setRelatedSchemas({}));
  }, [schema]);

  const fieldOptions = useMemo(() => {
    const local: FieldOption[] = schema.fields.map((field) => ({ path: field.key, fieldKey: field.key, label: field.label, type: field.type, config: field.config, sourceField: field }));
    const related = schema.fields.filter((field) => field.type === "relation").flatMap((relationField) => {
      const target = relatedSchemas[String(relationField.config.targetCollectionId)];
      return target?.fields.filter((field) => field.type !== "relation").map((field) => ({ path: `${relationField.key}.${field.key}`, fieldKey: relationField.key, relatedFieldKey: field.key, label: `${relationField.label} → ${field.label}`, type: field.type, config: field.config, sourceField: relationField })) ?? [];
    });
    return [...local, ...related];
  }, [relatedSchemas, schema]);
  const groupOption = fieldOptions.find((option) => option.path === groupPath);

  const runAnalysis = useCallback(async () => {
    if (operation !== "count" && !valueFieldKey) return;
    setBusy(true); setError("");
    try {
      const group = fieldOptions.find((option) => option.path === groupPath);
      const payloadFilters = filters.map((filter) => {
        const option = fieldOptions.find((item) => item.path === filter.path)!;
        const numeric = option.type === "number" || option.type === "money";
        const parse = (value: string) => numeric && value !== "" ? Number(value) : option.type === "boolean" ? value === "true" : value;
        return { fieldKey: option.fieldKey, relatedFieldKey: option.relatedFieldKey, operator: filter.operator, value: parse(filter.value), valueTo: parse(filter.valueTo) };
      });
      setResult(await clientApi<AnalyticsResult>("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collectionId: schema.id, operation, valueFieldKey: operation === "count" ? undefined : valueFieldKey, groupBy: group ? { fieldKey: group.fieldKey, relatedFieldKey: group.relatedFieldKey } : undefined, dateBucket, filters: payloadFilters, status, sort, limit: 25 }) }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not analyze this collection."); }
    finally { setBusy(false); }
  }, [dateBucket, fieldOptions, filters, groupPath, operation, schema.id, sort, status, valueFieldKey]);

  useEffect(() => {
    if (didAutoRun.current) return;
    didAutoRun.current = true;
    void runAnalysis();
  }, [runAnalysis]);

  function addFilter(path?: string, preset?: { value: string; valueTo: string }) {
    const option = fieldOptions.find((item) => item.path === path) ?? fieldOptions[0];
    if (!option) return;
    const operator = preset ? "between" : operatorsFor(option.type)[0][0];
    setFilters((current) => [...current, { id: crypto.randomUUID(), path: option.path, operator, value: preset?.value ?? "", valueTo: preset?.valueTo ?? "" }]);
  }

  function addThisMonth() {
    const dateOption = fieldOptions.find((option) => option.type === "date");
    if (!dateOption) return;
    const now = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
    addFilter(dateOption.path, { value: start, valueTo: end });
  }

  const dateOptionAvailable = fieldOptions.some((option) => option.type === "date");
  const chartRows = chartType === "line" ? [...(result?.groups ?? [])].sort((a, b) => a.key.localeCompare(b.key)) : result?.groups ?? [];
  const maxValue = Math.max(0, ...chartRows.map((row) => Math.abs(row.value ?? 0)));

  return <div className="mt-5 space-y-5">
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-paper/45 px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-coral-strong">Ask the data</p><h2 className="mt-1 font-bold text-ink">Build an analysis</h2><p className="mt-1 text-xs text-muted">Group records, choose a metric, then narrow the result with precise filters.</p></div><div className="flex gap-2">{dateOptionAvailable && <Button type="button" variant="secondary" size="sm" onClick={addThisMonth}><CalendarRange className="size-4" />This month</Button>}<Button type="button" size="sm" disabled={busy || (operation !== "count" && !valueFieldKey)} onClick={runAnalysis}><RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />{busy ? "Running" : "Run analysis"}</Button></div></div>
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-xs font-bold uppercase tracking-wider text-muted">Metric<select value={operation} onChange={(event) => setOperation(event.target.value as typeof operation)} className={`mt-2 ${inputClass}`}>{["count", "sum", "average", "min", "max"].map((item) => <option key={item} value={item}>{item === "average" ? "Average" : item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
        <label className="text-xs font-bold uppercase tracking-wider text-muted">Value field<select disabled={operation === "count"} value={valueFieldKey} onChange={(event) => setValueFieldKey(event.target.value)} className={`mt-2 ${inputClass} disabled:bg-paper disabled:text-muted`}><option value="">Choose…</option>{numericFields.map((field) => <option key={field.id} value={field.key}>{field.label}</option>)}</select></label>
        <label className="text-xs font-bold uppercase tracking-wider text-muted">Group by<select value={groupPath} onChange={(event) => setGroupPath(event.target.value)} className={`mt-2 ${inputClass}`}><option value="">No grouping</option>{fieldOptions.map((option) => <option key={option.path} value={option.path}>{option.label}</option>)}</select></label>
        <label className="text-xs font-bold uppercase tracking-wider text-muted">Record status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className={`mt-2 ${inputClass}`}><option value="confirmed">Confirmed</option><option value="draft">Drafts</option><option value="all">All records</option></select></label>
        <label className="text-xs font-bold uppercase tracking-wider text-muted">Sort results<select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className={`mt-2 ${inputClass}`}><option value="desc">Highest first</option><option value="asc">Lowest first</option></select></label>
      </div>
      {groupOption?.type === "date" && <div className="border-t px-5 py-4"><label className="flex max-w-xs items-center gap-3 text-sm font-semibold text-ink">Date grouping<select value={dateBucket} onChange={(event) => setDateBucket(event.target.value as typeof dateBucket)} className={inputClass}><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option><option value="quarter">Quarter</option><option value="year">Year</option></select></label></div>}
    </Card>

    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4"><div className="flex items-center gap-2"><Filter className="size-4 text-coral" /><h2 className="font-bold text-ink">Filters</h2></div><Button type="button" variant="ghost" size="sm" onClick={() => addFilter()}><Plus className="size-4" />Add filter</Button></div>
      {filters.length ? <div className="divide-y">{filters.map((filter) => {
        const option = fieldOptions.find((item) => item.path === filter.path) ?? fieldOptions[0];
        if (!option) return null;
        const noValue = filter.operator === "isEmpty" || filter.operator === "isNotEmpty";
        return <div key={filter.id} className="grid items-center gap-2 px-5 py-3 md:grid-cols-[1.35fr_1fr_1.2fr_auto]">
          <select value={filter.path} onChange={(event) => { const next = fieldOptions.find((item) => item.path === event.target.value)!; setFilters((rows) => rows.map((row) => row.id === filter.id ? { ...row, path: next.path, operator: operatorsFor(next.type)[0][0], value: "", valueTo: "" } : row)); }} className={inputClass}>{fieldOptions.map((item) => <option key={item.path} value={item.path}>{item.label}</option>)}</select>
          <select value={filter.operator} onChange={(event) => setFilters((rows) => rows.map((row) => row.id === filter.id ? { ...row, operator: event.target.value } : row))} className={inputClass}>{operatorsFor(option.type).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <div className="flex gap-2">{!noValue && <FilterValue option={option} value={filter.value} onChange={(value) => setFilters((rows) => rows.map((row) => row.id === filter.id ? { ...row, value } : row))} relations={relations} />}{filter.operator === "between" && <FilterValue option={option} value={filter.valueTo} onChange={(valueTo) => setFilters((rows) => rows.map((row) => row.id === filter.id ? { ...row, valueTo } : row))} relations={relations} />}</div>
          <button type="button" aria-label="Remove filter" onClick={() => setFilters((rows) => rows.filter((row) => row.id !== filter.id))} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button>
        </div>;
      })}</div> : <div className="px-5 py-6 text-center text-sm text-muted">No filters yet. Analyze the full collection or add a condition such as “Delivery date is this month.”</div>}
    </Card>

    {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {result && <div className="animate-rise space-y-5">
      <div className="grid gap-3 sm:grid-cols-3"><Card className="p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted">Result</p><p className="mt-2 text-2xl font-bold tracking-tight text-ink">{formatMetric(result.total, result)}</p></Card><Card className="p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted">Matching records</p><p className="mt-2 text-2xl font-bold tracking-tight text-ink">{result.matchedRecordCount}</p></Card><Card className="p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted">Groups found</p><p className="mt-2 text-2xl font-bold tracking-tight text-ink">{result.totalGroupCount}</p></Card></div>
      <Card className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-coral-strong">Visual summary</p><h2 className="mt-1 font-bold text-ink">{groupOption ? `${operation === "count" ? "Count" : operation} by ${groupOption.label}` : "Overall result"}</h2></div><div className="flex rounded-xl bg-paper p-1"><button type="button" onClick={() => setChartType("bar")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${chartType === "bar" ? "bg-white text-ink shadow-sm" : "text-muted"}`}><BarChart3 className="size-3.5" />Bars</button><button type="button" onClick={() => setChartType("line")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${chartType === "line" ? "bg-white text-ink shadow-sm" : "text-muted"}`}><LineChart className="size-3.5" />Line</button></div></div>
        {chartRows.length ? <div className="p-5 sm:p-6">{chartType === "bar" ? <BarChart rows={chartRows} maxValue={maxValue} result={result} /> : <TrendChart rows={chartRows} maxValue={maxValue} />}</div> : <div className="grid min-h-48 place-items-center p-6 text-center"><div><TrendingUp className="mx-auto size-7 text-muted/40" /><p className="mt-2 text-sm font-semibold text-ink">No matching data</p><p className="mt-1 text-sm text-muted">Try widening or removing a filter.</p></div></div>}
      </Card>
      {result.groups.length > 0 && <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-paper/70 text-xs uppercase tracking-wider text-muted"><tr><th className="px-5 py-3 font-bold">Group</th><th className="px-5 py-3 text-right font-bold">Metric</th><th className="px-5 py-3 text-right font-bold">Records</th></tr></thead><tbody className="divide-y">{result.groups.map((row, index) => <tr key={row.key} className="hover:bg-paper/30"><td className="px-5 py-3 font-semibold text-ink"><span className="mr-3 text-xs text-muted">{String(index + 1).padStart(2, "0")}</span>{row.label}</td><td className="px-5 py-3 text-right font-semibold">{formatMetric(row.value, result)}</td><td className="px-5 py-3 text-right text-muted">{row.recordCount}</td></tr>)}</tbody></table></div></Card>}
    </div>}
  </div>;
}

function FilterValue({ option, value, onChange, relations }: { option: FieldOption; value: string; onChange(value: string): void; relations: Record<string, RecordRow[]> }) {
  if (option.type === "boolean") return <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}><option value="">Choose…</option><option value="true">Yes</option><option value="false">No</option></select>;
  if (option.type === "select") return <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}><option value="">Choose…</option>{((option.config.options as string[]) ?? []).map((item) => <option key={item}>{item}</option>)}</select>;
  if (option.type === "relation" && !option.relatedFieldKey) return <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}><option value="">Choose…</option>{(relations[option.sourceField.id] ?? []).map((record) => <option key={record.id} value={record.id}>{String(Object.values(record.values).find((item) => typeof item === "string") ?? record.id)}</option>)}</select>;
  return <input type={option.type === "date" ? "date" : option.type === "number" || option.type === "money" ? "number" : "text"} step={option.type === "number" || option.type === "money" ? "any" : undefined} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />;
}

function BarChart({ rows, maxValue, result }: { rows: AnalyticsResult["groups"]; maxValue: number; result: AnalyticsResult }) {
  return <div className="space-y-4">{rows.map((row, index) => <div key={row.key} className="grid grid-cols-[minmax(7rem,1fr)_minmax(8rem,3fr)] items-center gap-4"><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{row.label}</p><p className="mt-0.5 text-xs text-muted">{formatMetric(row.value, result)}</p></div><div className="h-8 overflow-hidden rounded-lg bg-paper"><div className="h-full min-w-1 rounded-lg bg-ink transition-[width] duration-500" style={{ width: `${maxValue ? Math.max(2, (Math.abs(row.value ?? 0) / maxValue) * 100) : 0}%`, backgroundColor: index === 0 ? "var(--coral)" : undefined }} /></div></div>)}</div>;
}

function TrendChart({ rows, maxValue }: { rows: AnalyticsResult["groups"]; maxValue: number }) {
  const points = rows.map((row, index) => `${rows.length === 1 ? 360 : 35 + (index / (rows.length - 1)) * 650},${225 - (maxValue ? Math.abs(row.value ?? 0) / maxValue : 0) * 180}`).join(" ");
  return <div><svg role="img" aria-label="Line chart of grouped results" viewBox="0 0 720 250" className="h-auto w-full overflow-visible"><path d="M35 225H685" stroke="var(--border)" strokeWidth="2" /><path d="M35 45H685M35 105H685M35 165H685" stroke="var(--border)" strokeWidth="1" strokeDasharray="5 7" /><polyline points={points} fill="none" stroke="var(--coral)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />{points.split(" ").map((point, index) => { const [cx, cy] = point.split(","); return <circle key={rows[index].key} cx={cx} cy={cy} r="6" fill="var(--surface)" stroke="var(--ink)" strokeWidth="3" />; })}</svg><div className="mt-2 flex justify-between gap-2 text-[10px] font-semibold text-muted">{rows.map((row) => <span key={row.key} className="max-w-24 truncate">{row.label}</span>)}</div></div>;
}
