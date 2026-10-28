/**
 * The tables feature (`uwg-te-req-tables-2` to `uwg-te-req-tables-9`): the size picker, the
 * chrome with its grips, handle and menus, the column resize, the table-controls session, the
 * sticky header and Tab between cells. `textEditorTables()` creates it; the engine's table modules
 * declare the capability its tools need.
 */
import { TpButton } from '../../../components/button/button.js';
import { TpField } from '../../../components/field/field.js';
import { TpInput } from '../../../components/input/input.js';
import { TpMenuCheckboxItem } from '../../../components/menu/menu-checkbox-item.js';
import { TpMenuItem } from '../../../components/menu/menu-item.js';
import { TpMenuRadioGroup } from '../../../components/menu/menu-radio-group.js';
import { TpMenuRadioItem } from '../../../components/menu/menu-radio-item.js';
import { TpMenu } from '../../../components/menu/menu.js';
import { TpPopover } from '../../../components/popover/popover.js';
import { TpSeparator } from '../../../components/separator/separator.js';
import { textEditorTableTools } from '../../../foundation/text-editor/builtin-tools/tables.js';
import type {
  TextEditorFeature,
  TextEditorFeatureHost,
  TextEditorFeatureInstance,
} from '../feature.js';
import { TextEditorTables } from '../views/tables.js';

export interface TextEditorTablesOptions {
  /** Whether a table's header row sticks under the toolbar while the table scrolls under it. */
  readonly stickyHeaders?: boolean | undefined;
}

/** The table controls: the size picker, the chrome and its menus, the resize and the sticky header. */
export function textEditorTables(options: TextEditorTablesOptions = {}): TextEditorFeature {
  const stickyHeaders = options.stickyHeaders === true;
  return Object.freeze({
    name: 'tables' as const,
    tools: textEditorTableTools,
    elements: Object.freeze([
      TpPopover,
      TpField,
      TpInput,
      TpButton,
      TpSeparator,
      TpMenu,
      TpMenuItem,
      TpMenuCheckboxItem,
      TpMenuRadioGroup,
      TpMenuRadioItem,
    ]),
    styles: TextEditorTables.styles,
    attach: (host: TextEditorFeatureHost): TextEditorFeatureInstance => {
      const tables = new TextEditorTables({
        element: host.element,
        geometry: host.geometry,
        instance: () => host.instance(),
        state: () => host.instance()?.getState() ?? host.state(),
        strings: () => host.strings(),
        layout: () => host.layout(),
        access: () => host.access(),
        direction: () => host.direction(),
        registry: () => host.registry(),
        toolContext: (surface, target) => host.toolContext(surface, target),
        toolEnabled: (tool, context) => host.toolEnabled(tool, context),
        shortcut: (id) => host.shortcut(id),
        request: (proposal) => host.request(proposal),
        announce: (message) => host.announce(message),
        focusEditing: () => host.focusEditing(),
        focused: () => host.focused(),
        registerContextual: (surface) => host.registerContextual(surface),
        cycleContextual: (event) => host.cycleContextual(event),
        stickyHeaders: () => stickyHeaders,
        viewport: () => host.viewport(),
        content: () => host.content(),
        toolbar: () => host.toolbar(),
        requestUpdate: () => host.requestUpdate(),
        updateComplete: () => host.updateComplete(),
        transientOpened: (owner, close, reason) => host.transientOpened(owner, close, reason),
        transientClosed: (owner) => host.transientClosed(owner),
        pickerLane: (open, reason) => host.lane('table-size', open, reason),
      });
      return {
        name: 'tables',
        partsConnected: () => tables.connected(),
        updated: () => tables.updated(),
        stateChanged: () => tables.stateChanged(),
        focusChanged: () => tables.focusChanged(),
        valueChanged: (change) => tables.valueChanged(change.actions, change.origin),
        disconnected: () => tables.disconnected(),
        dispose: () => tables.disconnected(),
        renderOverlay: () => tables.renderOverlay(),
        renderSurfaces: () => tables.renderSurfaces(),
        tableTab: (event, backward) => tables.tableTab(event, backward),
        openSurface: (tool, detail) => tables.openSurface(tool, detail),
        expanded: (tool) => tool.kind === 'table-size' && tables.picker.open,
        menuOpen: () => tables.chrome.menuOpen,
        keepClear: () => tables.chrome.columnGripBand(),
        gripOutset: () => tables.chrome.rowGripOutset(),
      };
    },
  });
}
