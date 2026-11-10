
export const ACCOUNT_STATUSES = [
  'PENDING',
  'ACTIVE',
  'REJECTED',
  'DISABLED',
] as const;

export type AccountStatus =
  (typeof ACCOUNT_STATUSES)[number];
