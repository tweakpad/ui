/**
 * The table-controls session of the text editor (`uwg-te-req-tables-7`, `uwg-te-req-tables-4`,
 * `uwg-te-tab-keymap-host-r2`, `-r3`, `-r10`): Alt+F10 with the caret or a cell range in a table
 * moves focus to the table chrome, on the cell handle when a range exists, else on the column
 * grip. While it lasts the grips, the cell handle, the resize separator and the quick-add Buttons
 * take `tabindex=0`, so Tab and Shift+Tab move through them in document order and then out of the
 * widget's chrome, with no trap; Escape returns focus to the editing root with its selection; Alt+F10
 * again moves on to the next contextual controls. Leaving restores `tabindex=-1`.
 */
import { deepActiveElement } from '../../../foundation/focus.js';
import type { TextEditorContextualSurface } from '../focus.js';

/** The cycle position of the session: after the selection toolbar, before the gutter. */
export const TABLE_CONTROLS_ORDER = 1;

/** What the session needs from the chrome. */
export interface TableControlsChrome {
  /** Whether the session shows the chrome; setting it re-renders the controls' tab stops. */
  session: boolean;
  /** The control to start on, or null when none shows. */
  sessionStart(): HTMLElement | null;
  /** Reveals a control before the next pass places it. */
  reveal(element: HTMLElement): void;
  /** Whether a node is inside the chrome. */
  contains(node: Node | null): boolean;
  /** Called for keys on the chrome's controls. */
  keyHandler: ((event: KeyboardEvent) => void) | null;
  /** Called when focus leaves a node of the chrome. */
  focusOutHandler: ((event: FocusEvent) => void) | null;
}

export interface TableControlsHost {
  readonly element: HTMLElement;
  readonly chrome: TableControlsChrome;
  /**
   * Whether the session applies: the caret or a cell range in a table, neither read-only nor
   * disabled, and the editor ready.
   */
  applicable(): boolean;
  /** Focuses the editing root with its selection. */
  focusEditing(): void;
  /** Alt+F10 on a control: the next contextual controls. */
  cycle(sourceEvent: Event): void;
  /** Resolves once the element rendered the session's tab stops. */
  rendered(): Promise<unknown>;
}

/** Whether a key leaves the session for the editing root (Escape, unmodified). */
export function endsTableControls(
  event: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>,
): boolean {
  return event.key === 'Escape' && !event.altKey && !event.ctrlKey && !event.metaKey;
}

/** Whether a key is Alt+F10, which cycles the contextual controls. */
export function cyclesContextualControls(
  event: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey'>,
): boolean {
  return event.key === 'F10' && event.altKey && !event.ctrlKey && !event.metaKey;
}

/** The session, an Alt+F10 contextual surface. */
export class TextEditorTableControls implements TextEditorContextualSurface {
  readonly order = TABLE_CONTROLS_ORDER;
  readonly #host: TableControlsHost;
  #active = false;
  /** Bumped by every start and end, so that a stale start does not take focus. */
  #generation = 0;

  constructor(host: TableControlsHost) {
    this.#host = host;
    host.chrome.keyHandler = (event) => this.#keyDown(event);
    host.chrome.focusOutHandler = (event) => this.focusOut(event);
  }

  get active(): boolean {
    return this.#active;
  }

  applicable(): boolean {
    return this.#host.applicable();
  }

  holdsFocus(): boolean {
    const document = this.#host.element.ownerDocument;
    return this.#active && this.#host.chrome.contains(deepActiveElement(document));
  }

  /** Starts the session and focuses its start control once rendered; false when it cannot. */
  enter(): boolean {
    if (!this.applicable()) return false;
    this.#active = true;
    const generation = ++this.#generation;
    this.#host.chrome.session = true;
    void this.#host.rendered().then(() => {
      if (generation !== this.#generation || !this.#active) return;
      const start = this.#host.chrome.sessionStart();
      if (!start) {
        this.end();
        return;
      }
      this.#host.chrome.reveal(start);
      // Alt+F10 moved focus by keyboard: show the indicator, which a modifier chord does not.
      start.focus({ preventScroll: true, focusVisible: true });
    });
    return true;
  }

  leave(): void {
    this.end();
  }

  /** Ends the session: the controls leave the Tab sequence. */
  end(): void {
    if (!this.#active) return;
    this.#active = false;
    this.#generation++;
    this.#host.chrome.session = false;
  }

  /**
   * Focus left a session control: the session ends unless focus moved to another chrome node
   * (another control or an open menu of the chrome).
   */
  focusOut(event: FocusEvent): void {
    if (!this.#active) return;
    const next = event.relatedTarget as Node | null;
    if (next && this.#host.chrome.contains(next)) return;
    this.end();
  }

  #keyDown(event: KeyboardEvent): void {
    if (cyclesContextualControls(event)) {
      event.preventDefault();
      event.stopPropagation();
      this.#host.cycle(event);
      return;
    }
    if (!this.#active || !endsTableControls(event)) return;
    event.preventDefault();
    event.stopPropagation();
    this.end();
    this.#host.focusEditing();
  }
}
