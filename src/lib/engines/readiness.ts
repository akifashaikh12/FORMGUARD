/**
 * Readiness computation engine.
 *
 * Pure function — no DOM, no React, no imports from browser code.
 *
 * `computeReadiness` takes the current slot states and a deadline string and
 * returns a structured summary of the application's submission readiness.
 */

import type { ReadinessState, SlotState } from "@/lib/types";

export interface DeadlineStatus {
  passed: boolean;
  daysLeft: number;
}

export interface ReadinessResult {
  state: ReadinessState;
  total: number;
  verified: number;
  userConfirmed: number;
  blocking: number;
  confirmPending: number;
  missing: number;
  deadlineStatus: DeadlineStatus;
  reasons: string[];
}

/**
 * Compute how many whole calendar days remain until the deadline.
 * Negative when the deadline has passed.
 */
function daysUntilDeadline(deadlineISO: string, now: Date): number {
  const deadline = new Date(deadlineISO);
  const diffMs = deadline.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function computeReadiness(
  slots: readonly SlotState[],
  deadlineISO: string,
  now: Date,
): ReadinessResult {
  const total = slots.length;
  let verified = 0;
  let userConfirmed = 0;
  let blocking = 0;
  let confirmPending = 0;
  let missing = 0;

  for (const slot of slots) {
    if (slot.status === "empty") {
      missing += 1;
      continue;
    }

    const blockingIssues = slot.issues.filter((i) => i.severity === "blocking");
    const confirmIssues = slot.issues.filter(
      (i) => i.severity === "confirm" && !slot.confirmedIdentity,
    );

    blocking += blockingIssues.length;

    if (confirmIssues.length > 0) {
      confirmPending += 1;
    }

    if (slot.confirmedIdentity) {
      userConfirmed += 1;
    }

    if (slot.status === "verified") {
      verified += 1;
    }
  }

  const daysLeft = daysUntilDeadline(deadlineISO, now);
  const deadlinePassed = daysLeft < 0;
  const deadlineStatus: DeadlineStatus = {
    passed: deadlinePassed,
    daysLeft: Math.max(0, daysLeft),
  };

  // Build plain-language reasons for every failing condition
  const reasons: string[] = [];

  if (missing > 0) {
    reasons.push(
      `${missing} ${missing === 1 ? "document is" : "documents are"} missing.`,
    );
  }
  if (blocking > 0) {
    reasons.push(
      `${blocking} ${blocking === 1 ? "issue requires" : "issues require"} attention before submission.`,
    );
  }
  if (confirmPending > 0) {
    reasons.push(
      `${confirmPending} ${confirmPending === 1 ? "document needs" : "documents need"} your confirmation.`,
    );
  }
  if (deadlinePassed) {
    reasons.push("The submission deadline has passed.");
  }

  // Determine readiness state
  let state: ReadinessState;
  if (deadlinePassed || missing > 0 || blocking > 0) {
    state = "NOT_READY";
  } else if (confirmPending > 0) {
    state = "CONFIRM";
  } else {
    state = "READY";
  }

  return {
    state,
    total,
    verified,
    userConfirmed,
    blocking,
    confirmPending,
    missing,
    deadlineStatus,
    reasons,
  };
}
