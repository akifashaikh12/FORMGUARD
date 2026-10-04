/**
 * Browser-side file inspector.
 *
 * `inspectFile` takes a browser `File` and returns a `FileMeta` describing its
 * real type (detected from magic bytes, not the extension), dimensions, page
 * count, SHA-256, and encryption status.
 *
 * This module is client-only — it uses the DOM, crypto.subtle, createImageBitmap,
 * and pdfjs-dist (dynamically imported). Never import this from a pure engine.
 */

import type { FileMeta, FileRealType } from "@/lib/types";

// Magic byte signatures
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47]; // .PNG

function detectRealType(bytes: Uint8Array): FileRealType {
  if (
    bytes.length >= PDF_MAGIC.length &&
    PDF_MAGIC.every((b, i) => bytes[i] === b)
  ) {
    return "pdf";
  }
  if (
    bytes.length >= JPEG_MAGIC.length &&
    JPEG_MAGIC.every((b, i) => bytes[i] === b)
  ) {
    return "jpg";
  }
  if (
    bytes.length >= PNG_MAGIC.length &&
    PNG_MAGIC.every((b, i) => bytes[i] === b)
  ) {
    return "png";
  }
  return "unknown";
}

async function computeSha256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = bitmap;
  bitmap.close();
  return { width, height };
}

async function getPdfInfo(
  buffer: ArrayBuffer,
): Promise<{ pages: number; encrypted: boolean }> {
  // Dynamic import keeps pdfjs out of the server bundle.
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  try {
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    return { pages: pdf.numPages, encrypted: false };
  } catch (err: unknown) {
    // pdfjs throws a PasswordException for encrypted / password-protected PDFs.
    if (
      err != null &&
      typeof err === "object" &&
      "name" in err &&
      (err as { name: string }).name === "PasswordException"
    ) {
      return { pages: 0, encrypted: true };
    }
    throw err;
  }
}

export async function inspectFile(file: File): Promise<FileMeta> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer, 0, Math.min(8, buffer.byteLength));
  const realType = detectRealType(bytes);
  const sha256 = await computeSha256(buffer);

  const meta: FileMeta = {
    name: file.name,
    size: file.size,
    realType,
    declaredMime: file.type,
    sha256,
  };

  if (realType === "jpg" || realType === "png") {
    try {
      const { width, height } = await getImageDimensions(file);
      meta.width = width;
      meta.height = height;
    } catch {
      // Cannot read dimensions — leave them undefined.
    }
  }

  if (realType === "pdf") {
    try {
      const { pages, encrypted } = await getPdfInfo(buffer);
      meta.pages = pages;
      if (encrypted) {
        meta.encrypted = true;
      }
    } catch {
      // Cannot read PDF — leave pages/encrypted undefined.
    }
  }

  return meta;
}
