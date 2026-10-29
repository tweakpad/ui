// Issue 9: a frame-by-frame record of the `src` group (in the item's shadow root) from the first
// render on: its motion markers, hidden state, rendered height, measured extent and animations.
// `window.groupTimeline` holds the samples; `window.recordGroup()` restarts recording.
type Sample = {
  t: number;
  open: boolean;
  starting: boolean;
  ending: boolean;
  driven: string | null;
  settled: boolean;
  hidden: boolean;
  height: number;
  extent: string;
  animations: number;
};
const timeline: Sample[] = [];
let start = performance.now();
let until = start + 1500;

function sample(): void {
  const item = document.querySelector('tp-tree-item[value="src"]');
  const group = item?.shadowRoot?.querySelector<HTMLElement>("[part~='group']");
  if (group)
    timeline.push({
      t: Math.round(performance.now() - start),
      open: group.hasAttribute('data-open'),
      starting: group.hasAttribute('data-starting-style'),
      ending: group.hasAttribute('data-ending-style'),
      driven: group.getAttribute('data-tp-motion-driven'),
      settled: group.hasAttribute('data-settled'),
      hidden: group.hidden,
      height: Math.round(group.getBoundingClientRect().height),
      extent: getComputedStyle(group).getPropertyValue('--tree-view-group-height').trim(),
      animations: group.getAnimations().length,
    });
  if (performance.now() < until) requestAnimationFrame(sample);
}

Object.assign(window, {
  groupTimeline: timeline,
  recordGroup(duration = 1500) {
    timeline.length = 0;
    start = performance.now();
    until = start + duration;
    requestAnimationFrame(sample);
  },
});
requestAnimationFrame(sample);

const group = () =>
  document
    .querySelector('tp-tree-item[value="src"]')!
    .shadowRoot!.querySelector<HTMLElement>("[part~='group']")!;

/** Presses the `src` row where a person would, on the deepest element at that point. */
async function pressSource(): Promise<void> {
  const row = document
    .querySelector('tp-tree-item[value="src"]')!
    .shadowRoot!.querySelector<HTMLElement>("[part~='row']")!;
  const rect = row.getBoundingClientRect();
  const x = rect.left + 12;
  const y = rect.top + rect.height / 2;
  let target = document.elementFromPoint(x, y)!;
  while (target.shadowRoot) {
    const inner = target.shadowRoot.elementFromPoint(x, y);
    if (!inner || inner === target) break;
    target = inner;
  }
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
    const init = { bubbles: true, composed: true, clientX: x, clientY: y, button: 0 };
    target.dispatchEvent(
      type.startsWith('pointer')
        ? new PointerEvent(type, { ...init, pointerId: 1, isPrimary: true })
        : new MouseEvent(type, init),
    );
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The issue's three expectations on a fresh load: the default-expanded group appears at full
 * height without a transition, a press runs the exit (ending style, animated) and another press
 * runs the enter (starting style, animated) and settles without a transition.
 */
async function assertMarkupMotion() {
  const failures: string[] = [];
  await wait(1600);
  const first = timeline.filter((entry) => entry.open);
  if (!first.length || first.some((entry) => entry.animations > 0 || !entry.settled))
    failures.push('first render: the open group animated or was not settled');
  const full = first.at(-1)?.height ?? 0;
  if (first.some((entry) => entry.height !== full))
    failures.push('first render: the group did not appear at its full height');
  for (const [label, expanding] of [
    ['collapse', false],
    ['expand', true],
  ] as const) {
    (window as unknown as { recordGroup(duration: number): void }).recordGroup(800);
    await pressSource();
    await wait(900);
    const phase = expanding ? 'starting' : 'ending';
    if (!timeline.some((entry) => entry[phase])) failures.push(`${label}: no ${phase} style`);
    if (!timeline.some((entry) => entry.animations > 0)) failures.push(`${label}: did not animate`);
    const end = group();
    if (
      expanding &&
      !(end.hasAttribute('data-settled') && getComputedStyle(end).transitionProperty === 'none')
    )
      failures.push('expand: the open group did not settle without a transition');
    if (!expanding && !end.hidden) failures.push('collapse: the group was not hidden at the end');
  }
  return { pass: failures.length === 0, failures };
}

Object.assign(window, { assertMarkupMotion });
await import('/src/register.ts');
