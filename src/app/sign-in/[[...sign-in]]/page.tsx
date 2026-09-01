import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/brand-mark";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && (await auth()).userId) redirect("/");
  return (
    <div className="paper-grid relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div className="absolute -left-24 -top-24 size-72 rounded-full bg-coral-soft blur-3xl" />
      <div className="relative z-10 flex flex-col items-center gap-7">
        <Link href="/" aria-label="Back to Documake"><BrandLockup /></Link>
        <SignIn fallbackRedirectUrl="/" signUpUrl="/sign-up" />
      </div>
    </div>
  );
}
