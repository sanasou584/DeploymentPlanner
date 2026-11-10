export function nameKeyOf(name: string): string {
  return name.trim().toLowerCase();
}

export function takenNameKeysOf(names: readonly string[]): Set<string> {
  return new Set(names.map(nameKeyOf));
}

export function isTakenName(taken: ReadonlySet<string>, candidate: string): boolean {
  return taken.has(nameKeyOf(candidate));
}
