"use client";

import { motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { cn } from "@/utils/class-names";
import { MaterialIcon } from "@/shared/material-icon";
import { Button } from "@/shared/button";
import { AlertBanner } from "@/shared/alert-banner";
import { RepositoryFields } from "@/components/dashboard/repository-fields";
import { repositoryFieldErrorsOf } from "@/utils/repository";
import type { Project } from "@/types/project";

export function UpdateRepositoryModal({
  project,
  pending,
  verifying,
  onClose,
  onSubmit,
  onVerify,
}: {
  project: Project;
  pending: boolean;
  verifying: boolean;
  onClose: () => void;
  onSubmit: (body: { url: string; branch: string }) => Promise<{ kind: string; message?: string; fieldErrors?: Record<string, string[]> }>;
  onVerify: () => Promise<boolean>;
}) {
  const linked = project.repository;
  const [url, setUrl] = useState(linked ? `https://github.com/${linked.owner}/${linked.name}` : "");
  const [branch, setBranch] = useState(linked?.branch ?? "main");
  const [fieldErrors, setFieldErrors] = useState<ReturnType<typeof repositoryFieldErrorsOf>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<"url" | "branch", string>>>({});
  const [result, setResult] = useState<"valid" | "invalid" | null>(linked?.isValid ? "valid" : linked ? "invalid" : null);
  const [resultMessage, setResultMessage] = useState<string | null>(linked?.lastVerificationError ?? null);
  const [serverFailure, setServerFailure] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const errors = repositoryFieldErrorsOf(url, branch);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setServerErrors({});
    setServerFailure(null);
    const r = await onSubmit({ url: url.trim(), branch: branch.trim() });
    if (r.kind === "success") {
      setResult("valid");
      setResultMessage(null);
      onClose();
      return;
    }
    if (r.kind === "unverifiable") {
      setResult("invalid");
      setResultMessage(r.message ?? "GitHub could not verify this repository.");
      return;
    }
    if (r.kind === "invalid") {
      const mapped: Partial<Record<"url" | "branch", string>> = {};
      if (r.fieldErrors?.url?.[0]) mapped.url = r.fieldErrors.url[0];
      if (r.fieldErrors?.branch?.[0]) mapped.branch = r.fieldErrors.branch[0];
      if (Object.keys(mapped).length > 0) setServerErrors(mapped);
      else setServerFailure(r.message ?? "Validation failed.");
      return;
    }
    setServerFailure(r.message ?? "We could not reach the planner core. Check your connection and try again.");
  }

  async function handleVerify() {
    if (verifying || pending) return;
    const ok = await onVerify();
    if (ok) {
      setResult("valid");
      setResultMessage(null);
    } else {
      setResult("invalid");
      setResultMessage("Verification failed. Check the URL and branch.");
    }
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
        aria-label="Update repository"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[520px] rounded-[20px] border border-steel bg-panel p-8 shadow-modal-glow"
      >
        <div className="flex items-center justify-between border-b border-steel/40 pb-5">
          <h2 className="font-display text-headline-md font-bold text-foam">Update repository</h2>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Close dialog" className="flex h-9 w-9 items-center justify-center rounded-full text-mist hover:bg-basin/60 hover:text-foam">
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>
        <form className="flex flex-col gap-5 pt-6" onSubmit={handleSubmit}>
          <p className="font-display text-body-md text-smoke">
            Only public repositories are supported. Enter the repository URL and the branch to deploy from.
          </p>
          {linked && result === "valid" ? (
            <div className="flex items-center gap-2 rounded-xl border border-mint/40 bg-mint/10 p-3">
              <MaterialIcon name="check_circle" className="text-[18px] text-mint" />
              <span className="font-display text-body-sm text-mint">Repository verified and ready to deploy.</span>
            </div>
          ) : null}
          {result === "invalid" ? (
            <div className="flex items-center gap-2 rounded-xl border border-crimson/40 bg-crimson/10 p-3">
              <MaterialIcon name="error" className="text-[18px] text-crimson" />
              <span className="font-display text-body-sm text-crimson">
                {resultMessage ?? "GitHub could not verify this repository."}
              </span>
            </div>
          ) : null}
          <RepositoryFields
            url={url}
            branch={branch}
            urlError={fieldErrors.url}
            branchError={fieldErrors.branch}
            serverUrlError={serverErrors.url}
            serverBranchError={serverErrors.branch}
            disabled={pending}
            onUrlChange={(v) => {
              setUrl(v);
              setServerErrors({});
              setResult(null);
            }}
            onBranchChange={(v) => {
              setBranch(v);
              setServerErrors({});
              setResult(null);
            }}
          />
          {serverFailure ? (
            <AlertBanner tone="crimson" icon={<MaterialIcon name="warning" className="shrink-0 text-[16px]" />}>
              {serverFailure}
            </AlertBanner>
          ) : null}
          <div className="mt-1 flex items-center justify-end gap-3 border-t border-steel/50 pt-4">
            <Button variant="champagne" onClick={onClose} disabled={pending} className="h-10 px-5">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleVerify}
              disabled={verifying || pending}
              className="h-10 gap-2 px-4"
            >
              <MaterialIcon name={verifying ? "progress_activity" : "refresh"} className={cn("text-[16px]", verifying && "animate-spin")} />
              <span>{verifying ? "Verifying…" : "Re-verify"}</span>
            </Button>
            <Button type="submit" disabled={pending} className="h-10 gap-2 px-6 font-bold shadow-ice-submit hover:shadow-ice-halo">
              <MaterialIcon name={pending ? "progress_activity" : "link"} className={cn("text-[18px]", pending && "animate-spin")} />
              <span>{pending ? "Saving…" : "Save and verify"}</span>
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
