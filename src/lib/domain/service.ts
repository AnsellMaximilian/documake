import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { collections, documents, fields, recordDocuments, recordRelations, records } from "@/db/schema";
import { DomainError, type WorkspaceContext } from "@/lib/auth/workspace";
import { fieldConfigSchema, fieldTypes, filterSchema, validateRecordValues, type FieldMetadata } from "@/lib/validation/records";
import { computeAggregation } from "@/lib/aggregation/compute";
import { summarizeRelatedRecords } from "@/lib/aggregation/related";

const collectionInput = z.object({ name: z.string().trim().min(1).max(80), description: z.string().trim().max(500).optional().nullable() });
const addFieldInput = z.object({ collectionId: z.string().uuid(), key: z.string().trim().regex(/^[a-z][a-z0-9_]*$/).max(64), label: z.string().trim().min(1).max(80), type: z.enum(fieldTypes), required: z.boolean().default(false), config: z.record(z.string(), z.unknown()).optional().default({}) });

function slugify(name: string) { return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "collection"; }
function metadata(rows: typeof fields.$inferSelect[]): FieldMetadata[] { return rows.map(({ id, key, label, type, required, config }) => ({ id, key, label, type, required, config })); }
function applyFilters(row: Record<string, unknown>, filters: z.infer<typeof filterSchema>) {
  return filters.every((filter) => {
    const value = row[filter.fieldKey];
    if (filter.operator === "isEmpty") return value === undefined || value === null || value === "";
    if (filter.operator === "equals") return value === filter.value;
    if (filter.operator === "notEquals") return value !== filter.value;
    return String(value ?? "").toLowerCase().includes(String(filter.value ?? "").toLowerCase());
  });
}

async function ownedCollection(ctx: WorkspaceContext, collectionId: string) {
  const [collection] = await ctx.db.select().from(collections).where(and(eq(collections.id, collectionId), eq(collections.workspaceId, ctx.workspaceId))).limit(1);
  if (!collection) throw new DomainError("Collection not found.", 404, "NOT_FOUND");
  return collection;
}
async function collectionFields(ctx: WorkspaceContext, collectionId: string) {
  await ownedCollection(ctx, collectionId);
  return ctx.db.select().from(fields).where(eq(fields.collectionId, collectionId)).orderBy(asc(fields.position));
}
async function ownedRecord(ctx: WorkspaceContext, recordId: string) {
  const [result] = await ctx.db.select({ record: records, collection: collections }).from(records).innerJoin(collections, eq(records.collectionId, collections.id)).where(and(eq(records.id, recordId), eq(collections.workspaceId, ctx.workspaceId))).limit(1);
  if (!result) throw new DomainError("Record not found.", 404, "NOT_FOUND");
  return result;
}

