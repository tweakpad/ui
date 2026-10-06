import { html, render, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { TpElement } from '../../foundation/element.js';
import { ControllableState, orderedValuesEqual } from '../../foundation/controllable-state.js';
import {
  TpValueCommitEvent,
  type TpValueChangeEvent,
  type TpChangeEventOptions,
} from '../../foundation/events.js';
import { createId } from '../../foundation/id.js';
import {
  mergeConfiguration,
  validateConfiguration,
} from '../../foundation/drag-drop/configuration.js';
import { DragDropManager } from '../../foundation/drag-drop/manager.js';
import { Droppable, type Draggable } from '../../foundation/drag-drop/entities.js';
import { Sortable, type SortableInput } from '../../foundation/drag-drop/sortable.js';
import { PointerSensor, KeyboardSensor } from '../../foundation/drag-drop/sensors/index.js';
import { markFeedbackRoot } from '../../foundation/drag-drop/feedback-scope.js';
import {
  reportDragDropDiagnostic,
  type UniqueIdentifier,
} from '../../foundation/drag-drop/sorting.js';
import { validIdentifier } from '../../foundation/drag-drop/registry.js';
import {
  measureElement,
  cancelGeometryTransitions,
  parseTransform,
} from '../../foundation/drag-drop/dom-geometry.js';
import { dragMotion, dragMotionContext } from '../../foundation/drag-drop/motion.js';
import type { Rectangle } from '../../foundation/drag-drop/geometry.js';
import type { MotionHandle } from '../../foundation/motion.js';
import type {
  ManagerOptions,
  DraggableInput,
  DroppableInput,
  DragEvent,
  DragEventName,
  SortTransition,
} from '../../foundation/drag-drop/types.js';
import { gripVerticalIcon } from '../../icons/grip-vertical.js';
import { ListController, itemParticipation, type ItemRecord } from './list-controller.js';
import { dragDropListStyles } from './styles.js';
import type {
  DragDropDestination,
  DragDropItemContext,
  DragDropItemOptions,
  MoveItemOutcome,
} from './types.js';
import { dragDropListPresentation } from '../../presentation/families/drag-drop-list.js';
import { TpListItem } from '../list-item/list-item.js';
import { TpEmptyState } from '../empty-state/empty-state.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { TpButton } from '../button.js';

const eventNames: Record<DragEventName, string> = {
  beforedragstart: 'tp-before-drag-start',
  dragstart: 'tp-drag-start',
  dragmove: 'tp-drag-move',
  collision: 'tp-collision',
  dragover: 'tp-drag-over',
  dragend: 'tp-drag-end',
  settled: 'tp-drag-settled',
};
const complexProperties = Object.fromEntries(
  [
    'getItemId',
    'getItemLabel',
    'renderItem',
    'getItemOptions',
    'manager',
    'group',
    'type',
    'accept',
    'sensors',
    'modifiers',
    'collisionDetector',
    'collisionPriority',
    'alignment',
    'feedback',
    'renderOverlay',
    'rootElement',
    'overlayDisabled',
    'transition',
    'keyboardTransition',
    'dropAnimation',
    'autoScroll',
    'instructions',
    'announcements',
    'accessibility',
    'onValueChange',
  ].map((name) => [name, { attribute: false }]),
);

/** Immutable collection binding; entities and services belong to Foundation. */
export class TpDragDropList<T = unknown> extends TpElement {
  static tagName = 'tp-drag-drop-list';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpListItem, TpEmptyState, TpButton];
  }
  static override presentation = dragDropListPresentation;
  static override properties = {
    ...TpElement.properties,
    ...complexProperties,
    value: { attribute: false, noAccessor: true },
    defaultValue: { attribute: false },
    activation: { type: String, reflect: true },
    reorderMode: { type: String, attribute: 'reorder-mode', reflect: true },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    label: { type: String },
  };
  static override styles = [TpElement.styles, dragDropListStyles];
  defaultValue: readonly T[] | undefined;
  #provided: readonly T[] | undefined;
  onValueChange: ((event: TpValueChangeEvent<readonly T[]>) => void) | undefined;
  getItemId: ((item: T, index: number) => UniqueIdentifier) | undefined;
  getItemLabel: ((item: T, index: number) => string) | undefined;
  renderItem: ((item: T, context: DragDropItemContext<T>) => unknown) | undefined;
  getItemOptions: ((item: T, context: DragDropItemContext<T>) => DragDropItemOptions) | undefined;
  manager: DragDropManager | undefined;
  group: UniqueIdentifier = createId('drag-list');
  override orientation: 'vertical' | 'horizontal' = 'vertical';
  activation: 'handle' | 'item' = 'handle';
  reorderMode: 'move' | 'swap' = 'move';
  variant: 'ghost' | 'outline' | 'subdued' = 'ghost';
  size: 'xs' | 'sm' | 'default' = 'default';
  label = 'Items';
  type: DraggableInput['type'];
  accept: DroppableInput['accept'];
  sensors: ManagerOptions['sensors'];
  modifiers: ManagerOptions['modifiers'];
  collisionDetector: DroppableInput['collisionDetector'];
  collisionPriority: DroppableInput['collisionPriority'];
  alignment: DraggableInput['alignment'];
  feedback: ManagerOptions['feedback'];
  renderOverlay: ((item: T, context: DragDropItemContext<T>) => unknown) | undefined;
  rootElement: ManagerOptions['rootElement'];
  overlayDisabled: ManagerOptions['overlayDisabled'];
  transition: SortTransition | null | undefined;
  keyboardTransition: ManagerOptions['keyboardTransition'];
  dropAnimation: ManagerOptions['dropAnimation'];
  autoScroll: ManagerOptions['autoScroll'];
  instructions: ManagerOptions['instructions'];
  announcements: ManagerOptions['announcements'];
  accessibility: ManagerOptions['accessibility'];
  pendingCommit: { event: Event; eventOptions: TpChangeEventOptions } | undefined;
  readonly #state = new ControllableState<readonly T[]>({
    host: this,
    initialValue: [],
    readControlledValue: () => this.#readLane(this.#provided),
    readDefaultValue: () => this.#readLane(this.defaultValue),
    hasDefaultValue: () => this.defaultValue !== undefined,
    equals: orderedValuesEqual,
    onChange: (event) => this.onValueChange?.(event),
    onCommit: (value, previous, reason) => {
      this.requestUpdate('value', previous);
      if (reason !== 'programmatic')
        this.dispatchEvent(
          new TpValueCommitEvent(
            value,
            previous,
            reason,
            this.pendingCommit?.event,
            this.pendingCommit?.eventOptions,
          ),
        );
    },
    diagnostic: (message) => reportDragDropDiagnostic('value', message),
  });
  readonly controller = new ListController(this, this.#state);
  #ownedManager: DragDropManager | undefined;
  #connectedManager: DragDropManager | undefined;
  #connectedGroup: UniqueIdentifier | undefined;
  #sortables = new Map<UniqueIdentifier, Sortable>();
  #items = new Map<UniqueIdentifier, HTMLElement>();
  #handles = new Map<UniqueIdentifier, HTMLElement>();
  #handleRefs = new Map<UniqueIdentifier, (element: HTMLElement | null) => void>();
  #itemRefs = new Map<UniqueIdentifier, (element: HTMLElement | null) => void>();
  #list: HTMLElement | null = null;
  containerTarget: Droppable | undefined;
  #containerId = createId('drag-list-target');
  #oldRects = new Map<
    UniqueIdentifier,
    { rect: Rectangle; index: number | undefined; group: UniqueIdentifier | undefined }
  >();
  #motions = new Map<UniqueIdentifier, MotionHandle>();
  #overlay: HTMLElement | undefined;
  #overlayRelease: (() => void) | undefined;
  #itemSensors = new Map<
    UniqueIdentifier,
    { element: Element; sensors: NonNullable<ManagerOptions['sensors']> }
  >();
  #itemOptions = new Map<UniqueIdentifier, Partial<SortableInput>>();
  #itemData = new Map<UniqueIdentifier, Record<string, unknown>>();
  #content = new Map<UniqueIdentifier, unknown>();
  #overlaySource: Draggable | undefined;
  #boundRecords = new Map<UniqueIdentifier, ItemRecord<T>>();
  get value(): readonly T[] {
    return this.#state.value;
  }
  set value(value: readonly T[] | undefined) {
    try {
      if (value !== undefined) {
        if (!Array.isArray(value)) throw new TypeError('value must be an array.');
        if (this.hasUpdated) this.controller.resolve(value);
      }
    } catch (error) {
      reportDragDropDiagnostic('value', 'Invalid value retained the coherent list.', error);
      return;
    }
    const previous = this.value;
    this.#provided = value;
    if (this.hasUpdated) this.#state.sync();
    if (!this.controller.network?.committing && previous !== this.value)
      this.controller.network?.invalidate(this.controller);
    this.requestUpdate('value', previous);
  }
  #coherentInput: readonly T[] = [];
  #readLane(value: readonly T[] | undefined): readonly T[] | undefined {
    if (value === undefined) return undefined;
    // Identity resolvers may be assigned after value and before the first update.
    if (!this.isConnected) return value;
    try {
      this.controller.resolve(value);
      this.#coherentInput = value;
      return value;
    } catch (error) {
      reportDragDropDiagnostic('value', 'Invalid items retained the last coherent value.', error);
      return this.#coherentInput;
    }
  }
  get controlledInput(): readonly T[] | undefined {
    return this.#provided;
  }
  get committedValue(): readonly T[] {
    return this.value;
  }
  get previewValue(): readonly T[] {
    return this.controller.preview;
  }
  moveItem(id: UniqueIdentifier, destination: DragDropDestination<T>): MoveItemOutcome {
    return this.controller.moveItem(id, destination);
  }
  cancelDrag(): void {
    this.controller.cancel();
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.requestUpdate();
  }
  override disconnectedCallback(): void {
    this.controller.disconnect();
    for (const sortable of this.#sortables.values()) sortable.destroy();
    this.#sortables.clear();
    this.containerTarget?.destroy();
    this.containerTarget = undefined;
    this.#ownedManager?.destroy();
    this.#ownedManager = undefined;
    this.#connectedManager = undefined;
    this.#clearOverlay();
    for (const motion of this.#motions.values()) motion.cancel();
    this.#motions.clear();
    super.disconnectedCallback();
  }
  #connect(): void {
    const manager = this.manager ?? (this.#ownedManager ??= new DragDropManager());
    if (manager === this.#connectedManager && this.group === this.#connectedGroup) return;
    if (!validIdentifier(this.group) || !this.controller.canConnect(manager)) {
      if (this.#connectedGroup !== undefined) this.group = this.#connectedGroup;
      throw new TypeError(
        'Connected list groups must be unique string or finite-number identifiers.',
      );
    }
    this.controller.disconnect();
    for (const sortable of this.#sortables.values()) sortable.destroy();
    this.#sortables.clear();
    this.containerTarget?.destroy();
    this.containerTarget = undefined;
    if (this.#ownedManager && manager !== this.#ownedManager) {
      this.#ownedManager.destroy();
      this.#ownedManager = undefined;
    }
    this.controller.connect(manager);
    this.#connectedManager = manager;
    this.#connectedGroup = this.group;
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    try {
      this.#connect();
      this.#state.initialize();
      this.controller.sync();
    } catch (error) {
      reportDragDropDiagnostic(
        'list-configuration',
        'List configuration could not be applied.',
        error,
      );
    }
    for (const record of this.controller.records) {
      try {
        this.#itemOptions.set(record.id, this.#configuration(record));
      } catch (error) {
        this.#connectedManager?.fail(error);
      }
    }
    for (const [id, element] of this.#items) {
      const rect = measureElement(element),
        sortable = this.#sortables.get(id);
      if (rect) this.#oldRects.set(id, { rect, index: sortable?.index, group: sortable?.group });
    }
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncEntities();
    const operation = this.#connectedManager?.dragOperation;
    this.toggleAttribute(
      'data-dragging',
      !!operation && operation.status !== 'idle' && !!this.controller.network?.session,
    );
    this.toggleAttribute('data-pending', this.#connectedManager?.pending ?? false);
    if (this.disabled || this.readOnly) this.cancelDrag();
    this.#animateSort();
  }
  #participation(record: ItemRecord<T>, options?: Partial<SortableInput>) {
    return itemParticipation((options ?? this.#itemOptions.get(record.id))?.disabled, {
      disabled: this.disabled,
      readOnly: this.readOnly,
      duplicate: record.duplicate,
    });
  }
  #context(record: ItemRecord<T>, preview = false): DragDropItemContext<T> {
    const entity = this.#sortables.get(record.id),
      participation = this.#participation(record),
      committedIndex = this.value.findIndex(
        (item, index) =>
          (this.getItemId?.(item, index) ?? this.controller.resolve([item])[0]?.id) === record.id,
      );
    return {
      id: record.id,
      index: record.index,
      committedIndex,
      previewIndex: record.index,
      dragging: entity?.isDragging ?? false,
      dropping: entity?.isDropping ?? false,
      dropTarget: entity?.isDropTarget ?? false,
      disabled: participation.dragDisabled,
      dragDisabled: participation.dragDisabled,
      dropDisabled: participation.dropDisabled,
      preview,
      list: this,
    };
  }
  #configuration(record: ItemRecord<T>): Partial<SortableInput> {
    const configuration: Record<string, unknown> = {};
    for (const key of [
      'sensors',
      'modifiers',
      'alignment',
      'collisionDetector',
      'collisionPriority',
      'feedback',
      'rootElement',
      'overlayDisabled',
      'dropAnimation',
      'keyboardTransition',
      'transition',
      'autoScroll',
      'accessibility',
      'instructions',
      'announcements',
    ] as const)
      configuration[key] = this[key];
    // Retain source feedback outside keyed list ranges during a cross-root remount.
    configuration.rootElement =
      this.rootElement ?? this.#connectedManager?.options.rootElement ?? this.ownerDocument.body;
    const item = this.getItemOptions?.(record.item, this.#context(record)) ?? {};
    for (const key of [
      'id',
      'index',
      'group',
      'manager',
      'element',
      'source',
      'target',
      'handle',
      'register',
    ])
      if (key in item) throw new TypeError(`getItemOptions cannot override list-owned ${key}.`);
    const merged = mergeConfiguration(
      mergeConfiguration(this.#connectedManager?.options ?? {}, configuration),
      item,
    );
    validateConfiguration(merged);
    return {
      ...configuration,
      ...merged,
      ...item,
      ...Object.fromEntries(
        [
          'autoScroll',
          'accessibility',
          'instructions',
          'announcements',
          'keyboardTransition',
          'dropAnimation',
        ].map((key) => [key, merged[key as keyof ManagerOptions]]),
      ),
    };
  }
  #syncEntities(): void {
    const manager = this.#connectedManager,
      network = this.controller.network;
    if (!manager || !network || !this.#list) return;
    const type = this.type ?? network.type,
      accept = this.accept === undefined ? network.type : this.accept;
    const disabled = this.disabled || this.readOnly;
    manager.registry.coordinator.batch(() => {
      const wanted = new Set(
        this.controller.records.filter((record) => !record.duplicate).map((record) => record.id),
      );
      for (const [id, sortable] of this.#sortables)
        if (!wanted.has(id)) {
          sortable.destroy();
          this.#sortables.delete(id);
          this.#boundRecords.delete(id);
          this.#itemData.delete(id);
          this.#itemSensors.delete(id);
          this.#content.delete(id);
        }
      for (const record of this.controller.records) {
        if (record.duplicate) continue;
        const element = this.#items.get(record.id),
          handle = this.#handles.get(record.id);
        if (!element || !handle) continue;
        let options: Partial<SortableInput>;
        try {
          options = this.#itemOptions.get(record.id) ?? this.#configuration(record);
        } catch (error) {
          manager.fail(error);
          continue;
        }
        if (
          this.activation === 'item' &&
          options.sensors === undefined &&
          manager.options.sensors === undefined
        ) {
          let binding = this.#itemSensors.get(record.id);
          if (!binding || binding.element !== element) {
            binding = {
              element,
              sensors: [
                PointerSensor.configure({ activatorElements: [element] }),
                KeyboardSensor.configure(),
              ],
            };
            this.#itemSensors.set(record.id, binding);
          }
          options = { ...options, sensors: binding.sensors };
        }
        const nextData = {
          ...options.data,
          item: record.item,
          label: record.label,
          list: this.controller,
        };
        const oldData = this.#itemData.get(record.id);
        const data =
          oldData &&
          Object.keys({ ...oldData, ...nextData }).every((key) =>
            Object.is(oldData[key], (nextData as Record<string, unknown>)[key]),
          )
            ? oldData
            : nextData;
        this.#itemData.set(record.id, data);
        const participation = this.#participation(record, options);
        const input: SortableInput = {
          ...options,
          id: record.id,
          index: record.index,
          group: this.group,
          element,
          handle,
          type: options.type ?? type,
          accept: options.accept === undefined ? accept : options.accept,
          data,
          disabled: {
            draggable: participation.dragDisabled,
            droppable: participation.dropDisabled,
          },
        };
        let sortable = this.#sortables.get(record.id);
        if (!sortable) {
          sortable = new Sortable(input, manager);
          this.#sortables.set(record.id, sortable);
        } else {
          sortable.element = element;
          sortable.handle = handle;
          sortable.setMembership(record.index, this.group);
          sortable.disabled = input.disabled!;
          sortable.type = input.type;
          sortable.accept = input.accept;
          sortable.data = input.data!;
          sortable.draggable.update({
            ...options,
            id: record.id,
            data: input.data,
            type: input.type,
            element,
            handle,
            disabled: participation.dragDisabled,
          } as DraggableInput);
          sortable.droppable.update({
            ...options,
            id: record.id,
            data: input.data,
            type: input.type,
            element,
            accept: input.accept,
            disabled: participation.dropDisabled,
          } as DroppableInput);
          sortable.transition = options.transition;
        }
        this.#boundRecords.set(record.id, record);
      }
      const input: DroppableInput = {
        id: this.#containerId,
        element: this.#list,
        disabled,
        type,
        accept,
        collisionPriority: -1,
        data: { container: true, label: this.label, list: this.controller },
      };
      if (!this.containerTarget) {
        this.containerTarget = new Droppable(input, manager);
        this.containerTarget.register();
      } else this.containerTarget.update(input);
    });
  }
  #animateSort(): void {
    for (const [id, element] of this.#items) {
      const sortable = this.#sortables.get(id),
        transition = sortable?.transition,
        previous = this.#oldRects.get(id),
        old = previous?.rect;
      cancelGeometryTransitions(element);
      const next = measureElement(element);
      if (
        !old ||
        !next ||
        !transition ||
        sortable?.isDragSource ||
        (!this.controller.network?.session && !transition.idle)
      )
        continue;
      const x = old.left - next.left,
        y = old.top - next.top;
      if (!x && !y) continue;
      this.#motions.get(id)?.cancel();
      const base = parseTransform({
        translate: element.ownerDocument.defaultView!.getComputedStyle(element).translate,
      });
      const bx = base?.x ?? 0,
        by = base?.y ?? 0;
      this.#motions.set(
        id,
        dragMotion(
          element,
          element,
          'sort-displacement',
          [{ translate: `${bx + x}px ${by + y}px` }, { translate: `${bx}px ${by}px` }],
          transition,
          dragMotionContext(
            id,
            {
              sourceGroup: previous?.group,
              targetGroup: sortable?.group,
              fromIndex: previous?.index,
              toIndex: sortable?.index,
            },
            { x, y },
          ),
        ),
      );
    }
    this.#oldRects.clear();
  }
  #ref(id: UniqueIdentifier, handle: boolean): (element: HTMLElement | null) => void {
    const refs = handle ? this.#handleRefs : this.#itemRefs,
      values = handle ? this.#handles : this.#items;
    let callback = refs.get(id);
    if (!callback)
      refs.set(
        id,
        (callback = (element) => {
          if (element) values.set(id, element);
          else values.delete(id);
          if (handle)
            queueMicrotask(() => {
              if (this.isConnected) this.#syncEntities();
            });
        }),
      );
    return callback;
  }
  #row(record: ItemRecord<T>, preview = false): unknown {
    const context = this.#context(record, preview);
    let content: unknown;
    try {
      content = this.renderItem?.(record.item, context) ?? record.label;
      if (!preview) this.#content.set(record.id, content);
    } catch (error) {
      this.#connectedManager?.fail(error);
      content = this.#content.get(record.id) ?? record.label;
    }
    const handle = this.renderPart('drag-drop-list-handle', context, {
      tag: 'tp-button',
      properties: {
        class: 'handle',
        slot: 'media',
        part: 'handle',
        type: 'button',
        variant: 'ghost',
        size: 'icon-sm',
        '.ariaLabel': `Move ${record.label}`,
        '.disabled': context.dragDisabled || preview,
        '.focusableWhenDisabled': true,
        'data-drag-disabled': context.dragDisabled,
        '.icon': gripVerticalIcon,
        '.partContracts': {
          button: {
            elementReference: preview || record.duplicate ? undefined : this.#ref(record.id, true),
          },
        },
      },
      protectedProperties: ['.partContracts'],
    });
    return html`<tp-list-item .variant=${this.variant} .size=${this.size}
      >${handle}${content}</tp-list-item
    >`;
  }
  protected override render(): unknown {
    const state = {
      orientation: this.orientation,
      disabled: this.disabled,
      readOnly: this.readOnly,
      variant: this.variant,
      size: this.size,
    };
    const content = this.controller.records.length
      ? repeat(
          this.controller.records,
          (record) => record.key,
          (record) => {
            const context = this.#context(record);
            return this.renderPart('drag-drop-list-item', context, {
              tag: 'li',
              ...(record.duplicate ? {} : { reference: this.#ref(record.id, false) }),
              properties: {
                class: 'item',
                part: 'item',
                'data-dragging': context.dragging,
                'data-dropping': context.dropping,
                'data-drop-target': context.dropTarget,
                'data-drop-disabled': context.dropDisabled,
              },
              content: this.#row(record),
            });
          },
        )
      : this.renderPart('drag-drop-list-empty', state, {
          tag: 'li',
          properties: { class: 'empty', part: 'empty' },
          content: html`<tp-empty-state
            title="No items"
            description="Items can be moved into this list."
          ></tp-empty-state>`,
        });
    return this.renderPart('drag-drop-list-list', state, {
      tag: 'ol',
      reference: (element) => {
        this.#list = element;
      },
      properties: {
        class: 'list',
        part: 'list',
        'aria-label': this.label,
        'data-drop-target': this.containerTarget?.isDropTarget ?? false,
        'data-drop-disabled': this.disabled || this.readOnly,
      },
      content,
    });
  }
  observeDragEvent(name: DragEventName, event: DragEvent): void {
    if (
      name === 'beforedragstart' &&
      event.operation.source?.data.list === this.controller &&
      this.renderOverlay
    ) {
      const record = this.#boundRecords.get(event.operation.source.id);
      const source = this.#connectedManager?.registry.draggables.get(event.operation.source.id);
      const disabled =
        typeof this.overlayDisabled === 'function'
          ? source && this.overlayDisabled(source)
          : this.overlayDisabled;
      if (record && !disabled && this.feedback !== 'none') {
        this.#clearOverlay();
        const overlay = (this.#overlay = this.ownerDocument.createElement('div'));
        this.#overlayRelease = markFeedbackRoot(overlay);
        overlay.setAttribute('part', 'overlay');
        overlay.setAttribute('inert', '');
        overlay.setAttribute('aria-hidden', 'true');
        render(
          this.renderPart('drag-drop-list-overlay', this.#context(record, true), {
            content: this.renderOverlay(record.item, this.#context(record, true)),
          }),
          overlay,
          { host: this },
        );
        this.renderRoot.append(overlay);
        this.#overlaySource = this.#sortables.get(record.id)?.draggable;
        this.#overlaySource?.update({ overlay });
      }
    }
    const observed = new CustomEvent(eventNames[name], {
      bubbles: true,
      composed: true,
      cancelable: event.cancelable,
      detail: event,
    });
    this.dispatchEvent(observed);
    if (observed.defaultPrevented) event.preventDefault();
    if (name === 'settled') {
      this.#clearOverlay();
      const id = event.operation.source?.id;
      if (
        event.operation.input === 'keyboard' &&
        id !== undefined &&
        !('key' in event.nativeEvent && event.nativeEvent.key === 'Tab') &&
        event.operation.source?.data.list === this.controller
      ) {
        const generation = event.operation.id,
          manager = this.#connectedManager;
        void manager?.renderer.rendering
          .then(() => {
            if (
              !this.isConnected ||
              manager.dragOperation.id !== generation ||
              manager.dragOperation.status !== 'idle' ||
              manager.registry.draggables.get(id)?.handle?.isConnected
            )
              return;
            const index = Math.min(
              event.operation.source?.initialIndex ?? 0,
              this.controller.records.length - 1,
            );
            const record = this.controller.records[Math.max(0, index)],
              handle = record && this.#handles.get(record.id);
            if (handle?.isConnected) handle.focus({ preventScroll: true });
            else if (this.#list) {
              this.#list.tabIndex = -1;
              this.#list.focus({ preventScroll: true });
            }
          })
          .catch((error) => manager?.reportError(error));
      }
    }
  }
  renderAccessibilityPart(
    part: 'instructions' | 'announcements',
    element: HTMLElement,
    text: string,
  ): void {
    render(this.renderPart(`drag-drop-list-${part}`, {}, { tag: 'span', content: text }), element, {
      host: this,
    });
  }
  createFeedbackPreview(id: UniqueIdentifier): HTMLElement {
    const record = this.#boundRecords.get(id);
    if (!record) throw new Error('The source item has no coherent preview.');
    const element = this.ownerDocument.createElement('li');
    element.setAttribute('part', 'placeholder');
    markFeedbackRoot(element);
    render(
      this.renderPart('drag-drop-list-placeholder', this.#context(record, true), {
        content: this.#row(record, true),
      }),
      element,
      { host: this },
    );
    return element;
  }
  #clearOverlay(): void {
    this.#overlaySource?.update({ overlay: null });
    this.#overlaySource = undefined;
    this.#overlay?.remove();
    this.#overlay = undefined;
    this.#overlayRelease?.();
    this.#overlayRelease = undefined;
  }
}
