import { get } from "@vercel/blob";
import { requireWorkspace } from "@/lib/auth/workspace";
import { getDocument } from "@/lib/domain/service";
export async function GET(_: Request, { params }: RouteContext<"/api/documents/[documentId]/content">) {
  try {
    const ctx = await requireWorkspace(); const { documentId } = await params; const document = await getDocument(ctx, documentId); const result = await get(document.blobPathname, { access: "private" });
    if (!result || result.statusCode !== 200) return new Response("Not found", { status: 404 });
    return new Response(result.stream, { headers: { "Content-Type": document.mimeType, "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.originalFilename)}`, "Cache-Control": "private, max-age=60", ETag: result.blob.etag } });
  } catch { return new Response("Unauthorized", { status: 401 }); }
}
