"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { SourceDocumentPicker, type SourceDocumentOption } from "@/components/source-document-picker";

type Field = { id: string; key: string; label: string; type: string; required: boolean; config: Record<string, unknown> };
type CompactRecord = { id: string; status?: "draft" | "confirmed"; values: Record<string, unknown> };
type RelatedSummary = {
  fieldKey: string;
  label: string;
  type: string;
  config: Record<string, unknown>;
  working: { sum: number; average: number | null; valueCount: number };
  confirmed: { sum: number; average: number | null; valueCount: number };
};
type IncomingRelation = {
  field: { id: string; key: string; label: string };
  collection: { id: string; name: string };
  fields: Field[];
  records: (CompactRecord & { status: "draft" | "confirmed" })[];
  totalCount: number;
  confirmedCount: number;
  summaries: RelatedSummary[];
};
type RecordDetailData = {
  id: string;
  status: "draft" | "confirmed";
  values: Record<string, unknown>;
  collection: { id: string; name: string };
  fields: Field[];
  documents: { id: string; originalFilename: string; mimeType: string }[];
  relatedRecords: { fieldId: string; record?: CompactRecord }[];
  incomingRelations: IncomingRelation[];
};
type SourceDocument = SourceDocumentOption;

function recordLabel(record: CompactRecord | undefined) {
  return String(Object.values(record?.values ?? {}).find((value) => typeof value === "string") ?? record?.id ?? "Related record");
}

function formatValue(field: Pick<Field, "type" | "config">, value: unknown) {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "boolean") return value ? "Yes" : "No";
  if (field.type === "date" && typeof value === "string") return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
  if (field.type === "money" && typeof value === "number") return new Intl.NumberFormat(undefined, { style: "currency", currency: String(field.config.currency ?? "USD"), maximumFractionDigits: 2 }).format(value);
  return String(value);
}

