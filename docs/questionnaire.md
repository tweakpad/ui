# Questionnaire

`tp-questionnaire` is an ordered native form with one active question. It supports fixed choices, free text, mixed answers, validation, optional skipping and submission. Its actions use library Buttons; the required native inputs share the library's input, selection and shortcut presentation recipes.

```ts
import '@tweakpad/ui/styles.css';
import '@tweakpad/ui/register';
const questionnaire = document.querySelector('tp-questionnaire');
questionnaire.questions = [
  {
    choices: [
      {
        description: 'Show what the agent ran and what came back.',
        label: 'Tool call timeline',
        value: 'tool-calls',
      },
      {
        description: 'Ask before sensitive or destructive actions.',
        label: 'Approval checkpoints',
        value: 'approvals',
      },
      {
        description: 'Make delegated work and results easier to follow.',
        label: 'Sub-agent handoffs',
        value: 'handoffs',
      },
    ],
    description: 'Choose a direction or describe another task.',
    input: {
      label: 'Another agent feature',
      placeholder: 'Describe another feature…',
    },
    name: 'direction',
    required: true,
    title: 'What should the agent build next?',
  },
  {
    choices: [
      {
        label: 'Progress',
        value: 'progress',
      },
      {
        label: 'Decisions',
        value: 'decisions',
      },
      {
        label: 'Risks',
        value: 'risks',
      },
      {
        label: 'Next step',
        value: 'next-step',
      },
    ],
    description: 'Select all that apply, or skip this question.',
    name: 'signals',
    required: false,
    title: 'What should every progress update include?',
    kind: 'multiple',
    skippable: true,
  },
  {
    choices: [
      {
        label: 'Start now',
        value: 'now',
      },
      {
        label: 'Next development cycle',
        value: 'next-cycle',
      },
      {
        label: 'Add it to the backlog',
        value: 'backlog',
      },
    ],
    description: 'Choose when the agent should begin the work.',
    name: 'timing',
    required: true,
    title: 'When should work begin?',
  },
];
questionnaire.actions = { submit: { label: 'Save plan' } };
questionnaire.addEventListener('tp-submit', (event) => {
  event.preventDefault(); // Handle submission instead of native form navigation.
  console.log(event.detail.answers, [...event.detail.data]);
});
```

```html
<tp-questionnaire label="Project questionnaire" shortcut-mode="letters"></tp-questionnaire>
```

## Root API

| Property / attribute                     | Type / default                              | Behavior                                                                                                                         |
| ---------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `questions`                              | readonly QuestionnaireQuestion array; empty | Complete ordered definitions. Names and choice values within a question must be unique. Property-only.                           |
| `flow`                                   | linear or free; linear                      | Linear allows reached items and advancing from a valid answered or explicitly skipped item. Free allows any enabled item.        |
| `choiceMode` / `choice-mode`             | single or multiple; single                  | Default choice cardinality, overridden by the question's kind.                                                                   |
| `skippable`                              | boolean, false                              | Default optional-question skip policy. Required questions never skip.                                                            |
| `value`                                  | optional answer record                      | Supply before first render for controlled aggregate answers. Getter returns committed answers.                                   |
| `defaultValue`                           | answer record, empty                        | Uncontrolled answer defaults; takes priority over question and choice defaults. Changes affect later reset, not current answers. |
| `item`                                   | optional question name                      | Controlled active item; accept proposals synchronously. Getter returns committed name.                                           |
| `defaultItem` / `default-item`           | string, empty                               | Initial enabled question; otherwise first enabled question.                                                                      |
| `shortcutMode` / `shortcut-mode`         | none, letters, numbers; none                | Unique shortcut assignment among enabled fixed answers.                                                                          |
| `nativeValidation` / `native-validation` | enabled or suppressed; enabled              | Whether to show native validity feedback. Custom invalid state always blocks progression.                                        |
| `label`                                  | string, Questionnaire                       | Accessible form name.                                                                                                            |
| `disabled`                               | boolean, false                              | Disable answers, actions and submission.                                                                                         |
| `readOnly` / `read-only`                 | boolean, false                              | Preserve answers while allowing navigation through already answered questions. Skip cannot clear answers.                        |
| `onValueChange`                          | callback(event)                             | Cancelable aggregate answer proposal.                                                                                            |
| `onItemChange`                           | callback(event)                             | Cancelable active-item proposal.                                                                                                 |

