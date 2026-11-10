"use client";

import { motion } from "motion/react";
import { cn } from "@/utils/class-names";
import { MaterialIcon } from "@/shared/material-icon";

const STEPS = [
  { id: "repository", label: "Connect repository", done: true },
  { id: "analysis", label: "Run analysis", done: false },
  { id: "plan", label: "Deployment plan", done: false, soon: true },
  { id: "deploy", label: "Generate files and deploy", done: false, soon: true },
] as const;

export function PipelineStepper({ analysisStatus }: { analysisStatus: string | null }) {
  const analysisDone = analysisStatus === "COMPLETED";
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-steel bg-panel p-6 shadow-md">
      <p className="font-display text-headline-sm font-bold text-foam">Deployment pipeline</p>
      <ol className="flex flex-col gap-2">
        {STEPS.map((step, index) => {
          const isAnalysis = step.id === "analysis";
          const completed = step.id === "repository" ? true : isAnalysis ? analysisDone : step.done;
          const soon = "soon" in step && step.soon;
          return (
            <li key={step.id} className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-label-sm",
                  completed
                    ? "border-mint bg-mint/15 text-mint"
                    : soon
                      ? "border-champagne/40 bg-champagne/10 text-champagne"
                      : "border-steel bg-basin text-mist",
                )}
              >
                {completed ? (
                  <MaterialIcon name="check" className="text-[14px]" />
                ) : soon ? (
                  <MaterialIcon name="lock" className="text-[14px]" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </span>
              <span
                className={cn(
                  "font-display text-body-md",
                  completed ? "text-foam" : soon ? "text-mist" : "text-mist",
                )}
              >
                {step.label}
              </span>
              {soon ? (
                <span className="rounded-full bg-champagne/20 px-2 py-0.5 font-mono text-label-sm text-champagne">
                  Soon
                </span>
              ) : null}
              {index < STEPS.length - 1 ? (
                <motion.span
                  aria-hidden="true"
                  className="ml-auto h-px flex-1 bg-steel/40"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  style={{ transformOrigin: "left" }}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
