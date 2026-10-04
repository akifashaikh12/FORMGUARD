"use client";

import { useFormguardStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { ReadinessDial, DeadlineChip, Disclaimer } from "@/components/ui";
import { computeReadiness } from "@/lib/engines/readiness";
import { now } from "@/lib/clock";
import { formatBytes } from "@/lib/engines/format";
import { CheckCircle, AlertTriangle, AlertCircle, Printer, RotateCcw } from "lucide-react";
import type { SlotState } from "@/lib/types";

// ── Per-slot row in the report ────────────────────────────────────────────────

interface SlotRowProps {
  slot: SlotState;
  index: number;
}

function SlotRow({ slot, index }: SlotRowProps) {
  const hasBlocking = slot.issues.some((i) => i.severity === "blocking");
  const hasConfirm = slot.issues.some((i) => i.severity === "confirm");
  const isEmpty = slot.status === "empty";

  return (
    <div
      className={`flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 ${
        hasBlocking || isEmpty ? "opacity-90" : ""
      }`}
    >
      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 shrink-0 mt-0.5">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900">{slot.rule.label}</span>
          {slot.status === "verified" && !hasConfirm && (
            <CheckCircle size={13} className="text-green-600" aria-label="Verified" />
          )}
          {slot.status === "verified" && slot.confirmedIdentity && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
              User confirmed
            </span>
          )}
          {slot.status === "needs_confirmation" && (
            <AlertCircle size={13} className="text-blue-500" aria-label="Needs confirmation" />
          )}
          {(hasBlocking || isEmpty) && (
            <AlertTriangle size={13} className="text-red-500" aria-label="Issue" />
          )}
        </div>
        {slot.meta && slot.file && (
          <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-3">
            <span className="font-mono">{slot.file.name}</span>
            <span>{formatBytes(slot.meta.size)}</span>
            <span className="uppercase">{slot.meta.realType}</span>
            {slot.meta.sha256 && (
              <span className="font-mono text-gray-400">
                SHA-256: {slot.meta.sha256.slice(0, 12)}…
              </span>
            )}
          </div>
        )}
        {slot.history.length > 0 && (
          <div className="mt-1 flex flex-col gap-0.5">
            {slot.history.map((h, i) => (
              <div key={i} className="text-xs text-gray-400">
                <span className="capitalize">{h.kind}</span>: {h.summary}
              </div>
            ))}
          </div>
        )}
        {slot.issues
          .filter((issue) => issue.severity === "blocking")
          .map((issue, i) => (
            <div key={i} className="text-xs text-red-600 mt-0.5">
              ✗ {issue.message}
            </div>
          ))}
        {isEmpty && (
          <div className="text-xs text-gray-400 mt-0.5">No file uploaded.</div>
        )}
      </div>
    </div>
  );
}

// ── Readiness screen ──────────────────────────────────────────────────────────

export function ReadinessScreen() {
  const { template, slots, goToStep, reset } = useFormguardStore(
    useShallow((s) => ({
      template: s.template,
      slots: s.slots,
      goToStep: s.goToStep,
      reset: s.reset,
    })),
  );

  if (!template) return null;

  const currentNow = now();
  const readiness = computeReadiness(slots, template.deadline, currentNow);
  const checkedDate = currentNow.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={
        "max-w-2xl mx-auto px-4 py-10 print-page"
      }
    >
      {/* Screen header (hidden in print) */}
      <div className="no-print mb-6 flex items-center justify-between">
        <button
          onClick={() => goToStep("upload")}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Review documents
        </button>
        <button
          onClick={() => reset()}
          className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
        >
          <RotateCcw size={11} />
          Reset
        </button>
      </div>

      {/* ── REPORT CONTENT (printed + screen) ── */}
      <div id="report-content">
        {/* Report header */}
        <div className="print-only mb-6">
          <div className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-1">
            FORMGUARD — Submission Readiness Report
          </div>
          <div className="text-lg font-bold text-gray-900">{template.name}</div>
          <div className="text-xs text-gray-500 mt-1">
            Checked: {checkedDate}
          </div>
        </div>

        {/* Readiness dial */}
        <div className="mb-6">
          <ReadinessDial
            state={readiness.state}
            verified={readiness.verified}
            total={readiness.total}
          />
        </div>

        {/* Counts row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total", value: readiness.total, cls: "text-gray-900" },
            { label: "Verified", value: readiness.verified, cls: "text-green-700" },
            { label: "Blocking", value: readiness.blocking, cls: readiness.blocking > 0 ? "text-red-600" : "text-gray-400" },
            { label: "Confirmed", value: readiness.userConfirmed, cls: "text-blue-600" },
          ].map(({ label, value, cls }) => (
            <div
              key={label}
              className="bg-white border border-gray-200 rounded-lg p-3 text-center"
            >
              <div className={`text-2xl font-bold ${cls}`}>{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Deadline */}
        <div className="mb-4">
          <DeadlineChip
            deadlineISO={template.deadline}
            daysLeft={readiness.deadlineStatus.daysLeft}
            passed={readiness.deadlineStatus.passed}
          />
        </div>

        {/* Reasons when not ready */}
        {readiness.reasons.length > 0 && (
          <div
            className="mb-5 bg-red-50 border border-red-200 rounded-lg px-4 py-3"
            role="alert"
            aria-live="polite"
          >
            <p className="text-sm font-semibold text-red-700 mb-1">
              Not ready because:
            </p>
            <ul className="text-sm text-red-600 list-disc list-inside space-y-0.5">
              {readiness.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Document checklist */}
        <div className="bg-white border border-gray-200 rounded-lg px-4 divide-y divide-gray-100 mb-6">
          {slots.map((slot, i) => (
            <SlotRow key={slot.rule.id} slot={slot} index={i} />
          ))}
        </div>

        {/* Disclaimer */}
        <div className="text-xs text-gray-400 text-center leading-relaxed mb-4">
          FORMGUARD checks the requirements configured for this application.
          Final acceptance remains with the organization receiving the application.
        </div>
      </div>

      {/* Action buttons (hidden in print) */}
      <div className="no-print mt-4 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => window.print()}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Printer size={14} aria-hidden="true" />
          Download Submission Report
        </button>
        <button
          onClick={() => goToStep("upload")}
          className="px-4 py-3 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Review documents
        </button>
      </div>

      <div className="no-print mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
