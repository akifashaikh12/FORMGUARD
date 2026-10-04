# FORMGUARD

> **Know your application is ready before you click Submit.**

FORMGUARD is a **local-first, fully interactive** pre-submission checker for
application documents — scholarships, admissions, exams. Upload your real
files, watch them get inspected in real time, fix every issue with one click,
and get a clear **READY / NOT READY** result — all inside the browser, with
nothing ever sent to a server.

---

## What it does (in 30 seconds)

```text
You drop files  →  FORMGUARD inspects them  →  Issues appear instantly
       ↓                                              ↓
One-click fix (compress / convert / rename)    Confirm uncertain files
       ↓                                              ↓
         Live progress bar fills to 100%  →  READY TO SUBMIT ✓
```

No uploads. No account. No waiting. The entire pipeline — magic-byte detection,
SHA-256 hashing, JPEG compression, PDF-to-image conversion — runs in your
browser tab.

---

## Live interactive features

These are all **real-time, in-browser** — no round-trips, no server, no delay
beyond your CPU:

| What you do | What happens |
|---|---|
| Drop or upload a file to a slot | Spinner appears instantly; magic bytes are read, SHA-256 is computed, dimensions measured — result appears in < 1 s |
| Upload a JPG or PNG | A live thumbnail preview appears in the card corner |
| A file is too large | Red issue row appears with a **Compress** button right there — no navigation needed |
| A PDF needs to be a JPG | **Convert to JPG** button appears inline; PDF page 1 is rendered on a canvas and re-encoded |
| Filename doesn't match the slot | **Confirm** button appears inline; one click resolves it |
| You fix an issue | **Before → After** panel slides in: `1.8 MB → 43 KB`, `PDF → JPG`, `1200×1600 → 300×400 px` |
| Any slot changes | Progress bar animates; card border shifts colour (green / red / blue) |
| Something succeeds or fails | Toast notification slides up from the bottom-right, auto-dismisses in 3.5 s |
| Drop multiple files at once | Auto-assign: each file is matched to the best slot by filename tokens |

---

## Features

### Validation (pure engine — no DOM, fully unit-tested)
- **Format** — reads magic bytes (`%PDF`, `FF D8 FF`, `89 50 4E 47`), never trusts extension or `file.type`
- **Type spoof** — catches a PNG renamed `.jpg`, a PDF renamed `.png`, etc.
- **Size** — exact byte-level check; message shows real numbers: *"1.8 MB, maximum 50 KB"*
- **Dimensions** — min/max width × height for image slots
- **Page count** — max pages for PDF slots
- **Encrypted PDF** — password-protected PDFs are caught and blocked
- **Identity matching** — tokenises the filename and cross-checks against each slot's keyword list; unclear filenames get a confirm prompt, not a hard block
- **Duplicate detection** — SHA-256 comparison across all slots flags same-file reuse

### Auto-fix (browser engine — Canvas API + pdfjs-dist)
- **Compress** — binary-search JPEG quality (0.95 → 0.3, ~8 iterations); if still too large, scales down by 0.85× and repeats; never drops below min dimensions
- **Convert PNG → JPG** — drawn on a white canvas before encoding (no black transparency)
- **Convert PDF → JPG** — renders page 1 at 2× scale via pdfjs-dist, then compresses to target size
- **Resize** — clamps width/height to rule min/max
- **Rename** — wraps `new File([blob], suggestedFilename)`, no re-encoding

### UX
- Per-slot loading spinner while inspect or transform runs
- Live thumbnail preview for image files (object URL, revoked on unmount)
- Animated progress bar (colour: blue → red on blocking issues, green when all clear)
- Inline action buttons on every issue row — fix without leaving the Upload screen
- Before/after size + dimension + type panel after each fix
- Toast system (success / error) for every action
- Status-coloured card borders with smooth CSS transition
- Global drop zone scales slightly on hover
- Keyboard accessible, visible focus rings, `aria-live` regions on status changes
- Responsive down to 375 px

---

## Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                        Browser (client only)                     │
│                                                                  │
│  ┌──────────────┐   ┌────────────────┐   ┌────────────────────┐  │
│  │  UI Screens  │──▶│  Zustand Store │──▶│  Browser Engines   │  │
│  │              │   │  store.ts      │   │  inspect.ts        │  │
│  │  Landing     │   │                │   │  transform.ts      │  │
│  │  Select      │   │  loadingSlots  │   │                    │  │
│  │  Requirements│   │  (Set<id>)     │   │  Canvas API        │  │
│  │  Upload      │   │                │   │  createImageBitmap │  │
│  │  Fix         │   │                │   │  crypto.subtle     │  │
│  │  Readiness   │   │                │   │  pdfjs-dist        │  │
│  └──────────────┘   └───────┬────────┘   └────────────────────┘  │
│                             │                                    │
│                     ┌───────▼────────┐                          │
│                     │  Pure Engines  │  ← unit-tested, no DOM   │
│                     │  validation.ts │                            │
│                     │  matching.ts   │                            │
│                     │  readiness.ts  │                            │
│                     │  format.ts     │                            │
│                     └────────────────┘                            │
└──────────────────────────────────────────────────────────────────┘
                              │
             Files never leave this boundary
```

**Data flow for a single file upload:**
1. User drops file → `store.addFile(file, slotId)` called
2. `slotId` added to `loadingSlots` → spinner appears on card
3. `inspectFile(file)` runs: reads first 8 bytes (magic), computes SHA-256 via `crypto.subtle`, gets image dimensions via `createImageBitmap`, counts PDF pages via `pdfjs-dist`
4. `validate(meta, rule, ctx)` runs: returns ordered `Issue[]`
5. `revalidateAll(slots)` re-checks every slot (duplicate map rebuilt)
6. `slotId` removed from `loadingSlots` → spinner clears, card shows result
7. Progress bar and card border update with CSS transition

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript strict (`noImplicitAny`, `strictNullChecks`) |
| Styling | Tailwind CSS v4 |
| State | Zustand 5 |
| PDF rendering | pdfjs-dist 6 |
| Icons | lucide-react |
| Tests | Vitest 5 (48 tests, pure engines only) |
| Demo file generation | pdf-lib + sharp (dev dep) |

---

## Local development

```bash
# Install dependencies
npm install

# Start the local server (localhost)
npm run dev
# → http://localhost:3000
```

Then open `http://localhost:3000` in your browser.

### Available scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server at `http://localhost:3000` |
| `npm run build` | Production build (`.next/` output) |
| `npm start` | Serve the production build locally |
| `npm run lint` | ESLint 9 (`eslint.config.mjs`) |
| `npm test` | Vitest, run once (`vitest run`) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run demo-files` | Regenerate demo files into `public/demo-files/` |

---

## Demo files

The **"Try with demo files"** button on the Upload screen loads pre-generated
synthetic files from `/demo-files/`. **Important:** the demo files only resemble
real input. Filenames, keywords, and non-trivial values are deliberately fake,
and every demo file is designed to fail in a specific, learning-oriented way —
so the real behaviour you see on localhost will differ from the demo outcome.

| File | What it tests |
|---|---|
| `aadhaar.pdf` | Happy path — passes all checks |
| `college_document.pdf` | IDENTITY confirm prompt (generic filename, assigned to Income Certificate) |
| `marksheet.pdf` | Happy path |
| `bank_passbook.pdf` | Happy path |
| `caste_certificate.pdf` | Happy path |
| `IMG_8392.jpg` | TOO_LARGE — 1.86 MB photograph must be compressed to ≤ 50 KB |
| `signature.pdf` | WRONG_FORMAT — 625 KB PDF must be converted + compressed to JPG ≤ 20 KB |

### Golden path (against the State Scholarship template, with demo files)

1. 5 files pass immediately → 5 verified cards turn green
2. `college_document.pdf` → Income Certificate slot → **"Confirm"** button appears inline
3. `IMG_8392.jpg` → Photograph slot → **"Compress"** button appears inline (1.86 MB → ≤ 50 KB)
4. `signature.pdf` → Signature slot → **"Convert to JPG"** button appears inline
5. Click **Confirm** on Income Certificate → blue border turns green, toast fires
6. Click **Compress** on Photograph → spinner → before/after panel: `1.8 MB → 43 KB`
7. Click **Convert to JPG** on Signature → spinner → before/after panel: `PDF → JPG`, `625 KB → ~15 KB`
8. Progress bar hits 100% green
9. Navigate to Readiness → **READY TO SUBMIT** · 7/7 · 1 user confirmed · 0 blocking
10. Click **Download Submission Report** → browser print dialog, A4 layout

> The demo path is a **learning aid**. In real usage you will upload your own
> files, some of which will fail differently, need different fixes, or be
> genuinely ambiguous. FORMGUARD will ask you when it cannot determine the
> answer — you are always in control.

---

## Templates

All templates are **Demo application templates** — they are configuration,
not live data. They ship so you can try the whole flow without uploading real
documents. Real applications configure their own templates.

| Template | Documents | Deadline |
|---|---|---|
| State Scholarship Application | 7 (Aadhaar, Income, Marksheet, Passbook, Photo, Signature, Caste) | 2026-10-25 |
| College Admission Application | 5 (Class 10, Class 12, Photo, Signature, ID Proof) | 2026-11-15 |
| Competitive Examination Application | 5 (Photo, Signature, ID Proof, Category Certificate, Graduation) | 2026-12-01 |

---

## Project structure

```text
src/
├── app/
│   ├── layout.tsx          # Root layout — mounts <Toaster />
│   └── page.tsx            # Single-page app, switches on step from store
├── components/
│   ├── ui.tsx              # Shared: StatusBadge, ReadinessDial, Stepper, DeadlineChip…
│   └── Toast.tsx           # Event-bus toast system (no context, no extra library)
├── screens/
│   ├── LandingScreen.tsx   # Headline, CTAs, feature cards, privacy popover
│   ├── SelectScreen.tsx    # Template picker with deadline countdown
│   ├── RequirementsScreen  # Checklist + requirement chips before upload
│   ├── UploadScreen.tsx    # Document cards, thumbnails, progress bar, inline fixes
│   ├── FixScreen.tsx       # Per-issue cards with before/after panel
│   └── ReadinessScreen.tsx # Readiness dial + printable report
└── lib/
    ├── types.ts            # Domain model (DocumentRule, SlotState, Issue…)
    ├── clock.ts            # Deterministic clock (NEXT_PUBLIC_DEMO_NOW override)
    ├── store.ts            # Zustand store — loadingSlots, addFile, applyFix…
    ├── templates/
    │   └── index.ts        # 3 demo ApplicationTemplate definitions
    ├── engines/            # Pure functions — zero DOM, zero React
    │   ├── validation.ts   # validate(meta, rule, ctx) → Issue[]
    │   ├── matching.ts     # matchFilename() → 'match'|'unclear'|'mismatch'
    │   ├── readiness.ts    # computeReadiness() → ReadinessResult
    │   ├── format.ts       # formatBytes() helper (1 KB = 1024)
    │   └── *.test.ts       # 48 Vitest unit tests
    └── browser/            # Client-only, uses DOM/Canvas/pdfjs
        ├── inspect.ts      # inspectFile() — magic bytes, SHA-256, dimensions, pages
        └── transform.ts    # compressImage, resizeImage, convertToJpeg, pdfToJpeg, renameFile
