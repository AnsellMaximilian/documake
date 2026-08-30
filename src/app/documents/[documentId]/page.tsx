import { AppShell } from "@/components/app-shell";
import { DocumentViewer } from "@/components/document-viewer";
export default async function DocumentPage({ params }: PageProps<"/documents/[documentId]">) { const { documentId } = await params; return <AppShell><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10"><DocumentViewer documentId={documentId} /></div></AppShell>; }
