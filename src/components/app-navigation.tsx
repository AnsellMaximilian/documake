"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileStack, Home, Layers3 } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Home", icon: Home, matches: (path: string) => path === "/" },
  { href: "/inbox", label: "Inbox", icon: FileStack, matches: (path: string) => path.startsWith("/inbox") || path.startsWith("/documents") },
  { href: "/collections", label: "Collections", icon: Layers3, matches: (path: string) => path.startsWith("/collections") || path.startsWith("/records") },
];

export function AppNavigation() {
  const pathname = usePathname();
  return <nav className="flex gap-1 lg:flex-col" aria-label="Main navigation">
    {navigation.map(({ href, label, icon: Icon, matches }) => {
      const active = matches(pathname);
      return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn(
        "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
        active ? "bg-ink text-white shadow-[0_8px_24px_rgba(39,34,79,0.18)]" : "text-muted hover:bg-white/70 hover:text-ink",
      )}>
        <Icon className={cn("size-4 transition-transform duration-200 group-hover:scale-110", active && "text-coral")} />
        <span>{label}</span>
        {active && <span className="absolute right-2 size-1.5 rounded-full bg-coral" />}
      </Link>;
    })}
  </nav>;
}
