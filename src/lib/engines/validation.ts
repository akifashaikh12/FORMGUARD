/**
 * Pure validation engine.
 *
 * `validate` takes a `FileMeta` (already inspected), a `DocumentRule`, and a
 * small context that includes the other slots in the same template. It returns
 * an ordered list of issues.
 *
 * This module must never import from React or the DOM. File inspection lives in
 * `src/lib/browser/inspect.ts`.
 *
 * Every issue message is written in plain language and, where relevant, includes
 * the exact numbers the user needs to see.
 *
 * The function is pure: it does not mutate its inputs and does not perform any
 * I/O. File inspection and SHA-256 computation happen in `src/lib/browser`.
 */

import type {
  DocumentRule,
  FileMeta,
  Issue,
  SlotState,
} from "@/lib/types";
import { fileTypeLabel, formatBytes } from "./format";
import { matchFilename } from "./matching";

/**
 * Match a normalised token against a rule's keyword list. Used by the IDENTITY
 * check so the prompt can reflect whether the filename looks relevant.
 */
export function tokenMatchesRule(token: string, rule: DocumentRule): boolean {
  const lower = token.toLowerCase();
  return rule.keywords.some((keyword) => keyword.toLowerCase() === lower);
}
export type ValidationContext = {
  readonly slots: readonly SlotState[];
  readonly currentSlotId: string;
  /** SHA-256 of a file that should be treated as already-taken by another slot. */
  readonly duplicates?: ReadonlyMap<string, { slotId: string; label: string }>;
};

const GENERIC_TOKENS = new Set([
  "document",
  "scan",
  "img",
  "image",
  "file",
  "doc",
  "untitled",
  "camscanner",
  "download",
  "pdf",
]);
export function isGenericToken(token: string): boolean {
  if (token.length === 0) {
    return false;
  }
  if (GENERIC_TOKENS.has(token)) {
    return true;
  }
  // Digits-only names like "1", "8392", "document1" are too generic to help.
  if (/^\d+$/.test(token)) {
    return true;
  }
  return false;
}

function isLikelySpoofExtension(name: string, realType: FileMeta["realType"]): boolean {
  const lower = name.toLowerCase();
  const expected = extensionForType(realType);
  if (expected === "") {
    return false;
  }
  const ext = lower.endsWith(".pdf")
    ? "pdf"
    : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
      ? "jpg"
      : lower.endsWith(".png")
        ? "png"
        : "";
  return ext !== "" && ext !== expected;
}

function conversionPossible(
  realType: FileMeta["realType"],
  allowedFormats: DocumentRule["allowedFormats"],
): FileMeta["realType"] | null {
  // We only auto-convert *to* JPG, and only when JPG is an allowed format.
  if (!allowedFormats.includes("jpg")) {
    return null;
  }
  if (realType === "pdf") {
    return "pdf";
  }
  if (realType === "png") {
    return "png";
  }
  return null;
}

function extensionForType(realType: FileMeta["realType"]): string {
  if (realType === "pdf") {
    return "pdf";
  }
  if (realType === "jpg") {
    return "jpg";
  }
  if (realType === "png") {
    return "png";
  }
  return "";
}

export { extensionForType };


function widthHeightValid(
  meta: Pick<FileMeta, "width" | "height">,
  rule: DocumentRule,
): Issue | null {
  const { width, height } = meta;
  if (width == null || height == null) {
    // Missing dimensions are reported elsewhere (unreadable) if the file exists.
    return null;
  }

  const tooNarrow = rule.minWidth != null && width < rule.minWidth;
  const tooWide = rule.maxWidth != null && width > rule.maxWidth;
  const tooShort = rule.minHeight != null && height < rule.minHeight;
  const tooTall = rule.maxHeight != null && height > rule.maxHeight;

  if (!tooNarrow && !tooWide && !tooShort && !tooTall) {
    return null;
  }

  const parts: string[] = [];
  if (tooNarrow) {
    parts.push(`minimum width ${rule.minWidth}px`);
  }
  if (tooWide) {
    parts.push(`maximum width ${rule.maxWidth}px`);
  }
  if (tooShort) {
    parts.push(`minimum height ${rule.minHeight}px`);
  }
  if (tooTall) {
    parts.push(`maximum height ${rule.maxHeight}px`);
  }

  const actual = `${width}×${height}px`;

  return {
    code: "DIMENSIONS",
    severity: "blocking",
    message: `Image size ${actual} is outside the allowed range.`,
    detail: parts.join("; ") + `. Uploaded: ${actual}.`,
    fix: "resize",
  };
}

