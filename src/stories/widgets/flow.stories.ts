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
import { flowExamples } from './flow.examples.js';
import { flowIcons, sampleRun, workflowDocument, workflowSchema } from './flow-example.js';
import documentation from '../../../docs/widgets/flow.md?raw';

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
const sourceFor = (markup: string) =>
  `<script type="module">\n  import '@tweakpad/ui/styles.css';\n  import '@tweakpad/ui/register';\n  import '@tweakpad/ui/register/widgets';\n</script>\n${markup}`;
const source = sourceFor(
  `<tp-flow label="Lead pipeline" name="pipeline" fit-view></tp-flow>
<script type="module">
  const flow = document.querySelector('tp-flow');
  flow.schema = workflowSchema; // typed node definitions (see Schema)
  flow.icons = { zap, database, mail, 'git-branch': gitBranch }; // icon keys the schema names
  flow.load(workflowDocument); // the flow document (see Value and the document)
  flow.run = lastRun; // a FlowRun snapshot, or a trace played by the stepper
</script>`,
);
const meta: Meta<Args> = {
  title: 'Widgets/Flow',
  component: 'tp-flow',
  parameters: {
    docs: {
      examples: flowExamples,
      description: { component: documentation },
      source: { code: source, language: 'html' },
    },
  },
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
    label: 'Lead pipeline',
    readOnly: false,
    disabled: false,
  },
  argTypes: {
    tool: {
      control: 'select',
      options: ['select', 'pan'],
      description: 'Controlled tool lane; the example accepts `tp-tool-change` proposals.',
    },
    mode: {
      control: 'select',
      options: ['design', 'view'],
      description: 'Controlled mode lane; the example accepts `tp-mode-change` proposals.',
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
      description:
        'Built-in bar actions in display order; `zoom` is the zoom field, `layout` and `run` opt in.',
    },
    controlsPosition: {
      control: 'select',
      options: [...FLOW_PANEL_POSITIONS],
      description: 'Corner or edge middle the built-in bar anchors to.',
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