export async function listCollections(ctx: WorkspaceContext) {
  return ctx.db.select({ id: collections.id, name: collections.name, slug: collections.slug, description: collections.description, recordCount: count(records.id), createdAt: collections.createdAt }).from(collections).leftJoin(records, eq(records.collectionId, collections.id)).where(eq(collections.workspaceId, ctx.workspaceId)).groupBy(collections.id).orderBy(asc(collections.name));
}
export async function createCollection(ctx: WorkspaceContext, raw: unknown) {
  const input = collectionInput.parse(raw); let slug = slugify(input.name); let suffix = 2;
  while ((await ctx.db.select({ id: collections.id }).from(collections).where(and(eq(collections.workspaceId, ctx.workspaceId), eq(collections.slug, slug))).limit(1)).length) slug = `${slugify(input.name)}-${suffix++}`;
  const [created] = await ctx.db.insert(collections).values({ workspaceId: ctx.workspaceId, name: input.name, slug, description: input.description || null }).returning();
  return created;
}
export async function updateCollection(ctx: WorkspaceContext, collectionId: string, raw: unknown) {
  await ownedCollection(ctx, collectionId); const input = collectionInput.partial().parse(raw);
  const [updated] = await ctx.db.update(collections).set({ ...input, updatedAt: new Date() }).where(eq(collections.id, collectionId)).returning(); return updated;
}
export async function deleteCollection(ctx: WorkspaceContext, collectionId: string) { await ownedCollection(ctx, collectionId); await ctx.db.delete(collections).where(eq(collections.id, collectionId)); }
export async function getCollectionSchema(ctx: WorkspaceContext, collectionId: string) {
  const collection = await ownedCollection(ctx, collectionId); const schemaFields = await collectionFields(ctx, collectionId);
  const targetIds = schemaFields.filter((field) => field.type === "relation").map((field) => String(field.config.targetCollectionId ?? "")).filter(Boolean);
  const targets = targetIds.length ? await ctx.db.select({ id: collections.id, name: collections.name }).from(collections).where(and(eq(collections.workspaceId, ctx.workspaceId), inArray(collections.id, targetIds))) : [];
  return { ...collection, fields: schemaFields.map((field) => ({ ...field, relationTarget: targets.find((target) => target.id === field.config.targetCollectionId) ?? null })) };
}
export async function addField(ctx: WorkspaceContext, raw: unknown) {
  const input = addFieldInput.parse(raw); await ownedCollection(ctx, input.collectionId);
  const configResult = fieldConfigSchema.safeParse({ type: input.type, config: input.config });
  if (!configResult.success) throw new DomainError("Invalid field configuration.", 422, "VALIDATION_ERROR", configResult.error.flatten());
  if (input.type === "relation") await ownedCollection(ctx, String(input.config.targetCollectionId));
  const [position] = await ctx.db.select({ value: sql<number>`coalesce(max(${fields.position}), -1) + 1` }).from(fields).where(eq(fields.collectionId, input.collectionId));
  const [created] = await ctx.db.insert(fields).values({ ...input, position: Number(position.value) }).returning(); return created;
}
export async function updateField(ctx: WorkspaceContext, fieldId: string, raw: unknown) {
  const [existing] = await ctx.db.select({ field: fields, collection: collections }).from(fields).innerJoin(collections, eq(fields.collectionId, collections.id)).where(and(eq(fields.id, fieldId), eq(collections.workspaceId, ctx.workspaceId))).limit(1);
  if (!existing) throw new DomainError("Field not found.", 404, "NOT_FOUND");
  const input = z.object({ label: z.string().trim().min(1).max(80).optional(), required: z.boolean().optional(), config: z.record(z.string(), z.unknown()).optional(), position: z.number().int().min(0).optional() }).parse(raw);
  const config = input.config ?? existing.field.config; const configResult = fieldConfigSchema.safeParse({ type: existing.field.type, config });
  if (!configResult.success) throw new DomainError("Invalid field configuration.", 422, "VALIDATION_ERROR", configResult.error.flatten());
  if (existing.field.type === "relation") await ownedCollection(ctx, String(config.targetCollectionId));
  const [updated] = await ctx.db.update(fields).set({ ...input, updatedAt: new Date() }).where(eq(fields.id, fieldId)).returning(); return updated;
}
export async function deleteField(ctx: WorkspaceContext, fieldId: string) {
  const [existing] = await ctx.db.select({ field: fields }).from(fields).innerJoin(collections, eq(fields.collectionId, collections.id)).where(and(eq(fields.id, fieldId), eq(collections.workspaceId, ctx.workspaceId))).limit(1);
  if (!existing) throw new DomainError("Field not found.", 404, "NOT_FOUND");
  await ctx.db.update(records).set({ values: sql<Record<string, unknown>>`${records.values} - ${existing.field.key}`, updatedAt: new Date() }).where(eq(records.collectionId, existing.field.collectionId));
  await ctx.db.delete(fields).where(eq(fields.id, fieldId));
}

