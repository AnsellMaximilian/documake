import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { AppNavigation } from "@/components/app-navigation";
import { AuthControls } from "@/components/auth-controls";
import { BrandLockup } from "@/components/brand-mark";
import { WebMcpTools } from "@/lib/webmcp/webmcp-tools";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  if (clerkConfigured) await auth.protect({ unauthenticatedUrl: "/sign-in" });
  return <div className="min-h-screen lg:grid lg:grid-cols-[252px_1fr]">
    <WebMcpTools />
    <aside className="z-30 border-b bg-paper/95 px-4 py-3 backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
      <Link href="/" className="inline-flex rounded-xl px-1 py-1 transition-transform duration-200 hover:translate-x-0.5">
        <BrandLockup />
      </Link>
      <div className="mt-4 lg:mt-10"><AppNavigation /></div>
      <div className="mt-auto hidden rounded-2xl border border-ink/8 bg-white/60 p-4 lg:block">
        <span className="grid size-8 place-items-center rounded-xl bg-coral-soft text-coral-strong"><FileCheck2 className="size-4" /></span>
        <p className="mt-3 text-xs font-bold text-ink">Evidence stays close</p>
        <p className="mt-1 text-xs leading-5 text-muted">Every source can remain attached to the record it supports.</p>
      </div>
      {clerkConfigured && <div className="mt-3 border-t border-ink/8 pt-3 lg:mt-4"><AuthControls /></div>}
    </aside>
    <main className="min-w-0 overflow-hidden">{children}</main>
  </div>;
}
