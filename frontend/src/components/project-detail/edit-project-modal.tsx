"use client";

import { motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { cn } from "@/utils/class-names";
import { MaterialIcon } from "@/shared/material-icon";
import { Button } from "@/shared/button";
import { AlertBanner } from "@/shared/alert-banner";
import { PROJECT_NAME_LIMITS } from "@/data/dashboard-form";
import type { Project } from "@/types/project";

export function EditProjectModal({
  project,
  pending,
  onClose,
  onSubmit,
}: {
  project: Project;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: { name: string; description: string }) => Promise<{ kind: string; message?: string; fieldErrors?: Record<string, string[]> }>;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [serverFailure, setServerFailure] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setServerFailure(null);
    if (pending) return;
    const trimmed = name.trim();
    if (trimmed.length < PROJECT_NAME_LIMITS.min) {
      setNameError(PROJECT_NAME_LIMITS.requiredMessage);
      return;
    }
    if (trimmed.length > PROJECT_NAME_LIMITS.max) {
      setNameError(PROJECT_NAME_LIMITS.tooLongMessage);
      return;
    }
    if (description.length > PROJECT_NAME_LIMITS.descriptionMax) {
      setNameError(null);
      setServerFailure(PROJECT_NAME_LIMITS.descriptionTooLongMessage);
      return;
    }
    setNameError(null);
    const result = await onSubmit({ name: trimmed, description: description.trim() });
    if (result.kind === "success") {
      onClose();
      return;
    }
    if (result.kind === "conflict") {
      setNameError("A project with this name already exists.");
      return;
    }
    if (result.kind === "invalid") {
      const fe = result.fieldErrors?.name?.[0];
      if (fe) setNameError(fe);
      else setServerFailure(result.message ?? "Validation failed.");
      return;
    }
    setServerFailure(result.message ?? "We could not reach the planner core. Check your connection and try again.");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => {
        if (!pending) onClose();
      }}
      className="fixed inset-0 left-[260px] top-[72px] z-30 flex items-center justify-center overflow-y-auto bg-basin/75 p-4 backdrop-blur-sm"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Edit project"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[520px] rounded-[20px] border border-steel bg-panel p-8 shadow-modal-glow"
      >
        <div className="flex items-center justify-between border-b border-steel/40 pb-5">
          <h2 className="font-display text-headline-md font-bold text-foam">Edit project</h2>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Close dialog" className="flex h-9 w-9 items-center justify-center rounded-full text-mist hover:bg-basin/60 hover:text-foam">
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>
        <form className="flex flex-col gap-5 pt-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label htmlFor="edit-name" className="font-display text-body-md font-semibold text-foam">
              Project name <span className="font-mono text-crimson">*</span>
            </label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(null);
              }}
              disabled={pending}
              aria-invalid={nameError !== null}
              className={cn(
                "h-12 w-full rounded-xl border border-steel bg-basin px-4 font-mono text-code-md text-foam outline-none focus:border-teal focus:ring-1 focus:ring-teal",
                nameError && "border-crimson focus:border-crimson focus:ring-crimson",
              )}
            />
            {nameError ? (
              <p role="alert" className="font-display text-body-sm text-crimson">{nameError}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="edit-description" className="font-display text-body-md font-semibold text-foam">
              Description <span className="font-display text-body-sm font-normal text-mist">(optional)</span>
            </label>
            <textarea
              id="edit-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={pending}
              className="w-full resize-none rounded-xl bg-basin p-3.5 font-display text-body-md text-foam outline-none focus:border-teal focus:ring-1 focus:ring-teal"
            />
          </div>
          {serverFailure ? (
            <AlertBanner tone="crimson" icon={<MaterialIcon name="warning" className="shrink-0 text-[16px]" />}>
              {serverFailure}
            </AlertBanner>
          ) : null}
          <div className="mt-1 flex items-center justify-end gap-3 border-t border-steel/50 pt-4">
            <Button variant="champagne" onClick={onClose} disabled={pending} className="h-10 px-5">
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="h-10 gap-2 px-6 font-bold shadow-ice-submit hover:shadow-ice-halo">
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
