import { WIDGET_REGISTER_IMPORTS, interactiveMarkupExample } from '../documentation-examples.js';
import { setupEasingEditorExample } from './easing-editor-example.js';
import setupSource from './easing-editor-example.js?raw';

function example(title: string, content: string, description: string) {
  const id = 'easing-editor-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return interactiveMarkupExample(
    title,
    `<div id="${id}">${content}</div>`,
    setupEasingEditorExample,
    `${setupSource}\nsetupEasingEditorExample(document.getElementById('${id}'));`,
    description,
    { registerImports: WIDGET_REGISTER_IMPORTS },
  );
}

export const easingEditorExamples = [
  example(
    'Live value',
    '<tp-easing-editor label="Motion" default-value="ease-out" data-output></tp-easing-editor>',
    'The published value is the canonical notation of the curve kind; every change is a cancelable `tp-value-change` and each settled interaction a `tp-value-commit`. The readout also shows the active adapter output.',
  ),
  example(
    'Controlled owner',
    '<tp-easing-editor label="Reveal" data-controlled="spring(1 200 8)" data-output></tp-easing-editor>',
    'A controlled owner writes the proposed value back; the Tabs, presets, handles and fields all propose on the same lane.',
  ),
  example(
    'Rejecting overshoot',
    '<tp-easing-editor label="Lift" default-value="ease-in-out" data-limit="1.25" data-output></tp-easing-editor>',
    'Cancelling `tp-value-change` leaves the curve, the handles, the fields and the form state unchanged: here Bézier control points beyond ±1.25 are refused.',
  ),
  example(
    'Compact in a dialog',
    `<tp-button data-opens="easing-dialog">Edit easing</tp-button>
<tp-dialog id="easing-dialog" label="Transition easing">
  <tp-easing-editor label="Transition" layout="compact" default-value="cubic-bezier(0.34, 1.56, 0.64, 1)" data-output></tp-easing-editor>
</tp-dialog>`,
    'The compact layout keeps the presets behind a Toggle: they overlay the graph and scroll inside it, a pick or Escape closes them. The overshooting curve extends the graph range in quarter steps.',
  ),
  example(
    'Custom points',
    '<tp-easing-editor label="Custom" default-value="linear(0, 0.3 20%, 1.15 60%, 1)" timing="false" data-output></tp-easing-editor>',
    'Custom curves are CSS `linear()` point lists: press the empty graph to add a point, drag points, Delete removes the focused one, and the Add and Remove buttons do the same from the keyboard. `timing="false"` hides the duration control.',
  ),
  example(
    'Export adapters',
    '<tp-easing-editor label="Export" default-value="power(out 3)" preview="rotation" data-adapters data-output></tp-easing-editor>',
    'Adapters serialize the record for a target: the CSS adapter emits `cubic-bezier()`, `steps()` or sampled `linear()`; a consumer adapter receives the record, the duration, the CSS text and a sampler. Parametric families offer their own parameters.',
  ),
  example(
    'In a form',
    `<tp-form data-form-output>
  <tp-field label="Entrance" description="The easing string submits under its name.">
    <tp-easing-editor name="entrance" size="sm" default-value="ease-out" preview-controls="false" frames="false"></tp-easing-editor>
  </tp-field>
  <div slot="actions">
    <tp-button type="submit">Save</tp-button>
    <tp-button type="reset" variant="outline">Reset</tp-button>
  </div>
</tp-form>`,
    'The widget is a form control: the canonical string submits under `name`, `required` validates, and Reset restores the default through `form-reset`. The small size hides nothing; this example hides the preview controls and the frames bar through their own properties.',
  ),
];
