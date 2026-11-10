"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/utils/class-names";
import type { Analysis } from "@/types/analysis";

const CATEGORY_LABEL: Record<string, string> = {
  LANGUAGE: "Languages",
  FRAMEWORK: "Frameworks",
  LIBRARY: "Libraries",
  DATABASE: "Databases",
  BUILD_TOOL: "Build tools",
  RUNTIME: "Runtimes",
  OTHER: "Other",
};

export function AnalysisSummary({ analysis }: { analysis: Analysis | null }) {
  const [now, setNow] = useState(0);
  const running = analysis?.status === "PENDING" || analysis?.status === "RUNNING";
  useEffect(() => {
    if (!running || !analysis) return;
    const id0 = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.clearTimeout(id0); window.clearInterval(id); };
  }, [running, analysis]);

  if (!analysis) {
    return (
      <div className="rounded-2xl border border-steel bg-panel p-6 shadow-md">
        <p className="font-display text-body-md text-mist">Select an analysis to see its results.</p>
      </div>
    );
  }

  const started = analysis.startedAt ? new Date(analysis.startedAt).getTime() : now;
  const elapsed = running ? Math.max(0, now - started) : analysis.durationMs ?? 0;
  const progress = running ? Math.min(90, 10 + (elapsed / 1000) * 4) : 100;

  return (
    <motion.div
      key={analysis.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      className="flex flex-col gap-6 rounded-2xl border border-steel bg-panel p-6 shadow-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-headline-sm font-bold text-foam">
            Analysis #{analysis.number}
          </p>
          <p className="font-mono text-label-sm text-mist">
            {analysis.branch} · {analysis.status} · started{" "}
            {analysis.startedAt ? new Date(analysis.startedAt).toLocaleString() : "—"}
          </p>
        </div>
        <StatusPill status={analysis.status} />
      </div>

      {running ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between font-mono text-label-sm text-mist">
            <span>Analyzing repository…</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-basin">
            <motion.div
              className="h-full rounded-full bg-ice"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <p className="font-display text-body-sm text-mist">
            Elapsed {formatDuration(elapsed)}. Step progress is estimated — the backend does not expose per-step status.
          </p>
        </div>
      ) : null}

      {analysis.status === "FAILED" && analysis.error ? (
        <div className="rounded-xl border border-crimson/40 bg-crimson/10 p-4">
          <p className="font-display text-body-md font-semibold text-crimson">
            {analysis.error.code}
          </p>
          <p className="mt-1 font-display text-body-sm text-mist">{analysis.error.message}</p>
        </div>
      ) : null}

      {analysis.status === "COMPLETED" ? (
        <>
          <TechnologyGrid technologies={analysis.technologies} />
          <ComponentList components={analysis.components} />
          <DockerBlock docker={analysis.docker} />
          {analysis.detectedFiles.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="font-mono text-label-sm uppercase text-cinder">Detected files</p>
              <div className="flex flex-wrap gap-2">
                {analysis.detectedFiles.map((file) => (
                  <span
                    key={file}
                    className="rounded-lg border border-steel/40 bg-basin px-2.5 py-1 font-mono text-code-md text-mist"
                  >
                    {file}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </motion.div>
  );
}

function StatusPill({ status }: { status: Analysis["status"] }) {
  const classes =
    status === "COMPLETED"
      ? "bg-mint/15 text-mint"
      : status === "FAILED"
        ? "bg-crimson/15 text-crimson"
        : status === "RUNNING"
          ? "bg-ice/15 text-ice"
          : "bg-mist/15 text-mist";
  return (
    <span className={cn("rounded-full px-3 py-1 font-mono text-label-sm uppercase", classes)}>
      {status}
    </span>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function TechnologyGrid({ technologies }: { technologies: Analysis["technologies"] }) {
  const grouped: Record<string, string[]> = {};
  for (const t of technologies) {
    const bucket = grouped[t.category] ?? [];
    bucket.push(t.version ? `${t.name} ${t.version}` : t.name);
    grouped[t.category] = bucket;
  }
  const categories = Object.keys(grouped);
  if (categories.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="font-mono text-label-sm uppercase text-cinder">Technologies</p>
        <p className="font-display text-body-sm text-mist">None detected.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-label-sm uppercase text-cinder">Technologies</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {categories.map((category) => (
          <div key={category} className="rounded-xl border border-steel/40 bg-basin p-3">
            <p className="font-mono text-label-sm uppercase text-cinder">
              {CATEGORY_LABEL[category] ?? category}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {grouped[category].map((name) => (
                <span
                  key={name}
                  className="rounded-lg bg-surface-high px-2 py-0.5 font-mono text-code-md text-foam"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComponentList({ components }: { components: Analysis["components"] }) {
  if (components.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-label-sm uppercase text-cinder">Components</p>
      <ul className="flex flex-col gap-2">
        {components.map((component) => (
          <li
            key={component.name}
            className="flex items-center justify-between rounded-xl border border-steel/40 bg-basin px-4 py-3"
          >
            <span className="font-display text-body-md font-semibold text-foam">{component.name}</span>
            <span className="flex items-center gap-3">
              <span className="rounded-full bg-surface-high px-2 py-0.5 font-mono text-label-sm text-mist">
                {component.type}
              </span>
              <span className="font-mono text-label-sm text-mist">{component.rootPath}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DockerBlock({ docker }: { docker: Analysis["docker"] }) {
  const blocking = docker.findings.some((f) => f.severity === "ERROR");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <p className="font-mono text-label-sm uppercase text-cinder">Docker</p>
        <span className="rounded-full bg-surface-high px-2 py-0.5 font-mono text-label-sm text-mist">
          {docker.hasDockerfile ? "Dockerfile" : "no Dockerfile"}
        </span>
        <span className="rounded-full bg-surface-high px-2 py-0.5 font-mono text-label-sm text-mist">
          {docker.hasCompose ? "compose" : "no compose"}
        </span>
      </div>
      {docker.findings.length === 0 ? (
        <p className="font-display text-body-sm text-mint">No Docker findings.</p>
      ) : (
        <>
          {blocking ? (
            <div className="rounded-xl border border-champagne/40 bg-champagne/10 p-4">
              <p className="font-display text-body-md font-semibold text-champagne">
                Blocking Docker issue detected
              </p>
              <p className="mt-1 font-display text-body-sm text-mist">
                AI audit is disabled until the highest-severity finding is resolved.
              </p>
            </div>
          ) : null}
          <ul className="flex flex-col gap-2">
            {docker.findings.map((finding, index) => (
              <li
                key={`${finding.ruleId}-${index}`}
                className="flex items-start gap-3 rounded-xl border border-steel/40 bg-basin px-4 py-3"
              >
                <span
                  className={
                    finding.severity === "ERROR"
                      ? "mt-0.5 rounded-full bg-crimson/15 px-2 py-0.5 font-mono text-label-sm text-crimson"
                      : finding.severity === "WARNING"
                        ? "mt-0.5 rounded-full bg-champagne/15 px-2 py-0.5 font-mono text-label-sm text-champagne"
                        : "mt-0.5 rounded-full bg-mist/15 px-2 py-0.5 font-mono text-label-sm text-mist"
                  }
                >
                  {finding.severity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-body-sm text-foam">{finding.message}</p>
                  <p className="font-mono text-label-sm text-mist">
                    {finding.ruleId}
                    {finding.file ? ` · ${finding.file}` : ""}
                    {finding.line ? `:${finding.line}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
