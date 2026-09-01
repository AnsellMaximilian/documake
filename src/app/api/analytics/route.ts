import { analyzeRecords } from "@/lib/domain/service";
import { api, json } from "@/lib/http";

export async function POST(request: Request) {
  const body = await json(request);
  return api((ctx) => analyzeRecords(ctx, body));
}
