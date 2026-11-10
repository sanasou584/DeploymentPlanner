"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, type FormEvent } from "react";
import { cn } from "@/utils/class-names";
import { ENVIRONMENT_LABELS } from "@/data/dashboard";
import {
  CONNECT_REPOSITORY_MODAL_ROW,
  EDIT_PROJECT_MODAL_ROW,
  ENVIRONMENT_OPTION_ROWS,
  PROJECT_FORM_FEEDBACK,
  PROJECT_MODAL_ROW,
  PROJECT_NAME_LIMITS,
} from "@/data/dashboard-form";
import type {
  EnvironmentTone,
  ProjectModalSubmitResult,
  ProjectModalValues,
} from "@/types/dashboard";
import type { ConnectRepositoryBody } from "@/types/project";
import {
  repositoryFieldErrorsOf,
  type RepositoryFieldError,
} from "@/utils/repository";
import { isTakenName, takenNameKeysOf } from "@/utils/names";
import { useNameAvailability } from "@/hooks/use-name-availability";
import { MaterialIcon } from "@/shared/material-icon";
import { AlertBanner } from "@/shared/alert-banner";
import { Button } from "@/shared/button";
import { RepositoryFields } from "@/components/dashboard/repository-fields";

type ModalMode = "create" | "edit";
type WizardStep = "details" | "repository";
type CreatedOutcome = { kind: "partial" | "unverifiable"; message?: string };

export type { ModalMode };

interface NewProjectModalProps {
  mode: ModalMode;
  onClose: () => void;
  existingNames: string[];
  /** True when the pulled catalog already accounts for every project (skip remote probe). */
  catalogComplete: boolean;
  pending: boolean;
  initialValues?: ProjectModalValues;
  onSubmit: (
    values: ProjectModalValues,
    repository: ConnectRepositoryBody | null,
  ) => ProjectModalSubmitResult | Promise<ProjectModalSubmitResult>;
}

const ENV_SELECTION_BASE =
  "flex h-12 w-full items-center justify-between rounded-xl border border-steel bg-basin px-4 outline-none transition-all hover:border-teal focus:border-teal";

const NAME_INPUT_BASE =
  "h-12 w-full rounded-xl border border-steel bg-basin px-4 font-mono text-code-md text-foam outline-none transition-all placeholder:text-mist/60 focus:border-teal focus:ring-1 focus:ring-teal";

