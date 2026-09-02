"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, Check, ChevronDown, FolderTree, GitBranch, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clientApi } from "@/lib/client-api";
import type { BlueprintFieldType, CollectionBlueprintNode, CollectionTemplate } from "@/lib/collections/templates";

type EditorField = {
  id: string;
  key: string;
  keyTouched: boolean;
  label: string;
  type: BlueprintFieldType;
  required: boolean;
  configText: string;
};

type EditorRelation = { key: string; keyTouched: boolean; label: string; required: boolean };
type EditorNode = {
  id: string;
  name: string;
  description: string;
  relationToParent?: EditorRelation;
  fields: EditorField[];
  children: EditorNode[];
};

type BlueprintResult = { root: { id: string; name: string; slug: string }; collections: { id: string; parentId: string | null; name: string; slug: string }[] };
const fieldTypes: BlueprintFieldType[] = ["text", "number", "money", "date", "boolean", "select"];

export function CollectionBlueprintBuilder({ template }: { template?: CollectionTemplate }) {
  const router = useRouter();
  const [root, setRoot] = useState<EditorNode>(() => hydrateNode(template?.root ?? blankRoot(), "root"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function updateNode(nodeId: string, update: (node: EditorNode) => EditorNode) {
    setRoot((current) => mapNode(current, nodeId, update));
  }

  function addChild(parentId: string) {
    updateNode(parentId, (parent) => {
      const parentLabel = singularize(parent.name) || "Parent";
      const child: EditorNode = {
        id: createId(),
        name: `${parentLabel} items`,
        description: "",
        relationToParent: { key: toFieldKey(parentLabel), keyTouched: false, label: parentLabel, required: true },
        fields: [newField("Name")],
        children: [],
      };
      return { ...parent, children: [...parent.children, child] };
    });
  }

  function removeNode(nodeId: string) {
    setRoot((current) => removeNodeFromTree(current, nodeId));
  }

  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await clientApi<BlueprintResult>("/api/collection-blueprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ root: serializeNode(root, true) }),
      });
      router.push(`/collections/${result.root.id}`); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create this collection structure."); }
    finally { setBusy(false); }
  }

  const collectionCount = countNodes(root);
  const fieldCount = countFields(root);
  return <form onSubmit={create} className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
    <div className="min-w-0 space-y-5">
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {template && <div className="flex items-start gap-3 rounded-2xl border border-coral/20 bg-coral-soft/45 px-4 py-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-coral-strong shadow-sm"><FolderTree className="size-4" /></span><div><p className="text-sm font-bold text-ink">{template.name} template loaded</p><p className="mt-1 text-xs leading-5 text-muted">{template.detail} Everything below is ordinary, editable collection metadata.</p></div></div>}
      <CollectionEditor node={root} depth={0} updateNode={updateNode} addChild={addChild} removeNode={removeNode} />
    </div>
    <aside className="space-y-4 xl:sticky xl:top-8 xl:h-fit">
      <Card className="overflow-hidden"><div className="border-b bg-ink px-5 py-4 text-white"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">Structure preview</p><h2 className="mt-1 font-bold">What will be created</h2></div><div className="p-5"><StructureTree node={root} depth={0} /><div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-muted"><span className="rounded-full bg-paper px-2.5 py-1">{collectionCount} collection{collectionCount === 1 ? "" : "s"}</span><span className="rounded-full bg-paper px-2.5 py-1">{fieldCount} field{fieldCount === 1 ? "" : "s"}</span></div><p className="mt-4 text-xs leading-5 text-muted">Child relationship fields are included in this count. No sample records are added.</p></div></Card>
      <Card className="p-4"><p className="text-xs leading-5 text-muted">Child sections stay collapsed until you need them. You can nest another collection inside any child, up to five levels.</p></Card>
      <div className="flex flex-col gap-2"><Button disabled={busy} className="w-full"><Check className="size-4" />Create {collectionCount === 1 ? "collection" : "collection family"}</Button><Link href="/collections" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-muted transition hover:bg-surface-muted hover:text-ink"><ArrowLeft className="size-4" />Back to collections</Link></div>
    </aside>
  </form>;
}

