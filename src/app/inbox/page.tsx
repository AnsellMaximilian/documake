import { AppShell } from "@/components/app-shell";
import { InboxManager } from "@/components/inbox-manager";
import { PageHeader } from "@/components/page-header";
export const metadata = { title: "Inbox" };
export default function InboxPage() { return <AppShell><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10"><PageHeader eyebrow="Unstructured sources" title="Document inbox" description="Private source files live here until you connect them to structured records. Keep the original evidence close and inspectable." /><InboxManager /></div></AppShell>; }
