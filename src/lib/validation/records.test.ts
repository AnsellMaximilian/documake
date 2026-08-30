import { describe, expect, it } from "vitest";
import { relationTargetMatches, validateRecordValues, type FieldMetadata } from "./records";
const fields: FieldMetadata[] = [
  { id: "1", key: "title", label: "Title", type: "text", required: true, config: {} },
  { id: "2", key: "amount", label: "Amount", type: "money", required: false, config: { currency: "IDR" } },
  { id: "3", key: "status", label: "Status", type: "select", required: false, config: { options: ["Open", "Closed"] } },
  { id: "4", key: "supplier", label: "Supplier", type: "relation", required: false, config: { targetCollectionId: "e3bd29b0-0c28-4ed9-aa8a-21cd54405387" } },
];
describe("schema-based record validation", () => {
  it("accepts values matching generic field metadata", () => { expect(validateRecordValues(fields, { title: "Fictional order", amount: 125000, status: "Open" }).valid).toBe(true); });
  it("reports required, numeric, and unknown field errors", () => { const result = validateRecordValues(fields, { amount: "125", mystery: true }); expect(result.valid).toBe(false); if (!result.valid) expect(result.issues.map((issue) => issue.fieldKey)).toEqual(expect.arrayContaining(["title", "amount", "mystery"])); });
  it("allows incomplete drafts but still checks supplied types", () => { expect(validateRecordValues(fields, { amount: 500 }, { partial: true }).valid).toBe(true); expect(validateRecordValues(fields, { amount: "500" }, { partial: true }).valid).toBe(false); });
});
describe("select validation", () => { it("rejects values outside configured options", () => { expect(validateRecordValues(fields, { title: "Example", status: "Archived" }).valid).toBe(false); }); });
describe("relation validation", () => { it("checks UUID shape and tenancy/target boundaries", () => { expect(validateRecordValues(fields, { title: "Example", supplier: "not-an-id" }).valid).toBe(false); expect(relationTargetMatches({ workspaceId: "w1", collectionId: "c1" }, "w1", "c1")).toBe(true); expect(relationTargetMatches({ workspaceId: "w2", collectionId: "c1" }, "w1", "c1")).toBe(false); }); });
