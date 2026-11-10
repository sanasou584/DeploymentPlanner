"use client";

import { motion } from "motion/react";
import type { Variants } from "motion/react";
import { FEATURE_CARDS, FEATURES_HEADING, FEATURES_SUBHEADING } from "@/data/features";
import { MaterialIcon } from "@/shared/material-icon";
import { cn } from "@/utils/class-names";
import type { FeatureDescriptionSegment, FeatureTone } from "@/types/landing";

const SECTION_VARIANTS: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const CARD_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const TILE_STYLES: Record<FeatureTone, string> = {
  teal: "bg-teal/20 text-ice",
  lavender: "bg-lavender/20 text-lavender",
};

const CARD_BASE =
  "flex flex-col gap-4 rounded-[20px] border border-ice/20 bg-panel/60 p-7 backdrop-blur-md transition-all hover:border-teal hover:shadow-card-hover";

function DescriptionSegmentView({ segment }: { segment: FeatureDescriptionSegment }) {
  if (segment.kind === "code") {
    return <code className="font-mono text-[12px] text-ice">{segment.text}</code>;
  }
  return <>{segment.text}</>;
}

export function FeaturesGrid() {
  return (
    <section
      id="features"
      className="mx-auto flex w-full max-w-[1440px] flex-col gap-14 px-6 py-24 lg:px-20"
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <h2 className="font-display text-headline-lg font-bold tracking-tight text-foam lg:text-[40px]">
          {FEATURES_HEADING}
        </h2>
        <p className="font-display text-body-lg text-mist">{FEATURES_SUBHEADING}</p>
      </div>
      <motion.div
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        variants={SECTION_VARIANTS}
      >
        {FEATURE_CARDS.map((card) => (
          <motion.article
            key={card.id}
            variants={CARD_VARIANTS}
            whileHover={{ y: -4 }}
            className={cn(CARD_BASE, card.tone === "lavender" && "hover:border-lavender")}
          >
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl",
                TILE_STYLES[card.tone],
              )}
            >
              <MaterialIcon name={card.icon} className="text-[26px]" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-headline-sm text-foam">{card.title}</h3>
              {card.tag ? (
                <span className="rounded border border-lavender/30 bg-lavender/10 px-2 py-0.5 font-mono text-[10px] uppercase text-lavender">
                  {card.tag}
                </span>
              ) : null}
            </div>
            <p className="font-display text-body-md leading-relaxed text-mist">
              {card.description.map((segment, index) => (
                <DescriptionSegmentView key={index} segment={segment} />
              ))}
            </p>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}
