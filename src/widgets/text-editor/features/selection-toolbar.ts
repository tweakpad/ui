/**
 * The selection toolbar feature (`uwg-te-req-surfaces-1`): a contextual Toolbar that floats over
 * a text selection or a cell range, composed from the `selectionToolbar` layout.
 * `textEditorSelectionToolbar()` creates it.
 */
import { TpButtonGroup } from '../../../components/button-group/button-group.js';
import { TpSeparator } from '../../../components/separator/separator.js';
import { TpTooltip } from '../../../components/tooltip/tooltip.js';
import { composedContains, deepActiveElement } from '../../../foundation/focus.js';
import type {
  TextEditorEngineState,
  TextEditorSelection,
} from '../../../foundation/text-editor/model.js';
import type { TextEditorTool } from '../../../foundation/text-editor/tools.js';
import type {
  TextEditorFeature,
  TextEditorFeatureHost,
  TextEditorFeatureInstance,
} from '../feature.js';
import { TEXT_EDITOR_CONTEXTUAL_ORDER } from '../focus.js';
import type { TextEditorToolActivation } from '../tools/controls.js';
import { resolveSelectionToolbarView } from '../tools/resolve.js';
import { composedSelectionText, sameTextSelection } from '../views/selection-anchor.js';
import { selectionToolbarStyles, TextEditorSelectionToolbar } from '../views/selection-toolbar.js';

/** No built-in tool belongs to the selection toolbar alone: it places the tools of the others. */
const NO_TOOLS: Readonly<Record<string, TextEditorTool>> = Object.freeze({});

/**
 * The selection toolbar's place in the Alt+F10 cycle (`uwg-te-req-key-5`): first for a text
 * selection; for a cell range after the table-controls session, which comes first there.
 */
export function selectionToolbarOrder(selection: Pick<TextEditorSelection, 'kind'>): number {
  return selection.kind === 'cells'
    ? TEXT_EDITOR_CONTEXTUAL_ORDER.selectionToolbarCells
    : TEXT_EDITOR_CONTEXTUAL_ORDER.selectionToolbar;
}

/** The floating selection toolbar. */
export function textEditorSelectionToolbar(): TextEditorFeature {
  return Object.freeze({
    name: 'selection-toolbar' as const,
    tools: NO_TOOLS,
    elements: Object.freeze([TpButtonGroup, TpSeparator, TpTooltip]),
    styles: Object.freeze([selectionToolbarStyles]),
    attach: (host: TextEditorFeatureHost): TextEditorFeatureInstance => {
      const shadow = () => host.renderRoot() as ShadowRoot;
      /** Whether the text selection holds more than whitespace, read while the editing root has focus. */
      let selectedText: {
        readonly selection: TextEditorEngineState['selection'];
        readonly value: boolean;
      } | null = null;
      /**
       * Whether a text selection holds more than whitespace: read from the document selection
       * while the editing root holds focus, and kept for the same selection while focus is in the
       * toolbar or one of its menus, where the document selection may not reflect it.
       */
      const hasText = (selection: TextEditorEngineState['selection']): boolean => {
        if (selection.kind !== 'text' || selection.empty) return false;
        const cached = selectedText;
        const same = cached !== null && sameTextSelection(cached.selection, selection);
        if (same && !host.editingFocused()) return cached.value;
        const root = host.renderRoot();
        const text = root ? composedSelectionText(root) : null;
        const value = text === null ? same && cached.value : text.trim() !== '';
        selectedText = { selection, value };
        return value;
      };
      const activate = (activation: TextEditorToolActivation): void => {
        void host
          .request({
            target: activation.tool,
            ...(activation.value === undefined ? {} : { value: activation.value }),
            surface: activation.surface,
            reason: activation.reason,
            sourceEvent: activation.sourceEvent,
            trigger: activation.trigger,
            focus: activation.focus,
          })
          .catch(() => undefined);
      };
      const toolbar = new TextEditorSelectionToolbar({
        get renderRoot() {
          return shadow();
        },
        requestUpdate: () => host.requestUpdate(),
        view: () => {
          const registry = host.registry();
          if (!registry) return null;
          return resolveSelectionToolbarView({
            registry,
            layout: host.layout(),
            access: host.access(),
            context: (surface) => host.toolContext(surface),
            enabled: (tool, context) => host.toolEnabled(tool, context),
            shortcut: (id) => host.shortcut(id),
            expanded: (tool) => host.expanded(tool),
          });
        },
        // The visibility inputs (`uwg-te-req-surfaces-1`).
        visibility: () => {
          const instance = host.instance();
          const state = instance?.getState() ?? host.state();
          const access = host.access();
          const root = host.renderRoot();
          const active = root ? deepActiveElement(root.ownerDocument) : null;
          const fixed = host.toolbar();
          // Focus anywhere in the widget but the fixed toolbar and the popovers: the editing root,
          // the selection toolbar and its menus, the gutter and the table controls.
          const focusInside =
            composedContains(host.element, active) &&
            !(fixed && composedContains(fixed, active)) &&
            !host.focusExcluded(active);
          const selection = state.selection;
          return {
            ready: instance !== null,
            editable: state.editable && !access.readOnly && !access.disabled,
            selection,
            hasText: hasText(selection),
            focusInside,
            composing: state.composing,
            dragging: host.dragging(),
            surfaceOpen: host.surfaceOpen(),
            menuOpen: host.menuOpen(),
          };
        },
        selectionRects: () => host.instance()?.selectionRects() ?? [],
        keepClear: () => host.keepClear(),
        content: () => host.content(),
        activate,
        menuOpened: (trigger, modality) => host.menuOpened(trigger, modality),
        menuClosed: (changed) => host.menuClosed(changed),
        transientOpened: (owner, close) => host.transientOpened(owner, close),
        transientClosed: (owner) => host.transientClosed(owner),
        menuFinalFocus: host.menuFinalFocus,
        focusEditing: () => host.focusEditing(),
        cycleContextual: (event) => host.cycleContextual(event),
      });
      const releaseContextual = host.registerContextual({
        get order() {
          return selectionToolbarOrder(host.state().selection);
        },
        applicable: () => toolbar.shown,
        enter: () => toolbar.focus(),
        holdsFocus: () => {
          const root = host.renderRoot();
          return root ? toolbar.contains(deepActiveElement(root.ownerDocument)) : false;
        },
      });
      return {
        name: 'selection-toolbar',
        connected: () => toolbar.connected(),
        updated: () => toolbar.updated(),
        disconnected: () => toolbar.disconnected(),
        dispose: () => {
          releaseContextual();
          toolbar.disconnected();
        },
        renderSurfaces: () => toolbar.render(),
      };
    },
  });
}
