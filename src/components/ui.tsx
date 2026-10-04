"use client";

import { CheckCircle, AlertCircle, AlertTriangle, Info, Clock } from "lucide-react";
import type { SlotStatus, ReadinessState } from "@/lib/types";

// ── Status badge ──────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: SlotStatus;
}

const STATUS_CONFIG: Record<
  SlotStatus,
  { label: string; className: string; Icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  empty: { label: "Empty", className: "bg-gray-100 text-gray-600", Icon: Info },
  verified: { label: "Verified", className: "bg-green-100 text-green-700", Icon: CheckCircle },
  needs_confirmation: { label: "Needs confirmation", className: "bg-blue-100 text-blue-700", Icon: AlertCircle },
  non_compliant: { label: "Issue", className: "bg-red-100 text-red-700", Icon: AlertTriangle },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className, Icon } = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${className}`}
      aria-label={`Status: ${label}`}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}

// ── Readiness dial ────────────────────────────────────────────────────────────

interface ReadinessDialProps {
  state: ReadinessState;
  verified: number;
  total: number;
}

export function ReadinessDial({ state, verified, total }: ReadinessDialProps) {
  const config: Record<ReadinessState, { label: string; className: string; bg: string }> = {
    READY: { label: "READY TO SUBMIT", className: "text-green-700 border-green-300 bg-green-50", bg: "bg-green-500" },
    CONFIRM: { label: "CONFIRMATIONS NEEDED", className: "text-blue-700 border-blue-300 bg-blue-50", bg: "bg-blue-500" },
    NOT_READY: { label: "NOT READY", className: "text-red-700 border-red-300 bg-red-50", bg: "bg-red-500" },
  };
  const { label, className } = config[state];
  return (
    <div className={`rounded-lg border-2 px-6 py-4 text-center ${className}`}>
      <div className="text-2xl font-bold tracking-wide">{label}</div>
      <div className="text-sm mt-1 opacity-80">{verified} / {total} documents verified</div>
    </div>
  );
}

// ── Privacy badge ─────────────────────────────────────────────────────────────

export function PrivacyBadge() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-600 border border-gray-200">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 1L2 3.5V8c0 3.3 2.5 6.1 6 7 3.5-.9 6-3.7 6-7V3.5L8 1z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      </svg>
      Processed in this browser. No account. No storage. Nothing leaves your device.
    </div>
  );
}

// ── Deadline chip ─────────────────────────────────────────────────────────────

interface DeadlineChipProps {
  deadlineISO: string;
  daysLeft: number;
  passed: boolean;
}

export function DeadlineChip({ deadlineISO, daysLeft, passed }: DeadlineChipProps) {
  const formatted = new Date(deadlineISO).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-medium ${
        passed ? "text-red-600" : daysLeft <= 7 ? "text-orange-600" : "text-gray-700"
      }`}
    >
      <Clock size={14} aria-hidden="true" />
      {passed
        ? `Deadline passed (${formatted})`
        : daysLeft === 0
          ? `Deadline today (${formatted})`
          : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left · ${formatted}`}
    </span>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ children, className = "" }: SectionCardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

// ── Stepper ───────────────────────────────────────────────────────────────────

const STEPS = ["Select", "Requirements", "Upload & Check", "Fix", "Readiness"] as const;
const STEP_KEYS = ["select", "requirements", "upload", "fix", "readiness"] as const;
type StepKey = typeof STEP_KEYS[number];

interface StepperProps {
  current: StepKey;
}

export function Stepper({ current }: StepperProps) {
  const currentIndex = STEP_KEYS.indexOf(current);
  return (
    <nav aria-label="Progress steps" className="flex items-center gap-2 flex-wrap">
      {STEPS.map((label, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <div className="w-4 h-px bg-gray-300" aria-hidden="true" />}
            <div
              className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                active
                  ? "bg-blue-600 text-white"
                  : done
                    ? "bg-gray-200 text-gray-600"
                    : "text-gray-400"
              }`}
              aria-current={active ? "step" : undefined}
            >
              {done && <CheckCircle size={10} />}
              {label}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

// ── Disclaimer footer ─────────────────────────────────────────────────────────

export function Disclaimer() {
  return (
    <p className="text-xs text-gray-500 text-center">
      FORMGUARD checks the requirements configured for this application. It does not guarantee acceptance by the receiving organization.
    </p>
  );
}
