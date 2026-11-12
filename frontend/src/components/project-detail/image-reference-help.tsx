
"use client";

interface ImageReferenceHelpProps {
  image?: string;
  disabled?: boolean;
  onChange: (image: string) => void;
}

export function ImageReferenceHelp({
  image,
  disabled = false,
  onChange,
}: ImageReferenceHelpProps) {
  const hasImage = Boolean(image?.trim());

  const isGhcrImage =
    image?.trim().toLowerCase().startsWith("ghcr.io/") ??
    false;

  return (
    <div className="mt-3 rounded-xl border border-steel/50 bg-basin p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-body-sm font-semibold text-foam">
          Docker image reference
        </p>

        <span
          className={
            hasImage
              ? "rounded-full bg-ice/10 px-2 py-1 text-xs text-ice"
              : "rounded-full bg-champagne/10 px-2 py-1 text-xs text-champagne"
          }
        >
          {hasImage ? "Configured" : "Missing"}
        </span>
      </div>

      <p className="mt-2 font-display text-body-sm text-mist">
        This field defines which image Kubernetes will use.
        The image does not need to exist when the deployment
        plan is approved.
      </p>

      {isGhcrImage ? (
        <p className="mt-2 font-mono text-xs text-ice">
          Registry: GitHub Container Registry
        </p>
      ) : null}

      <p className="mt-2 font-display text-body-sm text-mist">
        An automatic reference is a proposed destination.
        It does not confirm that the Docker image has been
        built or published.
      </p>

      {hasImage ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("")}
          className="mt-3 font-display text-body-sm text-ice underline disabled:opacity-50"
        >
          Clear image reference
        </button>
      ) : null}
    </div>
  );
}
