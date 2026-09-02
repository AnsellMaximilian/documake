"use client";
/* eslint-disable @next/next/no-img-element -- authenticated private Blob thumbnails are rendered directly */

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ExternalLink, FileImage, FileText, Paperclip, Search } from "lucide-react";

export type SourceDocumentOption = {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  linkCount: number;
};

export function SourceDocumentPicker({ documents, selectedIds, onChange }: { documents: SourceDocumentOption[]; selectedIds: string[]; onChange(ids: string[]): void }) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visible = useMemo(() => documents.filter((document) => document.originalFilename.toLowerCase().includes(query.trim().toLowerCase())), [documents, query]);

  function toggle(documentId: string) {
    onChange(selected.has(documentId) ? selectedIds.filter((id) => id !== documentId) : [...selectedIds, documentId]);
  }

  if (!documents.length) return <section className="mt-6 rounded-2xl border border-dashed border-ink/20 bg-paper/45 p-6 text-center">
    <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-surface text-coral shadow-sm"><FileImage className="size-5" /></span>
    <h3 className="mt-3 text-sm font-bold text-ink">No source documents yet</h3>
    <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted">Upload an image or PDF first if this record should retain its original evidence.</p>
    <Link href="/inbox" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-coral-strong hover:text-coral">Open the inbox <ExternalLink className="size-3.5" /></Link>
  </section>;

  return <section className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-surface-muted/25">
    <div className="flex flex-col gap-4 border-b border-ink/10 bg-surface/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-coral-soft text-coral-strong"><Paperclip className="size-4.5" /></span>
        <div><h3 className="text-sm font-bold text-ink">Source evidence</h3><p className="mt-1 text-xs leading-5 text-muted">Choose the originals that support this record. You can attach more than one.</p></div>
      </div>
      <Link href="/inbox" className="inline-flex shrink-0 items-center gap-1.5 self-start text-xs font-bold text-coral-strong transition hover:text-coral sm:self-auto">Manage inbox <ExternalLink className="size-3.5" /></Link>
    </div>

    <div className="border-b border-ink/10 px-4 py-3">
      <label className="flex h-10 items-center gap-2 rounded-xl border bg-white px-3 text-muted shadow-sm focus-within:border-coral focus-within:ring-3 focus-within:ring-coral/10">
        <Search className="size-4 shrink-0" />
        <span className="sr-only">Find a source document</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a source by filename…" className="w-full border-0 bg-transparent text-sm text-ink shadow-none outline-none focus:shadow-none" />
        {!!query && <button type="button" onClick={() => setQuery("")} className="text-xs font-semibold text-muted hover:text-ink">Clear</button>}
      </label>
    </div>

    <div className="grid max-h-[22rem] gap-3 overflow-y-auto p-4 lg:grid-cols-2">
      {visible.map((document) => {
        const isSelected = selected.has(document.id);
        const isImage = document.mimeType.startsWith("image/");
        const kind = document.mimeType === "application/pdf" ? "PDF" : "Image";
        return <article key={document.id} className={`overflow-hidden rounded-2xl border bg-surface transition ${isSelected ? "border-coral shadow-[0_0_0_3px_rgba(242,103,72,.11)]" : "border-ink/10 hover:border-coral/35 hover:shadow-sm"}`}>
          <button type="button" aria-pressed={isSelected} onClick={() => toggle(document.id)} className="flex w-full items-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-coral/20">
            <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-paper text-ink/30">
              {isImage ? <img src={`/api/documents/${document.id}/content`} alt="" className="size-full object-cover" /> : <FileText className="size-7" />}
              <span className="absolute bottom-1 left-1 rounded-md bg-ink/85 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">{kind}</span>
            </span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-ink">{document.originalFilename}</span><span className="mt-1 block text-[11px] leading-4 text-muted">{formatSize(document.sizeBytes)} · {Number(document.linkCount) ? `${document.linkCount} existing link${Number(document.linkCount) === 1 ? "" : "s"}` : "not linked yet"}</span><span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted/70">Added {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(document.createdAt))}</span></span>
            <span className={`grid size-6 shrink-0 place-items-center rounded-full border transition ${isSelected ? "border-coral bg-coral text-white" : "border-ink/20 bg-white text-transparent"}`}><Check className="size-3.5" /></span>
          </button>
          <div className={`flex items-center justify-between border-t px-3 py-2 text-[11px] ${isSelected ? "border-coral/20 bg-coral-soft/35" : "border-ink/10 bg-paper/35"}`}><span className={`font-bold ${isSelected ? "text-coral-strong" : "text-muted"}`}>{isSelected ? "Attached to this record" : "Click to attach"}</span><Link href={`/documents/${document.id}`} target="_blank" className="inline-flex items-center gap-1 font-semibold text-muted hover:text-coral">Preview <ExternalLink className="size-3" /></Link></div>
        </article>;
      })}
      {!visible.length && <div className="col-span-full grid min-h-32 place-items-center text-center"><div><Search className="mx-auto size-5 text-muted/40" /><p className="mt-2 text-sm font-semibold text-ink">No matching sources</p><p className="mt-1 text-xs text-muted">Try a different part of the filename.</p></div></div>}
    </div>

    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 bg-surface px-4 py-3 text-xs">
      <span className={`font-bold ${selectedIds.length ? "text-coral-strong" : "text-muted"}`}>{selectedIds.length ? `${selectedIds.length} source${selectedIds.length === 1 ? "" : "s"} selected` : "No source selected"}</span>
      {!!selectedIds.length && <button type="button" onClick={() => onChange([])} className="font-semibold text-muted hover:text-ink">Clear selection</button>}
    </div>
  </section>;
}

function formatSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}
