import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { useArgs } from 'storybook/preview-api';
import type {
  FlowAutoLayout,
  FlowBackground,
  FlowControlAction,
  FlowMode,
  FlowPanelPosition,
  FlowTool,
  FlowWheelPolicy,
  TpFlow,
} from '../../widgets/flow/index.js';
import { FLOW_PANEL_POSITIONS } from '../../widgets/flow/types.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import { flowIcons, sampleRun, workflowDocument, workflowSchema } from './flow-example.js';
import { libraryDocs } from '../library-docs.js';

interface Args {
  tool: FlowTool;
  mode: FlowMode;
  autoLayout: FlowAutoLayout;
  background: FlowBackground;
  snap: boolean;
  size: 'sm' | 'default' | 'lg';
  wheel: FlowWheelPolicy;
  minimap: boolean;
  controls: FlowControlAction[];
  controlsPosition: FlowPanelPosition;
  controlsOrientation: 'horizontal' | 'vertical';
  label: string;
  readOnly: boolean;
  disabled: boolean;
}
const meta: Meta<Args> = {
  title: 'Widgets/Flow',
  component: 'tp-flow',
  parameters: { docs: libraryDocs('widgets/flow') },
  args: {
    tool: 'select',
    mode: 'design',
    autoLayout: 'none',
    background: 'dots',
    snap: false,
    size: 'default',
    wheel: 'pan',
    minimap: false,
    controls: ['undo', 'redo', 'zoom-out', 'zoom', 'zoom-in', 'fit', 'tool', 'lock'],
    controlsPosition: 'bottom-center',
    controlsOrientation: 'horizontal',
    label: 'Support triage',
    readOnly: false,
    disabled: false,
  },
  argTypes: {
    tool: {
      control: 'select',
      options: ['select', 'pan'],
    },
    mode: {
      control: 'select',
      options: ['design', 'view'],
    },
    autoLayout: { control: 'select', options: ['none', 'horizontal', 'vertical', 'smart'] },
    background: { control: 'select', options: ['dots', 'lines', 'cross', 'none'] },
    snap: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'default', 'lg'] },
    wheel: { control: 'select', options: ['pan', 'zoom', 'none'] },
    minimap: { control: 'boolean' },
    controls: {
      control: 'check',
      options: [
        'undo',
        'redo',
        'zoom-out',
        'zoom',
        'zoom-in',
        'fit',
        'tool',
        'lock',
        'layout',
        'run',
      ],
    },
    controlsPosition: {
      control: 'select',
      options: [...FLOW_PANEL_POSITIONS],
    },
    controlsOrientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    label: { control: 'text' },
    readOnly: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    const flow = createRef<TpFlow>();
    return html`<tp-flow
      ${ref(flow)}
      name="pipeline"
      fit-view
      .schema=${workflowSchema}
      .icons=${flowIcons}
      .defaultValue=${workflowDocument}
      .run=${sampleRun}
      .tool=${args.tool}
      .mode=${args.mode}
      .autoLayout=${args.autoLayout}
      .background=${args.background}
      .snap=${args.snap}
      .size=${args.size}
      .wheel=${args.wheel}
      .minimap=${args.minimap}
      .controls=${args.controls}
      .controlsPosition=${args.controlsPosition}
      .controlsOrientation=${args.controlsOrientation}
      .label=${args.label}
      .readOnly=${args.readOnly}
      .disabled=${args.disabled}
      @tp-tool-change=${(event: TpValueChangeEvent<FlowTool>) => {
        if (event.defaultPrevented || event.detail.cancelled) return;
        if (flow.value) flow.value.tool = event.detail.value;
        queueMicrotask(() => {
          if (flow.value) updateArgs({ tool: flow.value.tool });
        });
      }}
      @tp-mode-change=${(event: TpValueChangeEvent<FlowMode>) => {
        if (event.defaultPrevented || event.detail.cancelled) return;
        if (flow.value) flow.value.mode = event.detail.value;
        queueMicrotask(() => {
          if (flow.value) updateArgs({ mode: flow.value.mode });
        });
      }}
    ></tp-flow>`;
  },
};
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};
