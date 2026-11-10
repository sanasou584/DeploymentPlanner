"use client";

import { motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { cn } from "@/utils/class-names";
import {
  CONNECT_REPOSITORY_MODAL_ROW,
  PROJECT_FORM_FEEDBACK,
  REPOSITORY_FEEDBACK,
} from "@/data/dashboard-form";
import type { RepositorySubmitResult } from "@/types/dashboard";
import type { ConnectRepositoryBody, RepositoryRef } from "@/types/project";
import {
  repositoryFieldErrorsOf,
  type RepositoryFieldError,
} from "@/utils/repository";
import { repositorySummaryOf, repositoryUrlOf } from "@/utils/project-view";
import { RepositoryFields } from "@/components/dashboard/repository-fields";
import { MaterialIcon } from "@/shared/material-icon";
import { AlertBanner } from "@/shared/alert-banner";
import { Button } from "@/shared/button";

interface ConnectRepositoryModalProps {
  projectName: string;
  repository: RepositoryRef | null;
  pending: boolean;
  verifying: boolean;
  onClose: () => void;
  onSubmit: (
    body: ConnectRepositoryBody,
  ) => RepositorySubmitResult | Promise<RepositorySubmitResult>;
  onVerify: () => Promise<boolean> | boolean;
}

export function ConnectRepositoryModal({
  projectName,
  repository,
  pending,
  verifying,
  onClose,
  onSubmit,
  onVerify,
}: ConnectRepositoryModalProps) {
  const linked = repository !== null;
  const row = CONNECT_REPOSITORY_MODAL_ROW;
  const [url, setUrl] = useState(() => (repository ? repositoryUrlOf(repository) : ""));
  const [branch, setBranch] = useState(() => repository?.branch ?? "main");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"url" | "branch", RepositoryFieldError>>
  >({});
  const [serverFieldErrors, setServerFieldErrors] = useState<
    Partial<Record<"url" | "branch", string>>
  >({});
  const [serverFailure, setServerFailure] = useState<string | null>(null);
  const [unverifiable, setUnverifiable] = useState<string | null>(null);
  const [verifyFailed, setVerifyFailed] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const errors = repositoryFieldErrorsOf(url, branch);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setServerFieldErrors({});
    setServerFailure(null);
    setUnverifiable(null);
    const result = await onSubmit({ url: url.trim(), branch: branch.trim() });
    if (result.kind === "success") {
      onClose();
      return;
    }
    if (result.kind === "unverifiable") {
      setUnverifiable(result.message ?? row.unverifiableFallback);
      return;
    }
    if (result.kind === "invalid") {
      const backendErrors = result.fieldErrors ?? {};
      const mapped: Partial<Record<"url" | "branch", string>> = {};
      const urlMessage = backendErrors.url?.[0];
      const branchMessage = backendErrors.branch?.[0];
      if (urlMessage) mapped.url = urlMessage;
      if (branchMessage) mapped.branch = branchMessage;
      if (Object.keys(mapped).length > 0) {
        setServerFieldErrors(mapped);
      } else {
        setServerFailure(result.message ?? PROJECT_FORM_FEEDBACK.failedMessage);
      }
      return;
    }
    setServerFailure(result.message ?? row.githubFailedMessage);
  }

  async function handleVerify() {
    if (verifying || pending) return;
    setVerifyFailed(false);
    const verified = await onVerify();
    if (!verified) {
      setVerifyFailed(true);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => {
        if (!pending) onClose();
      }}
      className="fixed inset-0 left-[260px] top-[72px] z-30 flex items-center justify-center overflow-y-auto bg-basin/75 p-4 backdrop-blur-sm"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`${linked ? row.titleUpdate : row.titleConnect} — ${projectName}`}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-[520px] rounded-[20px] border border-steel bg-panel p-8 shadow-modal-glow"
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-teal/40 to-transparent"
        />
        <div className="flex items-center justify-between border-b border-steel/40 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-basin border border-steel">
              <MaterialIcon name="fork_right" className="text-[19px] text-ice" />
            </div>
            <h2 className="font-display text-headline-md font-bold text-foam">
              {linked ? row.titleUpdate : row.titleConnect}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={row.closeLabel}
            title={row.closeLabel}
            disabled={pending}
            className="flex h-9 w-9 items-center justify-center rounded-full text-mist transition-colors hover:bg-basin/60 hover:text-foam"
          >
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>
        <form className="flex flex-col gap-5 pt-6" onSubmit={handleSubmit}>
          <p className="font-display text-body-md text-smoke">{row.copy}</p>
          {linked && repository ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-steel bg-basin px-4 py-3">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-mono text-label-sm uppercase text-cinder">
                  {row.currentHeading}
                </span>
                <span className="truncate font-mono text-code-md text-foam">
                  {repositorySummaryOf(repository)}
                  <span className="text-mist"> · {repository.branch}</span>
                </span>
                <span
                  className={cn(
                    "flex items-center gap-1 font-display text-body-sm",
                    repository.isValid ? "text-mint" : "text-crimson",
                  )}
                >
                  <MaterialIcon
                    name={repository.isValid ? "check_circle" : "error"}
                    className="text-[15px]"
                  />
                  {repository.isValid
                    ? REPOSITORY_FEEDBACK.verifiedLabel
                    : REPOSITORY_FEEDBACK.invalidLabel}
                </span>
              </div>
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying || pending}
                aria-label={row.verifyLabel}
                title={row.verifyLabel}
                className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-steel px-4 font-display text-body-md text-foam transition-colors hover:border-teal hover:text-ice disabled:opacity-60"
              >
                <MaterialIcon
                  name={verifying ? "progress_activity" : "refresh"}
                  className={cn("text-[17px]", verifying && "animate-spin")}
                />
                <span>{row.verifyLabel}</span>
              </button>
            </div>
          ) : null}
          <RepositoryFields
            url={url}
            branch={branch}
            urlError={fieldErrors.url}
            branchError={fieldErrors.branch}
            serverUrlError={serverFieldErrors.url}
            serverBranchError={serverFieldErrors.branch}
            disabled={pending}
            onUrlChange={(value) => {
              setUrl(value);
              setServerFailure(null);
              setUnverifiable(null);
              setServerFieldErrors({});
            }}
            onBranchChange={(value) => {
              setBranch(value);
              setServerFailure(null);
              setUnverifiable(null);
              setServerFieldErrors({});
            }}
          />
          {unverifiable ? (
            <AlertBanner
              tone="champagne"
              icon={<MaterialIcon name="warning" className="shrink-0 text-[16px]" />}
            >
              <span className="flex flex-col gap-1">
                <span className="font-semibold">{row.unverifiableHeading}</span>
                <span>{unverifiable}</span>
              </span>
            </AlertBanner>
          ) : null}
          {verifyFailed ? (
            <AlertBanner
              tone="crimson"
              icon={<MaterialIcon name="warning" className="shrink-0 text-[16px]" />}
            >
              {PROJECT_FORM_FEEDBACK.failedMessage}
            </AlertBanner>
          ) : null}
          {serverFailure ? (
            <AlertBanner
              tone="crimson"
              icon={<MaterialIcon name="warning" className="shrink-0 text-[16px]" />}
            >
              {serverFailure}
            </AlertBanner>
          ) : null}
          <div className="mt-1 flex items-center justify-end gap-3 border-t border-steel/50 pt-4">
            <Button
              variant="champagne"
              onClick={onClose}
              disabled={pending}
              className="h-10 px-5"
            >
              {row.cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="h-10 gap-2 px-6 font-bold shadow-ice-submit hover:shadow-ice-halo"
            >
              <MaterialIcon
                name={pending ? "progress_activity" : row.submitIcon}
                className={cn("text-[18px]", pending && "animate-spin")}
              />
              <span>
                {pending
                  ? PROJECT_FORM_FEEDBACK.pendingLabel
                  : linked
                    ? row.updateSubmitLabel
                    : row.connectSubmitLabel}
              </span>
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
