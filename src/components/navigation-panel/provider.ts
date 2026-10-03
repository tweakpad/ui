import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { ControllableState } from '../../foundation/controllable-state.js';
import { SurfaceState } from '../../foundation/surface-state.js';
import { CleanupScope } from '../../foundation/services.js';
import { ObservableStore } from '../../foundation/store.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import type { ChangeReason } from '../../foundation/types.js';
import type { TpSurfaceOpenChangeEvent } from '../../foundation/surface-state.js';
import type {
  NavigationPanelCollapseMode,
  NavigationPanelCompactOpenChangeCallback,
  NavigationPanelExpandedChangeCallback,
  NavigationPanelPersistenceAdapter,
  NavigationPanelResponsiveAdapter,
  NavigationPanelShortcut,
  NavigationPanelShortcutAdapter,
  NavigationPanelSide,
  NavigationPanelState,
  NavigationPanelVariant,
} from './types.js';
export interface NavigationPanelProviderHost extends HTMLElement, ReactiveControllerHost {
  readonly controlledExpanded: boolean | undefined;
  readonly defaultExpanded: boolean;
  readonly hasExpandedDefault: boolean;
  readonly compact: boolean | undefined;
  readonly side: NavigationPanelSide;
  readonly collapseMode: NavigationPanelCollapseMode;
  readonly variant: NavigationPanelVariant;
  readonly responsiveAdapter: NavigationPanelResponsiveAdapter | undefined;
  readonly shortcutAdapter: NavigationPanelShortcutAdapter | undefined;
  readonly shortcut: NavigationPanelShortcut | undefined;
  readonly persistenceAdapter: NavigationPanelPersistenceAdapter | undefined;
  readonly persistenceKey: string | undefined;
  readonly onExpandedChange: NavigationPanelExpandedChangeCallback | undefined;
  readonly onCompactOpenChange: NavigationPanelCompactOpenChangeCallback | undefined;
  reportProviderDiagnostic(code: string, message: string): void;
}
/** One transparent provider; shared state owners retain proposal, commit and lifecycle rules. */
export class NavigationPanelProvider implements ReactiveController {
  readonly #wide: ControllableState<boolean>;
  readonly #surface: SurfaceState;
  readonly #store: ObservableStore<NavigationPanelState>;
  #scope: CleanupScope | undefined;
  #responsive = false;
  #sessionEdits = 0;
  readonly #loadedSources = new WeakSet<Event>();
  #loadingProposal = false;
  #boundaryClosing = false;
  #generation = 0;
  #configuration: readonly unknown[] = [];
  constructor(readonly host: NavigationPanelProviderHost) {
    this.#wide = new ControllableState({
      host,
      initialValue: true,
      readControlledValue: () => host.controlledExpanded,
      readDefaultValue: () => host.defaultExpanded,
      hasDefaultValue: () => host.hasExpandedDefault,
      onChange: (event) => {
        this.#loadingProposal = Boolean(
          event.detail.sourceEvent && this.#loadedSources.has(event.detail.sourceEvent),
        );
        host.onExpandedChange?.(event);
      },
      onCommit: (expanded, _previous, reason) => {
        const loaded = this.#loadingProposal;
        this.#loadingProposal = false;
        if (!loaded) {
          this.#sessionEdits++;
          this.#persist(expanded);
        }
        this.#publish(reason);
      },
      diagnostic: (message) =>
        host.reportProviderDiagnostic('navigation-panel-state-mode', message),
    });
    this.#surface = new SurfaceState({
      read: () => undefined,
      defaultOpen: () => false,
      dispatch: (event) => {
        if (this.#boundaryClosing) return;
        host.onCompactOpenChange?.(event);
        host.dispatchEvent(event);
      },
      commit: () => this.#publish('programmatic'),
      diagnostic: (message) =>
        host.reportProviderDiagnostic('navigation-panel-compact-state', message),
    });
    this.#surface.initialize();
    this.#store = new ObservableStore(this.#snapshot());
    host.addController(this);
  }
  get state(): NavigationPanelState {
    return this.#store.value;
  }
  get expanded(): boolean {
    return this.#wide.value;
  }
  get compactOpen(): boolean {
    return this.#surface.open;
  }
  get compact(): boolean {
    return this.host.compact ?? this.#responsive;
  }
  subscribe(listener: (state: NavigationPanelState) => void, emitCurrent = true): () => void {
    return this.#store.subscribe(({ value }) => listener(value), emitCurrent);
  }
  setExpanded(expanded: boolean, reason: ChangeReason = 'programmatic', source?: Event): boolean {
    if (!this.compact && this.host.collapseMode === 'none') return false;
    return this.#wide.set(Boolean(expanded), reason, source);
  }
  publishExpanded(): void {
    this.#wide.sync();
    this.#publish('programmatic');
  }
  setCompactOpen(
    open: boolean,
    reason: ChangeReason = 'programmatic',
    source?: Event,
    trigger?: Element,
  ): boolean {
    if (!this.compact && open) return false;
    const before = this.#surface.open;
    this.#surface.request(Boolean(open), reason, source, trigger);
    return this.#surface.open !== before;
  }
  toggle(reason: ChangeReason = 'trigger-press', source?: Event, trigger?: Element): boolean {
    return this.compact
      ? this.setCompactOpen(!this.compactOpen, reason, source, trigger)
      : this.setExpanded(!this.expanded, reason, source);
  }
  /** Drawer proposals bridge into this sole compact owner, rather than another preference. */
  requestFromDrawer(event: TpSurfaceOpenChangeEvent): void {
    this.setCompactOpen(
      event.detail.value,
      event.detail.reason,
      event.detail.sourceEvent,
      event.detail.trigger,
    );
  }
  hostConnected(): void {
    this.#wide.initialize();
    this.#configure();
    this.#publish('programmatic');
  }
  hostUpdate(): void {
    this.#configure();
    this.#publish('programmatic');
  }
  hostDisconnected(): void {
    this.#scope?.dispose();
    this.#scope = undefined;
    this.#configuration = [];
    this.#generation++;
    this.#closeBoundary();
  }
  #snapshot(): NavigationPanelState {
    return Object.freeze({
      expanded: this.#wide.value,
      collapsed: !this.#wide.value,
      compact: this.compact,
      compactOpen: this.#surface.open,
      side: this.host.side,
      collapseMode: this.host.collapseMode,
      variant: this.host.variant,
    });
  }
  #publish(reason: ChangeReason): void {
    const next = this.#snapshot();
    const previous = this.#store.value;
    if (Object.keys(next).every((key) => Object.is(next[key], previous[key]))) return;
    this.#store.set(next, reason);
    this.host.requestUpdate();
  }
  #closeBoundary(): void {
    if (!this.#surface.open) return;
    this.#boundaryClosing = true;
    try {
      this.#surface.request(false, 'programmatic');
    } finally {
      this.#boundaryClosing = false;
    }
  }
  #resolveCompact(): void {
    if (this.compact !== this.#store.value.compact) this.#closeBoundary();
    this.#publish('programmatic');
  }
  #configure(): void {
    if (!this.host.isConnected) return;
    const { responsiveAdapter, shortcutAdapter, shortcut, persistenceAdapter, persistenceKey } =
      this.host;
    if (this.host.compact === undefined && !responsiveAdapter)
      this.host.reportProviderDiagnostic(
        'navigation-panel-responsive-source',
        'Supply compact explicitly or provide responsiveAdapter; the Provider cannot choose an application breakpoint.',
      );
    const next = [responsiveAdapter, shortcutAdapter, shortcut, persistenceAdapter, persistenceKey];
    if (this.#scope && next.every((value, index) => value === this.#configuration[index])) {
      this.#resolveCompact();
      return;
    }
    this.#scope?.dispose();
    this.#scope = new CleanupScope();
    this.#configuration = next;
    const generation = ++this.#generation;
    const current = () => generation === this.#generation && this.host.isConnected;
    this.#responsive = false;
    try {
      if (responsiveAdapter)
        this.#scope.add(
          responsiveAdapter.observe(this.host, (compact) => {
            if (!current()) return;
            this.#responsive = Boolean(compact);
            this.#resolveCompact();
          }),
        );
    } catch {
      this.host.reportProviderDiagnostic(
        'navigation-panel-responsive-adapter',
        'Responsive adapter failed; provide compact explicitly or repair the adapter.',
      );
    }
    try {
      if (shortcutAdapter && shortcut)
        this.#scope.add(
          shortcutAdapter.register(this.host, shortcut, (event) => {
            if (
              !current() ||
              event.defaultPrevented ||
              componentHandlingPrevented(event) ||
              event.repeat ||
              !this.#matchesShortcut(event, shortcut)
            )
              return;
            if (
              !shortcut.allowEditable &&
              event.composedPath().some((node) => this.#editable(node))
            )
              return;
            if (this.toggle('keyboard', event)) event.preventDefault();
          }),
        );
    } catch {
      this.host.reportProviderDiagnostic(
        'navigation-panel-shortcut-adapter',
        'Shortcut adapter failed; repair its scoped registration.',
      );
    }
    if (persistenceAdapter && persistenceKey && !this.#wide.controlled) {
      const edits = this.#sessionEdits;
      try {
        Promise.resolve(persistenceAdapter.load(persistenceKey))
          .then((expanded) => {
            if (
              !current() ||
              edits !== this.#sessionEdits ||
              this.#wide.controlled ||
              expanded === undefined
            )
              return;
            if (typeof expanded !== 'boolean') {
              this.host.reportProviderDiagnostic(
                'navigation-panel-persistence-value',
                'Persistence load must return a Boolean wide preference.',
              );
              return;
            }
            const source = new Event('navigation-panel-persistence-load');
            this.#loadedSources.add(source);
            try {
              this.#wide.set(expanded, 'programmatic', source);
            } finally {
              this.#loadingProposal = false;
            }
          })
          .catch(() => {
            if (current())
              this.host.reportProviderDiagnostic(
                'navigation-panel-persistence-load',
                'Persistence load failed; the current wide preference remains available.',
              );
          });
      } catch {
        this.host.reportProviderDiagnostic(
          'navigation-panel-persistence-load',
          'Persistence load failed; the current wide preference remains available.',
        );
      }
    }
    this.#resolveCompact();
  }
  #persist(expanded: boolean): void {
    const { persistenceAdapter, persistenceKey } = this.host;
    if (!persistenceAdapter || !persistenceKey || !this.host.isConnected) return;
    const generation = this.#generation;
    try {
      Promise.resolve(persistenceAdapter.save(persistenceKey, expanded)).catch(() => {
        if (generation === this.#generation && this.host.isConnected)
          this.host.reportProviderDiagnostic(
            'navigation-panel-persistence-save',
            'Persistence save failed; the accepted preference remains available.',
          );
      });
    } catch {
      this.host.reportProviderDiagnostic(
        'navigation-panel-persistence-save',
        'Persistence save failed; the accepted preference remains available.',
      );
    }
  }
  #matchesShortcut(event: KeyboardEvent, binding: NavigationPanelShortcut): boolean {
    return (
      event.key.toLowerCase() === binding.key.toLowerCase() &&
      event.ctrlKey === Boolean(binding.ctrlKey) &&
      event.metaKey === Boolean(binding.metaKey) &&
      event.altKey === Boolean(binding.altKey) &&
      event.shiftKey === Boolean(binding.shiftKey)
    );
  }
  #editable(node: EventTarget): boolean {
    const element = node as HTMLElement;
    return (
      element?.nodeType === 1 &&
      (['input', 'textarea', 'select'].includes(element.localName) || element.isContentEditable)
    );
  }
}
