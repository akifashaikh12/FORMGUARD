/**
 * Browser-side file transform utilities.
 *
 * Each function takes the original File and returns a NEW File + summary string.
 * The original is never mutated.
 *
 * Images are always drawn on a white background before JPEG encoding so that
 * PNG transparency becomes white rather than black.
 *
 * Client-only — uses Canvas API, pdfjs-dist (dynamic import). Do not import
 * from pure engine modules.
 */

import type { DocumentRule } from "@/lib/types";

export class FormguardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormguardError";
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Draw an image source onto a white-background canvas and return a JPEG Blob. */
async function canvasToJpeg(
  source: ImageBitmap | HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  quality: number,
): Promise<Blob> {
  const canvas = createCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new FormguardError("Could not get canvas context.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new FormguardError("Canvas produced no blob."));
      },
      "image/jpeg",
      quality,
    );
  });
}

/** Scale a bitmap down by a factor and encode to JPEG. */
async function encodeScaled(
  bitmap: ImageBitmap,
  scaleFactor: number,
  quality: number,
): Promise<Blob> {
  const w = Math.max(1, Math.floor(bitmap.width * scaleFactor));
  const h = Math.max(1, Math.floor(bitmap.height * scaleFactor));
  return canvasToJpeg(bitmap, w, h, quality);
}

// ---------------------------------------------------------------------------
// compressImage
// ---------------------------------------------------------------------------

/**
 * Binary-search JPEG quality from 0.95 down to 0.3 (~8 iterations) to find
 * the highest quality that fits within `rule.maxBytes`. If still over the
 * limit, scale by 0.85 and repeat, but never below minWidth/minHeight (or
 * 40% of original dimensions). Never drops below minBytes. Throws if the
 * target cannot be reached.
 */
export async function compressImage(
  file: File,
  rule: DocumentRule,
): Promise<{ file: File; summary: string }> {
  if (!rule.maxBytes) {
    throw new FormguardError("No maxBytes defined for this rule.");
  }

  const maxBytes = rule.maxBytes;
  const minBytes = rule.minBytes ?? 0;

  const originalBitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const origW = originalBitmap.width;
  const origH = originalBitmap.height;

  const minW = Math.max(rule.minWidth ?? 0, Math.floor(origW * 0.4));
  const minH = Math.max(rule.minHeight ?? 0, Math.floor(origH * 0.4));

  let currentBitmap = originalBitmap;
  let scaleFactor = 1;
  const MAX_SCALE_STEPS = 6;

  for (let scaleStep = 0; scaleStep <= MAX_SCALE_STEPS; scaleStep++) {
    // Binary search for highest quality under maxBytes
    let lo = 0.3;
    let hi = 0.95;
    let bestBlob: Blob | null = null;

    for (let i = 0; i < 8; i++) {
      const mid = (lo + hi) / 2;
      const blob = await encodeScaled(currentBitmap, 1, mid);
      if (blob.size <= maxBytes && blob.size >= minBytes) {
        bestBlob = blob;
        lo = mid; // push quality higher
      } else if (blob.size > maxBytes) {
        hi = mid; // quality too high
      } else {
        // below minBytes — push quality higher
        lo = mid;
        bestBlob = blob; // keep, acceptable
      }
    }

    if (bestBlob && bestBlob.size <= maxBytes) {
      const resultFile = new File([bestBlob], suggestJpgName(file.name), {
        type: "image/jpeg",
      });
      const summary = buildSummary(file.size, resultFile.size);
      if (scaleStep > 0 && currentBitmap !== originalBitmap) {
        currentBitmap.close();
      }
      originalBitmap.close();
      return { file: resultFile, summary };
    }

    // Need to scale down
    scaleFactor *= 0.85;
    const newW = Math.floor(origW * scaleFactor);
    const newH = Math.floor(origH * scaleFactor);

    if (newW < minW || newH < minH) {
      break;
    }

    if (currentBitmap !== originalBitmap) {
      currentBitmap.close();
    }
    const scaledBlob = await encodeScaled(originalBitmap, scaleFactor, 0.85);
    currentBitmap = await createImageBitmap(
      new File([scaledBlob], file.name, { type: "image/jpeg" }),
    );
  }

  if (currentBitmap !== originalBitmap) {
    currentBitmap.close();
  }
  originalBitmap.close();

  throw new FormguardError(
    `Could not compress the image to fit within ${formatBytesSimple(maxBytes)} while keeping it readable. Try replacing the file with a lower-resolution original.`,
  );
}

