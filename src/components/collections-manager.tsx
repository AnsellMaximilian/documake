"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ClipboardCheck, Layers3, Plus, ReceiptText, WalletCards } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { Card } from "@/components/ui/card";
import { collectionTemplates, type CollectionBlueprintNode } from "@/lib/collections/templates";

type Collection = { id: string; name: string; description: string | null; recordCount: number };

const templateIcons = {
  invoices: ReceiptText,
  expenses: WalletCards,
  projects: ClipboardCheck,
} as const;

export function CollectionsManager() {
  const [items, setItems] = useState<Collection[]>([]);
  const [error, setError] = useState("");
  const load = () => clientApi<Collection[]>("/api/collections").then(setItems).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load collections."));
  useEffect(() => { load(); const refresh = () => load(); window.addEventListener("documake:data-changed", refresh); return () => window.removeEventListener("documake:data-changed", refresh); }, []);

  return <div className="mt-8 space-y-9">
    {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-coral-strong">Quick start</p><h2 className="mt-1 font-bold text-ink">Begin with a complete structure</h2><p className="mt-1 text-sm text-muted">Review every field and relationship before anything is created.</p></div><Link href="/collections/new" className="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:bg-surface-muted"><Plus className="size-4" />Start blank</Link></div>
      <div className="stagger-children mt-4 grid gap-3 lg:grid-cols-3">
        {collectionTemplates.map((template) => {
          const Icon = templateIcons[template.id as keyof typeof templateIcons] ?? Layers3;
          const collectionCount = countNodes(template.root);
          return <Link key={template.id} href={`/collections/new?template=${template.id}`} className="hover-lift group rounded-2xl border bg-surface p-5 text-left">
            <div className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl bg-coral-soft text-coral-strong transition group-hover:rotate-3"><Icon className="size-4.5" /></span><span className="rounded-full bg-paper px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">{collectionCount} collection{collectionCount === 1 ? "" : "s"}</span></div>
            <span className="mt-5 block font-bold text-ink">{template.name}</span><p className="mt-1.5 text-sm leading-5 text-muted">{template.shortDescription}</p><span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-coral-strong">Review template <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
          </Link>;
        })}
      </div>
    </section>
    <Card className="paper-grid flex flex-col gap-4 overflow-hidden p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-coral-strong">Make it yours</p><h2 className="mt-1 font-bold text-ink">Design a collection family</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted">Start with one collection, add its fields, then optionally nest child collections. Each child receives a real relation back to its parent.</p></div><Link href="/collections/new" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(255,104,71,0.22)] transition hover:-translate-y-0.5 hover:bg-accent-strong"><Plus className="size-4" />Create structure</Link></Card>
    <section><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-coral-strong">Workspace library</p><h2 className="mt-1 font-bold text-ink">Your collections</h2></div>{items.length ? <div className="stagger-children mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <Link key={item.id} href={`/collections/${item.id}`}><Card className="hover-lift group h-full p-5"><div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-ink text-white"><Layers3 className="size-4" /></span><ArrowRight className="size-4 text-muted transition group-hover:translate-x-1 group-hover:text-coral" /></div><h3 className="mt-5 font-bold text-ink">{item.name}</h3><p className="mt-1 min-h-10 text-sm leading-5 text-muted">{item.description || "A flexible home for related records."}</p><p className="mt-4 inline-flex rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-ink">{Number(item.recordCount)} record{Number(item.recordCount) === 1 ? "" : "s"}</p></Card></Link>)}</div> : <Card className="mt-4 grid min-h-52 place-items-center p-8 text-center"><div><Layers3 className="mx-auto size-7 text-muted/50" /><p className="mt-3 text-sm font-semibold text-ink">Your library is waiting</p><p className="mt-1 text-sm text-muted">Choose a starting point or shape something new.</p></div></Card>}</section>
  </div>;
}

function countNodes(node: CollectionBlueprintNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}
