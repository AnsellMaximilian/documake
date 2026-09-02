"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export function Modal({ open, onClose, title, description, children, maxWidth = "max-w-5xl" }: { open: boolean; onClose(): void; title: string; description?: string; children: React.ReactNode; maxWidth?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} onCancel={(event) => { event.preventDefault(); onClose(); }} onClose={() => { if (open) onClose(); }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} className={`m-auto max-h-[92vh] w-[calc(100%-2rem)] ${maxWidth} overflow-hidden rounded-[1.6rem] border border-ink/10 bg-surface p-0 text-foreground shadow-[0_35px_100px_rgba(40,36,81,.28)] backdrop:bg-ink/55 backdrop:backdrop-blur-[3px]`}>
    <div className="flex max-h-[92vh] flex-col">
      <header className="flex shrink-0 items-start justify-between gap-5 border-b border-ink/10 bg-surface/95 px-5 py-4 backdrop-blur sm:px-6 sm:py-5">
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-coral-strong">Create record</p><h2 id={titleId} className="mt-1 truncate text-xl font-bold tracking-[-0.025em] text-ink">{title}</h2>{description && <p id={descriptionId} className="mt-1 text-sm leading-5 text-muted">{description}</p>}</div>
        <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-xl border border-ink/10 bg-white text-muted transition hover:border-coral/35 hover:text-ink" aria-label="Close dialog"><X className="size-4" /></button>
      </header>
      <div className="min-h-0 overflow-y-auto">{children}</div>
    </div>
  </dialog>;
}