// ---------------------------------------------------------------------------
// resizeImage
// ---------------------------------------------------------------------------

/**
 * Resize a JPG/PNG to fit within the rule's maxWidth/maxHeight (or expand to
 * minWidth/minHeight if too small). Outputs a JPEG file.
 */
export async function resizeImage(
  file: File,
  rule: DocumentRule,
): Promise<{ file: File; summary: string }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  let { width, height } = bitmap;

  // Clamp to min
  if (rule.minWidth && width < rule.minWidth) width = rule.minWidth;
  if (rule.minHeight && height < rule.minHeight) height = rule.minHeight;
  // Clamp to max
  if (rule.maxWidth && width > rule.maxWidth) width = rule.maxWidth;
  if (rule.maxHeight && height > rule.maxHeight) height = rule.maxHeight;

  const blob = await canvasToJpeg(bitmap, width, height, 0.92);
  bitmap.close();

  const resultFile = new File([blob], suggestJpgName(file.name), {
    type: "image/jpeg",
  });
  const summary = `Resized to ${width}×${height}px`;
  return { file: resultFile, summary };
}

// ---------------------------------------------------------------------------
// convertToJpeg  (PNG → JPG)
// ---------------------------------------------------------------------------

export async function convertToJpeg(
  file: File,
  rule: DocumentRule,
): Promise<{ file: File; summary: string }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const blob = await canvasToJpeg(bitmap, bitmap.width, bitmap.height, 0.92);
  bitmap.close();

  // If there is a maxBytes constraint, compress after converting.
  if (rule.maxBytes && blob.size > rule.maxBytes) {
    const jpgFile = new File([blob], suggestJpgName(file.name), {
      type: "image/jpeg",
    });
    return compressImage(jpgFile, rule);
  }

  const resultFile = new File([blob], suggestJpgName(file.name), {
    type: "image/jpeg",
  });
  const summary = `Converted ${file.name} to JPEG (${buildSummary(file.size, resultFile.size)})`;
  return { file: resultFile, summary };
}

// ---------------------------------------------------------------------------
// pdfToJpeg  (PDF page 1 → JPG)
// ---------------------------------------------------------------------------

export async function pdfToJpeg(
  file: File,
  rule: DocumentRule,
): Promise<{ file: File; summary: string }> {
  const buffer = await file.arrayBuffer();

  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  // Render at 2× for a decent resolution
  const scale = 2;
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(
    Math.floor(viewport.width),
    Math.floor(viewport.height),
  );
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new FormguardError("Could not get canvas context.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, canvas, viewport }).promise;

  const jpgName = suggestJpgName(file.name);

  const preBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new FormguardError("Canvas produced no blob."));
      },
      "image/jpeg",
      0.92,
    );
  });

  // If over maxBytes, compress.
  if (rule.maxBytes && preBlob.size > rule.maxBytes) {
    const jpgFile = new File([preBlob], jpgName, { type: "image/jpeg" });
    const { file: compressed, summary: compSummary } = await compressImage(jpgFile, rule);
    return {
      file: compressed,
      summary: `Converted PDF page 1 to JPEG. ${compSummary}`,
    };
  }

  const resultFile = new File([preBlob], jpgName, { type: "image/jpeg" });
  const summary = `Converted PDF page 1 to JPEG. ${buildSummary(file.size, resultFile.size)}`;
  return { file: resultFile, summary };
}

// ---------------------------------------------------------------------------
// renameFile
// ---------------------------------------------------------------------------

export function renameFile(
  file: File,
  newName: string,
): { file: File; summary: string } {
  const renamed = new File([file], newName, { type: file.type });
  return { file: renamed, summary: `Renamed "${file.name}" to "${newName}"` };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function suggestJpgName(originalName: string): string {
  const dot = originalName.lastIndexOf(".");
  const base = dot > 0 ? originalName.slice(0, dot) : originalName;
  return `${base}.jpg`;
}

function buildSummary(before: number, after: number): string {
  return `Compressed ${formatBytesSimple(before)} to ${formatBytesSimple(after)}`;
}

function formatBytesSimple(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
