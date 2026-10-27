import type { TextEditorEngine } from '../../foundation/text-editor/index.js';
import { WIDGET_REGISTER_IMPORTS, moduleExample } from '../documentation-examples.js';
import { lexicalEngine, setupTextEditorExample, tiptapEngine } from './text-editor-example.js';
import setupSource from './text-editor-example.js?raw';

type DocumentationExample = ReturnType<typeof moduleExample>;

/** The editor of both stories, with the sample notes. */
const storyMarkup =
  '<tp-text-editor label="Field notes" name="notes" placeholder="Write what you observed" data-sample></tp-text-editor>';

/** The copyable code of a story: its editor and the example module, mounted with one engine. */
const storyExample = (
  createEngine: () => TextEditorEngine,
  factory: string,
): DocumentationExample =>
  moduleExample({
    title: 'Field notes',
    id: 'text-editor-notes',
    markup: storyMarkup,
    setup: (root) => setupTextEditorExample(root, createEngine),
    source: setupSource,
    call: `setupTextEditorExample(document.getElementById('text-editor-notes'), ${factory});`,
    registerImports: WIDGET_REGISTER_IMPORTS,
  });

/** The copyable code of each story, keyed by its export. */
export const textEditorStorySources: { readonly Default: string; readonly Lexical: string } = {
  Default: storyExample(tiptapEngine, 'tiptapEngine').code,
  Lexical: storyExample(lexicalEngine, 'lexicalEngine').code,
};

const FORM_MARKUP = `<tp-form data-form-output>
  <tp-field label="Field notes" description="Submitted as Markdown under the name notes.">
    <tp-text-editor name="notes" format="markdown" default-value="Low tide at 07:40. **Pools 4 to 7** need a recount."></tp-text-editor>
  </tp-field>
  <div slot="actions">
    <tp-button type="submit">Save</tp-button>
    <tp-button type="reset" variant="outline">Reset</tp-button>
  </div>
</tp-form>
<tp-code-block language="markdown" label="Submitted" data-submitted hidden></tp-code-block>`;

const FORM_DESCRIPTION =
  "With `name`, the editor submits its document in its `format`, Markdown here, refreshed at every commit and when the form is submitted; Enter never submits the form. Reset restores `default-value`. Inside a Field, the Field's label names the editor and its description describes it.";

const CUSTOM_BLOCKS_DESCRIPTION =
  'Nodes assigned to `nodes`: a callout, a textblock that the editor presents as a callout, and an embed, an atom that shows an https page in a sandboxed frame with a required title, both defined with `defineTextEditorBlock`; and a mention defined with `defineTextEditorInline`, which `@` inserts from a list searched after a short delay. Each block gets the gutter, the block menu, block selection and drag, and a tool in the slash menu, with the blocks and suggestions features assigned.';

const CLASSIC_DESCRIPTION =
  'The classic toolbar editor: `features` holds links, tables and images, so every control sits in the fixed toolbar, as in a word processor. Without the blocks, selection toolbar and suggestions features, the page bundles no gutter, drag, floating toolbar or slash menu.';

const BLOCKS_DESCRIPTION =
  'The block editor: every feature with the fixed toolbar turned off (`layout: { toolbar: [] }`). The gutter beside each block inserts and drags, `/` opens the slash menu, a text selection shows the floating toolbar, and Alt+F10 reaches the controls from the keyboard.';

/** The Docs "Usage examples": distinct use cases of the editor. */
export const textEditorExamples: readonly DocumentationExample[] = [
  moduleExample({
    title: 'Classic toolbar',
    id: 'text-editor-classic',
    markup:
      '<tp-text-editor label="Report" placeholder="Write the report" data-sample data-mode="classic"></tp-text-editor>',
    setup: (root) => setupTextEditorExample(root, tiptapEngine),
    source: setupSource,
    call: "setupTextEditorExample(document.getElementById('text-editor-classic'), tiptapEngine);",
    description: CLASSIC_DESCRIPTION,
    registerImports: WIDGET_REGISTER_IMPORTS,
  }),
  moduleExample({
    title: 'Block editor',
    id: 'text-editor-blocks',
    markup:
      '<tp-text-editor label="Field notes" placeholder="Type / for blocks" data-sample data-mode="blocks"></tp-text-editor>',
    setup: (root) => setupTextEditorExample(root, tiptapEngine),
    source: setupSource,
    call: "setupTextEditorExample(document.getElementById('text-editor-blocks'), tiptapEngine);",
    description: BLOCKS_DESCRIPTION,
    registerImports: WIDGET_REGISTER_IMPORTS,
  }),
  moduleExample({
    title: 'In a form',
    id: 'text-editor-in-a-form',
    markup: FORM_MARKUP,
    setup: (root) => setupTextEditorExample(root, tiptapEngine),
    source: setupSource,
    call: "setupTextEditorExample(document.getElementById('text-editor-in-a-form'), tiptapEngine);",
    wrapperStyle: 'display:grid;gap:var(--tp-space-4);min-inline-size:0',
    description: FORM_DESCRIPTION,
    registerImports: WIDGET_REGISTER_IMPORTS,
  }),
  moduleExample({
    title: 'Custom nodes',
    id: 'text-editor-custom-blocks',
    markup: '<tp-text-editor label="Mooring notes" data-custom-blocks></tp-text-editor>',
    setup: (root) => setupTextEditorExample(root, tiptapEngine),
    source: setupSource,
    call: "setupTextEditorExample(document.getElementById('text-editor-custom-blocks'), tiptapEngine);",
    description: CUSTOM_BLOCKS_DESCRIPTION,
    registerImports: WIDGET_REGISTER_IMPORTS,
  }),
];
