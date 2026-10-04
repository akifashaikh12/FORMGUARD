"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useFormguardStore } from "@/lib/store";
import { Stepper, StatusBadge, DeadlineChip, Disclaimer } from "@/components/ui";
import { toast } from "@/components/Toast";
import { computeReadiness } from "@/lib/engines/readiness";
import { now } from "@/lib/clock";
import { formatBytes } from "@/lib/engines/format";
import { Upload, X, RotateCcw, Wrench, CheckCircle, Loader2 } from "lucide-react";
import type { SlotState } from "@/lib/types";

// ── Demo file loader ──────────────────────────────────────────────────────────

async function loadDemoFiles(): Promise<File[]> {
  const names = [
    "aadhaar.pdf",
    "college_document.pdf",
    "marksheet.pdf",
    "bank_passbook.pdf",
    "caste_certificate.pdf",
    "IMG_8392.jpg",
    "signature.pdf",
  ];
  const files: File[] = [];
  for (const name of names) {
    try {
      const res = await fetch(`/demo-files/${name}`);
      if (!res.ok) continue;
      const blob = await res.blob();
      files.push(new File([blob], name, { type: blob.type }));
    } catch {
      // skip missing files silently
    }
  }
  return files;
}

// ── Thumbnail ─────────────────────────────────────────────────────────────────

function FileThumbnail({ file, realType }: { file: File; realType: string }) {
  const isImage = realType === "jpg" || realType === "png";

  // Derive a stable object-URL from the file. useMemo re-runs whenever `file`
  // changes; the cleanup in useEffect revokes the previous URL.
  const src = useMemo(
    () => (isImage ? URL.createObjectURL(file) : null),
    [file, isImage],
  );

  useEffect(() => {
    // revoke the URL when the component unmounts or the file changes
    return () => { if (src) URL.revokeObjectURL(src); };
  }, [src]);

  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="File preview"
      className="w-12 h-12 object-cover rounded border border-gray-200 shrink-0"
    />
  );
}

// ── Document card ─────────────────────────────────────────────────────────────

interface DocumentCardProps {
  slot: SlotState;
  isLoading: boolean;
}

