import { AppShell } from "@/components/app-shell";
import { CollectionsManager } from "@/components/collections-manager";
import { PageHeader } from "@/components/page-header";
export const metadata = { title: "Collections" };
export default function CollectionsPage() { return <AppShell><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10"><PageHeader eyebrow="Structured records" title="Collections" description="Create a record type, define its fields, and keep its table useful with or without an agent." /><CollectionsManager /></div></AppShell>; }
