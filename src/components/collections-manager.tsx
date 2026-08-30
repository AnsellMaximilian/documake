"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Layers3, Plus } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Collection = { id: string; name: string; description: string | null; recordCount: number };
const templates = {
  Invoices: [{ key: "invoice_number", label: "Invoice number", type: "text", required: true }, { key: "date", label: "Date", type: "date" }, { key: "total", label: "Total", type: "money", config: { currency: "IDR" } }, { key: "paid", label: "Paid", type: "boolean" }],
  Expenses: [{ key: "description", label: "Description", type: "text", required: true }, { key: "date", label: "Date", type: "date" }, { key: "amount", label: "Amount", type: "money", config: { currency: "IDR" } }, { key: "category", label: "Category", type: "select", config: { options: ["Travel", "Software", "Office", "Other"] } }],
  Tasks: [{ key: "title", label: "Title", type: "text", required: true }, { key: "estimate", label: "Estimate", type: "number" }, { key: "due_date", label: "Due date", type: "date" }, { key: "completed", label: "Completed", type: "boolean" }],
} as const;

export function CollectionsManager() {
  const [items, setItems] = useState<Collection[]>([]); const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const load = () => clientApi<Collection[]>("/api/collections").then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); const refresh = () => load(); window.addEventListener("documake:data-changed", refresh); return () => window.removeEventListener("documake:data-changed", refresh); }, []);
  async function create(event: FormEvent, template?: keyof typeof templates) {
    event.preventDefault(); const collectionName = template ?? name; if (!collectionName) return; setBusy(true); setError("");
    try { const created = await clientApi<Collection>("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: collectionName, description: template ? `A generic ${template.toLowerCase()} collection.` : description }) });
      if (template) for (const field of templates[template]) await clientApi(`/api/collections/${created.id}/fields`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ required: false, config: {}, ...field }) });
      setName(""); setDescription(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create collection."); } finally { setBusy(false); }
  }
  return <div className="mt-8 space-y-8">
    {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section><h2 className="text-sm font-semibold">Start with a simple template</h2><div className="mt-3 grid gap-3 sm:grid-cols-3">
      {Object.keys(templates).map((template) => <button key={template} disabled={busy} onClick={(event) => create(event, template as keyof typeof templates)} className="rounded-xl border bg-surface p-4 text-left transition hover:border-accent/40 hover:shadow-sm"><span className="text-sm font-semibold">{template}</span><p className="mt-1 text-xs leading-5 text-muted">Generic fields only. You can change the schema afterward.</p></button>)}
    </div></section>
    <Card className="p-5"><form onSubmit={create} className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end"><label className="text-sm font-medium">Collection name<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="Purchase orders" className="mt-1.5 h-10 w-full rounded-lg border bg-white px-3 font-normal" /></label><label className="text-sm font-medium">Description <span className="font-normal text-muted">(optional)</span><input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} placeholder="What belongs here?" className="mt-1.5 h-10 w-full rounded-lg border bg-white px-3 font-normal" /></label><Button disabled={busy}><Plus className="size-4" />Create</Button></form></Card>
    <section><h2 className="text-sm font-semibold">Your collections</h2>{items.length ? <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <Link key={item.id} href={`/collections/${item.id}`}><Card className="group h-full p-5 transition hover:border-accent/30 hover:shadow-sm"><div className="flex items-start justify-between"><span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent"><Layers3 className="size-4" /></span><ArrowRight className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" /></div><h3 className="mt-5 font-semibold">{item.name}</h3><p className="mt-1 min-h-10 text-sm leading-5 text-muted">{item.description || "No description yet."}</p><p className="mt-4 text-xs font-medium text-muted">{Number(item.recordCount)} records</p></Card></Link>)}</div> : <Card className="mt-3 grid min-h-52 place-items-center p-8 text-center"><div><Layers3 className="mx-auto size-7 text-muted/50" /><p className="mt-3 text-sm font-medium">No collections yet</p><p className="mt-1 text-sm text-muted">Choose a starter or define a custom record type.</p></div></Card>}</section>
  </div>;
}
