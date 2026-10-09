// Menu regression checks, executed through Chrome DevTools MCP `evaluate_script`.
// Keyboard and pointer scenarios are tool-driven; `state()` reads what they must produce.
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const settle = async (...elements) => {
  for (let i = 0; i < 3; i++) {
    await Promise.all(elements.map((element) => element.updateComplete));
    await frame();
  }
};
const menu = (id) => document.querySelector(`#${id}`);
const fail = (name, result) => {
  const failed = Object.entries(result).filter(([, value]) => value !== true);
  if (failed.length)
    throw new Error(
      `${name} failed: ${failed.map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(', ')}`,
    );
  return result;
};
const activeValue = () => {
  const active = document.activeElement;
  return (
    active?.getAttribute?.('value') ??
    active?.closest?.('[value]')?.getAttribute('value') ??
    active?.id ??
    null
  );
};
/** Open state, highlighted items and the focused value, for tool-driven steps. */
export const state = (id = 'actions') => ({
  open: menu(id).open,
  active: activeValue(),
  triggerFocused:
    document.activeElement === menu(id).triggerElement ||
    menu(id).triggerElement?.shadowRoot?.activeElement != null,
  highlighted: [...menu(id).querySelectorAll('[data-highlighted]')].map((element) =>
    element.getAttribute('value'),
  ),
});

/** Closed by default with a hidden popup; checkbox items keep the menu open; cancellation. */
export async function commands() {
  const root = menu('actions');
  await settle(root);
  const closedDefault = !root.open && !(root.popupElement && !root.popupElement.hidden);
  root.setOpen(true);
  await settle(root);
  const check = root.querySelector('[value="check"]');
  const checked = () => check.checked === true || check.getAttribute('aria-checked') === 'true';
  check.click();
  await settle(root);
  const checkboxPolicy = root.open && checked();
  const cancel = (event) => event.preventDefault();
  root.addEventListener('tp-action', cancel);
  check.click();
  await settle(root);
  const cancellation = checked() && root.open;
  root.removeEventListener('tp-action', cancel);
  root.querySelector('[value="go"]').click();
  await settle(root);
  const commandClose = !root.open;
  return fail('commands', { closedDefault, checkboxPolicy, cancellation, commandClose });
}

/** A vetoed sibling proposal leaves the open sibling and the bar value untouched. */
export async function menubarAtomicCancellation() {
  const bar = menu('bar');
  const [a, b] = bar.querySelectorAll('tp-menu');
  await settle(bar, a, b);
  a.setOpen(true);
  await settle(bar, a, b);
  const veto = (event) => event.preventDefault();
  b.addEventListener('tp-open-change', veto);
  b.setOpen(true);
  await settle(bar, a, b);
  b.removeEventListener('tp-open-change', veto);
  const result = { aOpen: a.open, bClosed: !b.open, value: bar.value === 'a' };
  a.setOpen(false);
  await settle(bar, a, b);
  return fail('menubarAtomicCancellation', result);
}

/** Opens the parent menu for the submenu keyboard steps. */
export async function openParent() {
  const parent = menu('parent');
  parent.setOpen(true);
  await settle(parent);
  parent.querySelector('[value="first"]').focus();
  return { open: parent.open, active: activeValue() };
}
/** Parent/child open state and the focused value after ArrowRight, ArrowLeft or Escape. */
export const submenuState = () => ({
  parentOpen: menu('parent').open,
  childOpen: menu('child').open,
  active: activeValue(),
});
