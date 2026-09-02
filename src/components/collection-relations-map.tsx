"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Database, Network, Plus } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type RelationField = {
  id: string;
  key: string;
  label: string;
  type: string;
  config: Record<string, unknown>;
  relationTarget?: { id: string; name: string } | null;
};

type RelationSchema = {
  id: string;
  name: string;
  description: string | null;
  fields: RelationField[];
};

type CollectionSummary = { id: string; name: string; description?: string | null };
type RelationEdge = { id: string; sourceId: string; targetId: string; fieldLabel: string; direction: "outgoing" | "incoming" };
type Point = { x: number; y: number };

const center: Point = { x: 500, y: 260 };

function neighborPositions(count: number) {
  if (count === 1) return [{ x: 800, y: 260 }];
  if (count === 2) return [{ x: 210, y: 260 }, { x: 790, y: 260 }];
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    return { x: 500 + Math.cos(angle) * 330, y: 260 + Math.sin(angle) * 185 };
  });
}

function edgePath(edge: RelationEdge, positions: Map<string, Point>, currentId: string) {
  const source = positions.get(edge.sourceId) ?? center;
  const target = positions.get(edge.targetId) ?? center;
  if (edge.sourceId === edge.targetId) return `M ${center.x - 12} ${center.y - 42} C ${center.x - 150} ${center.y - 185}, ${center.x + 170} ${center.y - 185}, ${center.x + 18} ${center.y - 42}`;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const boundaryScale = (id: string) => {
    const halfWidth = id === currentId ? 120 : 104;
    const halfHeight = id === currentId ? 58 : 54;
    return Math.min(halfWidth / Math.max(Math.abs(dx), .001), halfHeight / Math.max(Math.abs(dy), .001));
  };
  const sourceScale = boundaryScale(edge.sourceId);
  const targetScale = boundaryScale(edge.targetId);
  const start = { x: source.x + dx * sourceScale, y: source.y + dy * sourceScale };
  const end = { x: target.x - dx * targetScale, y: target.y - dy * targetScale };
  const midX = (start.x + end.x) / 2;
  return `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
}

export function CollectionRelationsMap({ schema, collections, onOpenSchema }: { schema: RelationSchema; collections: CollectionSummary[]; onOpenSchema(): void }) {
  const [workspaceSchemas, setWorkspaceSchemas] = useState<RelationSchema[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const others = collections.filter((collection) => collection.id !== schema.id);
    Promise.allSettled(others.map((collection) => clientApi<RelationSchema>(`/api/collections/${collection.id}`)))
      .then((results) => {
        if (cancelled) return;
        setWorkspaceSchemas(results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [collections, schema.id]);

  const outgoing = useMemo<RelationEdge[]>(() => schema.fields
    .filter((field) => field.type === "relation" && field.config.targetCollectionId)
    .map((field) => ({ id: `out-${field.id}`, sourceId: schema.id, targetId: String(field.config.targetCollectionId), fieldLabel: field.label, direction: "outgoing" })), [schema]);

  const incoming = useMemo<RelationEdge[]>(() => workspaceSchemas.flatMap((source) => source.fields
    .filter((field) => field.type === "relation" && field.config.targetCollectionId === schema.id)
    .map((field) => ({ id: `in-${field.id}`, sourceId: source.id, targetId: schema.id, fieldLabel: field.label, direction: "incoming" as const }))), [schema.id, workspaceSchemas]);

  const edges = useMemo(() => [...outgoing, ...incoming], [incoming, outgoing]);
  const collectionById = useMemo(() => new Map<string, CollectionSummary>([
    ...collections.map((collection) => [collection.id, collection] as const),
    [schema.id, schema] as const,
  ]), [collections, schema]);
  const neighborIds = useMemo(() => [...new Set(edges.flatMap((edge) => [edge.sourceId, edge.targetId]).filter((id) => id !== schema.id))], [edges, schema.id]);
  const positions = useMemo(() => {
    const map = new Map<string, Point>([[schema.id, center]]);
    neighborPositions(neighborIds.length).forEach((point, index) => map.set(neighborIds[index], point));
    return map;
  }, [neighborIds, schema.id]);
  const nodes = useMemo(() => [schema.id, ...neighborIds], [neighborIds, schema.id]);
  const connectedFieldCount = edges.length;

  return <div className="mt-6 space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-strong">Collection map</p>
        <h2 className="mt-2 text-xl font-bold tracking-[-0.025em] text-ink">How {schema.name} connects</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">Lines follow relation fields. Arrowheads point from the collection holding the field to its target.</p>
      </div>
      <div className="flex items-center gap-2 rounded-full border bg-surface px-3 py-1.5 text-xs font-semibold text-muted shadow-sm">
        <Network className="size-3.5 text-coral" />
        {loading ? "Tracing workspace…" : `${connectedFieldCount} relation field${connectedFieldCount === 1 ? "" : "s"}`}
      </div>
    </div>

    <Card className="overflow-hidden border-ink/10 bg-[radial-gradient(circle_at_center,rgba(242,103,72,.10),transparent_18rem)]">
      <div className="flex items-center justify-between border-b border-ink/10 bg-surface/70 px-5 py-3 text-xs font-semibold text-muted">
        <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-coral" />Current collection</span>
        <span className="flex items-center gap-2"><span className="h-px w-7 bg-ink/35" />Points to</span>
      </div>
      <div className="overflow-x-auto">
        <div className="relative h-[520px] min-w-[780px] overflow-hidden paper-grid">
          <div className="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-coral/20" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-ink/10" />
          <svg viewBox="0 0 1000 520" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
            <defs>
              <marker id={`relation-arrow-${schema.id}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L7,3 z" fill="var(--coral)" />
              </marker>
            </defs>
            {edges.map((edge, index) => <path key={edge.id} d={edgePath(edge, positions, schema.id)} fill="none" stroke={edge.direction === "outgoing" ? "var(--coral)" : "var(--ink-soft)"} strokeOpacity={edge.direction === "outgoing" ? .78 : .45} strokeWidth="2.25" strokeDasharray={edge.direction === "incoming" ? "7 7" : undefined} markerEnd={`url(#relation-arrow-${schema.id})`} className="relation-line-drift" style={{ animationDelay: `${index * -0.8}s` }} />)}
          </svg>

          {nodes.map((collectionId, index) => {
            const collection = collectionById.get(collectionId);
            const point = positions.get(collectionId) ?? center;
            const isCurrent = collectionId === schema.id;
            const relationCount = edges.filter((edge) => edge.sourceId === collectionId || edge.targetId === collectionId).length;
            const className = `relation-node-float absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-4 shadow-[0_16px_35px_rgba(40,36,81,.13)] transition hover:-translate-y-[54%] ${isCurrent ? "w-60 border-ink bg-ink text-white" : "w-52 border-ink/10 bg-surface text-ink hover:border-coral/45"}`;
            const content = <><div className={`grid size-10 place-items-center rounded-xl ${isCurrent ? "bg-coral text-white" : "bg-coral-soft text-coral-strong"}`}><Database className="size-4.5" /></div><p className="mt-4 truncate text-sm font-bold">{collection?.name ?? "Unknown collection"}</p><p className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${isCurrent ? "text-white/55" : "text-muted"}`}>{isCurrent ? "You are here" : `${relationCount} connection${relationCount === 1 ? "" : "s"}`}</p></>;
            const style = { left: `${point.x / 10}%`, top: `${point.y / 5.2}%`, animationDelay: `${index * -0.75}s` };
            return isCurrent ? <div key={collectionId} className={className} style={style}>{content}</div> : <Link key={collectionId} href={`/collections/${collectionId}`} className={className} style={style} aria-label={`Open ${collection?.name ?? "related collection"}`}>{content}</Link>;
          })}

          {!loading && !edges.length && <div className="absolute inset-x-0 bottom-12 z-20 mx-auto max-w-md px-6 text-center"><p className="text-sm font-semibold text-ink">This collection is an island—for now.</p><p className="mt-1.5 text-xs leading-5 text-muted">Add a relation field to connect it to another collection. Incoming relations will appear here automatically.</p><Button type="button" size="sm" variant="secondary" onClick={onOpenSchema} className="mt-4"><Plus className="size-4" />Add a relation field</Button></div>}
        </div>
      </div>
    </Card>

    {!!edges.length && <div className="grid gap-4 lg:grid-cols-2">
      <RelationList title="Points to" icon={<ArrowUpRight className="size-4" />} empty="No outgoing relation fields." edges={outgoing} schema={schema} collectionById={collectionById} />
      <RelationList title="Referenced by" icon={<ArrowDownLeft className="size-4" />} empty="No other collections point here." edges={incoming} schema={schema} collectionById={collectionById} />
    </div>}
  </div>;
}

function RelationList({ title, icon, empty, edges, schema, collectionById }: { title: string; icon: React.ReactNode; empty: string; edges: RelationEdge[]; schema: RelationSchema; collectionById: Map<string, CollectionSummary> }) {
  return <Card className="overflow-hidden">
    <div className="flex items-center justify-between border-b px-5 py-4"><h3 className="flex items-center gap-2 text-sm font-bold text-ink"><span className="text-coral">{icon}</span>{title}</h3><span className="rounded-full bg-paper px-2 py-1 text-[11px] font-bold text-muted">{edges.length}</span></div>
    <div className="divide-y">{edges.map((edge) => {
      const neighborId = edge.direction === "outgoing" ? edge.targetId : edge.sourceId;
      const neighbor = collectionById.get(neighborId);
      return <Link key={edge.id} href={`/collections/${neighborId}`} className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-surface-muted/60"><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink group-hover:text-coral-strong">{edge.fieldLabel}</p><p className="mt-1 truncate text-xs text-muted">{edge.direction === "outgoing" ? `${schema.name} → ${neighbor?.name ?? "Unknown"}` : `${neighbor?.name ?? "Unknown"} → ${schema.name}`}</p></div><ArrowUpRight className="size-4 shrink-0 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-coral" /></Link>;
    })}{!edges.length && <p className="px-5 py-6 text-sm text-muted">{empty}</p>}</div>
  </Card>;
}
