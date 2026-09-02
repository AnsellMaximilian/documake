import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CollectionBlueprintBuilder } from "@/components/collection-blueprint-builder";
import { PageHeader } from "@/components/page-header";
import { getCollectionTemplate } from "@/lib/collections/templates";

export const metadata = { title: "Create collection" };

export default async function NewCollectionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const template = getCollectionTemplate(typeof query.template === "string" ? query.template : undefined);
  return <AppShell><div className="mx-auto max-w-[1450px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
    <PageHeader eyebrow="Collection builder" title={template ? `Review ${template.name}` : "Create a collection family"} description="Design the human workflow first. Fields and relationships remain fully usable whether or not a WebMCP agent is present." actions={<Link href="/collections" className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted transition hover:bg-surface-muted hover:text-ink"><ArrowLeft className="size-4" />Collections</Link>} />
    <CollectionBlueprintBuilder template={template} />
  </div></AppShell>;
}
