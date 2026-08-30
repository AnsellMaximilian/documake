import { AppShell } from "@/components/app-shell";
import { RecordDetail } from "@/components/record-detail";
export default async function RecordPage({ params }: PageProps<"/records/[recordId]">) { const { recordId } = await params; return <AppShell><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10"><RecordDetail recordId={recordId} /></div></AppShell>; }
