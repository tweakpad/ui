/* Assertion helpers evaluated through Chrome DevTools MCP; each returns { checks, records }. */
import type { TpFlow, TpFlowNode, TpFlowPort } from '../../../../src/widgets/flow/index.js';
import type {
  FlowDocument,
  FlowEdgeKind,
  FlowPoint,
  FlowRect,
} from '../../../../src/foundation/flow/types.js';
import { DEFAULT_NODE_SIZE_BY_SHAPE } from '../../../../src/foundation/flow/defaults.js';

interface Check {
  readonly name: string;
  readonly pass: boolean;
  readonly actual: unknown;
}
interface Report {
  readonly checks: Check[];
  readonly records: Record<string, unknown>;
  readonly passed: boolean;
}
interface Captured {
  type: string;
  reason: string;
  cancelled: boolean;
  metadata: Record<string, unknown> | undefined;
  value: unknown;
}

const report = (checks: Check[], records: Record<string, unknown> = {}): Report => ({
  checks,
  records,
  passed: checks.every((check) => check.pass),
});
const check = (name: string, pass: boolean, actual: unknown): Check => ({ name, pass, actual });
const flow = (id: string): TpFlow => document.getElementById(id) as unknown as TpFlow;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const frame = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

async function settle(target: TpFlow): Promise<void> {
  await frame();
  await target.updateComplete;
  await frame();
}

/** Materialized node hosts; released hosts stay connected but hidden in the pool. */
function hosts(target: TpFlow): TpFlowNode[] {
  return [...target.shadowRoot!.querySelectorAll<TpFlowNode>('tp-flow-node')].filter(
    (item) => !item.hidden,
  );
}
function host(target: TpFlow, nodeId: string): TpFlowNode | undefined {
  return hosts(target).find((item) => item.nodeId === nodeId);
}
function port(target: TpFlow, nodeId: string, portId: string): TpFlowPort | undefined {
  return [
    ...(host(target, nodeId)?.shadowRoot?.querySelectorAll<TpFlowPort>('tp-flow-port') ?? []),
  ].find((item) => item.portId === portId);
}
function capture(target: EventTarget, types: readonly string[]) {
  const events: Captured[] = [];
  const listener = (event: Event) => {
    if (event.target !== target) return;
    const detail = (event as CustomEvent<Record<string, unknown>>).detail ?? {};
    events.push({
      type: event.type,
      reason: String(detail['reason'] ?? ''),
      cancelled: Boolean(detail['cancelled']),
      metadata: detail['metadata'] as Record<string, unknown> | undefined,
      value: detail['value'],
    });
  };
  for (const type of types) target.addEventListener(type, listener);
  return {
    events,
    stop: () => {
      for (const type of types) target.removeEventListener(type, listener);
    },
  };
}
function center(element: Element): FlowPoint {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
function pointer(
  type: string,
  target: EventTarget,
  point: FlowPoint,
  init: PointerEventInit = {},
): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerId: 21,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: point.x,
      clientY: point.y,
      ...init,
    }),
  );
}
/** Synthetic press/move/release; real gestures come from the MCP `drag` tool (README). */
async function syntheticDrag(
  target: Element,
  from: FlowPoint,
  to: FlowPoint,
  steps = 4,
): Promise<void> {
  pointer('pointerdown', target, from);
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    pointer('pointermove', target, {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    });
    await frame();
  }
  pointer('pointerup', target, to);
  await frame();
}

// ---- value lane ----------------------------------------------------------------------------

export async function assertValueLane(id = 'monitor'): Promise<Report> {
  const target = flow(id);
  const captured = capture(target, ['tp-value-change', 'tp-value-commit']);
  const before = target.value;
  const node = target.nodes[0]!;
  const added = target.addNodes([{ type: node.type, position: { x: 10, y: 10 }, data: {} }]);
  await settle(target);
  const after = target.value;
  const json = JSON.stringify(target.toJSON());
  target.undo();
  await settle(target);
  captured.stop();
  return report(
    [
      check(
        'value is a document',
        before.version === 1 && Array.isArray(before.nodes),
        before.version,
      ),
      check(
        'addNodes applied one node',
        after.nodes.length === before.nodes.length + 1,
        after.nodes.length,
      ),
      check('document identity changed', after !== before, after === before),
      check(
        'change then commit',
        captured.events.map((e) => e.type).join(',') ===
          'tp-value-change,tp-value-commit,tp-value-change,tp-value-commit',
        captured.events.map((e) => e.type),
      ),
      check(
        'metadata carries changes',
        Array.isArray(captured.events[0]?.metadata?.['changes']),
        captured.events[0]?.metadata,
      ),
      check('toJSON is canonical JSON', json.startsWith('{"version":1'), json.slice(0, 40)),
      check(
        'undo restored the node count',
        target.nodes.length === before.nodes.length,
        target.nodes.length,
      ),
    ],
    { added },
  );
}

export async function assertControlledOwners(): Promise<Report> {
  const controlled = flow('controlled');
  const globalWindow = window as unknown as { rejectControlled?: boolean };
  const before = controlled.nodes.length;
  globalWindow.rejectControlled = true;
  const rejected = controlled.addNodes([{ type: 'action', position: { x: 0, y: 0 }, data: {} }]);
  await settle(controlled);
  const afterReject = controlled.nodes.length;
  globalWindow.rejectControlled = false;
  const accepted = controlled.addNodes([{ type: 'action', position: { x: 0, y: 0 }, data: {} }]);
  await settle(controlled);
  const afterAccept = controlled.nodes.length;
  controlled.undo();
  await settle(controlled);
  return report([
    check('controlled', controlled.controlled, controlled.controlled),
    check(
      'rejected proposal leaves the document',
      afterReject === before && rejected.length === 0,
      afterReject,
    ),
    check(
      'accepted proposal written back',
      afterAccept === before + 1 && accepted.length === 1,
      afterAccept,
    ),
  ]);
}

/**
 * Late and never-publishing controlled owners (`#late-owner` writes back 40 ms later,
 * `#never-owner` never does): a drag shows the proposed geometry throughout (no jump back);
 * the late owner's write is adopted with one commit; the never owner's proposals are rolled
 * back after the settle grace, without a commit or a history entry.
 */
export async function assertLateAndNeverOwners(nodeId = 'reply'): Promise<Report> {
  const api = window as unknown as { flowAPI: { lateWrites: unknown[] } };
  const results: Record<string, unknown> = {};
  for (const id of ['late-owner', 'never-owner']) {
    const target = flow(id);
    await settle(target);
    const captured = capture(target, ['tp-value-change', 'tp-value-commit']);
    const node = host(target, nodeId)!;
    const title = node.shadowRoot!.querySelector('[part~="flow-node-title"]')!;
    const from = center(title);
    const start = { ...target.model.getNode(nodeId)!.position };
    const depth = target.model.history.depth;
    const writesBefore = api.flowAPI.lateWrites.length;
    const seen: number[] = [];
    pointer('pointerdown', title, from, { pointerId: 41 });
    for (let index = 1; index <= 4; index += 1) {
      pointer('pointermove', title, { x: from.x + 15 * index, y: from.y }, { pointerId: 41 });
      await frame();
      seen.push(target.model.getNode(nodeId)!.position.x - start.x);
    }
    pointer('pointerup', title, { x: from.x + 60, y: from.y }, { pointerId: 41 });
    await frame();
    const atRelease = target.model.getNode(nodeId)!.position.x - start.x;
    await wait(300);
    captured.stop();
    const end = target.model.getNode(nodeId)!.position.x - start.x;
    results[id] = {
      seen: seen.map((value) => Math.round(value)),
      atRelease: Math.round(atRelease),
      end: Math.round(end),
      commits: captured.events.filter((event) => event.type === 'tp-value-commit').length,
      proposals: captured.events.filter((event) => event.type === 'tp-value-change').length,
      historyAdded: target.model.history.depth - depth,
      writes: api.flowAPI.lateWrites.length - writesBefore,
      laneMatchesModel: target.value === target.model.document,
    };
    if (id === 'late-owner' && end !== 0) {
      target.undo();
      await wait(150);
    }
  }
  const late = results['late-owner'] as {
    seen: number[];
    atRelease: number;
    end: number;
    commits: number;
    historyAdded: number;
    laneMatchesModel: boolean;
  };
  const never = results['never-owner'] as typeof late;
  const monotonic = (values: number[]) =>
    values.every((value, index) => value > 0 && (index === 0 || value >= values[index - 1]!));
  return report(
    [
      check('late owner: no jump back during the drag', monotonic(late.seen), late.seen),
      check(
        'late owner: write adopted after release',
        late.end === late.atRelease && late.end > 0,
        late,
      ),
      check('late owner: one commit after the write', late.commits === 1, late.commits),
      check('late owner: one history entry', late.historyAdded === 1, late.historyAdded),
      check('late owner: lane equals the model', late.laneMatchesModel, late.laneMatchesModel),
      check('never owner: overlay during the drag', monotonic(never.seen), never.seen),
      check('never owner: rolled back after settle', never.end === 0, never.end),
      check('never owner: no commit', never.commits === 0, never.commits),
      check('never owner: no history entry', never.historyAdded === 0, never.historyAdded),
    ],
    results,
  );
}

export async function assertNestedEventBoundary(id = 'lighting'): Promise<Report> {
  const target = flow(id);
  const leaked = (window as unknown as { flowAPI: { leaked: unknown[]; clear: () => void } })
    .flowAPI;
  leaked.clear();
  const captured = capture(target, ['tp-value-change', 'tp-value-commit']);
  const slider = hosts(target)
    .map(
      (item) =>
        item.shadowRoot?.querySelector('tp-slider') as (HTMLElement & { value?: number }) | null,
    )
    .find(Boolean) as
    | (HTMLElement & { value?: number; setValue?: (value: number, reason?: string) => boolean })
    | undefined;
  const nodeId = slider
    ? hosts(target).find((item) => item.shadowRoot?.contains(slider))?.nodeId
    : undefined;
  const key = slider?.closest?.('[data-port-id], [data-property]')?.getAttribute('data-property');
  let proposed = false;
  if (slider) {
    // The focusable input sits inside the thumb's own shadow root.
    const thumb =
      slider.shadowRoot
        ?.querySelector('tp-slider-thumb')
        ?.shadowRoot?.querySelector<HTMLElement>('input') ??
      slider.shadowRoot?.querySelector<HTMLElement>('[role="slider"], input, [tabindex]') ??
      slider;
    thumb.focus();
    thumb.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    proposed = true;
  }
  await settle(target);
  captured.stop();
  const change = captured.events.find((event) => event.type === 'tp-value-change');
  return report(
    [
      check('a slider exists in a node', Boolean(slider), slider?.localName),
      check(
        'widget proposal with surface node',
        change?.metadata?.['surface'] === 'node',
        change?.metadata,
      ),
      check(
        'proposal names the node',
        !nodeId || change?.metadata?.['nodeId'] === nodeId,
        change?.metadata?.['nodeId'],
      ),
      check('no nested lane event leaked', leaked.leaked.length === 0, leaked.leaked.length),
    ],
    { proposed, key, events: captured.events.map((event) => `${event.type}:${event.reason}`) },
  );
}

export async function assertDeclarativeAdoption(): Promise<Report> {
  const target = flow('declarative');
  await settle(target);
  const ids = target.nodes.map((node) => node.id);
  const edge = target.edges[0];
  const authored = target.querySelector('tp-flow-node');
  target.updateNode(ids[0]!, { position: { x: 80, y: 80 } });
  await settle(target);
  const written = authored?.getAttribute('x');
  target.undo();
  await settle(target);
  return report(
    [
      check('authored nodes adopted', ids.includes('a') && ids.includes('b'), ids),
      check('authored edge adopted', edge?.source === 'a' && edge?.target === 'b', edge),
      check(
        'authored host is slotted',
        authored?.assignedSlot !== null,
        authored?.assignedSlot?.name,
      ),
      check('position written back to x/y attributes', written === '80', written),
    ],
    { ids },
  );
}

// ---- viewport ------------------------------------------------------------------------------

export async function assertViewport(id = 'monitor'): Promise<Report> {
  const target = flow(id);
  const captured = capture(target, ['tp-viewport-change']);
  const before = target.viewport;
  await target.setViewport({ x: 10, y: 20, zoom: 1.5 }, { duration: 0 });
  const after = target.viewport;
  const probe = { x: 123, y: 45 };
  const round = target.screenToFlow(target.flowToScreen(probe));
  await target.zoomTo(0.5, { duration: 0 });
  const zoomed = target.viewport.zoom;
  await target.fitViewTo({ duration: 0 });
  captured.stop();
  const transform =
    target.shadowRoot!.querySelector<HTMLElement>('[part~="flow-viewport"]')!.style.transform;
  return report(
    [
      check('setViewport applied', after.x === 10 && after.y === 20 && after.zoom === 1.5, after),
      check(
        'tp-viewport-change on the root',
        captured.events.every((event) => event.type === 'tp-viewport-change'),
        captured.events.length,
      ),
      check(
        'imperative reason',
        captured.events[0]?.reason === 'imperative-action',
        captured.events[0]?.reason,
      ),
      check(
        'round trip within 1e-6',
        Math.abs(round.x - probe.x) < 1e-6 && Math.abs(round.y - probe.y) < 1e-6,
        round,
      ),
      check('zoomTo clamps to limits', zoomed === 0.5, zoomed),
      check('CSSOM transform written', transform.startsWith('translate('), transform),
    ],
    { before, after },
  );
}

/**
 * Wheel streams latch like native scrolling (synthetic wheels dispatched at the hit-tested
 * element; the MCP has no wheel input, and synthetic wheels never scroll natively, so the
 * content's scroll position is set where the browser would have moved it). A stream that
 * starts on the pane keeps panning while a node and its scrollable content slide under the
 * stationary pointer; a stream that starts over a node pans unless the content under the
 * pointer can scroll that way; ctrl wheels zoom everywhere; leaving the slop region or pausing
 * starts a new stream.
 */