function EnvironmentMenu({
  open,
  selected,
  onSelect,
}: {
  open: boolean;
  selected: EnvironmentTone;
  onSelect: (tone: EnvironmentTone) => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute inset-x-0 top-[52px] z-20 overflow-hidden rounded-xl bg-basin py-1 shadow-2xl"
        >
          <div className="border-b border-steel/40 px-3 py-2 font-mono text-label-sm uppercase text-cinder">
            {PROJECT_MODAL_ROW.environmentMenuHeading}
          </div>
          {ENVIRONMENT_OPTION_ROWS.map((row) => {
            const active = row.id === selected;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelect(row.id)}
                className="group flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-panel"
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn("h-2 w-2 rounded-full", row.dotModerator)} />
                  <span
                    className={cn(
                      "font-display text-body-md group-hover:text-foam",
                      active ? "text-frost" : "text-mist",
                    )}
                  >
                    {row.label}
                  </span>
                </div>
                {active ? (
                  <MaterialIcon name="check" className="text-[16px] text-ice" />
                ) : (
                  <span className="font-mono text-label-sm text-cinder">{row.badge}</span>
                )}
              </button>
            );
          })}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function NewProjectModal({
  mode,
  onClose,
  existingNames,
  catalogComplete,
  pending,
  initialValues,
  onSubmit,
}: NewProjectModalProps) {
  const row = mode === "edit" ? EDIT_PROJECT_MODAL_ROW : PROJECT_MODAL_ROW;
  const [step, setStep] = useState<WizardStep>("details");
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [environment, setEnvironment] = useState<EnvironmentTone>(
    initialValues?.environment ?? "development",
  );
  const [envMenuOpen, setEnvMenuOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [serverConflict, setServerConflict] = useState<string | null>(null);
  const [serverFailure, setServerFailure] = useState<string | null>(null);
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [repositoryBranch, setRepositoryBranch] = useState("main");
  const [repositoryFieldErrors, setRepositoryFieldErrors] = useState<
    Partial<Record<"url" | "branch", RepositoryFieldError>>
  >({});
  const [serverRepositoryErrors, setServerRepositoryErrors] = useState<
    Partial<Record<"url" | "branch", string>>
  >({});
  const [createdOutcome, setCreatedOutcome] = useState<CreatedOutcome | null>(null);

  const activeStep: WizardStep = mode === "create" ? step : "details";
  const onDetails = activeStep === "details";

  const takenNames = useMemo(() => takenNameKeysOf(existingNames), [existingNames]);
  const trimmedName = name.trim();
  const knownConflict = isTakenName(takenNames, trimmedName);
  const availability = useNameAvailability({
    name,
    taken: takenNames,
    catalogComplete,
    enabled: mode === "create",
  });
  const conflict = knownConflict || serverConflict !== null || availability.exists;
  const nameError =
    validationErrors.name?.[0] ??
    (conflict ? PROJECT_MODAL_ROW.conflictMessage : undefined);
  const descriptionError = validationErrors.description?.[0];
  const selectedOption = ENVIRONMENT_OPTION_ROWS.find(
    (option) => option.id === environment,
  );

  async function handleResult(result: ProjectModalSubmitResult, trimmed: string) {
    if (result.kind === "success") {
      onClose();
      return;
    }
    if (result.kind === "conflict") {
      setServerConflict(trimmed);
      setStep("details");
      return;
    }
    if (result.kind === "invalid") {
      const fieldErrors = result.fieldErrors ?? {};
      if (Object.keys(fieldErrors).length > 0) {
        setValidationErrors(fieldErrors);
      } else {
        setServerFailure(result.message ?? PROJECT_FORM_FEEDBACK.failedMessage);
      }
      setStep("details");
      return;
    }
    if (result.kind === "failed") {
      setServerFailure(
        result.message ??
          `${PROJECT_FORM_FEEDBACK.failedHeading}: ${PROJECT_FORM_FEEDBACK.failedMessage}`,
      );
      return;
    }
    if (result.kind === "unverifiable" || result.kind === "partial") {
      setCreatedOutcome({ kind: result.kind, message: result.message });
    }
  }

  async function submitDetails(repository: ConnectRepositoryBody | null) {
    if (pending) return;
    const errors = validateValues(name, description);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      if (!onDetails) {
        setStep("details");
      }
      return;
    }
    setValidationErrors({});
    if (conflict) {
      setStep("details");
      return;
    }
    setServerFailure(null);
    setServerConflict(null);
    const result = await onSubmit(
      {
        name: trimmedName,
        description,
        environment,
      },
      mode === "create" ? repository : null,
    );
    await handleResult(result, trimmedName);
  }

  async function handleContinue() {
    if (pending) return;
    const errors = validateValues(name, description);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});
    if (conflict) return;
    setStep("repository");
  }

  async function handleDetailsSubmit(event: FormEvent) {
    event.preventDefault();
    if (mode === "edit") {
      await submitDetails(null);
      return;
    }
    await handleContinue();
  }

  async function handleFinalSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const errors = repositoryFieldErrorsOf(repositoryUrl, repositoryBranch);
    if (Object.keys(errors).length > 0) {
      setRepositoryFieldErrors(errors);
      setServerRepositoryErrors({});
      return;
    }
    setRepositoryFieldErrors({});
    setServerRepositoryErrors({});
    await submitDetails({
      url: repositoryUrl.trim(),
      branch: repositoryBranch.trim(),
    });
  }

  const createdOutcomeHeading =
    createdOutcome?.kind === "unverifiable"
      ? PROJECT_MODAL_ROW.createdUnverifiedHeading
      : PROJECT_MODAL_ROW.createdFailedHeading;
  const createdOutcomeSuffix =
    createdOutcome?.kind === "unverifiable"
      ? PROJECT_MODAL_ROW.createdUnverifiedSuffix
      : PROJECT_MODAL_ROW.createdFailedSuffix;
  const createdOutcomeMessage =
    createdOutcome?.message ??
    (createdOutcome?.kind === "unverifiable"
      ? CONNECT_REPOSITORY_MODAL_ROW.unverifiableFallback
      : CONNECT_REPOSITORY_MODAL_ROW.githubFailedMessage);

  const title =
    mode === "edit"
      ? row.title
      : onDetails
        ? row.title
        : CONNECT_REPOSITORY_MODAL_ROW.titleConnect;
  const headerIcon = onDetails ? "rocket_launch" : "fork_right";

  const banner = serverFailure ? (
    <AlertBanner
      tone="crimson"
      icon={<MaterialIcon name="warning" className="shrink-0 text-[16px]" />}
    >
      {serverFailure}
    </AlertBanner>
  ) : null;

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
        aria-label={title}
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
              <MaterialIcon name={headerIcon} className="text-[19px] text-ice" />
            </div>
            <h2 className="font-display text-headline-md font-bold text-foam">{title}</h2>
            {mode === "create" ? (
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={cn("h-1.5 w-1.5 rounded-full", onDetails ? "bg-ice" : "bg-steel")}
                />
                <span
                  aria-hidden="true"
                  className={cn("h-1.5 w-1.5 rounded-full", onDetails ? "bg-steel" : "bg-ice")}
                />
                <span className="sr-only">
                  {onDetails ? PROJECT_MODAL_ROW.stepDetails : PROJECT_MODAL_ROW.stepRepository}
                </span>
              </span>
            ) : null}
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
        {createdOutcome ? (
          <div className="flex flex-col gap-5 pt-6">
            <AlertBanner
              tone="champagne"
              icon={<MaterialIcon name="warning" className="shrink-0 text-[16px]" />}
            >
              <span className="flex flex-col gap-1">
                <span className="font-semibold">{createdOutcomeHeading}</span>
                <span>{createdOutcomeMessage}</span>
                <span>{createdOutcomeSuffix}</span>
              </span>
            </AlertBanner>
            <div className="mt-1 flex items-center justify-end border-t border-steel/50 pt-4">
              <Button onClick={onClose} className="h-10 gap-2 px-6 font-bold">
                <span>{PROJECT_MODAL_ROW.doneLabel}</span>
              </Button>
            </div>
          </div>
        ) : onDetails ? (
          <form className="flex flex-col gap-5 pt-6" onSubmit={handleDetailsSubmit}>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="project-name-input"
                  className="flex items-center gap-1 font-display text-body-md font-semibold text-foam"
                >
                  {row.nameLabel}
                  <span className="font-mono text-crimson">{row.nameRequired}</span>
                </label>
                <span className="font-mono text-label-sm uppercase text-mist">
                  {row.slugHint}
                </span>
              </div>
              <div className="relative">
                <input
                  id="project-name-input"
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setServerConflict(null);
                  }}
                  placeholder={row.namePlaceholder}
                  disabled={pending}
                  aria-invalid={nameError !== undefined}
                  aria-describedby={
                    nameError ? (conflict ? "project-name-conflict" : "project-name-error") : undefined
                  }
                  className={cn(
                    NAME_INPUT_BASE,
                    nameError &&
                      "border-crimson focus:border-crimson focus:ring-1 focus:ring-crimson",
                  )}
                />
                <MaterialIcon
                  name={nameError ? "close" : "check_circle"}
                  className={
                    nameError
                      ? "absolute right-3.5 top-3 text-[18px] text-crimson"
                      : "absolute right-3.5 top-3 text-[18px] text-teal"
                  }
                />
              </div>
              {conflict ? (
                <div
                  id="project-name-conflict"
                  role="alert"
                  className="mt-2.5 flex items-center gap-2 rounded-xl border border-crimson/40 bg-basin/80 p-3"
                >
                  <MaterialIcon name="warning" className="shrink-0 text-[17px] text-crimson" />
                  <span className="font-display text-body-sm text-crimson">
                    {PROJECT_MODAL_ROW.conflictMessage}
                  </span>
                </div>
              ) : nameError ? (
                <div
                  id="project-name-error"
                  role="alert"
                  className="flex items-center gap-1.5 font-display text-body-sm text-crimson"
                >
                  <MaterialIcon name="error" className="shrink-0 text-[15px]" />
                  <span>{nameError}</span>
                </div>
              ) : null}
              {availability.checking ? (
                <p role="status" className="font-display text-body-sm text-mist">
                  {PROJECT_MODAL_ROW.availabilityChecking}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="project-description-input"
                className="flex items-center gap-1.5 font-display text-body-md font-semibold text-foam"
              >
                {row.descriptionLabel}
                <span className="font-display text-body-sm font-normal text-mist">
                  {row.descriptionHint}
                </span>
              </label>
              <textarea
                id="project-description-input"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={row.descriptionPlaceholder}
                disabled={pending}
                aria-invalid={descriptionError !== undefined}
                aria-describedby={descriptionError ? "project-description-error" : undefined}
                className="w-full resize-none rounded-xl bg-basin p-3.5 font-display text-body-md text-foam outline-none transition-all placeholder:text-mist/50 focus:border-teal focus:ring-1 focus:ring-teal"
              />
              {descriptionError ? (
                <div
                  id="project-description-error"
                  role="alert"
                  className="flex items-center gap-1.5 font-display text-body-sm text-crimson"
                >
                  <MaterialIcon name="error" className="shrink-0 text-[15px]" />
                  <span>{descriptionError}</span>
                </div>
              ) : null}
            </div>
            {mode === "create" ? (
              <div className="flex flex-col gap-2">
                <span
                  id="environment-label"
                  className="font-display text-body-md font-semibold text-foam"
                >
                  {PROJECT_MODAL_ROW.environmentLabel}
                </span>
                <div className="relative" role="group" aria-labelledby="environment-label">
                  <button
                    type="button"
                    aria-expanded={envMenuOpen}
                    aria-haspopup="listbox"
                    aria-labelledby="environment-value environment-label"
                    disabled={pending}
                    onClick={() => setEnvMenuOpen((open) => !open)}
                    className={cn(ENV_SELECTION_BASE, pending && "opacity-60")}
                  >
                    <span id="environment-value" className="flex items-center gap-2.5">
                      <span className={cn("h-2.5 w-2.5 rounded-full", selectedOption?.dotModerator)} />
                      <span className="font-display text-body-md font-medium text-foam">
                        {ENVIRONMENT_LABELS[environment]}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-cinder">
                      <span className="font-mono text-label-sm uppercase opacity-75">
                        {PROJECT_MODAL_ROW.environmentHint}
                      </span>
                      <motion.span
                        animate={{ rotate: envMenuOpen ? 180 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <MaterialIcon name="expand_more" className="text-[20px]" />
                      </motion.span>
                    </span>
                  </button>
                  <EnvironmentMenu
                    open={envMenuOpen}
                    selected={environment}
                    onSelect={(tone) => {
                      setEnvironment(tone);
                      setEnvMenuOpen(false);
                    }}
                  />
                </div>
              </div>
            ) : null}
            {banner}
            <div className="mt-1 flex items-center justify-end gap-3 border-t border-steel/50 pt-4">
              <Button
                variant="champagne"
                onClick={onClose}
                disabled={pending}
                className="h-10 px-5"
              >
                {row.cancelLabel}
              </Button>
              {mode === "create" ? (
                <>
                  <Button
                    variant="champagne"
                    onClick={() => void submitDetails(null)}
                    disabled={pending || availability.checking || conflict}
                    className="h-10 px-5"
                  >
                    {PROJECT_MODAL_ROW.saveDraftLabel}
                  </Button>
                  <Button
                    onClick={() => void handleContinue()}
                    disabled={pending || availability.checking || conflict}
                    className="h-10 gap-2 px-6 font-bold shadow-ice-submit hover:shadow-ice-halo"
                  >
                    <span>{PROJECT_MODAL_ROW.continueLabel}</span>
                    <MaterialIcon name="arrow_forward" className="text-[18px]" />
                  </Button>
                </>
              ) : (
                <Button
                  type="submit"
                  disabled={pending}
                  className="h-10 gap-2 px-6 font-bold shadow-ice-submit hover:shadow-ice-halo"
                >
                  <MaterialIcon
                    name={pending ? "progress_activity" : row.submitIcon}
                    className={cn("text-[18px]", pending && "animate-spin")}
                  />
                  <span>{pending ? PROJECT_FORM_FEEDBACK.pendingLabel : row.submitLabel}</span>
                </Button>
              )}
            </div>
          </form>
        ) : (
          <form className="flex flex-col gap-5 pt-6" onSubmit={handleFinalSubmit}>
            <p className="font-display text-body-md text-smoke">
              {CONNECT_REPOSITORY_MODAL_ROW.copy}
            </p>
            <RepositoryFields
              url={repositoryUrl}
              branch={repositoryBranch}
              urlError={repositoryFieldErrors.url}
              branchError={repositoryFieldErrors.branch}
              serverUrlError={serverRepositoryErrors.url}
              serverBranchError={serverRepositoryErrors.branch}
              disabled={pending}
              onUrlChange={(value) => {
                setRepositoryUrl(value);
                setServerRepositoryErrors({});
              }}
              onBranchChange={(value) => {
                setRepositoryBranch(value);
                setServerRepositoryErrors({});
              }}
            />
            {banner}
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-steel/50 pt-4">
              <Button
                variant="champagne"
                onClick={() => setStep("details")}
                disabled={pending}
                className="h-10 gap-2 px-4"
              >
                <MaterialIcon name="arrow_back" className="text-[18px]" />
                <span>{PROJECT_MODAL_ROW.backLabel}</span>
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  disabled={pending || availability.checking}
                  className="h-10 gap-2 px-6 font-bold shadow-ice-submit hover:shadow-ice-halo"
                >
                  <MaterialIcon
                    name={pending ? "progress_activity" : PROJECT_MODAL_ROW.submitIcon}
                    className={cn("text-[18px]", pending && "animate-spin")}
                  />
                  <span>
                    {pending
                      ? PROJECT_FORM_FEEDBACK.pendingLabel
                      : PROJECT_MODAL_ROW.createSubmitLabel}
                  </span>
                </Button>
              </div>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

function validateValues(name: string, description: string): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const trimmed = name.trim();
  if (trimmed.length < PROJECT_NAME_LIMITS.min) {
    errors.name = [PROJECT_NAME_LIMITS.requiredMessage];
  } else if (trimmed.length > PROJECT_NAME_LIMITS.max) {
    errors.name = [PROJECT_NAME_LIMITS.tooLongMessage];
  }
  if (description.length > PROJECT_NAME_LIMITS.descriptionMax) {
    errors.description = [PROJECT_NAME_LIMITS.descriptionTooLongMessage];
  }
  return errors;
}
