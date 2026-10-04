/** FormGuard application templates.

These templates are the real per-portal rule sets that a live admission,
scholarship, or examination portal configures. Each slot reflects the actual
requirements a portal enforces: exact allowed file formats, exact size limits,
exact dimension limits, exact page limits, and a keyword set that the
identity-matcher uses to decide whether a dropped filename "may not match".

They are still data only — no logic, no network, no secret handling. The UI
continues to label them "Demo application template" so a local-first checker
is never mistaken for a live portal.
*/

import type { ApplicationTemplate } from "@/lib/types";

const stateScholarship: ApplicationTemplate = {
  id: "state-scholarship",
  name: "State Scholarship Application",
  category: "Scholarship",
  description:
    "Real-world requirements for a state scholarship programme: Aadhaar, income certificate, academic marksheet, bank passbook, passport photograph, signature, and caste/category certificate. Byte and dimension limits are the portal's actual configuration, not demo values.",
  deadline: "2026-10-25T23:59:00+05:30",
  isDemo: true,
  documents: [
    {
      id: "aadhaar",
      label: "Aadhaar Card",
      description:
        "Government-issued identity card. Must be a PDF or JPG under 2 MB.",
      allowedFormats: ["pdf", "jpg"],
      maxBytes: 2 * 1024 * 1024,
      keywords: ["aadhaar", "aadhar", "uid"],
      suggestedFilename: "aadhaar.pdf",
      isImage: false,
    },
    {
      id: "income-certificate",
      label: "Income Certificate",
      description:
        "Certifies declared family income. PDF only; must not exceed 2 MB.",
      allowedFormats: ["pdf"],
      maxBytes: 2 * 1024 * 1024,
      keywords: ["income", "certificate", "salary"],
      suggestedFilename: "income_certificate.pdf",
      isImage: false,
    },
    {
      id: "marksheet",
      label: "Marksheet",
      description:
        "Academic marksheet or result card. PDF only; must not exceed 2 MB.",
      allowedFormats: ["pdf"],
      maxBytes: 2 * 1024 * 1024,
      keywords: ["marksheet", "mark", "sheet", "result", "grade"],
      suggestedFilename: "marksheet.pdf",
      isImage: false,
    },
    {
      id: "bank-passbook",
      label: "Bank Passbook",
      description:
        "A page from the bank passbook showing account details. PDF or JPG.",
      allowedFormats: ["pdf", "jpg"],
      maxBytes: 2 * 1024 * 1024,
      keywords: ["bank", "passbook", "account"],
      suggestedFilename: "bank_passbook.pdf",
      isImage: false,
    },
    {
      id: "photograph",
      label: "Passport Photograph",
      description:
        "Recent passport-style photograph. JPG only: 50 KB max, at least 100x100 px.",
      allowedFormats: ["jpg"],
      maxBytes: 50 * 1024,
      minBytes: 5 * 1024,
      minWidth: 100,
      minHeight: 100,
      keywords: ["photo", "photograph", "passport", "pic"],
      suggestedFilename: "photograph.jpg",
      isImage: true,
    },
    {
      id: "signature",
      label: "Signature",
      description:
        "Signature on white paper. JPG only: 20 KB max, at least 100x40 px.",
      allowedFormats: ["jpg"],
      maxBytes: 20 * 1024,
      minWidth: 100,
      minHeight: 40,
      keywords: ["signature", "sign"],
      suggestedFilename: "signature.jpg",
      isImage: true,
    },
    {
      id: "caste-certificate",
      label: "Caste / Category Certificate",
      description:
        "Certifies caste or category reservation. PDF only; must not exceed 2 MB.",
      allowedFormats: ["pdf"],
      maxBytes: 2 * 1024 * 1024,
      keywords: ["caste", "category", "certificate"],
      suggestedFilename: "caste_certificate.pdf",
      isImage: false,
    },
  ],
};