```

---

## Testing

```bash
npm test
```

48 unit tests covering:
- Every `validate()` rule (WRONG_FORMAT, TYPE_SPOOF, TOO_LARGE, TOO_SMALL,
  DIMENSIONS, ENCRYPTED_PDF, PAGES, UNREADABLE, FILENAME, IDENTITY, DUPLICATE)
- `matchFilename()` — match, unclear, and mismatch cases including
  `income_certificate.pdf`, `college_document.pdf`, `document1.pdf`,
  `IMG_8392.jpg`
- `computeReadiness()` — READY / CONFIRM / NOT_READY truth table,
  deadline-passed case, userConfirmed count

Browser engines (`inspect.ts`, `transform.ts`) are excluded from the Vitest
suite because they require a real browser canvas and PDF worker — test them via
the golden path above.

---

## Security / privacy headers

Production build sets:

```text
Content-Security-Policy: default-src 'self'; connect-src 'self'; img-src 'self' blob: data:;
                          worker-src 'self' blob:; script-src 'self' 'unsafe-inline'  (unsafe-eval only in development);
                          style-src 'self' 'unsafe-inline'; font-src 'self' data:;
                          object-src 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
X-Frame-Options: DENY
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

No third-party scripts. No analytics. No external fonts loaded from Google or
any CDN.

---

## Limitations

- Checks only the requirements configured in its demo templates — not the real
  requirements of any portal.
- Filename matching is heuristic (token-based); unusual naming can produce
  false unclear/mismatch results.
- PDFs that must remain PDFs cannot be automatically shrunk — only
  format-converted (PDF → JPG).
- No OCR, no content analysis, no AI of any kind.
- All state is in memory — refreshing the page clears everything immediately.

---

## Privacy

- **Files never leave your device.** Inspection, compression, and conversion
  all run locally via Web APIs.
- **No storage of any kind.** No localStorage, no IndexedDB, no cookies.
  Refresh = clean slate.
- **No account, no analytics, no third-party scripts.**
- **SHA-256 is computed client-side** (`crypto.subtle`) for duplicate
  detection only — never transmitted.

---

## Disclaimer

FORMGUARD checks the requirements configured for this application. It does not
guarantee acceptance by the receiving organization.
