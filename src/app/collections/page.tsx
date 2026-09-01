import { AppShell } from "@/components/app-shell";
import { CollectionsManager } from "@/components/collections-manager";
import { PageHeader } from "@/components/page-header";
export const metadata = { title: "Collections" };
export default function CollectionsPage() { return <AppShell><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10"><PageHeader eyebrow="Build your system" title="Collections" description="Give the information you care about a clear, flexible shape." /><CollectionsManager /></div></AppShell>; }
