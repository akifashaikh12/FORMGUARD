"use client";

import { useFormguardStore } from "@/lib/store";
import { LandingScreen } from "@/screens/LandingScreen";
import { SelectScreen } from "@/screens/SelectScreen";
import { RequirementsScreen } from "@/screens/RequirementsScreen";
import { UploadScreen } from "@/screens/UploadScreen";
import { FixScreen } from "@/screens/FixScreen";
import { ReadinessScreen } from "@/screens/ReadinessScreen";

export default function Home() {
  const step = useFormguardStore((s) => s.step);

  return (
    <main className="min-h-screen bg-gray-50">
      {step === "landing" && <LandingScreen />}
      {step === "select" && <SelectScreen />}
      {step === "requirements" && <RequirementsScreen />}
      {step === "upload" && <UploadScreen />}
      {step === "fix" && <FixScreen />}
      {step === "readiness" && <ReadinessScreen />}
    </main>
  );
}
