/**
 * The suggestions feature (`uwg-te-req-surfaces-2`, `uwg-te-req-inline-2`, `uwg-te-req-a11y-3`):
 * the slash menu and the suggestion lists of custom inline nodes, which open at a trigger typed in
 * the editing root. `textEditorSuggestions()` creates it.
 */
import { TpCommandList } from '../../../components/command-palette/list.js';
import { textEditorSuggestionTools } from '../../../foundation/text-editor/builtin-tools/suggestions.js';
import type { ChangeReason } from '../../../foundation/types.js';
import type {
  TextEditorFeature,
  TextEditorFeatureHost,
  TextEditorFeatureInstance,
} from '../feature.js';
import { suggestionsStyles, TextEditorSuggestions } from '../views/suggestions.js';

/** The slash menu and the suggestion lists of inline nodes. */
export function textEditorSuggestions(): TextEditorFeature {
  return Object.freeze({
    name: 'suggestions' as const,
    tools: textEditorSuggestionTools,
    elements: Object.freeze([TpCommandList]),
    styles: Object.freeze([suggestionsStyles]),
    attach: (host: TextEditorFeatureHost): TextEditorFeatureInstance => {
      const ready = () => host.instance();
      /** `aria-controls` and `aria-activedescendant` of the editing root while a list shows. */
      let reference: string | null = null;
      const suggestions = new TextEditorSuggestions({
        requestUpdate: () => host.requestUpdate(),
        strings: () => host.strings(),
        registry: () => host.registry(),
        layout: () => host.layout(),
        state: () => host.state(),
        gate: () => {
          const access = host.access();
          return {
            ready: ready() !== null,
            editable: host.state().editable && !access.readOnly,
            disabled: access.disabled,
            focused: host.editingFocused(),
          };
        },
        context: (surface) => host.toolContext(surface),
        enabled: (tool, context) => host.toolEnabled(tool, context),
        shortcut: (id) => host.shortcut(id),
        rangeRects: (range) => ready()?.rangeRects(range) ?? [],
        caretRect: () => ready()?.caretRect() ?? null,
        content: () => host.content(),
        request: (proposal) => host.request(proposal),
        // A tool run without a value opens its surface through the request pipeline.
        openSurface: (toolId, surface) =>
          void host
            .request({ target: toolId, surface, reason: 'item-press', trigger: null })
            .catch(() => undefined),
        referenceList: (id) => {
          if (id === reference) return;
          reference = id;
          host.referencesChanged();
        },
        announce: (message, options) => host.announce(message, options),
        // Opening a list closes the widget's other transient surfaces; a list that another
        // surface closes stays dismissed until its trigger goes (`uwg-te-req-surfaces-6`).
        opening: (reason?: ChangeReason) =>
          host.transientOpened(
            suggestions,
            (closing) => {
              if (suggestions.isOpen) suggestions.close(true, closing ?? 'programmatic');
            },
            reason,
          ),
        editReason: () => host.editReason(),
        lane: (lane) => host.lane('suggestions', lane.open, lane.reason),
      });
      const release = () => {
        suggestions.release();
        reference = null;
      };
      return {
        name: 'suggestions',
        stateChanged: () => suggestions.sync(),
        updated: () => {
          const root = host.renderRoot();
          if (root) suggestions.updated(root);
        },
        disconnected: release,
        dispose: release,
        renderSurfaces: () => suggestions.render(),
        suggestionKey: (event) => suggestions.forwardKey(event),
        contentPressed: () => suggestions.pressed(),
        surfaceOpen: () => suggestions.isOpen,
        suggestionList: () => reference,
      };
    },
  });
}