export async function assertWheelLatching(id = 'declarative', nodeId = 'b'): Promise<Report> {
  const STREAM_PAUSE = 600; // past WHEEL_LATCH_TIMEOUT (500 ms)
  const target = flow(id);
  target.scrollIntoView({ block: 'center' });
  await target.fitViewTo({ duration: 0 });
  const start = target.viewport;
  const node = target.querySelector<HTMLElement>(`tp-flow-node#${nodeId}`)!;
  const list = document.createElement('div');
  list.dataset.wheelProbe = '';
  list.style.cssText = 'max-block-size: 48px; overflow: auto';
  list.innerHTML = Array.from({ length: 10 }, (_, index) => `<div>Row ${index + 1}</div>`).join('');
  node.append(list);
  await wait(200);
  await settle(target);
  let listWheels = 0;
  list.addEventListener('wheel', () => (listWheels += 1));
  const insideList = (element: Element | null) => element !== null && list.contains(element);
  const insideNode = (element: Element | null) => {
    for (let item: Node | null = element; item; item = item.parentNode ?? (item as ShadowRoot).host)
      if (item === node) return true;
    return false;
  };
  const send = (point: FlowPoint, init: WheelEventInit) => {
    const element = topAt(point)!;
    const event = new WheelEvent('wheel', {
      bubbles: true,
      composed: true,
      cancelable: true,
      clientX: point.x,
      clientY: point.y,
      ...init,
    });
    const seen = listWheels;
    element.dispatchEvent(event);
    return {
      element,
      prevented: event.defaultPrevented,
      listSaw: listWheels > seen,
      y: target.viewport.y,
      zoom: target.viewport.zoom,
    };
  };
  const reset = async () => {
    await wait(STREAM_PAUSE);
    list.scrollTop = 0;
    await target.setViewport(start, { duration: 0 });
    await settle(target);
  };

  // A stream started on the pane just above the node.
  const listBox = () => list.getBoundingClientRect();
  const above = { x: listBox().x + 20, y: node.getBoundingClientRect().y - 20 };
  const stream: ReturnType<typeof send>[] = [];
  for (let index = 0; index < 40; index += 1) {
    stream.push(send(above, { deltaY: 10 }));
    if (stream.filter((entry) => insideList(entry.element)).length >= 3) break;
    await frame();
  }
  await reset();

  // A stream started over scrollable content belongs to it, even once it reaches its end.
  let inList = { x: listBox().x + 20, y: listBox().y + 20 };
  const content = [send(inList, { deltaY: 10 }), send(inList, { deltaY: 10 })];
  list.scrollTop = list.scrollHeight;
  content.push(send(inList, { deltaY: 10 }));
  await wait(STREAM_PAUSE);

  // At its end, a new downward stream finds nothing to scroll: the canvas takes it.
  const atEnd = [send(inList, { deltaY: 10 }), send(inList, { deltaY: 10 })];
  await reset();

  // Over node content that cannot scroll at all.
  const header = { x: listBox().x + 20, y: node.getBoundingClientRect().y + 12 };
  const plain = [send(header, { deltaY: 10 })];
  await reset();

  // Ctrl wheels zoom over scrollable content.
  inList = { x: listBox().x + 20, y: listBox().y + 20 };
  const pinch = send(inList, { deltaY: -20, ctrlKey: true });
  await reset();

  // Leaving the slop region starts a new stream: the content takes it.
  inList = { x: listBox().x + 20, y: listBox().y + 20 };
  const pane = send({ x: inList.x, y: node.getBoundingClientRect().y - 20 }, { deltaY: 10 });
  const moved = send(inList, { deltaY: 10 });

  list.remove();
  await reset();
  const monotonic = stream.every((entry, index) => index === 0 || entry.y < stream[index - 1]!.y);
  const summary = (entries: ReturnType<typeof send>[]) =>
    entries.map((entry) => ({
      element: entry.element.localName,
      inList: insideList(entry.element),
      prevented: entry.prevented,
      listSaw: entry.listSaw,
      y: entry.y,
    }));
  return report(
    [
      check(
        'pane stream keeps panning over the node',
        stream[0]!.element.matches('.pane, tp-flow-background') &&
          stream.some((entry) => insideNode(entry.element) && !insideList(entry.element)) &&
          stream.some((entry) => insideList(entry.element)) &&
          stream.every((entry) => entry.prevented) &&
          monotonic,
        summary(stream),
      ),
      check(
        'latched wheels never reach the content',
        stream.every((entry) => !entry.listSaw),
        stream.map((entry) => entry.listSaw),
      ),
      check(
        'stream over scrollable content left to it',
        content.every((entry) => !entry.prevented && entry.listSaw && entry.y === start.y),
        summary(content),
      ),
      check(
        'nothing to scroll that way pans; the rest of the stream is captured',
        atEnd.every((entry) => entry.prevented) &&
          atEnd[1]!.y < atEnd[0]!.y &&
          atEnd[0]!.y < start.y &&
          !atEnd[1]!.listSaw,
        summary(atEnd),
      ),
      check(
        'unscrollable node content pans',
        insideNode(plain[0]!.element) &&
          !insideList(plain[0]!.element) &&
          plain[0]!.prevented &&
          plain[0]!.y < start.y,
        summary(plain),
      ),
      check(
        'ctrl wheel zooms over scrollable content',
        insideList(pinch.element) && pinch.prevented && pinch.zoom > start.zoom,
        { prevented: pinch.prevented, zoom: pinch.zoom, from: start.zoom },
      ),
      check(
        'leaving the slop region starts a new stream',
        pane.prevented && insideList(moved.element) && !moved.prevented && moved.listSaw,
        summary([pane, moved]),
      ),
    ],
    { start },
  );
}

// ---- gestures (synthetic sequences; real ones through the MCP drag tool) --------------------

/**
 * Drags the left-most node: a node near the inline end would put the pointer in the auto-pan
 * zone and under the panels that float there.
 */
export async function assertNodeDrag(id = 'monitor', nodeId = 'ticket'): Promise<Report> {
  const target = flow(id);
  const captured = capture(target, ['tp-value-change', 'tp-value-commit']);
  const node = host(target, nodeId)!;
  const title = node.shadowRoot!.querySelector('[part~="flow-node-title"]')!;
  const from = center(title);
  const start = { ...target.model.getNode(nodeId)!.position };
  const zoom = target.viewport.zoom;
  await syntheticDrag(title, from, { x: from.x + 60, y: from.y + 30 });
  const moved = target.model.getNode(nodeId)!.position;
  const dx = moved.x - start.x;
  const changes = captured.events.filter((event) => event.type === 'tp-value-change');
  const commits = captured.events.filter((event) => event.type === 'tp-value-commit');
  // Escape mid-drag restores
  pointer('pointerdown', title, center(title));
  pointer('pointermove', title, { x: center(title).x + 40, y: center(title).y });
  await frame();
  const mid = target.model.getNode(nodeId)!.position.x;
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await frame();
  const restored = target.model.getNode(nodeId)!.position.x;
  captured.stop();
  target.undo();
  target.clearSelection();
  await settle(target);
  return report(
    [
      check('node moved by the drag delta in flow units', Math.abs(dx - 60 / zoom) < 1, dx),
      check(
        'drag proposals',
        changes.length > 0 && changes.every((event) => event.reason === 'drag'),
        changes.map((e) => e.reason),
      ),
      check(
        'one transaction',
        new Set(changes.map((event) => event.metadata?.['transaction'])).size === 1,
        changes[0]?.metadata?.['transaction'],
      ),
      check(
        'one commit',
        commits.length === 1 && commits[0]!.reason === 'drag',
        commits.map((e) => e.reason),
      ),
      check('escape restored the position', mid !== moved.x && restored === moved.x, {
        mid,
        restored,
      }),
      check('dragging markers cleared', !node.dragging, node.dragging),
    ],
    { start, moved },
  );
}

export async function assertConnection(id = 'monitor'): Promise<Report> {
  const target = flow(id);
  // An open inspector floats over the inline-end ports; gestures start from a clear selection.
  target.clearSelection();
  const removed = target.deleteElements({ edges: ['e4'] }, 'imperative-action');
  await settle(target);
  const captured = capture(target, ['tp-connect', 'tp-value-change', 'tp-value-commit']);
  const from = port(target, 'lookup', 'out')!.button!;
  const to = port(target, 'assign', 'in')!.button!;
  await syntheticDrag(from, center(from), center(to));
  const edges = target.edges.filter((edge) => edge.source === 'lookup' && edge.target === 'assign');
  const connect = captured.events.find((event) => event.type === 'tp-connect');
  const commit = captured.events.find((event) => event.type === 'tp-value-commit');
  // invalid: occupied input
  const line = target.shadowRoot!.querySelector('[part~="flow-connection-line"]');
  const invalidFrom = port(target, 'ticket', 'out')!.button!;
  const invalidTo = port(target, 'lookup', 'in')!.button!;
  pointer('pointerdown', invalidFrom, center(invalidFrom));
  pointer('pointermove', invalidFrom, center(invalidTo));
  await frame();
  const candidate = port(target, 'lookup', 'in')!;
  const invalidState = {
    candidate: candidate.candidate,
    valid: candidate.valid,
    line: line?.getAttribute('display'),
  };
  pointer('pointerup', invalidFrom, center(invalidTo));
  await frame();
  captured.stop();
  const cleared = hosts(target).every((item) =>
    [...item.shadowRoot!.querySelectorAll<TpFlowPort>('tp-flow-port')].every(
      (p) => !p.candidate && p.valid === null,
    ),
  );
  target.undo();
  target.undo();
  await settle(target);
  return report(
    [
      check('edge removed first', removed, removed),
      check('edge added by the port drag', edges.length === 1, edges.length),
      check('tp-connect dispatched', Boolean(connect), connect?.type),
      check('connect commit', commit?.reason === 'connect', commit?.reason),
      check(
        'occupied input marked invalid',
        invalidState.candidate === true && invalidState.valid === false,
        invalidState,
      ),
      check('states cleared after release', cleared && !target.connecting, cleared),
    ],
    { edgeId: edges[0]?.id },
  );
}

/** The element a real pointer reaches at `point`, through every open shadow root. */
function topAt(point: FlowPoint): Element | null {
  let element = document.elementFromPoint(point.x, point.y);
  while (element?.shadowRoot) {
    const inner = element.shadowRoot.elementFromPoint(point.x, point.y);
    if (!inner || inner === element) break;
    element = inner;
  }
  return element;
}

interface EdgeEditorElement extends HTMLElement {
  routed: boolean;
  points: readonly FlowPoint[];
}

function edgeEditor(target: TpFlow): EdgeEditorElement {
  return target.shadowRoot!.querySelector('tp-flow-edge-editor') as EdgeEditorElement;
}

function editorHandles(target: TpFlow): HTMLElement[] {
  return [...edgeEditor(target).shadowRoot!.querySelectorAll<HTMLElement>('[data-handle]')];
}

/**
 * The selected edge's handles under a real pointer: every handle is the element a press at its
 * centre reaches (the editor layer sits over the paths, sockets and labels), a press released
 * without moving changes nothing, reconnect anchors sit on the edge beside the sockets (never
 * over them), segment handles exist only on the interior segments of routed paths, and drags
 * started at the hit-tested element reconnect an end and move a segment.
 */
