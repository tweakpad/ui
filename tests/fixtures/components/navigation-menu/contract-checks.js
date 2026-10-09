// Navigation Menu contract checks, executed through Chrome DevTools MCP `evaluate_script`.
// The trigger click and the Escape key are tool-driven; these helpers only read state.
const navigation = () => document.querySelector('#navigation');
const trigger = () => document.querySelector('#products-trigger');
const content = () => document.querySelector('#products-content');
const expanded = () => {
  const host = trigger();
  const inner = host.shadowRoot?.querySelector('[aria-expanded]');
  return host.getAttribute('aria-expanded') ?? inner?.getAttribute('aria-expanded') ?? null;
};
const activeIsTrigger = () => {
  const host = trigger();
  return (
    document.activeElement === host ||
    host.shadowRoot?.activeElement === host.shadowRoot?.querySelector('.control')
  );
};

/** Current disclosure state: read after clicking the trigger and after Escape. */
export const state = () => ({
  value: navigation().value,
  contentHidden: content().hidden,
  triggerExpanded: expanded(),
  activeIsTrigger: activeIsTrigger(),
});

/** After the Products trigger is clicked: value, content visibility and `aria-expanded`. */
export function disclosure() {
  const current = state();
  if (current.value !== 'products' || current.contentHidden || current.triggerExpanded !== 'true')
    throw new Error(`disclosure failed: ${JSON.stringify(current)}`);
  return current;
}

/** Links stay native anchors in the tab order without an injected role. */
export function nativeLinks() {
  const links = [...navigation().querySelectorAll('a')];
  const native = links.every((link) => !link.hasAttribute('role') && link.tabIndex === 0);
  if (!native) throw new Error('navigation links lost native semantics');
  return { links: links.length, native };
}

/** After focusing a content link and pressing Escape: closed and focus back on the trigger. */
export function escapeRestored() {
  const current = state();
  if (current.value || !current.contentHidden || !current.activeIsTrigger)
    throw new Error(`escapeRestored failed: ${JSON.stringify(current)}`);
  return current;
}
