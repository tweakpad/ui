/** Moves an identity to the front of a bounded, duplicate-free list. */
export function pushRecent(
  list: readonly string[],
  identity: string,
  limit: number,
): readonly string[] {
  if (limit <= 0) return [];
  const next = [identity, ...list.filter((entry) => entry !== identity)];
  return next.length > limit ? next.slice(0, limit) : next;
}
