"use client";

import { useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { HowItWorks } from "@/components/HowItWorks";
import { SacReadsApp } from "@/components/SacReadsApp";

export function SacReadsHome() {
  const [savedCount, setSavedCount] = useState(0);

  return (
    <div className="min-h-screen bg-[#f8f5ee] text-[#20231c]">
      <Header savedCount={savedCount} />
      <main id="home">
        <SacReadsApp onSavedCountChange={setSavedCount} />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
}
