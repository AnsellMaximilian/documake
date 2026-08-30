import Link from "next/link";
import { ArrowRight, FileText, Layers3, Rows3, Settings2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { and, count, desc, eq } from "drizzle-orm";
import { collections, documents, records } from "@/db/schema";
import { requireWorkspace } from "@/lib/auth/workspace";
import { listCollections, listDocuments } from "@/lib/domain/service";

const servicesReady = Boolean(process.env.DATABASE_URL && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
export const dynamic = "force-dynamic";

async function loadHome() {
  if (!servicesReady) return { collections: 0, records: 0, documentCount: 0, documents: [] as Awaited<ReturnType<typeof listDocuments>>, recentRecords: [] as { id: string; values: Record<string, unknown>; collectionName: string }[] };
  try {
    const ctx = await requireWorkspace();
    const [collectionRows, confirmed, documentTotal, documentRows, recentRecords] = await Promise.all([
      listCollections(ctx),
      ctx.db.select({ value: count(records.id) }).from(records).innerJoin(collections, eq(records.collectionId, collections.id)).where(and(eq(collections.workspaceId, ctx.workspaceId), eq(records.status, "confirmed"))),
      ctx.db.select({ value: count(documents.id) }).from(documents).where(eq(documents.workspaceId, ctx.workspaceId)),
      listDocuments(ctx, { limit: 5 }),
      ctx.db.select({ id: records.id, values: records.values, collectionName: collections.name }).from(records).innerJoin(collections, eq(records.collectionId, collections.id)).where(eq(collections.workspaceId, ctx.workspaceId)).orderBy(desc(records.updatedAt)).limit(5),
    ]);
    return { collections: collectionRows.length, records: Number(confirmed[0]?.value ?? 0), documentCount: Number(documentTotal[0]?.value ?? 0), documents: documentRows, recentRecords };
  } catch { return { collections: 0, records: 0, documentCount: 0, documents: [], recentRecords: [] }; }
}

export default async function HomePage() {
  const home = await loadHome();
  return <AppShell>
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-accent">Workspace overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Your records, backed by evidence</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Define the structure you care about, then keep every record connected to its original source.</p>
        </div>
        <Link href="/collections" className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong">New collection <ArrowRight className="size-4" /></Link>
      </header>
      {!servicesReady && <Card className="mt-8 flex gap-3 border-amber-200 bg-amber-50 p-4 text-amber-950">
        <Settings2 className="mt-0.5 size-5 shrink-0 text-warning" />
        <div><p className="text-sm font-semibold">Finish local setup to make this workspace live</p><p className="mt-1 text-sm leading-6 text-amber-800">Copy <code className="rounded bg-amber-100 px-1.5 py-0.5">.env.example</code> to <code className="rounded bg-amber-100 px-1.5 py-0.5">.env.local</code> and add Neon and Clerk credentials. Blob credentials are only needed when uploading source evidence.</p></div>
      </Card>}
      <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="Workspace statistics">
        {[
          ["Collections", String(home.collections), Layers3, "Record types you define"],
          ["Confirmed records", String(home.records), Rows3, "Ready to use"],
          ["Source documents", String(home.documentCount), FileText, "Private evidence files"],
        ].map(([label, value, Icon, hint]) => <Card key={String(label)} className="p-5">
          <div className="flex items-start justify-between"><p className="text-sm font-medium text-muted">{String(label)}</p><Icon className="size-4 text-accent" /></div>
          <p className="mt-4 text-3xl font-semibold tracking-tight">{String(value)}</p><p className="mt-1 text-xs text-muted">{String(hint)}</p>
        </Card>)}
      </section>
      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card className="min-h-72 p-6"><h2 className="font-semibold">Recent records</h2>{home.recentRecords.length ? <div className="mt-4 divide-y">{home.recentRecords.map((record) => <Link key={record.id} href={`/records/${record.id}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-accent"><div className="min-w-0"><p className="truncate font-medium">{String(Object.values(record.values).find((value) => typeof value === "string") ?? "Untitled record")}</p><p className="mt-0.5 text-xs text-muted">{record.collectionName}</p></div><ArrowRight className="size-4 shrink-0" /></Link>)}</div> : <div className="grid min-h-52 place-items-center text-center"><div><Rows3 className="mx-auto size-7 text-muted/60" /><p className="mt-3 text-sm font-medium">No records yet</p><p className="mt-1 max-w-xs text-sm leading-6 text-muted">Create a collection first, then add records manually or through WebMCP.</p></div></div>}</Card>
        <Card className="min-h-72 p-6"><h2 className="font-semibold">Recent source documents</h2>{home.documents.length ? <div className="mt-4 divide-y">{home.documents.map((document) => <Link key={document.id} href={`/documents/${document.id}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-accent"><div className="min-w-0"><p className="truncate font-medium">{document.originalFilename}</p><p className="mt-0.5 text-xs text-muted">{Number(document.linkCount) ? `${document.linkCount} record links` : "Unlinked"}</p></div><ArrowRight className="size-4 shrink-0" /></Link>)}</div> : <div className="grid min-h-52 place-items-center text-center"><div><FileText className="mx-auto size-7 text-muted/60" /><p className="mt-3 text-sm font-medium">Your inbox is clear</p><p className="mt-1 max-w-xs text-sm leading-6 text-muted">Upload a JPEG, PNG, WebP, or PDF. Files remain private and can be linked to records.</p><Link href="/inbox" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-strong">Open inbox <ArrowRight className="size-3.5" /></Link></div></div>}</Card>
      </section>
    </div>
  </AppShell>;
}
