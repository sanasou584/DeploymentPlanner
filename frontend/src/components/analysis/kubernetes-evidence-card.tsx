
import type {
  AnalysisComponent,
  AnalysisPortEvidence,
} from "@/types/analysis";

interface Props {
  components: AnalysisComponent[];
}

const ORIGIN_LABELS: Record<
  AnalysisPortEvidence["origin"],
  string
> = {
  KUBERNETES_MANIFEST: "Kubernetes manifest",
  SOURCE_CODE: "Source code",
  FRAMEWORK_CONFIG: "Framework configuration",
  DOCKERFILE: "Dockerfile",
  ENV_EXAMPLE: "Environment example",
};

const CONFIDENCE_LABELS: Record<
  AnalysisPortEvidence["confidence"],
  string
> = {
  HIGH: "High confidence",
  MEDIUM: "Medium confidence",
  LOW: "Low confidence",
};

function show(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) {
    return "Not detected";
  }

  return String(value);
}

function PortProvenance({
  evidence,
}: {
  evidence?: AnalysisPortEvidence;
}) {
  if (!evidence) {
    return (
      <p className="mt-2 text-xs text-mist">
        No recorded source provenance.
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-steel/50 bg-basin p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-surface-high px-2 py-1 font-mono text-xs text-foam">
          {ORIGIN_LABELS[evidence.origin]}
        </span>

        <span className="rounded-full bg-surface-high px-2 py-1 font-mono text-xs text-mist">
          {CONFIDENCE_LABELS[evidence.confidence]}
        </span>
      </div>

      <p className="mt-3 text-xs text-mist">
        Source file
      </p>

      <p className="mt-1 break-all font-mono text-sm text-foam">
        {evidence.sourceFile}
        {evidence.line !== undefined
          ? `:${evidence.line}`
          : ""}
      </p>

      {evidence.requiresReview ? (
        <p className="mt-3 text-xs text-champagne">
          Review required: verify the effective runtime
          configuration before deployment.
        </p>
      ) : (
        <p className="mt-3 text-xs text-mint">
          Source evidence recorded.
        </p>
      )}
    </div>
  );
}

export function KubernetesEvidenceCard({
  components,
}: Props) {
  const detected = components.filter(
    (component) => component.kubernetes !== undefined,
  );

  if (detected.length === 0) {
    return (
      <section className="rounded-2xl border border-steel bg-panel p-5">
        <h3 className="font-display text-headline-sm font-semibold text-foam">
          Configuration evidence
        </h3>

        <p className="mt-2 text-mist">
          No configuration evidence is available
          for this analysis.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <h3 className="font-display text-headline-sm font-semibold text-foam">
        Configuration evidence
      </h3>

      <div className="grid gap-4 lg:grid-cols-2">
        {detected.map((component) => {
          const evidence = component.kubernetes!;

          const fields: Array<{
            label: string;
            value: string | number | null | undefined;
          }> = [
            {
              label: "Container port",
              value: evidence.containerPort,
            },
            {
              label: "Service port",
              value: evidence.servicePort,
            },
            {
              label: "Target port",
              value: evidence.targetPort,
            },
            {
              label: "Container image",
              value: evidence.image,
            },
            {
              label: "Requested CPU",
              value: evidence.resources?.requests.cpu,
            },
            {
              label: "Requested memory",
              value: evidence.resources?.requests.memory,
            },
            {
              label: "CPU limit",
              value: evidence.resources?.limits.cpu,
            },
            {
              label: "Memory limit",
              value: evidence.resources?.limits.memory,
            },
          ];

          return (
            <article
              key={`${component.rootPath}:${component.name}`}
              className="rounded-2xl border border-steel bg-panel p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-display text-body-md font-semibold text-foam">
                  {component.name}
                </h4>

                <span
                  className={
                    evidence.requiresReview
                      ? "font-mono text-label-sm text-champagne"
                      : "font-mono text-label-sm text-mint"
                  }
                >
                  {evidence.requiresReview
                    ? "Review required"
                    : "Evidence available"}
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {fields.map((field) => (
                  <div
                    key={field.label}
                    className="rounded-lg bg-basin p-3"
                  >
                    <dt className="text-mist">
                      {field.label}
                    </dt>

                    <dd className="mt-1 break-all font-mono text-foam">
                      {show(field.value)}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4">
                <p className="font-display text-body-sm font-semibold text-foam">
                  Container port provenance
                </p>

                <PortProvenance
                  evidence={evidence.portEvidence}
                />
              </div>

              {evidence.manifestPaths.length > 0 ? (
                <div className="mt-4">
                  <p className="text-sm text-mist">
                    Source manifests
                  </p>

                  <ul className="mt-2 space-y-1">
                    {evidence.manifestPaths.map((path) => (
                      <li
                        key={path}
                        className="break-all font-mono text-xs text-foam"
                      >
                        {path}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
