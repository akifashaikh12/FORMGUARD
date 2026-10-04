/**
 * Tests for the pure validation engine.
 */

import { describe, it, expect } from "vitest";
import { validate } from "@/lib/engines/validation";
import type { DocumentRule, FileMeta, SlotState } from "@/lib/types";

// ----- helpers -----

function makeRule(overrides: Partial<DocumentRule> = {}): DocumentRule {
  return {
    id: "test-rule",
    label: "Test Document",
    allowedFormats: ["pdf", "jpg"],
    keywords: ["test", "document"],
    suggestedFilename: "test_document.pdf",
    isImage: false,
    ...overrides,
  };
}

function makeMeta(overrides: Partial<FileMeta> = {}): FileMeta {
  return {
    name: "test_document.pdf",
    size: 100 * 1024,
    realType: "pdf",
    declaredMime: "application/pdf",
    sha256: "abc123",
    ...overrides,
  };
}

function makeCtx(rule?: DocumentRule) {
  const r = rule ?? makeRule();
  const slot: SlotState = {
    rule: r,
    issues: [],
    confirmedIdentity: false,
    history: [],
    status: "empty",
  };
  return {
    slots: [slot],
    currentSlotId: r.id,
  };
}

// ----- WRONG_FORMAT -----

describe("WRONG_FORMAT", () => {
  it("raises WRONG_FORMAT (blocking) when file type is not allowed", () => {
    const rule = makeRule({ allowedFormats: ["pdf"] });
    const meta = makeMeta({ realType: "jpg", name: "photo.jpg" });
    const issues = validate(meta, rule, makeCtx(rule));
    const wf = issues.find((i) => i.code === "WRONG_FORMAT");
    expect(wf).toBeDefined();
    expect(wf?.severity).toBe("blocking");
  });

  it("includes fix=convert when source is PDF and target allows JPG", () => {
    const rule = makeRule({ allowedFormats: ["jpg"] });
    const meta = makeMeta({ realType: "pdf", name: "signature.pdf" });
    const issues = validate(meta, rule, makeCtx(rule));
    const wf = issues.find((i) => i.code === "WRONG_FORMAT");
    expect(wf?.fix).toBe("convert");
  });

  it("includes fix=convert when source is PNG and target allows JPG", () => {
    const rule = makeRule({ allowedFormats: ["jpg"] });
    const meta = makeMeta({ realType: "png", name: "photo.png" });
    const issues = validate(meta, rule, makeCtx(rule));
    const wf = issues.find((i) => i.code === "WRONG_FORMAT");
    expect(wf?.fix).toBe("convert");
  });

  it("has no fix when target does not allow JPG", () => {
    const rule = makeRule({ allowedFormats: ["pdf"] });
    const meta = makeMeta({ realType: "jpg", name: "photo.jpg" });
    const issues = validate(meta, rule, makeCtx(rule));
    const wf = issues.find((i) => i.code === "WRONG_FORMAT");
    expect(wf?.fix).toBeUndefined();
  });

  it("message format is 'Required: X. Uploaded: Y.'", () => {
    const rule = makeRule({ allowedFormats: ["pdf"] });
    const meta = makeMeta({ realType: "jpg", name: "photo.jpg" });
    const issues = validate(meta, rule, makeCtx(rule));
    const wf = issues.find((i) => i.code === "WRONG_FORMAT");
    expect(wf?.message).toBe("Required: PDF. Uploaded: JPG.");
  });
});

// ----- TYPE_SPOOF -----

describe("TYPE_SPOOF", () => {
  it("raises TYPE_SPOOF when a PNG is named .jpg", () => {
    const rule = makeRule({ allowedFormats: ["jpg"] });
    const meta = makeMeta({ realType: "png", name: "photo.jpg" });
    const issues = validate(meta, rule, makeCtx(rule));
    const ts = issues.find((i) => i.code === "TYPE_SPOOF");
    expect(ts).toBeDefined();
    expect(ts?.severity).toBe("blocking");
  });

  it("does not raise TYPE_SPOOF when extension matches real type", () => {
    const rule = makeRule({ allowedFormats: ["jpg"] });
    const meta = makeMeta({ realType: "jpg", name: "photo.jpg" });
    const issues = validate(meta, rule, makeCtx(rule));
    expect(issues.find((i) => i.code === "TYPE_SPOOF")).toBeUndefined();
  });
});

