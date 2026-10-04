"use client";

import { useFormguardStore } from "@/lib/store";
import { templates } from "@/lib/templates";
import { Disclaimer } from "@/components/ui";
import { Calendar, FileText } from "lucide-react";

import { useShallow } from "zustand/react/shallow";

export function SelectScreen() {
  const { selectTemplate, goToStep } = useFormguardStore(
    useShallow((s) => ({
      selectTemplate: s.selectTemplate,
      goToStep: s.goToStep,
    })),
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <button
        onClick={() => goToStep("landing")}
        className="text-sm text-blue-600 hover:underline mb-6 flex items-center gap-1"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Select your application</h1>
      <p className="text-gray-500 text-sm mb-8">
        Choose the application type to see its document requirements and begin your check.
      </p>

      <div className="flex flex-col gap-4">
        {templates.map((template) => {
          const deadline = new Date(template.deadline);
          const now = new Date();
          const daysLeft = Math.floor(
            (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          const passed = daysLeft < 0;

          return (
            <button
              key={template.id}
              onClick={() => selectTemplate(template)}
              className="bg-white border border-gray-200 rounded-lg p-5 text-left hover:border-blue-400 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    Demo application template
                  </span>
                  <h2 className="text-base font-semibold text-gray-900 mt-1.5">
                    {template.name}
                  </h2>
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded shrink-0">
                  {template.category}
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-3">{template.description}</p>

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <FileText size={12} aria-hidden="true" />
                  {template.documents.length} documents
                </span>
                <span
                  className={`flex items-center gap-1 ${
                    passed ? "text-red-500" : daysLeft <= 7 ? "text-orange-500" : ""
                  }`}
                >
                  <Calendar size={12} aria-hidden="true" />
                  {passed
                    ? "Deadline passed"
                    : daysLeft === 0
                      ? "Deadline today"
                      : `${daysLeft} days left`}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <Disclaimer />
      </div>
    </div>
  );
}
