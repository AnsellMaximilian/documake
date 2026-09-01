import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/brand-mark";

export const metadata = { title: "Create account" };

export default async function SignUpPage() {
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && (await auth()).userId) redirect("/");
  return (
    <div className="paper-grid relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div className="absolute -right-24 -top-24 size-72 rounded-full bg-coral-soft blur-3xl" />
      <div className="relative z-10 flex flex-col items-center gap-7">
        <Link href="/" aria-label="Back to Documake"><BrandLockup /></Link>
        <SignUp fallbackRedirectUrl="/" signInUrl="/sign-in" />
      </div>
    </div>
  );
}