// ----- TOO_LARGE -----

describe("TOO_LARGE", () => {
  it("raises TOO_LARGE (blocking) when file is over maxBytes", () => {
    const rule = makeRule({ maxBytes: 50 * 1024 });
    const meta = makeMeta({ size: 100 * 1024 });
    const issues = validate(meta, rule, makeCtx(rule));
    const tl = issues.find((i) => i.code === "TOO_LARGE");
    expect(tl).toBeDefined();
    expect(tl?.severity).toBe("blocking");
  });

  it("includes fix=compress for JPG", () => {
    const rule = makeRule({ allowedFormats: ["jpg"], maxBytes: 50 * 1024 });
    const meta = makeMeta({ realType: "jpg", name: "photo.jpg", size: 1024 * 1024 });
    const issues = validate(meta, rule, makeCtx(rule));
    const tl = issues.find((i) => i.code === "TOO_LARGE");
    expect(tl?.fix).toBe("compress");
  });

  it("includes fix=compress for PNG", () => {
    const rule = makeRule({ allowedFormats: ["jpg", "png"], maxBytes: 50 * 1024 });
    const meta = makeMeta({ realType: "png", name: "photo.png", size: 1024 * 1024 });
    const issues = validate(meta, rule, makeCtx(rule));
    const tl = issues.find((i) => i.code === "TOO_LARGE");
    expect(tl?.fix).toBe("compress");
  });

  it("has no fix for pure-PDF slots", () => {
    const rule = makeRule({ allowedFormats: ["pdf"], maxBytes: 1024 * 1024 });
    const meta = makeMeta({ realType: "pdf", name: "doc.pdf", size: 3 * 1024 * 1024 });
    const issues = validate(meta, rule, makeCtx(rule));
    const tl = issues.find((i) => i.code === "TOO_LARGE");
    expect(tl?.fix).toBeUndefined();
  });

  it("message includes exact sizes", () => {
    const rule = makeRule({ maxBytes: 50 * 1024 });
    const meta = makeMeta({ size: 1843200 }); // 1.8 MB
    const issues = validate(meta, rule, makeCtx(rule));
    const tl = issues.find((i) => i.code === "TOO_LARGE");
    expect(tl?.message).toMatch("1.8 MB");
    expect(tl?.message).toMatch("50 KB");
  });

  it("does not raise TOO_LARGE when file is exactly at the limit", () => {
    const rule = makeRule({ maxBytes: 50 * 1024 });
    const meta = makeMeta({ size: 50 * 1024 });
    const issues = validate(meta, rule, makeCtx(rule));
    expect(issues.find((i) => i.code === "TOO_LARGE")).toBeUndefined();
  });
});

// ----- TOO_SMALL -----

describe("TOO_SMALL", () => {
  it("raises TOO_SMALL (blocking, no fix) when file is under minBytes", () => {
    const rule = makeRule({ allowedFormats: ["jpg"], minBytes: 10 * 1024 });
    const meta = makeMeta({ realType: "jpg", name: "sig.jpg", size: 2 * 1024 });
    const issues = validate(meta, rule, makeCtx(rule));
    const ts = issues.find((i) => i.code === "TOO_SMALL");
    expect(ts).toBeDefined();
    expect(ts?.severity).toBe("blocking");
    expect(ts?.fix).toBeUndefined();
  });
});

// ----- DIMENSIONS -----

describe("DIMENSIONS", () => {
  it("raises DIMENSIONS (blocking, fix=resize) when image is too small", () => {
    const rule = makeRule({
      allowedFormats: ["jpg"],
      minWidth: 100,
      minHeight: 100,
    });
    const meta = makeMeta({
      realType: "jpg",
      name: "photo.jpg",
      width: 50,
      height: 50,
    });
    const issues = validate(meta, rule, makeCtx(rule));
    const di = issues.find((i) => i.code === "DIMENSIONS");
    expect(di).toBeDefined();
    expect(di?.severity).toBe("blocking");
    expect(di?.fix).toBe("resize");
  });

  it("does not raise DIMENSIONS for a PDF", () => {
    const rule = makeRule({ allowedFormats: ["pdf"], minWidth: 100 });
    const meta = makeMeta({ realType: "pdf", name: "doc.pdf" });
    const issues = validate(meta, rule, makeCtx(rule));
    expect(issues.find((i) => i.code === "DIMENSIONS")).toBeUndefined();
  });
});

