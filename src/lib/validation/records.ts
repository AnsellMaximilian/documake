import { z } from "zod";

export const fieldTypes = ["text", "number", "money", "date", "boolean", "select", "relation"] as const;
export type FieldType = (typeof fieldTypes)[number];
export type FieldMetadata = {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  config: Record<string, unknown>;
};

export type ValidationIssue = { fieldKey: string; message: string };
export type ValidationResult = { valid: true; values: Record<string, unknown> } | { valid: false; issues: ValidationIssue[] };

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function validateRecordValues(fields: FieldMetadata[], input: unknown, options: { partial?: boolean } = {}): ValidationResult {
  const parsed = z.record(z.string(), z.unknown()).safeParse(input);
  if (!parsed.success) return { valid: false, issues: [{ fieldKey: "$", message: "Values must be an object." }] };
  const values = parsed.data;
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const issues: ValidationIssue[] = [];

  for (const key of Object.keys(values)) if (!byKey.has(key)) issues.push({ fieldKey: key, message: "Unknown field." });
  for (const field of fields) {
    const value = values[field.key];
    const missing = value === undefined || value === null || value === "";
    if (!options.partial && field.required && missing) issues.push({ fieldKey: field.key, message: `${field.label} is required.` });
    if (missing) continue;
    if (field.type === "text" && typeof value !== "string") issues.push({ fieldKey: field.key, message: "Must be text." });
    if ((field.type === "number" || field.type === "money") && (typeof value !== "number" || !Number.isFinite(value))) issues.push({ fieldKey: field.key, message: "Must be a finite number." });
    if (field.type === "date" && (typeof value !== "string" || !isIsoDate(value))) issues.push({ fieldKey: field.key, message: "Must be a valid date in YYYY-MM-DD format." });
    if (field.type === "boolean" && typeof value !== "boolean") issues.push({ fieldKey: field.key, message: "Must be true or false." });
    if (field.type === "select") {
      const options = Array.isArray(field.config.options) ? field.config.options : [];
      if (typeof value !== "string" || !options.includes(value)) issues.push({ fieldKey: field.key, message: "Must be one of the configured options." });
    }
    if (field.type === "relation" && (typeof value !== "string" || !z.string().uuid().safeParse(value).success)) issues.push({ fieldKey: field.key, message: "Must be a target record UUID." });
  }
  return issues.length ? { valid: false, issues } : { valid: true, values };
}

export const fieldConfigSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), config: z.record(z.string(), z.unknown()).optional() }),
  z.object({ type: z.literal("number"), config: z.record(z.string(), z.unknown()).optional() }),
  z.object({ type: z.literal("date"), config: z.record(z.string(), z.unknown()).optional() }),
  z.object({ type: z.literal("boolean"), config: z.record(z.string(), z.unknown()).optional() }),
  z.object({ type: z.literal("money"), config: z.object({ currency: z.string().trim().length(3).transform((value) => value.toUpperCase()) }) }),
  z.object({ type: z.literal("select"), config: z.object({ options: z.array(z.string().trim().min(1)).min(1).max(50) }) }),
  z.object({ type: z.literal("relation"), config: z.object({ targetCollectionId: z.string().uuid() }) }),
]);

export const filterSchema = z.array(z.object({ fieldKey: z.string().min(1), operator: z.enum(["equals", "notEquals", "contains", "isEmpty"]), value: z.unknown().optional() })).max(10).default([]);

export function relationTargetMatches(target: { workspaceId: string; collectionId: string } | null | undefined, workspaceId: string, targetCollectionId: string) {
  return Boolean(target && target.workspaceId === workspaceId && target.collectionId === targetCollectionId);
}
