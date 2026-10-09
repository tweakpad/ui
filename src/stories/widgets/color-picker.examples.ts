import { WIDGET_REGISTER_IMPORTS, interactiveMarkupExample } from '../documentation-examples.js';
import { setupColorPickerExample } from './color-picker-example.js';
import setupSource from './color-picker-example.js?raw';

function example(title: string, content: string, description: string) {
  const id = 'color-picker-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return interactiveMarkupExample(
    title,
    `<div id="${id}">${content}</div>`,
    setupColorPickerExample,
    `${setupSource}\nsetupColorPickerExample(document.getElementById('${id}'));`,
    description,
    { registerImports: WIDGET_REGISTER_IMPORTS },
  );
}

const SWATCHES = JSON.stringify([
  '#fb8c00',
  '#e53935',
  '#8e24aa',
  '#3949ab',
  '#039be5',
  '#00897b',
  '#7cb342',
  '#fdd835',
  { label: 'Brand', colors: ['#6d5dfc', '#2622a5', 'rgb(255 255 255 / 0.5)'] },
]);

export const colorPickerExamples = [
  example(
    'Live value',
    '<tp-color-picker label="Accent" default-value="#6d5dfc" data-output></tp-color-picker>',
    'The published value is the canonical serialization of the active format; every change is a cancelable `tp-value-change` and each settled interaction a `tp-value-commit`.',
  ),
  example(
    'Controlled owner',
    '<tp-color-picker label="Brand" data-controlled="hsl(242 66% 39%)" format="hsl" data-output></tp-color-picker>',
    'A controlled owner writes the proposed value back; the widget keeps its floating-point color across formats.',
  ),
  example(
    'Rejecting proposals',
    '<tp-color-picker label="Ink" default-value="#1f2937" data-limit="0.8" data-output></tp-color-picker>',
    'Cancelling `tp-value-change` leaves the value, the surfaces, the fields and the form state unchanged.',
  ),
  example(
    'Popup in a form',
    `<tp-form data-form-output>
  <tp-field label="Accent" description="Opens the picker in a popup; the string submits under its name.">
    <tp-color-picker name="accent" picker="popup" default-value="#6d5dfc"></tp-color-picker>
  </tp-field>
  <div slot="actions">
    <tp-button type="submit">Save</tp-button>
    <tp-button type="reset" variant="outline">Reset</tp-button>
  </div>
</tp-form>`,
    'The popup trigger shows the preview; opening focuses the first dimension and Escape returns focus. Reset restores the default through `form-reset`.',
  ),
  example(
    'Channel sliders',
    '<tp-color-picker label="Surface" views="sliders" default-format="oklch" default-value="oklch(0.72 0.12 250)" data-output></tp-color-picker>',
    'One Slider and value box per channel of the active format, each track painted with that channel varied across its domain.',
  ),
  example(
    'Harmony wheel',
    '<tp-color-picker label="Palette" views="wheel" default-harmony="analogous" default-value="#e53935" data-harmony-badges></tp-color-picker>',
    'The wheel derives the handles from the base color under the harmony rule; `harmonyColors` lists them base first. Choose Custom to move every handle.',
  ),
  example(
    'Hue triangle',
    '<tp-color-picker label="Tint" views="triangle" default-value="#43a047" data-output></tp-color-picker>',
    'The ring edits hue; the triangle edits saturation and brightness on a canvas rasterized at the device pixel ratio.',
  ),
  example(
    'Saved and recent colors',
    `<tp-color-picker label="Theme" views="area swatches" default-view="swatches" default-value="#fb8c00" data-swatches='${SWATCHES}' data-output></tp-color-picker>`,
    'Saved colors come from `swatches` (strings or labeled groups); every interactive commit joins the recent colors, capped at `recent-limit`.',
  ),
  example(
    'Schemes',
    '<tp-color-picker label="Scheme" views="area schemes" default-view="schemes" default-value="#fb8c00" data-output></tp-color-picker>',
    'Without `schemes` the widget generates tints, shades, tones and harmonic rows in OKLCH; the wand regenerates them from the current color.',
  ),
  example(
    'Right-to-left',
    '<div dir="rtl"><tp-color-picker label="لون" default-value="#00897b" data-output></tp-color-picker></div>',
    'The area and the Sliders mirror with the writing direction; the angular wheel and ring do not.',
  ),
];