Boolean false values use property bindings. State ownership is fixed on initialization. With a controlled aggregate record, Root is the sole answer owner: do not also supply controlled choice.checked or input.value for those answers. Without it, each answer uses its own controlled/default lane. Accept a controlled proposal by assigning its proposed value synchronously; ignoring it rejects the change. Root, answer and item callbacks observe the previous committed snapshot throughout the proposal. Skip and reset commit answers, status and position atomically; vetoing or rejecting any affected controlled lane preserves all of them.

## Question and answer definitions

Every question has `name` and `title`. Optional fields are `description`, `kind` (single, multiple or text), `required`, `skippable`, `disabled`, `choices`, `input`, `defaultValue`, `invalid`, `error`, `validate(answer)` and `onStatusChange(status)`. Kind defaults to choiceMode when choices exist, otherwise text. Disabled questions are excluded from progress and submission. `invalid` and `error` expose application validation; a permitted intentional skip ignores an optional question's external error. `validate` returns a message or null. Answer presence and validity are separate: nonempty invalid text is still answered.

Choices have `value`, `label`, optional `description`, `disabled`, `shortcut`, `defaultChecked`, `checked` and `onCheckedChange(event)`. Controlled checked state uses the common Boolean proposal contract. Single choices render native radios; multiple choices render native checkboxes. Disabled answers do not contribute to answered status or successful form data.

`input` adds a freeform answer alongside choices, or configures a text-only question. It accepts `label`, `type`, `placeholder`, `pattern`, `minLength`, `maxLength`, `disabled`, controlled `value`, `defaultValue` and `onValueChange(event)`. Input-only questions also accept the compatibility fields `inputType`, `placeholder`, `pattern`, `minLength` and `maxLength` directly on the question. A mixed single answer selects either a choice or entered text; an unselected text draft is preserved but has no successful form name. Multiple answers can combine fixed values and entered text. Input type defaults to text and retains browser editing/validation behavior.

Status is exactly unanswered, answered or skipped. Entering/selecting an answer clears skipped status. Empty or whitespace-only text and empty multiple sets are unanswered. Defaults update reset targets without replacing current values. Dynamic definition changes update order, shortcuts and enabled focus targets. An uncontrolled removed active item selects the next remaining item, then previous. A controlled removed identifier is preserved until its owner supplies a valid item; progress reports no active item in the meantime.

## Methods, state and events

- `answers` returns a copy of committed logical answers. Each record value is a string or string array. `currentItem`, `current`, `total`, `first`, `last` and `status` expose progress; an empty questionnaire has current/total zero.
- `setAnswer(name, answer, sourceEvent?)` proposes an answer; returns whether accepted. Controlled constituent owners still participate.
- `setItem(name, sourceEvent?)` proposes navigation under the flow rules; returns whether accepted.
- `requestSubmit()` requests native form submission with whole-questionnaire validation.
- `reset()` requests a cancelable native reset, restoring owned answer defaults and the initial item.

`tp-value-change` carries the aggregate record; `tp-item-change` carries the question name; `tp-answer-change` carries an individual checked/text value plus question and optional choice identifiers when Root does not control an aggregate record. These events bubble, are composed and cancelable. Common detail includes value, previousValue, reason, sourceEvent and cancelled. Callback cancellation and preventDefault are both honored. Programmatic, input, selection, click, keyboard, submit and form-reset reasons identify the initiating path.

`tp-submit` carries `{ form, data, answers, reason, sourceEvent }`; prevent default to handle submission without native navigation. FormData retains prior active answers and omits disabled, skipped and unselected draft answers. Failed submission activates and focuses the first invalid question. `tp-diagnostic` reports invalid names/choice values, mixed answer owners or invalid ownership transitions. The native reset event can be canceled on the exposed form; canceled reset preserves values and progress.

## Keyboard, parts and theme

