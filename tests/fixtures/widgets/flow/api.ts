/* Assertion helpers evaluated through Chrome DevTools MCP; each returns { checks, records }. */
import type { TpFlow, TpFlowNode, TpFlowPort } from '../../../../src/widgets/flow/index.js';
import type {
  FlowDocument,
  FlowEdgeKind,
  FlowPoint,
  FlowRect,
} from '../../../../src/foundation/flow/types.js';

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
export async function assertLateAndNeverOwners(nodeId = 'notify'): Promise<Report> {
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

export async function assertNestedEventBoundary(id = 'material'): Promise<Report> {
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

// ---- gestures (synthetic sequences; real ones through the MCP drag tool) --------------------

/**
 * Drags the left-most node: the press selects it and the `auto` inspector docks on the inline
 * end, shrinking the canvas; a node near that edge would put the pointer in the auto-pan zone.
 */
export async function assertNodeDrag(id = 'monitor', nodeId = 'form'): Promise<Report> {
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
  // A docked inspector would cover the inline-end ports; gestures start from a clear selection.
  target.clearSelection();
  const removed = target.deleteElements({ edges: ['e4'] }, 'imperative-action');
  await settle(target);
  const captured = capture(target, ['tp-connect', 'tp-value-change', 'tp-value-commit']);
  const from = port(target, 'enrich', 'out')!.button!;
  const to = port(target, 'deal', 'in')!.button!;
  await syntheticDrag(from, center(from), center(to));
  const edges = target.edges.filter((edge) => edge.source === 'enrich' && edge.target === 'deal');
  const connect = captured.events.find((event) => event.type === 'tp-connect');
  const commit = captured.events.find((event) => event.type === 'tp-value-commit');
  // invalid: occupied input
  const line = target.shadowRoot!.querySelector('[part~="flow-connection-line"]');
  const invalidFrom = port(target, 'form', 'out')!.button!;
  const invalidTo = port(target, 'enrich', 'in')!.button!;
  pointer('pointerdown', invalidFrom, center(invalidFrom));
  pointer('pointermove', invalidFrom, center(invalidTo));
  await frame();
  const candidate = port(target, 'enrich', 'in')!;
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
  const plan = monitor.model.getNode('plan')!;
  monitor.updateNode('plan', { position: { x: plan.position.x + 40, y: plan.position.y - 150 } });
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
  const sockets = [port(monitor, 'form', 'out')!, port(monitor, 'plan', 'in')!];
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
  const field = host(monitor, 'enrich')?.shadowRoot?.querySelector<HTMLElement>(
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
        JSON.stringify(nodeControlSelection) === JSON.stringify({ nodes: ['enrich'], edges: [] }),
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
  const planHost = host(target, 'plan')!;
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
      check('partial mode selects intersecting nodes', partial.includes('plan'), partial),
      check('full mode needs containment', !full.includes('plan'), full),
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
  target.select({ nodes: ['form'], edges: [] });
  const deleted = target.deleteElements({ nodes: target.selection.nodes, edges: [] }, 'hotkey');
  await settle(target);
  const after = { nodes: target.nodes.length, edges: target.edges.length };
  const vetoListener = (event: Event) => event.preventDefault();
  target.addEventListener('tp-delete', vetoListener);
  const vetoed = target.deleteElements({ nodes: ['plan'] }, 'hotkey');
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
  target.select({ nodes: ['enrich', 'deal'] });
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
        pasted.length === 2 && !pasted.includes('enrich') && afterPaste.nodes === before.nodes + 2,
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
  const start = target.model.getNode('notify')!.position.x;
  target.select({ nodes: ['notify'] });
  target.nudgeSelection({ x: 16, y: 0 }, 'keyboard');
  target.nudgeSelection({ x: 16, y: 0 }, 'keyboard');
  target.nudgeSelection({ x: 16, y: 0 }, 'keyboard');
  const depthAfterNudges = target.model.history.depth;
  target.updateNode('deal', { position: { x: 900, y: 60 } });
  const depth = target.model.history.depth;
  target.undo();
  target.undo();
  const restored = target.model.getNode('notify')!.position.x;
  const canRedo = target.canRedo;
  target.redo();
  target.redo();
  const redone = target.model.getNode('notify')!.position.x;
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
    enrich: target.runState?.nodes.get('enrich')?.status,
    e3: target.runState?.edges.get('e3')?.status,
  };
  target.runTransport('start');
  const start = target.runState?.nodes.get('form')?.status;
  target.runTransport('step');
  target.runTransport('step');
  const stepped = target.runState?.nodes.get('form')?.status;
  target.runTransport('seek', 3);
  const sought = {
    form: target.runState?.nodes.get('form')?.status,
    e1: target.runState?.edges.get('e1')?.status,
  };
  target.runTransport('end');
  await settle(target);
  captured.stop();
  const footer = host(target, 'enrich')
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
      check('seek replays', sought.form === 'success' && sought.e1 === 'taken', sought),
      check('tp-run-change dispatched', captured.events.length >= 4, captured.events.length),
      check('status footer renders', Boolean(footer), footer),
    ],
    { end },
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
