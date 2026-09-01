import { z } from "zod";
import { api, json } from "@/lib/http";
import { addField, aggregateRecords, analyzeRecords, confirmRecord, createCollection, createRecord, getCollectionSchema, getDocument, getRecord, listCollections, listDocuments, searchRecords, updateRecord } from "@/lib/domain/service";

const requestSchema = z.object({ action: z.enum(["list_collections", "get_collection_schema", "create_collection", "add_field", "search_records", "get_record", "create_record_draft", "update_record_draft", "confirm_record", "aggregate_records", "analyze_records", "list_documents", "get_document"]), input: z.record(z.string(), z.unknown()).default({}) });
export async function POST(request: Request) {
  return api(async (ctx) => {
    const body = requestSchema.parse(await json(request));
    const input = body.input;
    switch (body.action) {
      case "list_collections": return listCollections(ctx);
      case "get_collection_schema": return getCollectionSchema(ctx, String(input.collectionId));
      case "create_collection": return createCollection(ctx, input);
      case "add_field": return addField(ctx, input);
      case "search_records": return searchRecords(ctx, input);
      case "get_record": return getRecord(ctx, String(input.recordId));
      case "create_record_draft": return createRecord(ctx, { ...input, status: "draft" });
      case "update_record_draft": return updateRecord(ctx, String(input.recordId), input);
      case "confirm_record": return confirmRecord(ctx, String(input.recordId));
      case "aggregate_records": return aggregateRecords(ctx, input);
      case "analyze_records": return analyzeRecords(ctx, input);
      case "list_documents": return listDocuments(ctx, input);
      case "get_document": { const document = await getDocument(ctx, String(input.documentId)); return { id: document.id, originalFilename: document.originalFilename, mimeType: document.mimeType, sizeBytes: document.sizeBytes, createdAt: document.createdAt, viewPath: `/documents/${document.id}` }; }
    }
  });
}
