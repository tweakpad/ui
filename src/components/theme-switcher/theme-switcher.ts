import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import type { ChangeReason } from '../../foundation/types.js';
import {
  colorSchemeStore,
  DEFAULT_COLOR_SCHEME_STORAGE_KEY,
  isColorSchemePreference,
  type ColorSchemePreference,
  type ColorSchemeStore,
  type ResolvedColorScheme,
} from '../../foundation/color-scheme.js';
import {
  prepareMotion,
  type MotionHandle,
  type MotionRoleDefinition,
  stateRole,
} from '../../foundation/motion.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { themeSwitcherPresentation } from '../../presentation/families/theme-switcher.js';
import { TpSwitch } from '../switch/index.js';
import { TpButton } from '../button/button.js';
import { TpToggleGroup } from '../toggle-group/index.js';
import { TpToggle } from '../toggle/toggle.js';
import { TpIcon } from '../icon/icon.js';
import { sunIcon } from '../../icons/sun.js';
import { moonIcon } from '../../icons/moon.js';
import { monitorIcon } from '../../icons/monitor.js';
import type { IconDefinition } from '../../icons/types.js';
import type { ThemeSwitcherSize, ThemeSwitcherState, ThemeSwitcherVariant } from './types.js';
import {
  nextThemePreference,
  themeCycle as cycle,
  themeNames as names,
  themeOptions as options,
} from './preferences.js';

export const themeSwitcherMotionRoles = {
  icon: stateRole('icon'),
} as const satisfies Record<string, MotionRoleDefinition>;

const icons: Record<ColorSchemePreference, IconDefinition> = {
  light: sunIcon,
  dark: moonIcon,
  system: monitorIcon,
};

/**
 * A light/dark/system preference control bound to the shared Color scheme preference store.
 * It composes Switch, Button or Toggle group; the store applies the preference to its target.
 */
