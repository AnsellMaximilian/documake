export type BlueprintFieldType = "text" | "number" | "money" | "date" | "boolean" | "select";

export type BlueprintField = {
  key: string;
  label: string;
  type: BlueprintFieldType;
  required?: boolean;
  config?: Record<string, unknown>;
};

export type CollectionBlueprintNode = {
  name: string;
  description?: string;
  relationToParent?: { key: string; label: string; required?: boolean };
  fields: BlueprintField[];
  children: CollectionBlueprintNode[];
};

export type CollectionTemplate = {
  id: string;
  name: string;
  shortDescription: string;
  detail: string;
  root: CollectionBlueprintNode;
};

export const collectionTemplates: CollectionTemplate[] = [
  {
    id: "invoices",
    name: "Invoices",
    shortDescription: "Invoices with complete line-item detail.",
    detail: "Creates Invoices and Invoice items, with every line item linked back to its invoice.",
    root: {
      name: "Invoices",
      description: "Supplier invoices and their source documents.",
      fields: [
        { key: "invoice_number", label: "Invoice number", type: "text", required: true },
        { key: "supplier", label: "Supplier", type: "text", required: true },
        { key: "invoice_date", label: "Invoice date", type: "date", required: true },
        { key: "due_date", label: "Due date", type: "date" },
        { key: "status", label: "Status", type: "select", config: { options: ["Pending", "Paid", "Cancelled"] } },
        { key: "subtotal", label: "Subtotal", type: "money", config: { currency: "IDR" } },
        { key: "tax", label: "Tax", type: "money", config: { currency: "IDR" } },
        { key: "total", label: "Total", type: "money", required: true, config: { currency: "IDR" } },
        { key: "paid", label: "Paid", type: "boolean" },
      ],
      children: [{
        name: "Invoice items",
        description: "The products or services listed on each invoice.",
        relationToParent: { key: "invoice", label: "Invoice", required: true },
        fields: [
          { key: "description", label: "Description", type: "text", required: true },
          { key: "quantity", label: "Quantity", type: "number", required: true },
          { key: "unit_price", label: "Unit price", type: "money", required: true, config: { currency: "IDR" } },
          { key: "line_total", label: "Line total", type: "money", required: true, config: { currency: "IDR" } },
        ],
        children: [],
      }],
    },
  },
  {
    id: "expenses",
    name: "Expenses",
    shortDescription: "Expense claims with itemized costs.",
    detail: "Creates Expenses and Expense items so a receipt can be kept together without flattening every purchase.",
    root: {
      name: "Expenses",
      description: "Business expenses with review state and source evidence.",
      fields: [
        { key: "description", label: "Description", type: "text", required: true },
        { key: "date", label: "Date", type: "date", required: true },
        { key: "category", label: "Category", type: "select", config: { options: ["Travel", "Software", "Office", "Meals", "Other"] } },
        { key: "amount", label: "Amount", type: "money", required: true, config: { currency: "IDR" } },
        { key: "reimbursable", label: "Reimbursable", type: "boolean" },
      ],
      children: [{
        name: "Expense items",
        description: "Individual costs that make up an expense.",
        relationToParent: { key: "expense", label: "Expense", required: true },
        fields: [
          { key: "item", label: "Item", type: "text", required: true },
          { key: "quantity", label: "Quantity", type: "number" },
          { key: "amount", label: "Amount", type: "money", required: true, config: { currency: "IDR" } },
        ],
        children: [],
      }],
    },
  },
  {
    id: "projects",
    name: "Projects & tasks",
    shortDescription: "Projects, tasks, and nested checklist items.",
    detail: "Demonstrates two relationship levels: Tasks belong to Projects, and Checklist items belong to Tasks.",
    root: {
      name: "Projects",
      description: "Projects with related tasks and checklists.",
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "status", label: "Status", type: "select", config: { options: ["Planned", "Active", "Complete"] } },
        { key: "due_date", label: "Due date", type: "date" },
      ],
      children: [{
        name: "Tasks",
        description: "Work items belonging to a project.",
        relationToParent: { key: "project", label: "Project", required: true },
        fields: [
          { key: "title", label: "Title", type: "text", required: true },
          { key: "estimate", label: "Estimate", type: "number" },
          { key: "due_date", label: "Due date", type: "date" },
          { key: "completed", label: "Completed", type: "boolean" },
        ],
        children: [{
          name: "Checklist items",
          description: "Small completion steps within a task.",
          relationToParent: { key: "task", label: "Task", required: true },
          fields: [
            { key: "label", label: "Label", type: "text", required: true },
            { key: "completed", label: "Completed", type: "boolean" },
          ],
          children: [],
        }],
      }],
    },
  },
];

export function getCollectionTemplate(id: string | undefined) {
  return collectionTemplates.find((template) => template.id === id);
}