function CollectionEditor({ node, depth, updateNode, addChild, removeNode }: { node: EditorNode; depth: number; updateNode(id: string, update: (node: EditorNode) => EditorNode): void; addChild(id: string): void; removeNode(id: string): void }) {
  const body = <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-ink">Collection name<input required maxLength={80} value={node.name} onChange={(event) => updateNode(node.id, (current) => ({ ...current, name: event.target.value }))} placeholder="Purchase orders" className="mt-1.5 h-11 w-full rounded-xl border bg-white px-3 font-normal" /></label><label className="text-sm font-semibold text-ink">Description <span className="font-normal text-muted">(optional)</span><input maxLength={500} value={node.description} onChange={(event) => updateNode(node.id, (current) => ({ ...current, description: event.target.value }))} placeholder="What belongs here?" className="mt-1.5 h-11 w-full rounded-xl border bg-white px-3 font-normal" /></label></div>
    {node.relationToParent && <RelationEditor node={node} updateNode={updateNode} />}
    <FieldsEditor node={node} updateNode={updateNode} />
    <section className="rounded-2xl border border-dashed border-ink/15 bg-paper/30 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-coral-strong">Child collections</p><p className="mt-1 text-xs leading-5 text-muted">Each child automatically links back to {node.name || "this collection"}.</p></div>{depth < 5 && <Button type="button" size="sm" variant="secondary" onClick={() => addChild(node.id)}><GitBranch className="size-4" />Add child</Button>}</div>
      {node.children.length ? <div className="mt-4 space-y-3">{node.children.map((child) => <details key={child.id} className="group overflow-hidden rounded-2xl border bg-surface"><summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 marker:content-none"><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-coral-soft text-coral-strong"><GitBranch className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-ink">{child.name || "Untitled child"}</span><span className="mt-0.5 block truncate text-[11px] text-muted">{child.relationToParent?.label || "Parent"} → {node.name || "parent"} · {child.fields.length} own field{child.fields.length === 1 ? "" : "s"}</span></span><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted group-open:hidden">Edit</span><ChevronDown className="size-4 shrink-0 text-muted transition group-open:rotate-180" /></summary><div className="border-t px-4 py-5 sm:px-5"><CollectionEditor node={child} depth={depth + 1} updateNode={updateNode} addChild={addChild} removeNode={removeNode} /></div></details>)}</div> : <div className="mt-4 rounded-xl bg-white/70 px-4 py-5 text-center text-xs leading-5 text-muted">No children yet. A single collection is perfectly fine.</div>}
    </section>
  </div>;

  if (depth > 0) return <div>{body}<button type="button" onClick={() => removeNode(node.id)} className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-red-600 hover:text-red-700"><Trash2 className="size-3.5" />Remove this collection and its children</button></div>;
  return <Card className="overflow-hidden"><div className="flex items-center gap-3 border-b bg-surface-muted/45 px-5 py-4 sm:px-6"><span className="grid size-9 place-items-center rounded-xl bg-ink text-white"><FolderTree className="size-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted">Root collection</p><h2 className="font-bold text-ink">Primary records</h2></div></div><div className="p-5 sm:p-6">{body}</div></Card>;
}

function RelationEditor({ node, updateNode }: { node: EditorNode; updateNode(id: string, update: (node: EditorNode) => EditorNode): void }) {
  const relation = node.relationToParent!;
  function updateRelation(update: (current: EditorRelation) => EditorRelation) { updateNode(node.id, (current) => ({ ...current, relationToParent: update(current.relationToParent!) })); }
  return <div className="rounded-2xl border border-coral/20 bg-coral-soft/35 p-4"><div className="flex items-center gap-2"><GitBranch className="size-4 text-coral-strong" /><p className="text-xs font-bold uppercase tracking-[0.1em] text-coral-strong">Link to parent</p></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-ink">Relation label<input required value={relation.label} onChange={(event) => { const label = event.target.value; updateRelation((current) => ({ ...current, label, key: current.keyTouched ? current.key : toFieldKey(label) })); }} className="mt-1.5 h-10 w-full rounded-xl border bg-white px-3 text-sm font-normal" /></label><label className="text-xs font-semibold text-ink">Relation key<input required pattern="[a-z][a-z0-9_]*" value={relation.key} onChange={(event) => updateRelation((current) => ({ ...current, key: event.target.value.toLowerCase(), keyTouched: true }))} className="mt-1.5 h-10 w-full rounded-xl border bg-white px-3 font-mono text-sm font-normal" /></label></div><label className="mt-3 flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={relation.required} onChange={(event) => updateRelation((current) => ({ ...current, required: event.target.checked }))} className="size-4 accent-[var(--accent)]" />Require every child record to belong to a parent</label></div>;
}