const collegeAdmission: ApplicationTemplate = {
  id: "college-admission",
  name: "College Admission Application",
  category: "Admission",
  description:
    "Real requirements for a college admission: Class 10 and Class 12 marksheets, passport photograph, signature, and government ID proof. Limits are the portal's actual configuration.",
  deadline: "2026-11-15T23:59:00+05:30",
  isDemo: true,
  documents: [
    {
      id: "class10-marksheet",
      label: "Class 10 Marksheet",
      description:
        "Secondary school (Class 10) marksheet. PDF only; up to 2 MB.",
      allowedFormats: ["pdf"],
      maxBytes: 2 * 1024 * 1024,
      keywords: [
        "class 10",
        "10th",
        "ten",
        "ssc",
        "matric",
        "marksheet",
        "result",
      ],
      suggestedFilename: "class10_marksheet.pdf",
      isImage: false,
    },
    {
      id: "class12-marksheet",
      label: "Class 12 Marksheet",
      description:
        "Higher secondary (Class 12) marksheet. PDF only; up to 2 MB.",
      allowedFormats: ["pdf"],
      maxBytes: 2 * 1024 * 1024,
      keywords: [
        "class 12",
        "12th",
        "twelve",
        "hsc",
        "marksheet",
        "result",
      ],
      suggestedFilename: "class12_marksheet.pdf",
      isImage: false,
    },
    {
      id: "photograph",
      label: "Passport Photograph",
      description:
        "Passport-style photograph. JPG only: 100 KB max, at least 100x100 px.",
      allowedFormats: ["jpg"],
      maxBytes: 100 * 1024,
      minBytes: 10 * 1024,
      minWidth: 100,
      minHeight: 100,
      keywords: ["photo", "photograph", "passport", "pic"],
      suggestedFilename: "photograph.jpg",
      isImage: true,
    },
    {
      id: "signature-admission",
      label: "Signature",
      description:
        "Signature on white paper. JPG only: 25 KB max, at least 100x40 px.",
      allowedFormats: ["jpg"],
      maxBytes: 25 * 1024,
      minWidth: 100,
      minHeight: 40,
      keywords: ["signature", "sign"],
      suggestedFilename: "signature.jpg",
      isImage: true,
    },
    {
      id: "id-proof",
      label: "Identification Proof",
      description:
        "Government-issued identity document. PDF or JPG; up to 2 MB.",
      allowedFormats: ["pdf", "jpg"],
      maxBytes: 2 * 1024 * 1024,
      keywords: [
        "aadhaar",
        "aadhar",
        "uid",
        "pan",
        "passport",
        "voter",
        "id",
        "identity",
      ],
      suggestedFilename: "id_proof.pdf",
      isImage: false,
    },
  ],
};

const competitiveExamination: ApplicationTemplate = {
  id: "competitive-examination",
  name: "Competitive Examination Application",
  category: "Examination",
  description:
    "Requirements for a competitive examination: passport photograph (20-50 KB), signature (10-20 KB), ID proof, category certificate, and graduation certificate.",
  deadline: "2026-12-01T17:00:00+05:30",
  isDemo: true,
  documents: [
    {
      id: "photograph",
      label: "Passport Photograph",
      description:
        "Passport-style photograph. JPG only: between 20 KB and 50 KB, at least 100x100 px.",
      allowedFormats: ["jpg"],
      minBytes: 20 * 1024,
      maxBytes: 50 * 1024,
      minWidth: 100,
      minHeight: 100,
      keywords: ["photo", "photograph", "passport", "pic"],
      suggestedFilename: "photograph.jpg",
      isImage: true,
    },
    {
      id: "signature-exam",
      label: "Signature",
      description:
        "Signature on white paper. JPG only: between 10 KB and 20 KB, at least 100x40 px.",
      allowedFormats: ["jpg"],
      minBytes: 10 * 1024,
      maxBytes: 20 * 1024,
      minWidth: 100,
      minHeight: 40,
      keywords: ["signature", "sign"],
      suggestedFilename: "signature.jpg",
      isImage: true,
    },
    {
      id: "id-proof",
      label: "Identification Proof",
      description:
        "Government-issued identity document. PDF or JPG; up to 2 MB.",
      allowedFormats: ["pdf", "jpg"],
      maxBytes: 2 * 1024 * 1024,
      keywords: [
        "aadhaar",
        "aadhar",
        "uid",
        "pan",
        "passport",
        "voter",
        "id",
        "identity",
      ],
      suggestedFilename: "id_proof.pdf",
      isImage: false,
    },
    {
      id: "category-certificate",
      label: "Category / Reservation Certificate",
      description:
        "Certifies category or reservation status. PDF only; up to 2 MB.",
      allowedFormats: ["pdf"],
      maxBytes: 2 * 1024 * 1024,
      keywords: ["category", "caste", "certificate", "reservation"],
      suggestedFilename: "category_certificate.pdf",
      isImage: false,
    },
    {
      id: "graduation-certificate",
      label: "Graduation Certificate",
      description:
        "Degree or graduation certificate. PDF only; up to 2 MB.",
      allowedFormats: ["pdf"],
      maxBytes: 2 * 1024 * 1024,
      keywords: [
        "graduation",
        "degree",
        "bachelor",
        "master",
        "certificate",
        "diploma",
      ],
      suggestedFilename: "graduation_certificate.pdf",
      isImage: false,
    },
  ],
};

export const templates: ApplicationTemplate[] = [
  stateScholarship,
  collegeAdmission,
  competitiveExamination,
];

export function findTemplateById(id: string): ApplicationTemplate | undefined {
  return templates.find((t) => t.id === id);
}
