"use client";

import { motion } from "motion/react";
import { DELETE_PROJECT_MODAL_ROW, PROJECT_FORM_FEEDBACK } from "@/data/dashboard-form";
import type { ProjectTargetRow } from "@/types/dashboard";
import { MaterialIcon } from "@/shared/material-icon";
import { Button } from "@/shared/button";

interface DeleteProjectModalProps {
  row: ProjectTargetRow;
  pending: boolean;
  onClose: () => void;
  onConfirm: (row: ProjectTargetRow) => void | Promise<unknown>;
}

export function DeleteProjectModal({
  row,
  pending,
  onClose,
  onConfirm,
}: DeleteProjectModalProps) {
  async function handleConfirm() {
    if (pending) return;
    await onConfirm(row);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      className="fixed inset-0 left-[260px] top-[72px] z-30 flex items-center justify-center overflow-y-auto bg-basin/75 p-4 backdrop-blur-sm"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={DELETE_PROJECT_MODAL_ROW.title}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-[520px] rounded-[20px] border border-steel bg-panel p-8 shadow-modal-glow"
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-rose/40 to-transparent"
        />
        <div className="flex items-center justify-between border-b border-steel/40 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-basin border border-steel">
              <MaterialIcon name="delete" className="text-[19px] text-rose" />
            </div>
            <h2 className="font-display text-headline-md font-bold text-foam">
              {DELETE_PROJECT_MODAL_ROW.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={DELETE_PROJECT_MODAL_ROW.closeLabel}
            title={DELETE_PROJECT_MODAL_ROW.closeLabel}
            disabled={pending}
            className="flex h-9 w-9 items-center justify-center rounded-full text-mist transition-colors hover:bg-basin/60 hover:text-foam"
          >
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>
        <form className="flex flex-col gap-5 pt-6" onSubmit={(event) => event.preventDefault()}>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-label-sm uppercase text-cinder">
              {DELETE_PROJECT_MODAL_ROW.copyHeading}
            </span>
            <p className="font-display text-body-md text-smoke">
              {DELETE_PROJECT_MODAL_ROW.copy}
            </p>
            <div className="flex items-center justify-between rounded-xl border border-steel bg-basin px-4 py-3">
              <span className="font-mono text-label-sm uppercase text-smoke">
                {DELETE_PROJECT_MODAL_ROW.nameLabel}
              </span>
              <span className="font-mono text-code-md text-foam">{row.name}</span>
            </div>
          </div>
          <div className="mt-1 flex items-center justify-end gap-3 border-t border-steel/50 pt-4">
            <Button
              variant="champagne"
              onClick={onClose}
              disabled={pending}
              className="h-10 px-5"
            >
              {DELETE_PROJECT_MODAL_ROW.cancelLabel}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={pending}
              className="h-10 gap-2 px-6 font-bold shadow-ice-submit hover:shadow-ice-halo"
            >
              <MaterialIcon
                name={pending ? "progress_activity" : DELETE_PROJECT_MODAL_ROW.submitIcon}
                className={pending ? "text-[18px] animate-spin" : "text-[18px]"}
              />
              <span>{pending ? PROJECT_FORM_FEEDBACK.pendingLabel : DELETE_PROJECT_MODAL_ROW.submitLabel}</span>
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
