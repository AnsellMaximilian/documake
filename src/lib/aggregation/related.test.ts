import { describe, expect, it } from "vitest";
import { buildIncomingRelationGroups, summarizeRelatedRecords } from "./related";

describe("related record summaries", () => {
  it("separates a draft-inclusive working sum from the confirmed sum", () => {
    const summaries = summarizeRelatedRecords(
      [{ key: "line_total", label: "Line total", type: "money", config: { currency: "IDR" } }],
      [
        { status: "confirmed", values: { line_total: 120_000 } },
        { status: "draft", values: { line_total: 60_000 } },
        { status: "draft", values: { line_total: "untrusted" } },
      ],
    );

    expect(summaries[0].working).toEqual({ sum: 180_000, average: 90_000, valueCount: 2 });
    expect(summaries[0].confirmed).toEqual({ sum: 120_000, average: 120_000, valueCount: 1 });
  });

  it("keeps schema-defined child groups visible before they have records", () => {
    const relationField = { id: "project-field", collectionId: "tasks", key: "project", label: "Project", type: "relation", config: {} };
    const fields = [relationField, { id: "title-field", collectionId: "tasks", key: "title", label: "Title", type: "text", config: {} }];
    const groups = buildIncomingRelationGroups(
      [{ field: relationField, collection: { id: "tasks", name: "Tasks" } }],
      [],
      fields,
    );
    expect(groups).toMatchObject([{ collection: { id: "tasks", name: "Tasks" }, totalCount: 0, confirmedCount: 0, records: [] }]);
  });
});
