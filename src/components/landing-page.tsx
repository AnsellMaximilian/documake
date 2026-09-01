import Link from "next/link";
import { ArrowRight, BarChart3, Check, FileImage, Link2, Rows3, ShieldCheck, Sparkles } from "lucide-react";
import { BrandLockup, BrandMark } from "@/components/brand-mark";
import { BrandPattern } from "@/components/brand-pattern";
import { GuestSessionReconciler } from "@/components/guest-session-reconciler";

export function LandingPage({ authConfigured = true }: { authConfigured?: boolean }) {
  return <div className="min-h-screen overflow-hidden bg-background text-foreground">
    {authConfigured ? <GuestSessionReconciler /> : null}
    <header className="relative z-20 border-b border-ink/10 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-5 px-5 sm:px-8 lg:px-10">
        <Link href="/" aria-label="Documake home" className="rounded-xl"><BrandLockup /></Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-muted md:flex" aria-label="Public navigation">
          <a href="#how-it-works" className="transition hover:text-ink">How it works</a>
          <a href="#principles" className="transition hover:text-ink">Why Documake</a>
        </nav>
        <div className="flex items-center gap-2">
          {authConfigured ? <><Link href="/sign-in" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-ink transition hover:bg-white/70 sm:inline-flex">Sign in</Link><Link href="/sign-up" className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold text-white shadow-lg shadow-ink/15 transition hover:-translate-y-0.5 hover:bg-ink-soft">Get started <ArrowRight className="size-4" /></Link></> : <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">Setup required</span>}
        </div>
      </div>
    </header>

    <main>
      <section className="relative">
        <div className="absolute inset-x-0 top-0 -z-0 h-[38rem] bg-[radial-gradient(circle_at_75%_20%,rgba(242,103,72,.14),transparent_30rem)]" />
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:px-10 lg:py-24">
          <div className="animate-rise max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-coral-strong"><Sparkles className="size-3.5" /> Structure without losing the source</p>
            <h1 className="mt-6 text-5xl font-bold leading-[.98] tracking-[-0.055em] text-ink sm:text-6xl lg:text-[4.5rem]">Messy documents.<br /><span className="text-coral">Useful records.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">Build the record system your work actually needs. Keep every table, total, and relationship connected to the original evidence.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {authConfigured ? <><Link href="/sign-up" className="inline-flex h-12 items-center gap-2 rounded-xl bg-coral px-5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(242,103,72,.25)] transition hover:-translate-y-0.5 hover:bg-coral-strong">Create your workspace <ArrowRight className="size-4" /></Link><Link href="/sign-in" className="inline-flex h-12 items-center rounded-xl border border-ink/15 bg-white/60 px-5 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:bg-white">I already have an account</Link></> : <span className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">Configure Clerk to enable workspace access.</span>}
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-muted"><Check className="size-3.5 text-coral" /> Fully useful by hand. Faster with compatible browser agents.</p>
          </div>

          <div className="animate-rise relative mx-auto w-full max-w-2xl lg:pl-6">
            <div className="absolute -right-20 -top-16 size-64 rounded-full border-[38px] border-coral/10" />
            <div className="relative overflow-hidden rounded-[2rem] border border-ink/10 bg-surface p-3 shadow-[0_35px_90px_rgba(40,36,81,.16)] sm:p-5">
              <div className="paper-grid relative overflow-hidden rounded-[1.4rem] border bg-paper/60 p-4 sm:p-6">
                <BrandPattern className="absolute -right-24 -top-16 h-72 w-[28rem] text-coral opacity-20" />
                <div className="relative grid gap-4 sm:grid-cols-[.72fr_1.28fr]">
                  <div className="rotate-[-2deg] rounded-2xl border bg-white p-3 shadow-lg shadow-ink/10">
                    <div className="flex items-center justify-between border-b pb-2"><span className="text-[10px] font-bold uppercase tracking-wider text-muted">Source invoice</span><FileImage className="size-3.5 text-coral" /></div>
                    <div className="mt-3 space-y-2"><div className="h-2 w-2/3 rounded bg-ink/15" /><div className="h-2 w-1/2 rounded bg-ink/10" /><div className="mt-4 grid grid-cols-3 gap-1">{Array.from({ length: 9 }).map((_, index) => <div key={index} className={`h-7 rounded ${index === 7 ? "bg-coral/35" : "bg-paper"}`} />)}</div></div>
                    <div className="mt-4 flex justify-end"><div className="h-3 w-20 rounded bg-ink/70" /></div>
                  </div>
                  <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-coral-strong">Purchase records</p><p className="mt-1 text-sm font-bold text-ink">Evidence, now useful</p></div><span className="grid size-9 place-items-center rounded-xl bg-ink text-white"><BrandMark className="size-7" /></span></div>
                    <div className="mt-5 overflow-hidden rounded-xl border"><div className="grid grid-cols-[1fr_.65fr_.6fr] bg-paper px-3 py-2 text-[9px] font-bold uppercase text-muted"><span>Supplier</span><span>Date</span><span>Total</span></div>{[["Sari Pangan", "Sep 1", "1.27m"], ["Global Pantry", "Sep 1", "1.95m"], ["Karya Sejuk", "Aug 24", "1.65m"]].map((row) => <div key={row[0]} className="grid grid-cols-[1fr_.65fr_.6fr] border-t px-3 py-2.5 text-[10px] font-semibold text-ink"><span>{row[0]}</span><span className="text-muted">{row[1]}</span><span>{row[2]}</span></div>)}</div>
                    <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-ink p-3 text-white"><p className="text-[9px] uppercase tracking-wider text-white/55">Received</p><p className="mt-1 text-lg font-bold">4.18m</p></div><div className="rounded-xl bg-coral-soft p-3 text-ink"><p className="text-[9px] uppercase tracking-wider text-ink/55">Top product</p><p className="mt-1 text-lg font-bold">Rice</p></div></div>
                  </div>
                </div>
                <div className="relative mx-auto -mt-1 h-8 w-px border-l-2 border-dashed border-coral/50" />
                <div className="relative mx-auto flex w-fit items-center gap-2 rounded-full border border-coral/25 bg-white px-3 py-1.5 text-[10px] font-bold text-ink shadow-sm"><Link2 className="size-3 text-coral" /> Source stays attached</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-ink/10 bg-surface/65">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
          <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-strong">A simple loop</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-ink sm:text-4xl">From evidence to answers</h2><p className="mt-3 leading-7 text-muted">No rigid industry template. Shape the system around the information that matters to you.</p></div>
          <div className="stagger-children mt-10 grid gap-4 md:grid-cols-3">{[
            { step: "01", icon: FileImage, title: "Bring the source", copy: "Upload private images and PDFs before or after a structured record exists." },
            { step: "02", icon: Rows3, title: "Shape the structure", copy: "Create flexible collections, fields, relations, and reviewable draft records." },
            { step: "03", icon: BarChart3, title: "See what matters", copy: "Filter, group, total, and chart your records while keeping the evidence nearby." },
          ].map(({ step, icon: Icon, title, copy }) => <article key={step} className="hover-lift rounded-2xl border border-ink/10 bg-surface p-6"><div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-2xl bg-coral-soft text-coral-strong"><Icon className="size-5" /></span><span className="text-xs font-bold tracking-widest text-muted/60">{step}</span></div><h3 className="mt-6 text-lg font-bold text-ink">{title}</h3><p className="mt-2 text-sm leading-6 text-muted">{copy}</p></article>)}</div>
        </div>
      </section>

      <section id="principles" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-10 text-white sm:px-10 lg:grid lg:grid-cols-[1fr_.85fr] lg:gap-16 lg:px-14 lg:py-14">
          <BrandPattern className="absolute -right-16 -top-10 h-80 w-[32rem] text-coral opacity-30" />
          <div className="relative z-10"><p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-soft">Human control, agent acceleration</p><h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">The app remains useful without an agent.</h2><p className="mt-4 max-w-2xl leading-7 text-white/65">You can define schemas, enter records, attach documents, build relations, and inspect totals yourself. A compatible browser agent simply helps with the tedious parts.</p></div>
          <div className="relative z-10 mt-8 grid gap-3 sm:grid-cols-2 lg:mt-0 lg:grid-cols-1">{[
            [ShieldCheck, "Private source evidence", "Original files are served through authenticated access."],
            [Sparkles, "No embedded model", "Your external agent supplies interpretation when you choose to use one."],
          ].map(([Icon, title, copy]) => <div key={String(title)} className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur"><Icon className="size-5 text-coral" /><p className="mt-3 text-sm font-bold">{String(title)}</p><p className="mt-1 text-xs leading-5 text-white/55">{String(copy)}</p></div>)}</div>
        </div>
      </section>
    </main>

    <footer className="border-t border-ink/10"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-7 text-xs font-semibold text-muted sm:px-8 lg:px-10"><BrandLockup compact /><p>Structured records. Source evidence.</p></div></footer>
  </div>;
}
