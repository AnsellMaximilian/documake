"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toolDefinitions } from "./definitions";

const mutationNames = new Set(["create_collection", "add_field", "create_record_draft", "update_record_draft", "confirm_record"]);

export function WebMcpTools() {
  const router = useRouter();
  useEffect(() => {
    if (!("modelContext" in document) || !document.modelContext) return;
    const controller = new AbortController();
    for (const definition of toolDefinitions) {
      document.modelContext.registerTool({
        name: definition.name,
        description: definition.description,
        inputSchema: definition.inputSchema,
        annotations: { readOnlyHint: "readOnly" in definition && definition.readOnly === true, untrustedContentHint: ["search_records", "get_record", "list_documents", "get_document"].includes(definition.name) },
        async execute(input) {
          const response = await fetch("/api/webmcp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: definition.name, input }) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error?.message ?? "Tool operation failed.");
          if (mutationNames.has(definition.name)) { router.refresh(); window.dispatchEvent(new Event("documake:data-changed")); }
          return result.data;
        },
      }, { signal: controller.signal }).catch((error) => { if (!controller.signal.aborted) console.warn(`WebMCP tool ${definition.name} was not registered`, error); });
    }
    return () => controller.abort();
  }, [router]);
  return null;
}
