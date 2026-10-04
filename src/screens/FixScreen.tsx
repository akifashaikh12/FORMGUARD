"use client";

import { useState } from "react";
import { useFormguardStore } from "@/lib/store";
import { Stepper, Disclaimer } from "@/components/ui";
import { formatBytes } from "@/lib/engines/format";
import { CheckCircle, AlertTriangle, Wrench, ArrowRight } from "lucide-react";
import type { SlotState } from "@/lib/types";

// ── Fix card for a single slot ────────────────────────────────────────────────

interface FixCardProps {
  slot: SlotState;
}

function FixCard({ slot }: FixCardProps) {
  const { applyFix, confirmIdentity, replaceFile } = useFormguardStore((s) => ({
    applyFix: s.applyFix,
    confirmIdentity: s.confirmIdentity,
    replaceFile: s.replaceFile,
  }));

  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<string | null>(null);

  const blockingIssues = slot.issues.filter(
    (i) => i.severity === "blocking" && i.fix != null,
  );
  const confirmIssues = slot.issues.filter(
    (i) => i.severity === "confirm" && !slot.confirmedIdentity,
  );

  const needsIdentityFirst =
    confirmIssues.length > 0 && blockingIssues.some((i) => i.fix === "convert");

  const handleFix = async () => {
    setApplying(true);
    setError(null);
    try {
      // Capture summary from history diff
      const prevHistory = slot.history.length;
      await applyFix(slot.rule.id);
      // The store will re-render; get updated slot from store after
      const updatedSlot = useFormguardStore
        .getState()
        .slots.find((s) => s.rule.id === slot.rule.id);
      const newEntry = updatedSlot?.history[prevHistory];
      if (newEntry) setLastSummary(newEntry.summary);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred.");
    } finally {
      setApplying(false);
    }
  };

  const firstFix = blockingIssues[0];

  if (!firstFix && confirmIssues.length === 0) return null;

  const fixLabel: Record<string, string> = {
    compress: "Compress automatically",
    resize: "Resize automatically",
    convert: "Confirm and convert",
    rename: "Rename automatically",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle size={15} className="text-orange-500 mt-0.5 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900">{slot.rule.label}</div>
          {slot.meta && (
            <div className="text-xs text-gray-400 mt-0.5 font-mono">
              {slot.file?.name} · {formatBytes(slot.meta.size)}
            </div>
          )}
        </div>
      </div>

      {/* Identity confirmation: ask BEFORE conversion */}
      {confirmIssues.length > 0 && (
        <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <p className="text-blue-800 mb-1 font-medium">Identity check</p>
          <p className="text-blue-700 text-xs mb-3">
            This filename may not match the required document: {slot.rule.label}. We cannot safely
            determine whether this is the correct document.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => confirmIdentity(slot.rule.id)}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
            >
              This is my {slot.rule.label}
            </button>
            <label className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 text-xs font-medium rounded hover:bg-blue-50 transition-colors cursor-pointer">
              Replace document
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) replaceFile(file, slot.rule.id);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
      )}

      {/* Blocking fixes — only show when identity is resolved (or not a convert) */}
      {firstFix && !needsIdentityFirst && (
        <div className="mb-3">
          <p className="text-xs text-gray-600 mb-2">{firstFix.message}</p>
          {firstFix.detail && (
            <p className="text-xs text-gray-400 mb-2">{firstFix.detail}</p>
          )}
          <button
            onClick={handleFix}
            disabled={applying}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-xs font-semibold rounded hover:bg-orange-600 transition-colors disabled:opacity-60"
          >
            <Wrench size={12} aria-hidden="true" />
            {applying
              ? "Applying…"
              : firstFix.fix
                ? (fixLabel[firstFix.fix] ?? "Apply fix")
                : "Apply fix"}
          </button>
        </div>
      )}

      {/* After-fix summary */}
      {lastSummary && (
        <div className="text-xs text-green-700 bg-green-50 rounded px-3 py-1.5 flex items-center gap-1">
          <CheckCircle size={12} aria-hidden="true" />
          {lastSummary}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-xs text-red-700 bg-red-50 rounded px-3 py-1.5 mt-1" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

// ── Fix screen ────────────────────────────────────────────────────────────────

export function FixScreen() {
  const { template, slots, goToStep, applyAllSafeFixes } = useFormguardStore(
    (s) => ({
      template: s.template,
      slots: s.slots,
      goToStep: s.goToStep,
      applyAllSafeFixes: s.applyAllSafeFixes,
    }),
  );

  const [applyingAll, setApplyingAll] = useState(false);

  if (!template) return null;

  const actionableSlots = slots.filter(
    (s) =>
      s.file &&
      (s.issues.some((i) => i.severity === "blocking" && i.fix != null) ||
        s.issues.some((i) => i.severity === "confirm" && !s.confirmedIdentity)),
  );

  const safeFixes = slots.filter(
    (s) =>
      s.file &&
      s.issues.some(
        (i) => i.severity === "blocking" && i.fix != null && i.fix !== "rename",
      ),
  );

  const handleApplyAll = async () => {
    setApplyingAll(true);
    try {
      await applyAllSafeFixes();
    } finally {
      setApplyingAll(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Stepper current="fix" />
      </div>

      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fix issues</h1>
          <p className="text-sm text-gray-500 mt-1">
            {actionableSlots.length} item{actionableSlots.length !== 1 ? "s" : ""} need
            your attention.
          </p>
        </div>
        {safeFixes.length > 0 && (
          <button
            onClick={handleApplyAll}
            disabled={applyingAll}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-60"
          >
            <Wrench size={13} aria-hidden="true" />
            {applyingAll ? "Applying…" : `Apply all safe fixes (${safeFixes.length})`}
          </button>
        )}
      </div>

      {actionableSlots.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-8">
          No issues to fix. All documents look good!
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {actionableSlots.map((slot) => (
            <FixCard key={slot.rule.id} slot={slot} />
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => goToStep("readiness")}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          See readiness result
          <ArrowRight size={14} aria-hidden="true" />
        </button>
        <button
          onClick={() => goToStep("upload")}
          className="px-4 py-3 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Back to documents
        </button>
      </div>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
