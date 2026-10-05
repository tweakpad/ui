import { interactiveMarkupExample } from './documentation-examples.js';
import { questionnaireData } from './questionnaire-data.js';
import { setupQuestionnaireExample } from './questionnaire-example.js';
import setupSource from './questionnaire-example.js?raw';

const cases = [
  [
    'multiple',
    'Multiple selection',
    'Select several sources and submit them together. Multiple answers retain native checkbox semantics and repeated FormData values.',
  ],
  [
    'freeform',
    'Freeform answer',
    'Choose a fixed answer or describe another approach. Selecting a fixed answer preserves the unselected text draft.',
  ],
  [
    'skip',
    'Explicit skip',
    'Answer the first question, then skip the optional constraints. Intentional skip clears its answer and is distinct from leaving it unanswered.',
  ],
  [
    'shortcuts',
    'Shortcuts',
    'Switch between letters and numbers. Focus an answer, press its shortcut, then Enter to confirm. Text entry retains normal editing.',
  ],
  [
    'validation',
    'Custom validation',
    'Choose Concise summary, then Public audience. Submission returns to the detail question with an error. Choose Complete answer to resolve it.',
  ],
  [
    'controlled',
    'Controlled',
    'The host stores and synchronously accepts the active checkpoint. Answers remain owned by Questionnaire.',
  ],
  [
    'resume',
    'Resume',
    'Resume a saved migration at its second question. Reset changes restores the saved choices, note, and checkpoint.',
  ],
  [
    'conditional',
    'Conditional items',
    'Local runs contain two questions. Choose Cloud workspace to include the environment question in navigation, progress, validation, and submission.',
  ],
  [
    'navigation-state',
    'Navigation state',
    'Next and Submit are disabled until the current item is answered. Action labels and Button variants are configured independently.',
  ],
  [
    'progress',
    'Custom progress',
    'Read the Progress part state and compose the existing Progress control. The custom indicator follows the four checkpoints.',
  ],
  [
    'animated',
    'Animated items',
    'Only a newly active question animates. Progress and navigation remain stationary, and reduced-motion policy disables the entrance.',
  ],
  [
    'card',
    'Card',
    'Rearrange the bound parts into Card header, description, action, content and footer slots while retaining fieldset naming and native form behavior.',
  ],
  [
    'dialog',
    'Dialog',
    'Open a clarification flow. Dialog owns cancellation, dismissal and focus restoration; Questionnaire owns answers, navigation and validation.',
  ],
] as const;

export const questionnaireExamples = cases.map(([kind, title, description]) => {
  const data = questionnaireData[kind]!;
  const id = `questionnaire-${kind}`;
  const questionnaire = `<tp-questionnaire label="${title} questionnaire"></tp-questionnaire>`;
  const before =
    kind === 'shortcuts'
      ? '<tp-select label="Shortcuts" default-value="letters"><option value="letters">Letters</option><option value="numbers">Numbers</option></tp-select>'
      : '';
  const after =
    kind === 'resume' ? '<tp-button data-reset variant="outline">Reset changes</tp-button>' : '';
  const body =
    kind === 'dialog'
      ? `<tp-dialog label="Agent clarification"><tp-button slot="trigger" variant="outline">Open clarification</tp-button>${questionnaire}<tp-button data-cancel slot="footer" variant="outline">Cancel</tp-button></tp-dialog>`
      : questionnaire;
  const markup = `<div id="${id}" style="max-inline-size:28rem;margin-inline:auto">${before}${body}${after}<output aria-live="polite"></output></div>`;
  return interactiveMarkupExample(
    title,
    markup,
    (root: HTMLElement) => setupQuestionnaireExample(root, data.questions, kind, data.submit),
    `${setupSource}\nsetupQuestionnaireExample(document.getElementById('${id}'), ${JSON.stringify(data.questions, null, 2)}, '${kind}', '${data.submit}');`,
    description,
  );
});
