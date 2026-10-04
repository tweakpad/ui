import { validateConfiguration, mergeConfiguration } from './configuration.js';
import { CleanupScope, Scheduler } from '../services.js';
import { ObservableStore } from '../store.js';
import { CollisionObserver } from './collision-observer.js';
import { measureElement, sameOriginDocuments } from './dom-geometry.js';
import type { Droppable } from './entities.js';
import { Draggable } from './entities.js';
import { DragDropMonitor } from './events.js';
import { Point, validCoordinates } from './geometry.js';
import { applyModifiers, type Modifier, type ModifierConfiguration } from './modifiers.js';
import { OptimisticSorting } from './optimistic-sorting.js';
import { DragOperation } from './operation.js';
import { EntityRegistry, RegistryCoordinator } from './registry.js';
import { immediateRenderer } from './renderer.js';
import { reportDragDropDiagnostic, type UniqueIdentifier } from './sorting.js';
import { defaultSensors } from './sensors/index.js';
import { isSortable } from './sortable.js';
import { DragFeedback } from './feedback.js';
import { isFeedbackElement } from './feedback-scope.js';
import { DragAccessibility } from './accessibility.js';
import { DragScrolling } from './scrolling.js';
import type {
  DragEvent,
  DragEventName,
  DragOutcome,
  ManagerOptions,
  MoveInput,
  OperationSnapshot,
  RegisteredEntity,
  Renderer,
  Sensor,
  SensorConfiguration,
  StartInput,
  StopInput,
  Suspension,
} from './types.js';

interface Terminal {
  id: number;
  canceled: boolean;
  rejected: boolean;
  dispatching: boolean;
  nativeEvent: Event | undefined;
  handle: Suspension | undefined;
  decision: Promise<void> | undefined;
  resolve: (() => void) | undefined;
  decided: boolean;
  promise: Promise<void> | undefined;
}
interface Binding {
  element: Element | null;
  handle: Element | null;
  config: SensorConfiguration | undefined;
  disabled: boolean;
  accessibility: unknown;
  instructions: unknown;
  scope: CleanupScope;
}

