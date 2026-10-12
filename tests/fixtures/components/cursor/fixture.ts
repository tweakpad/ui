import type { TpCursor, TpCursorZone } from '../../../../src/components/cursor/index.js';

const params = new URLSearchParams(location.search);
const built = params.has('built');
if (built)
  document.querySelector<HTMLLinkElement>('link[rel=stylesheet]')!.href = '/dist/styles.css';

const log = document.querySelector('#log')!;
const events: { id: string; type: string; detail: unknown; at: number }[] = [];
const diagnostics: { code: string; message: string }[] = [];
const layoutShifts: number[] = [];
for (const type of ['tp-cursor-state-change', 'tp-cursor-follow-change', 'tp-diagnostic'])
  document.addEventListener(
    type,
    (event) => {
      const target = event.target as Element;
      const detail = (event as CustomEvent).detail as Record<string, unknown>;
      events.push({ id: target.id || target.localName, type, detail, at: performance.now() });
      if (type === 'tp-diagnostic')
        diagnostics.push({ code: String(detail.code), message: String(detail.message) });
      const summary =
        type === 'tp-cursor-state-change'
          ? `${String(detail.previousValue)} → ${String(detail.value)} (${String(detail.reason)})`
          : type === 'tp-cursor-follow-change'
            ? `${String(detail.value)} (${String(detail.reason)})`
            : String(detail.code);
      log.textContent += `${target.id || target.localName} ${type} ${summary}\n`;
    },
    true,
  );
try {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as PerformanceEntry[])
      if (!(entry as { hadRecentInput?: boolean }).hadRecentInput)
        layoutShifts.push((entry as { value?: number }).value ?? 0);
  }).observe({ type: 'layout-shift', buffered: true });
} catch {
  // Layout shift reporting is optional.
}

let last = { x: 0, y: 0 };
const pointerEvent = (
  type: string,
  x: number,
  y: number,
  pointerType: string,
  init: PointerEventInit = {},
) =>
  new PointerEvent(type, {
    bubbles: true,
    composed: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    pointerType,
    pointerId: pointerType === 'touch' ? 2 : 1,
    isPrimary: true,
    ...init,
  });

/**
 * Constructed pointer input (API evidence only; real pointer evidence comes from Chrome DevTools
 * MCP hover and click). A move is dispatched at the element under the point so that it reaches
 * the document listeners through the same path as a real one.
 */
function movePointer(x: number, y: number, pointerType = 'mouse', target?: Element): void {
  last = { x, y };
  const element = target ?? document.elementFromPoint(x, y) ?? document.body;
  element.dispatchEvent(pointerEvent('pointermove', x, y, pointerType));
}
function press(pointerType = 'mouse'): void {
  document.body.dispatchEvent(
    pointerEvent('pointerdown', last.x, last.y, pointerType, { button: 0, buttons: 1 }),
  );
}
function release(pointerType = 'mouse'): void {
  document.body.dispatchEvent(
    pointerEvent('pointerup', last.x, last.y, pointerType, { button: 0 }),
  );
}
/** The pointer leaves the document. */
function leave(): void {
  document.documentElement.dispatchEvent(
    pointerEvent('pointerout', -1, -1, 'mouse', { relatedTarget: null }),
  );
}
/** Boundary events a real pointer produces when it enters or leaves a zone. */
function enterZone(zone: TpCursorZone, pointerType = 'mouse'): void {
  zone.dispatchEvent(
    new PointerEvent('pointerenter', { pointerType, composed: true, bubbles: false }),
  );
}
function leaveZone(zone: TpCursorZone, pointerType = 'mouse'): void {
  zone.dispatchEvent(
    new PointerEvent('pointerleave', { pointerType, composed: true, bubbles: false }),
  );
}
/** Per-frame samples of a cursor's published values. */
async function sampleFollow(root: TpCursor, count: number) {
  const samples: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    moving: boolean;
    cssX: string;
    cssVelocity: number;
  }[] = [];
  for (let index = 0; index < count; index++) {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    samples.push({
      x: root.position.x,
      y: root.position.y,
      vx: root.velocity.x,
      vy: root.velocity.y,
      moving: root.hasAttribute('data-moving'),
      cssX: root.style.getPropertyValue('--tp-cursor-x'),
      cssVelocity: Number(root.style.getPropertyValue('--tp-cursor-velocity-x')),
    });
  }
  return samples;
}
const $ = <T extends Element = TpCursor>(id: string) => document.getElementById(id) as unknown as T;

async function main() {
  await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
  await customElements.whenDefined('tp-cursor');
  await Promise.all(
    Array.from(document.querySelectorAll('tp-cursor, tp-cursor-zone')).map(
      (element) => (element as TpCursor).updateComplete,
    ),
  );
  Object.assign(window, {
    cursorFixture: {
      movePointer,
      press,
      release,
      leave,
      enterZone,
      leaveZone,
      sampleFollow,
      events,
      diagnostics,
      layoutShifts,
      $,
    },
  });
  document.documentElement.toggleAttribute('data-ready', true);
}
void main();
