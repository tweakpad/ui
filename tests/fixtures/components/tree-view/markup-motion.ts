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

/**
 * Moving an expanded tree, with `moveBefore` as a client-side router carries a persisted element
 * and with `append`, keeps its open groups settled at full height: no entry replays, so a scrolled
 * column around the tree keeps its position where the browser keeps it (across `moveBefore`).
 */
async function assertMove() {
  const failures: string[] = [];
  const sections = ['one', 'two', 'three'];
  const column = document.createElement('div');
  column.style.cssText = 'block-size: 12rem; overflow: auto; max-inline-size: 20rem';
  column.innerHTML = `<tp-tree-view label="Moved" default-expanded='${JSON.stringify(sections)}'>${sections
    .map(
      (section) =>
        `<tp-tree-item value="${section}">${section}${Array.from(
          { length: 8 },
          (_, index) =>
            `<tp-tree-item value="${section}-${index}">${section} ${index + 1}</tp-tree-item>`,
        ).join('')}</tp-tree-item>`,
    )
    .join('')}</tp-tree-view>`;
  const first = document.createElement('div');
  const second = document.createElement('div');
  document.body.append(first, second);
  first.append(column);
  await wait(600);
  const groups = () =>
    Array.from(column.querySelectorAll('tp-tree-view > tp-tree-item'), (item) =>
      item.shadowRoot!.querySelector<HTMLElement>("[part~='group']")!,
    );
  const heights = () =>
    groups().map((element) => Math.round(element.getBoundingClientRect().height));
  const full = heights();
  for (const how of ['moveBefore', 'append'] as const) {
    if (how === 'moveBefore' && !('moveBefore' in Element.prototype)) continue;
    column.scrollTop = column.scrollHeight;
    const top = column.scrollTop;
    const target = column.parentElement === first ? second : first;
    if (how === 'moveBefore')
      (target as Element & { moveBefore(node: Node, child: Node | null): void }).moveBefore(
        column,
        null,
      );
    else target.append(column);
    for (let frame = 0; frame < 20; frame += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (
        groups().some((element) => element.hasAttribute('data-starting-style')) ||
        heights().some((height, index) => height !== full[index])
      ) {
        failures.push(`${how}: an open group replayed its entry`);
        break;
      }
    }
    if (how === 'moveBefore' && column.scrollTop !== top)
      failures.push('moveBefore: the column lost its scroll position');
  }
  first.remove();
  second.remove();
  return { pass: failures.length === 0, failures };
}

Object.assign(window, { assertMarkupMotion, assertMove });
await import('/src/register.ts');
