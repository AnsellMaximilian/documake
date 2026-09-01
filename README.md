# Documake

Documake is a lightweight, generic structured-record system for experimenting with WebMCP and human/agent collaboration. People define collections and fields, upload messy real-world source documents, enter or review records, connect relations, and calculate basic summaries. A compatible external browser agent can accelerate the same work through WebMCP.

The application intentionally has **no embedded AI model and calls no LLM API**. There is no OpenAI or Anthropic key, OCR pipeline, embedding model, vector database, agent framework, or chat UI. Vision, language understanding, reasoning, and orchestration belong to the user's external agent; Documake remains useful on its own.

## Architecture

```text
Human UI ───────────────┐
                       ├── Next.js route handlers ── shared domain services
Browser agent ─ WebMCP ┘          │                    │
                                  │                    ├── validation + tenancy
                                  │                    ├── Neon Postgres / Drizzle
                                  │                    └── private Vercel Blob
                                  └── Clerk authentication
```

WebMCP is isolated in `src/lib/webmcp`. Client-side callbacks use the current experimental `document.modelContext.registerTool(...)` API, register with an `AbortSignal`, and call authenticated server routes. The callbacks do not contain database or business logic and WebMCP is not a privileged backdoor.

## Product capabilities

- Manual collection and schema creation for text, number, money, date, boolean, select, and relation fields
- Generic JSONB record values validated against relational field metadata
- Draft and confirmed records, explicit record relations, filtering, and server-side aggregation
- Private JPEG, PNG, WebP, and PDF upload with authenticated in-app previews and permanent record provenance
- Starter collection templates plus an optional fictional Suppliers/Invoices seed
- WebMCP tools for schema design, record lookup/drafts/confirmation, documents, aggregation, and grouped analytics
- Workspace membership checks on every server operation

## Requirements

- Node.js 20+
- pnpm 10+
- [Neon](https://neon.com/) Postgres database
- [Clerk](https://clerk.com/) application
- [Vercel Blob](https://vercel.com/docs/vercel-blob) private store

## Local setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

   On PowerShell, use `Copy-Item .env.example .env.local`.

3. Fill in `.env.local`:

   ```bash
   DATABASE_URL=postgresql://...
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
   CLERK_SECRET_KEY=sk_...
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   Vercel Blob can use project-linked OIDC authentication when the app runs through supported Vercel tooling. A Blob read/write token is the straightforward local-development fallback. The token stays server-side. Source previews are streamed through an authenticated application route; storage credentials and unrestricted private URLs are never returned to the browser agent.

4. Apply the checked-in Drizzle migration:

   ```bash
   pnpm db:migrate
   ```

5. Start the application:

   ```bash
   pnpm dev
   ```

The first authenticated Clerk user automatically receives an initial workspace. Missing service variables do not prevent source inspection or dependency installation; the UI shows setup guidance and service-dependent routes return clear configuration errors.

## Database changes

Edit `src/db/schema.ts`, generate a migration, inspect the SQL, and apply it:

```bash
pnpm db:generate
pnpm db:migrate
```

Dynamic user fields do not alter SQL tables. They are stored in `fields`, while record values use JSONB keys that correspond to each immutable field key. Relations and document provenance stay in explicit relational tables.

## Optional fictional demo data

After signing up in Clerk, copy the user's Clerk ID and run:

```bash
pnpm db:seed -- user_123
```

This creates Suppliers and Invoices with fictional records, a relation field, confirmed and draft data, and IDR totals. The script refuses to overwrite collections with those slugs.

## WebMCP

WebMCP is experimental and its browser support and API may change. Documake feature-detects it:

```ts
if ("modelContext" in document) {
  // register tools client-side
}
```

The app uses `document.modelContext.registerTool(...)`, not the older `navigator.modelContext.provideContext` proposal, and installs no WebMCP runtime package. Local TypeScript declarations live in `src/types/webmcp.d.ts`.

To test:

1. Run Documake on HTTPS or localhost and sign in.
2. Open it in a browser/agent environment that implements the current WebMCP imperative API.
3. Ask the agent to list collections or inspect a document page. It should discover the registered tools.
4. Try a draft workflow: upload a source, ask the agent to inspect it visually, call `get_collection_schema`, create a draft with `create_record_draft`, review the result, then call `confirm_record`.
5. Ask for a total and verify the agent calls `aggregate_records` rather than calculating from page context.
6. Ask for a grouped result such as “Which products had the highest line total this month?” and verify it calls `analyze_records`, optionally filtering through a related record’s date field.

Read-only tools declare `readOnlyHint`. Tool responses are compact JSON and include follow-up IDs. Document and record text is treated as untrusted data. A mutation dispatches a small browser event and calls `router.refresh()` so visible views can refetch without realtime infrastructure.

## Vercel deployment

1. Push the repository to a git host and import it into Vercel, or run `vercel link` in this directory.
2. Add the Neon and Clerk variables in the Vercel project settings.
3. Connect a **private** Vercel Blob store to the project. Use Vercel's linked OIDC setup where available, or configure `BLOB_READ_WRITE_TOKEN`.
4. Set `NEXT_PUBLIC_APP_URL` to the trusted production origin and add that origin to Clerk's allowed URLs.
5. Run the database migration against the production Neon branch, then deploy.

Do not make the Blob store public and do not add model API credentials; they are outside this application's architecture.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start Next.js locally |
| `pnpm build` | Create a production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Check strict TypeScript |
| `pnpm test` | Run focused Vitest tests |
| `pnpm db:generate` | Generate Drizzle SQL migrations |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:seed -- <clerk-user-id>` | Add fictional demo data |

## Deliberate exclusions

No built-in chat, LLM API, OCR, embeddings, vector search, workflow builder, background agent, realtime collaboration, public document sharing, formula engine, or type-specific invoice logic. Invoices and Tasks are both expressed through the same generic collection/field/record model.
