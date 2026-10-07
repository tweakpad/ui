import type { ReactiveControllerHost } from 'lit';
import { PresenceController } from '../../foundation/presence.js';
import { DisclosurePanelController } from '../../foundation/disclosure-panel.js';

export const GROUP_EXTENT = {
  block: '--tree-view-group-height',
  inline: '--tree-view-group-width',
};

/**
 * Records mode renders flat rows. A single expansion or collapse wraps the rows that enter or
 * leave in a transient region driven by the shared disclosure owner (Foundation §17.8 motion),
 * the same measured presence and motion roles a markup Group uses.
 */
export class TreeSegment {
  phase: 'enter' | 'exit';
  /** Rows shown inside: inserted rows while entering, a snapshot while leaving. */
  ids: readonly string[];
  readonly parentId: string;
  readonly presence: PresenceController;
  readonly panel: DisclosurePanelController;
  #element: HTMLElement | null = null;
  #started = false;
  /** The open extent has been measured from rendered rows. */
  #ready = false;

  constructor(
    host: ReactiveControllerHost & HTMLElement,
    parentId: string,
    ids: readonly string[],
    phase: 'enter' | 'exit',
    level: number,
    onDone: (segment: TreeSegment) => void,
  ) {
    this.parentId = parentId;
    this.ids = ids;
    this.phase = phase;
    this.presence = new PresenceController(host, {
      surface: () => this.#element,
      onStateChange: (state) => this.panel.sync(state),
      onComplete: (present) => {
        if (present === (this.phase === 'enter')) onDone(this);
      },
    });
    this.panel = new DisclosurePanelController(host, {
      owner: () => this.#element ?? host,
      panel: () => this.#element,
      body: () => this.#element?.firstElementChild as HTMLElement | null,
      context: () => ({ itemId: parentId, level }),
      trackCompletion: (completion) => this.presence.trackCompletion(completion),
      extent: GROUP_EXTENT,
    });
    // A leaving region starts open so its extent can be measured before it collapses.
    if (phase === 'exit') this.presence.settle(true);
  }

  get state(): string {
    return this.presence.state;
  }

  /** Called after the render that mounted the region element. */
  attach(element: HTMLElement | null): void {
    this.#element = element;
    if (!element) return;
    if (this.#started) {
      if (this.#ready) this.panel.observe();
      return;
    }
    this.#started = true;
    if (this.phase === 'enter') {
      this.#ready = true;
      this.panel.observe();
      this.presence.setPresent(true);
      return;
    }
    // A leaving region holds re-created rows: let them render, measure the open extent and lay
    // it out before collapsing, so the collapse starts from the full height.
    const rows = [...element.querySelectorAll('*')].filter(
      (node): node is Element & { updateComplete: Promise<unknown> } => 'updateComplete' in node,
    );
    void Promise.all(rows.map((row) => row.updateComplete)).then(() => {
      if (this.#element !== element || this.phase !== 'exit') return;
      this.#ready = true;
      this.panel.observe();
      void element.offsetHeight;
      this.presence.setPresent(false);
    });
  }

  /** Rapid reversal: the same region turns around from its current extent. */
  reverse(phase: 'enter' | 'exit', ids: readonly string[]): void {
    this.phase = phase;
    this.ids = ids;
    this.presence.setPresent(phase === 'enter');
  }

  destroy(): void {
    this.panel.destroy();
    this.presence.destroy();
    this.#element = null;
  }
}