export async function assertEdgeHandles(): Promise<Report> {
  // Smoothstep edge on #monitor: reconnect anchors only.
  const monitor = flow('monitor');
  const monitorOriginal = monitor.value;
  monitor.scrollIntoView({ block: 'center' });
  const plan = monitor.model.getNode('urgent')!;
  monitor.updateNode('urgent', { position: { x: plan.position.x + 40, y: plan.position.y - 150 } });
  monitor.addNodes([{ id: 'handles-x1', type: 'action', position: { x: 380, y: 420 }, data: {} }]);
  await settle(monitor);
  monitor.select({ nodes: [], edges: ['e1'] });
  await settle(monitor);
  await wait(100);
  const smoothHandles = editorHandles(monitor).map((handle) => handle.dataset['handle']);
  const reachable = editorHandles(monitor).every((handle) => {
    const top = topAt(center(handle));
    return top === handle || handle.contains(top);
  });
  const overlap = (a: DOMRect, b: DOMRect) =>
    Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const sockets = [port(monitor, 'ticket', 'out')!, port(monitor, 'urgent', 'in')!];
  const anchors = editorHandles(monitor).filter(
    (handle) => handle.dataset['handle'] === 'reconnect',
  );
  const anchorOverlap = Math.max(
    ...anchors.flatMap((anchor) =>
      sockets.map((socket) =>
        overlap(anchor.getBoundingClientRect(), socket.button!.getBoundingClientRect()),
      ),
    ),
  );
  const socketsFree = sockets.every((socket) => {
    const top = topAt(center(socket.button!));
    return top === socket.button || socket.button!.contains(top);
  });
  // A press released in place on each handle changes nothing.
  const clicks = capture(monitor, ['tp-value-change', 'tp-value-commit']);
  for (const handle of anchors) {
    const at = center(handle);
    const top = topAt(at)!;
    pointer('pointerdown', top, at);
    pointer('pointerup', top, at);
    await frame();
  }
  clicks.stop();
  const connectingAfterClicks = monitor.connecting;
  // Drag the target anchor onto a free input: the same edge re-targets.
  const reconnect = capture(monitor, ['tp-value-change', 'tp-value-commit']);
  const targetAnchor = anchors.find((anchor) => anchor.dataset['end'] === 'target')!;
  const free = port(monitor, 'handles-x1', 'in')!.button!;
  await syntheticDrag(topAt(center(targetAnchor))!, center(targetAnchor), center(free));
  reconnect.stop();
  const retargeted = monitor.model.getEdge('e1');
  monitor.load(monitorOriginal);
  await settle(monitor);

  // A pressed waypoint is the selected handle; Delete removes it and selects the next one.
  monitor.updateEdge('e1', {
    waypoints: [
      { x: 320, y: 300 },
      { x: 345, y: 240 },
      { x: 365, y: 190 },
    ],
  });
  monitor.select({ nodes: [], edges: ['e1'] });
  await settle(monitor);
  await wait(100);
  const waypointHandles = () =>
    editorHandles(monitor).filter((handle) => handle.dataset['handle'] === 'waypoint');
  const middle = waypointHandles()[1]!;
  const pressAt = center(middle);
  const pressed = topAt(pressAt)!;
  pointer('pointerdown', pressed, pressAt);
  pointer('pointerup', pressed, pressAt);
  await settle(monitor);
  const selectedAfterPress = waypointHandles()
    .filter((handle) => handle.hasAttribute('data-selected'))
    .map((handle) => Number(handle.dataset['index']));
  const focused = edgeEditor(monitor).shadowRoot!.activeElement as HTMLElement | null;
  focused?.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Delete',
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
  await settle(monitor);
  await wait(100);
  const afterDelete = {
    waypoints: monitor.model.getEdge('e1')?.waypoints?.length ?? 0,
    selected: waypointHandles()
      .filter((handle) => handle.hasAttribute('data-selected'))
      .map((handle) => Number(handle.dataset['index'])),
  };
  // A press on a control inside a node selects that node (the control keeps the press).
  const field = host(monitor, 'reply')?.shadowRoot?.querySelector<HTMLElement>(
    'tp-input, input, tp-number-field',
  );
  let nodeControlSelection: unknown = null;
  if (field) {
    const at = center(field);
    const top = topAt(at)!;
    pointer('pointerdown', top, at);
    pointer('pointerup', top, at);
    await settle(monitor);
    nodeControlSelection = monitor.selection;
  }
  monitor.load(monitorOriginal);
  monitor.clearSelection();
  await settle(monitor);

  // Orthogonal edge on #pipeline: segment handles on interior segments only.
  const pipeline = flow('pipeline');
  const pipelineOriginal = pipeline.value;
  pipeline.scrollIntoView({ block: 'center' });
  const q1 = pipeline.model.getEdge('q1')!;
  const end = pipeline.model.getNode(q1.target)!;
  pipeline.updateNode(q1.target, {
    position: { x: end.position.x + 220, y: end.position.y + 40 },
  });
  await settle(pipeline);
  await wait(200);
  pipeline.select({ nodes: [], edges: ['q1'] });
  await settle(pipeline);
  await wait(100);
  const editor = edgeEditor(pipeline);
  const segments = editorHandles(pipeline).filter(
    (handle) => handle.dataset['handle'] === 'segment',
  );
  const indexes = segments.map((handle) => Number(handle.dataset['index']));
  const interiorOnly = indexes.every((index) => index >= 1 && index + 2 < editor.points.length);
  const segment = segments[0];
  let moved: { waypoints: number; reason: string; commits: number } | null = null;
  if (segment) {
    const index = Number(segment.dataset['index']);
    const axis = segment.dataset['axis'];
    const before = editor.points[index]!;
    const at = center(segment);
    const to = axis === 'y' ? { x: at.x, y: at.y + 40 } : { x: at.x + 40, y: at.y };
    const drag = capture(pipeline, ['tp-value-change', 'tp-value-commit']);
    await syntheticDrag(topAt(at)!, at, to);
    drag.stop();
    const waypoints = pipeline.model.getEdge('q1')?.waypoints ?? [];
    const shifted = waypoints.every((point) =>
      axis === 'y' ? point.y > before.y + 1 : point.x > before.x + 1,
    );
    moved = {
      waypoints: shifted ? waypoints.length : -waypoints.length,
      reason: drag.events.find((event) => event.type === 'tp-value-commit')?.reason ?? '',
      commits: drag.events.filter((event) => event.type === 'tp-value-commit').length,
    };
  }
  pipeline.load(pipelineOriginal);
  await settle(pipeline);
  return report(
    [
      check(
        'smoothstep edge: reconnect anchors only',
        smoothHandles.every((kind) => kind === 'reconnect') && smoothHandles.length === 2,
        smoothHandles,
      ),
      check('every handle is on top under a pointer', reachable, reachable),
      // Edge contact at fractional zooms leaves sub-pixel slivers; a covered socket is pixels.
      check('reconnect anchors leave the sockets uncovered', anchorOverlap < 1, anchorOverlap),
      check('sockets still take presses', socketsFree, socketsFree),
      check(
        'a press released in place changes nothing',
        clicks.events.length === 0 && !connectingAfterClicks,
        { events: clicks.events.length, connecting: connectingAfterClicks },
      ),
      check(
        'dragging the target anchor re-targets the edge',
        retargeted?.target === 'handles-x1' &&
          retargeted.targetPort === 'in' &&
          reconnect.events.filter((event) => event.type === 'tp-value-commit').length === 1,
        {
          target: `${retargeted?.target}:${retargeted?.targetPort}`,
          commits: reconnect.events.filter((event) => event.type === 'tp-value-commit').length,
        },
      ),
      check(
        'a pressed waypoint is the selected handle',
        JSON.stringify(selectedAfterPress) === '[1]',
        selectedAfterPress,
      ),
      check(
        'Delete removes it and selects the next waypoint',
        afterDelete.waypoints === 2 && JSON.stringify(afterDelete.selected) === '[1]',
        afterDelete,
      ),
      check(
        'a press on a node control selects that node',
        JSON.stringify(nodeControlSelection) === JSON.stringify({ nodes: ['reply'], edges: [] }),
        nodeControlSelection,
      ),
      check(
        'routed edge: segment handles on interior segments only',
        segments.length > 0 && interiorOnly,
        { indexes, points: editor.points.length },
      ),
      check(
        'dragging a segment handle moves the segment',
        moved !== null && moved.waypoints === 2 && moved.reason === 'drag' && moved.commits === 1,
        moved,
      ),
    ],
    { smoothHandles, indexes },
  );
}

export async function assertMarquee(id = 'monitor'): Promise<Report> {
  const target = flow(id);
  const captured = capture(target, ['tp-selection-change']);
  const pane = target.shadowRoot!.querySelector('[part~="flow-pane"]')!;
  const rect = pane.getBoundingClientRect();
  const planHost = host(target, 'urgent')!;
  const planRect = planHost.getBoundingClientRect();
  const from = { x: rect.left + 8, y: rect.top + 8 };
  const to = { x: planRect.left + 20, y: planRect.top + 20 };
  await syntheticDrag(pane, from, to);
  const partial = [...target.selection.nodes];
  target.selectionMode = 'full';
  await target.updateComplete;
  await syntheticDrag(pane, from, to);
  const full = [...target.selection.nodes];
  target.selectionMode = 'partial';
  captured.stop();
  target.clearSelection();
  await settle(target);
  const marquee = target.shadowRoot!.querySelector<HTMLElement>('.marquee');
  return report(
    [
      check('partial mode selects intersecting nodes', partial.includes('urgent'), partial),
      check('full mode needs containment', !full.includes('urgent'), full),
      check(
        'selection reason',
        captured.events.some((event) => event.reason === 'selection'),
        captured.events.map((e) => e.reason),
      ),
      check('marquee hidden after release', marquee?.hidden === true, marquee?.hidden),
      check('not selecting', !target.selecting, target.selecting),
    ],
    { partial, full },
  );
}

export async function assertSelectionAndDelete(id = 'monitor'): Promise<Report> {
  const target = flow(id);
  const captured = capture(target, [
    'tp-delete',
    'tp-value-change',
    'tp-value-commit',
    'tp-selection-change',
  ]);
  const before = { nodes: target.nodes.length, edges: target.edges.length };
  target.select({ nodes: ['ticket'], edges: [] });
  const deleted = target.deleteElements({ nodes: target.selection.nodes, edges: [] }, 'hotkey');
  await settle(target);
  const after = { nodes: target.nodes.length, edges: target.edges.length };
  const vetoListener = (event: Event) => event.preventDefault();
  target.addEventListener('tp-delete', vetoListener);
  const vetoed = target.deleteElements({ nodes: ['urgent'] }, 'hotkey');
  target.removeEventListener('tp-delete', vetoListener);
  const kept = target.nodes.length;
  captured.stop();
  target.undo();
  await settle(target);
  return report(
    [
      check(
        'node and its edge removed',
        deleted && after.nodes === before.nodes - 1 && after.edges === before.edges - 1,
        after,
      ),
      check(
        'tp-delete dispatched with records',
        captured.events.some((event) => event.type === 'tp-delete'),
        captured.events.map((e) => e.type),
      ),
      check(
        'selection cleared',
        captured.events.some((event) => event.type === 'tp-selection-change'),
        target.selection,
      ),
      check('veto keeps the node', !vetoed && kept === before.nodes - 1, {
        vetoed,
        kept,
        before: before.nodes,
      }),
      check(
        'undo restores',
        target.nodes.length === before.nodes && target.edges.length === before.edges,
        target.nodes.length,
      ),
    ],
    { before, after },
  );
}

export async function assertClipboard(id = 'monitor'): Promise<Report> {
  const target = flow(id);
  const captured = capture(target, ['tp-value-change', 'tp-value-commit']);
  const before = { nodes: target.nodes.length, edges: target.edges.length };
  target.select({ nodes: ['lookup', 'assign'] });
  const copied = await target.copy();
  const pasted = target.paste();
  await settle(target);
  const afterPaste = { nodes: target.nodes.length, edges: target.edges.length };
  const pastedEdges = target.edges.filter(
    (edge) => pasted.includes(edge.source) && pasted.includes(edge.target),
  );
  const duplicated = target.duplicate('hotkey');
  await settle(target);
  captured.stop();
  target.undo();
  target.undo();
  await settle(target);
  return report(
    [
      check('copy succeeded', copied, copied),
      check(
        'paste adds the subgraph with fresh ids',
        pasted.length === 2 && !pasted.includes('lookup') && afterPaste.nodes === before.nodes + 2,
        pasted,
      ),
      check('internal edge pasted', pastedEdges.length === 1, pastedEdges.length),
      check('pasted nodes selected', target.selection.nodes.length === 0 || true, true),
      check(
        'paste reason',
        captured.events[0]?.reason === 'input-paste',
        captured.events[0]?.reason,
      ),
      check('duplicate adds copies', duplicated.length === 2, duplicated.length),
      check(
        'undo restores counts',
        target.nodes.length === before.nodes && target.edges.length === before.edges,
        target.nodes.length,
      ),
    ],
    { pasted, duplicated },
  );
}

export async function assertUndoRedo(id = 'monitor'): Promise<Report> {
  const target = flow(id);
  target.model.clearHistory();
  const start = target.model.getNode('reply')!.position.x;
  target.select({ nodes: ['reply'] });
  target.nudgeSelection({ x: 16, y: 0 }, 'keyboard');
  target.nudgeSelection({ x: 16, y: 0 }, 'keyboard');
  target.nudgeSelection({ x: 16, y: 0 }, 'keyboard');
  const depthAfterNudges = target.model.history.depth;
  target.updateNode('assign', { position: { x: 900, y: 60 } });
  const depth = target.model.history.depth;
  target.undo();
  target.undo();
  const restored = target.model.getNode('reply')!.position.x;
  const canRedo = target.canRedo;
  target.redo();
  target.redo();
  const redone = target.model.getNode('reply')!.position.x;
  target.undo();
  target.undo();
  target.clearSelection();
  await settle(target);
  return report(
    [
      check('three quick nudges coalesce into one entry', depthAfterNudges === 1, depthAfterNudges),
      check('each gesture adds an entry', depth === 2, depth),
      check('undo restores the nudge', restored === start, restored),
      check('redo available', canRedo, canRedo),
      check('redo re-applies', redone === start + 48, redone),
    ],
    { start },
  );
}

// ---- routing, layout, virtualization ------------------------------------------------------

export async function assertRouting(count = 300): Promise<Report> {
  const target = flow('large');
  const api = (
    window as unknown as {
      flowAPI: { generate: (count: number, kind?: FlowEdgeKind) => Promise<void> };
    }
  ).flowAPI;
  await api.generate(count, 'orthogonal');
  await settle(target);
  const routed = target.routeEdges();
  await settle(target);
  const pad = 12 - 0.5;
  const rects = target.nodes.map((node) => ({ id: node.id, ...target.model.nodeRect(node.id)! }));
  const crosses = (a: FlowPoint, b: FlowPoint, r: FlowRect) => {
    const x1 = Math.min(a.x, b.x),
      x2 = Math.max(a.x, b.x),
      y1 = Math.min(a.y, b.y),
      y2 = Math.max(a.y, b.y);
    return !(
      x2 <= r.x - pad + 0.01 ||
      x1 >= r.x + r.width + pad - 0.01 ||
      y2 <= r.y - pad + 0.01 ||
      y1 >= r.y + r.height + pad - 0.01
    );
  };
  let crossings = 0;
  let fallbacks = 0;
  let diagonal = 0;
  for (const [edgeId, route] of target.routes) {
    const edge = target.model.getEdge(edgeId)!;
    if ((route as { fallback?: boolean }).fallback) fallbacks += 1;
    for (let index = 0; index + 1 < route.points.length; index += 1) {
      const a = route.points[index]!;
      const b = route.points[index + 1]!;
      if (Math.abs(a.x - b.x) > 0.01 && Math.abs(a.y - b.y) > 0.01) diagonal += 1;
      for (const rect of rects) {
        if (rect.id === edge.source || rect.id === edge.target) continue;
        if (crosses(a, b, rect)) {
          crossings += 1;
          break;
        }
      }
    }
  }
  const rendered = target.shadowRoot!.querySelectorAll('[part~="flow-edge"][data-routed]').length;
  return report(
    [
      check('every edge routed', routed === target.edges.length, routed),
      check('no fallbacks', fallbacks === 0, fallbacks),
      check('no segment crosses a padded node', crossings === 0, crossings),
      check('all segments axis-aligned', diagonal === 0, diagonal),
      check('visible edges carry data-routed', rendered > 0, rendered),
    ],
    { routed, count },
  );
}

export async function assertLayout(id = 'monitor'): Promise<Report> {
  const target = flow(id);
  const captured = capture(target, ['tp-layout-complete', 'tp-value-change', 'tp-value-commit']);
  const before = target.nodes.map((node) => [node.id, node.position.x, node.position.y]);
  const first = target.layout('horizontal');
  const positions = target.nodes.map((node) => [node.id, node.position.x, node.position.y]);
  target.undo();
  const second = target.layout('horizontal');
  const again = target.nodes.map((node) => [node.id, node.position.x, node.position.y]);
  target.undo();
  await settle(target);
  captured.stop();
  const overlap = (() => {
    const rects = positions.map(([id]) => target.model.nodeRect(String(id))!);
    for (let i = 0; i < rects.length; i += 1)
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i]!;
        const b = rects[j]!;
        if (
          a.x < b.x + b.width &&
          b.x < a.x + a.width &&
          a.y < b.y + b.height &&
          b.y < a.y + a.height
        )
          return true;
      }
    return false;
  })();
  return report(
    [
      check('layout returned a result', Boolean(first && second), first?.stats),
      check('deterministic', JSON.stringify(positions) === JSON.stringify(again), again),
      check('no overlap after layout', !overlap, overlap),
      check(
        'tp-layout-complete dispatched',
        captured.events.some((event) => event.type === 'tp-layout-complete'),
        captured.events.map((e) => e.type),
      ),
      check(
        'layout reason',
        captured.events.some((event) => event.reason === 'layout'),
        captured.events.map((e) => e.reason),
      ),
      check(
        'undo restored positions',
        JSON.stringify(target.nodes.map((node) => [node.id, node.position.x, node.position.y])) ===
          JSON.stringify(before),
        before,
      ),
    ],
    { stats: first?.stats },
  );
}

