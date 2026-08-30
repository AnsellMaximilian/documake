import { api, json } from "@/lib/http";
import { deleteRecord, getRecord, updateRecord } from "@/lib/domain/service";
export async function GET(_: Request, { params }: RouteContext<"/api/records/[recordId]">) { const { recordId } = await params; return api((ctx) => getRecord(ctx, recordId)); }
export async function PATCH(request: Request, { params }: RouteContext<"/api/records/[recordId]">) { const [{ recordId }, body] = await Promise.all([params, json(request)]); return api((ctx) => updateRecord(ctx, recordId, body, { allowConfirmed: true })); }
export async function DELETE(_: Request, { params }: RouteContext<"/api/records/[recordId]">) { const { recordId } = await params; return api(async (ctx) => { await deleteRecord(ctx, recordId); return { deleted: true }; }); }
