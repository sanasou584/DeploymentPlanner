"use client";

import { motion, MotionConfig } from "motion/react";
import type { Variants } from "motion/react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ARGO_SATELLITE,
  HERO_BADGE,
  HERO_CTAS,
  HERO_HEADLINE,
  HERO_REASSURANCE,
  HERO_SUBTITLE,
  PLAN_WINDOW,
  REPLICA_SATELLITE,
  SERVICE_TABS,
} from "@/data/hero";
import { MaterialIcon } from "@/shared/material-icon";
import { buttonClass } from "@/shared/button";
import { cn } from "@/utils/class-names";
import type { LandingCtaKind, ServiceTab } from "@/types/landing";

const COPY_VARIANTS: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const COPY_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const HERO_CTA_STYLES: Record<LandingCtaKind, string> = {
  ice: buttonClass("primary", "px-7 py-3.5 text-[16px] gap-2 hover:bg-ice-dim"),
  "teal-outline": buttonClass("teal", "px-6 py-3.5 gap-2.5"),
  "gold-outline": buttonClass("champagne", "px-6 py-3.5"),
  ghost: "font-body-md text-mist transition-colors hover:text-foam",
};

interface SatelliteProps {
  className: string;
  floatPath: [number, number, number];
  duration: number;
  children: ReactNode;
}

