import { describe, expect, it } from "vitest";
import {
  assertCanApprove,
  assertCanMutate,
  parseActor
} from "../../../src/lib/auth";
import { ForbiddenError, UnauthorizedError } from "../../../src/lib/errors";

describe("auth helpers", () => {
  it("parses actor headers", () => {
    const request = new Request("https://example.com", {
      headers: {
        "X-IncidentPilot-User": "alice",
        "X-IncidentPilot-Role": "approver"
      }
    });
    expect(parseActor(request)).toEqual({
      userId: "alice",
      role: "approver",
      workspaceId: undefined
    });
  });

  it("rejects invalid roles", () => {
    const request = new Request("https://example.com", {
      headers: { "X-IncidentPilot-Role": "admin" }
    });
    expect(() => parseActor(request)).toThrow(UnauthorizedError);
  });

  it("allows approvers to approve", () => {
    expect(() =>
      assertCanApprove({ userId: "alice", role: "approver" })
    ).not.toThrow();
  });

  it("blocks viewers from approving", () => {
    expect(() => assertCanApprove({ userId: "bob", role: "viewer" })).toThrow(
      ForbiddenError
    );
  });

  it("blocks viewers from mutating", () => {
    expect(() => assertCanMutate({ userId: "bob", role: "viewer" })).toThrow(
      ForbiddenError
    );
  });
});