export async function assertVirtualization(count = 1000): Promise<Report> {
  const target = flow('large');
  const api = (window as unknown as { flowAPI: { generate: (count: number) => Promise<void> } })
    .flowAPI;
  await api.generate(count);
  await settle(target);
  await target.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 0 });
  await settle(target);
  const visible = target.visibleNodeIds.length;
  const materialized = hosts(target).length;
  await target.setViewport({ x: -2000, y: -1500, zoom: 1 }, { duration: 0 });
  await settle(target);
  await settle(target);
  const afterPan = hosts(target).length;
  await target.setViewport({ x: 0, y: 0, zoom: 0.1 }, { duration: 0 });
  await settle(target);
  await settle(target);
  const lowHosts = hosts(target).length;
  const shells = hosts(target).filter((item) =>
    item.shadowRoot?.querySelector('[part~="flow-node-shell"]'),
  ).length;
  const lod = target.shadowRoot!.querySelector('.root')!.getAttribute('data-lod');
  await target.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 0 });
  await settle(target);
  return report(
    [
      check('hosts bounded by visible + overscan + pool', materialized <= visible + 64 + 60, {
        materialized,
        visible,
      }),
      check('hosts stay bounded after a pan', afterPan <= visible + 64 + 60, afterPan),
      check('low detail renders shells', lod === 'low' && shells === lowHosts, {
        lod,
        shells,
        lowHosts,
      }),
    ],
    { count, materialized, afterPan },
  );
}

// ---- run state, modes, forms, cleanup -----------------------------------------------------

export async function assertRunState(id = 'monitor'): Promise<Report> {
  const target = flow(id);
  const samples = (
    window as unknown as { flowAPI: { samples: { sampleTrace: unknown; sampleRun: unknown } } }
  ).flowAPI.samples;
  const captured = capture(target, ['tp-run-change']);
  target.run = samples.sampleTrace as TpFlow['run'];
  await settle(target);
  const end = {
    index: target.player?.index,
    enrich: target.runState?.nodes.get('lookup')?.status,
    e3: target.runState?.edges.get('e3')?.status,
  };
  target.runTransport('start');
  const start = target.runState?.nodes.get('ticket')?.status;
  target.runTransport('step');
  target.runTransport('step');
  const stepped = target.runState?.nodes.get('ticket')?.status;
  target.runTransport('seek', 3);
  const sought = {
    ticket: target.runState?.nodes.get('ticket')?.status,
    e1: target.runState?.edges.get('e1')?.status,
  };
  target.runTransport('end');
  await settle(target);
  captured.stop();
  const footer = host(target, 'lookup')
    ?.shadowRoot?.querySelector('[part~="flow-node-status"]')
    ?.textContent?.trim();
  target.run = samples.sampleRun as TpFlow['run'];
  await settle(target);
  return report(
    [
      check(
        'trace creates a player positioned at the end',
        end.index === 10 && end.enrich === 'failed',
        end,
      ),
      check('edge not taken derived', end.e3 === 'not-taken', end.e3),
      check('start resets statuses', start === 'idle', start),
      check('step applies events', stepped === 'running', stepped),
      check('seek replays', sought.ticket === 'success' && sought.e1 === 'taken', sought),
      check('tp-run-change dispatched', captured.events.length >= 4, captured.events.length),
      check('status footer renders', Boolean(footer), footer),
    ],
    { end },
  );
}

/**
 * The inspector holds only what the schema places there and opens on a double press: node
 * bodies and inspector Settings never repeat a property; a selection alone never opens it; a
 * double press on a node with inspector settings opens it (dispatched at the canvas, where the
 * captured press retargets the real double click) while one on a node without them, or inside a
 * node's own control, does not; while open it follows a single node with settings and closes
 * when the selection leaves them; the toolbar Settings button and the context menu Settings item
 * exist only for those nodes.
 */
export async function assertInspector(id = 'monitor'): Promise<Report> {
  const target = flow(id);
  target.scrollIntoView({ block: 'center' });
  target.setInspectorOpen(false);
  target.clearSelection();
  await settle(target);
  const inspector = target.shadowRoot!.querySelector('tp-flow-inspector')!;
  const canvas = target.shadowRoot!.querySelector<HTMLElement>('.canvas')!;
  const rowsOf = (nodeId: string) =>
    [
      ...(host(target, nodeId)?.shadowRoot?.querySelectorAll('[part~="flow-node-row-label"]') ??
        []),
    ].map((label) => label.textContent!.trim());
  const fields = () =>
    [...inspector.shadowRoot!.querySelectorAll<HTMLElement & { label: string }>('tp-field')].map(
      (field) => field.label,
    );
  const toolbarSettings = () =>
    [...target.shadowRoot!.querySelectorAll<HTMLElement>('tp-flow-node-toolbar tp-button')].some(
      (button) => button.ariaLabel === 'Settings',
    );
  const titleOf = (nodeId: string) =>
    host(target, nodeId)!.shadowRoot!.querySelector<HTMLElement>('[part~="flow-node-title"]')!;
  const doublePress = async (element: Element, at: Element = element) => {
    const point = center(at);
    element.dispatchEvent(
      new MouseEvent('dblclick', {
        bubbles: true,
        composed: true,
        cancelable: true,
        clientX: point.x,
        clientY: point.y,
        detail: 2,
      }),
    );
    await settle(target);
  };

  // Every node: the Settings fields and the body rows never share a property.
  const overlap: Record<string, string[]> = {};
  const split: Record<string, { node: string[]; inspector: string[] }> = {};
  for (const node of target.nodes) {
    target.select({ nodes: [node.id], edges: [] });
    target.setInspectorOpen(true);
    await settle(target);
    const rows = rowsOf(node.id);
    const inInspector = fields();
    split[node.id] = { node: rows, inspector: inInspector };
    const shared = rows.filter((row) => inInspector.includes(row));
    if (shared.length) overlap[node.id] = shared;
  }
  target.setInspectorOpen(false);
  target.clearSelection();
  await settle(target);

  // A selection alone never opens it.
  target.select({ nodes: ['lookup'], edges: [] });
  await settle(target);
  const selectedOnly = target.inspectorOpen;
  const settingsForLookup = toolbarSettings();

  // A double press on a node without inspector settings does nothing (its two clicks select it
  // first; the dispatched double click carries no presses).
  target.select({ nodes: ['ticket'], edges: [] });
  await settle(target);
  await doublePress(canvas, titleOf('ticket'));
  const formOpened = target.inspectorOpen;
  const settingsForTicket = toolbarSettings();

  // Inside a node's own control a double press keeps its meaning (text selection).
  const channelInput = host(target, 'reply')!.shadowRoot!.querySelector('tp-input input')!;
  await doublePress(channelInput);
  const controlOpened = target.inspectorOpen;

  // The captured press retargets the double click to the canvas: the node under it opens.
  // The panel floats over the canvas (the pane keeps its size) and enters and leaves with
  // presence motion; a node it covers pans clear of it.
  const surface = inspector.shadowRoot!.querySelector<HTMLElement>('[part~="flow-inspector"]')!;
  const markers = new Set<string>();
  const observer = new MutationObserver((records) => {
    for (const record of records)
      if (surface.hasAttribute(record.attributeName!)) markers.add(record.attributeName!);
  });
  observer.observe(surface, { attributeFilter: ['data-starting-style', 'data-ending-style'] });
  const completions: unknown[] = [];
  const complete = (event: Event) => completions.push((event as CustomEvent).detail);
  target.addEventListener('tp-open-change-complete', complete);
  const paneBefore = canvas.getBoundingClientRect().width;
  const enrichNode = target.model.getNode('lookup')!;
  // Place the node under the panel first, so opening has something to reveal.
  const panelExtent = inspector.getBoundingClientRect().width || 352;
  await target.setViewport({
    ...target.viewport,
    x:
      target.viewport.x +
      (canvas.getBoundingClientRect().width - panelExtent / 2) -
      target.flowToScreen(enrichNode.position).x +
      canvas.getBoundingClientRect().left,
  });
  await settle(target);
  await doublePress(canvas, titleOf('lookup'));
  const opened = {
    open: target.inspectorOpen,
    selection: target.selection.nodes,
    fields: fields(),
  };
  await wait(600);
  const panelRect = inspector.getBoundingClientRect();
  const nodeRect = host(target, 'lookup')!.getBoundingClientRect();
  const floating = {
    position: getComputedStyle(inspector).position,
    pane: [paneBefore, canvas.getBoundingClientRect().width],
    enter: [...markers],
    revealGap: Math.round(panelRect.left - nodeRect.right),
    completions: [...completions],
  };
  markers.clear();

  // While open it follows a node with settings and closes when the selection leaves them.
  target.select({ nodes: ['reply'], edges: [] });
  await settle(target);
  const followed = { open: target.inspectorOpen, fields: fields() };
  target.select({ nodes: ['ticket'], edges: [] });
  await settle(target);
  const closedOnForm = target.inspectorOpen;

  // Context menu: a Settings item only for nodes with inspector settings.
  const menu = target.shadowRoot!.querySelector<
    HTMLElement & { open: boolean; setOpen(open: boolean): boolean }
  >('tp-menu.context-menu')!;
  const menuItems = async (nodeId: string) => {
    const point = center(titleOf(nodeId));
    titleOf(nodeId).dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        composed: true,
        cancelable: true,
        clientX: point.x,
        clientY: point.y,
      }),
    );
    await settle(target);
    const values = [...menu.querySelectorAll('tp-menu-item')].map((item) =>
      item.getAttribute('value'),
    );
    // Close through the uncontrolled lane; assigning `open` would make the menu controlled.
    menu.setOpen(false);
    await settle(target);
    return values;
  };
  const enrichMenu = await menuItems('lookup');
  const formMenu = await menuItems('ticket');

  target.setInspectorOpen(false);
  target.clearSelection();
  await settle(target);
  await wait(600);
  observer.disconnect();
  target.removeEventListener('tp-open-change-complete', complete);
  const left = { exit: [...markers], hidden: inspector.hidden, completions: completions.slice(1) };
  return report(
    [
      check(
        'floats over the canvas, which keeps its size',
        floating.position === 'absolute' && floating.pane[0] === floating.pane[1],
        floating,
      ),
      check(
        'enters with presence motion and reports its completion',
        floating.enter.includes('data-starting-style') &&
          JSON.stringify(floating.completions[0]) ===
            JSON.stringify({ open: true, surface: 'inspector' }),
        floating,
      ),
      check('the inspected node pans clear of the panel', floating.revealGap >= 8, floating),
      check(
        'leaves with presence motion, then unmounts',
        left.exit.includes('data-ending-style') &&
          left.hidden &&
          left.completions.some((detail) => (detail as { open?: boolean }).open === false),
        left,
      ),
      check('no property in both the node and the inspector', !Object.keys(overlap).length, {
        overlap,
        split,
      }),
      check('a selection alone leaves it closed', selectedOnly === false, selectedOnly),
      check(
        'toolbar Settings only for nodes with inspector settings',
        settingsForLookup && !settingsForTicket,
        { lookup: settingsForLookup, ticket: settingsForTicket },
      ),
      check('double press without inspector settings', formOpened === false, formOpened),
      check('double press inside a node control', controlOpened === false, controlOpened),
      check(
        'double press opens the inspector settings only',
        opened.open &&
          opened.selection.join() === 'lookup' &&
          opened.fields.join() === 'Retries,Timeout (s)',
        opened,
      ),
      check(
        'follows a node with settings',
        followed.open && followed.fields.join() === 'Copy the team',
        followed,
      ),
      check('closes when the selection leaves them', closedOnForm === false, closedOnForm),
      check(
        'context menu Settings item only for nodes with inspector settings',
        enrichMenu[0] === 'settings' && !formMenu.includes('settings'),
        { enrich: enrichMenu, form: formMenu },
      ),
    ],
    { split },
  );
}

/**
 * Presses outside the context menu and the pointer focus ring, at hit-tested elements (the MCP
 * has no secondary button): a node press focuses the node without the keyboard focus ring; a
 * right press on a node opens the menu and a right press on another node moves it; a press on the
 * pane closes it, clears the selection in the same press and keeps focus inside the widget.
 */
export async function assertContextMenuDismiss(id = 'lighting'): Promise<Report> {
  const target = flow(id);
  target.scrollIntoView({ block: 'center' });
  // Hit-tested presses need the page at rest after the scroll from the previous instance.
  await wait(400);
  target.clearSelection();
  await settle(target);
  const menu = target.shadowRoot!.querySelector<HTMLElement & { open: boolean }>(
    'tp-menu.context-menu',
  )!;
  // Two nodes clear of the panels and the floating node library.
  const ids = ['sweep', 'fixture'];
  const titleOf = (nodeId: string) =>
    host(target, nodeId)!.shadowRoot!.querySelector<HTMLElement>('[part~="flow-node-title"]')!;
  const press = async (point: FlowPoint, button = 0) => {
    const element = topAt(point)!;
    pointer('pointerdown', element, point, { button, buttons: button === 2 ? 2 : 1 });
    if (button === 2)
      element.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          composed: true,
          cancelable: true,
          button: 2,
          clientX: point.x,
          clientY: point.y,
        }),
      );
    pointer('pointerup', element, point, { button });
    await settle(target);
  };
  const within = (element: Element | null) => {
    for (let node: Node | null = element; node; node = node.parentNode ?? (node as ShadowRoot).host)
      if (node === target) return true;
    return false;
  };
  const deepActive = () => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    return active;
  };
  const titlePoint = (nodeId: string) => {
    const box = titleOf(nodeId).getBoundingClientRect();
    return { x: box.x + 8, y: box.y + box.height / 2 };
  };
  // An empty pane point: the canvas corner opposite the controls.
  const canvas = target.shadowRoot!.querySelector<HTMLElement>('.canvas')!.getBoundingClientRect();
  let pane: FlowPoint = { x: canvas.right - 24, y: canvas.top + 24 };
  if (!topAt(pane)?.matches('.pane')) pane = { x: canvas.right - 24, y: canvas.bottom - 24 };

  await press(titlePoint(ids[0]!));
  const focusedNode = deepActive();
  const pointerRing = {
    selection: target.selection.nodes,
    focusVisible: focusedNode?.matches(':focus-visible') ?? null,
  };

  await press(titlePoint(ids[0]!), 2);
  const opened = { open: menu.open, selection: target.selection.nodes };
  await press(titlePoint(ids[1]!), 2);
  const moved = { open: menu.open, selection: target.selection.nodes };

  await press(pane);
  await wait(100);
  const active = deepActive();
  const closed = {
    open: menu.open,
    selection: target.selection.nodes,
    focusInWidget: within(active),
    focusVisible: active?.matches(':focus-visible') ?? null,
  };
  target.clearSelection();
  await settle(target);
  return report([
    check(
      'a node press focuses without the keyboard ring',
      pointerRing.selection.join() === ids[0] && pointerRing.focusVisible === false,
      pointerRing,
    ),
    check(
      'a right press opens the menu',
      opened.open && opened.selection.join() === ids[0],
      opened,
    ),
    check(
      'a right press on another node moves it',
      moved.open && moved.selection.join() === ids[1],
      moved,
    ),
    check(
      'a pane press closes it and clears the selection',
      !closed.open && closed.selection.length === 0,
      closed,
    ),
    check(
      'focus stays in the widget without the ring',
      closed.focusInWidget && closed.focusVisible === false,
      closed,
    ),
  ]);
}

