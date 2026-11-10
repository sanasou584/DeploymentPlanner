
import type {
  AnalysisComponent,
} from "@/types/analysis";

interface Props {
  components: AnalysisComponent[];
}

function show(value: string | number | null | undefined) {
  return value === null || value === undefined
    ? "Not detected"
    : String(value);
}

export function KubernetesEvidenceCard({
  components,
}: Props) {
  const detected = components.filter(
    (component) => component.kubernetes,
  );

  if (detected.length === 0) {
    return (
      <section className="rounded-2xl border border-steel bg-panel p-5">
        <h3 className="font-display text-headline-sm font-semibold text-foam">
          Kubernetes evidence
        </h3>
        <p className="mt-2 text-mist">
          No Kubernetes configuration evidence is available for this analysis.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <h3 className="font-display text-headline-sm font-semibold text-foam">
        Kubernetes evidence
      </h3>

      <div className="grid gap-4 lg:grid-cols-2">
        {detected.map((component) => {
          const evidence = component.kubernetes!;

          return (
            <article
              key={component.name}
              className="rounded-2xl border border-steel bg-panel p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-display text-body-md font-semibold text-foam">
                  {component.name}
                </h4>
                <span className="font-mono text-label-sm text-mist">
                  {evidence.requiresReview
                    ? "Review required"
                    : "Evidence available"}
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Container port", evidence.containerPort],
                  ["Service port", evidence.servicePort],
                  ["Target port", evidence.targetPort],
                  ["Image", evidence.image],
                  ["Requested CPU", evidence.resources?.requests.cpu],
                  ["Requested memory", evidence.resources?.requests.memory],
                  ["CPU limit", evidence.resources?.limits.cpu],
                  ["Memory limit", evidence.resources?.limits.memory],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-lg bg-basin p-3"
                  >
                    <dt className="text-mist">
                      {label}
                    </dt>
                    <dd className="mt-1 break-all font-mono text-foam">
                      {show(value)}
                    </dd>
                  </div>
                ))}
              </dl>

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