export class TpThemeSwitcher extends TpElement {
  static tagName = 'tp-theme-switcher';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpSwitch, TpButton, TpToggleGroup, TpToggle, TpIcon];
  }
  static override presentation = themeSwitcherPresentation;
  static override properties = {
    ...TpElement.properties,
    variant: { type: String, reflect: true },
    value: { noAccessor: true },
    defaultValue: { attribute: 'default-value' },
    onValueChange: { attribute: false },
    storageKey: { attribute: 'storage-key' },
    target: { attribute: false },
    size: { type: String, reflect: true },
    label: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;
      }

      .icons {
        display: grid;
        place-items: center;
      }

      .icons > tp-icon {
        grid-area: 1 / 1;
      }

      [data-tp-motion-driven] > tp-icon {
        transition: none !important;
      }
    `,
  ];

  variant: ThemeSwitcherVariant = 'switch';
  defaultValue: ColorSchemePreference | undefined;
  onValueChange: ((event: TpValueChangeEvent<ColorSchemePreference>) => void) | undefined;
  /** Local storage key; `null` disables persistence. */
  storageKey: string | null = DEFAULT_COLOR_SCHEME_STORAGE_KEY;
  /** The element the preference applies to; the document root by default. */
  target: HTMLElement | null = null;
  size: ThemeSwitcherSize = 'default';
  label = '';

  #provided: ColorSchemePreference | undefined;
  #store: ColorSchemeStore | null = null;
  #release: (() => void) | null = null;
  #unsubscribe: (() => void) | null = null;
  #motion: MotionHandle | null = null;
  #shown: ColorSchemePreference | null = null;

  #state = new ControllableState<ColorSchemePreference>({
    host: this,
    initialValue: 'system',
    readControlledValue: () => this.#provided,
    readDefaultValue: () =>
      this.#store?.stored
        ? this.#store.preference
        : (this.#validDefault() ?? this.#store?.preference ?? 'system'),
    hasDefaultValue: () => this.defaultValue !== undefined,
    onChange: (event) => this.onValueChange?.(event),
    onCommit: (value, _previous, reason) => this.#apply(value, reason),
  });

  /** The selected preference. */
  get value(): ColorSchemePreference {
    return this.#state.value;
  }
  set value(value: ColorSchemePreference | undefined) {
    const previous = this.#provided;
    this.#provided = isColorSchemePreference(value) ? value : undefined;
    this.requestUpdate('value', previous);
    if (this.hasUpdated) this.#state.sync();
  }
  /** The scheme the preference resolves to on its target. */
  get resolvedTheme(): ResolvedColorScheme {
    return this.#store?.resolved ?? 'light';
  }

  #validDefault(): ColorSchemePreference | undefined {
    return isColorSchemePreference(this.defaultValue) ? this.defaultValue : undefined;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // The first update binds, so a target assigned before it is honored.
    if (this.hasUpdated) this.#bind();
  }
  override disconnectedCallback(): void {
    this.#unbind();
    this.#motion?.cancel();
    this.#motion = null;
    super.disconnectedCallback();
  }

  #bind(): void {
    const target = this.target ?? this.ownerDocument.documentElement;
    const store = colorSchemeStore(target, { storageKey: this.storageKey });
    if (store === this.#store) return;
    this.#unbind();
    this.#store = store;
    this.#release = store.retain();
    this.#unsubscribe = store.subscribe((state) => {
      // Other controls, other browsing contexts and the device update an uncontrolled control.
      if (!this.#state.controlled) this.#state.reconcile(state.preference, 'programmatic');
      this.requestUpdate();
    });
    // A new target or key brings its own preference to an uncontrolled control.
    if (this.hasUpdated && !this.#state.controlled)
      this.#state.reconcile(store.preference, 'programmatic');
  }
  #unbind(): void {
    this.#unsubscribe?.();
    this.#release?.();
    this.#unsubscribe = this.#release = null;
    this.#store = null;
  }

  #apply(preference: ColorSchemePreference, reason: ChangeReason): void {
    this.#store?.set(preference, reason, { exempt: [this] });
  }

  #resolve(preference: ColorSchemePreference): ResolvedColorScheme {
    if (preference !== 'system') return preference;
    const view = this.ownerDocument.defaultView;
    return view?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  #request(next: ColorSchemePreference, reason: ChangeReason, sourceEvent?: Event): void {
    if (this.disabled) return;
    this.#state.set(next, reason, sourceEvent, { metadata: { resolved: this.#resolve(next) } });
  }

  #switchChange = (event: TpValueChangeEvent<boolean>): void => {
    // The composed control's proposal becomes this control's proposal, not a second event.
    event.stopPropagation();
    event.preventDefault();
    this.#request(event.detail.value ? 'dark' : 'light', event.detail.reason, event);
  };
  #buttonClick = (event: MouseEvent): void => {
    this.#request(
      nextThemePreference(this.value),
      event.detail === 0 ? 'keyboard' : 'pointer',
      event,
    );
  };
  #groupChange = (event: TpValueChangeEvent<string[]>): void => {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    // A single-selection group can propose clearing; a preference is always selected.
    event.preventDefault();
    const next = event.detail.value[0];
    if (isColorSchemePreference(next)) this.#request(next, event.detail.reason, event);
  };

  /** The icon the control currently shows: the resolved scheme for Switch, else the preference. */
  #displayed(): ColorSchemePreference | null {
    if (this.variant === 'group') return null;
    return this.variant === 'button' ? this.value : this.resolvedTheme;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (this.isConnected && (!this.#store || changed.has('target') || changed.has('storageKey')))
      this.#bind();
    this.#state.initialize();
    // A controlled value, or a default with nothing persisted, is applied to the shared store.
    if (this.#store && this.#store.preference !== this.value)
      this.#store.set(this.value, 'programmatic', { exempt: [this] });
    const shown = this.#displayed();
    if (this.#shown !== null && shown !== null && shown !== this.#shown) {
      this.#motion?.cancel();
      this.#motion = prepareMotion(
        this,
        this.renderRoot.querySelector<HTMLElement>('.icons'),
        themeSwitcherMotionRoles.icon,
        { phase: 'change', fromState: this.#shown, toState: shown },
      );
    }
    this.#shown = shown;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#motion?.start();
    this.#motion = null;
  }

  #switchName = '';
  #switchContracts = {};
  /** Names the Switch's semantic Control directly; a host `aria-label` has no role to name. */
  #switchContract(name: string) {
    if (name !== this.#switchName) {
      this.#switchName = name;
      this.#switchContracts = { switch: { hostProperties: { 'aria-label': name } } };
    }
    return this.#switchContracts;
  }

  #icons(shown: readonly ColorSchemePreference[], active: ColorSchemePreference) {
    return html`<span class="icons" slot=${this.variant === 'switch' ? 'thumb' : 'icon-start'}
      >${shown.map(
        (preference) =>
          html`<tp-icon
            .icon=${icons[preference]}
            data-preference=${preference}
            ?data-active=${preference === active}
            aria-hidden="true"
          ></tp-icon>`,
      )}</span
    >`;
  }

  protected override render() {
    const state: ThemeSwitcherState = Object.freeze({
      variant: this.variant,
      size: this.size,
      preference: this.value,
      resolved: this.resolvedTheme,
      disabled: this.disabled,
    });
    if (state.variant === 'group')
      return html`<tp-toggle-group
        variant="outline"
        size=${state.size}
        spacing="0"
        label=${this.label || 'Theme'}
        ?disabled=${state.disabled}
        .value=${[state.preference]}
        data-preference=${state.preference}
        @tp-value-change=${this.#groupChange}
        >${options.map(
          (preference) =>
            html`<tp-toggle value=${preference} aria-label=${names[preference]}
              ><tp-icon
                .icon=${icons[preference]}
                data-preference=${preference}
                data-active
                aria-hidden="true"
              ></tp-icon
            ></tp-toggle>`,
        )}</tp-toggle-group
      >`;
    if (state.variant === 'button') {
      const next = nextThemePreference(state.preference);
      return html`<tp-button
        variant="ghost"
        size=${state.size === 'sm' ? 'icon-sm' : 'icon'}
        aria-label=${`${this.label || 'Theme'}: ${names[state.preference]}`}
        title=${`Switch to ${names[next].toLowerCase()} theme`}
        ?disabled=${state.disabled}
        data-preference=${state.preference}
        @click=${this.#buttonClick}
        >${this.#icons(cycle, state.preference)}</tp-button
      >`;
    }
    return html`<tp-switch
      size=${state.size}
      .partContracts=${this.#switchContract(this.label || 'Dark mode')}
      .checked=${state.resolved === 'dark'}
      ?disabled=${state.disabled}
      data-preference=${state.preference}
      @tp-value-change=${this.#switchChange}
      >${this.#icons(['light', 'dark'], state.resolved)}</tp-switch
    >`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-theme-switcher': TpThemeSwitcher;
  }
}
