import { AiPlanSection } from "@/components/landing/ai-plan-section";
import { CtaBanner } from "@/components/landing/cta-banner";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { Footer } from "@/components/landing/footer";
import { HeroSection } from "@/components/landing/hero-section";
import { Navbar } from "@/components/landing/navbar";
import { TechStrip } from "@/components/landing/tech-strip";
import { WorkflowSection } from "@/components/landing/workflow-section";

export function LandingPage() {
  return (
    <div className="relative flex flex-col overflow-x-hidden bg-navy font-display text-foam selection:bg-teal/30 selection:text-foam">
      <Navbar />
      <main>
        <HeroSection />
        <TechStrip />
        <FeaturesGrid />
        <WorkflowSection />
        <AiPlanSection />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
