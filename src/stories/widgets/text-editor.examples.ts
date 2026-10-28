import type { TpTextEditor } from '../../widgets/text-editor/index.js';
import { WIDGET_REGISTER_IMPORTS, moduleExample } from '../documentation-examples.js';
import blocksSource from './text-editor-blocks-example.js?raw';
import classicSource from './text-editor-classic-example.js?raw';
import { setupCustomBlocks } from './text-editor-custom-blocks-example.js';
import customBlocksSource from './text-editor-custom-blocks-example.js?raw';
import { createEngine } from './text-editor-engine.js';
import engineSource from './text-editor-engine.js?raw';
import { setupNotesForm } from './text-editor-form-example.js';
import formSource from './text-editor-form-example.js?raw';
import { setupImageUploads } from './text-editor-images-example.js';
import imagesSource from './text-editor-images-example.js?raw';
import { createEngine as createLexicalEngine } from './text-editor-lexical-engine.js';
import lexicalEngineSource from './text-editor-lexical-engine.js?raw';
import { setupMentions } from './text-editor-mentions-example.js';
import mentionsSource from './text-editor-mentions-example.js?raw';
import { customBlockNotes, fieldNotes, mentionNotes } from './text-editor-samples.js';
import selectionSource from './text-editor-selection-example.js?raw';

type DocumentationExample = ReturnType<typeof moduleExample>;

/** Splits an authored module at its first blank line: its import lines, then the rest. */
const splitModule = (source: string): readonly [string, string] => {
  const end = source.indexOf('\n\n');
  return end === -1 ? ['', source] : [source.slice(0, end), source.slice(end + 2)];
};

const ENGINE_IMPORT = "import { createEngine } from './text-editor-engine.js';";

/**
 * One self-contained script from an engine module and an example module that imports
 * `createEngine` from it: every import first, then the engine and the example, without `export`.
 */
function withEngine(example: string, engine: string = engineSource): string {
  const [engineImports, engineBody] = splitModule(engine);
  const [imports, body] = splitModule(example);
  const exampleImports = imports
    .split('\n')
    .filter((line) => line !== ENGINE_IMPORT)
    .join('\n');
  const allImports = [engineImports, exampleImports].filter(Boolean).join('\n');
  const parts = [allImports, engineBody.trimEnd(), body.trimEnd()].filter(Boolean);
  return `${parts.join('\n\n')}\n`.replaceAll(/^export /gmu, '');
}

/**
 * The live mount of one editor: the sample document, the example's setup, and the engine released
 * when the example is removed.
 */
const mountEditor =
  (setup: (editor: TpTextEditor) => void, content: string = fieldNotes) =>
  (root: HTMLElement): (() => void) => {
    const editor = root.querySelector('tp-text-editor')!;
    editor.defaultValue = content;
    setup(editor);
    return () => {
      editor.engine = null;
    };
  };

/** An example of one editor: its markup, the module that sets it up and the call that runs it. */
function editorExample(options: {
  readonly title: string;
  readonly id: string;
  readonly markup: string;
  readonly source: string;
  readonly call: string;
  readonly setup: (editor: TpTextEditor) => void;
  readonly content?: string;
  readonly description?: string;
}): DocumentationExample {
  return moduleExample({
    title: options.title,
    id: options.id,
    markup: options.markup,
    setup: mountEditor(options.setup, options.content),
    source: options.source,
    call: options.call,
    description: options.description,
    registerImports: WIDGET_REGISTER_IMPORTS,
  });
}

const editorIn = (id: string) => `document.querySelector('#${id} tp-text-editor')`;

/** The copyable code of a story, which renders its own editor. */
const storyCode = (id: string, markup: string, source: string, setup: string): string =>
  moduleExample({
    title: id,
    id,
    markup,
    setup: () => () => {},
    source: withEngine(source),
    call: `${setup}(${editorIn(id)});`,
    registerImports: WIDGET_REGISTER_IMPORTS,
  }).code;

/** The copyable code of each story, keyed by its export. */
export const textEditorStorySources = {
  Default: storyCode(
    'text-editor-classic',
    '<tp-text-editor label="Report"></tp-text-editor>',
    classicSource,
    'setupClassicEditor',
  ),
  SelectionToolbar: storyCode(
    'text-editor-selection',
    '<tp-text-editor label="Field notes"></tp-text-editor>',
    selectionSource,
    'setupSelectionToolbarEditor',
  ),
  BlockEditor: storyCode(
    'text-editor-blocks',
    '<tp-text-editor label="Field notes" placeholder="Type / for blocks"></tp-text-editor>',
    blocksSource,
    'setupBlockEditor',
  ),
} as const;

