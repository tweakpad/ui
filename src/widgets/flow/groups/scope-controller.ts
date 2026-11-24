import type { ReactiveControllerHost } from 'lit';
import { ControllableState, orderedValuesEqual } from '../../../foundation/controllable-state.js';
import { TpValueChangeEvent } from '../../../foundation/events.js';
import { fillTemplate } from '../../../foundation/template.js';
import type { ChangeReason } from '../../../foundation/types.js';
import type { FlowScopeView } from '../../../foundation/flow/groups/view.js';
import type { FlowModel } from '../../../foundation/flow/model/model.js';
import type { FlowViewport } from '../../../foundation/flow/types.js';
import type { FlowPathChangeMetadata, FlowStrings } from '../types.js';

/** The empty path: the root of the document. */
export const ROOT_PATH: readonly string[] = Object.freeze([]);

/**
 * The longest valid prefix of `path` (Widgets §6.3 Properties, prop-11): every id names a group
 * of the document and each one sits inside the one before it. A path that loses a group to a
 * document change is cut at its nearest surviving ancestor.
 */
export function truncateFlowPath(model: FlowModel, path: readonly string[]): readonly string[] {
  const kept: string[] = [];
  for (const id of path) {
    const node = model.getNode(id);
    const previous = kept[kept.length - 1];
    if (!node || !model.isGroup(node)) break;
    if (previous !== undefined && !model.ancestors(id).includes(previous)) break;
    kept.push(id);
  }
  return kept.length === path.length ? path : kept;
}

/** The path from the root to a group: its enclosing groups, outermost first, then itself. */
export function flowPathTo(model: FlowModel, id: string): readonly string[] | undefined {
  if (!model.isGroup(id)) return undefined;
  const groups = model.ancestors(id).filter((ancestor) => model.isGroup(ancestor));
  return [...groups.reverse(), id];
}

/** Parses the `default-path` attribute: a JSON array of group ids. */
export function parseFlowPath(value: string | null): readonly string[] | undefined {
  if (value === null) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : undefined;
  } catch {
    return undefined;
  }
}

/** What the scope controller asks of the widget. */
export interface FlowScopeHost {
  readonly host: ReactiveControllerHost & EventTarget;
  readonly model: FlowModel;
  readonly view: FlowScopeView;
  strings(): FlowStrings;
  nodeLabel(id: string): string;
  announce(message: string): void;
  readControlledPath(): readonly string[] | undefined;
  readDefaultPath(): readonly string[] | undefined;
  onPathChange(event: TpValueChangeEvent<readonly string[]>): void;
  diagnose(message: string): void;
  /** The effective scope changed: re-sync routing, the layers and the header. */
  scopeChanged(): void;
  /** Clears the selection (entering) or selects one node (exiting). */
  select(ids: readonly string[], reason: ChangeReason): void;
  viewport(): FlowViewport;
  /** Moves the view, animated unless reduced motion asks otherwise. */
  moveTo(viewport: FlowViewport, reason: ChangeReason): void;
  /** Fits the content of the current scope into view (the widget's fit padding). */
  fitScope(reason: ChangeReason): void;
  focusNode(id: string): void;
  focusCanvas(): void;
  /** Whether the inline direction is right to left (reading order). */
  rtl(): boolean;
}

/** A scope change waiting for the render that follows it. */
interface PendingScope {
  entered: boolean;
  /** The group the view left, to select and focus on exit. */
  exited: string | undefined;
  reason: ChangeReason;
}

function pathKey(path: readonly string[]): string {
  return path.join('\u0000');
}

/**
 * The path lane and the scope transitions of a flow (Widgets §6.3 Properties prop-10 and prop-11,
 * Events evt-7): `path` / `defaultPath` / `onPathChange` with cancelable `tp-path-change`
 * proposals; entering clears the selection, fits the group's content the first time and restores
 * its last viewport afterwards, then focuses the first member in reading order; exiting restores
 * the parent's viewport and selects and focuses the exited group. A document change that removes
 * a group on the path cuts the path: an uncontrolled lane reconciles, a controlled one keeps
 * showing the cut path and is told by a diagnostic.
 */
export class FlowScopeController {
  readonly #host: FlowScopeHost;
  readonly state: ControllableState<readonly string[]>;
  readonly #viewports = new Map<string, FlowViewport>();
  #effectiveKey = '';
  #pending: PendingScope | undefined;
  #truncating = false;
  #diagnosed: string | undefined;

  constructor(host: FlowScopeHost) {
    this.#host = host;
    this.state = new ControllableState<readonly string[]>({
      host: host.host,
      initialValue: ROOT_PATH,
      readControlledValue: () => host.readControlledPath(),
      readDefaultValue: () => host.readDefaultPath(),
      hasDefaultValue: () => host.readDefaultPath() !== undefined,
      equals: orderedValuesEqual,
      eventFactory: (value, previous, reason, sourceEvent, options) =>
        new TpValueChangeEvent(value, previous, reason, sourceEvent, options, 'tp-path-change'),
      onChange: (event) => host.onPathChange(event),
      onCommit: (value, _previous, reason) => this.#committed(value, reason),
      diagnostic: (message) => host.diagnose(message),
    });
  }

  /** The requested path (the lane's value). */
  get path(): readonly string[] {
    return this.state.value;
  }

