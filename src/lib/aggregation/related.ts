import { computeAggregation } from "@/lib/aggregation/compute";

type NumericField = {
  key: string;
  label: string;
  type: string;
  config: Record<string, unknown>;
};

type RelatedRecord = {
  status: "draft" | "confirmed";
  values: Record<string, unknown>;
};

type RelationField = NumericField & {
  id: string;
  collectionId: string;
};

export function summarizeRelatedRecords(fields: NumericField[], records: RelatedRecord[]) {
  return fields
    .filter((field) => field.type === "number" || field.type === "money")
    .map((field) => {
      const allValues = records
        .map((record) => record.values[field.key])
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      const confirmedValues = records
        .filter((record) => record.status === "confirmed")
        .map((record) => record.values[field.key])
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

      return {
        fieldKey: field.key,
        label: field.label,
        type: field.type,
        config: field.config,
        working: {
          sum: computeAggregation("sum", allValues),
          average: computeAggregation("average", allValues),
          valueCount: allValues.length,
        },
        confirmed: {
          sum: computeAggregation("sum", confirmedValues),
          average: computeAggregation("average", confirmedValues),
          valueCount: confirmedValues.length,
        },
      };
    });
}

export function buildIncomingRelationGroups<
  Field extends RelationField,
  RecordRow extends RelatedRecord & { id: string },
  Collection extends { id: string; name: string },
>(definitions: { field: Field; collection: Collection }[], linkedRows: { fieldId: string; record: RecordRow }[], collectionFields: Field[]) {
  return definitions.map((definition) => {
    const records = linkedRows.filter((row) => row.fieldId === definition.field.id).map((row) => row.record);
    const fields = collectionFields.filter((field) => field.collectionId === definition.collection.id);
    return {
      field: { id: definition.field.id, key: definition.field.key, label: definition.field.label },
      collection: { id: definition.collection.id, name: definition.collection.name },
      fields,
      records,
      totalCount: records.length,
      confirmedCount: records.filter((record) => record.status === "confirmed").length,
      summaries: summarizeRelatedRecords(fields, records),
    };
  });
}
