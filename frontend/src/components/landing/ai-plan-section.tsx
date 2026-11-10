"use client";

import { motion } from "motion/react";
import { AI_PLAN_BADGE, AI_PLAN_BODY, AI_PLAN_CHECKLIST, AI_PLAN_EDITOR, AI_PLAN_HEADLINE } from "@/data/ai-plan";
import { MaterialIcon } from "@/shared/material-icon";
import { cn } from "@/utils/class-names";
import type { ChecklistItem, SyntaxTone, YamlLine } from "@/types/landing";

const SYNTAX_STYLES: Record<SyntaxTone, string> = {
  key: "text-steel",
  value: "text-ice",
  number: "text-champagne",
  string: "text-mint",
  plain: "text-mist",
};

function ChecklistRowView({ row }: { row: ChecklistItem }) {
  return (
    <li className="flex items-center gap-3.5">
      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-mint/40 bg-mint/15 text-mint">
        <MaterialIcon name={row.icon} className="text-[16px]" />
      </div>
      <span className="font-display text-body-md font-medium text-foam">{row.label}</span>
    </li>
  );
}

function YamlLineView({ line }: { line: YamlLine }) {
  return (
    <div>
      <span>{" ".repeat(line.indent)}</span>
      {line.segments.map((segment, index) => (
        <span key={index} className={SYNTAX_STYLES[segment.tone]}>
          {segment.text}
        </span>
      ))}
    </div>
  );
}

export function AiPlanSection() {
  return (
    <section id="ai-plan" className="mx-auto w-full max-w-[1440px] px-6 py-24 lg:px-20">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="flex flex-col gap-6 lg:col-span-6">
          <div className="inline-flex w-max items-center gap-2 rounded-full border border-lavender/30 bg-lavender/10 px-3 py-1 font-mono text-label-md text-lavender">
            <MaterialIcon name={AI_PLAN_BADGE.icon} className="text-[16px]" />
            <span>{AI_PLAN_BADGE.label}</span>
          </div>
          <h2 className="font-display text-headline-lg font-bold leading-tight tracking-tight text-foam lg:text-[44px]">
            {AI_PLAN_HEADLINE.main}
            <br />
            {AI_PLAN_HEADLINE.accent}
          </h2>
          <p className="font-display text-body-lg leading-relaxed text-mist">{AI_PLAN_BODY}</p>
          <ul className="flex flex-col gap-4 pt-2">
            {AI_PLAN_CHECKLIST.map((row) => (
              <ChecklistRowView key={row.id} row={row} />
            ))}
          </ul>
        </div>
        <div className="lg:col-span-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="overflow-hidden rounded-[20px] border border-steel bg-basin font-mono shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-steel/50 bg-abyss px-5 py-3.5">
              <div className="flex items-center gap-3">
                <MaterialIcon name="terminal" className="text-[16px] text-mist" />
                <span className="font-display text-[13px] font-medium text-foam">
                  {AI_PLAN_EDITOR.file}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-lavender/30 bg-lavender/10 px-2.5 py-0.5 font-mono text-[11px] text-lavender">
                <MaterialIcon name={AI_PLAN_EDITOR.chip.icon} className="text-[13px]" />
                <span>{AI_PLAN_EDITOR.chip.label}</span>
              </div>
            </div>
            <div
              className={cn(
                "overflow-x-auto p-6 font-mono text-code-md leading-[22px] text-mist",
              )}
            >
              {AI_PLAN_EDITOR.lines.map((line) => (
                <YamlLineView key={line.id} line={line} />
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-steel/40 bg-abyss/80 px-5 py-2.5 font-display text-[11px] text-mist">
              <span>{AI_PLAN_EDITOR.statusMeta}</span>
              <span className="flex items-center gap-1 text-mint">
                <MaterialIcon name="check_circle" className="text-[13px]" />
                {AI_PLAN_EDITOR.statusOk}
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