  /** The path the view shows: the requested one cut at the first id that is not a nested group. */
  get effective(): readonly string[] {
    const view = this.#host.view;
    return view.path.length ? view.effectivePath : ROOT_PATH;
  }

  /** The group whose inside the view shows; `undefined` at the root. */
  get scope(): string | undefined {
    const effective = this.effective;
    return effective[effective.length - 1];
  }

  /** Adopts the lane's value into the view (first render, controlled writes). */
  sync(): void {
    this.state.initialize();
    const view = this.#host.view;
    view.path = this.state.value;
    this.#checkEffective();
  }

  /** Proposes a path; returns whether the lane accepted it. */
  navigate(
    path: readonly string[],
    reason: ChangeReason,
    sourceEvent: Event | undefined,
    metadata: FlowPathChangeMetadata,
  ): boolean {
    if (orderedValuesEqual(path, this.effective) && orderedValuesEqual(path, this.path))
      return false;
    return this.state.set(path, reason, sourceEvent, { metadata });
  }

  /** Proposes entering a group (its full path from the root); false when it is not a group. */
  enter(
    id: string,
    reason: ChangeReason,
    sourceEvent: Event | undefined,
    surface: FlowPathChangeMetadata['surface'],
  ): boolean {
    const path = flowPathTo(this.#host.model, id);
    if (!path || orderedValuesEqual(path, this.effective)) return false;
    return this.navigate(path, reason, sourceEvent, { surface, groupId: id });
  }

  /** Proposes leaving the current group for the view it sits in; false at the root. */
  exit(
    reason: ChangeReason,
    sourceEvent: Event | undefined,
    surface: FlowPathChangeMetadata['surface'],
  ): boolean {
    const effective = this.effective;
    const groupId = effective[effective.length - 1];
    if (groupId === undefined) return false;
    return this.navigate(effective.slice(0, -1), reason, sourceEvent, { surface, groupId });
  }

  /**
   * After a document change: a group on the path may be gone. Only a non-empty path pays for the
   * check, so the root of a flat document never reads the scope.
   */
  documentChanged(): void {
    if (!this.#host.view.path.length) return;
    this.#checkEffective();
    const requested = this.path;
    const effective = this.effective;
    if (orderedValuesEqual(requested, effective)) {
      this.#diagnosed = undefined;
      return;
    }
    if (!this.state.controlled) {
      this.#truncating = true;
      try {
        this.state.reconcile(effective);
      } finally {
        this.#truncating = false;
      }
      return;
    }
    const key = pathKey(requested);
    if (this.#diagnosed === key) return;
    this.#diagnosed = key;
    this.#host.diagnose(
      `The path names a group that no longer exists; the view shows [${effective.join(', ')}].`,
    );
  }

  /** The lane published a new path: the view follows; viewport and focus wait for the render. */
  #committed(value: readonly string[], reason: ChangeReason): void {
    const host = this.#host;
    const before = this.effective;
    this.#viewports.set(pathKey(before), host.viewport());
    host.view.path = value;
    const after = this.effective;
    this.#checkEffective();
    if (this.#truncating || orderedValuesEqual(before, after)) return;
    const exited =
      after.length < before.length &&
      before.slice(0, after.length).every((id, i) => after[i] === id)
        ? before[after.length]
        : undefined;
    // Entering clears the selection now, so nothing outside the new scope stays selected.
    if (exited === undefined) host.select([], reason);
    this.#pending = { entered: exited === undefined, exited, reason };
  }

  #checkEffective(): void {
    const key = pathKey(this.effective);
    if (key === this.#effectiveKey) return;
    this.#effectiveKey = key;
    this.#host.scopeChanged();
  }

  /** After the render the scope change caused: moves the view, then focus and the announcement. */
  settle(): void {
    const pending = this.#pending;
    this.#pending = undefined;
    if (!pending) return;
    const host = this.#host;
    const strings = host.strings();
    const remembered = this.#viewports.get(pathKey(this.effective));
    if (remembered) host.moveTo(remembered, pending.reason);
    else if (pending.entered) host.fitScope(pending.reason);
    if (pending.entered) {
      const scope = this.scope;
      const first = this.#firstMember();
      if (first) host.focusNode(first);
      else host.focusCanvas();
      if (scope !== undefined)
        host.announce(fillTemplate(strings.announceEntered, { label: host.nodeLabel(scope) }));
      return;
    }
    const exited = pending.exited;
    if (exited === undefined || !host.model.getNode(exited)) return;
    host.select([exited], pending.reason);
    host.focusNode(exited);
    host.announce(fillTemplate(strings.announceExited, { label: host.nodeLabel(exited) }));
  }

  /** The first document node of the scope in reading order (top to bottom, then inline). */
  #firstMember(): string | undefined {
    const view = this.#host.view;
    const rtl = this.#host.rtl();
    let best: { id: string; y: number; x: number } | undefined;
    for (const node of view.nodes) {
      if (node.hidden || view.isTerminal(node.id)) continue;
      const rect = view.nodeRect(node.id);
      if (!rect) continue;
      const y = Math.round(rect.y);
      const x = rtl ? -(rect.x + rect.width) : rect.x;
      if (!best || y < best.y || (y === best.y && x < best.x)) best = { id: node.id, y, x };
    }
    return best?.id;
  }
}
