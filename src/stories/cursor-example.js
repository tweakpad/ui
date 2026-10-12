/**
 * Application code around Cursor: a programmatic state driven by a toggle group, and a readout of
 * the state-change notifications so the lane is visible.
 */
export function setupCursorExample(root) {
  const cursor = root.querySelector('tp-cursor');
  const group = root.querySelector('tp-toggle-group');
  const readout = root.querySelector('[data-readout]');
  if (!cursor || !group || !readout) return () => {};
  const view = root.ownerDocument.defaultView;
  const controller = new view.AbortController();
  const { signal } = controller;

  // The toggle group's value becomes the cursor state; clearing the selection clears it.
  group.addEventListener(
    'tp-value-change',
    (event) => {
      const value = event.detail.value;
      cursor.setState(Array.isArray(value) ? (value[0] ?? null) : value || null);
    },
    { signal },
  );

  // Every state change, from zones or from setState(), reports its reason.
  cursor.addEventListener(
    'tp-cursor-state-change',
    (event) => {
      const { value, previousValue, reason } = event.detail;
      readout.textContent = `${previousValue ?? 'none'} → ${value ?? 'none'} (${reason})`;
    },
    { signal },
  );

  return () => controller.abort();
}
