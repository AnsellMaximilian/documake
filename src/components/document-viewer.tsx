"use client";
/* eslint-disable @next/next/no-img-element -- preserve full-resolution authenticated evidence previews */
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { Card } from "@/components/ui/card";
type Document = { id: string; originalFilename: string; mimeType: string; sizeBytes: number; createdAt: string };
export function DocumentViewer({ documentId }: { documentId: string }) {
  const [item, setItem] = useState<Document | null>(null); const [error, setError] = useState(""); useEffect(() => { clientApi<Document>(`/api/documents/${documentId}`).then(setItem).catch((e) => setError(e.message)); }, [documentId]);
  if (!item) return <Card className="p-6 text-sm text-muted">{error || "Loading document…"}</Card>;
  return <div className="animate-rise"><Link href="/inbox" className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-coral"><ArrowLeft className="size-4" />Back to inbox</Link><div className="mt-5 flex flex-wrap items-end justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-coral-strong"><span className="h-px w-5 bg-coral" />Source document</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-ink">{item.originalFilename}</h1><p className="mt-2 text-sm text-muted">{item.mimeType} · {(item.sizeBytes / 1024 / 1024).toFixed(1)} MB</p></div></div><Card className="mt-6 overflow-hidden border-ink/10 bg-ink/[.04]"><div className="paper-grid grid min-h-[70vh] place-items-center p-3 sm:p-6">{item.mimeType === "application/pdf" ? <iframe title={item.originalFilename} src={`/api/documents/${item.id}/content`} className="h-[78vh] w-full rounded-xl bg-white shadow-lg shadow-ink/10" /> : item.mimeType.startsWith("image/") ? <img src={`/api/documents/${item.id}/content`} alt={item.originalFilename} className="max-h-[82vh] max-w-full rounded-xl object-contain shadow-lg shadow-ink/10" /> : <FileText className="size-16 text-muted" />}</div></Card></div>;
}