const coreExample = editorExample({
  title: 'Core editor',
  id: 'text-editor-core',
  markup: '<tp-text-editor label="Plain notes"></tp-text-editor>',
  source: withEngine(''),
  call: `${editorIn('text-editor-core')}.engine = createEngine();`,
  setup: (editor) => {
    editor.engine = createEngine();
  },
  description:
    'No features: an engine is all the editor needs. The fixed toolbar holds history, block kinds, marks, colors and alignment, and the page loads none of the feature code.',
});

const imagesExample = editorExample({
  title: 'Image upload',
  id: 'text-editor-images',
  markup: '<tp-text-editor label="Survey photos"></tp-text-editor>',
  source: withEngine(imagesSource),
  call: `setupImageUploads(${editorIn('text-editor-images')});`,
  setup: setupImageUploads,
  description:
    'The images feature hands each new, pasted or dropped image file to `upload` with an abort signal and a progress callback; the image block shows the upload until the hook resolves its URL. `accept` and `maxFileSize` limit the files.',
});

const FORM_MARKUP = `<tp-form>
  <tp-field label="Field notes" description="Submitted as Markdown under the name notes.">
    <tp-text-editor name="notes" format="markdown" default-value="Low tide at 07:40. **Pools 4 to 7** need a recount."></tp-text-editor>
  </tp-field>
  <div slot="actions">
    <tp-button type="submit">Save</tp-button>
    <tp-button type="reset" variant="outline">Reset</tp-button>
  </div>
</tp-form>
<tp-code-block language="markdown" label="Submitted" hidden></tp-code-block>`;

const formExample = moduleExample({
  title: 'In a form',
  id: 'text-editor-in-a-form',
  markup: FORM_MARKUP,
  setup: (root) => {
    setupNotesForm(root);
    return () => {
      root.querySelector('tp-text-editor')!.engine = null;
    };
  },
  source: withEngine(formSource),
  call: "setupNotesForm(document.getElementById('text-editor-in-a-form'));",
  wrapperStyle: 'display:grid;gap:var(--tp-space-4);min-inline-size:0',
  description:
    'With `name`, the editor submits its document in its `format`, Markdown here; Enter never submits the form, and Reset restores `default-value`. Inside a Field, the Field labels and describes the editor.',
  registerImports: WIDGET_REGISTER_IMPORTS,
});

const customBlocksExample = editorExample({
  title: 'Custom blocks',
  id: 'text-editor-custom-blocks',
  markup: '<tp-text-editor label="Mooring notes"></tp-text-editor>',
  source: withEngine(customBlocksSource),
  call: `setupCustomBlocks(${editorIn('text-editor-custom-blocks')});`,
  setup: setupCustomBlocks,
  content: customBlockNotes,
  description:
    'Blocks defined with `defineTextEditorBlock` and assigned to `nodes`: a callout the editor paints in its tone, and an embed that renders its own view. Both join the slash menu and move with the block gutter.',
});

const mentionsExample = editorExample({
  title: 'Mentions',
  id: 'text-editor-mentions',
  markup: '<tp-text-editor label="Handover notes"></tp-text-editor>',
  source: withEngine(mentionsSource),
  call: `setupMentions(${editorIn('text-editor-mentions')});`,
  setup: setupMentions,
  content: mentionNotes,
  description:
    'An inline node defined with `defineTextEditorInline`: typing `@` lists the matches of its `suggest.source` and inserts the one you choose.',
});

const lexicalExample = editorExample({
  title: 'Lexical engine',
  id: 'text-editor-lexical',
  markup: '<tp-text-editor label="Plain notes"></tp-text-editor>',
  source: withEngine('', lexicalEngineSource),
  call: `${editorIn('text-editor-lexical')}.engine = createEngine();`,
  setup: (editor) => {
    editor.engine = createLexicalEngine();
  },
  description:
    'The core editor on the Lexical adapter: only the engine module changes. Features, layouts, nodes, events and appearance are the same on either engine.',
});

/**
 * The Docs "Usage examples", after the Classic toolbar, Selection toolbar and Block editor stories:
 * the common integrations first, then the smallest setups and the custom nodes.
 */
export const textEditorExamples: readonly DocumentationExample[] = [
  formExample,
  imagesExample,
  coreExample,
  lexicalExample,
  customBlocksExample,
  mentionsExample,
];
