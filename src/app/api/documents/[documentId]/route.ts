import { del } from "@vercel/blob";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { api } from "@/lib/http";
import { getDocument } from "@/lib/domain/service";
export async function GET(_: Request, { params }: RouteContext<"/api/documents/[documentId]">) { const { documentId } = await params; return api(async (ctx) => { const doc = await getDocument(ctx, documentId); return { id: doc.id, originalFilename: doc.originalFilename, mimeType: doc.mimeType, sizeBytes: doc.sizeBytes, createdAt: doc.createdAt, viewPath: `/documents/${doc.id}` }; }); }
export async function DELETE(_: Request, { params }: RouteContext<"/api/documents/[documentId]">) { const { documentId } = await params; return api(async (ctx) => { const doc = await getDocument(ctx, documentId); await del(doc.blobPathname); await ctx.db.delete(documents).where(eq(documents.id, documentId)); return { deleted: true }; }); }