function DocumentCard({ slot, isLoading }: DocumentCardProps) {
  const { addFile, removeFile, confirmIdentity, applyFix } = useFormguardStore((s) => ({
    addFile: s.addFile,
    removeFile: s.removeFile,
    confirmIdentity: s.confirmIdentity,
    applyFix: s.applyFix,
  }));

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [applyingFix, setApplyingFix] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        addFile(file, slot.rule.id).catch(() =>
          toast("error", `Failed to read ${file.name}.`),
        );
      }
    },
    [addFile, slot.rule.id],
  );

  const handleInlineFix = async () => {
    setApplyingFix(true);
    try {
      await applyFix(slot.rule.id);
      toast("success", `Fixed: ${slot.rule.label}`);
    } catch (e: unknown) {
      toast("error", e instanceof Error ? e.message : "Fix failed.");
    } finally {
      setApplyingFix(false);
    }
  };

  const blockingIssues = slot.issues.filter((i) => i.severity === "blocking");
  const confirmIssues = slot.issues.filter(
    (i) => i.severity === "confirm" && !slot.confirmedIdentity,
  );
  const advisoryIssues = slot.issues.filter((i) => i.severity === "advisory");
  const fixableIssue = blockingIssues.find((i) => i.fix != null);
  const needsIdentityBeforeFix =
    confirmIssues.length > 0 && blockingIssues.some((i) => i.fix === "convert");

  const fixLabel: Record<string, string> = {
    compress: "Compress",
    resize: "Resize",
    convert: "Convert to JPG",
    rename: "Rename",
  };

  // Border colour reflects status
  const borderClass =
    isLoading
      ? "border-blue-300"
      : slot.status === "verified"
        ? "border-green-200"
        : slot.status === "non_compliant"
          ? "border-red-200"
          : slot.status === "needs_confirmation"
            ? "border-blue-200"
            : "border-gray-200";

  return (
    <div
      className={`bg-white border rounded-lg transition-all duration-200 ${
        dragging ? "border-blue-400 bg-blue-50" : borderClass
      }`}
    >
      {/* Card header */}
      <div className="flex items-start gap-3 px-4 pt-3 pb-2">
        {/* Thumbnail or loading spinner */}
        {isLoading ? (
          <div className="w-12 h-12 rounded border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
            <Loader2 size={18} className="text-blue-400 animate-spin" aria-label="Processing…" />
          </div>
        ) : slot.file && slot.meta ? (
          <FileThumbnail file={slot.file} realType={slot.meta.realType} />
        ) : null}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900">{slot.rule.label}</span>
            <StatusBadge status={isLoading ? "empty" : slot.status} />
            {isLoading && (
              <span className="text-xs text-blue-500">Checking…</span>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-2">
            <span>{slot.rule.allowedFormats.map((f) => f.toUpperCase()).join(" / ")}</span>
            {slot.rule.maxBytes && <span>max {formatBytes(slot.rule.maxBytes)}</span>}
          </div>
        </div>

        {slot.file && !isLoading && (
          <button
            onClick={() => removeFile(slot.rule.id)}
            className="text-gray-300 hover:text-red-400 p-1 rounded transition-colors"
            aria-label={`Remove file from ${slot.rule.label}`}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* File info row */}
      {slot.meta && slot.file && !isLoading && (
        <div className="px-4 pb-1 text-xs text-gray-500 flex flex-wrap gap-3 items-center">
          <span className="font-mono truncate max-w-[160px]" title={slot.file.name}>
            {slot.file.name}
          </span>
          <span>{formatBytes(slot.meta.size)}</span>
          <span className="uppercase font-semibold text-gray-400">{slot.meta.realType}</span>
          {slot.meta.width && slot.meta.height && (
            <span>{slot.meta.width}×{slot.meta.height}px</span>
          )}
          {slot.meta.pages != null && (
            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
              {slot.meta.pages}p
            </span>
          )}
        </div>
      )}

      {/* Issues + inline quick-actions */}
      {!isLoading && (
        <div className="px-4 pb-2 flex flex-col gap-1.5">
          {/* Blocking issues with quick-fix button */}
          {blockingIssues.map((issue, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-2 text-xs px-2 py-1.5 rounded bg-red-50 border border-red-100"
              role="alert"
            >
              <span className="text-red-700 flex-1">{issue.message}</span>
              {issue.fix && fixableIssue?.code === issue.code && !needsIdentityBeforeFix && (
                <button
                  onClick={handleInlineFix}
                  disabled={applyingFix}
                  className="shrink-0 flex items-center gap-1 px-2 py-0.5 bg-orange-500 text-white rounded text-xs font-medium hover:bg-orange-600 transition-colors disabled:opacity-60"
                >
                  {applyingFix
                    ? <Loader2 size={10} className="animate-spin" />
                    : <Wrench size={10} />
                  }
                  {applyingFix ? "…" : (fixLabel[issue.fix] ?? "Fix")}
                </button>
              )}
            </div>
          ))}

          {/* Confirm issues with inline confirm button */}
          {confirmIssues.map((issue, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-2 text-xs px-2 py-1.5 rounded bg-blue-50 border border-blue-100"
            >
              <span className="text-blue-700 flex-1">{issue.message}</span>
              <button
                onClick={() => {
                  confirmIdentity(slot.rule.id);
                  toast("success", `Confirmed: ${slot.rule.label}`);
                }}
                className="shrink-0 flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                <CheckCircle size={10} />
                Confirm
              </button>
            </div>
          ))}

          {/* Advisory issues */}
          {advisoryIssues.map((issue, i) => (
            <div
              key={i}
              className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-500 border border-gray-100"
            >
              {issue.message}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone / upload button */}
      <div
        className={`mx-4 mb-3 border-2 border-dashed rounded-lg px-3 py-2 transition-colors ${
          dragging ? "border-blue-400" : "border-gray-200 hover:border-gray-300"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors disabled:cursor-not-allowed"
        >
          <Upload size={11} aria-hidden="true" />
          {isLoading ? "Processing…" : slot.file ? "Replace file" : "Upload or drop file"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              addFile(file, slot.rule.id).catch(() =>
                toast("error", `Failed to read ${file.name}.`),
              );
            }
            e.target.value = "";
          }}
          aria-label={`Upload file for ${slot.rule.label}`}
        />
      </div>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({
  verified,
  total,
  confirming,
  blocking,
}: {
  verified: number;
  total: number;
  confirming: number;
  blocking: number;
}) {
  const pct = total === 0 ? 0 : Math.round((verified / total) * 100);
  const allDone = verified === total;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span>
          {verified}/{total} verified
          {confirming > 0 && <span className="ml-2 text-blue-600">· {confirming} to confirm</span>}
          {blocking > 0 && <span className="ml-2 text-red-600">· {blocking} blocking</span>}
        </span>
        <span className={allDone ? "text-green-600 font-semibold" : ""}>{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            allDone
              ? "bg-green-500"
              : blocking > 0
                ? "bg-red-400"
                : confirming > 0
                  ? "bg-blue-500"
                  : "bg-blue-400"
          }`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${verified} of ${total} documents verified`}
        />
      </div>
    </div>
  );
}

// ── Upload screen ─────────────────────────────────────────────────────────────

export function UploadScreen() {
  const { template, slots, loadingSlots, goToStep, addFiles, reset } =
    useFormguardStore((s) => ({
      template: s.template,
      slots: s.slots,
      loadingSlots: s.loadingSlots,
      goToStep: s.goToStep,
      addFiles: s.addFiles,
      reset: s.reset,
    }));

  const [loadingDemo, setLoadingDemo] = useState(false);
  const [globalDragging, setGlobalDragging] = useState(false);

  if (!template) return null;

  const readiness = computeReadiness(slots, template.deadline, now());
  const hasBlockingIssues = slots.some((s) => s.issues.some((i) => i.severity === "blocking"));
  const hasUnresolved = slots.some(
    (s) => s.issues.some((i) => i.severity === "confirm" && !s.confirmedIdentity),
  );
  const allDone = readiness.missing === 0 && !hasBlockingIssues && !hasUnresolved;

  const handleDemoDrop = async () => {
    setLoadingDemo(true);
    try {
      const files = await loadDemoFiles();
      if (files.length === 0) {
        toast("error", "Demo files not found. Run: npm run demo-files");
        return;
      }
      await addFiles(files);
      toast("success", `Loaded ${files.length} demo files`);
    } catch {
      toast("error", "Failed to load demo files.");
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Stepper current="upload" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{template.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Refreshing this page clears all files. Nothing is stored.
          </p>
        </div>
        <DeadlineChip
          deadlineISO={template.deadline}
          daysLeft={readiness.deadlineStatus.daysLeft}
          passed={readiness.deadlineStatus.passed}
        />
      </div>

      {/* Progress bar */}
      <ProgressBar
        verified={readiness.verified}
        total={readiness.total}
        confirming={readiness.confirmPending}
        blocking={readiness.blocking}
      />

      {/* Global drop zone */}
      <div
        className={`mb-4 border-2 border-dashed rounded-lg p-3 text-center text-sm transition-all duration-150 ${
          globalDragging
            ? "border-blue-400 bg-blue-50 text-blue-600 scale-[1.01]"
            : "border-gray-200 text-gray-400"
        }`}
        onDragOver={(e) => { e.preventDefault(); setGlobalDragging(true); }}
        onDragLeave={() => setGlobalDragging(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setGlobalDragging(false);
          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0) {
            await addFiles(files);
            toast("success", `Added ${files.length} file${files.length !== 1 ? "s" : ""}`);
          }
        }}
      >
        {globalDragging ? "Drop to auto-assign files" : "Drop multiple files here to auto-assign"}
      </div>

      {/* Demo button */}
      <div className="mb-4">
        <button
          onClick={handleDemoDrop}
          disabled={loadingDemo}
          className="w-full py-2.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loadingDemo && <Loader2 size={14} className="animate-spin" />}
          {loadingDemo ? "Loading demo files…" : "Try with demo files"}
        </button>
      </div>

      {/* Document cards */}
      <div className="flex flex-col gap-3">
        {slots.map((slot) => (
          <DocumentCard
            key={slot.rule.id}
            slot={slot}
            isLoading={loadingSlots.has(slot.rule.id)}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        {allDone ? (
          <button
            onClick={() => goToStep("readiness")}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <CheckCircle size={15} aria-hidden="true" />
            See readiness result →
          </button>
        ) : (hasBlockingIssues || hasUnresolved) ? (
          <button
            onClick={() => goToStep("fix")}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors text-sm"
          >
            <Wrench size={14} aria-hidden="true" />
            Review &amp; fix all issues
          </button>
        ) : null}
        <button
          onClick={() => goToStep("readiness")}
          className="px-5 py-3 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Check readiness →
        </button>
        <button
          onClick={() => {
            if (confirm("Reset everything and start over?")) reset();
          }}
          className="px-4 py-3 text-sm text-gray-400 hover:text-red-500 flex items-center justify-center gap-1 transition-colors"
        >
          <RotateCcw size={12} aria-hidden="true" />
          Reset
        </button>
      </div>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