function FloatingSatellite({
  className,
  floatPath,
  duration,
  children,
}: SatelliteProps) {
  return (
    <motion.div
      className={cn(
        "hidden items-center gap-3 rounded-xl border border-ice/20 bg-basin/90 px-4 shadow-xl backdrop-blur-md sm:flex",
        className,
      )}
      animate={{ y: [floatPath[0], floatPath[1], floatPath[2]] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

export function HeroSection() {
  const [activeTab, setActiveTab] = useState<ServiceTab["id"]>("backend");
  const [hpaEnabled, setHpaEnabled] = useState(true);

  return (
    <section>
      <MotionConfig reducedMotion="user">
        <div className="relative mx-auto w-full max-w-[1440px] overflow-hidden px-6 pt-16 pb-24 lg:px-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-steel/25 via-transparent to-navy opacity-80"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-10 left-1/4 -z-10 h-[480px] w-[480px] rounded-full bg-ice/18 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-40 right-10 -z-10 h-[520px] w-[520px] rounded-full bg-teal/15 blur-[160px]"
      />
      <div aria-hidden="true" className="dotted-ice-grid pointer-events-none absolute inset-0 -z-10 opacity-70" />
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <motion.div
          className="flex flex-col items-start gap-6 lg:col-span-7"
          initial="hidden"
          animate="show"
          variants={COPY_VARIANTS}
        >
          <motion.div
            variants={COPY_ITEM_VARIANTS}
            className="inline-flex items-center gap-2 rounded-full border border-lavender/30 bg-lavender/10 px-3.5 py-1.5 font-mono text-label-md text-lavender"
          >
            <MaterialIcon name={HERO_BADGE.icon} className="text-[16px]" />
            <span>{HERO_BADGE.label}</span>
          </motion.div>
          <motion.h1
            variants={COPY_ITEM_VARIANTS}
            className="font-display text-display-sm tracking-tight text-foam lg:text-[64px] lg:leading-[70px]"
          >
            {HERO_HEADLINE.main} <br />
            <span className="drop-ice-glow text-ice">{HERO_HEADLINE.accent}</span>
          </motion.h1>
          <motion.p variants={COPY_ITEM_VARIANTS} className="font-display text-body-lg max-w-xl leading-relaxed text-mist">
            {HERO_SUBTITLE}
          </motion.p>
          <motion.div variants={COPY_ITEM_VARIANTS} className="flex flex-wrap items-center gap-4 pt-2">
            {HERO_CTAS.map((cta) => (
              <Link key={cta.id} href={cta.href} className={HERO_CTA_STYLES[cta.kind]}>
                <span>{cta.label}</span>
                {cta.icon ? <MaterialIcon name={cta.icon} className="text-[20px]" /> : null}
              </Link>
            ))}
          </motion.div>
          <motion.div
            variants={COPY_ITEM_VARIANTS}
            className="flex items-center gap-2 pt-2 font-display text-body-sm text-mist"
          >
            <MaterialIcon name={HERO_REASSURANCE.icon} className="text-[18px] text-teal" />
            <span>{HERO_REASSURANCE.label}</span>
          </motion.div>
        </motion.div>
        <div className="relative flex w-full justify-center lg:col-span-5 lg:justify-end">
          <FloatingSatellite
            className="absolute -top-6 -left-6 z-20 py-2.5"
            floatPath={REPLICA_SATELLITE.float.path}
            duration={REPLICA_SATELLITE.float.duration}
          >
            <span className="font-mono text-code-md text-foam">
              {REPLICA_SATELLITE.codeLabel}{" "}
              <span className="text-ice">{REPLICA_SATELLITE.codeValue}</span>
            </span>
            <span
              aria-hidden="true"
              className="inline-flex items-center gap-1 rounded border border-mint/30 bg-mint/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-mint"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-mint" />
              {REPLICA_SATELLITE.tag}
            </span>
            <span className="sr-only" role="status" aria-label={REPLICA_SATELLITE.ariaLabel} />
          </FloatingSatellite>
          <FloatingSatellite
            className="absolute -right-4 -bottom-6 z-20 py-3"
            floatPath={ARGO_SATELLITE.float.path}
            duration={ARGO_SATELLITE.float.duration}
          >
            <MaterialIcon
              name={ARGO_SATELLITE.icon}
              className="animate-[spin_12s_linear_infinite] text-[20px] text-teal"
            />
            <div className="flex flex-col text-left">
              <span className="font-display text-[12px] font-semibold tracking-wide text-foam">
                {ARGO_SATELLITE.title}
              </span>
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-mist">
                <span className="h-2 w-2 animate-pulse rounded-full bg-mint" />
                <span>{ARGO_SATELLITE.status}</span>
              </div>
            </div>
            <span className="sr-only" role="status" aria-label={ARGO_SATELLITE.ariaLabel} />
          </FloatingSatellite>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex w-full max-w-[540px] flex-col gap-5 rounded-[24px] border border-ice/25 bg-panel/70 p-5 shadow-2xl backdrop-blur-xl md:p-6"
          >
            <div className="flex items-center justify-between border-b border-steel/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-crimson/80" />
                <span className="h-3 w-3 rounded-full bg-orange/80" />
                <span className="h-3 w-3 rounded-full bg-mint/80" />
              </div>
              <div className="flex items-center gap-1.5 font-mono text-code-md text-mist">
                <MaterialIcon name="folder_data" className="text-[15px] text-teal" />
                <span>{PLAN_WINDOW.title}</span>
              </div>
              <div className="w-12" />
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-steel/40 bg-basin/70 p-1" role="tablist" aria-label="Service layers">
              {SERVICE_TABS.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative flex-1 rounded-lg py-1.5 text-center font-display text-body-sm font-semibold text-navy"
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="active-tab-pill"
                        className="absolute inset-0 rounded-lg bg-teal shadow-sm"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    ) : null}
                    <span className={cn("relative z-10", !isActive && "font-normal text-mist hover:text-foam")}>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {PLAN_WINDOW.metrics.map((metric) => (
                <div key={metric.id} className="rounded-xl border border-steel/40 bg-basin/60 p-3">
                  <span className="block font-mono text-[11px] uppercase tracking-wider text-mist">
                    {metric.label}
                  </span>
                  <span className="mt-1 block font-mono text-headline-sm font-semibold text-ice">
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-steel/40 bg-basin/60 p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/20 text-teal">
                  <MaterialIcon name={PLAN_WINDOW.hpa.icon} className="text-[18px]" />
                </div>
                <div>
                  <span className="block font-display text-body-sm font-medium text-foam">
                    {PLAN_WINDOW.hpa.label}
                  </span>
                  <span className="font-mono text-[11px] text-mist">{PLAN_WINDOW.hpa.meta}</span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={hpaEnabled}
                aria-label={PLAN_WINDOW.hpa.label}
                onClick={() => setHpaEnabled((enabled) => !enabled)}
                className={cn(
                  "flex h-6 w-11 cursor-pointer items-center rounded-full p-0.5 transition-colors",
                  hpaEnabled ? "justify-end bg-teal" : "justify-start bg-steel/60",
                )}
              >
                <motion.span
                  className="h-5 w-5 rounded-full bg-navy shadow-md"
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
            <div className="flex items-center justify-between px-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-lavender/30 bg-lavender/10 px-3 py-1 font-mono text-[11px] text-lavender">
                <MaterialIcon name={PLAN_WINDOW.aiChip.icon} className="text-[14px]" />
                <span>{PLAN_WINDOW.aiChip.label}</span>
              </div>
              <span className="font-mono text-[11px] text-mist">{PLAN_WINDOW.riskLabel}</span>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-steel/40 pt-2">
              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="cursor-pointer rounded-xl border border-steel px-4 py-2 font-display text-body-sm text-mist transition-colors hover:border-mist hover:text-foam"
              >
                {PLAN_WINDOW.rejectLabel}
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-ice px-5 py-2 font-display text-body-sm font-semibold text-ice transition-colors hover:bg-ice/10"
              >
                <MaterialIcon name="done_all" className="text-[18px]" />
                {PLAN_WINDOW.approveLabel}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
        </div>
      </MotionConfig>
    </section>
  );
}
