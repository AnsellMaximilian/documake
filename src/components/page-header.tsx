export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return <header className="animate-rise flex flex-wrap items-end justify-between gap-4">
    <div>{eyebrow && <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-coral"><span className="h-px w-6 bg-coral" />{eyebrow}</p>}<h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-ink sm:text-4xl">{title}</h1>{description && <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-[15px]">{description}</p>}</div>{actions}
  </header>;
}
