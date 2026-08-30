import { ZodError } from "zod";
import { DomainError, requireWorkspace } from "@/lib/auth/workspace";

export async function api(handler: (context: Awaited<ReturnType<typeof requireWorkspace>>) => Promise<unknown>) {
  try { return Response.json({ data: await handler(await requireWorkspace()) }); }
  catch (error) {
    if (error instanceof DomainError) return Response.json({ error: { code: error.code, message: error.message, details: error.details } }, { status: error.status });
    if (error instanceof ZodError) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request.", details: error.flatten() } }, { status: 422 });
    console.error(error); return Response.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong." } }, { status: 500 });
  }
}

export async function json(request: Request) {
  try { return await request.json(); } catch { throw new DomainError("Request body must be valid JSON.", 400, "INVALID_JSON"); }
}
