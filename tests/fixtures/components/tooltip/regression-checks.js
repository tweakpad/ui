// Tooltip regression checks, executed through Chrome DevTools MCP `evaluate_script`.
// Ported from the former Playwright repair smoke script.
const settle = async (...elements) => {
  for (let i = 0; i < 3; i++) {
    await Promise.all(elements.map((element) => element.updateComplete));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
};

/** Replacing the trigger moves the description; removing the tooltip releases it. */
export async function triggerReplacement() {
  const host = document.querySelector('#host');
  host.innerHTML =
    '<tp-tooltip><button slot="trigger" aria-describedby="existing">Help</button>Description</tp-tooltip>';
  const tooltip = host.querySelector('tp-tooltip');
  const oldTrigger = tooltip.querySelector('button');
  tooltip.motionPolicy = 'reduce';
  tooltip.open = true;
  await settle(tooltip);
  const newTrigger = document.createElement('button');
  newTrigger.slot = 'trigger';
  newTrigger.textContent = 'Replacement';
  oldTrigger.replaceWith(newTrigger);
  await settle(tooltip);
  const result = {
    oldTriggerRestored: oldTrigger.getAttribute('aria-describedby') === 'existing',
    newTriggerDescribed: Boolean(newTrigger.getAttribute('aria-describedby')),
  };
  tooltip.remove();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  result.disconnectReleased = !newTrigger.hasAttribute('aria-describedby');
  const failed = Object.entries(result).filter(([, value]) => !value);
  if (failed.length)
    throw new Error(`triggerReplacement failed: ${failed.map(([key]) => key).join(', ')}`);
  return result;
}
