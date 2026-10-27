/**
 * The links feature (`uwg-te-req-surfaces-3`, `uwg-te-req-tools-4`): the link popover that the
 * link tool opens at the selection. `textEditorLinks()` creates it.
 */
import { TpButton } from '../../../components/button/button.js';
import { TpField } from '../../../components/field/field.js';
import { TpInputGroup } from '../../../components/input-group/input-group.js';
import { TpInput } from '../../../components/input/input.js';
import { TpPopover } from '../../../components/popover/popover.js';
import { textEditorLinkTools } from '../../../foundation/text-editor/builtin-tools/links.js';
import type { ChangeReason } from '../../../foundation/types.js';
import type {
  TextEditorFeature,
  TextEditorFeatureHost,
  TextEditorFeatureInstance,
} from '../feature.js';
import { TextEditorLinkPopover } from '../views/link-popover.js';

/** The link popover of the link tool. */
export function textEditorLinks(): TextEditorFeature {
  return Object.freeze({
    name: 'links' as const,
    tools: textEditorLinkTools,
    elements: Object.freeze([TpPopover, TpField, TpInput, TpInputGroup, TpButton]),
    attach: (host: TextEditorFeatureHost): TextEditorFeatureInstance => {
      const ready = () => host.instance();
      const link = new TextEditorLinkPopover({
        requestUpdate: () => host.requestUpdate(),
        strings: () => host.strings(),
        link: () => ready()?.getState().link ?? host.state().link,
        rangeRects: (range) => ready()?.rangeRects(range) ?? [],
        selectionRects: () => ready()?.selectionRects() ?? [],
        caretRect: () => ready()?.caretRect() ?? null,
        content: () => host.content(),
        request: (proposal) => host.request(proposal),
        focusEditing: () => host.focusEditing(),
        // Opening it closes the widget's other transient surfaces (`uwg-te-req-surfaces-6`).
        opening: (reason?: ChangeReason) =>
          host.transientOpened(link, (closing) => link.close(closing ?? 'programmatic'), reason),
        lane: (open, reason) => host.lane('link', open, reason),
      });
      return {
        name: 'links',
        stateChanged: () => {
          const access = host.access();
          if (access.readOnly || access.disabled)
            link.close(access.disabled ? 'disabled' : 'programmatic');
        },
        disconnected: () => link.close('programmatic'),
        dispose: () => link.close('programmatic'),
        renderSurfaces: () => link.render(),
        openSurface: (tool, detail) => {
          if (tool.kind !== 'link') return false;
          link.open(detail.surface, detail.reason);
          return true;
        },
        expanded: (tool) => tool.kind === 'link' && link.isOpen,
        surfaceOpen: () => link.isOpen,
        focusExcluded: () => link.isOpen,
      };
    },
  });
}