export function validate(
  meta: FileMeta,
  rule: DocumentRule,
  ctx: ValidationContext,
): Issue[] {
  const issues: Issue[] = [];
  const allowed = rule.allowedFormats;

  // --- TYPE ---
  if (!allowed.includes(meta.realType as DocumentRule["allowedFormats"][number])) {
    const required = allowed.map(fileTypeLabel).join(" or ");
    const uploaded = fileTypeLabel(meta.realType);
    const conversionSource = conversionPossible(meta.realType, allowed);
    const fix: Issue["fix"] =
      conversionSource != null ? ("convert" as const) : undefined;

    issues.push({
      code: "WRONG_FORMAT",
      severity: "blocking",
      message: `Required: ${required}. Uploaded: ${uploaded}.`,
      fix,
    });
  }

  // --- TYPE_SPOOF ---
  if (meta.realType !== "unknown" && isLikelySpoofExtension(meta.name, meta.realType)) {
    const required = allowed.map(fileTypeLabel).join(" or ");
    issues.push({
      code: "TYPE_SPOOF",
      severity: "blocking",
      message: `The file extension does not match its contents.`,
      detail: `${meta.name} is named like one format but contains ${fileTypeLabel(meta.realType)}. The uploaded format must be ${required}.`,
      fix: conversionPossible(meta.realType, allowed) != null ? ("convert" as const) : undefined,
    });
  }

  // --- SIZE_MAX ---
  if (rule.maxBytes != null && meta.size > rule.maxBytes) {
    // Compressible: jpg/png images, and pdfs that can be converted to jpg.
    const isCompressible =
      meta.realType === "jpg" ||
      meta.realType === "png" ||
      (meta.realType === "pdf" && allowed.includes("jpg"));
    const isPdfOnly = meta.realType === "pdf" && !allowed.includes("jpg");
    issues.push({
      code: "TOO_LARGE",
      severity: "blocking",
      message: `${formatBytes(meta.size)} is larger than the maximum ${formatBytes(rule.maxBytes)}.`,
      detail: isPdfOnly
        ? "For PDFs, FORMGUARD cannot automatically shrink the file. Please re-export it at a smaller size or replace it with a smaller original."
        : undefined,
      fix: isCompressible ? ("compress" as const) : undefined,
    });
  }

  // --- SIZE_MIN ---
  if (rule.minBytes != null && meta.size < rule.minBytes) {
    issues.push({
      code: "TOO_SMALL",
      severity: "blocking",
      message: `${formatBytes(meta.size)} is smaller than the minimum ${formatBytes(rule.minBytes)}.`,
    });
  }

  // --- DIMENSIONS ---
  if (meta.realType === "jpg" || meta.realType === "png") {
    const dimIssue = widthHeightValid(meta, rule);
    if (dimIssue) {
      issues.push(dimIssue);
    }
  }

  // --- ENCRYPTED_PDF ---
  if (meta.realType === "pdf" && meta.encrypted === true) {
    issues.push({
      code: "ENCRYPTED_PDF",
      severity: "blocking",
      message: "Password-protected PDFs cannot be checked or accepted. Replace it.",
      detail: "The uploaded PDF is encrypted. FORMGUARD cannot read its contents.",
    });
  }

  // --- PAGES ---
  if (
    rule.maxPages != null &&
    meta.realType === "pdf" &&
    meta.pages != null &&
    meta.pages > rule.maxPages
  ) {
    issues.push({
      code: "TOO_MANY_PAGES",
      severity: "blocking",
      message: `${meta.pages} pages is more than the maximum ${rule.maxPages}.`,
      detail: "FORMGUARD cannot split a PDF for you. Replace it with the correct number of pages.",
    });
  }

  // --- UNREADABLE (only when a file exists but we could not determine anything) ---
  if (meta.realType === "unknown" && meta.size > 0) {
    issues.push({
      code: "UNREADABLE",
      severity: "blocking",
      message: "FORMGUARD could not read this file.",
      detail: "The file does not appear to be a PDF, JPEG, or PNG, or it could not be inspected.",
    });
  }

  // --- FILENAME (advisory only) ---
  // Fires when the filename does not match the suggested filename exactly
  // (case-insensitive). Never blocking.
  if (meta.realType !== "unknown") {
    if (meta.name.toLowerCase() !== rule.suggestedFilename.toLowerCase()) {
      issues.push({
        code: "FILENAME",
        severity: "advisory",
        message: `Consider renaming the file to ${rule.suggestedFilename}.`,
        detail: `This file is named "${meta.name}". ${rule.suggestedFilename} makes it easier to confirm this is the right document.`,
        fix: "rename",
      });
    }
  }

  // --- IDENTITY ---
  // Identity is confirmed only by the user. The engine only raises an IDENTITY
  // issue when the filename is unclear or a mismatch. A clear keyword match
  // means the user does not need to confirm.
  if (meta.realType !== "unknown") {
    const allRules = ctx.slots.map((s) => s.rule);
    const matchResult = matchFilename(meta.name, rule, allRules);
    if (matchResult !== "match") {
      issues.push({
        code: "IDENTITY",
        severity: "confirm",
        message: `This filename may not match the required document: ${rule.label}.`,
        detail: `The file is named "${meta.name}". ${rule.label} is expected. Please confirm or replace it.`,
      });
    }
  }

  // --- DUPLICATE ---
  if (ctx.duplicates && ctx.duplicates.has(meta.sha256)) {
    const dup = ctx.duplicates.get(meta.sha256)!;
    issues.push({
      code: "DUPLICATE",
      severity: "confirm",
      message: `This exact file is also uploaded as ${dup.label}. Is that intended?`,
      detail: "Two slots contain the same file content (same SHA-256).",
    });
  }

  return issues;
}