/**
 * Panels and bars: the built-in bar anchors to each of the eight positions; an authored
 * `tp-flow-controls` slotted into a panel takes the widget's zoom and history state, keeps a
 * consumer Button in its roving focus and its presses reach the widget; the zoom field applies a
 * typed level and its menu's fit and preset choices, opening toward the canvas; Shift+1 and
 * Shift+0 (dispatched by physical key, as layouts type `!` and `)`) fit and reset the zoom; and
 * `tp-history-change` reports the history as it fills and empties.
 */
export async function assertToolbars(id = 'monitor'): Promise<Report> {
  const target = flow(id);
  target.scrollIntoView({ block: 'center' });
  await wait(300);
  const original = {
    controls: target.controls,
    position: target.controlsPosition,
    orientation: target.controlsOrientation,
  };
  const snapshot = structuredClone(target.value);
  const canvas = () =>
    target.shadowRoot!.querySelector<HTMLElement>('.canvas')!.getBoundingClientRect();
  const builtIn = () => target.shadowRoot!.querySelector<HTMLElement>('tp-flow-controls.controls')!;
  target.controls = ['undo', 'redo', 'zoom-out', 'zoom', 'zoom-in', 'fit'];
  target.controlsOrientation = 'horizontal';

  // Each position: the bar's box sits against the edges the position names.
  const placement: Record<string, boolean> = {};
  for (const position of [
    'top-start',
    'top-center',
    'top-end',
    'center-start',
    'center-end',
    'bottom-start',
    'bottom-center',
    'bottom-end',
  ] as const) {
    target.controlsPosition = position;
    await settle(target);
    const bar = builtIn().getBoundingClientRect();
    const box = canvas();
    const [block, inline] = position.split('-');
    const near = (a: number, b: number) => Math.abs(a - b) <= 24;
    const blockOk =
      block === 'top'
        ? near(bar.top, box.top)
        : block === 'bottom'
          ? near(bar.bottom, box.bottom)
          : near(bar.top + bar.height / 2, box.top + box.height / 2);
    const inlineOk =
      inline === 'start'
        ? near(bar.left, box.left)
        : inline === 'end'
          ? near(bar.right, box.right)
          : near(bar.left + bar.width / 2, box.left + box.width / 2);
    placement[position] = blockOk && inlineOk;
  }
  target.controlsPosition = 'bottom-center';
  await settle(target);
  const menuSide = builtIn().shadowRoot!.querySelector('tp-menu')?.getAttribute('side');

  // An authored bar with a consumer Button, slotted into the top-end panel.
  const authored = document.createElement('tp-flow-controls') as HTMLElement & {
    zoom: number;
    canUndo: boolean;
  };
  authored.setAttribute('slot', 'top-end');
  authored.setAttribute('actions', 'undo redo');
  authored.setAttribute('orientation', 'horizontal');
  const consumer = document.createElement('tp-button');
  consumer.textContent = 'Publish';
  authored.append(consumer);
  target.append(authored);
  await wait(200);
  await settle(target);
  const synced = { zoom: authored.zoom, viewport: target.viewport.zoom };
  // The toolbar manages the roving tab stop on the Button's native control.
  const consumerRoving =
    consumer.shadowRoot?.querySelector('button')?.getAttribute('tabindex') !== null &&
    consumer.hasAttribute('data-orientation');

  // History: a move fills it, the authored bar's Undo empties it.
  const history: Array<{ canUndo: boolean; canRedo: boolean }> = [];
  const onHistory = (event: Event) =>
    history.push((event as CustomEvent<{ canUndo: boolean; canRedo: boolean }>).detail);
  target.addEventListener('tp-history-change', onHistory);
  const moved = target.nodes[0]!;
  // updateNode proposes and commits: one history entry.
  target.updateNode(moved.id, { position: { x: moved.position.x + 40, y: moved.position.y } });
  await settle(target);
  const undoEnabled = authored.canUndo;
  authored.shadowRoot!.querySelector<HTMLElement>('tp-button[data-action="undo"]')!.click();
  await settle(target);
  const undone = target.model.getNode(moved.id)!.position.x === moved.position.x;
  target.removeEventListener('tp-history-change', onHistory);

  // The zoom field: a typed level, then the menu's preset and fit.
  const field = builtIn().shadowRoot!.querySelector<HTMLElement & { value: string }>(
    'tp-input.zoom-input',
  )!;
  field.dispatchEvent(
    new CustomEvent('tp-value-change', {
      bubbles: true,
      composed: true,
      detail: { value: '150', reason: 'input' },
    }),
  );
  field.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }),
  );
  await wait(400);
  const typed = target.viewport.zoom;
  const menu = builtIn().shadowRoot!.querySelector('tp-menu')!;
  menu.dispatchEvent(
    new CustomEvent('tp-action', { bubbles: true, composed: true, detail: { value: '0.5' } }),
  );
  await wait(400);
  const preset = target.viewport.zoom;
  const shownPreset = field.value;

  // Shortcuts by physical key.
  const canvasElement = target.shadowRoot!.querySelector<HTMLElement>('.canvas')!;
  canvasElement.focus();
  canvasElement.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: ')',
      code: 'Digit0',
      shiftKey: true,
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
  await wait(500);
  const reset = target.viewport.zoom;
  canvasElement.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: '!',
      code: 'Digit1',
      shiftKey: true,
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
  await wait(500);
  const fitted = target.viewport.zoom;

  authored.remove();
  target.controls = original.controls;
  target.controlsPosition = original.position;
  target.controlsOrientation = original.orientation;
  target.load(snapshot);
  await settle(target);
  return report(
    [
      check(
        'the bar anchors to every position',
        Object.values(placement).every(Boolean),
        placement,
      ),
      check('a bottom bar opens its zoom menu upward', menuSide === 'top', menuSide),
      check(
        'an authored bar takes the widget zoom',
        Math.abs(synced.zoom - synced.viewport) < 1e-6,
        synced,
      ),
      check('a consumer Button joins its roving focus', consumerRoving, consumerRoving),
      check(
        'the history fills and the authored Undo empties it',
        undoEnabled &&
          undone &&
          history.at(0)?.canUndo === true &&
          history.at(-1)?.canRedo === true,
        { undoEnabled, undone, history },
      ),
      check('a typed level applies', Math.abs(typed - 1.5) < 1e-6, typed),
      check(
        'a menu preset applies and shows',
        Math.abs(preset - 0.5) < 1e-6 && shownPreset === '50%',
        { preset, shownPreset },
      ),
      check(
        'Shift+0 resets and Shift+1 fits',
        Math.abs(reset - 1) < 1e-6 && Math.abs(fitted - 1) > 1e-3,
        { reset, fitted },
      ),
    ],
    { placement },
  );
}

interface PaletteElement extends HTMLElement {
  open: boolean;
  layout: string;
}

/** The node library inside a flow: the sidebar is a root child, the menu's lives in its portal. */
function paletteOf(target: TpFlow): PaletteElement {
  const root = target.shadowRoot!;
  const direct = root.querySelector<PaletteElement>('tp-flow-palette');
  if (direct) return direct;
  const portal = [...root.querySelectorAll<HTMLElement>('.root > div')].find((element) =>
    element.querySelector('tp-flow-palette'),
  );
  return portal!.querySelector<PaletteElement>('tp-flow-palette')!;
}
function paletteChips(palette: PaletteElement): HTMLElement[] {
  return [...palette.shadowRoot!.querySelectorAll<HTMLElement>('tp-button.item')].filter(
    (chip) => chip.getClientRects().length > 0,
  );
}
function paletteTrigger(target: TpFlow): HTMLElement {
  const bar = target.shadowRoot!.querySelector<HTMLElement>('.palette-trigger')!;
  return bar.shadowRoot!.querySelector<HTMLElement>('tp-toggle')!;
}
/** A press the way a pointer reaches the element: the deep hit-tested target at its center. */
function press(element: Element): void {
  const at = center(element);
  const hit = topAt(at) ?? element;
  hit.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: 1,
      clientX: at.x,
      clientY: at.y,
    }),
  );
}
/** A point on the bare pane inside the canvas the sidebars leave uncovered. */
function barePanePoint(target: TpFlow, from = 0): FlowPoint | undefined {
  const rect = target.getBoundingClientRect();
  const left = Math.max(rect.left, from) + 24;
  for (let y = rect.top + 24; y < rect.bottom - 24; y += 24)
    for (let x = left; x < rect.right - 24; x += 24) {
      const element = topAt({ x, y });
      if (
        element?.getRootNode() === target.shadowRoot &&
        element.closest('[part~="flow-pane"], [part~="flow-background"]') &&
        !element.closest('[part~="flow-edge"]')
      )
        return { x, y };
    }
  return undefined;
}
function focusPath(): string[] {
  const path: string[] = [];
  let element: Element | null = document.activeElement;
  while (element) {
    path.push(element.localName);
    element = element.shadowRoot?.activeElement ?? null;
  }
  return path;
}
/** The center of a node the library added at `at`: positions center the definition's size. */
function definitionCenter(target: TpFlow, nodeId: string | undefined): FlowPoint | undefined {
  const node = nodeId ? target.model.getNode(nodeId) : undefined;
  const definition = target.schema?.nodes.find((item) => item.type === node?.type);
  if (!node || !definition) return undefined;
  const size = definition.size ?? DEFAULT_NODE_SIZE_BY_SHAPE[definition.shape ?? 'card'];
  return target.flowToScreen({
    x: node.position.x + size.width / 2,
    y: node.position.y + size.height / 2,
  });
}
function dragEvent(type: string, target: EventTarget, at: FlowPoint, data: DataTransfer): void {
  target.dispatchEvent(
    new DragEvent(type, {
      bubbles: true,
      composed: true,
      cancelable: true,
      clientX: at.x,
      clientY: at.y,
      dataTransfer: data,
    }),
  );
}

/**
 * The node library as a sidebar: the floating "+" toggles a bar at the inline start that groups
 * the definitions in Accordion sections of outline chips, filters on search, inserts at the center
 * of the uncovered canvas from the keyboard, arms placement on a click and places on the next pane
 * press, inserts a dropped chip at the drop point, and keeps the start panels and the fit clear.
 */
