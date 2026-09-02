import { api, json } from "@/lib/http";
import { createCollectionBlueprint } from "@/lib/domain/service";

export async function POST(request: Request) {
  const body = await json(request);
  return api((ctx) => createCollectionBlueprint(ctx, body));
}
