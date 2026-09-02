import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
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
      <body className="min-h-full bg-background text-foreground selection:bg-coral-soft selection:text-ink">
        {clerkConfigured ? (
          <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/"
            signUpFallbackRedirectUrl="/"
          >
            {children}
          </ClerkProvider>
        ) : children}
      </body>
    </html>
  );
}
