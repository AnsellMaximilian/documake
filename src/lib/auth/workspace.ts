import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { workspaceMembers, workspaces } from "@/db/schema";

export class DomainError extends Error {
  constructor(message: string, public status = 400, public code = "DOMAIN_ERROR", public details?: unknown) { super(message); }
}

export type WorkspaceContext = { db: ReturnType<typeof getDb>; userId: string; workspaceId: string };

export async function requireWorkspace(): Promise<WorkspaceContext> {
  if (!process.env.DATABASE_URL) throw new DomainError("DATABASE_URL is not configured.", 503, "SERVICE_NOT_CONFIGURED");
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) throw new DomainError("Clerk is not configured.", 503, "SERVICE_NOT_CONFIGURED");
  const { userId } = await auth();
  if (!userId) throw new DomainError("Authentication is required.", 401, "UNAUTHENTICATED");
  const db = getDb();
  const [membership] = await db.select().from(workspaceMembers).where(eq(workspaceMembers.clerkUserId, userId)).limit(1);
  if (membership) return { db, userId, workspaceId: membership.workspaceId };

  const [workspace] = await db.insert(workspaces).values({ name: "My workspace" }).returning();
  await db.insert(workspaceMembers).values({ workspaceId: workspace.id, clerkUserId: userId, role: "owner" });
  return { db, userId, workspaceId: workspace.id };
}

export function assertWorkspaceBoundary(actualWorkspaceId: string, expectedWorkspaceId: string) {
  if (actualWorkspaceId !== expectedWorkspaceId) throw new DomainError("Resource not found.", 404, "NOT_FOUND");
}