Native radio navigation and input editing remain native. Outside those paths, Up/Down move answer focus, Left moves back, Right advances an answered valid question, and Enter on a filled answer or modified Enter validates and confirms. Shortcuts focus and activate enabled choices. Repeated commands and composition do not trigger navigation. New questions receive the selected/filled answer, first enabled control, or fieldset focus, in that order. Invalid filled inputs receive native feedback when enabled.

Public parts and dictionary keys: questionnaire, questionnaire-progress, questionnaire-question, questionnaire-title, questionnaire-description, questionnaire-choices, questionnaire-choice, questionnaire-input-region, questionnaire-error and questionnaire-actions. All generated regions use the common part renderer with `partContracts` and `partPresentation`, including reference and delegate support. Preserve required form/fieldset/legend/label semantics and forward supplied properties/content when delegating. Child Buttons keep their own Button APIs and recipes.

Progress exposes current/total/first/last; Question exposes name/status/active/invalid/required; Choice exposes type/checked/disabled/invalid/shortcut. Actions publish visible/hidden/status/shortcut and native disabled state. Shared theme spacing, radius, color, type and motion tokens govern presentation; no instance spacing attributes are added. Descriptions, freeform input, choice descriptions, shortcuts, validation error and navigation actions render independently when applicable.

Free-answer input configuration also forwards native `min`, `max`, `step`,
`autocomplete`, `inputMode`, `enterKeyHint`, `autocapitalize`, `spellcheck`,
and `readOnly`. Numeric/date bounds participate in validation. Root/question
identity, required state, and submission names remain owned by Questionnaire.
`requestSubmit()` waits for the current render so same-turn programmatic answer
changes are present in native FormData.

## Navigation controls

`actions` is a property-only record keyed by `previous`, `skip`, `next`, and
`submit`. Each entry accepts `label`, `variant`, `size`, `disabled`, and `hidden`.
The latter two default to false and can further restrict the component's own
availability; they cannot enable an inapplicable action. Labels default to
Previous, Skip, Next, and Submit. Size defaults to Button's `default`; Previous
and Skip use `outline`, Next and Submit use `default`. Values for size and
variant are the existing Button API. Replace the record to update it.

```js
questionnaire.actions = {
  next: { variant: 'secondary', disabled: questionnaire.status !== 'answered' },
  submit: { label: 'Save plan' },
};
```

Use each question's `onStatusChange` and the committed item after
`tp-item-change` to derive application navigation availability. Disabled buttons
remain disabled; this does not change the validation or programmatic navigation
policy. Enter/Space on an actual button activate that button, so Previous, Skip,
Reset, and host actions retain their own behavior.

## Constituent coverage and composition

Tweakpad exposes the reference's constituents through ordered question definitions,
the ten canonical public parts, and existing Button instances. It does not require
separate custom elements for every React export.

| Reference constituent           | Tweakpad public interface                                                                   | Render state / behavior                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Root                            | `tp-questionnaire`, `questions`, `value`, `item`, form methods/events; `questionnaire` part | `current`, `total`, `first`, `last`, `status`, `disabled`, active `name`; `regions`                                           |
| Progress                        | `questionnaire-progress` part                                                               | Common state; named progressbar with current/total and value text                                                             |
| Item                            | Question definition; `questionnaire-question` part                                          | Common state plus `active`, `required`, `multiple`, `invalid`, `regions`; native fieldset                                     |
| Title                           | `question.title`; `questionnaire-title` part                                                | Native legend with stable ID; fieldset uses that ID for its accessible name                                                   |
| Description                     | `question.description`; `questionnaire-description` part                                    | Independently optional text associated with the fieldset and controls                                                         |
| Choices                         | `question.choices`; `questionnaire-choices` part                                            | Common state plus `shortcuts`; groups fixed choices and freeform input                                                        |
| Choice                          | Choice definition; `questionnaire-choice` part                                              | Common state plus choice `value`, `type`, `checked`, `disabled`, `invalid`, `shortcut`                                        |
| ChoiceInput                     | Generated native radio/checkbox                                                             | Cardinality, name, checked, required, disabled, invalid and shortcut are owned by Questionnaire                               |
| ChoiceLabel / ChoiceDescription | `choice.label` / `choice.description`                                                       | Independently authored native label text and description                                                                      |
| ChoiceShortcut                  | `shortcutMode`, optional `choice.shortcut`                                                  | Generated KeyHint and native `aria-keyshortcuts`                                                                              |
| Input                           | `question.input`; `questionnaire-input-region` part                                         | Common state plus `filled`, `disabled`, `invalid`; native input with documented constraints                                   |
| Error                           | `invalid`, `error`, `validate`; `questionnaire-error` part                                  | Active invalid message is announced with `role=alert` and associated with controls                                            |
| Actions                         | `questionnaire-actions` part, `actions` record                                              | Shared action layout; content can include host-owned controls while preserving the supplied buttons                           |
| Previous / Skip / Next / Submit | Corresponding `actions` entry                                                               | Actual Buttons publish `data-action`, `data-status`, `data-visible`/`data-hidden`, `data-shortcut`, hidden and disabled state |