export function RecordDetail({ recordId }: { recordId: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<RecordDetailData | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [allDocuments, setAllDocuments] = useState<SourceDocument[]>([]);
  const [sourceDocumentIds, setSourceDocumentIds] = useState<string[]>([]);
  const [relationOptions, setRelationOptions] = useState<Record<string, CompactRecord[]>>({});

  const load = useCallback(async () => {
    try {
      const [data, docs] = await Promise.all([
        clientApi<RecordDetailData>(`/api/records/${recordId}`),
        clientApi<SourceDocument[]>("/api/documents?limit=100"),
      ]);
      setRecord(data);
      setValues(data.values);
      setAllDocuments(docs);
      setSourceDocumentIds(data.documents.map((doc) => doc.id));
      const pairs = await Promise.all(data.fields.filter((field) => field.type === "relation").map(async (field) => [field.id, await clientApi<CompactRecord[]>(`/api/records?collectionId=${field.config.targetCollectionId}&limit=100`)] as const));
      setRelationOptions(Object.fromEntries(pairs));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load record.");
    }
  }, [recordId]);

  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);

  async function persistChanges() {
    setBusy(true); setError("");
    try {
      await clientApi(`/api/records/${recordId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values, sourceDocumentIds }) });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save record."); }
    finally { setBusy(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    await persistChanges();
  }

  async function confirmRecord() {
    setBusy(true); setError("");
    try { await clientApi(`/api/records/${recordId}/confirm`, { method: "POST" }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not confirm record."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!record || !confirm("Delete this record? Relations and document links will also be removed.")) return;
    await clientApi(`/api/records/${recordId}`, { method: "DELETE" });
    router.push(`/collections/${record.collection.id}`); router.refresh();
  }

  if (!record) return <Card className="p-6 text-sm text-muted">{error || "Loading record…"}</Card>;

  return <div>
    <Link href={`/collections/${record.collection.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground"><ArrowLeft className="size-4" />Back to {record.collection.name}</Link>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-medium text-accent">{record.collection.name}</p><div className="mt-1 flex items-center gap-3"><h1 className="text-2xl font-semibold tracking-tight">Record detail</h1><span className={`rounded-full px-2 py-1 text-xs font-medium ${record.status === "draft" ? "bg-amber-100 text-amber-800" : "bg-accent-soft text-accent-strong"}`}>{record.status}</span></div></div>
      <div className="flex gap-2">{record.status === "draft" && <Button variant="secondary" onClick={confirmRecord} disabled={busy}><CheckCircle2 className="size-4" />Confirm</Button>}<Button variant="ghost" onClick={remove}><Trash2 className="size-4" />Delete</Button></div>
    </div>
    {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
      <Card className="p-6"><h2 className="font-semibold">Field values</h2><form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2">{record.fields.map((field) => <RecordInput key={field.id} field={field} value={values[field.key]} onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))} options={relationOptions[field.id] ?? []} />)}<div className="sm:col-span-2"><Button disabled={busy}><Save className="size-4" />Save changes</Button></div></form></Card>
      <Card className="p-5"><h2 className="font-semibold">Links from this record</h2><p className="mt-1 text-xs leading-5 text-muted">Relationships selected in this record&apos;s fields.</p>{record.relatedRecords.length ? <div className="mt-4 space-y-2">{record.relatedRecords.map((relation) => <Link key={relation.fieldId} href={`/records/${relation.record?.id}`} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm font-semibold hover:border-coral/35 hover:bg-surface-muted"><span className="truncate">{recordLabel(relation.record)}</span><ChevronRight className="size-4 shrink-0 text-muted" /></Link>)}</div> : <p className="mt-4 rounded-xl border border-dashed p-4 text-sm leading-6 text-muted">No outgoing links yet. Relation fields can connect this record to another collection.</p>}</Card>
    </div>
    <Card className="mt-5 overflow-hidden p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/10 px-5 py-4 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-coral-strong">Provenance</p><h2 className="mt-1 font-semibold text-ink">Attached source documents</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-muted">Keep the original images and PDFs beside the structured record. Select or clear sources, then save the attachments.</p></div><span className="rounded-full border bg-surface px-3 py-1 text-xs font-bold text-muted">{sourceDocumentIds.length} attached</span></div>
      <div className="px-5 pb-5 sm:px-6"><SourceDocumentPicker documents={allDocuments} selectedIds={sourceDocumentIds} onChange={setSourceDocumentIds} /><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted">Original files remain in Inbox if detached from this record.</p><Button type="button" onClick={persistChanges} disabled={busy}><Save className="size-4" />Save attachments</Button></div></div>
    </Card>
    <IncomingRelations groups={record.incomingRelations} recordId={record.id} onCreated={load} />
  </div>;
}

function IncomingRelations({ groups, recordId, onCreated }: { groups: IncomingRelation[]; recordId: string; onCreated(): Promise<void> }) {
  const [creatingGroup, setCreatingGroup] = useState<IncomingRelation | null>(null);
  if (!groups.length) return null;
  return <section className="mt-8 space-y-5">
    <div><p className="text-sm font-medium text-accent">Related records</p><h2 className="mt-1 text-xl font-semibold tracking-tight">Records that link here</h2></div>
    {groups.map((group) => {
      const visibleFields = group.fields.filter((field) => field.id !== group.field.id);
      const query = new URLSearchParams({ relatedField: group.field.key, relatedRecord: recordId, returnRecord: recordId });
      return <Card key={group.field.id} className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b px-5 py-4">
          <div><h3 className="font-semibold">{group.collection.name}</h3><p className="mt-1 text-xs text-muted">{group.totalCount} linked via {group.field.label} · {group.confirmedCount} confirmed</p></div>
          <div className="flex flex-wrap gap-2"><Link href={`/collections/${group.collection.id}?${query.toString()}`} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-ink/10 bg-surface px-3 text-xs font-bold text-muted transition hover:bg-surface-muted hover:text-ink">Full form <ExternalLink className="size-3.5" /></Link><Button type="button" size="sm" onClick={() => setCreatingGroup(group)}><Plus className="size-4" />Quick add</Button></div>
        </div>
        {group.summaries.length > 0 && <div className="flex flex-wrap gap-3 border-b bg-surface-muted/40 px-5 py-4">{group.summaries.map((summary) => <div key={summary.fieldKey} className="rounded-lg border bg-surface px-3 py-2"><p className="text-xs font-medium text-muted">{summary.label}</p><p className="mt-1 text-sm font-semibold">Working sum {formatValue(summary, summary.working.sum)}</p>{group.confirmedCount !== group.totalCount && <p className="mt-0.5 text-xs text-muted">Confirmed sum {formatValue(summary, summary.confirmed.sum)}</p>}</div>)}</div>}
        <div className="overflow-x-auto"><table className="w-full min-w-2xl text-left text-sm"><thead className="bg-surface-muted text-xs text-muted"><tr>{visibleFields.map((field) => <th key={field.id} className="px-4 py-3 font-medium">{field.label}</th>)}<th className="px-4 py-3 font-medium">Status</th><th /></tr></thead><tbody className="divide-y">{group.records.map((item) => <tr key={item.id} className="hover:bg-surface-muted/60">{visibleFields.map((field) => <td key={field.id} className="max-w-64 truncate px-4 py-3">{formatValue(field, item.values[field.key])}</td>)}<td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${item.status === "draft" ? "bg-amber-100 text-amber-800" : "bg-accent-soft text-accent-strong"}`}>{item.status}</span></td><td className="px-4 py-3"><Link href={`/records/${item.id}`} aria-label="Open related record"><ChevronRight className="size-4 text-muted" /></Link></td></tr>)}</tbody></table></div>
      </Card>;
    })}
    {creatingGroup && <QuickRelatedRecordModal key={creatingGroup.field.id} group={creatingGroup} parentRecordId={recordId} onClose={() => setCreatingGroup(null)} onCreated={onCreated} />}
  </section>;
}

function QuickRelatedRecordModal({ group, parentRecordId, onClose, onCreated }: { group: IncomingRelation; parentRecordId: string; onClose(): void; onCreated(): Promise<void> }) {
  const [values, setValues] = useState<Record<string, unknown>>({ [group.field.key]: parentRecordId });
  const [options, setOptions] = useState<Record<string, CompactRecord[]>>({});
  const [draft, setDraft] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const relationFields = group.fields.filter((field) => field.type === "relation" && field.id !== group.field.id);
    let cancelled = false;
    Promise.all(relationFields.map(async (field) => [field.id, await clientApi<CompactRecord[]>(`/api/records?collectionId=${field.config.targetCollectionId}&limit=100`)] as const))
      .then((pairs) => { if (!cancelled) setOptions(Object.fromEntries(pairs)); })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load relation options."); });
    return () => { cancelled = true; };
  }, [group, parentRecordId]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await clientApi("/api/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collectionId: group.collection.id, values: { ...values, [group.field.key]: parentRecordId }, status: draft ? "draft" : "confirmed" }) });
      await onCreated(); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create related record."); }
    finally { setBusy(false); }
  }

  const visibleFields = group.fields.filter((field) => field.id !== group.field.id);
  return <Modal open onClose={() => { if (!busy) onClose(); }} title={`New ${group.collection.name} record`} description={`The ${group.field.label} relationship is already linked to this record.`} maxWidth="max-w-3xl">
    <form onSubmit={create}>
      <div className="space-y-5 px-5 py-6 sm:px-6">
        {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {visibleFields.length ? <div className="grid gap-4 sm:grid-cols-2">{visibleFields.map((field) => <RecordInput key={field.id} field={field} value={values[field.key]} onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))} options={options[field.id] ?? []} />)}</div> : <div className="rounded-xl border border-dashed border-ink/20 bg-paper/40 p-5 text-sm leading-6 text-muted">This child collection has no additional fields. You can still create the relationship now and shape the record later.</div>}
        <p className="rounded-xl bg-accent-soft/60 px-4 py-3 text-xs leading-5 text-accent-strong">The relationship field <strong>{group.field.label}</strong> is filled automatically and hidden here to keep this quick.</p>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-ink/10 bg-surface-muted/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={draft} onChange={(event) => setDraft(event.target.checked)} className="size-4 accent-[var(--accent)]" />Save as draft for review</label><div className="flex gap-2"><Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button disabled={busy}><Plus className="size-4" />Create related record</Button></div></div>
    </form>
  </Modal>;
}

function RecordInput({ field, value, onChange, options }: { field: Field; value: unknown; onChange(value: unknown): void; options: CompactRecord[] }) {
  const classes = "mt-1.5 h-10 w-full rounded-lg border bg-white px-3 font-normal";
  if (field.type === "boolean") return <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[var(--accent)]" />{field.label}</label>;
  if (field.type === "select") return <label className="text-sm font-medium">{field.label}<select value={String(value ?? "")} onChange={(event) => onChange(event.target.value || null)} className={classes}><option value="">Choose…</option>{(field.config.options as string[] ?? []).map((option) => <option key={option}>{option}</option>)}</select></label>;
  if (field.type === "relation") return <label className="text-sm font-medium">{field.label}<select required={field.required} value={String(value ?? "")} onChange={(event) => onChange(event.target.value || null)} className={classes}><option value="">Choose related record…</option>{options.map((option) => <option key={option.id} value={option.id}>{recordLabel(option)}</option>)}</select></label>;
  return <label className="text-sm font-medium">{field.label}{field.required && " *"}<input required={field.required} type={field.type === "date" ? "date" : field.type === "number" || field.type === "money" ? "number" : "text"} step={field.type === "number" || field.type === "money" ? "any" : undefined} value={String(value ?? "")} onChange={(event) => onChange(field.type === "number" || field.type === "money" ? (event.target.value === "" ? null : Number(event.target.value)) : (event.target.value || null))} className={classes} /></label>;
}
