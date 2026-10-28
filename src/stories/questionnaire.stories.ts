import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import type { QuestionnaireQuestion } from '../foundation/questionnaire.js';
import { libraryDocs } from './library-docs.js';
import { questionnaireData } from './questionnaire-data.js';
const questions = questionnaireData.default.questions as readonly QuestionnaireQuestion[];
interface Args {
  flow: 'linear' | 'free';
  choiceMode: 'single' | 'multiple';
  skippable: boolean;
  shortcutMode: 'none' | 'letters' | 'numbers';
  nativeValidation: 'enabled' | 'suppressed';
  disabled: boolean;
  readOnly: boolean;
  label: string;
}
const meta = {
  title: 'Components/Questionnaire',
  component: 'tp-questionnaire',
  parameters: { docs: libraryDocs('components/questionnaire') },
  args: {
    flow: 'linear',
    choiceMode: 'single',
    skippable: false,
    shortcutMode: 'letters',
    nativeValidation: 'enabled',
    disabled: false,
    readOnly: false,
    label: 'Project questionnaire',
  },
  argTypes: {
    flow: { control: 'select', options: ['linear', 'free'] },
    choiceMode: { control: 'select', options: ['single', 'multiple'] },
    skippable: { control: 'boolean' },
    shortcutMode: { control: 'select', options: ['none', 'letters', 'numbers'] },
    nativeValidation: { control: 'select', options: ['enabled', 'suppressed'] },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    label: { control: 'text' },
  },
  render: (args) =>
    html`<div style="max-inline-size:28rem">
      <tp-questionnaire
        .questions=${questions}
        .actions=${{ submit: { label: 'Save plan' } }}
        .flow=${args.flow}
        .choiceMode=${args.choiceMode}
        .skippable=${args.skippable}
        .shortcutMode=${args.shortcutMode}
        .nativeValidation=${args.nativeValidation}
        .disabled=${args.disabled}
        .readOnly=${args.readOnly}
        .label=${args.label}
        @tp-submit=${(event: CustomEvent) => {
          event.preventDefault();
          const result = (event.currentTarget as HTMLElement).parentElement!.querySelector(
            'output',
          );
          if (result) result.textContent = `Submitted: ${JSON.stringify(event.detail.answers)}`;
        }}
      ></tp-questionnaire>
      <output aria-live="polite" style="font:var(--tp-text-sm) var(--tp-font-mono)"></output>
    </div>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
