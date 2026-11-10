"use client";

import { CONNECT_REPOSITORY_MODAL_ROW } from "@/data/dashboard-form";
import type { RepositoryFieldError } from "@/utils/repository";
import { MaterialIcon } from "@/shared/material-icon";

const REPOSITORY_INPUT_BASE =
  "h-12 w-full rounded-xl border border-steel bg-basin px-4 font-mono text-code-md text-foam outline-none transition-all placeholder:text-mist/60 focus:border-teal focus:ring-1 focus:ring-teal";

const ERROR_COPY: Record<RepositoryFieldError, string> = {
  urlRequired: CONNECT_REPOSITORY_MODAL_ROW.urlRequiredMessage,
  urlInvalid: CONNECT_REPOSITORY_MODAL_ROW.urlInvalidMessage,
  branchRequired: CONNECT_REPOSITORY_MODAL_ROW.branchRequiredMessage,
  branchInvalid: CONNECT_REPOSITORY_MODAL_ROW.branchInvalidMessage,
};

export function RepositoryFields({
  url,
  branch,
  urlError,
  branchError,
  serverUrlError,
  serverBranchError,
  disabled,
  onUrlChange,
  onBranchChange,
}: {
  url: string;
  branch: string;
  urlError?: RepositoryFieldError;
  branchError?: RepositoryFieldError;
  serverUrlError?: string;
  serverBranchError?: string;
  disabled: boolean;
  onUrlChange: (value: string) => void;
  onBranchChange: (value: string) => void;
}) {
  const urlMessage = urlError ? ERROR_COPY[urlError] : serverUrlError;
  const branchMessage = branchError ? ERROR_COPY[branchError] : serverBranchError;
  const row = CONNECT_REPOSITORY_MODAL_ROW;

  return (
    <>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="repository-url-input"
          className="flex items-center gap-1 font-display text-body-md font-semibold text-foam"
        >
          {row.urlLabel}
          <span className="font-mono text-crimson">*</span>
        </label>
        <input
          id="repository-url-input"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder={row.urlPlaceholder}
          disabled={disabled}
          aria-invalid={urlMessage !== undefined}
          aria-describedby={urlMessage ? "repository-url-error" : "repository-url-hint"}
          className={REPOSITORY_INPUT_BASE}
        />
        <span className="font-mono text-label-sm text-cinder" id="repository-url-hint">
          {row.urlHint}
        </span>
        {urlMessage ? (
          <div
            id="repository-url-error"
            role="alert"
            className="flex items-center gap-1.5 font-display text-body-sm text-crimson"
          >
            <MaterialIcon name="error" className="shrink-0 text-[15px]" />
            <span>{urlMessage}</span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="repository-branch-input"
          className="flex items-center gap-1 font-display text-body-md font-semibold text-foam"
        >
          {row.branchLabel}
          <span className="font-mono text-crimson">*</span>
        </label>
        <input
          id="repository-branch-input"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={branch}
          onChange={(event) => onBranchChange(event.target.value)}
          placeholder={row.branchPlaceholder}
          disabled={disabled}
          aria-invalid={branchMessage !== undefined}
          aria-describedby={branchMessage ? "repository-branch-error" : "repository-branch-hint"}
          className={REPOSITORY_INPUT_BASE}
        />
        <span className="font-mono text-label-sm text-cinder" id="repository-branch-hint">
          {row.branchHint}
        </span>
        {branchMessage ? (
          <div
            id="repository-branch-error"
            role="alert"
            className="flex items-center gap-1.5 font-display text-body-sm text-crimson"
          >
            <MaterialIcon name="error" className="shrink-0 text-[15px]" />
            <span>{branchMessage}</span>
          </div>
        ) : null}
      </div>
    </>
  );
}
