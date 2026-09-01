import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({ className, priority = false }: { className?: string; priority?: boolean }) {
  return <span className={cn("relative block shrink-0 overflow-hidden", className)} aria-hidden="true">
    <Image src="/brand/documake-mark.png" alt="" fill sizes="64px" priority={priority} className="object-contain" />
  </span>;
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return <span className="flex items-center gap-3">
    <BrandMark className={compact ? "size-9" : "size-11"} priority />
    <span className="min-w-0">
      <span className="block text-[17px] font-bold leading-none tracking-[-0.035em] text-ink">Documake</span>
      {!compact && <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Source to structure</span>}
    </span>
  </span>;
}
