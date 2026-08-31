import { AppShell } from "@/components/app-shell";
import { CollectionWorkspace } from "@/components/collection-workspace";
export default async function CollectionPage({ params, searchParams }: PageProps<"/collections/[collectionId]">) {
  const [{ collectionId }, query] = await Promise.all([params, searchParams]);
  const relatedField = typeof query.relatedField === "string" ? query.relatedField : undefined;
  const relatedRecord = typeof query.relatedRecord === "string" ? query.relatedRecord : undefined;
  const returnRecordId = typeof query.returnRecord === "string" ? query.returnRecord : undefined;
  const initialValues = relatedField && relatedRecord ? { [relatedField]: relatedRecord } : {};
  return <AppShell><div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10"><p className="text-sm font-medium text-accent">Collection</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Records and schema</h1><p className="mt-2 text-sm text-muted">Manage the table and its structure from the same surface.</p><CollectionWorkspace collectionId={collectionId} initialValues={initialValues} returnRecordId={returnRecordId} /></div></AppShell>;
}
