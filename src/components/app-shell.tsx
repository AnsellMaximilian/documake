import Link from "next/link";
import { Database, FileStack, Home, Layers3 } from "lucide-react";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { WebMcpTools } from "@/lib/webmcp/webmcp-tools";

const navigation = [
  { href: "/", label: "Home", icon: Home },
  { href: "/inbox", label: "Inbox", icon: FileStack },
  { href: "/collections", label: "Collections", icon: Layers3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return <div className="min-h-screen lg:grid lg:grid-cols-[232px_1fr]">
    <WebMcpTools />
    <aside className="border-b bg-surface px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
      <Link href="/" className="flex items-center gap-2.5 px-2 text-[15px] font-semibold tracking-tight">
        <span className="grid size-8 place-items-center rounded-lg bg-accent text-white"><Database className="size-4" /></span>Documake
      </Link>
      <nav className="mt-4 flex gap-1 lg:mt-9 lg:flex-col" aria-label="Main navigation">
        {navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-surface-muted hover:text-foreground"><Icon className="size-4" />{label}</Link>)}
      </nav>
      <div className="mt-6 hidden rounded-lg border bg-surface-muted p-3 lg:block">
        <p className="text-xs font-medium text-foreground">Human-first, agent-ready</p>
        <p className="mt-1 text-xs leading-5 text-muted">Everything here works manually. WebMCP adds a faster interface for your browser agent.</p>
      </div>
      {clerkConfigured && <div className="mt-5 hidden border-t pt-4 lg:block"><SignedIn><div className="flex items-center gap-3 px-2"><UserButton /><span className="text-xs font-medium text-muted">Workspace account</span></div></SignedIn><SignedOut><SignInButton mode="modal"><button className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white">Sign in to continue</button></SignInButton></SignedOut></div>}
    </aside>
    <main className="min-w-0">{children}</main>
  </div>;
}
