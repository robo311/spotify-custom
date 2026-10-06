// Record lookup that admits a key may be missing (the project tsconfig types record access as always defined).

export function lookup<T>(record: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined
}