export class DragDropManager {
  readonly dragOperation = new DragOperation();
  readonly monitor = new DragDropMonitor(this);
  readonly collisionObserver = new CollisionObserver(this);
  readonly sorting = new OptimisticSorting(this);
  readonly feedback = new DragFeedback(this);
  readonly scrolling: DragScrolling;
  readonly accessibility: DragAccessibility;
  readonly registry: {
    coordinator: RegistryCoordinator;
    draggables: EntityRegistry<Draggable>;
    droppables: EntityRegistry<Droppable>;
  };
  readonly actions = {
    start: (input: StartInput): AbortController => this.#start(input),
    move: (input: MoveInput): boolean => this.#move(input),
    setDropTarget: (
      id: UniqueIdentifier | null | undefined,
    ): Promise<{ prevented: boolean; changed: boolean }> => {
      const work = this.#setDropTarget(id);
      this.#targetWork = work;
      return work;
    },
    stop: (input: StopInput = {}): Promise<void> => this.#stop(input),
  };
  readonly #store = new ObservableStore<OperationSnapshot>(this.dragOperation.snapshot());
  readonly #scope = new CleanupScope((error) => this.reportError(error));
  readonly #bindings = new Map<Draggable, Binding>();
  readonly #rollbacks = new Set<() => void>();
  readonly #completions = new Set<(snapshot: OperationSnapshot) => boolean | Promise<boolean>>();
  #sensors: Sensor[];
  #modifiers: Modifier[];
  #operationModifiers: Modifier[] = [];
  #perSourceModifiers = false;
  #modifierConfiguration: ModifierConfiguration | undefined;
  #operationScope: CleanupScope | undefined;
  #terminal: Terminal | undefined;
  #destroyed = false;
  #nextId = 0;
  #targetRevision = 0;
  #targetWork: Promise<unknown> | undefined;
  #inputFlush: (() => void) | undefined;
  renderer: Renderer;
  constructor(readonly options: ManagerOptions = {}) {
    validateConfiguration(options);
    this.renderer = options.renderer ?? immediateRenderer;
    const coordinator = new RegistryCoordinator(() => this.#membershipChanged());
    this.registry = {
      coordinator,
      draggables: new EntityRegistry(coordinator),
      droppables: new EntityRegistry(coordinator),
    };
    this.#sensors = this.#makeSensors(options.sensors);
    this.#modifiers = this.#makeModifiers(options.modifiers);
    this.scrolling = new DragScrolling(this);
    this.accessibility = new DragAccessibility(this);
  }
  get destroyed(): boolean {
    return this.#destroyed;
  }
  get effectiveOptions(): ManagerOptions {
    return mergeConfiguration(this.options, this.dragOperation.source?.serviceOptions ?? {});
  }
  get pending(): boolean {
    return !!this.#terminal?.decision && !this.#terminal.decided;
  }
  subscribe(callback: (snapshot: OperationSnapshot) => void, emitCurrent = false): () => void {
    return this.#store.subscribe(({ value }) => {
      try {
        callback(value);
      } catch (error) {
        this.reportError(error);
        const id = value.id;
        queueMicrotask(() => {
          if (this.#current(id)) void this.#stop({ canceled: true });
        });
      }
    }, emitCurrent);
  }
  reportError(error: unknown): void {
    reportDragDropDiagnostic(
      'callback',
      'Drag action failed; mandatory cleanup will continue.',
      error,
    );
  }
  fail(error: unknown): void {
    this.reportError(error);
    void this.#stop({ canceled: true });
  }
  publish(): void {
    this.#store.set(this.dragOperation.snapshot());
  }
  /** Internal adapter completion runs only after all drag-end suspension decisions. */
  addCompletion(callback: (snapshot: OperationSnapshot) => boolean | Promise<boolean>): () => void {
    this.#completions.add(callback);
    return () => {
      this.#completions.delete(callback);
    };
  }
  addRollback(callback: () => void): () => void {
    this.#rollbacks.add(callback);
    return () => {
      this.#rollbacks.delete(callback);
    };
  }
  #rollback(): void {
    for (const rollback of [...this.#rollbacks]) {
      try {
        rollback();
      } catch (error) {
        this.reportError(error);
      }
    }
  }
  /** The active input owns its final sample; release is operation-specific. */
  ownInputFlush(flush: () => void): () => void {
    this.#inputFlush = flush;
    return () => {
      if (this.#inputFlush === flush) this.#inputFlush = undefined;
    };
  }
  #makeSensors(configuration?: SensorConfiguration): Sensor[] {
    const inputs =
      typeof configuration === 'function'
        ? configuration(defaultSensors)
        : (configuration ?? defaultSensors);
    return inputs.map((entry) => (typeof entry === 'function' ? entry(this) : entry));
  }
  #makeModifiers(configuration?: ModifierConfiguration): Modifier[] {
    const inputs = typeof configuration === 'function' ? configuration([]) : (configuration ?? []);
    return inputs.map((entry) => (typeof entry === 'function' ? entry() : entry));
  }
  registerEntity(entity: RegisteredEntity): boolean {
    if (this.#destroyed || isFeedbackElement(entity.element)) return false;
    return entity instanceof Draggable
      ? this.registry.draggables.register(entity.id, entity)
      : this.registry.droppables.register(entity.id, entity);
  }
  unregisterEntity(entity: RegisteredEntity): void {
    if (entity instanceof Draggable) {
      this.#bindings.get(entity)?.scope.dispose();
      this.#bindings.delete(entity);
      this.registry.draggables.unregister(entity);
    } else this.registry.droppables.unregister(entity);
  }
  entityChanged(entity: RegisteredEntity): void {
    if (this.#destroyed) return;
    if (entity instanceof Draggable) this.#bind(entity);
    if (
      this.dragOperation.source === entity &&
      entity instanceof Draggable &&
      entity.modifiers !== this.#modifierConfiguration &&
      this.dragOperation.status === 'dragging'
    ) {
      try {
        const next =
          entity.modifiers === undefined ? this.#modifiers : this.#makeModifiers(entity.modifiers);
        for (const modifier of this.#operationModifiers) {
          modifier.end?.();
          if (this.#perSourceModifiers) modifier.destroy?.();
        }
        this.#operationModifiers = next;
        this.#perSourceModifiers = entity.modifiers !== undefined;
        this.#modifierConfiguration = entity.modifiers;
      } catch (error) {
        this.fail(error);
      }
    }
    if (this.dragOperation.source === entity && (entity.disabled || !entity.element?.isConnected))
      void this.#stop({ canceled: true });
    if (this.dragOperation.source === entity && this.dragOperation.status === 'dragging') {
      try {
        this.feedback.reconfigure();
      } catch (error) {
        this.reportError(error);
      }
    }
    this.registry.coordinator.changed();
  }
  #bind(source: Draggable): void {
    const previous = this.#bindings.get(source);
    if (
      previous &&
      previous.element === source.element &&
      previous.handle === source.handle &&
      previous.config === source.sensors &&
      previous.disabled === source.disabled &&
      previous.accessibility === source.serviceOptions.accessibility &&
      previous.instructions === source.serviceOptions.instructions
    )
      return;
    previous?.scope.dispose();
    this.#bindings.delete(source);
    if (!source.registered || source.destroyed || source.disabled || !source.element) return;
    const scope = new CleanupScope((error) => this.reportError(error));
    this.#bindings.set(source, {
      element: source.element,
      handle: source.handle,
      config: source.sensors,
      disabled: source.disabled,
      accessibility: source.serviceOptions.accessibility,
      instructions: source.serviceOptions.instructions,
      scope,
    });
    try {
      const sensors =
        source.sensors === undefined ? this.#sensors : this.#makeSensors(source.sensors);
      if (source.sensors !== undefined)
        for (const sensor of sensors) scope.add(() => sensor.destroy?.());
      for (const sensor of sensors) if (!sensor.disabled) scope.add(sensor.bind(source));
      scope.add(this.accessibility.bind(source, sensors));
    } catch (error) {
      scope.dispose();
      this.fail(error);
    }
  }
  #membershipChanged(): void {
    if (this.#destroyed) return;
    for (const source of this.registry.draggables) this.#bind(source);
    const operation = this.dragOperation,
      generation = operation.id;
    if (operation.status === 'idle') {
      this.sorting.changed();
      return;
    }
    const id = operation.sourceId;
    if (id !== undefined) {
      const replacement = this.registry.draggables.get(id);
      if (replacement) operation.source = replacement;
      else
        void this.renderer.rendering
          .then(() => {
            if (!this.#current(generation)) return;
            const rebound = this.registry.draggables.get(id);
            if (rebound && rebound.element?.isConnected) {
              operation.source = rebound;
              this.publish();
            } else void this.#stop({ canceled: true });
          })
          .catch((error) => {
            if (this.#current(generation)) this.fail(error);
          });
    }
    if (operation.target && this.registry.droppables.get(operation.target.id) !== operation.target)
      operation.target = null;
    this.collisionObserver.forceUpdate();
    this.publish();
  }
  #current(id: number): boolean {
    return !this.#destroyed && this.dragOperation.id === id && this.dragOperation.status !== 'idle';
  }
  #terminalCanceled(): boolean {
    return this.#terminal?.canceled ?? false;
  }
  dispatch(
    name: DragEventName,
    fields: Partial<DragEvent> = {},
    cancelable = false,
    nativeEvent?: Event,
  ): DragEvent {
    let prevented = false;
    const event: DragEvent = {
      operation: this.dragOperation.snapshot(),
      nativeEvent: nativeEvent ?? this.dragOperation.activatorEvent ?? new Event(name),
      ...fields,
      cancelable,
      get defaultPrevented() {
        return prevented;
      },
      preventDefault() {
        if (cancelable) prevented = true;
      },
      suspend: () => this.#suspend(),
    };
    try {
      this.monitor.dispatch(name, event);
    } catch (error) {
      prevented = true;
      this.fail(error);
    }
    return event;
  }
  #start(input: StartInput): AbortController {
    this.registry.coordinator.flush();
    const source =
      input.source instanceof Draggable ? input.source : this.registry.draggables.get(input.source);
    if (
      this.#destroyed ||
      this.dragOperation.status !== 'idle' ||
      !source ||
      !source.registered ||
      source.manager !== this ||
      source.disabled ||
      !source.element?.isConnected ||
      !validCoordinates(input.coordinates)
    ) {
      reportDragDropDiagnostic(
        'start',
        'Start requires an idle manager, a registered enabled connected source, and finite coordinates.',
      );
      throw new Error('Invalid drag start.');
    }
    validateConfiguration(this.options, source.element);
    validateConfiguration(source.serviceOptions, source.element);
    const shape = measureElement(source.element);
    if (!shape) throw new Error('The drag source has no measurable rectangle.');
    const modifiers =
      source.modifiers === undefined ? this.#modifiers : this.#makeModifiers(source.modifiers);
    const operation = this.dragOperation,
      controller = new AbortController(),
      id = ++this.#nextId;
    operation.reset();
    operation.id = id;
    operation.source = source;
    operation.sourceId = source.id;
    operation.position.reset(input.coordinates);
    operation.activatorEvent = input.event ?? new Event('dragstart');
    operation.input =
      input.input ??
      (input.event?.type.startsWith('pointer')
        ? 'pointer'
        : input.event?.type.startsWith('key')
          ? 'keyboard'
          : 'imperative');
    operation.shape = { initial: shape, current: shape, previous: undefined };
    operation.controller = controller;
    operation.status = 'initialization-pending';
    for (const entity of this.registry.draggables)
      if (isSortable(entity))
        operation.initialMembership.set(entity.id, {
          index: entity.sortable.index,
          group: entity.sortable.group,
        });
    this.#operationModifiers = modifiers;
    this.#perSourceModifiers = source.modifiers !== undefined;
    this.#modifierConfiguration = source.modifiers;
    this.#operationScope = new CleanupScope((error) => this.reportError(error));
    controller.signal.addEventListener(
      'abort',
      () => {
        if (!this.#terminal && this.#current(id)) void this.#stop({ canceled: true });
      },
      { once: true },
    );
    this.publish();
    const event = this.dispatch('beforedragstart', {}, true, input.event);
    if (event.defaultPrevented || controller.signal.aborted) {
      this.#finish(id, 'canceled');
      return controller;
    }
    operation.status = 'initializing';
    this.publish();
    void this.#initialize(id);
    return controller;
  }
  async #initialize(id: number): Promise<void> {
    try {
      await this.renderer.rendering;
      if (!this.#current(id) || this.#terminal || this.dragOperation.controller?.signal.aborted)
        return;
      const operation = this.dragOperation,
        source = operation.source;
      if (!source?.registered || source.disabled || !source.element?.isConnected) {
        await this.#stop({ canceled: true });
        return;
      }
      const shape = measureElement(source.element);
      if (!shape) {
        await this.#stop({ canceled: true });
        return;
      }
      operation.shape = { initial: shape, current: shape, previous: undefined };
      operation.status = 'dragging';
      this.publish();
      this.sorting.start();
      const release = this.collisionObserver.suppress();
      try {
        this.feedback.start();
        this.scrolling.start();
        this.#observeGeometry();
        this.dispatch('dragstart');
      } finally {
        release();
      }
      if (!this.#terminal) this.collisionObserver.forceUpdate();
    } catch (error) {
      if (this.#current(id)) this.fail(error);
    }
  }
  #observeGeometry(): void {
    const scope = this.#operationScope;
    if (!scope) return;
    const docs = new Set<Document>();
    for (const entity of [...this.registry.draggables, ...this.registry.droppables])
      if (entity.element) for (const doc of sameOriginDocuments(entity.element)) docs.add(doc);
    for (const doc of docs) {
      const view = doc.defaultView;
      if (!view) continue;
      const scheduler = new Scheduler(view);
      scope.add(() => scheduler.dispose());
      const generation = this.dragOperation.id;
      let scheduled = false;
      const refresh = () => {
        if (scheduled) return;
        scheduled = true;
        scheduler.animationFrame(() => {
          scheduled = false;
          if (!this.#current(generation) || this.#terminal) return;
          if (!this.dragOperation.source?.element?.isConnected) this.#membershipChanged();
          this.collisionObserver.forceUpdate();
        });
      };
      let cancelScroll: (() => void) | undefined;
      const scroll = () => {
        cancelScroll ??= scheduler.timeout(() => {
          cancelScroll = undefined;
          refresh();
        }, 50);
      };
      const roots = new Set<Document | ShadowRoot>([doc]);
      for (const entity of [...this.registry.draggables, ...this.registry.droppables]) {
        const root = entity.element?.getRootNode?.();
        if (root && root !== doc && root.nodeType === 11 && root.ownerDocument === doc)
          roots.add(root as ShadowRoot);
      }
      for (const root of roots)
        scope.listen(root, 'scroll', scroll, { capture: true, passive: true });
      scope.listen(view, 'resize', refresh);
      if (view.visualViewport) {
        scope.listen(view.visualViewport, 'resize', refresh);
        scope.listen(view.visualViewport, 'scroll', refresh);
      }
      // Compare resting rectangles at the source position-observer cadence. This
      // also observes shadow-root and frame layout shifts without global observers.
      const positions = new Map<Element, ReturnType<typeof measureElement>>();
      scope.add(
        scheduler.interval(() => {
          if (!this.#current(generation) || this.#terminal) return;
          let changed = false;
          const elements = new Set<Element>();
          for (const entity of this.registry.droppables) {
            const element = entity.proxy ?? entity.element;
            if (!element || element.ownerDocument !== doc) continue;
            elements.add(element);
            const next = measureElement(element),
              previous = positions.get(element);
            if (next ? !previous?.equals(next) : !!previous) changed = true;
            positions.set(element, next);
          }
          for (const element of positions.keys())
            if (!elements.has(element)) {
              positions.delete(element);
              changed = true;
            }
          if (changed) refresh();
        }, 75),
      );
      if (view.ResizeObserver) {
        const observer = new view.ResizeObserver(refresh);
        for (const entity of [...this.registry.draggables, ...this.registry.droppables])
          if (entity.element?.ownerDocument === doc) observer.observe(entity.element);
        scope.add(() => observer.disconnect());
      }
      if (view.MutationObserver) {
        const observer = new view.MutationObserver(refresh);
        observer.observe(doc, { childList: true, subtree: true });
        scope.add(() => observer.disconnect());
      }
    }
  }
  #move(input: MoveInput): boolean {
    const operation = this.dragOperation;
    if (operation.status !== 'dragging' || this.#terminal || this.#destroyed) return false;
    const to =
      input.to ??
      (input.by
        ? {
            x: operation.position.current.x + input.by.x,
            y: operation.position.current.y + input.by.y,
          }
        : operation.position.current);
    if (!validCoordinates(to)) {
      reportDragDropDiagnostic('coordinates', 'Movement rejected: coordinates must be finite.');
      return false;
    }
    const fields: Partial<DragEvent> = {
      ...(input.to ? { to: { ...input.to } } : {}),
      ...(input.by ? { by: { ...input.by } } : {}),
    };
    const event =
      input.propagate === false
        ? undefined
        : this.dispatch('dragmove', fields, input.cancelable !== false, input.event);
    if (event?.defaultPrevented || this.#terminal) return false;
    try {
      const transform = applyModifiers(
        {
          source: operation.source,
          shape: operation.shape,
          transform: Point.delta(to, operation.position.initial),
        },
        this.#operationModifiers,
      );
      operation.move(to, transform);
      this.scrolling.moved();
      this.feedback.update();
      this.publish();
      this.collisionObserver.forceUpdate();
      return true;
    } catch (error) {
      this.fail(error);
      return false;
    }
  }
  async #setDropTarget(
    id: UniqueIdentifier | null | undefined,
  ): Promise<{ prevented: boolean; changed: boolean }> {
    const operation = this.dragOperation,
      generation = operation.id;
    if (operation.status !== 'dragging' || this.#terminal || this.#destroyed)
      return { prevented: false, changed: false };
    let target = id == null ? null : (this.registry.droppables.get(id) ?? null);
    try {
      if (
        target &&
        (!operation.source ||
          target.disabled ||
          !target.accepts(operation.source) ||
          !target.refreshShape())
      )
        target = null;
    } catch (error) {
      this.fail(error);
      return { prevented: true, changed: false };
    }
    if (target === operation.target) return { prevented: false, changed: false };
    const revision = ++this.#targetRevision,
      members = this.sorting.capture();
    operation.target = target;
    this.publish();
    try {
      await this.renderer.rendering;
      if (
        !this.#current(generation) ||
        this.#terminalCanceled() ||
        revision !== this.#targetRevision ||
        (target && this.registry.droppables.get(target.id) !== target)
      )
        return { prevented: true, changed: true };
      const event = this.dispatch('dragover', {}, true);
      await this.sorting.project(event, members);
      return { prevented: event.defaultPrevented, changed: true };
    } catch (error) {
      if (this.#current(generation)) this.fail(error);
      return { prevented: true, changed: true };
    }
  }
  #suspend(): Suspension {
    const terminal = this.#terminal;
    if (!terminal?.dispatching)
      throw new Error('suspend() is available synchronously during dragend.');
    if (terminal.handle) return terminal.handle;
    terminal.decision = new Promise<void>((resolve) => {
      terminal.resolve = resolve;
    });
    const settle = (rejected: boolean) => {
      if (terminal.decided || this.#terminal !== terminal) return;
      terminal.decided = true;
      terminal.rejected ||= rejected;
      terminal.resolve?.();
      this.publish();
    };
    terminal.handle = { resume: () => settle(false), abort: () => settle(true) };
    return terminal.handle;
  }
  #stop(input: StopInput): Promise<void> {
    const operation = this.dragOperation;
    if (operation.status === 'idle') return Promise.resolve();
    if (this.#terminal) {
      if (input.canceled) {
        this.#terminal.canceled = true;
        this.#terminal.handle?.abort();
      }
      return this.#terminal.promise ?? Promise.resolve();
    }
    try {
      this.#inputFlush?.();
    } catch (error) {
      this.reportError(error);
      input = { ...input, canceled: true };
    }
    const terminal: Terminal = {
      nativeEvent: input.event,
      id: operation.id,
      canceled: input.canceled === true || operation.status !== 'dragging',
      rejected: false,
      dispatching: false,
      decided: false,
      handle: undefined,
      decision: undefined,
      resolve: undefined,
      promise: undefined,
    };
    this.#terminal = terminal;
    this.#inputFlush = undefined;
    this.scrolling.dispose();
    operation.controller?.abort();
    operation.canceled = terminal.canceled;
    operation.status = 'dropped';
    this.publish();
    terminal.promise = this.#settle(terminal, input.event);
    return terminal.promise;
  }
  async #settle(terminal: Terminal, nativeEvent?: Event): Promise<void> {
    let outcome: DragOutcome = terminal.canceled ? 'canceled' : 'committed';
    try {
      if (!terminal.canceled) {
        await this.#targetWork;
        await this.renderer.rendering;
      }
      if (!this.#current(terminal.id)) return;
      terminal.dispatching = true;
      this.dispatch('dragend', { canceled: terminal.canceled }, false, nativeEvent);
      terminal.dispatching = false;
      if (terminal.canceled) terminal.handle?.abort();
      if (terminal.decision) {
        this.publish();
        await terminal.decision;
      }
      if (!this.#current(terminal.id)) return;
      const operation = this.dragOperation,
        source = operation.source,
        target = operation.target;
      if (terminal.canceled) outcome = 'canceled';
      else if (
        terminal.rejected ||
        !source?.registered ||
        source.disabled ||
        !source.element?.isConnected ||
        !target?.registered ||
        target.disabled ||
        !target.accepts(source) ||
        !target.refreshShape()
      )
        outcome = 'rejected';
      else
        for (const complete of [...this.#completions]) {
          if (!(await complete(operation.snapshot()))) {
            outcome = 'rejected';
            break;
          }
          if (!this.#current(terminal.id) || terminal.canceled) {
            outcome = 'canceled';
            break;
          }
        }
    } catch (error) {
      this.reportError(error);
      outcome = 'rejected';
    } finally {
      terminal.dispatching = false;
      if (this.#current(terminal.id)) {
        try {
          if (outcome !== 'committed') this.#rollback();
          await this.sorting.settle(outcome);
          this.accessibility.announceTerminal(outcome);
          if (outcome === 'committed') await this.feedback.settle();
        } catch (error) {
          this.reportError(error);
        }
        if (this.dragOperation.id === terminal.id) this.#finish(terminal.id, outcome);
      }
    }
  }
  #finish(id: number, outcome: DragOutcome): void {
    if (this.dragOperation.id !== id || this.dragOperation.status === 'idle') return;
    const snapshot = this.dragOperation.snapshot();
    if (outcome !== 'committed') {
      this.#rollback();
      try {
        this.sorting.settle(outcome);
      } catch (error) {
        this.reportError(error);
      }
    }
    this.sorting.reset();
    this.feedback.dispose();
    this.scrolling.dispose();
    this.#operationScope?.dispose();
    this.#operationScope = undefined;
    for (const modifier of this.#operationModifiers) {
      try {
        modifier.end?.();
        if (this.#perSourceModifiers) modifier.destroy?.();
      } catch (error) {
        this.reportError(error);
      }
    }
    this.#operationModifiers = [];
    this.collisionObserver.reset();
    this.#targetWork = undefined;
    for (const target of this.registry.droppables) target.clearShape();
    const nativeEvent = this.#terminal?.nativeEvent;
    this.#terminal?.resolve?.();
    this.#terminal = undefined;
    const controller = this.dragOperation.controller;
    this.dragOperation.reset();
    this.sorting.changed();
    controller?.abort();
    this.publish();
    this.dispatch(
      'settled',
      { operation: snapshot, outcome, canceled: outcome === 'canceled' },
      false,
      nativeEvent,
    );
  }
  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    if (this.dragOperation.status !== 'idle') this.#finish(this.dragOperation.id, 'canceled');
    for (const binding of this.#bindings.values()) binding.scope.dispose();
    this.#bindings.clear();
    for (const sensor of this.#sensors) this.#scope.add(() => sensor.destroy?.());
    for (const modifier of this.#modifiers) this.#scope.add(() => modifier.destroy?.());
    this.#scope.dispose();
    this.registry.draggables.clear();
    this.registry.droppables.clear();
    this.#completions.clear();
    this.#rollbacks.clear();
    this.monitor.clear();
    this.accessibility.destroy();
  }
}
