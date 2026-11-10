import type { ApiErrorBody } from "@/types/api";

interface ApiEnvelopedPayload {
  error?: Partial<ApiErrorBody>;
}

interface RtkErrorPayload {
  status?: number | string;
  data?: unknown;
}

function errorEnvelopeOf(error: unknown): ApiErrorBody | null {
  if (typeof error !== "object" || error === null) return null;
  const payload = error as RtkErrorPayload;
  const body = payload.data ?? error;
  if (typeof body !== "object" || body === null) return null;
  const envelope = body as ApiEnvelopedPayload;
  const inner = envelope.error;
  if (typeof inner !== "object" || inner === null) return null;
  return {
    code: typeof inner.code === "string" ? inner.code : "INTERNAL_ERROR",
    message: typeof inner.message === "string" ? inner.message : "",
    details: inner.details,
  };
}

export function apiErrorCode(error: unknown): string | null {
  const envelope = errorEnvelopeOf(error);
  return envelope ? envelope.code : null;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  const envelope = errorEnvelopeOf(error);
  return envelope && envelope.message.trim() ? envelope.message : fallback;
}

export function apiFieldErrorsOf(error: unknown): Record<string, string[]> {
  const envelope = errorEnvelopeOf(error);
  const details = envelope?.details;
  if (typeof details !== "object" || details === null) return {};
  const fieldErrors = (details as { fieldErrors?: unknown }).fieldErrors;
  if (typeof fieldErrors !== "object" || fieldErrors === null) return {};
  const mapped: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (Array.isArray(messages)) {
      const present = (messages as unknown[]).filter(
        (message): message is string => typeof message === "string",
      );
      if (present.length > 0) {
        mapped[field] = present;
      }
    }
  }
  return mapped;
}
