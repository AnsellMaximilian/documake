"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, ClipboardCheck, Layers3, Plus, ReceiptText, WalletCards } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Collection = { id: string; name: string; description: string | null; recordCount: number };
const templates = {
  Invoices: [{ key: "invoice_number", label: "Invoice number", type: "text", required: true }, { key: "date", label: "Date", type: "date" }, { key: "total", label: "Total", type: "money", config: { currency: "IDR" } }, { key: "paid", label: "Paid", type: "boolean" }],
  Expenses: [{ key: "description", label: "Description", type: "text", required: true }, { key: "date", label: "Date", type: "date" }, { key: "amount", label: "Amount", type: "money", config: { currency: "IDR" } }, { key: "category", label: "Category", type: "select", config: { options: ["Travel", "Software", "Office", "Other"] } }],
  Tasks: [{ key: "title", label: "Title", type: "text", required: true }, { key: "estimate", label: "Estimate", type: "number" }, { key: "due_date", label: "Due date", type: "date" }, { key: "completed", label: "Completed", type: "boolean" }],
} as const;
const templateMeta = {
  Invoices: { icon: ReceiptText, description: "Numbers, dates, totals, and payment status." },
  Expenses: { icon: WalletCards, description: "Amounts, categories, and supporting evidence." },
  Tasks: { icon: ClipboardCheck, description: "Due dates, estimates, and completion status." },
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
  return <div className="mt-8 space-y-9">
    {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-coral-strong">Quick start</p><h2 className="mt-1 font-bold text-ink">Begin with a familiar shape</h2></div><div className="stagger-children mt-4 grid gap-3 sm:grid-cols-3">
      {Object.keys(templates).map((template) => { const meta = templateMeta[template as keyof typeof templateMeta]; const Icon = meta.icon; return <button key={template} disabled={busy} onClick={(event) => create(event, template as keyof typeof templates)} className="hover-lift group rounded-2xl border bg-surface p-5 text-left disabled:opacity-50"><span className="grid size-10 place-items-center rounded-xl bg-coral-soft text-coral-strong transition group-hover:rotate-3"><Icon className="size-4.5" /></span><span className="mt-5 block font-bold text-ink">{template}</span><p className="mt-1.5 text-sm leading-5 text-muted">{meta.description}</p></button>; })}
    </div></section>
    <Card className="paper-grid overflow-hidden p-5 sm:p-6"><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.13em] text-coral-strong">Make it yours</p><h2 className="mt-1 font-bold text-ink">Create a custom collection</h2></div><form onSubmit={create} className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end"><label className="text-sm font-semibold text-ink">Collection name<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="Purchase orders" className="mt-1.5 h-11 w-full rounded-xl border bg-white px-3 font-normal" /></label><label className="text-sm font-semibold text-ink">Description <span className="font-normal text-muted">(optional)</span><input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} placeholder="What belongs here?" className="mt-1.5 h-11 w-full rounded-xl border bg-white px-3 font-normal" /></label><Button disabled={busy}><Plus className="size-4" />Create</Button></form></Card>
    <section><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-coral-strong">Workspace library</p><h2 className="mt-1 font-bold text-ink">Your collections</h2></div>{items.length ? <div className="stagger-children mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <Link key={item.id} href={`/collections/${item.id}`}><Card className="hover-lift group h-full p-5"><div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-ink text-white"><Layers3 className="size-4" /></span><ArrowRight className="size-4 text-muted transition group-hover:translate-x-1 group-hover:text-coral" /></div><h3 className="mt-5 font-bold text-ink">{item.name}</h3><p className="mt-1 min-h-10 text-sm leading-5 text-muted">{item.description || "A flexible home for related records."}</p><p className="mt-4 inline-flex rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-ink">{Number(item.recordCount)} record{Number(item.recordCount) === 1 ? "" : "s"}</p></Card></Link>)}</div> : <Card className="mt-4 grid min-h-52 place-items-center p-8 text-center"><div><Layers3 className="mx-auto size-7 text-muted/50" /><p className="mt-3 text-sm font-semibold text-ink">Your library is waiting</p><p className="mt-1 text-sm text-muted">Choose a starting point or shape something new.</p></div></Card>}</section>
  </div>;
}
