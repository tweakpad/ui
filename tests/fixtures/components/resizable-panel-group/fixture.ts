// Resizable panel group fixture, driven only through Chrome DevTools MCP.
//
// Sections: `#horizontal` (a collapsible first panel, a decorated handle and a disabled second
// handle, keyboard step 5), `#vertical`, `#rtl` (inside `dir="rtl"`) and a standalone separator
// whose `ResizeSeparatorController` this module owns: value 200, limits 48 and 400, steps 8, 32
// with Shift and 1 with Alt. `window.panelFixture` exposes the groups, the controller, its
// value, the proposals it received (`log`), `setDirection(dir)` for the standalone section and
// `state()`, which reads every panel size and every separator's ARIA values.
import type { ResizeSeparatorProposal } from '../../../../src/foundation/resize-separator.ts';

const built = new URL(location.href).searchParams.has('package');
const stylesheet = document.createElement('link');
stylesheet.rel = 'stylesheet';
stylesheet.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.prepend(stylesheet);
const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
await customElements.whenDefined('tp-resizable-panel-group');

const groups = Object.fromEntries(
  ['horizontal', 'vertical', 'rtl'].map((id) => [id, document.getElementById(id)!]),
);
await Promise.all(
  Object.values(groups).map(
    (group) => (group as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete,
  ),
);

// Standalone separator ------------------------------------------------------------------------
const section = document.getElementById('standalone-section')!;
const separator = document.getElementById('standalone-separator')!;
const pane = document.getElementById('standalone-pane')!;
const target = document.createElement('style');
target.textContent = api.resizeSeparatorTargetCss('#standalone-separator', 'horizontal');
document.head.append(target);
const log: { value: number; delta: number; source: string; phase: string }[] = [];
let value = 200;
let preview: number | null = null;
const paint = () => {
  pane.style.inlineSize = `${preview ?? value}px`;
  for (const [name, attribute] of Object.entries(controller.attributes()))
    separator.setAttribute(name, String(attribute));
};
const controller = new api.ResizeSeparatorController({
  host: separator,
  axis: () => 'horizontal',
  direction: () => (getComputedStyle(section).direction === 'rtl' ? 'rtl' : 'ltr'),
  value: () => value,
  min: () => 48,
  max: () => 400,
  steps: () => ({ step: 8, shift: 32, alt: 1 }),
  propose: (proposal: ResizeSeparatorProposal) => {
    log.push({
      value: proposal.value,
      delta: proposal.delta,
      source: proposal.source,
      phase: proposal.phase,
    });
    if (proposal.phase === 'live') preview = proposal.value;
    else {
      preview = null;
      if (proposal.phase === 'settled') value = proposal.value;
    }
    paint();
  },
});
separator.tabIndex = 0;
controller.connect(separator);
paint();

const rect = (element: Element) => {
  const box = element.getBoundingClientRect();
  return [Math.round(box.width), Math.round(box.height)];
};

Object.assign(window, {
  panelFixture: {
    groups,
    controller,
    separator,
    log,
    get value() {
      return value;
    },
    set value(next: number) {
      value = next;
      paint();
    },
    setDirection(dir: 'ltr' | 'rtl') {
      section.dir = dir;
      paint();
    },
    /** Every panel's size in CSS pixels and every separator's role, orientation and values. */
    state() {
      const panels = Object.fromEntries(
        [...document.querySelectorAll('tp-resizable-panel')].map((panel) => [
          panel.id,
          rect(panel),
        ]),
      );
      const separators = Object.fromEntries(
        [...document.querySelectorAll('tp-resizable-handle')].map((handle) => {
          const part = handle.shadowRoot?.querySelector('[role=separator]');
          return [
            handle.id,
            part
              ? [
                  'aria-orientation',
                  'aria-valuenow',
                  'aria-valuemin',
                  'aria-valuemax',
                  'aria-disabled',
                  'tabindex',
                ]
                  .map((name) => `${name}=${part.getAttribute(name)}`)
                  .join(' ')
              : null,
          ];
        }),
      );
      return { panels, separators, standalone: { value, preview, width: rect(pane)[0] } };
    },
  },
});
document.documentElement.toggleAttribute('data-fixture-ready', true);
