// `@tweakpad/ui/register/widgets` defines every widget; `@tweakpad/ui/register` never does.
// One import and one definition per widget, roots before the parts they resolve:
import { TpColorPicker } from '../widgets/color-picker/color-picker.js';
import { TpEasingEditor } from '../widgets/easing-editor/easing-editor.js';
import { TpFlow } from '../widgets/flow/flow.js';
import { defineElement } from '../foundation/define.js';

defineElement(TpColorPicker.tagName, TpColorPicker);
defineElement(TpEasingEditor.tagName, TpEasingEditor);
defineElement(TpFlow.tagName, TpFlow);

export * from '../widgets/index.js';
