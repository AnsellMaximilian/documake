import { put } from "@vercel/blob";
import { documents } from "@/db/schema";
import { DomainError } from "@/lib/auth/workspace";
import { api } from "@/lib/http";
import { listDocuments } from "@/lib/domain/service";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const maxSize = 10 * 1024 * 1024;
export function GET(request: Request) { const url = new URL(request.url); return api((ctx) => listDocuments(ctx, { limit: Number(url.searchParams.get("limit") ?? 50), unlinkedOnly: url.searchParams.get("unlinkedOnly") === "true" })); }
export async function POST(request: Request) {
  const form = await request.formData(); const files = form.getAll("files").filter((item): item is File => item instanceof File);
  return api(async (ctx) => {
    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN) throw new DomainError("Vercel Blob is not configured.", 503, "SERVICE_NOT_CONFIGURED");
    if (!files.length || files.length > 10) throw new DomainError("Upload between 1 and 10 files.", 422, "VALIDATION_ERROR");
    const created = [];
    for (const file of files) {
      if (!allowed.has(file.type)) throw new DomainError(`${file.name} is not a supported file type.`, 422, "VALIDATION_ERROR");
      if (file.size > maxSize) throw new DomainError(`${file.name} exceeds the 10 MB limit.`, 422, "VALIDATION_ERROR");
      const blob = await put(`workspaces/${ctx.workspaceId}/${file.name}`, file, { access: "private", addRandomSuffix: true });
      const [row] = await ctx.db.insert(documents).values({ workspaceId: ctx.workspaceId, originalFilename: file.name, blobPathname: blob.pathname, mimeType: file.type, sizeBytes: file.size }).returning(); created.push(row);
    }
    return created;
  });
}