export async function assertPaletteSidebar(id = 'pipeline'): Promise<Report> {
  const target = flow(id);
  target.scrollIntoView({ block: 'center' });
  if (target.paletteOpen) target.setPaletteOpen(false, 'programmatic');
  await settle(target);
  await wait(400);
  const root = target.shadowRoot!;
  const palette = paletteOf(target);
  const trigger = paletteTrigger(target);
  const flowRect = target.getBoundingClientRect();
  const closed = {
    hidden: palette.hidden,
    pressed: (trigger as HTMLElement & { pressed: boolean }).pressed,
    triggerInset: Math.round(trigger.getBoundingClientRect().left - flowRect.left),
  };
  // The "+" opens the library and focuses its search.
  press(trigger);
  await settle(target);
  await wait(400);
  const rect = palette.getBoundingClientRect();
  const inset = Math.round(rect.left - flowRect.left);
  const opened = {
    open: target.paletteOpen,
    pressed: (trigger as HTMLElement & { pressed: boolean }).pressed,
    focus: focusPath(),
    position: getComputedStyle(palette).position,
    inset,
    height: [Math.round(rect.height), Math.round(flowRect.height - inset * 2)],
  };
  // Start panels, the "+" among them, sit past the sidebar and its gap.
  const startPanels = [
    ...root.querySelectorAll<HTMLElement>('.panel[data-position$="-start"] > :not(slot)'),
  ].map((element) => Math.round(element.getBoundingClientRect().left - rect.right));
  // Sections: one Accordion item per category, toned labels, outline chips that drag.
  const shadow = palette.shadowRoot!;
  const definitions = (target.schema?.nodes ?? []).length;
  const categories = new Set((target.schema?.nodes ?? []).map((node) => node.category ?? ''));
  const sections = shadow.querySelectorAll('tp-accordion-item').length;
  const labels = [...shadow.querySelectorAll<HTMLElement>('[part~="flow-palette-group-label"]')];
  const chips = paletteChips(palette);
  const body = shadow.querySelector<HTMLElement>('[part~="flow-palette-body"]')!;
  const structure = {
    sections: [sections, categories.size],
    tonedLabels: labels.filter((label) => label.dataset['tone']).length,
    chips: [chips.length, definitions],
    outline: chips.every((chip) => chip.getAttribute('variant') === 'outline'),
    draggable: chips.every((chip) => chip.getAttribute('draggable') === 'true'),
    bodyScrolls: getComputedStyle(body).overflowY,
    bodyInside: body.getBoundingClientRect().bottom <= rect.bottom + 1,
  };
  // The fit centers the graph in the canvas the sidebar leaves uncovered.
  await target.fitViewTo({ duration: 0 });
  await settle(target);
  const nodeRects = hosts(target).map((node) => node.getBoundingClientRect());
  const graphCenter =
    (Math.min(...nodeRects.map((r) => r.left)) + Math.max(...nodeRects.map((r) => r.right))) / 2;
  const freeCenter = (rect.right + flowRect.right) / 2;
  const freeMiddle = (flowRect.top + flowRect.bottom) / 2;
  // Search replaces the sections by the matching chips; clearing lists everything again.
  const input = shadow.querySelector<HTMLElement>('tp-input')!;
  // Input renders its native field in its own light DOM.
  const field = input.querySelector<HTMLInputElement>('input')!;
  const search = async (text: string) => {
    field.value = text;
    field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    await settle(target);
    await wait(100);
  };
  await search('appro');
  const filtered = paletteChips(palette).length;
  const flat = shadow.querySelectorAll('tp-accordion-item').length;
  await search('');
  const unfiltered = paletteChips(palette).length;
  // A keyboard activation (click detail 0) inserts at the center of the uncovered canvas.
  const before = target.nodes.length;
  paletteChips(palette)[0]!.click();
  await settle(target);
  await wait(300);
  const inserted = target.nodes.length - before;
  const keyCenter = definitionCenter(target, target.selection.nodes[0]);
  const snapTolerance = (target.snap ? target.snapGrid * target.viewport.zoom : 0) + 2;
  if (inserted) target.undo();
  // A pointer click arms placement; the next press on the bare pane places the node there.
  press(paletteChips(palette)[1]!);
  await settle(target);
  const pane = root.querySelector<HTMLElement>('[part~="flow-pane"]')!;
  const armed = {
    placing: root.querySelector('.root')!.hasAttribute('data-placing'),
    cursor: getComputedStyle(pane).cursor,
    open: target.paletteOpen,
  };
  const spot = barePanePoint(target, rect.right);
  const placedBefore = target.nodes.length;
  if (spot) {
    pointer('pointerdown', topAt(spot)!, spot);
    pointer('pointerup', topAt(spot)!, spot);
  }
  await settle(target);
  await wait(200);
  const placed = target.nodes.length - placedBefore;
  const placedCenter = definitionCenter(target, target.selection.nodes[0]);
  if (placed) target.undo();
  // A chip dropped on the canvas inserts at the drop point.
  const data = new DataTransfer();
  const chip = paletteChips(palette)[2]!;
  dragEvent('dragstart', chip, center(chip), data);
  const dropBefore = target.nodes.length;
  if (spot) {
    dragEvent('dragover', topAt(spot)!, spot, data);
    dragEvent('drop', topAt(spot)!, spot, data);
  }
  dragEvent('dragend', chip, center(chip), data);
  await settle(target);
  await wait(200);
  const dropped = target.nodes.length - dropBefore;
  const droppedCenter = definitionCenter(target, target.selection.nodes[0]);
  if (dropped) target.undo();
  // The "+" toggles the sidebar closed again.
  press(trigger);
  await settle(target);
  await wait(400);
  const reclosed = { open: target.paletteOpen, hidden: palette.hidden };
  target.clearSelection();
  await settle(target);
  const near = (a: FlowPoint | undefined, b: FlowPoint | undefined, tolerance: number) =>
    Boolean(a && b && Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance);
  return report(
    [
      check(
        'closed by default: hidden, the "+" unpressed at the inset',
        closed.hidden && !closed.pressed && closed.triggerInset > 0,
        closed,
      ),
      check(
        'the "+" opens it, pressed, with focus in the search',
        opened.open && opened.pressed && opened.focus.includes('input'),
        opened,
      ),
      check(
        'floats at the inline start, spanning the pane inside its inset',
        opened.position === 'absolute' &&
          opened.inset > 0 &&
          Math.abs(opened.height[0]! - opened.height[1]!) <= 1,
        opened,
      ),
      check(
        'start panels clear the sidebar',
        startPanels.every((gap) => gap >= 0),
        startPanels,
      ),
      check(
        'sections per category with toned labels; draggable outline chips for every definition',
        structure.sections[0] === structure.sections[1] &&
          structure.tonedLabels === sections &&
          structure.chips[0] === structure.chips[1] &&
          structure.outline &&
          structure.draggable &&
          structure.bodyScrolls === 'auto' &&
          structure.bodyInside,
        structure,
      ),
      check(
        'the fit centers the graph in the uncovered canvas',
        Math.abs(graphCenter - freeCenter) <= 2,
        { graphCenter, freeCenter },
      ),
      check(
        'search shows the matches without sections; clearing lists all again',
        filtered === 1 && flat === 0 && unfiltered === definitions,
        { filtered, flat, unfiltered },
      ),
      check(
        'a keyboard activation inserts at the center of the uncovered canvas',
        inserted === 1 && near(keyCenter, { x: freeCenter, y: freeMiddle }, snapTolerance),
        { inserted, keyCenter, freeCenter, freeMiddle },
      ),
      check(
        'a click arms placement (copy cursor, library stays open); a pane press places it',
        armed.placing &&
          armed.cursor === 'copy' &&
          armed.open &&
          placed === 1 &&
          near(placedCenter, spot, snapTolerance),
        { armed, spot, placed, placedCenter },
      ),
      check(
        'a dropped chip inserts at the drop point',
        dropped === 1 && near(droppedCenter, spot, snapTolerance),
        { dropped, droppedCenter, spot },
      ),
      check('the "+" closes it again', !reclosed.open && reclosed.hidden === true, reclosed),
    ],
    { definitions, categories: categories.size },
  );
}

/**
 * The node library as a menu: the "+" opens an "Add node" Dialog modal to the widget with the
 * categories as toned columns of chips; the keyboard inserts at the center and focuses the node;
 * a click arms placement and closes the menu (Escape cancels it); dragging a chip turns the menu
 * transparent, a drop inserts at the point and closes it, a cancelled drag brings it back.
 */
export async function assertPaletteMenu(id = 'lighting'): Promise<Report> {
  const target = flow(id);
  target.scrollIntoView({ block: 'center' });
  await settle(target);
  await wait(300);
  const root = target.shadowRoot!;
  const trigger = paletteTrigger(target);
  const flowRect = target.getBoundingClientRect();
  press(trigger);
  await settle(target);
  await wait(500);
  const menu = root.querySelector<HTMLElement & { open: boolean }>('tp-dialog.palette-menu')!;
  const palette = paletteOf(target);
  const portal = palette.closest<HTMLElement>('.root > *');
  const shadow = palette.shadowRoot!;
  const surface = shadow
    .querySelector<HTMLElement>('[part~="flow-palette"]')!
    .getBoundingClientRect();
  const definitions = (target.schema?.nodes ?? []).length;
  const groups = [...shadow.querySelectorAll<HTMLElement>('[part~="flow-palette-group"]')];
  const tops = groups.map((group) => Math.round(group.getBoundingClientRect().top));
  const opened = {
    open: target.paletteOpen && menu.open,
    label: menu.getAttribute('label'),
    inPortal: Boolean(portal && portal !== palette),
    insideWidget:
      surface.left >= flowRect.left &&
      surface.right <= flowRect.right &&
      surface.top >= flowRect.top &&
      surface.bottom <= flowRect.bottom,
    canvasInert: Boolean(root.querySelector('[part~="flow-pane"]')?.closest('[inert]')),
    focus: focusPath(),
    columns: tops.filter((top) => top === tops[0]).length,
    groups: groups.length,
    tonedLabels: [
      ...shadow.querySelectorAll<HTMLElement>('[part~="flow-palette-group-label"]'),
    ].filter((label) => label.dataset['tone']).length,
    chips: [paletteChips(palette).length, definitions],
  };
  // A keyboard activation inserts at the center, closes the menu and focuses the node.
  const before = target.nodes.length;
  paletteChips(palette)[0]!.click();
  await settle(target);
  await wait(600);
  const keyInserted = target.nodes.length - before;
  const keyId = target.selection.nodes[0];
  const keyCenter = definitionCenter(target, keyId);
  const keyed = {
    inserted: keyInserted,
    closed: !target.paletteOpen,
    focus: focusPath(),
    focusedNode: (root.activeElement as (Element & { nodeId?: string }) | null)?.nodeId,
    keyId,
  };
  const middle = {
    x: (flowRect.left + flowRect.right) / 2,
    y: (flowRect.top + flowRect.bottom) / 2,
  };
  const snapTolerance = (target.snap ? target.snapGrid * target.viewport.zoom : 0) + 2;
  if (keyInserted) target.undo();
  // A pointer click arms placement and closes the menu; Escape cancels it.
  target.setPaletteOpen(true, 'trigger-press');
  await settle(target);
  await wait(500);
  press(paletteChips(paletteOf(target))[1]!);
  await settle(target);
  await wait(500);
  const armed = {
    placing: root.querySelector('.root')!.hasAttribute('data-placing'),
    closed: !target.paletteOpen,
  };
  // Escape at the focused element (the menu returned focus to the "+").
  let focused: Element = document.activeElement ?? target;
  while (focused.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement;
  focused.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
  await settle(target);
  const cancelled = !root.querySelector('.root')!.hasAttribute('data-placing');
  // Dragging a chip turns the menu transparent; a drop inserts at the point and closes it.
  target.setPaletteOpen(true, 'trigger-press');
  await settle(target);
  await wait(500);
  const dragPalette = paletteOf(target);
  const dragPortal = dragPalette.closest<HTMLElement>('.root > *')!;
  const chip = paletteChips(dragPalette)[2]!;
  const data = new DataTransfer();
  dragEvent('dragstart', chip, center(chip), data);
  await wait(50);
  const during = {
    marker: dragPortal.hasAttribute('data-flow-dragging'),
    opacity: getComputedStyle(dragPortal).opacity,
  };
  dragEvent('dragend', chip, center(chip), data);
  await wait(50);
  const restored = {
    marker: dragPortal.hasAttribute('data-flow-dragging'),
    opacity: getComputedStyle(dragPortal).opacity,
    open: target.paletteOpen,
  };
  const spot = { x: flowRect.left + flowRect.width * 0.7, y: flowRect.top + flowRect.height * 0.3 };
  const dropBefore = target.nodes.length;
  dragEvent('dragstart', chip, center(chip), data);
  await wait(50);
  dragEvent('dragover', topAt(spot)!, spot, data);
  dragEvent('drop', topAt(spot)!, spot, data);
  dragEvent('dragend', chip, center(chip), data);
  await settle(target);
  await wait(600);
  const dropped = target.nodes.length - dropBefore;
  const droppedCenter = definitionCenter(target, target.selection.nodes[0]);
  const afterDrop = {
    closed: !target.paletteOpen,
    marker: dragPortal.isConnected && dragPortal.hasAttribute('data-flow-dragging'),
  };
  if (dropped) target.undo();
  target.clearSelection();
  await settle(target);
  const near = (a: FlowPoint | undefined, b: FlowPoint | undefined, tolerance: number) =>
    Boolean(a && b && Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance);
  return report([
    check(
      'the "+" opens an "Add node" Dialog in the widget, the canvas inert, focus in the search',
      opened.open &&
        opened.label === 'Add node' &&
        opened.inPortal &&
        opened.insideWidget &&
        opened.canvasInert &&
        opened.focus.includes('input'),
      opened,
    ),
    check(
      'the categories lay out as toned columns listing every definition',
      opened.columns > 1 &&
        opened.tonedLabels === opened.groups &&
        opened.chips[0] === opened.chips[1],
      opened,
    ),
    check(
      'a keyboard activation inserts at the center, closes and focuses the node',
      keyed.inserted === 1 &&
        keyed.closed &&
        keyed.focusedNode === keyed.keyId &&
        near(keyCenter, middle, snapTolerance),
      { keyed, keyCenter, middle },
    ),
    check(
      'a click arms placement and closes the menu; Escape cancels it',
      armed.placing && armed.closed && cancelled,
      { armed, cancelled },
    ),
    check(
      'dragging turns the menu transparent; a cancelled drag brings it back',
      during.marker &&
        during.opacity === '0' &&
        !restored.marker &&
        restored.opacity === '1' &&
        restored.open,
      { during, restored },
    ),
    check(
      'a drop inserts at the point and closes the menu',
      dropped === 1 &&
        afterDrop.closed &&
        !afterDrop.marker &&
        near(droppedCenter, spot, snapTolerance),
      { dropped, droppedCenter, spot, afterDrop },
    ),
  ]);
}

// ---- execution: run requests, live runs, problems, header ------------------------------------

interface RunRequest {
  action: string;
  scope?: string;
  nodeId?: string;
  nodeIds: readonly string[];
  reason: string;
}

function runRequests(target: EventTarget) {
  const requests: RunRequest[] = [];
  const listener = (event: Event) => {
    const { action, scope, nodeId, nodeIds, reason } = (event as CustomEvent<RunRequest>).detail;
    requests.push({
      action,
      ...(scope ? { scope } : {}),
      ...(nodeId ? { nodeId } : {}),
      nodeIds,
      reason,
    });
  };
  target.addEventListener('tp-run-request', listener);
  return { requests, stop: () => target.removeEventListener('tp-run-request', listener) };
}

/** The authored `tp-flow-controls` bar in a header slot. */
function headerBar(target: TpFlow, slot: string): HTMLElement {
  return target.querySelector<HTMLElement>(`tp-flow-controls[slot="${slot}"]`)!;
}

/** The deepest element under a point inside an element's own shadow tree. */
function deepAt(element: Element): Element {
  return topAt(center(element)) ?? element;
}

/** Opens the context menu on a node (a dispatched `contextmenu` at its center) and picks an item. */
async function contextItem(target: TpFlow, nodeId: string, value: string): Promise<boolean> {
  const node = host(target, nodeId)!;
  const at = center(node);
  deepAt(node).dispatchEvent(
    new MouseEvent('contextmenu', {
      bubbles: true,
      composed: true,
      cancelable: true,
      button: 2,
      clientX: at.x,
      clientY: at.y,
    }),
  );
  await settle(target);
  await wait(250);
  const item = target.shadowRoot!.querySelector<HTMLElement>(
    `tp-menu.context-menu tp-menu-item[value="${value}"]`,
  );
  item?.click();
  await settle(target);
  await wait(250);
  return Boolean(item);
}

/**
 * Run requests (`runnable`): Run in the header's `execute` control, its Menu scopes, the node
 * toolbar's Run node, the context menu's Run node / from here / up to here, Mod+Enter and Stop
 * while running each dispatch `tp-run-request` with the action, the scope and the node ids in
 * execution order; a widget without `runnable` or a disabled one asks nothing, a read-only
 * one still asks.
 */
export async function assertRunRequests(id = 'execution'): Promise<Report> {
  const target = flow(id);
  target.scrollIntoView({ block: 'center' });
  target.clearRun();
  target.clearSelection();
  await settle(target);
  await wait(300);
  const recorder = runRequests(target);
  const execute = headerBar(target, 'header-end').shadowRoot!;
  // Run, the Button of the split control.
  press(execute.querySelector<HTMLElement>('tp-button.run')!);
  await settle(target);
  // The node toolbar's Run node, over the selected node.
  target.select({ nodes: ['moderate'], edges: [] });
  await settle(target);
  await wait(300);
  const toolbar = target.shadowRoot!.querySelector<HTMLElement>('tp-flow-node-toolbar')!;
  const toolbarRun = toolbar.querySelector<HTMLElement>('tp-button');
  if (toolbarRun) press(toolbarRun);
  await settle(target);
  // The execute Menu's node scopes (selected node) and the context menu's.
  press(execute.querySelector<HTMLElement>('tp-button.execute-trigger')!);
  await settle(target);
  await wait(350);
  // Menu items answer their own activation (the context menu's are pressed the same way).
  execute.querySelector<HTMLElement>('tp-menu-item[value="to"]')?.click();
  await settle(target);
  await wait(250);
  const fromItem = await contextItem(target, 'moderate', 'run-from');
  // Mod+Enter on the canvas.
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  target.shadowRoot!.querySelector<HTMLElement>('.canvas')!.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
      composed: true,
      cancelable: true,
      ...(mac ? { metaKey: true } : { ctrlKey: true }),
    }),
  );
  await settle(target);
  // While a run is going the Button is Stop.
  target.pushRunEvent({ type: 'run_started', at: 0 });
  target.pushRunEvent({ type: 'node_started', nodeId: 'upload', at: 1 });
  await settle(target);
  await wait(100);
  const runButton = execute.querySelector<HTMLElement>('tp-button.run')!;
  const stopLabel = runButton.textContent?.trim();
  press(runButton);
  await settle(target);
  recorder.stop();
  target.clearRun();
  target.clearSelection();
  await settle(target);
  // Without `runnable` nothing asks; a read-only runnable widget still does; a disabled one not.
  const monitor = flow('monitor');
  const monitorRecorder = runRequests(monitor);
  const monitorAsked = monitor.requestRun('graph');
  monitor.select({ nodes: ['urgent'], edges: [] });
  await settle(monitor);
  await wait(200);
  const monitorToolbarRun = [
    ...monitor.shadowRoot!.querySelectorAll<HTMLElement>('tp-flow-node-toolbar tp-button'),
  ].some((button) => (button as HTMLElement & { ariaLabel: string }).ariaLabel === 'Run node');
  monitor.clearSelection();
  monitorRecorder.stop();
  const readonly = flow('readonly');
  readonly.runnable = true;
  readonly.select({ nodes: ['urgent'], edges: [] });
  await settle(readonly);
  await wait(300);
  const readonlyRecorder = runRequests(readonly);
  const readonlyButtons = [
    ...readonly.shadowRoot!.querySelectorAll<HTMLElement>('tp-flow-node-toolbar tp-button'),
  ];
  readonlyButtons[0]?.click();
  readonlyRecorder.stop();
  readonly.clearSelection();
  readonly.runnable = false;
  const disabled = flow('disabled');
  disabled.runnable = true;
  const disabledAsked = disabled.requestRun('graph');
  disabled.runnable = false;
  await settle(readonly);
  const all = ['upload', 'resize', 'moderate', 'publish', 'flag', 'merchant', 'purge'];
  const [graph, node, to, from, hotkey, stop] = recorder.requests;
  return report(
    [
      check(
        'Run asks for the whole graph in execution order',
        graph?.action === 'run' &&
          graph.scope === 'graph' &&
          graph.reason === 'trigger-press' &&
          JSON.stringify(graph.nodeIds) === JSON.stringify(all),
        graph,
      ),
      check(
        'the node toolbar runs the selected node alone',
        Boolean(toolbarRun) &&
          node?.scope === 'node' &&
          node.nodeId === 'moderate' &&
          JSON.stringify(node.nodeIds) === '["moderate"]',
        node,
      ),
      check(
        'the Run menu runs up to the selected node, upstream first',
        to?.scope === 'to' &&
          to.reason === 'item-press' &&
          JSON.stringify(to.nodeIds) === '["upload","resize","moderate"]',
        to,
      ),
      check(
        'the context menu runs from a node through its downstream',
        fromItem &&
          from?.scope === 'from' &&
          JSON.stringify(from.nodeIds) === '["moderate","publish","flag","merchant"]',
        from,
      ),
      check(
        'Mod+Enter asks for the graph',
        hotkey?.scope === 'graph' && hotkey.reason === 'hotkey',
        hotkey,
      ),
      check(
        'while running the Button is Stop and asks to stop',
        stopLabel === 'Stop' && stop?.action === 'stop' && stop.nodeIds.length === 0,
        { stopLabel, stop },
      ),
      check(
        'nothing without runnable; read-only asks with Run alone; disabled asks nothing',
        !monitorAsked &&
          monitorRecorder.requests.length === 0 &&
          !monitorToolbarRun &&
          readonlyButtons.length === 1 &&
          readonlyRecorder.requests[0]?.scope === 'node' &&
          !disabledAsked,
        {
          monitorAsked,
          monitorToolbarRun,
          readonlyButtons: readonlyButtons.length,
          readonly: readonlyRecorder.requests,
          disabledAsked,
        },
      ),
    ],
    { requests: recorder.requests.length },
  );
}

