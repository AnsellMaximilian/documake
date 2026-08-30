export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return <header className="flex flex-wrap items-end justify-between gap-4">
    <div>{eyebrow && <p className="text-sm font-medium text-accent">{eyebrow}</p>}<h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>}</div>{actions}
  </header>;
}
