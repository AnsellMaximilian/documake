"use client";

import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";

export function AuthControls() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <div className="h-9" aria-label="Loading account" />;
  }

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-3 px-2">
        <UserButton />
        <span className="text-xs font-semibold text-muted">Your workspace</span>
      </div>
    );
  }

  return (
    <div className="flex gap-2 lg:flex-col">
      <SignInButton mode="modal">
        <button className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white">
          Sign in
        </button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button className="w-full rounded-lg border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted">
          Create account
        </button>
      </SignUpButton>
    </div>
  );
}