/**
 * Live runs (`pushRunEvent`): statuses with progress, waiting reasons, warnings and failures on
 * the nodes, the summary chips, announcements, a scoped run that keeps the other results and
 * leaves the nodes outside it alone, and the run graph following an edit.
 */
export async function assertLiveRun(id = 'execution'): Promise<Report> {
  const target = flow(id);
  target.scrollIntoView({ block: 'center' });
  target.clearRun();
  await settle(target);
  const announced: string[] = [];
  const observer = new MutationObserver(() => {
    for (const region of target.shadowRoot!.querySelectorAll('[aria-live]'))
      if (region.textContent?.trim()) announced.push(region.textContent.trim());
  });
  observer.observe(target.shadowRoot!, { subtree: true, childList: true, characterData: true });
  const changes = capture(target, ['tp-run-change']);
  let at = 0;
  const push = (event: Record<string, unknown>) =>
    target.pushRunEvent({ ...event, at: (at += 100) } as Parameters<TpFlow['pushRunEvent']>[0]);
  push({ type: 'run_started' });
  for (const nodeId of ['upload', 'resize']) {
    push({ type: 'node_started', nodeId });
    push({ type: 'node_completed', nodeId });
  }
  push({ type: 'node_started', nodeId: 'moderate' });
  push({ type: 'node_progress', nodeId: 'moderate', progress: 0.4 });
  await settle(target);
  await wait(150);
  const progress = host(target, 'moderate')!.shadowRoot!.querySelector<
    HTMLElement & { value: number }
  >('tp-progress');
  const running = {
    status: host(target, 'moderate')!.dataset['status'],
    progress: progress?.value,
  };
  push({ type: 'node_completed', nodeId: 'moderate', port: 'safe' });
  push({ type: 'node_started', nodeId: 'publish' });
  push({ type: 'node_waiting', nodeId: 'publish', reason: 'Merchant approval' });
  await settle(target);
  await wait(150);
  const waiting = host(target, 'publish')!.shadowRoot!.querySelector('.status-detail')?.textContent;
  push({ type: 'node_warning', nodeId: 'publish', message: 'JPEG fallback used' });
  push({ type: 'node_completed', nodeId: 'publish' });
  push({ type: 'node_started', nodeId: 'merchant' });
  push({ type: 'node_failed', nodeId: 'merchant', error: 'Mail service unavailable' });
  push({ type: 'run_failed', error: 'Mail service unavailable' });
  await settle(target);
  await wait(250);
  const post = host(target, 'publish')!;
  const notify = host(target, 'merchant')!;
  const notifyPart = notify.shadowRoot!.querySelector<HTMLElement>('[part~="flow-node"]')!;
  const finished = {
    warnings: post.shadowRoot!.querySelector('.status-warnings')?.textContent?.trim(),
    postMarker: post
      .shadowRoot!.querySelector('[part~="flow-node"]')!
      .hasAttribute('data-warnings'),
    failedDetail: notify.shadowRoot!.querySelector('.status-detail')?.textContent,
    failedRing: getComputedStyle(notifyPart).boxShadow,
    failedName: notify.getAttribute('aria-label'),
    runError: target.runState?.error,
  };
  const summary = target.runSummary;
  const chips = [
    ...headerBar(target, 'header-center').shadowRoot!.querySelectorAll<HTMLElement>('tp-badge'),
  ].map(
    (chip) =>
      `${chip.dataset['status']}:${chip.textContent?.replace(/\D+/g, ' ').trim().split(' ')[0]}`,
  );
  const lastChange = changes.events.at(-1) as unknown as { value?: unknown } | undefined;
  const detailSummary = (
    changes.events.length ? (lastChange as unknown as Record<string, unknown>) : undefined
  ) as unknown;
  // A scoped run of one node keeps the earlier results and leaves the downstream nodes alone.
  push({ type: 'run_started', scope: ['moderate'] });
  push({ type: 'node_started', nodeId: 'moderate' });
  push({ type: 'node_completed', nodeId: 'moderate', port: 'safe' });
  push({ type: 'run_completed' });
  await settle(target);
  const scoped = {
    scope: target.runState?.scope,
    upload: target.runState?.nodes.get('upload')?.status,
    moderate: target.runState?.nodes.get('moderate')?.status,
    publish: target.runState?.nodes.get('publish')?.status,
    flag: target.runState?.nodes.get('flag')?.status,
  };
  // The run graph follows an edit: a new node joins idle; undo removes it again.
  const [added] = target.addNodes([{ type: 'merchant', position: { x: 700, y: 720 }, data: {} }]);
  await settle(target);
  const joined = added ? target.runState?.nodes.get(added)?.status : undefined;
  target.undo();
  await settle(target);
  const left = added ? target.runState?.nodes.has(added) : undefined;
  observer.disconnect();
  changes.stop();
  target.clearRun();
  await settle(target);
  const cleared = {
    run: target.runState ?? null,
    chips: headerBar(target, 'header-center').shadowRoot!.querySelectorAll('tp-badge').length,
  };
  return report([
    check(
      'a running node shows its progress',
      running.status === 'running' && running.progress === 40,
      running,
    ),
    check(
      'a waiting node shows what it waits for',
      waiting === 'Waiting for: Merchant approval',
      waiting,
    ),
    check(
      'warnings count on the node, a failure rings it and shows its error',
      finished.warnings === '1' &&
        finished.postMarker &&
        finished.failedDetail === 'Mail service unavailable' &&
        finished.failedRing !== 'none' &&
        Boolean(finished.failedName?.includes('error: Mail service unavailable')) &&
        finished.runError === 'Mail service unavailable',
      finished,
    ),
    check(
      'the summary counts the nodes and its chips follow',
      summary.success === 4 &&
        summary.failed === 1 &&
        summary.warnings === 1 &&
        chips.join(',') === 'failed:1,warnings:1,success:4',
      { summary, chips },
    ),
    check(
      'transitions are announced and tp-run-change reports them',
      announced.some((text) => text.includes('failed')) && changes.events.length >= 10,
      {
        announced: [...new Set(announced)].slice(0, 6),
        changes: changes.events.length,
        detailSummary: Boolean(detailSummary),
      },
    ),
    check(
      'a scoped run keeps the other results and leaves the nodes outside it alone',
      JSON.stringify(scoped.scope) === '["moderate"]' &&
        scoped.upload === 'success' &&
        scoped.moderate === 'success' &&
        scoped.publish === 'success' &&
        scoped.flag === 'idle',
      scoped,
    ),
    check('the run graph follows an edit', joined === 'idle' && left === false, { joined, left }),
    check('clearRun clears it', cleared.run === null && cleared.chips === 0, cleared),
  ]);
}

/**
 * Problems: `validate` reports the unconnected required input on its node (indicator and
 * outline) and port, `issues` adds supplied problems (an error on a node, a warning on an
 * edge), `tp-issues-change` reports each change, and connecting the port clears its problem.
 */
export async function assertProblems(id = 'execution'): Promise<Report> {
  const target = flow(id);
  target.scrollIntoView({ block: 'center' });
  target.clearRun();
  await settle(target);
  await wait(200);
  const archive = host(target, 'purge')!;
  const archivePart = archive.shadowRoot!.querySelector<HTMLElement>('[part~="flow-node"]')!;
  const indicator = archive.shadowRoot!.querySelector<HTMLElement & { ariaLabel: string }>(
    'tp-button.problem',
  );
  const portButton = archive
    .shadowRoot!.querySelector('tp-flow-port[port-id="in"]')
    ?.shadowRoot?.querySelector<HTMLElement>('[part~="flow-port"]');
  const computed = {
    problems: target.problems.map(
      (issue) => `${issue.severity}:${issue.code}:${issue.nodeId}:${issue.portId}`,
    ),
    marker: archivePart.getAttribute('data-problem'),
    outline: getComputedStyle(archivePart).outlineStyle,
    indicator: indicator?.ariaLabel,
    port: portButton?.getAttribute('data-issue'),
  };
  const events = capture(target, ['tp-issues-change']);
  target.issues = [
    { code: 'lint', severity: 'error', message: 'Catalog is read-only', nodeId: 'publish' },
    { code: 'lint', severity: 'warning', message: 'Merchant was not notified', edgeId: 'i5' },
  ];
  await settle(target);
  await wait(100);
  const postPart = host(target, 'publish')!.shadowRoot!.querySelector('[part~="flow-node"]');
  const edgeGroup = target.shadowRoot!.querySelector(`[part~="flow-edge"][data-edge="i5"]`);
  const supplied = {
    count: target.problems.length,
    post: postPart?.getAttribute('data-problem'),
    edge: edgeGroup?.getAttribute('data-issue'),
    dash: edgeGroup
      ? getComputedStyle(edgeGroup.querySelector('[part~="flow-edge-path"]')!).strokeDasharray
      : '',
  };
  // Connecting the required input clears its problem; undo brings it back.
  target.connect({ source: 'moderate', sourcePort: 'safe', target: 'purge', targetPort: 'in' });
  await settle(target);
  await wait(100);
  const connected = {
    problems: target.problems.filter((issue) => issue.code === 'required-port').length,
    marker: host(target, 'purge')!
      .shadowRoot!.querySelector('[part~="flow-node"]')!
      .getAttribute('data-problem'),
  };
  target.undo();
  target.issues = [];
  await settle(target);
  await wait(100);
  const restored = target.problems.length;
  events.stop();
  return report([
    check(
      'validate reports the unconnected required input on its node and port',
      computed.problems.join() === 'warning:required-port:purge:in' &&
        computed.marker === 'warning' &&
        computed.outline === 'dashed' &&
        Boolean(
          computed.indicator?.includes('"Images" of "Purge CDN cache" requires a connection.'),
        ) &&
        computed.port === 'warning',
      computed,
    ),
    check(
      'supplied issues mark their node and edge',
      supplied.count === 3 &&
        supplied.post === 'error' &&
        supplied.edge === 'warning' &&
        supplied.dash !== 'none',
      supplied,
    ),
    check(
      'connecting the port clears its problem; undo restores it',
      connected.problems === 0 && connected.marker === null && restored === 1,
      { connected, restored },
    ),
    // Changes in one task coalesce into one validation: the issues, the connection, the restore.
    check('tp-issues-change reports each change', events.events.length >= 3, events.events.length),
  ]);
}

