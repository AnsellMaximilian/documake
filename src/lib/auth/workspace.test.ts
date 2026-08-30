import { describe, expect, it } from "vitest";
import { assertWorkspaceBoundary, DomainError } from "./workspace";
describe("workspace authorization boundary", () => {
  it("allows matching membership context", () => { expect(() => assertWorkspaceBoundary("workspace-a", "workspace-a")).not.toThrow(); });
  it("hides cross-workspace resources", () => { expect(() => assertWorkspaceBoundary("workspace-b", "workspace-a")).toThrow(DomainError); try { assertWorkspaceBoundary("workspace-b", "workspace-a"); } catch (error) { expect((error as DomainError).status).toBe(404); } });
});
