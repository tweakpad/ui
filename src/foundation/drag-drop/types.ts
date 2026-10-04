import type { DragDropManager } from './manager.js';
import type { Draggable, Droppable } from './entities.js';
import type { Alignment, Coordinates, Rectangle } from './geometry.js';
import type { Collision, CollisionDetector } from './collision.js';
import type { ModifierConfiguration } from './modifiers.js';
import type { UniqueIdentifier } from './sorting.js';

export type Data = Record<string, unknown>;
export type EntityType = string | number | symbol;
export type DragStatus =
  'idle' | 'initialization-pending' | 'initializing' | 'dragging' | 'dropped';
export type DragOutcome = 'committed' | 'canceled' | 'rejected';
export type FeedbackMode = 'default' | 'clone' | 'move' | 'none';
export interface Transition {
  duration?: number;
  easing?: string;
}
export interface SortTransition extends Transition {
  idle?: boolean;
}
export interface DropAnimationContext {
  source: Draggable;
  originalElement: Element;
  feedbackElement: Element;
  placeholder: Element | null;
  translate: Coordinates;
  moved: boolean;
}
export type DropAnimation =
  Transition | ((context: DropAnimationContext) => void | Promise<void>) | null;
export interface FeedbackOptions {
  feedback?: FeedbackMode | ((source: Draggable, manager: DragDropManager) => FeedbackMode);
  rootElement?: Element | ((source: Draggable) => Element);
  overlay?: Element | null;
  overlayDisabled?: boolean | ((source: Draggable) => boolean);
  dropAnimation?: DropAnimation;
  keyboardTransition?: Transition | null;
}
export interface AccessibilityOptions {
  id?: string;
  idPrefix?: { description?: string; announcement?: string };
  debounce?: number;
}
export type AutoScroll = boolean | { acceleration?: number; threshold?: number | Coordinates };
export interface Sensor {
  disabled?: boolean;
  bind(source: Draggable): () => void;
  destroy?(): void;
}
export type SensorFactory = (manager: DragDropManager) => Sensor;
export type SensorInput = Sensor | SensorFactory;
export type SensorConfiguration =
  readonly SensorInput[] | ((defaults: readonly SensorInput[]) => readonly SensorInput[]);
export interface Renderer {
  readonly rendering: Promise<void>;
}
export interface EntitySnapshot {
  readonly id: UniqueIdentifier;
  readonly data: Data;
  readonly type: EntityType | undefined;
  readonly element: Element | null;
  readonly index?: number;
  readonly group?: UniqueIdentifier | undefined;
  readonly initialIndex?: number;
  readonly initialGroup?: UniqueIdentifier | undefined;
  readonly container?: boolean;
  readonly shape?: Rectangle | undefined;
}
export interface OperationSnapshot {
  readonly id: number;
  readonly status: DragStatus;
  readonly source: EntitySnapshot | null;
  readonly target: EntitySnapshot | null;
  readonly position: {
    readonly initial: Coordinates;
    readonly current: Coordinates;
    readonly previous: Coordinates | undefined;
    readonly delta: Coordinates;
    readonly direction: 'left' | 'right' | 'up' | 'down' | null;
    readonly velocity: Coordinates;
  };
  readonly transform: Coordinates;
  readonly shape: {
    initial: Rectangle;
    current: Rectangle;
    previous: Rectangle | undefined;
  } | null;
  readonly activatorEvent: Event | null;
  readonly input: 'pointer' | 'keyboard' | 'imperative';
  readonly canceled: boolean;
}
export interface Suspension {
  resume(): void;
  abort(): void;
}
export interface DragEvent {
  readonly operation: OperationSnapshot;
  readonly cancelable: boolean;
  readonly defaultPrevented: boolean;
  preventDefault(): void;
  readonly nativeEvent: Event;
  readonly to?: Coordinates;
  readonly by?: Coordinates;
  readonly collisions?: readonly Collision[];
  readonly canceled?: boolean;
  readonly outcome?: DragOutcome;
  suspend(): Suspension;
}
export type DragEventName =
  'beforedragstart' | 'dragstart' | 'dragmove' | 'collision' | 'dragover' | 'dragend' | 'settled';
export type DragListener = (event: DragEvent, manager: DragDropManager) => void;
export type Announcements = Partial<
  Record<
    'dragstart' | 'dragend' | 'dragmove' | 'dragover',
    (event: DragEvent, manager: DragDropManager) => string | undefined
  >
>;
export interface ManagerOptions extends FeedbackOptions {
  sensors?: SensorConfiguration;
  modifiers?: ModifierConfiguration;
  renderer?: Renderer;
  autoScroll?: AutoScroll;
  accessibility?: AccessibilityOptions | false;
  instructions?: { draggable: string };
  announcements?: Announcements;
}
export interface StartInput {
  source: Draggable | UniqueIdentifier;
  coordinates: Coordinates;
  event?: Event;
  input?: 'pointer' | 'keyboard' | 'imperative';
}
export interface MoveInput {
  to?: Coordinates;
  by?: Coordinates;
  event?: Event;
  cancelable?: boolean;
  propagate?: boolean;
}
export interface StopInput {
  event?: Event;
  canceled?: boolean;
}
export interface EntityInput {
  id: UniqueIdentifier;
  data?: Data;
  type?: EntityType;
  disabled?: boolean;
  element?: Element | null;
  register?: boolean;
  effects?: () => Array<() => void | (() => void)>;
}
export interface DraggableInput extends EntityInput, FeedbackOptions {
  handle?: Element | null;
  sensors?: SensorConfiguration;
  modifiers?: ModifierConfiguration;
  alignment?: Alignment;
  autoScroll?: AutoScroll;
  accessibility?: AccessibilityOptions | false;
  instructions?: { draggable: string };
  announcements?: Announcements;
}
export interface DroppableInput extends EntityInput {
  accept?: EntityType | readonly EntityType[] | ((source: Draggable) => boolean);
  collisionDetector?: CollisionDetector;
  collisionPriority?: number;
}
export type Accept = DroppableInput['accept'];
export type RegisteredEntity = Draggable | Droppable;
