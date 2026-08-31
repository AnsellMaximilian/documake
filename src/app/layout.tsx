import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "Documake", template: "%s · Documake" },
  description: "Turn source evidence into structured, reviewable records.",
  openGraph: { title: "Documake", description: "Structured records. Source evidence.", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Documake — Structured records. Source evidence." }] },
  twitter: { card: "summary_large_image", title: "Documake", description: "Structured records. Source evidence.", images: ["/og.png"] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full bg-background text-foreground">
        {clerkConfigured ? <ClerkProvider>{children}</ClerkProvider> : children}
      </body>
    </html>
  );
}
