import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import type {
  TreeViewDragActivation,
  TreeViewDropIndicator,
  TreeViewSize,
} from '../../components/tree-view/types.js';
import { eyeIcon } from '../../icons/eye.js';
import { eyeOffIcon } from '../../icons/eye-off.js';
import { lockIcon } from '../../icons/lock.js';
import { unlockIcon } from '../../icons/unlock.js';
import { fileTextIcon } from '../../icons/file-text.js';
import { imageIcon } from '../../icons/image.js';
import { folderIcon } from '../../icons/folder.js';
import { plusIcon } from '../../icons/plus.js';
import { trashIcon } from '../../icons/trash.js';
import type { TpLayers } from '../../widgets/layers/layers.js';
import type { TpButton } from '../../components/button/button.js';
import type { TpInput } from '../../components/input/input.js';
import { libraryDocs } from '../library-docs.js';

interface Args {
  size: TreeViewSize;
  canReorder: boolean;
  canRename: boolean;
  canRemove: boolean;
  dragActivation: TreeViewDragActivation;
  dropIndicator: TreeViewDropIndicator;
  label: string;
  disabled: boolean;
  readOnly: boolean;
}

// The lock shows only while locked: a press on it unlocks, and the header button locks.
const states = (locked: boolean, visible: boolean) =>
  html`<tp-layer-state name="locked" label="Lock" value=${locked ? 'locked' : 'unlocked'}>
      <tp-layer-state-value value="locked"
        ><tp-icon .icon=${lockIcon}></tp-icon
      ></tp-layer-state-value>
      <tp-layer-state-value value="unlocked"></tp-layer-state-value>
    </tp-layer-state>
    <tp-layer-state name="visibility" label="Visibility" value=${visible ? 'visible' : 'hidden'}>
      <tp-layer-state-value value="visible"
        ><tp-icon .icon=${eyeIcon}></tp-icon
      ></tp-layer-state-value>
      <tp-layer-state-value value="hidden" dims
        ><tp-icon .icon=${eyeOffIcon}></tp-icon
      ></tp-layer-state-value>
    </tp-layer-state>`;

const stackOf = (event: Event) => (event.target as Element).closest('tp-layers') as TpLayers;
const allLocked = (layers: TpLayers) =>
  layers.value.length > 0 &&
  layers.value.every((id) => layers.getLayerState(id, 'locked') === 'locked');
/** The header lock follows the selection. */
const showLock = (layers: TpLayers) => {
  const button = layers.querySelector<TpButton>('[data-action="lock"]');
  if (!button) return;
  const locked = allLocked(layers);
  button.icon = locked ? lockIcon : unlockIcon;
  button.ariaLabel = locked ? 'Unlock' : 'Lock';
  button.disabled = layers.value.length === 0;
};
const opacities = new Map<string, string>();
let added = 0;

const meta: Meta<Args> = {
  title: 'Widgets/Layers',
  component: 'tp-layers',
  parameters: { docs: libraryDocs('widgets/layers') },
  args: {
    size: 'default',
    canReorder: true,
    canRename: true,
    canRemove: true,
    dragActivation: 'item',
    dropIndicator: 'line',
    label: 'Poster',
    disabled: false,
    readOnly: false,
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'default'] },
    canReorder: { control: 'boolean' },
    canRename: { control: 'boolean' },
    canRemove: { control: 'boolean' },
    dragActivation: { control: 'select', options: ['item', 'handle'] },
    dropIndicator: { control: 'select', options: ['line', 'displace'] },
    label: { control: 'text' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
  },
  render: (args) =>
    html`<tp-card style="inline-size: 18rem">
      <tp-layers
        .label=${args.label}
        .size=${args.size}
        .canReorder=${args.canReorder}
        .canRename=${args.canRename}
        .canRemove=${args.canRemove}
        .dragActivation=${args.dragActivation}
        .dropIndicator=${args.dropIndicator}
        .disabled=${args.disabled}
        .readOnly=${args.readOnly}
        default-expanded='["night"]'
        default-value='["moon"]'
        @tp-value-commit=${(event: Event) => {
          const layers = stackOf(event);
          queueMicrotask(() => showLock(layers));
        }}
        @tp-layers-change=${(event: Event) => {
          const layers = stackOf(event);
          queueMicrotask(() => showLock(layers));
        }}
        @tp-active-change=${(event: CustomEvent<{ value: string | null }>) => {
          const input = stackOf(event).querySelector<TpInput>('tp-input');
          if (input) input.value = opacities.get(event.detail.value ?? '') ?? '100';
        }}
      >
        <tp-input
          slot="header"
          variant="inline"
          size="sm"
          label="Opacity"
          type="number"
          min="0"
          max="100"
          value="100"
          @tp-value-change=${(event: CustomEvent<{ value: string }>) => {
            const input = event.target as TpInput;
            input.value = event.detail.value;
            const active = stackOf(event).active;
            if (active) opacities.set(active, event.detail.value);
          }}
        ></tp-input>
        <tp-button
          slot="header-end"
          variant="ghost"
          size="icon-sm"
          data-action="lock"
          aria-label="Lock"
          .icon=${unlockIcon}
          @click=${(event: Event) => {
            const layers = stackOf(event);
            layers.setLayerState(layers.value, 'locked', allLocked(layers) ? 'unlocked' : 'locked');
          }}
        ></tp-button>
        <tp-layer id="headline" label="Headline"
          ><tp-icon .icon=${fileTextIcon}></tp-icon>${states(true, true)}</tp-layer
        >
        <tp-layer id="night" label="Night sky"
          ><tp-icon .icon=${folderIcon}></tp-icon>${states(false, true)}
          <tp-layer id="moon" label="Moon"
            ><tp-icon .icon=${imageIcon}></tp-icon>${states(false, true)}</tp-layer
          >
        </tp-layer>
        <tp-layer id="paper" label="Paper texture"
          ><tp-icon .icon=${imageIcon}></tp-icon>${states(false, false)}</tp-layer
        >
        <tp-menu slot="footer">
          <tp-button
            slot="trigger"
            variant="ghost"
            size="icon-sm"
            aria-label="Add"
            .icon=${plusIcon}
          ></tp-button>
          ${(['layer', 'group'] as const).map(
            (kind) =>
              html`<tp-menu-item
                @click=${(event: Event) => {
                  added += 1;
                  const group = kind === 'group';
                  stackOf(event).addLayer({
                    id: `added-${added}`,
                    label: group ? `Group ${added}` : `Layer ${added}`,
                    ...(group ? { children: [] } : {}),
                  });
                }}
                >${kind === 'group' ? 'Group' : 'Layer'}</tp-menu-item
              >`,
          )}
        </tp-menu>
        <tp-button
          slot="footer-end"
          variant="ghost"
          size="icon-sm"
          aria-label="Remove"
          .icon=${trashIcon}
          @click=${(event: Event) => stackOf(event).removeLayers()}
        ></tp-button>
      </tp-layers>
    </tp-card>`,
};
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};
