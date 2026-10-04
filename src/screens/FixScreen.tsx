"use client";

import { useState } from "react";
import { useFormguardStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { Stepper, Disclaimer } from "@/components/ui";
import { toast } from "@/components/Toast";
import { formatBytes } from "@/lib/engines/format";
import {
  CheckCircle, AlertTriangle, Wrench, ArrowRight, ArrowDown,
  Loader2,
} from "lucide-react";
import type { SlotState, FileMeta } from "@/lib/types";

// ── Before / after panel ──────────────────────────────────────────────────────

interface BeforeAfterProps {
  before: FileMeta;
  after: FileMeta;
  summary: string;
}

function BeforeAfterPanel({ before, after, summary }: BeforeAfterProps) {
  const sizeImproved = after.size < before.size;
  return (
    <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-xs">
      <div className="flex items-center gap-1.5 text-green-700 font-semibold mb-2">
        <CheckCircle size={12} />
        {summary}
      </div>
      <div className="flex items-center gap-3 text-gray-600 flex-wrap">
        <span className="line-through text-gray-400">{formatBytes(before.size)}</span>
        <ArrowDown size={10} className="text-green-500 rotate-[-90deg]" />
        <span className={sizeImproved ? "text-green-700 font-medium" : ""}>
          {formatBytes(after.size)}
        </span>
        {before.width && after.width && before.width !== after.width && (
          <>
            <span className="text-gray-300">·</span>
            <span className="line-through text-gray-400">{before.width}×{before.height}px</span>
            <ArrowDown size={10} className="text-green-500 rotate-[-90deg]" />
            <span className="text-green-700 font-medium">{after.width}×{after.height}px</span>
          </>
        )}
        {before.realType !== after.realType && (
          <>
            <span className="text-gray-300">·</span>
            <span className="uppercase line-through text-gray-400">{before.realType}</span>
            <ArrowDown size={10} className="text-green-500 rotate-[-90deg]" />
            <span className="uppercase text-green-700 font-medium">{after.realType}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Fix card ──────────────────────────────────────────────────────────────────

interface FixCardProps {
  slot: SlotState;
}

function FixCard({ slot }: FixCardProps) {
  const { applyFix, confirmIdentity, replaceFile, loadingSlots } = useFormguardStore(
    useShallow((s) => ({
      applyFix: s.applyFix,
      confirmIdentity: s.confirmIdentity,
      replaceFile: s.replaceFile,
      loadingSlots: s.loadingSlots,
    })),
  );

  const isLoading = loadingSlots.has(slot.rule.id);
  const [error, setError] = useState<string | null>(null);
  const [beforeAfter, setBeforeAfter] = useState<{
    before: FileMeta;
    after: FileMeta;
    summary: string;
  } | null>(null);

  const blockingIssues = slot.issues.filter(
    (i) => i.severity === "blocking" && i.fix != null,
  );
  const confirmIssues = slot.issues.filter(
    (i) => i.severity === "confirm" && !slot.confirmedIdentity,
  );

  const needsIdentityFirst =
    confirmIssues.length > 0 && blockingIssues.some((i) => i.fix === "convert");

  const handleFix = async () => {
    setError(null);
    const prevMeta = slot.meta;
    const prevHistLen = slot.history.length;
    try {
      await applyFix(slot.rule.id);
      const updatedSlot = useFormguardStore
        .getState()
        .slots.find((s) => s.rule.id === slot.rule.id);
      const newEntry = updatedSlot?.history[prevHistLen];
      if (prevMeta && updatedSlot?.meta && newEntry) {
        setBeforeAfter({ before: prevMeta, after: updatedSlot.meta, summary: newEntry.summary });
      }
      toast("success", `Fixed: ${slot.rule.label}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Fix failed.";
      setError(msg);
      toast("error", msg);
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
    <div
      className={`bg-white border rounded-lg p-4 transition-all duration-200 ${
        isLoading ? "border-blue-200 opacity-80" : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle size={15} className="text-orange-500 mt-0.5 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900">{slot.rule.label}</div>
          {slot.meta && (
            <div className="text-xs text-gray-400 mt-0.5 font-mono">
              {slot.file?.name} · {formatBytes(slot.meta.size)}
              {slot.meta.width && slot.meta.height && ` · ${slot.meta.width}×${slot.meta.height}px`}
            </div>
          )}
        </div>
        {isLoading && (
          <Loader2 size={15} className="text-blue-500 animate-spin shrink-0" />
        )}
      </div>

      {/* Identity confirmation */}
      {confirmIssues.length > 0 && (
        <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <p className="text-blue-800 mb-1 font-medium">Identity check</p>
          <p className="text-blue-700 text-xs mb-3">
            This filename may not match the required document: {slot.rule.label}. We cannot
            safely determine whether this is the correct document.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                confirmIdentity(slot.rule.id);
                toast("success", `Confirmed: ${slot.rule.label}`);
              }}
              disabled={isLoading}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors disabled:opacity-60"
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
                  if (file) {
                    replaceFile(file, slot.rule.id).catch(() =>
                      toast("error", `Failed to read ${file.name}.`),
                    );
                  }
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
      )}

      {/* Blocking fix */}
      {firstFix && !needsIdentityFirst && (
        <div className="mb-2">
          <p className="text-xs text-gray-600 mb-1.5">{firstFix.message}</p>
          {firstFix.detail && (
            <p className="text-xs text-gray-400 mb-2">{firstFix.detail}</p>
          )}
          <button
            onClick={handleFix}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-xs font-semibold rounded hover:bg-orange-600 transition-colors disabled:opacity-60"
          >
            {isLoading
              ? <Loader2 size={11} className="animate-spin" />
              : <Wrench size={11} aria-hidden="true" />
            }
            {isLoading
              ? "Applying…"
              : firstFix.fix ? (fixLabel[firstFix.fix] ?? "Apply fix") : "Apply fix"
            }
          </button>
        </div>
      )}

      {/* Before/after panel */}
      {beforeAfter && (
        <BeforeAfterPanel
          before={beforeAfter.before}
          after={beforeAfter.after}
          summary={beforeAfter.summary}
        />
      )}

      {/* Error */}
      {error && (
        <div className="text-xs text-red-700 bg-red-50 rounded px-3 py-1.5 mt-2 border border-red-100" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

// ── Fix screen ────────────────────────────────────────────────────────────────

export function FixScreen() {
  const { template, slots, goToStep, applyAllSafeFixes, loadingSlots } = useFormguardStore(
    useShallow((s) => ({
      template: s.template,
      slots: s.slots,
      goToStep: s.goToStep,
      applyAllSafeFixes: s.applyAllSafeFixes,
      loadingSlots: s.loadingSlots,
    })),
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

  const anyLoading = loadingSlots.size > 0;

  const handleApplyAll = async () => {
    setApplyingAll(true);
    try {
      await applyAllSafeFixes();
      toast("success", "All safe fixes applied");
    } catch {
      toast("error", "Some fixes could not be applied.");
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
            {actionableSlots.length === 0
              ? "All issues resolved."
              : `${actionableSlots.length} item${actionableSlots.length !== 1 ? "s" : ""} need your attention.`}
          </p>
        </div>
        {safeFixes.length > 0 && (
          <button
            onClick={handleApplyAll}
            disabled={applyingAll || anyLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-60"
          >
            {applyingAll
              ? <Loader2 size={13} className="animate-spin" />
              : <Wrench size={13} aria-hidden="true" />
            }
            {applyingAll ? "Applying…" : `Apply all safe fixes (${safeFixes.length})`}
          </button>
        )}
      </div>

      {actionableSlots.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-8 bg-white border border-gray-100 rounded-lg">
          <CheckCircle size={28} className="text-green-500 mx-auto mb-2" />
          All documents look good — no issues to fix.
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
