import { css, type PropertyDeclarations, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import type {
  TapGesturePointer,
  TapGestureRegion,
  TapGestureType,
} from '../../foundation/tap-gestures.js';
import type { MediaRequestAction } from '../../foundation/media/requests.js';
import { TpMediaElement, type MediaPlayerApi } from './context.js';
import type { MediaGestureInput } from './gestures.js';
import type { MediaHotkeyInput } from './hotkeys.js';

/** Registration surface the bindings need (implemented by `TpMediaPlayer`). */
interface BindingRegistry {
  registerHotkey?(source: MediaHotkeyInput & object): () => void;
  registerGesture?(source: MediaGestureInput & object): () => void;
  refreshBindings?(): void;
}

const nonVisual = css`
  :host {
    display: none !important;
  }
`;

const numberOrNull = {
  fromAttribute(value: string | null): number | null {
    if (value === null || value.trim() === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  },
  toAttribute(value: number | null): string | null {
    return value === null ? null : String(value);
  },
};

/** Shared registration lifecycle: register with the player while connected, refresh on change. */
abstract class MediaBindingElement extends TpMediaElement {
  static override styles = [TpElement.styles, nonVisual];
  #registered: { player: MediaPlayerApi; release: () => void } | undefined;

  protected abstract registerWith(registry: BindingRegistry): (() => void) | undefined;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#registered?.release();
    this.#registered = undefined;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    const player = this.player;
    if (this.#registered?.player !== player) {
      this.#registered?.release();
      this.#registered = undefined;
      const release = player ? this.registerWith(player as BindingRegistry) : undefined;
      if (player && release) this.#registered = { player, release };
    } else (player as BindingRegistry | null)?.refreshBindings?.();
  }

  protected override render() {
    return null;
  }
}

/**
 * `tp-media-hotkey`: a declarative key binding for its player (Library mp-l-bindings). `keys` is
 * a key pattern (comma-separated alternatives, `Mod`, `Space`, `0-9`), `action` a media request
 * action, and `value` overrides the action's default value (the root `seek-step` for `seek-by`,
 * `volume-step` for `step-volume`). A binding with the same keys as a default overrides it; a
 * `disabled` one only suppresses that default. Non-visual.
 */
export class TpMediaHotkey extends MediaBindingElement implements MediaHotkeyInput {
  static tagName = 'tp-media-hotkey';

  static override properties: PropertyDeclarations = {
    ...TpMediaElement.properties,
    keys: { type: String },
    action: { type: String },
    value: { attribute: 'value', converter: numberOrNull },
  };

  keys = '';
  action: MediaRequestAction | '' = '';
  value: number | null = null;

  protected registerWith(registry: BindingRegistry): (() => void) | undefined {
    return registry.registerHotkey?.(this);
  }
}

/**
 * `tp-media-gesture`: a declarative tap gesture for its player (Library mp-l-bindings). `type`
 * is `tap` or `doubletap`; `pointer` restricts it to `mouse`, `touch` or `pen`; `region` to the
 * `left`, `center` or `right` part of the container. A gesture with the same type, pointer and
 * region as a default replaces it; a `disabled` one still claims its taps. Non-visual.
 */
export class TpMediaGesture extends MediaBindingElement implements MediaGestureInput {
  static tagName = 'tp-media-gesture';

  static override properties: PropertyDeclarations = {
    ...TpMediaElement.properties,
    type: { type: String },
    action: { type: String },
    value: { attribute: 'value', converter: numberOrNull },
    pointer: { type: String },
    region: { type: String },
  };

  type: TapGestureType = 'tap';
  action: MediaRequestAction | '' = '';
  value: number | null = null;
  pointer: TapGesturePointer | null = null;
  region: TapGestureRegion | null = null;

  protected registerWith(registry: BindingRegistry): (() => void) | undefined {
    return registry.registerGesture?.(this);
  }
}
