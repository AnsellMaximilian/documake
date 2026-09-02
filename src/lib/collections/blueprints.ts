import { z } from "zod";
import { fieldConfigSchema } from "@/lib/validation/records";

const blueprintFieldSchema = z.object({
  key: z.string().trim().regex(/^[a-z][a-z0-9_]*$/).max(64),
  label: z.string().trim().min(1).max(80),
  type: z.enum(["text", "number", "money", "date", "boolean", "select"]),
  required: z.boolean().optional().default(false),
  config: z.record(z.string(), z.unknown()).optional().default({}),
});

const relationToParentSchema = z.object({
  key: z.string().trim().regex(/^[a-z][a-z0-9_]*$/).max(64),
  label: z.string().trim().min(1).max(80),
  required: z.boolean().optional().default(true),
});

type ParsedBlueprintNode = {
  name: string;
  description: string;
  relationToParent?: z.infer<typeof relationToParentSchema>;
  fields: z.infer<typeof blueprintFieldSchema>[];
  children: ParsedBlueprintNode[];
};

const blueprintNodeSchema: z.ZodType<ParsedBlueprintNode> = z.lazy(() => z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().default(""),
  relationToParent: relationToParentSchema.optional(),
  fields: z.array(blueprintFieldSchema).max(50).default([]),
  children: z.array(blueprintNodeSchema).max(10).default([]),
}));

export const collectionBlueprintInput = z.object({ root: blueprintNodeSchema });
export type ParsedCollectionBlueprint = z.infer<typeof collectionBlueprintInput>;

export type PlannedCollectionBlueprint = {
  rootId: string;
  collections: { id: string; parentId: string | null; workspaceId: string; name: string; slug: string; description: string | null }[];
  fields: { collectionId: string; key: string; label: string; type: "text" | "number" | "money" | "date" | "boolean" | "select" | "relation"; required: boolean; position: number; config: Record<string, unknown> }[];
};

export function parseCollectionBlueprint(raw: unknown): ParsedCollectionBlueprint {
  const parsed = collectionBlueprintInput.parse(raw);
  let nodeCount = 0;

  function validateNode(node: ParsedBlueprintNode, depth: number, isRoot: boolean) {
    nodeCount += 1;
    if (nodeCount > 30) throw new z.ZodError([{ code: "custom", path: ["root"], message: "A blueprint can contain at most 30 collections." }]);
    if (depth > 5) throw new z.ZodError([{ code: "custom", path: ["root"], message: "Collections can be nested up to five levels deep." }]);
    if (isRoot && node.relationToParent) throw new z.ZodError([{ code: "custom", path: ["root", "relationToParent"], message: "The root collection cannot have a parent relation." }]);
    if (!isRoot && !node.relationToParent) throw new z.ZodError([{ code: "custom", path: ["root", "children"], message: "Every child collection needs a relation to its parent." }]);

    const keys = [node.relationToParent?.key, ...node.fields.map((field) => field.key)].filter(Boolean);
    if (new Set(keys).size !== keys.length) throw new z.ZodError([{ code: "custom", path: ["root"], message: `Field keys must be unique inside ${node.name}.` }]);

    for (const field of node.fields) {
      const result = fieldConfigSchema.safeParse({ type: field.type, config: field.config });
      if (!result.success) throw new z.ZodError([{ code: "custom", path: ["root", "fields", field.key], message: `Invalid configuration for ${field.label}.` }]);
    }
    for (const child of node.children) validateNode(child, depth + 1, false);
  }

  validateNode(parsed.root, 0, true);
  return parsed;
}

export function planCollectionBlueprint(input: ParsedCollectionBlueprint, workspaceId: string, existingSlugs: Iterable<string>, createId: () => string = () => crypto.randomUUID()): PlannedCollectionBlueprint {
  const usedSlugs = new Set(existingSlugs);
  const planned: { id: string; parentId: string | null; node: ParsedCollectionBlueprint["root"]; slug: string }[] = [];

  function reserveSlug(name: string) {
    const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "collection";
    let candidate = base; let suffix = 2;
    while (usedSlugs.has(candidate)) candidate = `${base}-${suffix++}`;
    usedSlugs.add(candidate); return candidate;
  }

  function walk(node: ParsedCollectionBlueprint["root"], parentId: string | null) {
    const id = createId();
    planned.push({ id, parentId, node, slug: reserveSlug(node.name) });
    for (const child of node.children) walk(child, id);
  }
  walk(input.root, null);

  return {
    rootId: planned[0].id,
    collections: planned.map(({ id, parentId, node, slug }) => ({ id, parentId, workspaceId, name: node.name, slug, description: node.description || null })),
    fields: planned.flatMap(({ id, parentId, node }) => {
      const relation = parentId && node.relationToParent ? [{ collectionId: id, key: node.relationToParent.key, label: node.relationToParent.label, type: "relation" as const, required: node.relationToParent.required, position: 0, config: { targetCollectionId: parentId } }] : [];
      return [...relation, ...node.fields.map((field, index) => ({ collectionId: id, key: field.key, label: field.label, type: field.type, required: field.required, position: index + relation.length, config: field.config }))];
    }),
  };
}
