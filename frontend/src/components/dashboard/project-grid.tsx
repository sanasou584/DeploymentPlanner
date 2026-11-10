"use client";

import { motion } from "motion/react";
import type { Variants } from "motion/react";
import type { ProjectRow } from "@/types/dashboard";
import { ProjectCard } from "@/components/dashboard/project-card";

const GRID_VARIANTS: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export function ProjectGrid({
  rows,
  pendingId,
  onEdit,
  onDelete,
  onConnect,
}: {
  rows: ProjectRow[];
  pendingId: string | null;
  onEdit: (row: ProjectRow) => void;
  onDelete: (row: ProjectRow) => void;
  onConnect: (row: ProjectRow) => void;
}) {
  return (
    <motion.div
      variants={GRID_VARIANTS}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-3 gap-5"
    >
      {rows.map((row) => (
        <ProjectCard
          key={row.id}
          row={row}
          menuPending={row.id === pendingId}
          onEdit={onEdit}
          onDelete={onDelete}
          onConnect={onConnect}
        />
      ))}
    </motion.div>
  );
}
