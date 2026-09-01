import Link from "next/link";
import { ArrowRight, CircleCheck, FilePlus2, FileText, Layers3, Rows3, Sparkle } from "lucide-react";
import { and, count, desc, eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { BrandMark } from "@/components/brand-mark";
import { BrandPattern } from "@/components/brand-pattern";
import { Card } from "@/components/ui/card";
import { collections, documents, records } from "@/db/schema";
import { requireWorkspace } from "@/lib/auth/workspace";
import { listCollections, listDocuments } from "@/lib/domain/service";

const servicesReady = Boolean(process.env.DATABASE_URL && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
export const dynamic = "force-dynamic";

async function loadHome() {
  const empty = { collections: 0, records: 0, drafts: 0, documentCount: 0, documents: [] as Awaited<ReturnType<typeof listDocuments>>, recentRecords: [] as { id: string; values: Record<string, unknown>; collectionName: string; status: "draft" | "confirmed" }[] };
  if (!servicesReady) return empty;
  try {
    const ctx = await requireWorkspace();
    const [collectionRows, confirmed, draftRows, documentTotal, documentRows, recentRecords] = await Promise.all([
      listCollections(ctx),
      ctx.db.select({ value: count(records.id) }).from(records).innerJoin(collections, eq(records.collectionId, collections.id)).where(and(eq(collections.workspaceId, ctx.workspaceId), eq(records.status, "confirmed"))),
      ctx.db.select({ value: count(records.id) }).from(records).innerJoin(collections, eq(records.collectionId, collections.id)).where(and(eq(collections.workspaceId, ctx.workspaceId), eq(records.status, "draft"))),
      ctx.db.select({ value: count(documents.id) }).from(documents).where(eq(documents.workspaceId, ctx.workspaceId)),
      listDocuments(ctx, { limit: 5 }),
      ctx.db.select({ id: records.id, values: records.values, collectionName: collections.name, status: records.status }).from(records).innerJoin(collections, eq(records.collectionId, collections.id)).where(eq(collections.workspaceId, ctx.workspaceId)).orderBy(desc(records.updatedAt)).limit(5),
    ]);
    return { collections: collectionRows.length, records: Number(confirmed[0]?.value ?? 0), drafts: Number(draftRows[0]?.value ?? 0), documentCount: Number(documentTotal[0]?.value ?? 0), documents: documentRows, recentRecords };
  } catch { return empty; }
}

function displayName(values: Record<string, unknown>) {
  return String(Object.values(values).find((value) => typeof value === "string" && value.trim()) ?? "Untitled record");
}

export default async function HomePage() {
  const home = await loadHome();
  const stats = [
    { label: "Collections", value: home.collections, icon: Layers3, hint: "Structures you have shaped" },
    { label: "Confirmed", value: home.records, icon: CircleCheck, hint: "Records ready to use" },
    { label: "Drafts", value: home.drafts, icon: Rows3, hint: "Waiting for a final check" },
    { label: "Sources", value: home.documentCount, icon: FileText, hint: "Private evidence files" },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
        <section className="animate-rise relative overflow-hidden rounded-[2rem] bg-ink px-6 py-8 text-white shadow-[0_28px_70px_rgba(40,36,81,.2)] sm:px-9 sm:py-10 lg:min-h-80 lg:px-12">
          <BrandPattern className="absolute -right-12 -top-2 h-72 w-[29rem] text-coral max-md:opacity-30" />
          <div className="absolute -bottom-16 right-36 size-44 rounded-full border-[28px] border-white/5" />
          <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1fr_15rem]">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-coral-soft"><Sparkle className="size-3.5" /> Your workspace</p>
              <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-[-0.045em] sm:text-5xl lg:text-[3.5rem]">Make sense of<br /><span className="text-coral">the messy stuff.</span></h1>
              <p className="mt-5 max-w-xl text-sm leading-6 text-white/70 sm:text-base">Shape real-world documents into useful records, without losing sight of the source they came from.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/inbox" className="inline-flex h-11 items-center gap-2 rounded-xl bg-coral px-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-coral-strong"><FilePlus2 className="size-4" /> Add source</Link>
                <Link href="/collections" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/15">New collection <ArrowRight className="size-4" /></Link>
              </div>
            </div>
            <div className="animate-drift relative mx-auto hidden size-48 place-items-center rounded-[2.5rem] border border-white/15 bg-white/10 shadow-2xl backdrop-blur-sm lg:grid">
              <div className="absolute -right-3 -top-3 size-9 rounded-xl bg-coral" />
              <BrandMark className="size-36" priority />
            </div>
          </div>
        </section>

        {!servicesReady && <Card className="mt-6 border-amber-200 bg-amber-50 p-4 text-amber-950"><p className="text-sm font-semibold">Connect your workspace</p><p className="mt-1 text-sm leading-6 text-amber-800">Add your Neon and Clerk credentials to <code className="rounded bg-amber-100 px-1.5 py-0.5">.env.local</code>. Blob credentials are only needed for source uploads.</p></Card>}

        <section className="stagger-children mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Workspace statistics">
          {stats.map(({ label, value, icon: Icon, hint }) => <Card key={label} className="hover-lift p-5">
            <div className="flex items-start justify-between"><p className="text-xs font-bold uppercase tracking-[0.13em] text-muted">{label}</p><span className="grid size-9 place-items-center rounded-xl bg-coral-soft text-coral-strong"><Icon className="size-4" /></span></div>
            <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-ink">{value}</p><p className="mt-1 text-xs text-muted">{hint}</p>
          </Card>)}
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <Card className="min-h-72 overflow-hidden p-0">
            <div className="flex items-center justify-between border-b px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-coral-strong">Keep moving</p><h2 className="mt-1 font-bold text-ink">Recent records</h2></div><Link href="/collections" className="text-sm font-semibold text-ink transition hover:text-coral">View all</Link></div>
            {home.recentRecords.length ? <div className="divide-y px-6">{home.recentRecords.map((record) => <Link key={record.id} href={`/records/${record.id}`} className="group flex items-center justify-between gap-3 py-4 text-sm"><div className="min-w-0"><p className="truncate font-semibold text-ink group-hover:text-coral">{displayName(record.values)}</p><p className="mt-1 flex items-center gap-2 text-xs text-muted"><span>{record.collectionName}</span><span className={`rounded-full px-2 py-0.5 font-semibold ${record.status === "draft" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{record.status}</span></p></div><ArrowRight className="size-4 shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-coral" /></Link>)}</div> : <div className="grid min-h-56 place-items-center px-6 text-center"><div><Rows3 className="mx-auto size-7 text-muted/50" /><p className="mt-3 text-sm font-semibold text-ink">A clean slate</p><p className="mt-1 max-w-xs text-sm leading-6 text-muted">Create a collection, then add your first structured record.</p></div></div>}
          </Card>

          <Card className="min-h-72 overflow-hidden p-0">
            <div className="flex items-center justify-between border-b px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-coral-strong">Source shelf</p><h2 className="mt-1 font-bold text-ink">Recent documents</h2></div><Link href="/inbox" className="text-sm font-semibold text-ink transition hover:text-coral">Open inbox</Link></div>
            {home.documents.length ? <div className="divide-y px-6">{home.documents.map((document) => <Link key={document.id} href={`/documents/${document.id}`} className="group flex items-center gap-3 py-4 text-sm"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper text-ink"><FileText className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate font-semibold text-ink group-hover:text-coral">{document.originalFilename}</p><p className="mt-0.5 text-xs text-muted">{Number(document.linkCount) ? `${document.linkCount} record link${Number(document.linkCount) === 1 ? "" : "s"}` : "Ready to link"}</p></div><ArrowRight className="size-4 text-muted transition group-hover:translate-x-1 group-hover:text-coral" /></Link>)}</div> : <div className="grid min-h-56 place-items-center px-6 text-center"><div><FileText className="mx-auto size-7 text-muted/50" /><p className="mt-3 text-sm font-semibold text-ink">Nothing on the shelf yet</p><p className="mt-1 max-w-xs text-sm leading-6 text-muted">Upload an image or PDF to keep its source close.</p></div></div>}
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
