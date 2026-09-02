import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { parseCollectionBlueprint, planCollectionBlueprint } from "./blueprints";

const base = {
  root: {
    name: "Projects",
    fields: [{ key: "name", label: "Name", type: "text", required: true, config: {} }],
    children: [{
      name: "Tasks",
      relationToParent: { key: "project", label: "Project", required: true },
      fields: [{ key: "title", label: "Title", type: "text", config: {} }],
      children: [{
        name: "Checklist items",
        relationToParent: { key: "task", label: "Task", required: true },
        fields: [],
        children: [],
      }],
    }],
  },
};

describe("collection blueprints", () => {
  it("accepts recursively nested child collections", () => {
    const parsed = parseCollectionBlueprint(base);
    expect(parsed.root.children[0].relationToParent?.key).toBe("project");
    expect(parsed.root.children[0].children[0].name).toBe("Checklist items");
  });

  it("requires each child to define its parent relation", () => {
    const invalid = structuredClone(base);
    delete (invalid.root.children[0] as Partial<(typeof invalid.root.children)[number]>).relationToParent;
    expect(() => parseCollectionBlueprint(invalid)).toThrow(ZodError);
  });

  it("rejects a generated parent key that conflicts with a child field", () => {
    const invalid = structuredClone(base);
    invalid.root.children[0].fields.push({ key: "project", label: "Duplicate", type: "text", config: {} });
    expect(() => parseCollectionBlueprint(invalid)).toThrow(/unique/i);
  });

  it("validates money and select configuration before any write", () => {
    const invalid = structuredClone(base);
    invalid.root.fields.push({ key: "budget", label: "Budget", type: "money", required: false, config: { currency: "RUPIAH" } });
    expect(() => parseCollectionBlueprint(invalid)).toThrow(/configuration/i);
  });

  it("plans parent relations for every nesting level", () => {
    const parsed = parseCollectionBlueprint(base);
    const ids = ["project-id", "task-id", "checklist-id"];
    const plan = planCollectionBlueprint(parsed, "workspace-id", [], () => ids.shift()!);
    expect(plan.collections).toHaveLength(3);
    expect(plan.fields.find((field) => field.collectionId === "task-id" && field.type === "relation")?.config).toEqual({ targetCollectionId: "project-id" });
    expect(plan.fields.find((field) => field.collectionId === "checklist-id" && field.type === "relation")?.config).toEqual({ targetCollectionId: "task-id" });
  });

  it("reserves unique slugs for existing and sibling collections", () => {
    const parsed = parseCollectionBlueprint({ root: { name: "Tasks", fields: [], children: [{ name: "Tasks", relationToParent: { key: "parent", label: "Parent" }, fields: [], children: [] }] } });
    const ids = ["root-id", "child-id"];
    const plan = planCollectionBlueprint(parsed, "workspace-id", ["tasks"], () => ids.shift()!);
    expect(plan.collections.map((collection) => collection.slug)).toEqual(["tasks-2", "tasks-3"]);
  });
});
