
"use client";

import { useId } from "react";

import type {
  PlanComponent,
} from "@/types/deployment-plan";

import {
  PLAN_COMPONENT_LABELS,
} from "@/data/deployment-plan";

import {
  ImageReferenceHelp,
} from "@/components/project-detail/image-reference-help";

interface Props {
  component: PlanComponent;
  onChange: (component: PlanComponent) => void;
  disabled?: boolean;
}

const INPUT_CLASS =
  "w-full rounded-xl border border-steel/50 bg-basin px-3 py-2 font-mono text-code-md text-foam outline-none transition-colors focus:border-teal focus:ring-1 focus:ring-teal disabled:opacity-50";

interface NumberFieldProps {
  id: string;
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

function NumberField({
  id,
  label,
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
}: NumberFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-display text-body-sm text-mist"
      >
        {label}
      </label>

      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={1}
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => {
          const raw = event.target.value;

          onChange(
            raw === "" ? undefined : Number(raw)
          );
        }}
        className={INPUT_CLASS}
      />
    </div>
  );
}

export function DeploymentPlanComponentForm({
  component,
  onChange,
  disabled = false,
}: Props) {
  const prefix = useId();

  const isWorker = component.type === "WORKER";
  const hasContainerPort =
    component.containerPort !== null;

  function updateComponent(
    patch: Partial<PlanComponent>,
  ) {
    onChange({
      ...component,
      ...patch,
    });
  }

  function updateResources(
    group: "requests" | "limits",
    field: "cpu" | "memory",
    value: string,
  ) {
    updateComponent({
      resources: {
        ...component.resources,
        [group]: {
          ...component.resources[group],
          [field]: value,
        },
      },
    });
  }

  function updateContainerPort(
    value: number | undefined,
  ) {
    const containerPort =
      value ?? (isWorker ? null : 0);

    updateComponent({
      containerPort,
      ...(containerPort === null
        ? {
            servicePort: null,
            targetPort: null,
            ingress: {
              ...component.ingress,
              enabled: false,
            },
          }
        : {}),
    });
  }

  function updateServicePort(
    raw: string,
  ) {
    updateComponent({
      servicePort:
        raw === "" ? null : Number(raw),
    });
  }

  function updateTargetPort(
    raw: string,
  ) {
    const value = raw.trim();

    updateComponent({
      targetPort:
        value === ""
          ? null
          : /^\d+$/.test(value)
            ? Number(value)
            : value,
    });
  }

  return (
    <div className="rounded-2xl border border-steel/50 bg-panel p-5 shadow-md">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-headline-sm font-semibold text-foam">
            {component.name}
          </h3>

          <p className="mt-1 font-mono text-label-sm uppercase text-mist">
            {PLAN_COMPONENT_LABELS[component.type]}
          </p>
        </div>

        <span className="rounded-full bg-ice/10 px-3 py-1 font-mono text-label-sm text-ice">
          Kubernetes component
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <NumberField
            id={`${prefix}-container-port`}
            label="Container port"
            value={component.containerPort ?? undefined}
            min={1}
            max={65535}
            disabled={disabled}
            onChange={updateContainerPort}
          />

          {isWorker ? (
            <p className="font-display text-body-sm text-mist">
              Optional for workers that do not expose a network port.
            </p>
          ) : null}
        </div>

        <NumberField
          id={`${prefix}-replicas`}
          label="Replicas"
          value={component.replicas}
          min={1}
          disabled={disabled}
          onChange={(value) =>
            updateComponent({
              replicas: value ?? 0,
            })
          }
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${prefix}-service-port`}
            className="font-display text-body-sm text-mist"
          >
            Service port
          </label>

          <input
            id={`${prefix}-service-port`}
            type="number"
            min={1}
            max={65535}
            step={1}
            value={component.servicePort ?? ""}
            disabled={disabled || !hasContainerPort}
            onChange={(event) =>
              updateServicePort(event.target.value)
            }
            placeholder="Optional"
            className={INPUT_CLASS}
          />

          <p className="font-display text-body-sm text-mist">
            Port exposed by the Kubernetes Service.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${prefix}-target-port`}
            className="font-display text-body-sm text-mist"
          >
            Target port
          </label>

          <input
            id={`${prefix}-target-port`}
            type="text"
            value={component.targetPort ?? ""}
            disabled={disabled || !hasContainerPort}
            onChange={(event) =>
              updateTargetPort(event.target.value)
            }
            placeholder="Number or named port"
            className={INPUT_CLASS}
          />

          <p className="font-display text-body-sm text-mist">
            Container destination port or named port.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor={`${prefix}-image`}
            className="mb-1.5 block font-display text-body-sm text-mist"
          >
            Container image
          </label>

                    <input
            id={`${prefix}-image`}
            type="text"
            value={component.image ?? ""}
            placeholder="ghcr.io/owner/repository-component:plan-v1"
            disabled={disabled}
            onChange={(event) =>
              updateComponent({
                image: event.target.value || undefined,
              })
            }
            className={INPUT_CLASS}
          />

          <ImageReferenceHelp
            image={component.image}
            disabled={disabled}
            onChange={(image) =>
              updateComponent({
                image: image || undefined,
              })
            }
          />
        </div>
      </div>

      <div className="mt-5 border-t border-steel/40 pt-5">
        <p className="mb-3 font-mono text-label-sm uppercase text-cinder">
          Resource requests and limits
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(
            [
              ["requests", "cpu", "Requested CPU"],
              ["requests", "memory", "Requested memory"],
              ["limits", "cpu", "CPU limit"],
              ["limits", "memory", "Memory limit"],
            ] as const
          ).map(([group, field, label]) => (
            <div
              key={`${group}-${field}`}
              className="flex flex-col gap-1.5"
            >
              <label
                htmlFor={`${prefix}-${group}-${field}`}
                className="font-display text-body-sm text-mist"
              >
                {label}
              </label>

              <input
                id={`${prefix}-${group}-${field}`}
                type="text"
                value={component.resources[group][field]}
                disabled={disabled}
                placeholder={
                  field === "cpu" ? "100m" : "128Mi"
                }
                onChange={(event) =>
                  updateResources(
                    group,
                    field,
                    event.target.value,
                  )
                }
                className={INPUT_CLASS}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-steel/40 pt-5">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={component.hpa.enabled}
            disabled={disabled}
            onChange={(event) =>
              updateComponent({
                hpa: {
                  ...component.hpa,
                  enabled: event.target.checked,
                },
              })
            }
            className="size-4 accent-teal"
          />

          <span className="font-display text-body-md font-semibold text-foam">
            Horizontal Pod Autoscaler
          </span>
        </label>

        {component.hpa.enabled ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField
              id={`${prefix}-hpa-min`}
              label="Minimum replicas"
              value={component.hpa.minReplicas}
              disabled={disabled}
              onChange={(value) =>
                updateComponent({
                  hpa: {
                    ...component.hpa,
                    minReplicas: value,
                  },
                })
              }
            />

            <NumberField
              id={`${prefix}-hpa-max`}
              label="Maximum replicas"
              value={component.hpa.maxReplicas}
              disabled={disabled}
              onChange={(value) =>
                updateComponent({
                  hpa: {
                    ...component.hpa,
                    maxReplicas: value,
                  },
                })
              }
            />

            <NumberField
              id={`${prefix}-hpa-cpu`}
              label="Target CPU utilization (%)"
              value={
                component.hpa.targetCpuUtilizationPercent
              }
              min={1}
              max={100}
              disabled={disabled}
              onChange={(value) =>
                updateComponent({
                  hpa: {
                    ...component.hpa,
                    targetCpuUtilizationPercent: value,
                  },
                })
              }
            />

            <NumberField
              id={`${prefix}-hpa-memory`}
              label="Target memory utilization (%)"
              value={
                component.hpa.targetMemoryUtilizationPercent
              }
              min={1}
              max={100}
              disabled={disabled}
              onChange={(value) =>
                updateComponent({
                  hpa: {
                    ...component.hpa,
                    targetMemoryUtilizationPercent: value,
                  },
                })
              }
            />
          </div>
        ) : null}
      </div>

      <div className="mt-5 border-t border-steel/40 pt-5">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={component.ingress.enabled}
            disabled={disabled || !hasContainerPort}
            onChange={(event) =>
              updateComponent({
                ingress: {
                  ...component.ingress,
                  enabled: event.target.checked,
                },
              })
            }
            className="size-4 accent-teal"
          />

          <span className="font-display text-body-md font-semibold text-foam">
            Ingress
          </span>
        </label>

        {component.ingress.enabled ? (
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label
                htmlFor={`${prefix}-host`}
                className="mb-1.5 block font-display text-body-sm text-mist"
              >
                Hostname
              </label>

              <input
                id={`${prefix}-host`}
                type="text"
                value={component.ingress.host ?? ""}
                placeholder="app.example.com"
                disabled={disabled}
                onChange={(event) =>
                  updateComponent({
                    ingress: {
                      ...component.ingress,
                      host: event.target.value,
                    },
                  })
                }
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label
                htmlFor={`${prefix}-path`}
                className="mb-1.5 block font-display text-body-sm text-mist"
              >
                Path
              </label>

              <input
                id={`${prefix}-path`}
                type="text"
                value={component.ingress.path ?? "/"}
                disabled={disabled}
                onChange={(event) =>
                  updateComponent({
                    ingress: {
                      ...component.ingress,
                      path: event.target.value,
                    },
                  })
                }
                className={INPUT_CLASS}
              />
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={component.ingress.tls}
                disabled={disabled}
                onChange={(event) =>
                  updateComponent({
                    ingress: {
                      ...component.ingress,
                      tls: event.target.checked,
                    },
                  })
                }
                className="size-4 accent-teal"
              />

              <span className="font-display text-body-sm text-foam">
                Enable TLS
              </span>
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}
