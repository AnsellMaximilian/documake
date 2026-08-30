import { api, json } from "@/lib/http";
import { deleteCollection, getCollectionSchema, updateCollection } from "@/lib/domain/service";
export async function GET(_: Request, { params }: RouteContext<"/api/collections/[collectionId]">) { const { collectionId } = await params; return api((ctx) => getCollectionSchema(ctx, collectionId)); }
export async function PATCH(request: Request, { params }: RouteContext<"/api/collections/[collectionId]">) { const [{ collectionId }, body] = await Promise.all([params, json(request)]); return api((ctx) => updateCollection(ctx, collectionId, body)); }
export async function DELETE(_: Request, { params }: RouteContext<"/api/collections/[collectionId]">) { const { collectionId } = await params; return api(async (ctx) => { await deleteCollection(ctx, collectionId); return { deleted: true }; }); }
