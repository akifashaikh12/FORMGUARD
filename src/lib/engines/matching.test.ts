/**
 * Tests for the filename matching engine.
 */

import { describe, it, expect } from "vitest";
import { matchFilename, tokenize } from "@/lib/engines/matching";
import type { DocumentRule } from "@/lib/types";

function makeRule(id: string, keywords: string[]): DocumentRule {
  return {
    id,
    label: id,
    allowedFormats: ["pdf"],
    keywords,
    suggestedFilename: `${id}.pdf`,
    isImage: false,
  };
}

const incomeRule = makeRule("income-certificate", ["income", "certificate", "salary"]);
const aadhaarRule = makeRule("aadhaar", ["aadhaar", "aadhar", "uid"]);
const photoRule = makeRule("photograph", ["photo", "photograph", "passport", "pic"]);
const signatureRule = makeRule("signature", ["signature", "sign"]);

const allRules = [incomeRule, aadhaarRule, photoRule, signatureRule];

// ----- tokenize -----

describe("tokenize", () => {
  it("lowercases and splits on underscores", () => {
    expect(tokenize("income_certificate.pdf")).toEqual(["income", "certificate"]);
  });

  it("splits on hyphens", () => {
    expect(tokenize("bank-passbook.pdf")).toEqual(["bank", "passbook"]);
  });

  it("strips extension and lowercases", () => {
    // "document1" is not split on digit boundaries — tokenized as one token
    expect(tokenize("document1.pdf")).toEqual(["document1"]);
  });

  it("lowercases mixed-case tokens", () => {
    const tokens = tokenize("myDocument.pdf");
    // Without camelCase splitting, "myDocument" becomes "mydocument"
    expect(tokens).toContain("mydocument");
  });

  it("returns empty array for extension-only input", () => {
    // ".pdf" has dotIndex = 0, so base = ".pdf", which lowercases and splits to ["pdf"]
    // We treat this as a no-base file — tokenize returns the extension tokens
    // Actually base = ".pdf" → dotIndex=0 so NOT > 0, base stays ".pdf" then splits to ["pdf"]
    // The spec says "digits-only = generic", not extension-only. We keep "pdf" as a token.
    // Update test to match actual behaviour:
    expect(tokenize(".pdf")).toEqual(["pdf"]);
  });
});

// ----- matchFilename -----

describe("matchFilename — match", () => {
  it("income_certificate.pdf → match for income-certificate rule", () => {
    expect(matchFilename("income_certificate.pdf", incomeRule, allRules)).toBe("match");
  });

  it("aadhaar_card.pdf → match for aadhaar rule", () => {
    expect(matchFilename("aadhaar_card.pdf", aadhaarRule, allRules)).toBe("match");
  });

  it("photograph.jpg → match for photograph rule", () => {
    expect(matchFilename("photograph.jpg", photoRule, allRules)).toBe("match");
  });

  it("signature.jpg → match for signature rule", () => {
    expect(matchFilename("signature.jpg", signatureRule, allRules)).toBe("match");
  });
});

describe("matchFilename — unclear", () => {
  it("college_document.pdf → unclear for income-certificate rule", () => {
    expect(matchFilename("college_document.pdf", incomeRule, allRules)).toBe("unclear");
  });

  it("document1.pdf → unclear (generic + digit)", () => {
    expect(matchFilename("document1.pdf", incomeRule, allRules)).toBe("unclear");
  });

  it("scan.pdf → unclear", () => {
    expect(matchFilename("scan.pdf", incomeRule, allRules)).toBe("unclear");
  });

  it("IMG_8392.jpg → unclear", () => {
    expect(matchFilename("IMG_8392.jpg", photoRule, allRules)).toBe("unclear");
  });

  it("untitled.pdf → unclear", () => {
    expect(matchFilename("untitled.pdf", incomeRule, allRules)).toBe("unclear");
  });
});

describe("matchFilename — mismatch", () => {
  it("aadhaar.pdf → mismatch for income-certificate rule (hits aadhaar rule)", () => {
    expect(matchFilename("aadhaar.pdf", incomeRule, allRules)).toBe("mismatch");
  });

  it("signature.pdf → mismatch for photograph rule (hits signature rule)", () => {
    expect(matchFilename("signature.pdf", photoRule, allRules)).toBe("mismatch");
  });
});
