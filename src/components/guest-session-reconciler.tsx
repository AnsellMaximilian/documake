"use client";

import { useEffect, useRef } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";

/**
 * The landing page is rendered only after the server has confirmed there is no
 * authenticated session. If Clerk's browser client still reports one (for
 * example after an expired development-browser handshake), clear that stale
 * client state so the public sign-in and sign-up routes can render normally.
 */
export function GuestSessionReconciler() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const hasReconciled = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasReconciled.current) return;

    hasReconciled.current = true;
    void signOut({ redirectUrl: "/" }).catch(() => {
      hasReconciled.current = false;
    });
  }, [isLoaded, isSignedIn, signOut]);

  return null;
}
