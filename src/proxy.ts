import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const configured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
const withClerk = configured ? clerkMiddleware() : null;

export default function proxy(request: NextRequest, event: Parameters<NonNullable<typeof withClerk>>[1]) {
  return withClerk ? withClerk(request, event) : NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|webp|ico|woff2?|ttf|map)).*)", "/(api|trpc)(.*)", "/__clerk/:path*"],
};
