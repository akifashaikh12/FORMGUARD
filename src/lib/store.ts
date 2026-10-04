/**
 * FORMGUARD Zustand store.
 *
 * State lives entirely in memory. Refreshing the page clears everything.
 * No localStorage, no IndexedDB, no server round-trips.
 */

"use client";

import { create } from "zustand";
import type {
  ApplicationTemplate,
  SlotState,
  HistoryEntry,
  HistoryKind,
} from "@/lib/types";
import { validate } from "@/lib/engines/validation";
import { matchFilename } from "@/lib/engines/matching";
import { now } from "@/lib/clock";
import { inspectFile } from "@/lib/browser/inspect";
import {
  compressImage,
  convertToJpeg,
  pdfToJpeg,
  renameFile,
  resizeImage,
} from "@/lib/browser/transform";

export type Step = "landing" | "select" | "requirements" | "upload" | "fix" | "readiness";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function historyEntry(kind: HistoryKind, summary: string): HistoryEntry {
  return { at: now().toISOString(), kind, summary };
}

/**
 * Build a Map<sha256, { slotId, label }> from all slots that currently have a
 * file, so the validation engine can flag duplicates.
 */
function buildDuplicateMap(
  slots: SlotState[],
  excludeSlotId: string,
): Map<string, { slotId: string; label: string }> {
  const map = new Map<string, { slotId: string; label: string }>();
  for (const slot of slots) {
    if (slot.rule.id !== excludeSlotId && slot.meta) {
      map.set(slot.meta.sha256, {
        slotId: slot.rule.id,
        label: slot.rule.label,
      });
    }
  }
  return map;
}

/** Run validate() for a slot and derive its status. */
function revalidate(slot: SlotState, allSlots: SlotState[]): SlotState {
  if (!slot.meta) {
    return { ...slot, issues: [], status: "empty" };
  }

  const duplicates = buildDuplicateMap(allSlots, slot.rule.id);
  const issues = validate(slot.meta, slot.rule, {
    slots: allSlots,
    currentSlotId: slot.rule.id,
    duplicates,
  });

  const blockingCount = issues.filter((i) => i.severity === "blocking").length;
  const unresolvedConfirm = issues.filter(
    (i) => i.severity === "confirm" && !slot.confirmedIdentity,
  ).length;

  let status: SlotState["status"];
  if (blockingCount > 0) {
    status = "non_compliant";
  } else if (unresolvedConfirm > 0) {
    status = "needs_confirmation";
  } else {
    status = "verified";
  }

  return { ...slot, issues, status };
}

/** Re-validate every slot (duplicate map changes when any slot changes). */
function revalidateAll(slots: SlotState[]): SlotState[] {
  return slots.map((slot) => revalidate(slot, slots));
}

// ──────────────────────────────────────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────────────────────────────────────

interface FormguardState {
  template: ApplicationTemplate | null;
  slots: SlotState[];
  /** Files dropped that could not be auto-assigned to any slot. */
  unassignedFiles: File[];
  step: Step;

  // Actions
  selectTemplate: (template: ApplicationTemplate) => void;
  goToStep: (step: Step) => void;
  addFile: (file: File, slotId: string) => Promise<void>;
  addFiles: (files: File[]) => Promise<void>; // auto-assign
  replaceFile: (file: File, slotId: string) => Promise<void>;
  removeFile: (slotId: string) => void;
  confirmIdentity: (slotId: string) => void;
  applyFix: (slotId: string) => Promise<void>;
  applyAllSafeFixes: () => Promise<void>;
  reset: () => void;
}