Every part supports the shared `partContracts` options: `content`, `hostProperties`,
`classHook`, `styleHook`, `elementReference`, and `renderDelegate`. A delegate must
bind the supplied `bind` directive to the semantic host and preserve supplied
content unless deliberately recomposing it. State callbacks receive committed
values. Keep native inputs in the form's DOM tree; don't move them into a new
shadow root or a second form.

Root's `state.regions` contains `progress`, `answers` (hidden successful controls),
`question`, and `actions`. Question's regions contain `title`, `description`,
`choices`, `input`, `error`, `progress`, and `actions`. `choices` already includes
`input`; render `input` separately only when replacing the default Choices
composition. Render each region once. For example, a Card delegate can place
Title/Description/Progress into its header/description/action slots, Choices and
Error into its content, and Actions into its footer. Root then renders only hidden
answers and the composed Question. The provided fieldset `aria-labelledby`
preserves naming when Title is rendered as a span in Card's header.

```js
questionnaire.partContracts = {
  'questionnaire-progress': {
    content: ({ current, total }) => `Checkpoint ${current} of ${total}`,
  },
};
```

Question nodes are keyed by question name. An entrance animation attached through
Question's `elementReference` runs on item changes without replacing Progress or
Actions. Cancel animation when the reference becomes null and honor the inherited
`--tp-motion-scale` (including `motion-policy="reduce"` and OS reduced motion).
Do not animate each answer update or delay focus until the animation finishes.

## Usage examples

The documentation demos follow the [shadcn base Questionnaire use cases](https://ui.shadcn.com/docs/components/base/questionnaire)
and their prompts, choices, and flow:

| Use case           | What to try                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Default            | Plan the next agent feature, choose optional progress signals, then save its start time.        |
| Multiple selection | Select several context sources; submission retains every selected value.                        |
| Freeform answer    | Enter another refactoring approach or select one of the fixed choices.                          |
| Explicit skip      | Skip optional implementation constraints; skipped data is omitted.                              |
| Shortcuts          | Switch letters/numbers with Select, activate an answer, and confirm with Enter.                 |
| Custom validation  | Concise summary + Public audience returns to detail with an error; Complete answer resolves it. |
| Controlled         | Host accepts item proposals and displays the current checkpoint.                                |
| Resume             | Start at the saved second question, edit answers, then restore saved defaults.                  |
| Conditional items  | Cloud enables the environment question; Local excludes it from progress, validation and data.   |
| Navigation state   | Derive independent Next/Submit disabled state from the active item's status.                    |
| Custom progress    | Compose the library Progress from the Progress part's state.                                    |
| Animated items     | Animate only the entering fieldset, respecting reduced motion.                                  |
| Card               | Recompose the original bound parts into the existing Card's slots.                              |
| Dialog             | Host owns cancel, close and focus return; successful submission closes the dialog.              |

Examples include copyable markup and setup/cleanup code using the same public
controls. Configure `questions`, controlled values and defaults **before first
connection/render**. A restored active item alone does not create saved answers;
supply `defaultValue`, per-question defaults, or per-answer defaults as appropriate.
Custom validation can be any host validator; the example uses a dependency-free
cross-answer predicate instead of adding a schema runtime to the library.

The host owns transport, persistence, completion feedback, cancellation, and
conditional question definitions. Questionnaire does not save or send responses
itself. It must not be nested inside another native form.
