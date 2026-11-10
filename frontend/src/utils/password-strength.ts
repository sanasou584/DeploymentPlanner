export function passwordStrengthScore(value: string): number {
  if (value.length < 8) {
    return 0;
  }
  const bonuses = [
    value.length >= 12,
    /[a-z]/.test(value) && /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ];
  const bonusCount = bonuses.filter(Boolean).length;
  return Math.min(4, 1 + bonusCount);
}
