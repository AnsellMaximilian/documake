"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Check, ChevronRight, Plus, Search, Settings2, Trash2 } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CollectionAnalytics } from "@/components/collection-analytics";
import { CollectionRelationsMap } from "@/components/collection-relations-map";
import { SourceDocumentPicker, type SourceDocumentOption } from "@/components/source-document-picker";

type FieldType = "text" | "number" | "money" | "date" | "boolean" | "select" | "relation";
type Field = { id: string; key: string; label: string; type: FieldType; required: boolean; position: number; config: Record<string, unknown>; relationTarget?: { id: string; name: string } | null };
type Schema = { id: string; name: string; description: string | null; fields: Field[] };
type RecordRow = { id: string; values: Record<string, unknown>; status: "draft" | "confirmed"; updatedAt: string };
type Collection = { id: string; name: string; description?: string | null };
type Document = SourceDocumentOption;
type WorkspaceTab = "records" | "analyze" | "relations" | "schema";

const workspaceTabs: { id: WorkspaceTab; label: string }[] = [
  { id: "records", label: "Records" },
  { id: "analyze", label: "Analyze" },
  { id: "relations", label: "Relations" },
  { id: "schema", label: "Schema" },
];

function recordLabel(row: RecordRow | undefined) {
  if (!row) return undefined;
  return String(Object.values(row.values).find((item) => typeof item === "string") ?? row.id);
}

function formatValue(field: Field, value: unknown, related: RecordRow[] = []) {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "relation") return recordLabel(related.find((row) => row.id === value)) ?? String(value);
  if (field.type === "boolean") return value ? "Yes" : "No";
  if (field.type === "date" && typeof value === "string") return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
  if (field.type === "money" && typeof value === "number") return new Intl.NumberFormat(undefined, { style: "currency", currency: String(field.config.currency ?? "USD"), maximumFractionDigits: 2 }).format(value);
  return String(value);
}

