/**
 * Filename-to-rule matching engine.
 *
 * Pure function — no DOM, no React. Used by the validation engine (IDENTITY
 * check) and by the store's auto-assign logic.
 *
 * Rules:
 *  - "match"   → at least one filename token matches a rule keyword
 *  - "unclear" → no keyword match AND the name is entirely generic
 *  - "mismatch"→ tokens clearly match a DIFFERENT slot's keywords (not this one)
 *
 * The UI always says "may not match", never "wrong document".
 */

import type { DocumentRule } from "@/lib/types";

/**
 * Generic tokens that carry no document-specific meaning. Any filename that
 * consists entirely of these tokens (plus digits) is "unclear".
 */
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
  "jpg",
  "jpeg",
  "png",
]);

/**
 * Tokenize a filename:
 *  - strip extension
 *  - lowercase
 *  - split on non-alphanumeric characters
 *  - discard empty strings and pure digit-only strings are kept as-is
 */
export function tokenize(filename: string): string[] {
  // Strip extension: only if there is a dot that is not the first character
  const dotIndex = filename.lastIndexOf(".");
  const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;

  if (base.length === 0) {
    return [];
  }

  // Split on non-alphanumeric chars, then lowercase
  const tokens = base
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);

  return tokens;
}

/** Returns true if every meaningful token is generic or a digit-only string. */
function isAllGeneric(tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  return tokens.every((t) => GENERIC_TOKENS.has(t) || /^\d+$/.test(t));
}

/**
 * Match a filename against a single rule.
 *
 * @param filename - the file's name (with or without extension)
 * @param rule     - the DocumentRule to test against
 * @param allRules - all rules in the template, used for mismatch detection
 */
export function matchFilename(
  filename: string,
  rule: DocumentRule,
  allRules: DocumentRule[] = [],
): "match" | "unclear" | "mismatch" {
  const tokens = tokenize(filename);

  // Check if any token hits this rule's keywords
  const ruleKeywords = new Set(rule.keywords.map((k) => k.toLowerCase()));
  const hitsThisRule = tokens.some((t) => ruleKeywords.has(t));
  if (hitsThisRule) {
    return "match";
  }

  // Unclear: the name is entirely generic
  if (isAllGeneric(tokens)) {
    return "unclear";
  }

  // Mismatch: at least one token hits a DIFFERENT rule's keywords
  const otherRules = allRules.filter((r) => r.id !== rule.id);
  const hitsOtherRule = otherRules.some((other) => {
    const otherKeywords = new Set(other.keywords.map((k) => k.toLowerCase()));
    return tokens.some((t) => otherKeywords.has(t));
  });

  if (hitsOtherRule) {
    return "mismatch";
  }

  // Non-generic name that matches no rule at all → unclear
  return "unclear";
}
