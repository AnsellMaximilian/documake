import { SignIn } from "@clerk/nextjs";
import { BrandLockup } from "@/components/brand-mark";

export default function SignInPage() {
  return (
    <div className="paper-grid relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div className="absolute -left-24 -top-24 size-72 rounded-full bg-coral-soft blur-3xl" />
      <div className="relative z-10 flex flex-col items-center gap-7">
        <BrandLockup />
        <SignIn />
      </div>
    </div>
  );
}
