/**
 * Tests for the readiness computation engine.
 */

import { describe, it, expect } from "vitest";
import { computeReadiness } from "@/lib/engines/readiness";
import type { DocumentRule, Issue, SlotState } from "@/lib/types";

const DEADLINE_FUTURE = "2099-01-01T00:00:00Z";
const DEADLINE_PAST = "2000-01-01T00:00:00Z";

const NOW = new Date("2025-06-01T12:00:00Z");
const NOW_AFTER_DEADLINE = new Date("2027-01-01T00:00:00Z");

function makeRule(id: string): DocumentRule {
  return {
    id,
    label: id,
    allowedFormats: ["pdf"],
    keywords: [id],
    suggestedFilename: `${id}.pdf`,
    isImage: false,
  };
}

function makeSlot(
  ruleId: string,
  overrides: Partial<SlotState> = {},
): SlotState {
  return {
    rule: makeRule(ruleId),
    issues: [],
    confirmedIdentity: false,
    history: [],
    status: "empty",
    ...overrides,
  };
}

function blockingIssue(): Issue {
  return {
    code: "WRONG_FORMAT",
    severity: "blocking",
    message: "Wrong format.",
  };
}

function confirmIssue(): Issue {
  return {
    code: "IDENTITY",
    severity: "confirm",
    message: "May not match.",
  };
}

// ----- READY -----

describe("READY", () => {
  it("returns READY when all slots are verified, no issues, deadline not passed", () => {
    const slots: SlotState[] = [
      makeSlot("doc1", { status: "verified", file: {} as File }),
      makeSlot("doc2", { status: "verified", file: {} as File }),
    ];
    const result = computeReadiness(slots, DEADLINE_FUTURE, NOW);
    expect(result.state).toBe("READY");
    expect(result.total).toBe(2);
    expect(result.verified).toBe(2);
    expect(result.blocking).toBe(0);
    expect(result.missing).toBe(0);
    expect(result.reasons).toHaveLength(0);
  });
});

// ----- NOT_READY due to missing slots -----

describe("NOT_READY — missing slots", () => {
  it("returns NOT_READY when at least one slot is empty", () => {
    const slots: SlotState[] = [
      makeSlot("doc1", { status: "verified", file: {} as File }),
      makeSlot("doc2"), // empty
    ];
    const result = computeReadiness(slots, DEADLINE_FUTURE, NOW);
    expect(result.state).toBe("NOT_READY");
    expect(result.missing).toBe(1);
    expect(result.reasons.some((r) => r.includes("missing"))).toBe(true);
  });
});

// ----- NOT_READY due to blocking issues -----

describe("NOT_READY — blocking issues", () => {
  it("returns NOT_READY when a slot has a blocking issue", () => {
    const slots: SlotState[] = [
      makeSlot("doc1", {
        status: "non_compliant",
        file: {} as File,
        issues: [blockingIssue()],
      }),
    ];
    const result = computeReadiness(slots, DEADLINE_FUTURE, NOW);
    expect(result.state).toBe("NOT_READY");
    expect(result.blocking).toBe(1);
  });
});

// ----- CONFIRM -----

describe("CONFIRM", () => {
  it("returns CONFIRM when the only problems are unresolved confirm issues", () => {
    const slots: SlotState[] = [
      makeSlot("doc1", {
        status: "needs_confirmation",
        file: {} as File,
        issues: [confirmIssue()],
        confirmedIdentity: false,
      }),
    ];
    const result = computeReadiness(slots, DEADLINE_FUTURE, NOW);
    expect(result.state).toBe("CONFIRM");
    expect(result.confirmPending).toBe(1);
  });

  it("returns READY when confirm issues are all resolved (confirmed)", () => {
    const slots: SlotState[] = [
      makeSlot("doc1", {
        status: "verified",
        file: {} as File,
        issues: [confirmIssue()],
        confirmedIdentity: true,
      }),
    ];
    const result = computeReadiness(slots, DEADLINE_FUTURE, NOW);
    expect(result.state).toBe("READY");
    expect(result.confirmPending).toBe(0);
    expect(result.userConfirmed).toBe(1);
  });
});

// ----- Deadline -----

describe("deadline", () => {
  it("returns NOT_READY when deadline has passed", () => {
    const slots: SlotState[] = [
      makeSlot("doc1", { status: "verified", file: {} as File }),
    ];
    const result = computeReadiness(slots, "2026-10-25T23:59:00+05:30", NOW_AFTER_DEADLINE);
    expect(result.state).toBe("NOT_READY");
    expect(result.deadlineStatus.passed).toBe(true);
    expect(result.reasons.some((r) => r.includes("deadline"))).toBe(true);
  });

  it("returns correct daysLeft when deadline is in the future", () => {
    const slots: SlotState[] = [
      makeSlot("doc1", { status: "verified", file: {} as File }),
    ];
    const deadline = "2025-06-11T00:00:00Z";
    const result = computeReadiness(slots, deadline, NOW);
    expect(result.deadlineStatus.passed).toBe(false);
    expect(result.deadlineStatus.daysLeft).toBeGreaterThanOrEqual(9);
  });

  it("returns NOT_READY for PAST deadline constant", () => {
    const slots: SlotState[] = [
      makeSlot("doc1", { status: "verified", file: {} as File }),
    ];
    const result = computeReadiness(slots, DEADLINE_PAST, NOW);
    expect(result.state).toBe("NOT_READY");
    expect(result.deadlineStatus.passed).toBe(true);
  });
});

// ----- userConfirmed count -----

describe("userConfirmed count", () => {
  it("counts slots where confirmedIdentity is true", () => {
    const slots: SlotState[] = [
      makeSlot("doc1", { status: "verified", file: {} as File, confirmedIdentity: true }),
      makeSlot("doc2", { status: "verified", file: {} as File, confirmedIdentity: false }),
    ];
    const result = computeReadiness(slots, DEADLINE_FUTURE, NOW);
    expect(result.userConfirmed).toBe(1);
  });
});