export function CollectionWorkspace({ collectionId, initialValues = {}, returnRecordId }: { collectionId: string; initialValues?: Record<string, unknown>; returnRecordId?: string }) {
  const router = useRouter();
  const [schema, setSchema] = useState<Schema | null>(null); const [records, setRecords] = useState<RecordRow[]>([]); const [collections, setCollections] = useState<Collection[]>([]); const [documents, setDocuments] = useState<Document[]>([]); const [relations, setRelations] = useState<Record<string, RecordRow[]>>({});
  const [tab, setTab] = useState<WorkspaceTab>("records"); const [query, setQuery] = useState(""); const [showRecordForm, setShowRecordForm] = useState(Object.keys(initialValues).length > 0); const [values, setValues] = useState<Record<string, unknown>>(initialValues); const [sourceDocumentIds, setSourceDocumentIds] = useState<string[]>([]); const [draft, setDraft] = useState(false);
  const [fieldForm, setFieldForm] = useState({ key: "", label: "", type: "text" as FieldType, required: false, configText: "", targetCollectionId: "" }); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [summaries, setSummaries] = useState<Record<string, { sum: number | null; average: number | null }>>({});
  const load = useCallback(async () => {
    try {
      const [nextSchema, nextRecords, nextCollections, nextDocuments] = await Promise.all([clientApi<Schema>(`/api/collections/${collectionId}`), clientApi<RecordRow[]>(`/api/records?collectionId=${collectionId}&limit=100`), clientApi<Collection[]>("/api/collections"), clientApi<Document[]>("/api/documents?limit=100")]);
      setSchema(nextSchema); setRecords(nextRecords); setCollections(nextCollections); setDocuments(nextDocuments);
      const relationFields = nextSchema.fields.filter((field) => field.type === "relation"); const relationPairs = await Promise.all(relationFields.map(async (field) => [field.id, await clientApi<RecordRow[]>(`/api/records?collectionId=${field.config.targetCollectionId}&limit=100`)] as const)); setRelations(Object.fromEntries(relationPairs));
      const numeric = nextSchema.fields.filter((field) => field.type === "number" || field.type === "money"); const summaryPairs = await Promise.all(numeric.map(async (field) => { const [sum, average] = await Promise.all([clientApi<{ value: number | null }>("/api/aggregate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collectionId, operation: "sum", fieldKey: field.key }) }), clientApi<{ value: number | null }>("/api/aggregate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collectionId, operation: "average", fieldKey: field.key }) })]); return [field.key, { sum: sum.value, average: average.value }] as const; })); setSummaries(Object.fromEntries(summaryPairs));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load this collection."); }
  }, [collectionId]);
  useEffect(() => { const timer = window.setTimeout(load, 0); const refresh = () => load(); window.addEventListener("documake:data-changed", refresh); return () => { window.clearTimeout(timer); window.removeEventListener("documake:data-changed", refresh); }; }, [load]);
  const visible = useMemo(() => records.filter((row) => !query || JSON.stringify(row.values).toLowerCase().includes(query.toLowerCase())), [records, query]);

  async function addField(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); let config: Record<string, unknown> = {};
    if (fieldForm.type === "money") config = { currency: fieldForm.configText.trim().toUpperCase() || "USD" };
    if (fieldForm.type === "select") config = { options: fieldForm.configText.split(",").map((item) => item.trim()).filter(Boolean) };
    if (fieldForm.type === "relation") config = { targetCollectionId: fieldForm.targetCollectionId };
    try { await clientApi(`/api/collections/${collectionId}/fields`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: fieldForm.key, label: fieldForm.label, type: fieldForm.type, required: fieldForm.required, config }) }); setFieldForm({ key: "", label: "", type: "text", required: false, configText: "", targetCollectionId: "" }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not add field."); } finally { setBusy(false); }
  }
  async function createRecord(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { await clientApi("/api/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collectionId, values, sourceDocumentIds, status: draft ? "draft" : "confirmed" }) }); setValues({}); setSourceDocumentIds([]); setShowRecordForm(false); if (returnRecordId) { router.push(`/records/${returnRecordId}`); router.refresh(); } else { await load(); } } catch (e) { setError(e instanceof Error ? e.message : "Could not create record."); } finally { setBusy(false); } }
  async function removeField(field: Field) { if (!confirm(`Delete “${field.label}”? This also removes existing ${field.key} values and relations from every record in this collection.`)) return; await clientApi(`/api/fields/${field.id}`, { method: "DELETE" }); await load(); }
  async function renameField(field: Field) { const label = prompt("Field label", field.label)?.trim(); if (!label || label === field.label) return; await clientApi(`/api/fields/${field.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }) }); await load(); }
  async function editField(field: Field) {
    const label = prompt("Field label", field.label)?.trim(); if (!label) return; let config = field.config;
    if (field.type === "money") { const currency = prompt("Three-letter currency", String(field.config.currency ?? "USD"))?.trim().toUpperCase(); if (!currency) return; config = { currency }; }
    if (field.type === "select") { const options = prompt("Comma-separated options", (field.config.options as string[] ?? []).join(", "))?.split(",").map((item) => item.trim()).filter(Boolean); if (!options?.length) return; config = { options }; }
    if (field.type === "relation") { const targetCollectionId = prompt("Target collection ID", String(field.config.targetCollectionId ?? ""))?.trim(); if (!targetCollectionId) return; config = { targetCollectionId }; }
    const required = confirm(`Should “${label}” be required?`); await clientApi(`/api/fields/${field.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, config, required }) }); await load();
  }
  async function renameCollection() { const name = prompt("Collection name", schema?.name ?? "")?.trim(); if (!name) return; const description = prompt("Description", schema?.description ?? "") ?? schema?.description; await clientApi(`/api/collections/${collectionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description }) }); await load(); }
  async function removeCollection() {
    if (!schema || !confirm(`Delete “${schema.name}” and all of its records and fields? Relation fields in other collections that point here will also be removed. Source documents are preserved.`)) return;
    setBusy(true); setError("");
    try { await clientApi(`/api/collections/${collectionId}`, { method: "DELETE" }); router.push("/collections"); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete this collection."); setBusy(false); }
  }
  async function moveField(index: number, direction: -1 | 1) { if (!schema) return; const other = schema.fields[index + direction]; const field = schema.fields[index]; if (!other) return; await Promise.all([clientApi(`/api/fields/${field.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ position: other.position }) }), clientApi(`/api/fields/${other.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ position: field.position }) })]); await load(); }
  if (!schema) return <Card className="mt-8 p-6 text-sm text-muted">{error || "Loading collection…"}</Card>;
  const relationFieldCount = schema.fields.filter((field) => field.type === "relation").length;
  return <div>
    {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <Link href="/collections" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-coral-strong transition hover:text-coral"><span className="h-px w-5 bg-coral" />Collections</Link>
        <h1 className="mt-3 truncate text-4xl font-bold tracking-[-0.045em] text-ink sm:text-5xl">{schema.name}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{schema.description || "Browse its records, inspect patterns, map relationships, or shape the fields behind it."}</p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted">
        <span className="rounded-full border bg-surface px-3 py-1.5 shadow-sm">{records.length} record{records.length === 1 ? "" : "s"}</span>
        <span className="rounded-full border bg-surface px-3 py-1.5 shadow-sm">{schema.fields.length} field{schema.fields.length === 1 ? "" : "s"}</span>
        <span className="rounded-full border bg-surface px-3 py-1.5 shadow-sm">{relationFieldCount} relation field{relationFieldCount === 1 ? "" : "s"}</span>
      </div>
    </header>
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden border-b border-ink/15"><div role="tablist" aria-label={`${schema.name} workspace views`} className="flex min-w-max gap-6">{workspaceTabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`relative rounded-t-lg px-1 py-3 text-sm font-semibold transition focus-visible:bg-coral-soft focus-visible:text-ink focus-visible:outline-none ${tab === item.id ? "text-ink" : "text-muted hover:text-ink"}`}>{item.label}{tab === item.id && <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-coral" />}</button>)}</div></div>
      {tab === "records" && <Button size="sm" onClick={() => setShowRecordForm(!showRecordForm)} className="shrink-0 self-start sm:self-auto"><Plus className="size-4" />{showRecordForm ? "Close form" : "New record"}</Button>}
    </div>
    {tab === "records" ? <div className="mt-5 space-y-5">
      {!schema.fields.length && <div role="status" className="flex flex-col gap-4 rounded-2xl border border-amber-300/70 bg-amber-50 px-5 py-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><AlertTriangle className="size-5" /></span><div><p className="text-sm font-bold">This collection has no fields yet</p><p className="mt-1 max-w-2xl text-xs leading-5 text-amber-800">You can still create a source-only record, but it will not contain structured values until fields are added. Existing records can be filled in later.</p></div></div><Button type="button" size="sm" variant="secondary" onClick={() => setTab("schema")} className="shrink-0 self-start sm:self-auto"><Settings2 className="size-4" />Open schema</Button></div>}
      {showRecordForm && <Card className="p-5">{returnRecordId && <div className="mb-4 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-strong">Creating a related {schema.name} record. The relation is already selected.</div>}<form onSubmit={createRecord}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{schema.fields.map((field) => <FieldInput key={field.id} field={field} value={values[field.key]} related={relations[field.id] ?? []} onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))} />)}</div>
        <SourceDocumentPicker documents={documents} selectedIds={sourceDocumentIds} onChange={setSourceDocumentIds} />
        <div className="mt-5 flex flex-wrap items-center gap-3"><Button disabled={busy}><Check className="size-4" />{schema.fields.length ? "Save record" : "Save source-only record"}</Button><label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} className="size-4 accent-[var(--accent)]" />Save as draft for review</label></div>
      </form></Card>}
      <div className="flex flex-wrap gap-3">{Object.entries(summaries).map(([key, summary]) => { const field = schema.fields.find((item) => item.key === key)!; return <Card key={key} className="min-w-48 p-4"><p className="text-xs font-medium text-muted">{field.label}</p><p className="mt-2 text-sm font-semibold">Sum {formatValue(field, summary.sum)}</p><p className="mt-1 text-xs text-muted">Average {formatValue(field, summary.average)}</p></Card>; })}</div>
      <Card className="overflow-hidden"><div className="flex items-center gap-2 border-b px-4 py-3"><Search className="size-4 text-muted" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter records…" className="w-full bg-transparent text-sm outline-none" /></div><div className="overflow-x-auto"><table className="w-full min-w-2xl text-left text-sm"><thead className="bg-surface-muted text-xs text-muted"><tr>{schema.fields.map((field) => <th key={field.id} className="px-4 py-3 font-medium">{field.label}</th>)}<th className="px-4 py-3 font-medium">Status</th><th /></tr></thead><tbody className="divide-y">{visible.map((row) => <tr key={row.id} className="hover:bg-surface-muted/60">{schema.fields.map((field) => <td key={field.id} className="max-w-64 truncate px-4 py-3">{formatValue(field, row.values[field.key], relations[field.id] ?? [])}</td>)}<td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${row.status === "draft" ? "bg-amber-100 text-amber-800" : "bg-accent-soft text-accent-strong"}`}>{row.status}</span></td><td className="px-4 py-3"><Link href={`/records/${row.id}`} aria-label="Open record"><ChevronRight className="size-4 text-muted" /></Link></td></tr>)}</tbody></table>{!visible.length && <div className="grid min-h-44 place-items-center text-center text-sm text-muted">No matching records.</div>}</div></Card>
    </div> : tab === "analyze" ? <CollectionAnalytics schema={schema} relations={relations} /> : tab === "relations" ? <CollectionRelationsMap schema={schema} collections={collections} onOpenSchema={() => setTab("schema")} /> : <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
      <Card className="overflow-hidden"><div className="flex items-start justify-between gap-4 border-b px-5 py-4"><div><h2 className="font-semibold">{schema.name} fields</h2><p className="mt-1 text-xs text-muted">Rename and reorder fields while keeping existing records intact.</p></div><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="secondary" onClick={renameCollection}>Rename collection</Button><Button type="button" size="sm" variant="danger" disabled={busy} onClick={removeCollection}><Trash2 className="size-4" />Delete collection</Button></div></div><div className="divide-y">{schema.fields.map((field, index) => <div key={field.id} className="flex items-center gap-3 px-5 py-4"><div className="min-w-0 flex-1"><button onClick={() => renameField(field)} className="text-sm font-medium hover:text-accent">{field.label}</button><p className="mt-1 font-mono text-xs text-muted">{field.key} · {field.type}{field.required ? " · required" : ""}{field.relationTarget ? ` → ${field.relationTarget.name}` : ""}</p></div><button onClick={() => editField(field)} className="text-muted hover:text-accent" aria-label={`Edit ${field.label}`}><Settings2 className="size-4" /></button><button onClick={() => moveField(index, -1)} disabled={index === 0} className="text-muted disabled:opacity-25"><ArrowUp className="size-4" /></button><button onClick={() => moveField(index, 1)} disabled={index === schema.fields.length - 1} className="text-muted disabled:opacity-25"><ArrowDown className="size-4" /></button><button onClick={() => removeField(field)} className="text-muted hover:text-red-600"><Trash2 className="size-4" /></button></div>)}{!schema.fields.length && <div className="p-8 text-center text-sm text-muted">Add the first field to begin shaping this collection.</div>}</div></Card>
      <Card className="h-fit p-5"><div className="flex items-center gap-2"><Settings2 className="size-4 text-accent" /><h2 className="font-semibold">Add field</h2></div><form onSubmit={addField} className="mt-4 space-y-3"><label className="block text-sm font-medium">Label<input required value={fieldForm.label} onChange={(e) => setFieldForm((f) => ({ ...f, label: e.target.value, key: f.key || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "") }))} className="mt-1.5 h-10 w-full rounded-lg border px-3 font-normal" placeholder="Due date" /></label><label className="block text-sm font-medium">Key<input required pattern="[a-z][a-z0-9_]*" value={fieldForm.key} onChange={(e) => setFieldForm((f) => ({ ...f, key: e.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border px-3 font-mono text-sm font-normal" placeholder="due_date" /></label><label className="block text-sm font-medium">Type<select value={fieldForm.type} onChange={(e) => setFieldForm((f) => ({ ...f, type: e.target.value as FieldType }))} className="mt-1.5 h-10 w-full rounded-lg border bg-white px-3 font-normal">{["text", "number", "money", "date", "boolean", "select", "relation"].map((type) => <option key={type}>{type}</option>)}</select></label>{fieldForm.type === "money" && <label className="block text-sm font-medium">Currency<input value={fieldForm.configText} onChange={(e) => setFieldForm((f) => ({ ...f, configText: e.target.value }))} maxLength={3} placeholder="IDR" className="mt-1.5 h-10 w-full rounded-lg border px-3 uppercase font-normal" /></label>}{fieldForm.type === "select" && <label className="block text-sm font-medium">Options<input value={fieldForm.configText} onChange={(e) => setFieldForm((f) => ({ ...f, configText: e.target.value }))} placeholder="Pending, Paid, Cancelled" className="mt-1.5 h-10 w-full rounded-lg border px-3 font-normal" /></label>}{fieldForm.type === "relation" && <label className="block text-sm font-medium">Target collection<select required value={fieldForm.targetCollectionId} onChange={(e) => setFieldForm((f) => ({ ...f, targetCollectionId: e.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border bg-white px-3 font-normal"><option value="">Choose…</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label>}<label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={fieldForm.required} onChange={(e) => setFieldForm((f) => ({ ...f, required: e.target.checked }))} className="size-4 accent-[var(--accent)]" />Required field</label><Button disabled={busy} className="w-full"><Plus className="size-4" />Add field</Button></form></Card>
    </div>}
  </div>;
}

function FieldInput({ field, value, related, onChange }: { field: Field; value: unknown; related: RecordRow[]; onChange(value: unknown): void }) {
  const label = <span>{field.label}{field.required && <span className="text-red-600"> *</span>}</span>; const classes = "mt-1.5 h-10 w-full rounded-lg border bg-white px-3 font-normal";
  if (field.type === "boolean") return <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium"><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--accent)]" />{label}</label>;
  if (field.type === "select") return <label className="text-sm font-medium">{label}<select required={field.required} value={String(value ?? "")} onChange={(e) => onChange(e.target.value || undefined)} className={classes}><option value="">Choose…</option>{(field.config.options as string[] ?? []).map((option) => <option key={option}>{option}</option>)}</select></label>;
  if (field.type === "relation") return <label className="text-sm font-medium">{label}<select required={field.required} value={String(value ?? "")} onChange={(e) => onChange(e.target.value || undefined)} className={classes}><option value="">Choose related record…</option>{related.map((row) => <option key={row.id} value={row.id}>{String(Object.values(row.values).find((item) => typeof item === "string") ?? row.id)}</option>)}</select></label>;
  return <label className="text-sm font-medium">{label}<input required={field.required} type={field.type === "date" ? "date" : field.type === "number" || field.type === "money" ? "number" : "text"} step={field.type === "number" || field.type === "money" ? "any" : undefined} value={String(value ?? "")} onChange={(e) => onChange(field.type === "number" || field.type === "money" ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value)} className={classes} /></label>;
}