async function validateRelations(ctx: WorkspaceContext, schemaFields: typeof fields.$inferSelect[], values: Record<string, unknown>) {
  for (const field of schemaFields.filter((item) => item.type === "relation" && values[item.key])) {
    const targetId = String(values[field.key]); const [target] = await ctx.db.select({ id: records.id, collectionId: records.collectionId, workspaceId: collections.workspaceId }).from(records).innerJoin(collections, eq(records.collectionId, collections.id)).where(eq(records.id, targetId)).limit(1);
    if (!target || target.workspaceId !== ctx.workspaceId || target.collectionId !== field.config.targetCollectionId) throw new DomainError(`Invalid relation target for ${field.label}.`, 422, "VALIDATION_ERROR", { fieldKey: field.key });
  }
}
async function syncRelations(ctx: WorkspaceContext, recordId: string, schemaFields: typeof fields.$inferSelect[], values: Record<string, unknown>) {
  await ctx.db.delete(recordRelations).where(eq(recordRelations.sourceRecordId, recordId));
  const relations = schemaFields.filter((field) => field.type === "relation" && values[field.key]).map((field) => ({ fieldId: field.id, sourceRecordId: recordId, targetRecordId: String(values[field.key]) }));
  if (relations.length) await ctx.db.insert(recordRelations).values(relations);
}
export async function searchRecords(ctx: WorkspaceContext, raw: unknown) {
  const input = z.object({ collectionId: z.string().uuid(), query: z.string().max(200).optional().default(""), filters: filterSchema.optional().default([]), limit: z.number().int().min(1).max(100).optional().default(50) }).parse(raw);
  await ownedCollection(ctx, input.collectionId); const rows = await ctx.db.select().from(records).where(eq(records.collectionId, input.collectionId)).orderBy(desc(records.updatedAt)).limit(250);
  const query = input.query.toLowerCase(); return rows.filter((row) => (!query || JSON.stringify(row.values).toLowerCase().includes(query)) && applyFilters(row.values, input.filters)).slice(0, input.limit);
}
export async function createRecord(ctx: WorkspaceContext, raw: unknown) {
  const input = z.object({ collectionId: z.string().uuid(), values: z.record(z.string(), z.unknown()), status: z.enum(["draft", "confirmed"]).optional().default("draft"), sourceDocumentIds: z.array(z.string().uuid()).max(20).optional().default([]) }).parse(raw);
  const schemaFields = await collectionFields(ctx, input.collectionId); const checked = validateRecordValues(metadata(schemaFields), input.values, { partial: input.status === "draft" });
  if (!checked.valid) throw new DomainError("Record values are invalid.", 422, "VALIDATION_ERROR", checked.issues); await validateRelations(ctx, schemaFields, checked.values);
  if (input.sourceDocumentIds.length) { const owned = await ctx.db.select({ id: documents.id }).from(documents).where(and(eq(documents.workspaceId, ctx.workspaceId), inArray(documents.id, input.sourceDocumentIds))); if (owned.length !== new Set(input.sourceDocumentIds).size) throw new DomainError("One or more documents are not available.", 422, "VALIDATION_ERROR"); }
  const [created] = await ctx.db.insert(records).values({ collectionId: input.collectionId, values: checked.values, status: input.status }).returning(); await syncRelations(ctx, created.id, schemaFields, checked.values);
  if (input.sourceDocumentIds.length) await ctx.db.insert(recordDocuments).values(input.sourceDocumentIds.map((documentId) => ({ recordId: created.id, documentId })));
  return created;
}
export async function updateRecord(ctx: WorkspaceContext, recordId: string, raw: unknown, options: { allowConfirmed?: boolean } = {}) {
  const { record } = await ownedRecord(ctx, recordId); const input = z.object({ values: z.record(z.string(), z.unknown()), sourceDocumentIds: z.array(z.string().uuid()).max(20).optional() }).parse(raw);
  if (record.status !== "draft" && !options.allowConfirmed) throw new DomainError("Only draft records can be updated through this path.", 409, "NOT_A_DRAFT");
  const schemaFields = await collectionFields(ctx, record.collectionId); const merged = { ...record.values, ...input.values }; const checked = validateRecordValues(metadata(schemaFields), merged, { partial: record.status === "draft" });
  if (!checked.valid) throw new DomainError("Record values are invalid.", 422, "VALIDATION_ERROR", checked.issues); await validateRelations(ctx, schemaFields, checked.values);
  const [updated] = await ctx.db.update(records).set({ values: checked.values, updatedAt: new Date() }).where(eq(records.id, recordId)).returning(); await syncRelations(ctx, recordId, schemaFields, checked.values);
  if (input.sourceDocumentIds) { const owned = input.sourceDocumentIds.length ? await ctx.db.select({ id: documents.id }).from(documents).where(and(eq(documents.workspaceId, ctx.workspaceId), inArray(documents.id, input.sourceDocumentIds))) : []; if (owned.length !== new Set(input.sourceDocumentIds).size) throw new DomainError("One or more documents are not available.", 422, "VALIDATION_ERROR"); await ctx.db.delete(recordDocuments).where(eq(recordDocuments.recordId, recordId)); if (input.sourceDocumentIds.length) await ctx.db.insert(recordDocuments).values(input.sourceDocumentIds.map((documentId) => ({ recordId, documentId }))); }
  return updated;
}
export async function confirmRecord(ctx: WorkspaceContext, recordId: string) {
  const { record } = await ownedRecord(ctx, recordId); const schemaFields = await collectionFields(ctx, record.collectionId); const checked = validateRecordValues(metadata(schemaFields), record.values);
  if (!checked.valid) throw new DomainError("Draft cannot be confirmed yet.", 422, "VALIDATION_ERROR", checked.issues); await validateRelations(ctx, schemaFields, checked.values);
  const [confirmed] = await ctx.db.update(records).set({ status: "confirmed", updatedAt: new Date() }).where(eq(records.id, recordId)).returning(); return confirmed;
}
export async function deleteRecord(ctx: WorkspaceContext, recordId: string) { await ownedRecord(ctx, recordId); await ctx.db.delete(records).where(eq(records.id, recordId)); }
export async function getRecord(ctx: WorkspaceContext, recordId: string) {
  const { record, collection } = await ownedRecord(ctx, recordId); const schemaFields = await collectionFields(ctx, record.collectionId);
  const links = await ctx.db.select({ fieldId: recordRelations.fieldId, targetRecordId: recordRelations.targetRecordId }).from(recordRelations).where(eq(recordRelations.sourceRecordId, recordId));
  const targetRows = links.length ? await ctx.db.select().from(records).where(inArray(records.id, links.map((link) => link.targetRecordId))) : [];
  const incomingRows = await ctx.db
    .select({ field: fields, record: records, collection: collections })
    .from(recordRelations)
    .innerJoin(fields, eq(recordRelations.fieldId, fields.id))
    .innerJoin(records, eq(recordRelations.sourceRecordId, records.id))
    .innerJoin(collections, eq(records.collectionId, collections.id))
    .where(and(eq(recordRelations.targetRecordId, recordId), eq(collections.workspaceId, ctx.workspaceId)))
    .orderBy(asc(collections.name), desc(records.updatedAt))
    .limit(200);
  const incomingCollectionIds = [...new Set(incomingRows.map((row) => row.collection.id))];
  const incomingFields = incomingCollectionIds.length
    ? await ctx.db.select().from(fields).where(inArray(fields.collectionId, incomingCollectionIds)).orderBy(asc(fields.position))
    : [];
  const incomingRelations = [...new Map(incomingRows.map((row) => [row.field.id, row])).values()].map((groupSeed) => {
    const groupRecords = incomingRows.filter((row) => row.field.id === groupSeed.field.id).map((row) => row.record);
    const groupFields = incomingFields.filter((field) => field.collectionId === groupSeed.collection.id);
    return {
      field: { id: groupSeed.field.id, key: groupSeed.field.key, label: groupSeed.field.label },
      collection: { id: groupSeed.collection.id, name: groupSeed.collection.name },
      fields: groupFields,
      records: groupRecords,
      totalCount: groupRecords.length,
      confirmedCount: groupRecords.filter((item) => item.status === "confirmed").length,
      summaries: summarizeRelatedRecords(groupFields, groupRecords),
    };
  });
  const docs = await ctx.db.select({ id: documents.id, originalFilename: documents.originalFilename, mimeType: documents.mimeType, sizeBytes: documents.sizeBytes, createdAt: documents.createdAt }).from(recordDocuments).innerJoin(documents, eq(recordDocuments.documentId, documents.id)).where(eq(recordDocuments.recordId, recordId));
  return { ...record, collection: { id: collection.id, name: collection.name }, fields: schemaFields, relatedRecords: links.map((link) => ({ fieldId: link.fieldId, record: targetRows.find((target) => target.id === link.targetRecordId) })), incomingRelations, documents: docs };
}
export async function aggregateRecords(ctx: WorkspaceContext, raw: unknown) {
  const input = z.object({ collectionId: z.string().uuid(), operation: z.enum(["count", "sum", "average", "min", "max"]), fieldKey: z.string().optional(), filters: filterSchema.optional().default([]) }).parse(raw);
  const schemaFields = await collectionFields(ctx, input.collectionId); const rows = (await ctx.db.select({ values: records.values }).from(records).where(and(eq(records.collectionId, input.collectionId), eq(records.status, "confirmed")))).filter((row) => applyFilters(row.values, input.filters));
  if (input.operation === "count" && !input.fieldKey) return { operation: "count", value: rows.length, recordCount: rows.length };
  const field = schemaFields.find((item) => item.key === input.fieldKey); if (!field || !["number", "money"].includes(field.type)) throw new DomainError("Aggregation requires a numeric or money field.", 422, "INCOMPATIBLE_FIELD");
  const values = rows.map((row) => row.values[field.key]).filter((value): value is number => typeof value === "number" && Number.isFinite(value)); const value = computeAggregation(input.operation, values);
  return { operation: input.operation, fieldKey: field.key, value, recordCount: rows.length, valueCount: values.length };
}

