import { deepFreeze } from '../../../foundation/freeze.js';

/**
 * Stable property values for rendered controls (`uwg-te-req-perf-1`). The element renders on every
 * state publication, once per typed character, and a control that receives a new function or
 * record in a property updates, and repaints its part presentation, each time. A callback or a
 * record kept under its owner by a key of what it depends on keeps its identity across renders.
 */
const values = new WeakMap<object, Map<string, unknown>>();

/**
 * The value of `key` under `owner`, created by `create` on the first call. `create` may close over
 * only what `key` and `owner` name, since later calls with the same key return its first value.
 */
export function stableValue<T>(owner: object, key: string, create: () => T): T {
  let byKey = values.get(owner);
  if (!byKey) values.set(owner, (byKey = new Map()));
  if (byKey.has(key)) return byKey.get(key) as T;
  const value = create();
  byKey.set(key, value);
  return value;
}

/** The owner of records that depend on their content alone. */
const CONTENT: object = {};

/** One frozen record per content: `record` is keyed by its JSON form, so it holds plain data only. */
export function stableRecord<T extends object>(record: T): T {
  return stableValue(CONTENT, JSON.stringify(record), () => deepFreeze(record));
}
