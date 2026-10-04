/**
 * Formatting helpers for byte sizes and file-type labels.
 *
 * These are pure functions with no DOM, no React and no side effects. They are
 * consumed by the validation and readiness engines as well as the UI.
 */

/**
 * Human-readable byte size using 1 KB = 1024 bytes, as required by the spec.
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"] as const;
  const factor = 1024;

  if (bytes < factor) {
    return `${Math.round(bytes)} B`;
  }

  let value = bytes;
  let unitIndex = 0;

  while (value >= factor && unitIndex < units.length - 1) {
    value /= factor;
    unitIndex += 1;
  }

  const fixed = Math.round(value * 10 ** decimals) / 10 ** decimals;

  // Keep integers readable: "50 KB" not "50.0 KB".
  const text =
    decimals > 0 && fixed % 1 !== 0 ? fixed.toFixed(decimals) : String(fixed);

  return `${text} ${units[unitIndex]}`;
}

/**
 * Lowercase, spec-friendly label for a real detected file type.
 */
export function fileTypeLabel(realType: string): string {
  return realType.toUpperCase();
}