function FieldsEditor({ node, updateNode }: { node: EditorNode; updateNode(id: string, update: (node: EditorNode) => EditorNode): void }) {
  function updateField(fieldId: string, update: (field: EditorField) => EditorField) { updateNode(node.id, (current) => ({ ...current, fields: current.fields.map((field) => field.id === fieldId ? update(field) : field) })); }
  function removeField(fieldId: string) { updateNode(node.id, (current) => ({ ...current, fields: current.fields.filter((field) => field.id !== fieldId) })); }
  return <section><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-coral-strong">Fields</p><p className="mt-1 text-xs text-muted">These become the columns and form controls for this collection.</p></div><Button type="button" size="sm" variant="secondary" onClick={() => updateNode(node.id, (current) => ({ ...current, fields: [...current.fields, newField("")] }))}><Plus className="size-4" />Add field</Button></div>
    {node.fields.length ? <div className="mt-4 space-y-3">{node.fields.map((field, index) => <div key={field.id} className="rounded-2xl border bg-surface-muted/30 p-3.5"><div className="grid gap-3 md:grid-cols-[1.15fr_1fr_150px_auto]"><label className="text-xs font-semibold text-ink">Label<input required maxLength={80} value={field.label} onChange={(event) => { const label = event.target.value; updateField(field.id, (current) => ({ ...current, label, key: current.keyTouched ? current.key : toFieldKey(label) })); }} placeholder="Invoice date" className="mt-1.5 h-10 w-full rounded-xl border bg-white px-3 text-sm font-normal" /></label><label className="text-xs font-semibold text-ink">Key<input required pattern="[a-z][a-z0-9_]*" maxLength={64} value={field.key} onChange={(event) => updateField(field.id, (current) => ({ ...current, key: event.target.value.toLowerCase(), keyTouched: true }))} placeholder="invoice_date" className="mt-1.5 h-10 w-full rounded-xl border bg-white px-3 font-mono text-sm font-normal" /></label><label className="text-xs font-semibold text-ink">Type<select value={field.type} onChange={(event) => updateField(field.id, (current) => ({ ...current, type: event.target.value as BlueprintFieldType, configText: defaultConfigText(event.target.value as BlueprintFieldType, current.configText) }))} className="mt-1.5 h-10 w-full rounded-xl border bg-white px-3 text-sm font-normal">{fieldTypes.map((type) => <option key={type}>{type}</option>)}</select></label><button type="button" onClick={() => removeField(field.id)} aria-label={`Remove ${field.label || `field ${index + 1}`}`} className="mt-5 grid size-10 place-items-center rounded-xl text-muted transition hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button></div>
        {(field.type === "money" || field.type === "select") && <label className="mt-3 block text-xs font-semibold text-ink">{field.type === "money" ? "Currency" : "Options (comma separated)"}<input required value={field.configText} maxLength={field.type === "money" ? 3 : 500} onChange={(event) => updateField(field.id, (current) => ({ ...current, configText: field.type === "money" ? event.target.value.toUpperCase() : event.target.value }))} placeholder={field.type === "money" ? "IDR" : "Pending, Paid, Cancelled"} className="mt-1.5 h-10 w-full rounded-xl border bg-white px-3 text-sm font-normal" /></label>}
        <label className="mt-3 flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={field.required} onChange={(event) => updateField(field.id, (current) => ({ ...current, required: event.target.checked }))} className="size-4 accent-[var(--accent)]" />Required field</label>
      </div>)}</div> : <div className="mt-4 rounded-xl border border-dashed p-5 text-center text-xs leading-5 text-muted">No own fields. Source-only records are still supported.</div>}
  </section>;
}

