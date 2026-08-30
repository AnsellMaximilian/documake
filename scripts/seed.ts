import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { collections, fields, recordRelations, records, workspaceMembers, workspaces } from "../src/db/schema";

const clerkUserId = process.argv[2];
if (!clerkUserId) throw new Error("Usage: pnpm db:seed -- <clerk-user-id>");

const db = getDb();
const [existingMembership] = await db.select().from(workspaceMembers).where(eq(workspaceMembers.clerkUserId, clerkUserId)).limit(1);
let workspaceId = existingMembership?.workspaceId;
if (!workspaceId) {
  const [workspace] = await db.insert(workspaces).values({ name: "Demo workspace" }).returning(); workspaceId = workspace.id;
  await db.insert(workspaceMembers).values({ workspaceId, clerkUserId, role: "owner" });
}
const existingCollections = await db.select().from(collections).where(eq(collections.workspaceId, workspaceId));
if (existingCollections.some((collection) => collection.slug === "suppliers" || collection.slug === "invoices")) throw new Error("Demo Suppliers or Invoices collections already exist for this workspace.");

const [suppliers] = await db.insert(collections).values({ workspaceId, name: "Suppliers", slug: "suppliers", description: "Fictional demo suppliers." }).returning();
const [invoices] = await db.insert(collections).values({ workspaceId, name: "Invoices", slug: "invoices", description: "Fictional demo invoices." }).returning();
await db.insert(fields).values([
  { collectionId: suppliers.id, key: "name", label: "Name", type: "text", required: true, position: 0, config: {} },
  { collectionId: suppliers.id, key: "contact", label: "Contact", type: "text", required: false, position: 1, config: {} },
]);
const [invoiceNumberField, supplierField] = await db.insert(fields).values([
  { collectionId: invoices.id, key: "invoice_number", label: "Invoice number", type: "text", required: true, position: 0, config: {} },
  { collectionId: invoices.id, key: "supplier", label: "Supplier", type: "relation", required: true, position: 1, config: { targetCollectionId: suppliers.id } },
]).returning();
await db.insert(fields).values([
  { collectionId: invoices.id, key: "date", label: "Date", type: "date", required: true, position: 2, config: {} },
  { collectionId: invoices.id, key: "total", label: "Total", type: "money", required: true, position: 3, config: { currency: "IDR" } },
  { collectionId: invoices.id, key: "paid", label: "Paid", type: "boolean", required: false, position: 4, config: {} },
]);
void invoiceNumberField;
const supplierRows = await db.insert(records).values([
  { collectionId: suppliers.id, status: "confirmed", values: { name: "Nusantara Office Supply (Fictional)", contact: "demo@example.invalid" } },
  { collectionId: suppliers.id, status: "confirmed", values: { name: "Meridian Parts Studio (Fictional)", contact: "accounts@example.invalid" } },
]).returning();
const invoiceRows = await db.insert(records).values([
  { collectionId: invoices.id, status: "confirmed", values: { invoice_number: "DEMO-104", supplier: supplierRows[0].id, date: "2026-08-20", total: 932400, paid: false } },
  { collectionId: invoices.id, status: "confirmed", values: { invoice_number: "DEMO-105", supplier: supplierRows[1].id, date: "2026-08-23", total: 480000, paid: true } },
  { collectionId: invoices.id, status: "draft", values: { invoice_number: "DEMO-106", supplier: supplierRows[0].id, total: 275000, paid: false } },
]).returning();
await db.insert(recordRelations).values(invoiceRows.map((invoice, index) => ({ fieldId: supplierField.id, sourceRecordId: invoice.id, targetRecordId: supplierRows[index === 1 ? 1 : 0].id })));
console.log(`Seeded fictional demo data into workspace ${workspaceId}.`);
