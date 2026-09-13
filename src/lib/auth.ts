import type { ActorIdentity, UserRole } from "../domain";
import { ForbiddenError, UnauthorizedError } from "./errors";

const APPROVER_ROLES: UserRole[] = ["approver", "operator"];

export function parseActor(request: Request): ActorIdentity {
  const userId = request.headers.get("X-IncidentPilot-User") ?? "web-user";
  const role = (request.headers.get("X-IncidentPilot-Role") ??
    "operator") as UserRole;
  const workspaceId =
    request.headers.get("X-IncidentPilot-Workspace") ?? undefined;

  if (!["viewer", "operator", "approver"].includes(role)) {
    throw new UnauthorizedError(`Invalid role: ${role}`);
  }

  return { userId, role, workspaceId };
}

export function assertCanApprove(actor: ActorIdentity): void {
  if (!APPROVER_ROLES.includes(actor.role)) {
    throw new ForbiddenError("Approval requires operator or approver role", {
      userId: actor.userId,
      role: actor.role
    });
  }
}

export function assertCanMutate(actor: ActorIdentity): void {
  if (actor.role === "viewer") {
    throw new ForbiddenError("Viewers cannot mutate incidents or remediation", {
      userId: actor.userId
    });
  }
}
