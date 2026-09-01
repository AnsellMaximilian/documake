import assert from "node:assert/strict";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { workspaceMembers } from "../src/db/schema";
import { addField, analyzeRecords, createCollection, createRecord, getCollectionSchema, listCollections, searchRecords } from "../src/lib/domain/service";

config({ path: ".env.local" });

async function main() {
const db = getDb();
const requestedUserId = process.argv[2];
const memberships = requestedUserId
  ? await db.select().from(workspaceMembers).where(eq(workspaceMembers.clerkUserId, requestedUserId)).limit(1)
  : await db.select().from(workspaceMembers).limit(2);
if (!memberships.length) throw new Error("No workspace member exists yet. Sign in to Documake first.");
if (!requestedUserId && memberships.length > 1) throw new Error("Multiple workspace members found. Run with a Clerk user ID: pnpm db:seed:analytics -- <clerk-user-id>");
const membership = memberships[0];
const ctx = { db, userId: membership.clerkUserId, workspaceId: membership.workspaceId };
const existing = await listCollections(ctx);
async function collection(name: string, description: string) {
  return existing.find((item) => item.name === name) ?? createCollection(ctx, { name, description });
}
const suppliers = await collection("Demo Suppliers", "Fictional suppliers for analytics and WebMCP testing.");
const purchases = await collection("Demo Purchases", "Fictional supplier purchases across July–September 2026.");
const items = await collection("Demo Purchase Items", "Fictional line items linked to demo supplier purchases.");
const fieldKeys = new Map<string, Set<string>>();
for (const item of [suppliers, purchases, items]) fieldKeys.set(item.id, new Set((await getCollectionSchema(ctx, item.id)).fields.map((schemaField) => schemaField.key)));

async function field(collectionId: string, key: string, label: string, type: "text" | "number" | "money" | "date" | "boolean" | "select" | "relation", required = true, config: Record<string, unknown> = {}) {
  if (fieldKeys.get(collectionId)?.has(key)) return;
  await addField(ctx, { collectionId, key, label, type, required, config });
  fieldKeys.get(collectionId)?.add(key);
}

await field(suppliers.id, "name", "Supplier name", "text");
await field(suppliers.id, "city", "City", "select", true, { options: ["Jakarta", "Bandung", "Surabaya", "Bogor"] });
await field(suppliers.id, "supplier_type", "Supplier type", "select", true, { options: ["Local", "Importer"] });
await field(suppliers.id, "active", "Active", "boolean");

await field(purchases.id, "purchase_number", "Purchase number", "text");
await field(purchases.id, "supplier", "Supplier", "relation", true, { targetCollectionId: suppliers.id });
await field(purchases.id, "purchase_date", "Purchase date", "date");
await field(purchases.id, "purchase_status", "Purchase status", "select", true, { options: ["Received", "Pending", "Cancelled"] });
await field(purchases.id, "total", "Purchase total", "money", true, { currency: "IDR" });
await field(purchases.id, "paid", "Paid", "boolean");

await field(items.id, "purchase", "Purchase", "relation", true, { targetCollectionId: purchases.id });
await field(items.id, "product", "Product", "select", true, { options: ["Eggs", "Rice", "Chicken", "Avocado", "Cooking Oil", "Flour"] });
await field(items.id, "category", "Category", "select", true, { options: ["Protein", "Pantry", "Produce"] });
await field(items.id, "quantity", "Quantity", "number");
await field(items.id, "unit_price", "Unit price", "money", true, { currency: "IDR" });
await field(items.id, "line_total", "Line total", "money", true, { currency: "IDR" });

const supplierData = [
  ["Sari Pangan", { name: "Sari Pangan (Fictional)", city: "Jakarta", supplier_type: "Local", active: true }],
  ["Nusantara Fresh", { name: "Nusantara Fresh (Fictional)", city: "Bandung", supplier_type: "Local", active: true }],
  ["Global Pantry", { name: "Global Pantry (Fictional)", city: "Surabaya", supplier_type: "Importer", active: true }],
  ["Karya Sejuk", { name: "Karya Sejuk (Fictional)", city: "Bogor", supplier_type: "Local", active: false }],
] as const;
const existingSuppliers = await searchRecords(ctx, { collectionId: suppliers.id, limit: 100 });
const supplierRows: Record<string, { id: string; values: Record<string, unknown> }> = {};
for (const [name, values] of supplierData) {
  supplierRows[name] = existingSuppliers.find((row) => row.values.name === values.name) ?? await createRecord(ctx, { collectionId: suppliers.id, values, status: "confirmed" });
}

const purchaseData = [
  ["P-260701", "Sari Pangan", "2026-07-05", "Received", 810000, true, "confirmed"],
  ["P-260702", "Nusantara Fresh", "2026-07-18", "Received", 870000, false, "confirmed"],
  ["P-260801", "Sari Pangan", "2026-08-03", "Received", 1020000, true, "confirmed"],
  ["P-260802", "Global Pantry", "2026-08-10", "Received", 1268000, false, "confirmed"],
  ["P-260803", "Nusantara Fresh", "2026-08-16", "Received", 960000, true, "confirmed"],
  ["P-260804", "Karya Sejuk", "2026-08-24", "Received", 1650000, false, "confirmed"],
  ["P-260901", "Sari Pangan", "2026-09-01", "Received", 1270000, false, "confirmed"],
  ["P-260902", "Nusantara Fresh", "2026-09-01", "Received", 960000, true, "confirmed"],
  ["P-260903", "Global Pantry", "2026-09-01", "Received", 1952000, false, "confirmed"],
  ["P-260904", "Karya Sejuk", "2026-09-01", "Cancelled", 2700000, false, "confirmed"],
  ["P-260905", "Sari Pangan", "2026-09-01", "Pending", 600000, false, "confirmed"],
  ["P-260906", "Nusantara Fresh", "2026-09-01", "Pending", 1850000, false, "draft"],
] as const;

const existingPurchases = await searchRecords(ctx, { collectionId: purchases.id, limit: 100 });
const purchaseRows: Record<string, { id: string; values: Record<string, unknown> }> = {};
for (const [number, supplier, date, purchaseStatus, total, paid, recordStatus] of purchaseData) {
  purchaseRows[number] = existingPurchases.find((row) => row.values.purchase_number === number) ?? await createRecord(ctx, { collectionId: purchases.id, values: { purchase_number: number, supplier: supplierRows[supplier].id, purchase_date: date, purchase_status: purchaseStatus, total, paid }, status: recordStatus });
}

const categories: Record<string, string> = { Eggs: "Protein", Chicken: "Protein", Rice: "Pantry", "Cooking Oil": "Pantry", Flour: "Pantry", Avocado: "Produce" };
const itemData = [
  ["P-260701", "Eggs", 10, 30000], ["P-260701", "Rice", 5, 70000], ["P-260701", "Cooking Oil", 4, 40000],
  ["P-260702", "Chicken", 8, 55000], ["P-260702", "Avocado", 10, 25000], ["P-260702", "Eggs", 6, 30000],
  ["P-260801", "Eggs", 12, 30000], ["P-260801", "Rice", 8, 70000], ["P-260801", "Flour", 5, 20000],
  ["P-260802", "Cooking Oil", 15, 38000], ["P-260802", "Rice", 6, 68000], ["P-260802", "Chicken", 5, 58000],
  ["P-260803", "Avocado", 20, 24000], ["P-260803", "Eggs", 10, 29000], ["P-260803", "Flour", 10, 19000],
  ["P-260804", "Chicken", 12, 54000], ["P-260804", "Rice", 10, 69000], ["P-260804", "Cooking Oil", 8, 39000],
  ["P-260901", "Eggs", 15, 30000], ["P-260901", "Rice", 7, 70000], ["P-260901", "Chicken", 6, 55000],
  ["P-260902", "Avocado", 18, 25000], ["P-260902", "Eggs", 9, 30000], ["P-260902", "Flour", 12, 20000],
  ["P-260903", "Cooking Oil", 20, 38000], ["P-260903", "Rice", 9, 68000], ["P-260903", "Chicken", 10, 58000],
  ["P-260904", "Eggs", 50, 28000], ["P-260904", "Rice", 20, 65000],
  ["P-260905", "Flour", 20, 20000], ["P-260905", "Cooking Oil", 5, 40000],
  ["P-260906", "Chicken", 20, 55000], ["P-260906", "Avocado", 30, 25000],
] as const;

const existingItems = await searchRecords(ctx, { collectionId: items.id, limit: 100 });
const existingItemKeys = new Set(existingItems.map((row) => `${row.values.purchase}:${row.values.product}`));
for (const [purchaseNumber, product, quantity, unitPrice] of itemData) {
  const itemKey = `${purchaseRows[purchaseNumber].id}:${product}`;
  if (existingItemKeys.has(itemKey)) continue;
  await createRecord(ctx, { collectionId: items.id, values: { purchase: purchaseRows[purchaseNumber].id, product, category: categories[product], quantity, unit_price: unitPrice, line_total: quantity * unitPrice }, status: purchaseNumber === "P-260906" ? "draft" : "confirmed" });
  existingItemKeys.add(itemKey);
}

const septemberReceived = [
  { fieldKey: "purchase", relatedFieldKey: "purchase_date", operator: "between", value: "2026-09-01", valueTo: "2026-09-30" },
  { fieldKey: "purchase", relatedFieldKey: "purchase_status", operator: "equals", value: "Received" },
];
const topSeptemberProduct = await analyzeRecords(ctx, { collectionId: items.id, operation: "sum", valueFieldKey: "line_total", groupBy: { fieldKey: "product" }, filters: septemberReceived, status: "confirmed", sort: "desc" });
const augustRevenue = await analyzeRecords(ctx, { collectionId: items.id, operation: "sum", valueFieldKey: "line_total", groupBy: { fieldKey: "product" }, filters: [{ fieldKey: "purchase", relatedFieldKey: "purchase_date", operator: "between", value: "2026-08-01", valueTo: "2026-08-31" }, { fieldKey: "purchase", relatedFieldKey: "purchase_status", operator: "equals", value: "Received" }], status: "confirmed", sort: "desc" });
const [septemberQuantity, septemberSuppliers, quarterlyMonths, supplierAverages, unpaidSuppliers, augustCategories, septemberStatuses, confirmedItems, allItems] = await Promise.all([
  analyzeRecords(ctx, { collectionId: items.id, operation: "sum", valueFieldKey: "quantity", groupBy: { fieldKey: "product" }, filters: septemberReceived, status: "confirmed", sort: "desc" }),
  analyzeRecords(ctx, { collectionId: purchases.id, operation: "sum", valueFieldKey: "total", groupBy: { fieldKey: "supplier" }, filters: [{ fieldKey: "purchase_date", operator: "between", value: "2026-09-01", valueTo: "2026-09-30" }, { fieldKey: "purchase_status", operator: "equals", value: "Received" }], status: "confirmed", sort: "desc" }),
  analyzeRecords(ctx, { collectionId: purchases.id, operation: "sum", valueFieldKey: "total", groupBy: { fieldKey: "purchase_date" }, dateBucket: "month", filters: [{ fieldKey: "purchase_date", operator: "between", value: "2026-07-01", valueTo: "2026-09-30" }, { fieldKey: "purchase_status", operator: "equals", value: "Received" }], status: "confirmed", sort: "desc" }),
  analyzeRecords(ctx, { collectionId: purchases.id, operation: "average", valueFieldKey: "total", groupBy: { fieldKey: "supplier" }, filters: [{ fieldKey: "purchase_date", operator: "between", value: "2026-07-01", valueTo: "2026-09-30" }, { fieldKey: "purchase_status", operator: "equals", value: "Received" }], status: "confirmed", sort: "desc" }),
  analyzeRecords(ctx, { collectionId: purchases.id, operation: "sum", valueFieldKey: "total", groupBy: { fieldKey: "supplier" }, filters: [{ fieldKey: "purchase_status", operator: "equals", value: "Received" }, { fieldKey: "paid", operator: "equals", value: false }], status: "confirmed", sort: "desc" }),
  analyzeRecords(ctx, { collectionId: items.id, operation: "sum", valueFieldKey: "quantity", groupBy: { fieldKey: "category" }, filters: [{ fieldKey: "purchase", relatedFieldKey: "purchase_date", operator: "between", value: "2026-08-01", valueTo: "2026-08-31" }, { fieldKey: "purchase", relatedFieldKey: "purchase_status", operator: "equals", value: "Received" }], status: "confirmed", sort: "desc" }),
  analyzeRecords(ctx, { collectionId: purchases.id, operation: "sum", valueFieldKey: "total", groupBy: { fieldKey: "purchase_status" }, filters: [{ fieldKey: "purchase_date", operator: "between", value: "2026-09-01", valueTo: "2026-09-30" }], status: "confirmed", sort: "desc" }),
  analyzeRecords(ctx, { collectionId: items.id, operation: "count", filters: [], status: "confirmed", sort: "desc" }),
  analyzeRecords(ctx, { collectionId: items.id, operation: "count", filters: [], status: "all", sort: "desc" }),
]);
assert.equal(topSeptemberProduct.total, 4182000);
assert.deepEqual(topSeptemberProduct.groups[0], { key: "Rice", label: "Rice", value: 1102000, recordCount: 2 });
assert.equal(augustRevenue.total, 4898000);
assert.deepEqual(augustRevenue.groups[0], { key: "Rice", label: "Rice", value: 1658000, recordCount: 3 });
assert.equal(septemberQuantity.groups[0].label, "Eggs");
assert.equal(septemberQuantity.groups[0].value, 24);
assert.equal(septemberSuppliers.groups[0].value, 1952000);
assert.deepEqual(quarterlyMonths.groups.map((group) => [group.key, group.value]), [["2026-08", 4898000], ["2026-09", 4182000], ["2026-07", 1680000]]);
assert.equal(unpaidSuppliers.total, 7010000);
assert.deepEqual(augustCategories.groups.map((group) => [group.label, group.value]), [["Pantry", 62], ["Protein", 39], ["Produce", 20]]);
assert.equal(confirmedItems.total, 31);
assert.equal(allItems.total, 33);

console.log(JSON.stringify({
  workspaceId: ctx.workspaceId,
  collections: { suppliers: suppliers.id, purchases: purchases.id, items: items.id },
  created: { suppliers: 4, purchases: 12, items: 33 },
  checks: {
    septemberProductRevenue: topSeptemberProduct,
    septemberProductQuantity: septemberQuantity,
    septemberSupplierSpend: septemberSuppliers,
    augustProductRevenue: augustRevenue,
    quarterlyMonthlySpend: quarterlyMonths,
    supplierAveragePurchase: supplierAverages,
    unpaidSupplierSpend: unpaidSuppliers,
    augustCategoryQuantity: augustCategories,
    septemberStatusTotals: septemberStatuses,
    itemRecordCounts: { confirmed: confirmedItems.total, all: allItems.total },
  },
}, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
