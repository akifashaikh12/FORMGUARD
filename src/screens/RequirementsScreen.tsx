"use client";

import { useFormguardStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { Stepper, DeadlineChip, Disclaimer } from "@/components/ui";
import { computeReadiness } from "@/lib/engines/readiness";
import { now } from "@/lib/clock";
import { FileText, Image as ImageIcon } from "lucide-react";

export function RequirementsScreen() {
  const { template, slots, goToStep } = useFormguardStore(
    useShallow((s) => ({
      template: s.template,
      slots: s.slots,
      goToStep: s.goToStep,
    })),
  );

  if (!template) return null;

  const readiness = computeReadiness(slots, template.deadline, now());

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-6">
        <Stepper current="requirements" />
      </div>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-900">Before you begin</h1>
        <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">
          Demo application template
        </span>
      </div>

      <p className="text-gray-500 text-sm mb-2">{template.name}</p>
      <div className="mb-6">
        <DeadlineChip
          deadlineISO={template.deadline}
          daysLeft={readiness.deadlineStatus.daysLeft}
          passed={readiness.deadlineStatus.passed}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {template.documents.map((rule, i) => (
          <div key={rule.id} className="px-4 py-3 flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 mt-0.5">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-gray-900">{rule.label}</span>
                {rule.isImage ? (
                  <ImageIcon size={12} className="text-gray-400" aria-hidden="true" />
                ) : (
                  <FileText size={12} className="text-gray-400" aria-hidden="true" />
                )}
              </div>
              {rule.description && (
                <p className="text-xs text-gray-500 mt-0.5">{rule.description}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {/* Format chips */}
                {rule.allowedFormats.map((f) => (
                  <span
                    key={f}
                    className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-mono uppercase"
                  >
                    {f}
                  </span>
                ))}
                {/* Size chips */}
                {rule.maxBytes && (
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                    max {formatKB(rule.maxBytes)}
                  </span>
                )}
                {rule.minBytes && (
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                    min {formatKB(rule.minBytes)}
                  </span>
                )}
                {/* Dimension chips */}
                {rule.minWidth && rule.minHeight && (
                  <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded">
                    min {rule.minWidth}×{rule.minHeight}px
                  </span>
                )}
                {/* Suggested filename */}
                <span className="text-xs px-2 py-0.5 bg-gray-50 text-gray-500 rounded font-mono">
                  {rule.suggestedFilename}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => goToStep("upload")}
          className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Start uploading documents →
        </button>
        <button
          onClick={() => goToStep("select")}
          className="px-4 py-3 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Change application
        </button>
      </div>

      <div className="mt-8">
        <Disclaimer />
      </div>
    </div>
  );
}

function formatKB(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${bytes / (1024 * 1024)} MB`;
  return `${bytes / 1024} KB`;
}
