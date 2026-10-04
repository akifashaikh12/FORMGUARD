"use client";

import { useRef, useState, useCallback } from "react";
import { useFormguardStore } from "@/lib/store";
import { Stepper, StatusBadge, DeadlineChip, Disclaimer } from "@/components/ui";
import { computeReadiness } from "@/lib/engines/readiness";
import { now } from "@/lib/clock";
import { formatBytes } from "@/lib/engines/format";
import { Upload, X, RotateCcw, Wrench } from "lucide-react";
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

// ── Document card ─────────────────────────────────────────────────────────────

interface DocumentCardProps {
  slot: SlotState;
}

function DocumentCard({ slot }: DocumentCardProps) {
  const { addFile, removeFile } = useFormguardStore((s) => ({
    addFile: s.addFile,
    removeFile: s.removeFile,
  }));

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) addFile(file, slot.rule.id);
    },
    [addFile, slot.rule.id],
  );

  const blockingIssues = slot.issues.filter((i) => i.severity === "blocking");
  const confirmIssues = slot.issues.filter((i) => i.severity === "confirm");
  const advisoryIssues = slot.issues.filter((i) => i.severity === "advisory");
  const allDisplayIssues = [...blockingIssues, ...confirmIssues, ...advisoryIssues];

  return (
    <div
      className={`bg-white border rounded-lg transition-colors ${
        dragging ? "border-blue-400 bg-blue-50" : "border-gray-200"
      }`}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-2 px-4 pt-3 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900">{slot.rule.label}</span>
            <StatusBadge status={slot.status} />
          </div>
          <div className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-2">
            <span>{slot.rule.allowedFormats.map((f) => f.toUpperCase()).join(" / ")}</span>
            {slot.rule.maxBytes && <span>max {formatBytes(slot.rule.maxBytes)}</span>}
          </div>
        </div>
        {slot.file && (
          <button
            onClick={() => removeFile(slot.rule.id)}
            className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
            aria-label={`Remove file from ${slot.rule.label}`}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* File info */}
      {slot.meta && slot.file && (
        <div className="px-4 pb-2 text-xs text-gray-600 flex flex-wrap gap-3">
          <span className="font-mono">{slot.file.name}</span>
          <span>{formatBytes(slot.meta.size)}</span>
          <span className="uppercase font-semibold text-gray-500">
            {slot.meta.realType}
          </span>
          {slot.meta.width && slot.meta.height && (
            <span>{slot.meta.width}×{slot.meta.height}px</span>
          )}
          {slot.meta.pages && <span>{slot.meta.pages} page{slot.meta.pages !== 1 ? "s" : ""}</span>}
        </div>
      )}

      {/* Issues */}
      {allDisplayIssues.length > 0 && (
        <div className="px-4 pb-2 flex flex-col gap-1">
          {allDisplayIssues.map((issue, i) => (
            <div
              key={i}
              className={`text-xs px-2 py-1 rounded ${
                issue.severity === "blocking"
                  ? "bg-red-50 text-red-700"
                  : issue.severity === "confirm"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-gray-50 text-gray-600"
              }`}
              role="alert"
              aria-live="polite"
            >
              {issue.message}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone / upload button */}
      <div
        className={`mx-4 mb-3 border-2 border-dashed rounded-lg px-3 py-2.5 transition-colors ${
          dragging ? "border-blue-400" : "border-gray-200 hover:border-gray-300"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-blue-600 transition-colors"
        >
          <Upload size={12} aria-hidden="true" />
          {slot.file ? "Replace file" : "Upload or drop file"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) addFile(file, slot.rule.id);
            e.target.value = "";
          }}
          aria-label={`Upload file for ${slot.rule.label}`}
        />
      </div>
    </div>
  );
}

// ── Upload screen ─────────────────────────────────────────────────────────────

export function UploadScreen() {
  const { template, slots, goToStep, addFiles, reset } = useFormguardStore(
    (s) => ({
      template: s.template,
      slots: s.slots,
      goToStep: s.goToStep,
      addFiles: s.addFiles,
      reset: s.reset,
    }),
  );

  const [loadingDemo, setLoadingDemo] = useState(false);
  const [globalDragging, setGlobalDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  if (!template) return null;

  const readiness = computeReadiness(slots, template.deadline, now());
  const fixableSlots = slots.filter(
    (s) => s.file && s.issues.some((i) => i.fix != null && i.severity === "blocking"),
  );
  const hasIssues = slots.some(
    (s) => s.issues.some((i) => i.severity === "blocking" || i.severity === "confirm"),
  );

  const handleDemoDrop = async () => {
    setLoadingDemo(true);
    try {
      const files = await loadDemoFiles();
      if (files.length === 0) {
        alert("Demo files not found. Run: npm run demo-files");
        return;
      }
      await addFiles(files);
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Stepper current="upload" />
      </div>

      {/* Summary */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{template.name}</h1>
          <p
            className="text-sm text-gray-500 mt-1"
            aria-live="polite"
            aria-atomic="true"
          >
            {readiness.verified} / {readiness.total} verified
            {readiness.confirmPending > 0 && ` · ${readiness.confirmPending} needs confirmation`}
            {readiness.blocking > 0 && ` · ${readiness.blocking} issue${readiness.blocking !== 1 ? "s" : ""} to fix`}
            {readiness.missing > 0 && ` · ${readiness.missing} missing`}
          </p>
        </div>
        <DeadlineChip
          deadlineISO={template.deadline}
          daysLeft={readiness.deadlineStatus.daysLeft}
          passed={readiness.deadlineStatus.passed}
        />
      </div>

      {/* Global drop zone */}
      <div
        ref={dropRef}
        className={`mb-4 border-2 border-dashed rounded-lg p-4 text-center text-sm transition-colors ${
          globalDragging ? "border-blue-400 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-400"
        }`}
        onDragOver={(e) => { e.preventDefault(); setGlobalDragging(true); }}
        onDragLeave={() => setGlobalDragging(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setGlobalDragging(false);
          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0) await addFiles(files);
        }}
      >
        Drop multiple files here to auto-assign, or use the slots below
      </div>

      {/* Demo button */}
      <div className="mb-5">
        <button
          onClick={handleDemoDrop}
          disabled={loadingDemo}
          className="w-full py-2.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-60"
        >
          {loadingDemo ? "Loading demo files…" : "Try with demo files"}
        </button>
      </div>

      {/* Document cards */}
      <div className="flex flex-col gap-3">
        {slots.map((slot) => (
          <DocumentCard key={slot.rule.id} slot={slot} />
        ))}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        {hasIssues && (
          <button
            onClick={() => goToStep("fix")}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors text-sm"
          >
            <Wrench size={14} aria-hidden="true" />
            Review &amp; fix issues
          </button>
        )}
        {!hasIssues && readiness.missing === 0 && (
          <button
            onClick={() => goToStep("readiness")}
            className="flex-1 px-5 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            See readiness result →
          </button>
        )}
        {fixableSlots.length > 0 && (
          <button
            onClick={() => goToStep("fix")}
            className="px-5 py-3 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fix {fixableSlots.length} issue{fixableSlots.length !== 1 ? "s" : ""} →
          </button>
        )}
        <button
          onClick={() => {
            if (confirm("Reset everything and start over?")) reset();
          }}
          className="px-4 py-3 text-sm text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
        >
          <RotateCcw size={12} aria-hidden="true" />
          Reset
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        Refreshing this page clears all uploaded files. Nothing is stored.
      </p>
      <div className="mt-4">
        <Disclaimer />
      </div>
    </div>
  );
}