export async function listDocuments(ctx: WorkspaceContext, raw: unknown = {}) {
  const input = z.object({ limit: z.number().int().min(1).max(100).optional().default(50), unlinkedOnly: z.boolean().optional().default(false) }).parse(raw);
  const rows = await ctx.db.select({ id: documents.id, originalFilename: documents.originalFilename, mimeType: documents.mimeType, sizeBytes: documents.sizeBytes, createdAt: documents.createdAt, linkCount: count(recordDocuments.recordId) }).from(documents).leftJoin(recordDocuments, eq(recordDocuments.documentId, documents.id)).where(eq(documents.workspaceId, ctx.workspaceId)).groupBy(documents.id).orderBy(desc(documents.createdAt)).limit(input.limit);
  return input.unlinkedOnly ? rows.filter((row) => Number(row.linkCount) === 0) : rows;
}
export async function getDocument(ctx: WorkspaceContext, documentId: string) {
  const [document] = await ctx.db.select({ id: documents.id, workspaceId: documents.workspaceId, originalFilename: documents.originalFilename, blobPathname: documents.blobPathname, mimeType: documents.mimeType, sizeBytes: documents.sizeBytes, createdAt: documents.createdAt }).from(documents).where(and(eq(documents.id, documentId), eq(documents.workspaceId, ctx.workspaceId))).limit(1);
  if (!document) throw new DomainError("Document not found.", 404, "NOT_FOUND"); return document;
}
