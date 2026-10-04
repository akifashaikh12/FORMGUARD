# FORMGUARD

> **Know your application is ready before you click Submit.**

FORMGUARD is a local-first, pre-submission checker for application documents (scholarships, admissions, exams). Upload your files, fix the issues it finds, and get a clear **READY / NOT READY** result — entirely in your browser with no server, no account, and no data ever leaving your device.

---

## Features

- **Format validation** — detects real file type from magic bytes (not extension), flags spoofed extensions
- **Size validation** — exact byte-level checking against per-document limits
- **Dimension validation** — minimum and maximum pixel dimensions for images
- **Automatic safe fixes** — compress oversized photos, convert PDFs to JPEG, resize images, rename files
- **Identity matching** — heuristic filename-to-document matching; asks for confirmation when uncertain
- **Duplicate detection** — SHA-256 comparison across all slots
- **Encrypted PDF detection** — flags password-protected PDFs immediately
- **Readiness report** — printable A4 report with fix history, SHA-256 fingerprints, and final status
- **Deadline tracking** — calculates days remaining and flags overdue submissions

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     Browser (client only)                  │
│                                                            │
│  ┌─────────┐   ┌──────────────┐   ┌─────────────────────┐ │
│  │  UI     │──▶│  Zustand     │──▶│  Browser Engines    │ │
│  │ screens │   │  store.ts    │   │  inspect.ts         │ │
│  │ /screens│   │              │   │  transform.ts       │ │
│  └─────────┘   └──────┬───────┘   └─────────────────────┘ │
│                       │                                    │
│               ┌───────▼────────┐                          │
│               │  Pure Engines  │  (no DOM, no React)      │
│               │  validation.ts │                          │
│               │  matching.ts   │                          │
│               │  readiness.ts  │                          │
│               └────────────────┘                          │
└────────────────────────────────────────────────────────────┘
                        │
               Files never leave this box
```

**Local-first model:** All file reading, inspection, compression, and conversion happens in-browser using the Canvas API, `createImageBitmap`, `crypto.subtle` (SHA-256), and `pdfjs-dist` (PDF rendering). No data is ever sent to a server. Refreshing the page clears everything.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| PDF rendering | pdfjs-dist |
| Icons | lucide-react |
| Tests | Vitest |
| Demo file generation | pdf-lib + sharp (dev only) |

---

## Local development

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
# → http://localhost:3000

# Run the test suite
npm test

# Type-check
npx tsc --noEmit

# Lint
npm run lint

# Generate demo files (required for "Try with demo files" button)
npm run demo-files

# Production build
npm run build
```

---

## Demo files

The **"Try with demo files"** button on the Upload screen loads pre-generated synthetic files from `/public/demo-files/`. Generate them with:

```bash
npm run demo-files
```

This creates:
- `aadhaar.pdf` — passes all checks
- `college_document.pdf` — triggers an IDENTITY confirmation (generic filename)
- `marksheet.pdf` — passes
- `bank_passbook.pdf` — passes
- `caste_certificate.pdf` — passes
- `IMG_8392.jpg` — ~1.8 MB photograph, needs compression to ≤ 50 KB
- `signature.pdf` — ~625 KB PDF, needs conversion to JPG ≤ 20 KB

### Golden path (after loading demo files into State Scholarship)

1. `college_document.pdf` → assigned to Income Certificate → IDENTITY confirmation prompt
2. `IMG_8392.jpg` → assigned to Photograph → TOO_LARGE (1.8 MB > 50 KB), fix=compress
3. `signature.pdf` → assigned to Signature → WRONG_FORMAT (PDF, needs JPG), fix=convert
4. Confirm Income Certificate identity
5. Compress photograph → under 50 KB
6. Convert & compress signature → under 20 KB
7. Readiness: **READY TO SUBMIT**, 7/7, 1 user confirmation, 0 blocking issues

---

## Templates

All templates are clearly labelled **"Demo application template"** and are never presented as live government or institutional data.

1. **State Scholarship Application** — 7 documents, deadline 2026-10-25
2. **College Admission Application** — 5 documents, deadline 2026-11-15
3. **Competitive Examination Application** — 5 documents, deadline 2026-12-01

---

## Limitations

- FORMGUARD checks only the requirements configured in its templates. It does not know the actual requirements of any real application portal.
- Filename matching is heuristic (token-based). It can be fooled by unusual naming conventions.
- PDF compression is not supported — FORMGUARD can convert a PDF to JPEG, but cannot shrink a PDF that must remain a PDF.
- Template data is demo data. Always verify requirements with the actual issuing organisation.
- No OCR, no content analysis, no AI — FORMGUARD only checks format, size, dimensions, and filename patterns.

---

## Privacy

- **Files never leave your device.** All processing runs in the browser.
- **No storage.** Files are held in memory only; refreshing clears everything.
- **No account, no analytics, no third-party scripts.**

---

## Disclaimer

FORMGUARD checks the requirements configured for this application. It does not guarantee acceptance by the receiving organization.