// ----- ENCRYPTED_PDF -----

describe("ENCRYPTED_PDF", () => {
  it("raises ENCRYPTED_PDF (blocking, no fix) for encrypted PDFs", () => {
    const rule = makeRule({ allowedFormats: ["pdf"] });
    const meta = makeMeta({ realType: "pdf", name: "doc.pdf", encrypted: true });
    const issues = validate(meta, rule, makeCtx(rule));
    const ep = issues.find((i) => i.code === "ENCRYPTED_PDF");
    expect(ep).toBeDefined();
    expect(ep?.severity).toBe("blocking");
    expect(ep?.fix).toBeUndefined();
  });
});

// ----- FILENAME -----

describe("FILENAME", () => {
  it("raises FILENAME (advisory, fix=rename) when name differs from suggested", () => {
    const rule = makeRule({ suggestedFilename: "income_certificate.pdf" });
    const meta = makeMeta({ name: "college_document.pdf" });
    const issues = validate(meta, rule, makeCtx(rule));
    const fn = issues.find((i) => i.code === "FILENAME");
    expect(fn?.severity).toBe("advisory");
    expect(fn?.fix).toBe("rename");
  });

  it("does not raise FILENAME when name matches exactly", () => {
    const rule = makeRule({ suggestedFilename: "test_document.pdf" });
    const meta = makeMeta({ name: "test_document.pdf" });
    const issues = validate(meta, rule, makeCtx(rule));
    expect(issues.find((i) => i.code === "FILENAME")).toBeUndefined();
  });
});

// ----- IDENTITY -----

describe("IDENTITY", () => {
  it("raises IDENTITY (confirm) for an unclear filename like college_document.pdf", () => {
    const rule = makeRule({
      id: "income-certificate",
      label: "Income Certificate",
      keywords: ["income", "certificate", "salary"],
      suggestedFilename: "income_certificate.pdf",
    });
    const meta = makeMeta({ name: "college_document.pdf" });
    const issues = validate(meta, rule, makeCtx(rule));
    const id = issues.find((i) => i.code === "IDENTITY");
    expect(id).toBeDefined();
    expect(id?.severity).toBe("confirm");
  });

  it("raises IDENTITY for document1.pdf (generic)", () => {
    const rule = makeRule({
      id: "income-certificate",
      label: "Income Certificate",
      keywords: ["income", "certificate", "salary"],
      suggestedFilename: "income_certificate.pdf",
    });
    const meta = makeMeta({ name: "document1.pdf" });
    const issues = validate(meta, rule, makeCtx(rule));
    expect(issues.find((i) => i.code === "IDENTITY")).toBeDefined();
  });

  it("does NOT raise IDENTITY for income_certificate.pdf (clear match)", () => {
    const rule = makeRule({
      id: "income-certificate",
      label: "Income Certificate",
      keywords: ["income", "certificate", "salary"],
      suggestedFilename: "income_certificate.pdf",
    });
    const meta = makeMeta({ name: "income_certificate.pdf" });
    const issues = validate(meta, rule, makeCtx(rule));
    expect(issues.find((i) => i.code === "IDENTITY")).toBeUndefined();
  });
});

// ----- DUPLICATE -----

describe("DUPLICATE", () => {
  it("raises DUPLICATE (confirm) when the same SHA-256 is used in another slot", () => {
    const rule = makeRule();
    const meta = makeMeta({ sha256: "deadbeef" });
    const ctx = {
      slots: makeCtx(rule).slots,
      currentSlotId: rule.id,
      duplicates: new Map([["deadbeef", { slotId: "other-slot", label: "Other Document" }]]),
    };
    const issues = validate(meta, rule, ctx);
    const dup = issues.find((i) => i.code === "DUPLICATE");
    expect(dup).toBeDefined();
    expect(dup?.severity).toBe("confirm");
  });
});