function StructureTree({ node, depth }: { node: EditorNode; depth: number }) {
  return <div className={depth ? "mt-2 border-l border-coral/25 pl-3" : ""}><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${depth ? "bg-coral" : "bg-ink"}`} /><span className="truncate text-sm font-bold text-ink">{node.name || "Untitled collection"}</span></div>{node.relationToParent && <p className="ml-4 mt-0.5 truncate text-[10px] text-muted">via {node.relationToParent.label || "parent relation"}</p>}{node.children.map((child) => <StructureTree key={child.id} node={child} depth={depth + 1} />)}</div>;
}

function blankRoot(): CollectionBlueprintNode {
  return { name: "", description: "", fields: [{ key: "name", label: "Name", type: "text", required: true }], children: [] };
}

function hydrateNode(node: CollectionBlueprintNode, path: string): EditorNode {
  return {
    id: `node-${path}`,
    name: node.name,
    description: node.description ?? "",
    relationToParent: node.relationToParent ? { ...node.relationToParent, required: node.relationToParent.required ?? true, keyTouched: false } : undefined,
    fields: node.fields.map((field, index) => ({ id: `field-${path}-${index}`, key: field.key, keyTouched: false, label: field.label, type: field.type, required: field.required ?? false, configText: field.type === "money" ? String(field.config?.currency ?? "IDR") : field.type === "select" ? (field.config?.options as string[] ?? []).join(", ") : "" })),
    children: node.children.map((child, index) => hydrateNode(child, `${path}-${index}`)),
  };
}

function serializeNode(node: EditorNode, isRoot = false): CollectionBlueprintNode {
  return {
    name: node.name,
    description: node.description,
    relationToParent: isRoot ? undefined : node.relationToParent ? { key: node.relationToParent.key, label: node.relationToParent.label, required: node.relationToParent.required } : undefined,
    fields: node.fields.map((field) => ({ key: field.key, label: field.label, type: field.type, required: field.required, config: field.type === "money" ? { currency: field.configText.trim().toUpperCase() } : field.type === "select" ? { options: field.configText.split(",").map((option) => option.trim()).filter(Boolean) } : {} })),
    children: node.children.map((child) => serializeNode(child)),
  };
}

function mapNode(node: EditorNode, nodeId: string, update: (node: EditorNode) => EditorNode): EditorNode {
  if (node.id === nodeId) return update(node);
  return { ...node, children: node.children.map((child) => mapNode(child, nodeId, update)) };
}

function removeNodeFromTree(node: EditorNode, nodeId: string): EditorNode {
  return { ...node, children: node.children.filter((child) => child.id !== nodeId).map((child) => removeNodeFromTree(child, nodeId)) };
}

function newField(label: string): EditorField {
  return { id: createId(), key: toFieldKey(label), keyTouched: false, label, type: "text", required: false, configText: "" };
}

function defaultConfigText(type: BlueprintFieldType, existing: string) {
  if (type === "money") return existing.length === 3 ? existing.toUpperCase() : "IDR";
  if (type === "select") return existing.includes(",") ? existing : "Option 1, Option 2";
  return "";
}

function toFieldKey(label: string) {
  const normalized = label.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!normalized) return "";
  return (/^[a-z]/.test(normalized) ? normalized : `field_${normalized}`).slice(0, 64);
}

function singularize(value: string) {
  const trimmed = value.trim();
  if (/ies$/i.test(trimmed)) return `${trimmed.slice(0, -3)}y`;
  if (/ses$/i.test(trimmed)) return trimmed.slice(0, -2);
  if (/s$/i.test(trimmed) && !/ss$/i.test(trimmed)) return trimmed.slice(0, -1);
  return trimmed;
}

function createId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }
function countNodes(node: EditorNode): number { return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0); }
function countFields(node: EditorNode): number { return node.fields.length + (node.relationToParent ? 1 : 0) + node.children.reduce((sum, child) => sum + countFields(child), 0); }
