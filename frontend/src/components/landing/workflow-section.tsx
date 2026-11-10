"use client";

import { motion } from "motion/react";
import type { Variants } from "motion/react";
import {
  WORKFLOW_HEADING,
  WORKFLOW_LABEL,
  WORKFLOW_STEPS,
  WORKFLOW_SUBHEADING,
} from "@/data/workflow";
import { MaterialIcon } from "@/shared/material-icon";
import { cn } from "@/utils/class-names";
import type { WorkflowStep, WorkflowStepTone } from "@/types/landing";

const SECTION_VARIANTS: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const STEP_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const STEP_TONE_STYLES: Record<WorkflowStepTone, { number: string; tile: string; card: string }> = {
  ice: { number: "text-ice", tile: "border-steel text-teal", card: "border-ice/25" },
  lavender: {
    number: "text-lavender",
    tile: "border-lavender/40 text-lavender",
    card: "border-ice/25",
  },
  gold: {
    number: "text-champagne",
    tile: "border-champagne/40 text-champagne",
    card: "border-champagne/40 shadow-gold-soft",
  },
  mint: { number: "text-ice", tile: "border-steel text-mint", card: "border-ice/25" },
};

function WorkflowCard({ step }: { step: WorkflowStep }) {
  const toneStyles = STEP_TONE_STYLES[step.tone];
  return (
    <motion.div
      variants={STEP_VARIANTS}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className={cn(
        "relative z-10 flex flex-col gap-4 overflow-hidden rounded-[20px] border bg-panel/70 p-6 backdrop-blur-md",
        toneStyles.card,
      )}
    >
      {step.tone === "gold" ? (
        <motion.span
          aria-hidden="true"
          className="shadow-gold-glow pointer-events-none absolute inset-0 rounded-[20px]"
          animate={{ opacity: [0, 0.35, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
      <div className="flex items-center justify-between">
        <span className={cn("font-mono text-headline-sm font-bold", toneStyles.number)}>
          {step.index}
        </span>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border bg-basin",
            toneStyles.tile,
          )}
        >
          <MaterialIcon name={step.icon} className="text-[20px]" />
        </div>
      </div>
      <div>
        <div className="mb-1 flex items-center gap-2">
          <h4 className="font-display text-[17px] font-semibold text-foam">{step.title}</h4>
          {step.badge ? (
            <span className="rounded-full border border-champagne/40 bg-champagne/15 px-2 py-0.5 font-mono text-[10px] font-bold text-champagne">
              {step.badge}
            </span>
          ) : null}
        </div>
        <p className="font-display text-body-sm leading-snug text-mist">{step.description}</p>
      </div>
    </motion.div>
  );
}

export function WorkflowSection() {
  return (
    <section
      id="how-it-works"
      className="mx-auto flex w-full max-w-[1440px] flex-col gap-16 px-6 py-24 lg:px-20"
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <span className="font-mono text-label-sm uppercase tracking-widest text-teal">
          {WORKFLOW_LABEL}
        </span>
        <h2 className="font-display text-headline-lg font-bold tracking-tight text-foam lg:text-[40px]">
          {WORKFLOW_HEADING}
        </h2>
        <p className="font-display text-body-lg text-mist">{WORKFLOW_SUBHEADING}</p>
      </div>
      <div className="relative w-full">
        <div
          aria-hidden="true"
          className="absolute left-8 right-8 top-1/2 hidden h-[2px] -translate-y-1/2 border-t-2 border-dashed border-teal/40 lg:block"
        />
        <motion.div
          className="relative z-10 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          variants={SECTION_VARIANTS}
        >
          {WORKFLOW_STEPS.map((step) => (
            <WorkflowCard key={step.id} step={step} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
