export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0];
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = words[0];
  const last = words.length > 1 ? words[words.length - 1] : "";
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function titleCase(word: string): string {
  const trimmed = word.trim();
  if (trimmed.length === 0) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}
