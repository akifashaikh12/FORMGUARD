/**
 * Deterministic clock used by the readiness engine.
 *
 * When `NEXT_PUBLIC_DEMO_NOW` is set (to an ISO 8601 string), every call to
 * `now()` returns that same instant. This lets the demo and QA flows pretend
 * the deadline has already passed without waiting for real time.
 *
 * In production, `now()` is effectively `Date.now()` (one call per readiness
 * computation, not a cached value), so freshly loaded pages always use the
 * real wall clock.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var __formguardDemoNow: any;
}

let demoNow: Date | null = null;

function readDemoNow(): Date | null {
  const raw = process.env["NEXT_PUBLIC_DEMO_NOW"];
  if (!raw) {
    return null;
  }
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed);
}

/**
 * Return the current time.
 *
 * When NEXT_PUBLIC_DEMO_NOW is set (or setNowForTest was called), returns that
 * fixed instant. Otherwise returns `new Date()` — a fresh value every call so
 * the real wall-clock is never cached across readiness computations.
 */
export function now(): Date {
  if (demoNow) {
    return demoNow;
  }

  const demo = readDemoNow();
  if (demo) {
    demoNow = demo;
    return demoNow;
  }

  return new Date();
}

/**
 * Force the demo clock for the current process lifetime.
 *
 * Only used in tests and in the QA script. In the browser this is a no-op
 * unless `NEXT_PUBLIC_DEMO_NOW` is set server-side at build time (which
 * Next.js makes available through `process.env` at build time only — the
 * client never sees server-only env).
 */
export function setNowForTest(date: Date): void {
  demoNow = date;
}

/**
 * Clear the demo clock so the next `now()` call re-reads env / real time.
 */
export function resetClock(): void {
  demoNow = null;
}
