// `@tweakpad/ui/register/widgets` defines every widget; `@tweakpad/ui/register` never does.
// One import and one definition per widget, roots before the parts they resolve:
import { TpColorPicker } from '../widgets/color-picker/color-picker.js';
import { TpGradientPicker } from '../widgets/gradient-picker/gradient-picker.js';
import { TpGradientStop } from '../widgets/gradient-picker/gradient-stop.js';
import { TpEasingEditor } from '../widgets/easing-editor/easing-editor.js';
import { TpFlow } from '../widgets/flow/flow.js';
import { TpEmojiPicker } from '../widgets/emoji-picker/emoji-picker.js';
import { TpPlot } from '../widgets/plot/plot.js';
import { TpTextEditor } from '../widgets/text-editor/text-editor.js';
import { TpColorPalette } from '../widgets/color-palette/color-palette.js';
import { TpLayers } from '../widgets/layers/layers.js';
import { TpLayer, TpLayerState, TpLayerStateValue } from '../widgets/layers/layer.js';
import { TpHeatmap } from '../widgets/heatmap/heatmap.js';
import { TpImageEditor } from '../widgets/image-editor/image-editor.js';
import { TpFileExplorer } from '../widgets/file-explorer/file-explorer.js';
import { defineElement } from '../foundation/define.js';

defineElement(TpColorPicker.tagName, TpColorPicker);
defineElement(TpGradientPicker.tagName, TpGradientPicker);
defineElement(TpGradientStop.tagName, TpGradientStop);
defineElement(TpEasingEditor.tagName, TpEasingEditor);
defineElement(TpFlow.tagName, TpFlow);
defineElement(TpEmojiPicker.tagName, TpEmojiPicker);
defineElement(TpPlot.tagName, TpPlot);
defineElement(TpTextEditor.tagName, TpTextEditor);
defineElement(TpColorPalette.tagName, TpColorPalette);
defineElement(TpLayers.tagName, TpLayers);
defineElement(TpLayer.tagName, TpLayer);
defineElement(TpLayerState.tagName, TpLayerState);
defineElement(TpLayerStateValue.tagName, TpLayerStateValue);
defineElement(TpHeatmap.tagName, TpHeatmap);
defineElement(TpImageEditor.tagName, TpImageEditor);
defineElement(TpFileExplorer.tagName, TpFileExplorer);

export * from '../widgets/index.js';
