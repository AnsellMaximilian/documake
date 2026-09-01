import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const memberRole = pgEnum("member_role", ["owner", "member"]);
export const fieldType = pgEnum("field_type", ["text", "number", "money", "date", "boolean", "select", "relation"]);
export const recordStatus = pgEnum("record_status", ["draft", "confirmed"]);
const timestamps = { createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull() };

export const workspaces = pgTable("workspaces", { id: uuid("id").defaultRandom().primaryKey(), name: text("name").notNull(), ...timestamps });
export const workspaceMembers = pgTable("workspace_members", {
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), clerkUserId: text("clerk_user_id").notNull(), role: memberRole("role").default("member").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.workspaceId, table.clerkUserId] }), uniqueIndex("workspace_members_user_idx").on(table.clerkUserId)]);
export const collections = pgTable("collections", {
  id: uuid("id").defaultRandom().primaryKey(), workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), name: text("name").notNull(), slug: text("slug").notNull(), description: text("description"), ...timestamps,
}, (table) => [uniqueIndex("collections_workspace_slug_idx").on(table.workspaceId, table.slug)]);
export const fields = pgTable("fields", {
  id: uuid("id").defaultRandom().primaryKey(), collectionId: uuid("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }), key: text("key").notNull(), label: text("label").notNull(), type: fieldType("type").notNull(), required: boolean("required").default(false).notNull(), position: integer("position").notNull(), config: jsonb("config").$type<Record<string, unknown>>().default({}).notNull(), ...timestamps,
}, (table) => [uniqueIndex("fields_collection_key_idx").on(table.collectionId, table.key)]);
export const records = pgTable("records", {
  id: uuid("id").defaultRandom().primaryKey(), collectionId: uuid("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }), values: jsonb("values").$type<Record<string, unknown>>().default({}).notNull(), status: recordStatus("status").default("draft").notNull(), ...timestamps,
});
export const recordRelations = pgTable("record_relations", {
  id: uuid("id").defaultRandom().primaryKey(), fieldId: uuid("field_id").notNull().references(() => fields.id, { onDelete: "cascade" }), sourceRecordId: uuid("source_record_id").notNull().references(() => records.id, { onDelete: "cascade" }), targetRecordId: uuid("target_record_id").notNull().references(() => records.id, { onDelete: "cascade" }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("record_relations_unique_idx").on(table.fieldId, table.sourceRecordId, table.targetRecordId),
  index("record_relations_source_idx").on(table.sourceRecordId),
  index("record_relations_target_idx").on(table.targetRecordId),
]);
export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(), workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), originalFilename: text("original_filename").notNull(), blobPathname: text("blob_pathname").notNull(), mimeType: text("mime_type").notNull(), sizeBytes: integer("size_bytes").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const recordDocuments = pgTable("record_documents", {
  recordId: uuid("record_id").notNull().references(() => records.id, { onDelete: "cascade" }), documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.recordId, table.documentId] })]);

export const workspaceRelations = relations(workspaces, ({ many }) => ({ members: many(workspaceMembers), collections: many(collections), documents: many(documents) }));
export const collectionRelations = relations(collections, ({ one, many }) => ({ workspace: one(workspaces, { fields: [collections.workspaceId], references: [workspaces.id] }), fields: many(fields), records: many(records) }));
export const recordRelationsMap = relations(records, ({ one, many }) => ({ collection: one(collections, { fields: [records.collectionId], references: [collections.id] }), documents: many(recordDocuments) }));
