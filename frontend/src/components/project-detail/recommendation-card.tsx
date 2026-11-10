"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/utils/class-names";
import { MaterialIcon } from "@/shared/material-icon";
import { Button } from "@/shared/button";
import type { Recommendation } from "@/types/analysis";

const SEVERITY_CLASSES: Record<Recommendation["severity"], string> = {
  CRITICAL: "bg-crimson/15 text-crimson",
  WARNING: "bg-champagne/15 text-champagne",
  INFO: "bg-mist/15 text-mist",
};

const TYPE_LABEL: Record<Recommendation["type"], string> = {
  REPLICAS: "Replicas",
  CPU: "CPU",
  MEMORY: "Memory",
  HPA: "HPA",
  INGRESS: "Ingress",
  DOCKER: "Docker",
  SECURITY: "Security",
  GENERAL: "General",
};

export function RecommendationCard({
  recommendation,
  pending,
  onAccept,
  onReject,
}: {
  recommendation: Recommendation;
  pending: boolean;
  onAccept: () => void;
  onReject: (note?: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [showReject, setShowReject] = useState(false);
  const decided = recommendation.status !== "PENDING";
  const ai = recommendation.generatedBy.provider !== "internal";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 rounded-2xl border border-steel bg-panel p-5 shadow-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-high px-2.5 py-0.5 font-mono text-label-sm text-foam">
              {TYPE_LABEL[recommendation.type]}
            </span>
            <span className={cn("rounded-full px-2.5 py-0.5 font-mono text-label-sm uppercase", SEVERITY_CLASSES[recommendation.severity])}>
              {recommendation.severity}
            </span>
            {ai ? (
              <span className="rounded-full bg-ice/10 px-2.5 py-0.5 font-mono text-label-sm text-ice">
                AI
              </span>
            ) : null}
            {recommendation.componentName ? (
              <span className="font-mono text-label-sm text-mist">{recommendation.componentName}</span>
            ) : null}
          </div>
          <h3 className="mt-2 font-display text-body-md font-semibold text-foam">{recommendation.title}</h3>
          <p className="mt-1 font-display text-body-sm text-mist">{recommendation.description}</p>
          {recommendation.suggestedValue ? (
            <p className="mt-2 font-mono text-code-md text-ice">
              suggested: {recommendation.suggestedValue}
            </p>
          ) : null}
          {recommendation.confidence !== null && recommendation.confidence !== undefined ? (
            <p className="font-mono text-label-sm text-mist">
              confidence {Math.round(recommendation.confidence * 100)}%
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 font-mono text-label-sm uppercase",
            recommendation.status === "ACCEPTED"
              ? "bg-mint/15 text-mint"
              : recommendation.status === "REJECTED"
                ? "bg-crimson/15 text-crimson"
                : "bg-mist/15 text-mist",
          )}
        >
          {recommendation.status}
        </span>
      </div>

      {recommendation.proposedFile ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 font-display text-body-sm text-ice hover:underline"
          >
            <MaterialIcon name={expanded ? "expand_less" : "expand_more"} className="text-[14px]" />
            View proposed file
          </button>
          <AnimatePresence>
            {expanded ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden rounded-xl border border-steel bg-basin"
              >
                <div className="border-b border-steel/40 px-3 py-2 font-mono text-label-sm text-cinder">
                  {recommendation.proposedFile.path}
                </div>
                <pre className="max-h-64 overflow-auto p-3 font-mono text-code-md text-foam">
                  {recommendation.proposedFile.content}
                </pre>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}

      {decided ? (
        recommendation.decisionNote ? (
          <p className="font-display text-body-sm italic text-mist">“{recommendation.decisionNote}”</p>
        ) : null
      ) : (
        <div className="flex flex-col gap-2 border-t border-steel/40 pt-3">
          {showReject ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason (optional)"
                rows={2}
                className="w-full resize-none rounded-xl bg-basin p-3 font-display text-body-sm text-foam outline-none focus:border-teal focus:ring-1 focus:ring-teal"
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="champagne"
                  onClick={() => {
                    onReject(note.trim() || undefined);
                    setShowReject(false);
                    setNote("");
                  }}
                  disabled={pending}
                  className="h-8 px-4"
                >
                  Confirm reject
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReject(false);
                    setNote("");
                  }}
                  className="font-display text-body-sm text-mist hover:text-foam"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                onClick={onAccept}
                disabled={pending}
                className="h-8 gap-2 px-4 font-bold"
              >
                <MaterialIcon name="check" className="text-[14px]" />
                Accept
              </Button>
              <Button
                variant="champagne"
                onClick={() => setShowReject(true)}
                disabled={pending}
                className="h-8 px-4"
              >
                Reject
              </Button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
