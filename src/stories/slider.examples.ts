import { interactiveMarkupExample } from './documentation-examples.js';
import { setupSliderExample } from './slider-example.js';
import setupSource from './slider-example.js?raw';

function example(title: string, content: string, description: string) {
  const id = 'slider-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return interactiveMarkupExample(
    title,
    `<div id="${id}">${content}</div>`,
    setupSliderExample,
    `${setupSource}\nsetupSliderExample(document.getElementById('${id}'));`,
    description,
  );
}
export const sliderExamples = [
  example(
    'Label and live value',
    '<tp-slider label="Volume" default-value="40" data-output data-unit="%"></tp-slider>',
    'Label and Output belong to Slider. Their spacing and endpoint clearance come from its shared layout and presentation recipe.',
  ),
  example(
    'Compact value readout',
    '<tp-slider aria-label="Previous context" minimum="64" maximum="128" default-value="64" data-output data-unit="px"></tp-slider>',
    'Omit the visible Label to place the existing Output beside the track. No external output, wrapper gap, or local spacing override is needed.',
  ),
  example(
    'Range',
    '<tp-slider label="Price range" default-value="25 50" step="5" data-output></tp-slider>',
    'Two values generate two distinctly named Thumbs. The Range spans their committed values.',
  ),
  example(
    'Multiple thumbs',
    '<tp-slider label="Milestones" default-value="10 20 70" step="10" data-output></tp-slider>',
    'An ordered list generates one Thumb per value; keyboard focus reaches each Thumb independently.',
  ),
  example(
    'Vertical',
    '<tp-slider label="Level" orientation="vertical" default-value="50" data-output></tp-slider>',
    'The same Label, Output, Track and Thumb work on the vertical axis. Up/Down, Home and End adjust the value.',
  ),
  example(
    'Vertical range',
    '<tp-slider label="Working range" orientation="vertical" default-value="25 75" data-output></tp-slider>',
    'A vertical range preserves independent Thumb names and values; its default usable extent is owned by Slider.',
  ),
  example(
    'Controlled decimal range',
    '<tp-form><tp-slider label="Temperature interval" value="0.3 0.7" minimum="0" maximum="1" step="0.1" large-step="0.2" data-controlled data-output></tp-slider><div slot="actions"><tp-button data-restore>Restore interval</tp-button></div></tp-form>',
    'The owner synchronously accepts each proposal through value. Restore demonstrates external updates; step and largeStep use the same fractional domain.',
  ),
  example(
    'Localized currency',
    '<tp-slider label="Budget" default-value="1200" maximum="5000" step="100" locale="de-DE" data-format="currency" data-output></tp-slider>',
    'Intl.NumberFormat formats both the Output and accessible value text. The committed value remains numeric.',
  ),
  example(
    'Percentage formatting',
    '<tp-slider label="Opacity" default-value="0.6" minimum="0" maximum="1" step="0.05" large-step="0.1" data-format="percent" data-output></tp-slider>',
    'Formatting changes presentation, not the domain: 0.6 is displayed as 60%.',
  ),
  example(
    'Disabled',
    '<tp-slider label="Unavailable setting" default-value="50" disabled data-output></tp-slider>',
    'Disabled sliders cannot be focused or changed and do not submit a value.',
  ),
  example(
    'Read only',
    '<tp-slider label="Recorded level" name="level" default-value="65" readonly data-output></tp-slider>',
    'Read-only thumbs remain focusable and readable, but cannot be adjusted. A named read-only value still participates in forms.',
  ),
  example(
    'Independent thumb configuration',
    '<tp-slider label="Review window" default-value="20 70" data-output><tp-slider-thumb index="0" value-text="Fixed start at 20" disabled></tp-slider-thumb><tp-slider-thumb index="1" value-text="Adjust the end of the window"></tp-slider-thumb></tp-slider>',
    'Authored Thumbs share the Root value owner. The first Thumb is a disabled barrier; the second remains adjustable. valueText overrides its spoken value.',
  ),
  ...(['push', 'swap', 'none'] as const).map((policy) =>
    example(
      `Collision: ${policy}`,
      `<tp-slider label="${policy === 'push' ? 'Adjust neighboring stops' : policy === 'swap' ? 'Reorder stops' : 'Keep stops separated'}" default-value="30 50 70" thumb-collision-behavior="${policy}" min-steps-between-values="5" data-output></tp-slider>`,
      policy === 'push'
        ? 'Move a Thumb into its neighbor to push it while retaining five steps of separation.'
        : policy === 'swap'
          ? 'Move through a neighbor to exchange logical indices while keeping focus on the moving Thumb.'
          : 'Move toward a neighbor: the Thumb stops before violating the five-step separation.',
    ),
  ),
  ...(['center', 'edge', 'delayed-edge'] as const).map((alignment) =>
    example(
      `Endpoint alignment: ${alignment}`,
      `<tp-slider label="Endpoint alignment" default-value="0 100" thumb-alignment="${alignment}" data-output></tp-slider>`,
      alignment === 'center'
        ? 'At a bound, half the visible Thumb extends beyond the Track. This is the API default.'
        : alignment === 'edge'
          ? 'The measured Thumb stays within the Track at each bound.'
          : 'Starts with centered endpoints and adopts measured edge alignment after activation.',
    ),
  ),
  example(
    'Right to left',
    '<tp-slider dir="rtl" label="Reading progress" default-value="75" data-output></tp-slider>',
    'The track, range, values and Left/Right keys follow logical direction. Up/Down retain numeric meaning.',
  ),
  example(
    'Field and form submission',
    '<tp-form><tp-field label="Daily budget" description="Choose between 10 and 100 units."><tp-slider name="budget" minimum="10" maximum="100" default-value="40" required data-output></tp-slider></tp-field><div slot="actions"><tp-button type="submit">Save budget</tp-button><tp-button type="reset" variant="outline">Reset</tp-button></div><output data-status aria-live="polite"></output></tp-form>',
    'Field supplies the accessible label and description. Submit reports the numeric form value; Reset restores the uncontrolled default.',
  ),
  example(
    'Rejecting proposals and observing commits',
    '<tp-form><tp-slider label="Safety ceiling" default-value="60" data-limit data-output></tp-slider><output data-status aria-live="polite">Values above 80 will be rejected.</output></tp-form>',
    'Try End, then ArrowRight/Left. Canceled proposals preserve the prior value and do not commit; accepted keyboard changes commit immediately and drags commit on release.',
  ),
  example(
    'Dynamic authored thumbs',
    '<tp-form><tp-slider label="Editable interval" default-value="25"><tp-slider-thumb index="0"></tp-slider-thumb></tp-slider><div slot="actions"><tp-button data-add>Add end</tp-button><tp-button data-remove variant="outline">Remove end</tp-button></div></tp-form>',
    'Add or remove an authored Thumb through the public composition. The Root owns values; removing a Thumb normalizes the uncontrolled list.',
  ),
];
