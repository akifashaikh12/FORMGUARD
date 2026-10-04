"use client";

import { useFormguardStore } from "@/lib/store";
import { PrivacyBadge, Disclaimer } from "@/components/ui";
import { CheckCircle, Shield, FileCheck } from "lucide-react";

export function LandingScreen() {
  const goToStep = useFormguardStore((s) => s.goToStep);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center text-center gap-10">
      {/* Header */}
      <div>
        <div className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-3">
          FORMGUARD
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
          Know your application is ready<br className="hidden sm:block" /> before you click Submit.
        </h1>
        <p className="text-gray-500 text-base max-w-lg mx-auto">
          Upload your documents, fix the issues FORMGUARD finds, and get a clear
          READY / NOT READY result before you submit your application.
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
        <button
          onClick={() => goToStep("select")}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Start Application Check
        </button>
        <button
          onClick={() => {
            document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
        >
          How it works
        </button>
      </div>

      {/* Privacy */}
      <PrivacyBadge />

      {/* Feature cards */}
      <div id="how-it-works" className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
        {[
          {
            Icon: CheckCircle,
            title: "CHECK",
            desc: "Instantly validate format, size, dimensions, and page count against the template requirements.",
          },
          {
            Icon: FileCheck,
            title: "FIX",
            desc: "Compress oversized photos, convert PDFs to JPG, resize images — all in the browser, automatically.",
          },
          {
            Icon: Shield,
            title: "VERIFY",
            desc: "Review every issue, confirm uncertain documents, and get a printable readiness report.",
          },
        ].map(({ Icon, title, desc }) => (
          <div
            key={title}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className="text-blue-600" aria-hidden="true" />
              <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                {title}
              </span>
            </div>
            <p className="text-sm text-gray-600">{desc}</p>
          </div>
        ))}
      </div>

      {/* Privacy popover */}
      <details className="w-full text-left bg-white border border-gray-200 rounded-lg">
        <summary className="px-4 py-3 text-sm font-medium text-gray-700 cursor-pointer select-none">
          How we handle your files
        </summary>
        <div className="px-4 pb-4 text-sm text-gray-600 space-y-2">
          <p>
            <strong>Your files never leave your device.</strong> FORMGUARD runs
            entirely in your browser using the Web APIs (Canvas, PDF.js,
            crypto.subtle). No files are uploaded to any server.
          </p>
          <p>
            <strong>No storage.</strong> Files and results are held in memory
            only. Refreshing or closing this tab clears everything immediately.
          </p>
          <p>
            <strong>No account required.</strong> There is no login, no
            analytics, and no third-party scripts.
          </p>
        </div>
      </details>

      <Disclaimer />
    </div>
  );
}
