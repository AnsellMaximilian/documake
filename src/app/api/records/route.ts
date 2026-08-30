import { api, json } from "@/lib/http";
import { createRecord, searchRecords } from "@/lib/domain/service";
export function GET(request: Request) { const url = new URL(request.url); return api((ctx) => searchRecords(ctx, { collectionId: url.searchParams.get("collectionId"), query: url.searchParams.get("query") ?? "", limit: Number(url.searchParams.get("limit") ?? 50) })); }
export async function POST(request: Request) { const body = await json(request); return api((ctx) => createRecord(ctx, body)); }
