import { api, json } from "@/lib/http";
import { addField } from "@/lib/domain/service";
export async function POST(request: Request, { params }: RouteContext<"/api/collections/[collectionId]/fields">) { const [{ collectionId }, body] = await Promise.all([params, json(request)]); return api((ctx) => addField(ctx, { ...(body as object), collectionId })); }
