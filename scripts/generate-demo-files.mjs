/**
 * FORMGUARD demo file generator.
 *
 * Generates synthetic, obviously-fake demo files into public/demo-files/.
 * Uses pdf-lib (PDFs) and sharp (images). Never contains real personal data.
 *
 * Run: npm run demo-files
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../public/demo-files");

await mkdir(OUT, { recursive: true });

// ── Helpers ──────────────────────────────────────────────────────────────────

async function makePdf(filename, lines) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  page.drawText("FORMGUARD — DEMO DOCUMENT (NOT REAL)", {
    x: 50, y: 800, size: 10, font, color: rgb(0.6, 0.6, 0.6),
  });
  page.drawText("This file contains synthetic data generated for demonstration purposes only.", {
    x: 50, y: 785, size: 8, font, color: rgb(0.7, 0.7, 0.7),
  });

  let y = 740;
  for (const line of lines) {
    const isHeader = line.startsWith("##");
    const text = isHeader ? line.slice(3) : line;
    page.drawText(text, {
      x: 50, y,
      size: isHeader ? 14 : 11,
      font: isHeader ? bold : font,
      color: isHeader ? rgb(0.1, 0.1, 0.4) : rgb(0.2, 0.2, 0.2),
    });
    y -= isHeader ? 28 : 20;
  }

  const bytes = await doc.save();
  await writeFile(join(OUT, filename), bytes);
  const kb = (bytes.length / 1024).toFixed(1);
  console.log(`  ✓ ${filename}  (${kb} KB)`);
}

// ── PDFs ──────────────────────────────────────────────────────────────────────

await makePdf("aadhaar.pdf", [
  "## Aadhaar Card",
  "Name:  DEMO RESIDENT",
  "DOB:   01/01/1990",
  "UID:   1234 5678 9012",
  "Address: 42 Fake Street, Demo City, 000000",
  "",
  "DEMO ONLY — Not a valid government document",
]);

await makePdf("college_document.pdf", [
  "## General Purpose Document",
  "This is a generic document used to test",
  "identity-matching heuristics in FORMGUARD.",
  "",
  "The filename 'college_document' should trigger",
  "an IDENTITY confirmation prompt when assigned",
  "to the Income Certificate slot.",
  "",
  "DEMO ONLY — Not a real document",
]);

await makePdf("marksheet.pdf", [
  "## Academic Marksheet",
  "Student:  DEMO STUDENT",
  "Roll No:  2024-DEMO-001",
  "Subject             Marks    Grade",
  "Mathematics          87/100    A",
  "Physics              79/100    B+",
  "Chemistry            91/100    A+",
  "English              82/100    A",
  "Computer Science     95/100    A+",
  "",
  "Total: 434/500   Percentage: 86.8%",
  "Result: PASS",
  "",
  "DEMO ONLY — Not a valid academic record",
]);

await makePdf("bank_passbook.pdf", [
  "## Bank Passbook — First Page",
  "Bank:        DEMO NATIONAL BANK",
  "Branch:      Demo City Main",
  "IFSC:        DEMO0001234",
  "Account No:  0000 1234 5678",
  "Name:        DEMO RESIDENT",
  "",
  "Date        Description          Credit      Balance",
  "01-Jan-25   Opening Balance      -           10,000.00",
  "05-Jan-25   NEFT Transfer        5,000.00    15,000.00",
  "10-Jan-25   ATM Withdrawal       -2,000.00   13,000.00",
  "",
  "DEMO ONLY — Not a valid bank document",
]);

await makePdf("caste_certificate.pdf", [
  "## Caste / Category Certificate",
  "Issued to:     DEMO RESIDENT",
  "Category:      DEMO CATEGORY",
  "Certificate No: DEMO/2025/0001",
  "Issued by:     Demo District Authority",
  "Date:          01 January 2025",
  "Valid until:   31 December 2027",
  "",
  "This certifies that the above-named person belongs to",
  "the specified category as per demo records.",
  "",
  "DEMO ONLY — Not a valid government certificate",
]);

// ── IMG_8392.jpg — noisy photo, ~1.8 MB ──────────────────────────────────────
// Create a noisy colour image that compresses large (high entropy).

{
  const width = 1200;
  const height = 1600;
  // Generate random RGB noise — high entropy = large JPEG file
  const pixelCount = width * height * 3;
  const data = Buffer.allocUnsafe(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    data[i] = Math.floor(Math.random() * 256);
  }

  await sharp(data, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 95, mozjpeg: false })
    .toFile(join(OUT, "IMG_8392.jpg"));

  const { default: fs } = await import("node:fs");
  const stat = fs.statSync(join(OUT, "IMG_8392.jpg"));
  console.log(`  ✓ IMG_8392.jpg  (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
}

// ── signature.pdf — large enough to need conversion (~700 KB+) ───────────────
// Build a PDF with multiple embedded JPEG images to inflate the size.

{
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // First page: the "signature"
  const page1 = doc.addPage([595, 200]);
  page1.drawText("DEMO ONLY — Not a real signature", {
    x: 50, y: 170, size: 9, font, color: rgb(0.7, 0.7, 0.7),
  });
  page1.drawText("Demo Signature", {
    x: 80, y: 120, size: 36, font, color: rgb(0.05, 0.05, 0.4),
  });
  page1.drawLine({
    start: { x: 80, y: 110 }, end: { x: 400, y: 110 },
    thickness: 1, color: rgb(0.3, 0.3, 0.3),
  });

  // Generate a noisy JPEG to embed in subsequent pages to inflate file size
  const imgWidth = 400;
  const imgHeight = 100;
  const pixelCount = imgWidth * imgHeight * 3;
  const noiseData = Buffer.allocUnsafe(pixelCount);
  for (let i = 0; i < pixelCount; i++) noiseData[i] = Math.floor(Math.random() * 256);

  const noisyJpeg = await sharp(noiseData, { raw: { width: imgWidth, height: imgHeight, channels: 3 } })
    .jpeg({ quality: 90 })
    .toBuffer();

  // Embed the same image many times (each embed is a separate object in the PDF)
  for (let i = 0; i < 18; i++) {
    const embeddedImg = await doc.embedJpg(noisyJpeg);
    const p = doc.addPage([595, 200]);
    p.drawText(`Padding page ${i + 2} — DEMO ONLY`, {
      x: 50, y: 170, size: 8, font, color: rgb(0.85, 0.85, 0.85),
    });
    p.drawImage(embeddedImg, { x: 80, y: 30, width: imgWidth, height: imgHeight });
  }

  const bytes = await doc.save();
  await writeFile(join(OUT, "signature.pdf"), bytes);
  const kb = (bytes.length / 1024).toFixed(1);
  console.log(`  ✓ signature.pdf  (${kb} KB)`);
}

console.log("\nAll demo files written to public/demo-files/");