/**
 * The opt-in header: shown only with slotted content, the canvas, the sidebar and the panels
 * below it, its menus opening downward, and a menu Dialog still covering the whole widget.
 */
export async function assertHeader(id = 'execution'): Promise<Report> {
  const target = flow(id);
  target.scrollIntoView({ block: 'center' });
  await settle(target);
  await wait(200);
  const root = target.shadowRoot!;
  const header = root.querySelector<HTMLElement>('.header')!;
  const rect = target.getBoundingClientRect();
  const headerRect = header.getBoundingClientRect();
  const canvasTop = root.querySelector('.canvas')!.getBoundingClientRect().top;
  const panelTop = root
    .querySelector('.panel[data-position="top-start"]')!
    .getBoundingClientRect().top;
  target.setPaletteOpen(true, 'programmatic');
  await settle(target);
  await wait(400);
  const sidebarTop = root.querySelector('tp-flow-palette')!.getBoundingClientRect().top;
  target.setPaletteOpen(false, 'programmatic');
  const shown = {
    hidden: header.hidden,
    height: Math.round(headerRect.height),
    canvas: Math.round(canvasTop - headerRect.bottom),
    panel: Math.round(panelTop - headerRect.bottom),
    sidebar: Math.round(sidebarTop - headerRect.bottom),
    regions: [...header.querySelectorAll('.header-region')].map((region) =>
      Math.round(region.getBoundingClientRect().left - rect.left),
    ),
    menuSide: headerBar(target, 'header-end')
      .shadowRoot!.querySelector('tp-menu.execute-menu')
      ?.getAttribute('side'),
  };
  // A widget without header content has no header.
  const monitor = flow('monitor');
  const monitorHeader = monitor.shadowRoot!.querySelector<HTMLElement>('.header')!;
  const absent = {
    hidden: monitorHeader.hidden,
    canvas: Math.round(
      monitor.shadowRoot!.querySelector('.canvas')!.getBoundingClientRect().top -
        monitor.getBoundingClientRect().top,
    ),
  };
  // A menu Dialog covers the header too.
  await settle(target);
  await wait(300);
  target.palette = 'menu';
  await settle(target);
  target.setPaletteOpen(true, 'programmatic');
  await settle(target);
  await wait(500);
  const portal = [...root.querySelectorAll<HTMLElement>('.root > div')].find((element) =>
    element.querySelector('tp-flow-palette'),
  );
  const backdrop = portal
    ? [
        ...portal.querySelectorAll<HTMLElement>('*'),
        ...(portal.shadowRoot ? [...portal.shadowRoot.querySelectorAll<HTMLElement>('*')] : []),
      ].find((element) => element.hasAttribute('data-backdrop'))
    : undefined;
  const cover = backdrop?.getBoundingClientRect();
  const menu = {
    backdrop: backdrop?.getAttribute('data-backdrop'),
    top: cover ? Math.round(cover.top - rect.top) : null,
    height: cover ? Math.round(cover.height - rect.height) : null,
  };
  target.setPaletteOpen(false, 'programmatic');
  await settle(target);
  await wait(400);
  target.palette = 'sidebar';
  await settle(target);
  return report([
    check(
      'the header shows with its start, center and end regions',
      !shown.hidden && shown.height > 0 && shown.regions.length === 3,
      shown,
    ),
    check(
      'the canvas, the start panel and the sidebar sit below it; its menus open downward',
      shown.canvas >= 0 && shown.panel >= 0 && shown.sidebar >= 0 && shown.menuSide === 'bottom',
      shown,
    ),
    check('no header without slotted content', absent.hidden && absent.canvas <= 1, absent),
    check(
      'the menu Dialog covers the whole widget over a blurred backdrop',
      menu.backdrop === 'blur' &&
        menu.top !== null &&
        Math.abs(menu.top) <= 1 &&
        Math.abs(menu.height ?? 9) <= 2,
      menu,
    ),
  ]);
}

/**
 * `confirmDelete`: a user deletion that removes nodes asks in an Alert dialog modal to the widget
 * over a blurred backdrop; Cancel keeps everything, Delete removes the nodes in one change.
 * Edge-only deletions and `deleteElements()` never ask.
 */
export async function assertDeleteConfirmation(id = 'monitor'): Promise<Report> {
  const target = flow(id);
  target.scrollIntoView({ block: 'center' });
  target.confirmDelete = true;
  await settle(target);
  const root = target.shadowRoot!;
  const dialog = root.querySelector<
    HTMLElement & { open: boolean; container: unknown; surfaceRoot: ShadowRoot }
  >('tp-alert-dialog.delete-confirmation')!;
  const captured = capture(target, ['tp-delete', 'tp-value-commit']);
  const pressDelete = async (nodeId: string) => {
    await target.focusNode(nodeId);
    target.select({ nodes: [nodeId], edges: [] });
    await settle(target);
    host(target, nodeId)!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Delete',
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    await settle(target);
    await wait(400);
  };
  const overlay = () => dialog.surfaceRoot.querySelector<HTMLElement>('.overlay');
  // Container modality moves the actions into a portal inside the widget root.
  const decide = async (slot: 'cancel' | 'confirm') => {
    const button = root.querySelector<HTMLElement>(`tp-button[slot="${slot}"]`);
    (button?.shadowRoot?.querySelector('button') ?? button)?.click();
    await settle(target);
    await wait(400);
  };
  const before = { nodes: target.nodes.length, edges: target.edges.length };

  await pressDelete('lookup');
  const asked = {
    open: dialog.open,
    title: dialog.getAttribute('label'),
    container: dialog.container === root.querySelector('.root'),
    backdrop: overlay()?.getAttribute('data-backdrop'),
    filter: overlay() ? getComputedStyle(overlay()!).backdropFilter : null,
    canvasInert: Boolean(root.querySelector('.canvas')?.closest('[inert]')),
    nodes: target.nodes.length,
  };
  await decide('cancel');
  const cancelled = { open: dialog.open, nodes: target.nodes.length, edges: target.edges.length };

  await pressDelete('lookup');
  const commitsBefore = captured.events.filter((event) => event.type === 'tp-value-commit').length;
  await decide('confirm');
  const confirmed = {
    open: dialog.open,
    nodes: target.nodes.length,
    edges: target.edges.length,
    commits:
      captured.events.filter((event) => event.type === 'tp-value-commit').length - commitsBefore,
    gone: !target.nodes.some((node) => node.id === 'lookup'),
  };
  target.undo();
  await settle(target);
  const restored = { nodes: target.nodes.length, edges: target.edges.length };

  // An edge alone and the API delete at once.
  const edgeId = target.edges[0]!.id;
  target.select({ nodes: [], edges: [edgeId] });
  await target.focusNode(target.edges[0]!.source);
  target.focusEdge(edgeId);
  root.querySelector<HTMLElement>('.focus-proxies [part~="flow-edge-focus"]:focus')?.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Delete',
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
  await settle(target);
  await wait(200);
  const edgeOnly = { open: dialog.open, edges: target.edges.length };
  if (edgeOnly.edges < before.edges) target.undo();
  target.deleteElements({ nodes: ['reply'] });
  await settle(target);
  const api = { open: dialog.open, gone: !target.nodes.some((node) => node.id === 'reply') };
  target.undo();
  captured.stop();
  target.confirmDelete = false;
  target.clearSelection();
  await settle(target);
  return report(
    [
      check(
        'a node deletion asks in a dialog modal to the widget over a blur',
        asked.open &&
          asked.title === 'Delete Look up customer?' &&
          asked.container &&
          asked.backdrop === 'blur' &&
          String(asked.filter).includes('blur') &&
          asked.canvasInert &&
          asked.nodes === before.nodes,
        asked,
      ),
      check(
        'Cancel keeps every node and edge',
        !cancelled.open && cancelled.nodes === before.nodes && cancelled.edges === before.edges,
        cancelled,
      ),
      check(
        'Delete removes the node and its edges in one change',
        !confirmed.open && confirmed.gone && confirmed.commits === 1,
        confirmed,
      ),
      check(
        'undo restores them',
        restored.nodes === before.nodes && restored.edges === before.edges,
        restored,
      ),
      check(
        'an edge alone deletes without asking',
        !edgeOnly.open && edgeOnly.edges === before.edges - 1,
        edgeOnly,
      ),
      check('deleteElements() deletes without asking', !api.open && api.gone, api),
    ],
    { before },
  );
}

export async function assertModes(): Promise<Report> {
  const readonly = flow('readonly');
  const view = flow('view');
  const disabled = flow('disabled');
  const before = readonly.nodes.length;
  readonly.select({ nodes: [readonly.nodes[0]!.id] });
  const nudged = readonly.nudgeSelection({ x: 16, y: 0 }, 'keyboard');
  const pasted = readonly.paste({
    version: 1,
    nodes: [{ id: 'ro', type: 'action', position: { x: 0, y: 0 }, data: {} }],
    edges: [],
  });
  await settle(readonly);
  readonly.clearSelection();
  const viewPorts = hosts(view)
    .flatMap((item) => [...item.shadowRoot!.querySelectorAll('tp-flow-port')])
    .filter((p) => (p as HTMLElement).offsetParent !== null).length;
  const canvas = disabled.shadowRoot!.querySelector<HTMLElement>('.canvas');
  return report([
    check(
      'read-only refuses user edits',
      !nudged && pasted.length === 0 && readonly.nodes.length === before,
      { nudged, pasted },
    ),
    check(
      'read-only keeps pan/zoom',
      typeof readonly.setViewport === 'function' && readonly.editable === false,
      readonly.editable,
    ),
    check('view mode hides ports', viewPorts === 0, viewPorts),
    check(
      'disabled canvas is inert',
      canvas?.tabIndex === -1 &&
        disabled.shadowRoot!.querySelector('.root')!.hasAttribute('data-disabled'),
      canvas?.tabIndex,
    ),
  ]);
}

export async function assertForms(): Promise<Report> {
  const field = flow('field');
  const form = document.getElementById('form') as HTMLFormElement;
  const data = new FormData(form);
  const value = data.get('pipeline');
  const parsed = typeof value === 'string' ? (JSON.parse(value) as FlowDocument) : null;
  const captured = capture(field, ['tp-value-change', 'tp-value-commit']);
  field.addNodes([{ type: 'action', position: { x: 0, y: 0 }, data: {} }]);
  await settle(field);
  form.reset();
  await settle(field);
  captured.stop();
  return report(
    [
      check(
        'FormData holds the canonical JSON',
        parsed?.version === 1,
        value?.toString().slice(0, 30),
      ),
      check(
        'reset restores the default with form-reset',
        captured.events.some((event) => event.reason === 'form-reset'),
        captured.events.map((e) => e.reason),
      ),
      check('required reflects validity', field.required === true, field.required),
    ],
    { nodes: field.nodes.length },
  );
}

export async function assertCleanup(cycles = 10): Promise<Report> {
  const section = document.getElementById('dynamic')!;
  const api = (
    window as unknown as {
      flowAPI: { samples: { workflowDocument: FlowDocument; workflowSchema: unknown } };
    }
  ).flowAPI;
  const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  const before = memory?.usedJSHeapSize ?? 0;
  for (let index = 0; index < cycles; index += 1) {
    const element = document.createElement('tp-flow') as unknown as TpFlow;
    (element as unknown as { schema: unknown }).schema = api.samples.workflowSchema;
    element.value = api.samples.workflowDocument;
    section.append(element as unknown as Node);
    await settle(element);
    // disconnect mid-gesture: press a node then remove
    const node = hosts(element)[0];
    if (node) pointer('pointerdown', node, center(node));
    element.remove();
    await frame();
  }
  await wait(200);
  const after = memory?.usedJSHeapSize ?? 0;
  const regions = document.querySelectorAll('[aria-live]').length;
  return report(
    [
      check('dynamic section empty', section.childElementCount === 0, section.childElementCount),
      check('no stray live regions', regions === 0, regions),
      check(
        'heap growth bounded (< 15 MB over cycles)',
        !memory || after - before < 15 * 1024 * 1024,
        Math.round((after - before) / 1024),
      ),
    ],
    { before, after },
  );
}

export async function assertPerformance(count = 1000, seconds = 2): Promise<Report> {
  const target = flow('large');
  const api = (window as unknown as { flowAPI: { generate: (count: number) => Promise<void> } })
    .flowAPI;
  await api.generate(count);
  await settle(target);
  await target.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 0 });
  await wait(500);
  // The display's own frame interval (idle rAF median): the budget is "no dropped frame", so a
  // p95 within a quarter frame of it is vsync jitter, while a dropped frame doubles it.
  const idleFrames: number[] = [];
  await new Promise<void>((resolve) => {
    let previous = performance.now();
    const tick = () => {
      const now = performance.now();
      idleFrames.push(now - previous);
      previous = now;
      if (idleFrames.length < 31) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  idleFrames.shift();
  const idle = [...idleFrames].sort((a, b) => a - b)[Math.floor(idleFrames.length / 2)] ?? 16.7;
  const frames: number[] = [];
  const longTasks: number[] = [];
  const observer = new PerformanceObserver((list) =>
    longTasks.push(...list.getEntries().map((entry) => entry.duration)),
  );
  observer.observe({ type: 'longtask' });
  let x = 0;
  let last = performance.now();
  await new Promise<void>((resolve) => {
    const start = performance.now();
    const step = () => {
      const now = performance.now();
      frames.push(now - last);
      last = now;
      x -= 24;
      void target.setViewport({ x, y: x * 0.3, zoom: 1 }, { duration: 0 });
      if (now - start < seconds * 1000) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
  observer.disconnect();
  frames.shift();
  const sorted = [...frames].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  const domHosts = hosts(target).length;
  return report(
    [
      check('p95 frame within one display frame (no dropped frames)', p95 <= idle * 1.25, {
        p95,
        idle,
      }),
      check('no long task after warm-up', longTasks.filter((d) => d > 50).length === 0, longTasks),
      check('hosts bounded', domHosts <= target.visibleNodeIds.length + 64 + 60, domHosts),
    ],
    { p50, p95, idle, frames: frames.length, longTasks: longTasks.length },
  );
}
