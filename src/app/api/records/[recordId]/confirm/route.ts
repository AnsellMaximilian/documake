import { api } from "@/lib/http";
import { confirmRecord } from "@/lib/domain/service";
export async function POST(_: Request, { params }: RouteContext<"/api/records/[recordId]/confirm">) { const { recordId } = await params; return api((ctx) => confirmRecord(ctx, recordId)); }
