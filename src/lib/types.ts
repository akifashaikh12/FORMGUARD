/**
 * FORMGUARD domain model.
 *
 * These types are shared by the pure engines, the browser engines and the
 * Zustand store. They deliberately avoid `any` so that the engines can stay
 * pure (no DOM, no React) and the tests can stay fast.
 *
 * The native browser `File` and `Blob` types are intentionally used here for
 * slot payloads; the pure engines only operate on `FileMeta`, never on `File`.
 */

export type FileRealType = "pdf" | "jpg" | "png" | "unknown";
export type FileFixKind = "compress" | "resize" | "convert" | "rename";
export type Severity = "blocking" | "confirm" | "advisory";
export type SlotStatus =
  | "empty"
  | "verified"
  | "needs_confirmation"
  | "non_compliant";
export type ReadinessState = "READY" | "CONFIRM" | "NOT_READY";
export type HistoryKind =
  | "uploaded"
  | "compressed"
  | "resized"
  | "converted"
  | "renamed"
  | "confirmed"
  | "replaced";

export interface DocumentRule {
  id: string;
  label: string;
  description?: string;
  allowedFormats: Array<"pdf" | "jpg" | "png">;
  minBytes?: number;
  maxBytes?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  maxPages?: number;
  keywords: string[];
  suggestedFilename: string;
  isImage: boolean;
}

export interface ApplicationTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  deadline: string; // ISO 8601
  isDemo: true;
  documents: DocumentRule[];
}

export interface FileMeta {
  name: string;
  size: number;
  realType: FileRealType;
  declaredMime: string;
  width?: number;
  height?: number;
  pages?: number;
  encrypted?: boolean;
  sha256: string;
}

export interface Issue {
  code: string;
  severity: Severity;
  message: string;
  detail?: string;
  fix?: FileFixKind;
}

export interface HistoryEntry {
  at: string; // ISO 8601
  kind: HistoryKind;
  summary: string;
}

export interface SlotState {
  rule: DocumentRule;
  file?: File;
  meta?: FileMeta;
  issues: Issue[];
  confirmedIdentity: boolean;
  history: HistoryEntry[];
  status: SlotStatus;
  /** Which other slot (by rule id) this file is also used in. Set by the store. */
  duplicateOf?: string;
}
