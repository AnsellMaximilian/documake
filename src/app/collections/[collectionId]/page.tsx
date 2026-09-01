import { AppShell } from "@/components/app-shell";
import { CollectionWorkspace } from "@/components/collection-workspace";
export default async function CollectionPage({ params, searchParams }: PageProps<"/collections/[collectionId]">) {
  const [{ collectionId }, query] = await Promise.all([params, searchParams]);
  const relatedField = typeof query.relatedField === "string" ? query.relatedField : undefined;
  const relatedRecord = typeof query.relatedRecord === "string" ? query.relatedRecord : undefined;
  const returnRecordId = typeof query.returnRecord === "string" ? query.returnRecord : undefined;
  const initialValues = relatedField && relatedRecord ? { [relatedField]: relatedRecord } : {};
  return <AppShell><div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-coral-strong"><span className="h-px w-5 bg-coral" />Collection workspace</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-ink">Records and structure</h1><p className="mt-2 text-sm text-muted">Browse the table or shape the fields behind it.</p><CollectionWorkspace collectionId={collectionId} initialValues={initialValues} returnRecordId={returnRecordId} /></div></AppShell>;
}
