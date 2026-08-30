import { api, json } from "@/lib/http";
import { deleteField, updateField } from "@/lib/domain/service";
export async function PATCH(request: Request, { params }: RouteContext<"/api/fields/[fieldId]">) { const [{ fieldId }, body] = await Promise.all([params, json(request)]); return api((ctx) => updateField(ctx, fieldId, body)); }
export async function DELETE(_: Request, { params }: RouteContext<"/api/fields/[fieldId]">) { const { fieldId } = await params; return api(async (ctx) => { await deleteField(ctx, fieldId); return { deleted: true }; }); }