export const useFormguardStore = create<FormguardState>()((set, get) => ({
  template: null,
  slots: [],
  unassignedFiles: [],
  step: "landing",

  selectTemplate(template) {
    const slots: SlotState[] = template.documents.map((rule) => ({
      rule,
      issues: [],
      confirmedIdentity: false,
      history: [],
      status: "empty",
    }));
    set({ template, slots, unassignedFiles: [], step: "requirements" });
  },

  goToStep(step) {
    set({ step });
  },

  async addFile(file, slotId) {
    const meta = await inspectFile(file);
    const { slots } = get();
    const updated = slots.map((s) => {
      if (s.rule.id !== slotId) return s;
      return {
        ...s,
        file,
        meta,
        confirmedIdentity: false,
        history: [
          ...s.history,
          historyEntry("uploaded", `Uploaded "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`),
        ],
      };
    });
    set({ slots: revalidateAll(updated) });
  },

  async addFiles(files) {
    const { slots, template } = get();
    if (!template) return;
    const allRules = template.documents;

    const unassigned: File[] = [];
    // Track which slots already received a file this batch (first-match wins)
    const taken = new Set<string>(
      slots.filter((s) => s.file).map((s) => s.rule.id),
    );

    const updates: { slotId: string; file: File }[] = [];

    for (const file of files) {
      // Try to find the best matching unoccupied slot
      let bestSlotId: string | null = null;
      let bestScore = 0; // match=3, unclear=2, mismatch=0

      for (const rule of allRules) {
        if (taken.has(rule.id)) continue;
        const result = matchFilename(file.name, rule, allRules);
        const score = result === "match" ? 3 : result === "unclear" ? 2 : 0;
        if (score > bestScore) {
          bestScore = score;
          bestSlotId = rule.id;
        }
      }

      if (bestSlotId && bestScore >= 2) {
        taken.add(bestSlotId);
        updates.push({ slotId: bestSlotId, file });
      } else {
        unassigned.push(file);
      }
    }

    // Inspect & apply updates
    let updatedSlots = slots;
    for (const { slotId, file } of updates) {
      const meta = await inspectFile(file);
      updatedSlots = updatedSlots.map((s) => {
        if (s.rule.id !== slotId) return s;
        return {
          ...s,
          file,
          meta,
          confirmedIdentity: false,
          history: [
            ...s.history,
            historyEntry("uploaded", `Uploaded "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`),
          ],
        };
      });
    }

    set({
      slots: revalidateAll(updatedSlots),
      unassignedFiles: [...get().unassignedFiles, ...unassigned],
    });
  },

  async replaceFile(file, slotId) {
    const meta = await inspectFile(file);
    const { slots } = get();
    const updated = slots.map((s) => {
      if (s.rule.id !== slotId) return s;
      return {
        ...s,
        file,
        meta,
        confirmedIdentity: false,
        history: [
          ...s.history,
          historyEntry("replaced", `Replaced with "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`),
        ],
      };
    });
    set({ slots: revalidateAll(updated) });
  },

  removeFile(slotId) {
    const { slots } = get();
    const updated = slots.map((s) => {
      if (s.rule.id !== slotId) return s;
      return {
        ...s,
        file: undefined,
        meta: undefined,
        issues: [],
        confirmedIdentity: false,
        history: [...s.history, historyEntry("replaced", "File removed")],
        status: "empty" as const,
      };
    });
    set({ slots: revalidateAll(updated) });
  },

  confirmIdentity(slotId) {
    const { slots } = get();
    const updated = slots.map((s) => {
      if (s.rule.id !== slotId) return s;
      return {
        ...s,
        confirmedIdentity: true,
        history: [
          ...s.history,
          historyEntry("confirmed", `Confirmed identity for "${s.rule.label}"`),
        ],
      };
    });
    set({ slots: revalidateAll(updated) });
  },

  async applyFix(slotId) {
    const { slots } = get();
    const slot = slots.find((s) => s.rule.id === slotId);
    if (!slot?.file || !slot.meta) return;

    const issue = slot.issues.find((i) => i.fix != null);
    if (!issue?.fix) return;

    let result: { file: File; summary: string };

    if (issue.fix === "compress") {
      if (slot.meta.realType === "pdf") {
        // PDF that needs conversion to JPG first
        result = await pdfToJpeg(slot.file, slot.rule);
      } else {
        result = await compressImage(slot.file, slot.rule);
      }
    } else if (issue.fix === "resize") {
      result = await resizeImage(slot.file, slot.rule);
    } else if (issue.fix === "convert") {
      if (slot.meta.realType === "pdf") {
        result = await pdfToJpeg(slot.file, slot.rule);
      } else {
        result = await convertToJpeg(slot.file, slot.rule);
      }
    } else if (issue.fix === "rename") {
      result = renameFile(slot.file, slot.rule.suggestedFilename);
    } else {
      return;
    }

    const kind: HistoryKind =
      issue.fix === "compress"
        ? "compressed"
        : issue.fix === "resize"
          ? "resized"
          : issue.fix === "convert"
            ? "converted"
            : "renamed";

    const newMeta = await inspectFile(result.file);
    const updated = slots.map((s) => {
      if (s.rule.id !== slotId) return s;
      return {
        ...s,
        file: result.file,
        meta: newMeta,
        confirmedIdentity: s.confirmedIdentity,
        history: [...s.history, historyEntry(kind, result.summary)],
      };
    });
    set({ slots: revalidateAll(updated) });
  },

  async applyAllSafeFixes() {
    const { slots } = get();
    const fixable = slots.filter(
      (s) =>
        s.file &&
        s.issues.some(
          (i) => i.fix != null && i.fix !== "rename" && i.severity === "blocking",
        ),
    );
    for (const slot of fixable) {
      await get().applyFix(slot.rule.id);
    }
  },

  reset() {
    set({ template: null, slots: [], unassignedFiles: [], step: "landing" });
  },
}));
