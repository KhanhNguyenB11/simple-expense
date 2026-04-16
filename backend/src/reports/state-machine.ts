import { BadRequestException } from "@nestjs/common";
import { ReportStatus } from "../generated/prisma";

/**
 * Decision: REJECTED reports transition directly to SUBMITTED on re-submit.
 * Users can edit items while a report is in REJECTED state, then re-submit.
 * No detour through DRAFT is required — it would add a step with no benefit.
 * See DECISIONS.md for full rationale.
 */

type Action = "submit" | "approve" | "reject";

interface TransitionDef {
  from: ReportStatus[];
  to: ReportStatus;
  allowedRoles: Array<"user" | "admin">;
}

const TRANSITIONS: Record<Action, TransitionDef> = {
  submit: {
    from: [ReportStatus.DRAFT, ReportStatus.REJECTED],
    to: ReportStatus.SUBMITTED,
    allowedRoles: ["user"],
  },
  approve: {
    from: [ReportStatus.SUBMITTED],
    to: ReportStatus.APPROVED,
    allowedRoles: ["admin"],
  },
  reject: {
    from: [ReportStatus.SUBMITTED],
    to: ReportStatus.REJECTED,
    allowedRoles: ["admin"],
  },
};

export function applyTransition(
  currentStatus: ReportStatus,
  action: Action,
  role: "user" | "admin",
): ReportStatus {
  const def = TRANSITIONS[action];
  if (!def) throw new BadRequestException(`Unknown action: ${action}`);

  if (!def.allowedRoles.includes(role)) {
    throw new BadRequestException(
      `Role '${role}' is not allowed to perform '${action}'`,
    );
  }

  if (!def.from.includes(currentStatus)) {
    throw new BadRequestException(
      `Cannot '${action}' a report with status '${currentStatus}'. ` +
        `Allowed from: ${def.from.join(", ")}`,
    );
  }

  return def.to;
}

export function assertItemsEditable(status: ReportStatus): void {
  if (status !== ReportStatus.DRAFT && status !== ReportStatus.REJECTED) {
    throw new BadRequestException(
      `Expense items can only be modified on reports in DRAFT or REJECTED status. Current: ${status}`,
    );
  }
}
