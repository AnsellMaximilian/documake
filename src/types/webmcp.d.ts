type WebMcpJsonSchema = Record<string, unknown>;
type WebMcpTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema: WebMcpJsonSchema;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute(input: Record<string, unknown>): Promise<unknown> | unknown;
};
interface WebMcpModelContext extends EventTarget {
  registerTool(tool: WebMcpTool, options?: { signal?: AbortSignal; exposedTo?: string[] }): Promise<void>;
}
interface Document { readonly modelContext?: WebMcpModelContext; }
