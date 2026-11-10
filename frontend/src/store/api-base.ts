const FALLBACK_API_BASE_URL = "http://localhost:4000/api/v1";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? FALLBACK_API_BASE_URL;
