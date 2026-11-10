"use client";

import { motion } from "motion/react";
import { DASHBOARD_GREETING_ROW } from "@/data/dashboard";
import { MaterialIcon } from "@/shared/material-icon";

export function DashboardHeader({
  name,
  onCreate,
}: {
  name: string;
  onCreate: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <h1 className="font-display text-headline-lg tracking-tight text-frost">
          {name ? `${DASHBOARD_GREETING_ROW.title}, ${name}` : DASHBOARD_GREETING_ROW.title}
        </h1>
        <p className="mt-1 font-display text-body-md text-smoke">
          {DASHBOARD_GREETING_ROW.subtitle}
        </p>
      </div>
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onCreate}
        className="flex shrink-0 items-center gap-2 rounded-full bg-ice px-5 py-2.5 transition-all duration-200 hover:shadow-ice-halo active:scale-95"
      >
        <MaterialIcon name="add" className="text-[18px] text-abyss" />
        <span className="font-display text-body-md font-semibold text-abyss">
          {DASHBOARD_GREETING_ROW.actionLabel}
        </span>
      </motion.button>
    </div>
  );
}
