/**
 * Deep freezing of plain state data, shared by the stores and engines that publish frozen
 * snapshots. `deepFreeze` freezes a value in place; `frozenCopy` freezes a copy and leaves the
 * caller's objects as they are.
 */

/**
 * Deep-freezes a value in place and returns it: every object reached through its own enumerable
 * values is frozen, and a value that is already frozen is kept as it is, without visiting it.
 */
export function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

/**
 * A deep-frozen copy of plain data: arrays and plain objects are copied and frozen, and any other
 * value, a class instance included, is kept as it is, so the caller's objects stay unfrozen.
 */
export function frozenCopy<T>(value: T): T {
  if (Array.isArray(value))
    return Object.freeze(value.map((item: unknown) => frozenCopy(item))) as T;
  if (typeof value !== 'object' || value === null) return value;
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;
  const copy: Record<string, unknown> = {};
  for (const [key, member] of Object.entries(value)) copy[key] = frozenCopy(member);
  return Object.freeze(copy) as T;
}
