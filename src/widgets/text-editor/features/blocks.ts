/**
 * The blocks feature (`uwg-te-req-blocks-2` to `uwg-te-req-blocks-5`, `uwg-te-req-content-8`):
 * the gutter with its grip and insert button, the block menu, block mode, the block drag, the
 * keyboard block moves and copying a block link. `textEditorBlocks()` creates it.
 */
import { TpBadge } from '../../../components/badge/badge.js';
import { TpButton } from '../../../components/button/button.js';
import { TpMenuCheckboxItem } from '../../../components/menu/menu-checkbox-item.js';
import { TpMenuItem } from '../../../components/menu/menu-item.js';
import { TpMenuRadioGroup } from '../../../components/menu/menu-radio-group.js';
import { TpMenuRadioItem } from '../../../components/menu/menu-radio-item.js';
import { TpMenu } from '../../../components/menu/menu.js';
import { TpSeparator } from '../../../components/separator/separator.js';
import { textEditorBlockTools } from '../../../foundation/text-editor/builtin-tools/blocks.js';
import type {
  TextEditorFeature,
  TextEditorFeatureHost,
  TextEditorFeatureInstance,
} from '../feature.js';
import { blocksStyles, TextEditorBlocks } from '../views/blocks.js';

/** The block controls: the gutter, the block menu, block mode and the block drag. */
export function textEditorBlocks(): TextEditorFeature {
  return Object.freeze({
    name: 'blocks' as const,
    tools: textEditorBlockTools,
    elements: Object.freeze([
      TpBadge,
      TpButton,
      TpSeparator,
      TpMenu,
      TpMenuItem,
      TpMenuCheckboxItem,
      TpMenuRadioGroup,
      TpMenuRadioItem,
    ]),
    styles: Object.freeze([blocksStyles]),
    attach: (host: TextEditorFeatureHost): TextEditorFeatureInstance => {
      const blocks = new TextEditorBlocks({
        geometry: host.geometry,
        instance: () => host.instance(),
        selection: () => host.selection(),
        wholeDocument: () => host.wholeDocument(),
        contentPressed: () => host.contentPressed(),
        strings: () => host.strings(),
        layout: () => host.layout(),
        access: () => host.access(),
        direction: () => host.direction(),
        registry: () => host.registry(),
        toolContext: (surface, target) => host.toolContext(surface, target),
        toolEnabled: (tool, context) => host.toolEnabled(tool, context),
        shortcut: (id) => host.shortcut(id),
        request: (proposal) => host.request(proposal),
        can: (action) => host.can(action),
        announce: (message) => host.announce(message),
        focusEditing: () => host.focusEditing(),
        editingFocused: () => host.editingFocused(),
        cycleContextual: (event) => host.cycleContextual(event),
        renderRoot: () => host.renderRoot(),
        viewport: () => host.viewport(),
        content: () => host.content(),
        overlay: () => host.overlay(),
        underlay: () => host.underlay(),
        dragChanged: (active) => host.dragChanged(active),
        requestUpdate: () => host.requestUpdate(),
        tableGripOutset: () => host.gripOutset(),
        transientOpened: (owner, close) => host.transientOpened(owner, close),
        transientClosed: (owner) => host.transientClosed(owner),
      });
      const releaseContextual = host.registerContextual(blocks.contextual);
      return {
        name: 'blocks',
        connected: () => blocks.connected(host.view()),
        updated: () => blocks.updated(),
        stateChanged: () => blocks.stateChanged(),
        ready: () => blocks.ready(),
        detached: () => blocks.detached(),
        disconnected: () => blocks.disconnected(),
        dispose: () => {
          releaseContextual();
          blocks.disconnected();
        },
        renderOverlay: () => blocks.render(),
        renderSurfaces: () => blocks.renderMenu(),
        editingKey: (event) => blocks.editingKey(event),
        blockTool: (id, event) => blocks.blockTool(id, event),
        dragging: () => blocks.drag.active,
        menuOpen: () => blocks.menu.open,
        gutter: () => blocks.gutter.enabled(),
      };
    },
  });
}
