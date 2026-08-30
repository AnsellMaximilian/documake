import { api, json } from "@/lib/http";
import { createCollection, listCollections } from "@/lib/domain/service";
export function GET() { return api(listCollections); }
export async function POST(request: Request) { const body = await json(request); return api((ctx) => createCollection(ctx, body)); }
