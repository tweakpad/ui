import { mergeConfiguration } from './configuration.js';
import { createId } from '../id.js';
import { CleanupScope, Scheduler } from '../services.js';
import { GeneratedStyleResource } from '../generated-style.js';
import { OwnedAttributes } from '../owned-attributes.js';
import type { DragDropManager } from './manager.js';
import type { Draggable } from './entities.js';
import type { Announcements, DragEvent, DragEventName, ManagerOptions, Sensor } from './types.js';
import { KeyboardSensor } from './sensors/keyboard.js';

const spokenLabel = (
  data: { data: Record<string, unknown>; id: string | number } | null | undefined,
) => (typeof data?.data.label === 'string' ? data.data.label : String(data?.id ?? ''));
const label = (event: DragEvent) => spokenLabel(event.operation.source);
const defaults: Announcements = {
  dragstart: (event) => `Picked up ${label(event)}.`,
  dragover: (event) => {
    const target = event.operation.target;
    if (!target || target.id === event.operation.source?.id) return;
    return `${label(event)} over ${spokenLabel(target)}${target.index === undefined ? '' : `, position ${target.index + 1}`}.`;
  },
  dragend: (event) =>
    event.canceled
      ? `Dragging ${label(event)} canceled.`
      : `Dropped ${label(event)}${event.operation.target ? ` over ${spokenLabel(event.operation.target)}` : ''}.`,
};
/** Attributes owned on a bound activator; a native handle button keeps native button semantics. */
export function activatorAttributes(activator: {
  localName: string;
  matches(selector: string): boolean;
  hasAttribute(name: string): boolean;
}): Record<string, string> {
  const owned: Record<string, string> = {};
  if (!activator.matches('button,input,select,textarea,a[href],[tabindex]')) owned.tabindex = '0';
  if (activator.localName !== 'button' && !activator.hasAttribute('aria-roledescription'))
    owned['aria-roledescription'] = 'draggable';
  return owned;
}
interface RootResources {
  description: HTMLElement;
  announcement: HTMLElement;
  styles: GeneratedStyleResource;
  count: number;
  scheduler: Scheduler;
  cancel: (() => void) | undefined;
}
export class DragAccessibility {
  readonly #roots = new Map<Document | ShadowRoot, RootResources>();
  readonly #announcements = new Map<
    Document,
    { element: HTMLElement; styles: GeneratedStyleResource; count: number }
  >();
  readonly #scope = new CleanupScope();
  #terminalOptions: ManagerOptions | undefined;
  #terminalEvent: DragEvent | undefined;
  #source: Draggable | undefined;
  renderContent:
    | ((
        source: Draggable,
        part: 'instructions' | 'announcements',
        element: HTMLElement,
        text: string,
      ) => void)
    | undefined;
  #render(
    source: Draggable,
    part: 'instructions' | 'announcements',
    element: HTMLElement,
    text: string,
  ): void {
    if (this.renderContent) this.renderContent(source, part, element, text);
    else element.textContent = text;
  }
  constructor(readonly manager: DragDropManager) {
    for (const name of ['dragstart', 'dragover', 'dragmove'] as const)
      this.#scope.add(
        manager.monitor.addEventListener(name, (event) => {
          if (name === 'dragstart') {
            this.#terminalOptions = manager.effectiveOptions;
            this.#source = manager.dragOperation.source ?? undefined;
          }
          this.#announce(name, event);
        }),
      );
    this.#scope.add(
      manager.monitor.addEventListener('dragend', (event) => {
        this.#terminalEvent = event;
        for (const root of this.#roots.values()) {
          root.cancel?.();
          root.cancel = undefined;
        }
      }),
    );
    this.#scope.add(
      manager.monitor.addEventListener('settled', (event) => {
        this.announceTerminal(event.outcome!);
        this.#terminalOptions = undefined;
        this.#source = undefined;
      }),
    );
  }
  /** Announce the validated decision before optional visual drop completion. */
  announceTerminal(outcome: NonNullable<DragEvent['outcome']>): void {
    const event = this.#terminalEvent;
    this.#terminalEvent = undefined;
    if (event) this.#announce('dragend', { ...event, outcome, canceled: outcome !== 'committed' });
  }
  bind(source: Draggable, sensors: readonly Sensor[]): () => void {
    const options = mergeConfiguration(this.manager.options, source.serviceOptions).accessibility;
    if (options === false) return () => {};
    const activator = (source.handle ?? source.element) as HTMLElement | null;
    if (!activator) return () => {};
    // The public Button inputElementReference lets the list pass its actual native control.
    const root = activator.getRootNode() as Document | ShadowRoot;
    if (root.nodeType !== 9 && root.nodeType !== 11) return () => {};
    let resources = this.#roots.get(root);
    if (!resources) {
      const doc = activator.ownerDocument;
      const suffix = options?.id ?? createId('drag');
      const description = doc.createElement('span');
      description.id = `${options?.idPrefix?.description ?? 'tp-drag-description'}-${suffix}`;
      if (root.getElementById(description.id))
        throw new Error('Drag accessibility IDs must be unique in their owner root.');
      let shared = this.#announcements.get(doc);
      if (!shared) {
        const element = doc.createElement('span');
        element.id = `${options?.idPrefix?.announcement ?? 'tp-drag-announcement'}-${suffix}`;
        if (doc.getElementById(element.id))
          throw new Error('Drag announcement IDs must be unique in their owner document.');
        doc.body.append(element);
        const styles = new GeneratedStyleResource(activator, doc);
        styles.setText(
          '[data-tp-drag-hidden]{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}',
        );
        this.#announcements.set(doc, (shared = { element, styles, count: 0 }));
      }
      shared.count++;
      const announcement = shared.element;
      description.setAttribute('part', 'instructions');
      announcement.setAttribute('part', 'announcements');
      description.setAttribute('data-tp-drag-hidden', '');
      announcement.setAttribute('data-tp-drag-hidden', '');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.setAttribute('role', 'status');
      const parent = root.nodeType === 9 ? (root as Document).body : root;
      parent.append(description);
      const styles = new GeneratedStyleResource(activator, root);
      styles.setText(
        '[data-tp-drag-hidden]{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}',
      );
      this.#roots.set(
        root,
        (resources = {
          description,
          announcement,
          styles,
          count: 0,
          scheduler: new Scheduler(doc.defaultView ?? undefined),
          cancel: undefined,
        }),
      );
    }
    resources.count++;
    const keyboard = sensors.find(
      (sensor): sensor is KeyboardSensor => sensor instanceof KeyboardSensor && !sensor.disabled,
    );
    const codes = keyboard?.codes;
    const description =
      source.serviceOptions.instructions?.draggable ??
      this.manager.options.instructions?.draggable ??
      (codes
        ? `To pick up an item, press ${codes.start.join(' or ')}. Move with ${[...codes.up, ...codes.down, ...codes.left, ...codes.right].join(', ')}. Drop with ${codes.end.join(' or ')}; cancel with ${codes.cancel.join(' or ')}.`
        : 'Drag this item to move it.');
    this.#render(source, 'instructions', resources.description, description);
    const attributes = new OwnedAttributes(activator);
    for (const [name, value] of Object.entries(activatorAttributes(activator)))
      attributes.set(name, value);
    const id = resources.description.id;
    // Description ownership is token-level; removing our token retains later consumer additions.
    activator.setAttribute(
      'aria-describedby',
      [
        ...new Set([
          ...(activator.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean),
          id,
        ]),
      ].join(' '),
    );
    const owned = resources;
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      attributes.dispose();
      const remaining = (activator.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .filter((token) => token && token !== id);
      if (remaining.length) activator.setAttribute('aria-describedby', remaining.join(' '));
      else activator.removeAttribute('aria-describedby');
      if (!--owned.count) {
        owned.cancel?.();
        owned.scheduler.dispose();
        owned.description.remove();
        owned.styles.dispose();
        this.#roots.delete(root);
        const shared = this.#announcements.get(activator.ownerDocument);
        if (shared && !--shared.count) {
          shared.element.remove();
          shared.styles.dispose();
          this.#announcements.delete(activator.ownerDocument);
        }
      }
    };
  }
  #announce(name: DragEventName, event: DragEvent): void {
    const options =
      name === 'dragend'
        ? (this.#terminalOptions ?? this.manager.effectiveOptions)
        : this.manager.effectiveOptions;
    if (options.accessibility === false) return;
    const callback = {
      ...defaults,
      ...this.manager.options.announcements,
      ...options.announcements,
    }[name as keyof Announcements];
    const message = callback?.(event, this.manager);
    const debounce = options.accessibility?.debounce ?? 500;
    if (!Number.isFinite(debounce) || debounce < 0)
      throw new RangeError('Announcement debounce must be finite and nonnegative.');
    const announced = new Set<HTMLElement>();
    for (const resources of this.#roots.values()) {
      resources.cancel?.();
      resources.cancel = undefined;
      if (announced.has(resources.announcement)) continue;
      announced.add(resources.announcement);
      if (message === undefined) continue;
      const id = event.operation.id;
      const write = () => {
        if (name === 'dragend' || this.manager.dragOperation.id === id) {
          const source = this.#source ?? this.manager.dragOperation.source;
          if (source) this.#render(source, 'announcements', resources.announcement, message);
        }
      };
      if (name === 'dragstart' || name === 'dragend') write();
      else resources.cancel = resources.scheduler.timeout(write, debounce);
    }
  }
  destroy(): void {
    this.#scope.dispose();
    for (const root of this.#roots.values()) {
      root.scheduler.dispose();
      root.styles.dispose();
      root.description.remove();
    }
    this.#roots.clear();
    for (const shared of this.#announcements.values()) {
      shared.element.remove();
      shared.styles.dispose();
    }
    this.#announcements.clear();
  }
}
