import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import type { QuestionnaireQuestion } from '../foundation/questionnaire.js';
import documentation from '../../docs/questionnaire.md?raw';
import { questionnaireData } from './questionnaire-data.js';
import { questionnaireExamples } from './questionnaire.examples.js';
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
const source = `<tp-questionnaire label="Project questionnaire" shortcut-mode="letters"></tp-questionnaire>
<script>
  const questionnaire = document.querySelector('tp-questionnaire');
  questionnaire.questions = ${JSON.stringify(questions, null, 2)};
  questionnaire.actions = { submit: { label: 'Save plan' } };
  questionnaire.addEventListener('tp-submit', event => {
    event.preventDefault();
    console.log(event.detail.answers, [...event.detail.data]);
  });
</script>`;
const meta = {
  title: 'Components/Questionnaire',
  component: 'tp-questionnaire',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      examples: questionnaireExamples,
      description: { component: documentation },
      source: { code: source },
    },
  },
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
    html`<div style="max-inline-size:28rem;margin-inline:auto">
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
      <output aria-live="polite"></output>
    </div>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
