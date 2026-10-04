# Questionnaire

`tp-questionnaire` is an ordered native form with one active question. It supports fixed choices, free text, mixed answers, validation, optional skipping and submission. Its actions use library Buttons; the required native inputs share the library's input, selection and shortcut presentation recipes.

```ts
import '@tweakpad/ui/styles.css';
import '@tweakpad/ui/register';
const questionnaire = document.querySelector('tp-questionnaire');
questionnaire.questions = [
  {
    name: 'prototype',
    title: 'What should we prototype next?',
    required: true,
    description: 'Choose a direction or write your own.',
    choices: [
      {
        value: 'delegation',
        label: 'Delegation',
        description: 'Show how work moves to a specialist.',
      },
      { value: 'questions', label: 'Question prompts' },
    ],
    input: { label: 'Another answer', placeholder: 'Type another answer…' },
  },
  {
    name: 'detail',
    title: 'How much detail?',
    skippable: true,
    choices: [
      { value: 'focused', label: 'Focused' },
      { value: 'complete', label: 'Complete flow' },
    ],
  },
];
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
