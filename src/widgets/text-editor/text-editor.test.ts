import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TemplateResult } from 'lit';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { ContentSecurityService } from '../../foundation/content-security.js';
import type { FieldAssociationAttributes } from '../../foundation/form-element.js';
import type { TextEditorEngine, TextEditorSnapshot } from '../../foundation/text-editor/engine.js';
import { ENGINES } from '../../foundation/text-editor/index.test.js';
import type {
  TextEditorLayout,
  TextEditorLayoutGroups,
} from '../../foundation/text-editor/layout.js';
import { defaultTextEditorLayout } from '../../foundation/text-editor/layout.js';
import { defineTextEditorBlock } from '../../foundation/text-editor/nodes.js';
import { textEditorStrings } from '../../foundation/text-editor/strings.js';
import {
  createHost,
  FakeTextEngine,
  flush,
} from '../../foundation/text-editor/text-editor-fakes.test.js';
import { defineTextEditorTool } from '../../foundation/text-editor/tools.js';
import {
  applyTextEditorResolution,
  cancelsDisabledActivation,
  closedAncestorRoot,
  describeElement,
  effectiveTextEditorFormat,
  effectiveTextEditorLayout,
  formEventRoot,
  initialFieldValueDetail,
  patchFormEntries,
  resolveTextEditorTooling,
  TEXT_EDITOR_DEFAULT_MEASURE,
  textEditorCaretHidden,
  textEditorFieldValue,
  textEditorFormatConverter,
  textEditorFormValue,
  textEditorMeasureLength,
  textEditorResolutionSteps,
  textEditorRootAttributes,
  textEditorRouterConfig,
  textEditorSuppressionFallback,
  textEditorToolingSeverity,
  textEditorViewportTabIndex,
  TpTextEditor,
  type TextEditorResolutionInput,
  type TextEditorRootAttributeInput,
} from './text-editor.js';
import { textEditorStyles } from './styles.js';
import { blocksStyles } from './views/blocks.js';

// Guards ---------------------------------------------------------------------------------------

const folder = dirname(fileURLToPath(import.meta.url));
const src = resolve(folder, '../..');
const self = fileURLToPath(import.meta.url);
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(dir, entry.name))
      : entry.name.endsWith('.ts')
        ? [join(dir, entry.name)]
        : [],
  );
const GUARD_BLOCK = /^const GUARD_TOKENS = \{$[\s\S]*?^\} as const;$/mu;
/** A file's text, without this file's own token block. */
const text = (file: string) => {
  const content = readFileSync(file, 'utf8');
  return file === self ? content.replace(GUARD_BLOCK, '') : content;
};
const all = files(folder);
const code = all.filter((file) => !file.endsWith('.test.ts'));
const name = (file: string) => relative(folder, file);

const GUARD_TOKENS = {
  adapters: 'foundation/text-editor/adapters/',
  selection: ['getSelection(', '.anchorNode', '.isCollapsed', '.getRangeAt('],
  engineApi: ['.view.', '.commands.', 'editor.update(', '$get'],
  native: '.native',
  partExport: 'exportparts',
  frames: [
    'requestAnimationFrame(',
    'cancelAnimationFrame(',
    'performance.now(',
    'ResizeObserver(',
    'MutationObserver(',
    'IntersectionObserver(',
    'loadingdone',
  ],
} as const;

/** Every import or re-export specifier of a text, with whether it is type-only. */
const specifiers = (source: string) =>
  [
    ...source.matchAll(
      /^(?:import|export)\s+(type\s+)?[^'"]*?from\s*['"]([^'"]+)['"]|^import\s*['"]([^'"]+)['"]|(?<![\w$.])import\s*\(\s*['"]([^'"]+)['"]/gmu,
    ),
  ].map((match) => ({ typeOnly: !!match[1], specifier: (match[2] ?? match[3] ?? match[4])! }));
const resolveModule = (from: string, specifier: string) =>
  specifier.startsWith('.') ? resolve(dirname(from), specifier.replace(/\.js$/u, '.ts')) : null;
const isAdapter = (file: string) =>
  relative(src, file).split('\\').join('/').startsWith(GUARD_TOKENS.adapters);

describe('measure (the longest line, in characters)', () => {
  it('defaults to 65 characters and maps the property to a `ch` length, none for no limit', () => {
    expect(TEXT_EDITOR_DEFAULT_MEASURE).toBe(65);
    expect(textEditorMeasureLength(55)).toBe('55ch');
    expect(textEditorMeasureLength(72.5)).toBe('72.5ch');
    for (const none of [null, undefined, 0, -3, Number.NaN, Number.POSITIVE_INFINITY, '55'])
      expect(textEditorMeasureLength(none), String(none)).toBe('none');
  });

  it('the root part carries the measure as a custom property and the content holds it', () => {
    const source = readFileSync(new URL('./text-editor.ts', import.meta.url), 'utf8');
    expect(source).toMatch(
      /style=\$\{styleMap\(\{ '--_tp-text-editor-measure': textEditorMeasureLength\(this\.measure\) \}\)\}/u,
    );
    const rule = /(?:^|\n)\s*\[part~='text-editor-content'\] > \*\s*\{([^}]*)\}/u.exec(
      textEditorStyles.cssText,
    )?.[1];
    expect(rule).toMatch(/max-inline-size:\s*var\(--_tp-text-editor-measure, none\);/u);
    expect(rule).toMatch(/box-sizing:\s*content-box;/u);
    expect(rule).toMatch(/margin-inline:\s*auto;/u);
  });
});

describe('tp-text-editor source guards', () => {
  it('V-587: renders a focus change in the next frame unless a render ran before it, never in the focus event', () => {
    const source = readFileSync(new URL('./text-editor.ts', import.meta.url), 'utf8');
    expect(source).toContain('focusChanged: () => this.#focusChanged(),');
    const method = source.slice(source.indexOf('  #focusChanged(): void {'));
    expect(method.slice(0, method.indexOf('\n  }\n'))).toMatch(
      /this\.#focusPending = true;[\s\S]*frameLoopFor\([\s\S]*if \(!this\.#focusPending \|\| !this\.isConnected\) return false;\n\s*if \(this\.#controller\.publicationPending\) return true;\n\s*this\.requestUpdate\(\);[\s\S]*this\.#focusFrame\.wake\(\);/,
    );
    // Every render shows the current focus, and a removal cancels the frame.
    expect(source).toMatch(
      /willUpdate\(changed[^)]*\): void \{\n {4}super\.willUpdate\(changed\);\n[^\n]*\n {4}this\.#focusPending = false;/,
    );
    expect(source).toMatch(
      /disconnectedCallback\(\): void \{\n {4}super\.disconnectedCallback\(\);\n {4}this\.#cancelFocusFrame\(\);/,
    );
  });

  it('finds its own token block', () => {
    expect(readFileSync(self, 'utf8')).toMatch(GUARD_BLOCK);
    expect(text(self)).not.toMatch(GUARD_BLOCK);
  });

  it('uwg-te-par-def-1, uwg-te-req-engine-9: no widget module imports an adapter module', () => {
    const offenders = all.flatMap((file) =>
      specifiers(text(file))
        .map(({ specifier }) => resolveModule(file, specifier))
        .filter((target): target is string => target !== null && isAdapter(target))
        .map((target) => `${name(file)} -> ${relative(src, target)}`),
    );
    expect(offenders).toEqual([]);
  });

  it('uwg-te-par-def-1: no widget module reaches the adapters through runtime imports', () => {
    const seen = new Map<string, string | null>();
    const reaches = (file: string): string | null => {
      if (seen.has(file)) return seen.get(file)!;
      seen.set(file, null);
      if (isAdapter(file)) {
        seen.set(file, file);
        return file;
      }
      let source: string;
      try {
        source = readFileSync(file, 'utf8');
      } catch {
        return null;
      }
      for (const { typeOnly, specifier } of specifiers(source)) {
        const target = typeOnly ? null : resolveModule(file, specifier);
        const reached = target && reaches(target);
        if (reached) {
          seen.set(file, reached);
          return reached;
        }
      }
      return null;
    };
    const offenders = code.flatMap((file) => {
      const reached = reaches(file);
      return reached ? [`${name(file)} -> ${relative(src, reached)}`] : [];
    });
    expect(offenders).toEqual([]);
  });

  it('uwg-te-req-engine-9: widget code reads no document selection', () => {
    const offenders = code.flatMap((file) =>
      GUARD_TOKENS.selection
        .filter((token) => text(file).includes(token))
        .map((token) => `${name(file)}: ${token}`),
    );
    expect(offenders).toEqual([]);
  });

  it('uwg-te-req-pres-1, uwg-te-req-pkg-1: no widget source names an engine or its interface', () => {
    const offenders = all.flatMap((file) => {
      const content = text(file);
      return [
        ...(ENGINES.pattern.test(content) ? [`${name(file)}: engine name`] : []),
        ...GUARD_TOKENS.engineApi
          .filter((token) => content.includes(token))
          .map((token) => `${name(file)}: ${token}`),
      ];
    });
    expect(offenders).toEqual([]);
  });

  it('uwg-te-req-prop-2: native is read only by its getter', () => {
    const reads = code.flatMap((file) =>
      text(file)
        .split('\n')
        .filter((line) => line.includes(GUARD_TOKENS.native))
        .map((line) => `${name(file)}: ${line.trim()}`),
    );
    expect(reads).toEqual(['text-editor.ts: return this.#controller.native;']);
    expect(text(join(folder, 'text-editor.ts'))).toMatch(
      /get native\(\): unknown \{\s*return this\.#controller\.native;/u,
    );
  });

  it('uwg-te-req-pres-8: no widget source re-exports a nested part', () => {
    expect(all.filter((file) => text(file).includes(GUARD_TOKENS.partExport)).map(name)).toEqual(
      [],
    );
  });

  it('uwg-te-req-perf-1: widget code uses the shared frame loop and observation services', () => {
    const offenders = code.flatMap((file) =>
      GUARD_TOKENS.frames
        .filter((token) => text(file).includes(token))
        .map((token) => `${name(file)}: ${token}`),
    );
    expect(offenders).toEqual([]);
  });
});

describe('tp-text-editor form events', () => {
  it('uwg-te-req-value-4: listens for the form events in its own tree, so a form inside a shadow root refreshes the entry before submission', () => {
    const shadow = { nodeType: 11 } as unknown as ShadowRoot;
    const document = { nodeType: 9 } as unknown as Document;
    const inShadow = { getRootNode: () => shadow } as unknown as Node;
    const inDocument = { getRootNode: () => document } as unknown as Node;
    const detached = { nodeType: 1 } as unknown as Node;
    Object.assign(detached, { getRootNode: () => detached });
    expect(formEventRoot(inShadow)).toBe(shadow);
    expect(formEventRoot(inDocument)).toBe(document);
    expect(formEventRoot(detached)).toBeNull();
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'text-editor.ts'),
      'utf8',
    );
    expect(source).toContain('this.#listenForms(formEventRoot(this));');
  });
});

describe('tp-text-editor removal before the first update (V-585)', () => {
  it('a first update that runs after the removal sets up no view; the reconnection does', () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'text-editor.ts'),
      'utf8',
    );
    const start = source.indexOf('protected override firstUpdated(');
    const first = source.slice(start, source.indexOf('\n  }\n', start));
    const guard = first.indexOf('if (!this.isConnected) return;');
    expect(guard).toBeGreaterThan(0);
    // Every set-up that `disconnectedCallback` releases comes after the guard.
    for (const setup of [
      'this.#toolbar.connected();',
      'this.#observeGeometry();',
      'this.#connectFeatures();',
      'this.#controller.connect();',
    ])
      expect(first.indexOf(setup), setup).toBeGreaterThan(guard);
    expect(first).toContain('if (this.isConnected) this.#suppressionFallback.connect();');
    // The reconnection of an updated host sets the same views up.
    const connect = source.slice(source.indexOf('override connectedCallback(): void {'));
    const reconnect = connect.slice(connect.indexOf('if (!this.hasUpdated) return;'));
    for (const setup of [
      'this.#suppressionFallback?.connect();',
      'this.#toolbar.connected();',
      'this.#observeGeometry();',
      'this.#connectFeatures();',
      'this.#controller.connect();',
    ])
      expect(reconnect.slice(0, reconnect.indexOf('\n  }\n')), setup).toContain(setup);
  });
});

describe('tp-text-editor structure', () => {
  it('uwg-te-req-tables-3, uwg-te-req-pres-1: the surface isolates the overlay marks, so the sticky toolbar paints over the raised table grips', () => {
    const surface = /(?:^|[}/])\s*\.surface\s*\{([^}]*)\}/u.exec(textEditorStyles.cssText)?.[1];
    expect(surface).toMatch(/isolation:\s*isolate;/u);
    expect(surface).not.toMatch(/z-index/u);
  });

  it('uwg-te-req-tools-5, uwg-te-req-pres-5: a fixed-toolbar tool that hides keeps its box, unseen, with the separator of a group that hides whole', () => {
    const rule =
      /\[part~='text-editor-toolbar'\] \[data-tool-hidden\],\s*\[part~='text-editor-toolbar'\] \.toolbar-group\[data-hidden\] > tp-separator\s*\{([^}]*)\}/u.exec(
        textEditorStyles.cssText,
      )?.[1];
    // Unseen, never removed from layout: no display, size or position change.
    expect(rule?.trim()).toBe('visibility: hidden;');
  });

  it('uwg-te-req-a11y-1: the shadow root holds the hidden instructions text that the description lists', () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'text-editor.ts'),
      'utf8',
    );
    expect(source).toContain(
      '<div id=${TEXT_EDITOR_INSTRUCTIONS_ID} hidden>${this.#strings().instructions}</div>',
    );
    expect(source).toMatch(
      /instructions: \(this\.#tooling\?\.layout \?\? this\.#effectiveLayout\)\.suggestions\.includes\('slash'\)\s*\?\s*TEXT_EDITOR_INSTRUCTIONS_ID\s*:\s*null,/u,
    );
  });

  it('uwg-te-req-blocks-5: the drag preview copies inherit the content colour instead of the popover system colour', () => {
    const preview = /(?:^|[}/])\s*\.block-drag-preview\s*\{([^}]*)\}/u.exec(
      blocksStyles.cssText,
    )?.[1];
    expect(preview).toMatch(/color:\s*inherit;/u);
    expect(preview).toMatch(/background:\s*transparent;/u);
  });

  it('uwg-te-req-tools-2: the fixed toolbar resolves with the widget focus record, so its controls disable while focus is outside', () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'text-editor.ts'),
      'utf8',
    );
    expect(source).toMatch(
      /resolveToolbarView\(\{[^}]*focused: this\.#focus\.focused,[^}]*context: \(surface\) => this\.#controller\.toolContext\(surface\),/u,
    );
  });

  it('uwg-te-req-pres-1: the root part carries the widget focus, so its ring stays while a top-layer popup of the widget holds focus', () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'text-editor.ts'),
      'utf8',
    );
    expect(source).toMatch(
      /<div\s+part="text-editor"\s+\?data-focus-within=\$\{this\.#focus\.focused\}\s+style=/u,
    );
  });
});

// Root attribute record --------------------------------------------------------------------

const rootInput = (overrides: Partial<TextEditorRootAttributeInput> = {}) =>
  ({
    fieldLabel: '',
    label: '',
    hostLabel: null,
    describedBy: null,
    strings: textEditorStrings,
    placeholder: '',
    readOnly: false,
    disabled: false,
    ...overrides,
  }) satisfies TextEditorRootAttributeInput;
const rootName = (overrides: Partial<TextEditorRootAttributeInput>) =>
  textEditorRootAttributes(rootInput(overrides))['aria-label'];

describe('tp-text-editor root attribute record', () => {
  it('uwg-te-req-a11y-1: the Field label names the editing root before label, the host aria-label and the strings default', () => {
    const all = { fieldLabel: 'Field', label: 'Own', hostLabel: 'Host' };
    expect(rootName(all)).toBe('Field');
    expect(rootName({ ...all, fieldLabel: '' })).toBe('Own');
    expect(rootName({ ...all, fieldLabel: '', label: '' })).toBe('Host');
    expect(rootName({ hostLabel: '' })).toBe(textEditorStrings.label);
    expect(rootName({ strings: { ...textEditorStrings, label: 'Notes' } })).toBe('Notes');
    expect(rootName({ placeholder: 'Write here' })).toBe(textEditorStrings.label);
  });

  it('uwg-te-req-a11y-1: the Field association carries the label as text, with no labelledby key', () => {
    expectTypeOf<keyof FieldAssociationAttributes>().toEqualTypeOf<
      'aria-label' | 'aria-describedby' | 'aria-errormessage' | 'aria-invalid'
    >();
  });

  it('uwg-te-req-a11y-1: the description lists the Field description and error nodes', () => {
    expect(textEditorRootAttributes(rootInput({ describedBy: 'd e' }))['aria-describedby']).toBe(
      'd e',
    );
    expect(textEditorRootAttributes(rootInput())['aria-describedby']).toBeNull();
  });

  it('uwg-te-req-a11y-1: the description ends with the hidden instructions, after the Field description and error', () => {
    const described = (describedBy: string | null) =>
      textEditorRootAttributes(rootInput({ describedBy, instructions: 'i' }))['aria-describedby'];
    expect(described('d e')).toBe('d e i');
    expect(described(null)).toBe('i');
  });

  it('uwg-te-req-a11y-1: the instructions join the description only while the editor is editable', () => {
    for (const access of [{ readOnly: true }, { disabled: true }])
      expect(
        textEditorRootAttributes(rootInput({ describedBy: 'd', instructions: 'i', ...access }))[
          'aria-describedby'
        ],
      ).toBe('d');
    expect(
      textEditorRootAttributes(rootInput({ instructions: 'i', readOnly: true }))[
        'aria-describedby'
      ],
    ).toBeNull();
  });

  it('uwg-te-tab-props, uwg-te-req-a11y-1: aria-placeholder carries a non-empty placeholder', () => {
    expect(textEditorRootAttributes(rootInput({ placeholder: 'Jot' }))['aria-placeholder']).toBe(
      'Jot',
    );
    expect(textEditorRootAttributes(rootInput())['aria-placeholder']).toBeNull();
  });

  it('uwg-te-req-prop-3: read-only keeps the tab index and sets aria-readonly; disabled removes the tab index and sets aria-disabled', () => {
    const pick = (readOnly: boolean, disabled: boolean) => {
      const record = textEditorRootAttributes(rootInput({ readOnly, disabled }));
      return [record.tabindex, record['aria-readonly'], record['aria-disabled']];
    };
    expect(pick(false, false)).toEqual(['0', null, null]);
    expect(pick(true, false)).toEqual(['0', 'true', null]);
    expect(pick(false, true)).toEqual([null, null, 'true']);
    expect(pick(true, true)).toEqual([null, 'true', 'true']);
  });

  it('uwg-te-req-engine-9: the record holds only root attribute names of the engine contract', () => {
    const record = textEditorRootAttributes(rootInput({ describedBy: 'd' }));
    expect(Object.keys(record).sort()).toEqual(
      [
        'role',
        'aria-multiline',
        'aria-label',
        'aria-describedby',
        'aria-placeholder',
        'aria-readonly',
        'aria-disabled',
        'tabindex',
        'spellcheck',
        'aria-controls',
        'aria-activedescendant',
      ].sort(),
    );
    // A shown suggestion list is the controlled element and the active descendant's reference.
    expect(textEditorRootAttributes(rootInput({ suggestionList: 'list' }))).toMatchObject({
      'aria-controls': 'list',
      'aria-activedescendant': 'list',
    });
    expect(record).toMatchObject({ 'aria-controls': null, 'aria-activedescendant': null });
    expect(record).toMatchObject({ role: 'textbox', 'aria-multiline': 'true', spellcheck: 'true' });
    expect(Object.isFrozen(record)).toBe(true);
  });
});

// Properties, forms and Field --------------------------------------------------------------

describe('tp-text-editor properties and forms', () => {
  it('uwg-te-req-prop-1: a format outside its domain acts as html', () => {
    for (const format of ['html', 'markdown', 'text', 'json'])
      expect(effectiveTextEditorFormat(format)).toBe(format);
    for (const format of ['xml', '', null, 42])
      expect(effectiveTextEditorFormat(format)).toBe('html');
  });

  it('G2-D21: an explicitly placed, unavailable tool is reported as information, other tooling findings as warnings', () => {
    expect(textEditorToolingSeverity('text-editor-tool-unavailable')).toBe('info');
    expect(textEditorToolingSeverity('text-editor-layout-unknown')).toBe('warning');
    expect(textEditorToolingSeverity('text-editor-tool-duplicate')).toBe('warning');
  });

  it('uwg-te-req-blocks-4: no caret is painted with no selection or a block selection', () => {
    expect(textEditorCaretHidden('none')).toBe(true);
    expect(textEditorCaretHidden('blocks')).toBe(true);
    expect(textEditorCaretHidden('text')).toBe(false);
    expect(textEditorCaretHidden('cells')).toBe(false);
  });

  it('uwg-te-tab-props-r3: removing the format attribute restores html, not an invalid null', () => {
    expect(textEditorFormatConverter.fromAttribute('markdown')).toBe('markdown');
    expect(textEditorFormatConverter.fromAttribute('xml')).toBe('xml');
    expect(textEditorFormatConverter.fromAttribute(null)).toBe('html');
    expect(effectiveTextEditorFormat(textEditorFormatConverter.fromAttribute(null))).toBe('html');
  });

  it('uwg-te-req-value-4: the form entry is the serialization in format, json as JSON text', () => {
    expect(textEditorFormValue('html', false, () => '<p>Tide</p>')).toBe('<p>Tide</p>');
    expect(textEditorFormValue('json', false, () => ({ type: 'doc' }))).toBe('{"type":"doc"}');
    expect(textEditorFormValue('json', false, () => '{"type":"doc"}')).toBe('{"type":"doc"}');
    expect(textEditorFormValue('html', false, () => null)).toBeNull();
    const read = vi.fn(() => 'Tide');
    textEditorFormValue('markdown', false, read);
    expect(read).toHaveBeenCalledWith('markdown');
  });

  it('uwg-te-req-prop-3: a disabled widget submits nothing and serializes nothing', () => {
    const read = vi.fn(() => '<p>Tide</p>');
    expect(textEditorFormValue('html', true, read)).toBeNull();
    expect(read).not.toHaveBeenCalled();
  });

  it('uwg-te-req-value-1: fieldValue is empty text for an empty document and otherwise the snapshot handle', () => {
    const handle = { revision: 1, empty: false } as unknown as TextEditorSnapshot;
    const blank = { revision: 2, empty: true } as unknown as TextEditorSnapshot;
    expect(textEditorFieldValue(true, blank)).toBe('');
    expect(textEditorFieldValue(false, handle)).toBe(handle);
    expect(textEditorFieldValue(false, null)).toBeNull();
    expect(textEditorFieldValue(true, null)).toBe('');
  });

  it('C-151: the first ready reports the mounted document to a Field as its initial value', () => {
    const handle = { revision: 1, empty: false } as unknown as TextEditorSnapshot;
    expect(initialFieldValueDetail(null, handle)).toEqual({
      value: handle,
      previousValue: null,
      reason: 'initial',
    });
    expect(initialFieldValueDetail('', '')).toBeNull();
    expect(initialFieldValueDetail('', handle)).toEqual({
      value: handle,
      previousValue: '',
      reason: 'initial',
    });
  });

  it('uwg-te-req-value-1: fieldValue follows the handle, which the change event carries before the state', () => {
    const emptied = { revision: 2, empty: true } as unknown as TextEditorSnapshot;
    const filled = { revision: 3, empty: false } as unknown as TextEditorSnapshot;
    expect(textEditorFieldValue(false, emptied)).toBe('');
    expect(textEditorFieldValue(true, filled)).toBe(filled);
  });

  it('uwg-te-req-value-4: form data built outside a submission holds the current serialization in place', () => {
    const entries = [
      ['title', 'Harbor'],
      ['notes', 'old'],
      ['notes', 'other'],
      ['tag', 'sea'],
    ] as const;
    expect(patchFormEntries(entries, 'notes', 'old', 'new')).toEqual([
      ['title', 'Harbor'],
      ['notes', 'new'],
      ['notes', 'other'],
      ['tag', 'sea'],
    ]);
    expect(patchFormEntries([['title', 'Harbor']], 'notes', null, 'new')).toEqual([
      ['title', 'Harbor'],
      ['notes', 'new'],
    ]);
    expect(patchFormEntries(entries, 'notes', 'old', null)).toEqual([
      ['title', 'Harbor'],
      ['notes', 'other'],
      ['tag', 'sea'],
    ]);
    expect(patchFormEntries(entries, 'notes', 'old', 'old')).toBeNull();
    expect(patchFormEntries([['title', 'Harbor']], 'notes', null, null)).toBeNull();
  });

  it('uwg-te-tab-props: a layout key left out keeps its default', () => {
    expect(effectiveTextEditorLayout(null)).toBe(defaultTextEditorLayout);
    expect(effectiveTextEditorLayout({})).toBe(defaultTextEditorLayout);
    const toolbar = [['bold']];
    const partial = effectiveTextEditorLayout({ toolbar, gutter: false });
    expect(partial).toEqual({ ...defaultTextEditorLayout, toolbar, gutter: false });
    expect(Object.isFrozen(partial)).toBe(true);
    const wrong = { toolbar: 'bold', gutter: 'no' } as unknown as Partial<TextEditorLayout>;
    expect(effectiveTextEditorLayout(wrong)).toBe(defaultTextEditorLayout);
  });

  it('uwg-te-tab-props, uwg-te-req-prop-1: a partial layout and null assign, and value is read-only', () => {
    // Type-level: checked by tsc over this file.
    const check = (el: TpTextEditor) => {
      el.layout = { toolbar: [['bold']] };
      el.layout = null;
      expectTypeOf(el.layout.toolbar).toEqualTypeOf<TextEditorLayoutGroups>();
      // @ts-expect-error value is read-only
      el.value = null;
    };
    expect(typeof check).toBe('function');
  });
});

// Disabled ---------------------------------------------------------------------------------

const target = (selector: string | null) => ({
  matches: (query: string) => selector !== null && query === 'a[href]' && selector === query,
});

describe('tp-text-editor while disabled', () => {
  it('uwg-te-req-prop-3, node-001228: a disabled widget cancels the activation of a link in its content', () => {
    const boundary = {};
    const link = target('a[href]');
    const text = {} as EventTarget;
    const path = (...entries: object[]) => entries as EventTarget[];
    expect(
      cancelsDisabledActivation(true, path(text, link, boundary), boundary as EventTarget),
    ).toBe(true);
    expect(cancelsDisabledActivation(false, path(link, boundary), boundary as EventTarget)).toBe(
      false,
    );
    expect(
      cancelsDisabledActivation(true, path(target(null), boundary), boundary as EventTarget),
    ).toBe(false);
    expect(
      cancelsDisabledActivation(true, path(target('a'), boundary), boundary as EventTarget),
    ).toBe(false);
    expect(cancelsDisabledActivation(true, path(boundary, link), boundary as EventTarget)).toBe(
      false,
    );
  });

  it('uwg-te-req-prop-3: a disabled viewport takes no keyboard stop and keeps focus on a press', () => {
    expect(textEditorViewportTabIndex(true)).toBe('-1');
    expect(textEditorViewportTabIndex(false)).toBeNull();
    const element = new TpTextEditor();
    const values = () =>
      (element as unknown as { render(): TemplateResult }).render().values as unknown[];
    const press = values().find((value) => typeof value === 'function') as (
      event: Pick<MouseEvent, 'preventDefault'>,
    ) => void;
    const event = { preventDefault: vi.fn() };
    expect(values()).not.toContain('-1');
    press(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    element.disabled = true;
    expect(values()).toContain('-1');
    press(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });
});

describe('tp-text-editor content security', () => {
  it('uwg-te-req-render-1, node-003102: while generated styles are suppressed, the content part carries the text mechanics that the editing root inherits', () => {
    const document = { nodeType: 9, defaultView: null } as unknown as Document;
    const declarations = new Map<string, string>();
    const style = {
      getPropertyValue: (property: string) => declarations.get(property) ?? '',
      setProperty: (property: string, value: string) => void declarations.set(property, value),
      removeProperty: (property: string) => void declarations.delete(property),
    };
    const element = (parentNode: unknown) =>
      ({ nodeType: 1, ownerDocument: document, parentNode, style }) as unknown as HTMLElement;
    const scope = element(null);
    const host = element(scope);
    const fallback = textEditorSuppressionFallback(host, element(null));
    fallback.connect();
    expect([...declarations]).toEqual([]);

    const policy = new ContentSecurityService(scope, { disableStyleElements: true });
    expect(Object.fromEntries(declarations)).toEqual({
      'white-space': 'pre-wrap',
      'overflow-wrap': 'break-word',
      'font-variant-ligatures': 'none',
    });
    policy.update({});
    expect([...declarations]).toEqual([]);
    policy.dispose();
    fallback.dispose();
  });
});

// Resolution -------------------------------------------------------------------------------

const resolution = (
  overrides: Partial<TextEditorResolutionInput> = {},
): TextEditorResolutionInput => ({
  engine: null,
  features: [],
  nodes: [],
  tools: [],
  layout: null,
  strings: null,
  readOnly: false,
  disabled: false,
  defaultValue: null,
  format: 'html',
  ...overrides,
});
const note = defineTextEditorBlock({
  name: 'harbor-note',
  content: 'inline',
  element: 'aside',
  tool: { label: 'Harbor note' },
});

describe('tp-text-editor resolution', () => {
  it('uwg-te-req-prop-1: the first resolution sets tools, access and the default before the engine', () => {
    const engine = new FakeTextEngine();
    expect(textEditorResolutionSteps(null, resolution({ engine }), false)).toEqual([
      'registry',
      'strings',
      'tools',
      'access',
      'default',
      'labels',
      'engine',
      'router',
    ]);
  });

  it('uwg-te-req-engine-8: an engine change together with a node change mounts once', async () => {
    const first = new FakeTextEngine();
    const second = new FakeTextEngine();
    const previous = resolution({ engine: first });
    const next = resolution({ engine: second, nodes: [note] });
    const steps = textEditorResolutionSteps(previous, next, true);
    expect(
      steps.filter((step) => step !== 'registry' && step !== 'tools' && step !== 'router'),
    ).toEqual(['remount', 'release', 'nodes', 'engine']);

    const { controller, of } = createHost();
    applyTextEditorResolution(
      controller,
      textEditorResolutionSteps(null, previous, false),
      previous,
      resolveTextEditorTooling(previous),
    );
    controller.connect();
    await flush();
    expect(controller.status).toBe('ready');
    applyTextEditorResolution(controller, steps, next, resolveTextEditorTooling(next));
    await flush();
    expect(second.calls.filter((call) => call === 'mount')).toHaveLength(1);
    expect(first.calls.filter((call) => call === 'mount')).toHaveLength(1);
    expect(of('ready')).toHaveLength(2);
    expect(second.context!.nodes).toEqual([note]);
  });

  it('uwg-te-tab-props: a strings change other than the task-checkbox name remounts nothing', () => {
    const previous = resolution({ engine: new FakeTextEngine() });
    expect(
      textEditorResolutionSteps(
        previous,
        { ...previous, strings: { loading: 'Warming up' } },
        true,
      ),
    ).toEqual(['strings', 'tools']);
    expect(
      textEditorResolutionSteps(
        previous,
        { ...previous, strings: { taskCheckbox: 'Finished' } },
        true,
      ),
    ).toEqual(['strings', 'tools', 'remount', 'labels']);
  });

  it('uwg-te-req-engine-8: the same engine and equal nodes remount nothing', () => {
    const engine = new FakeTextEngine();
    const nodes = [note];
    const previous = resolution({ engine, nodes });
    expect(textEditorResolutionSteps(previous, { ...previous }, true)).toEqual([]);
    const other = new FakeTextEngine();
    expect(textEditorResolutionSteps(previous, { ...previous, engine: other }, false)).toEqual([
      'registry',
      'tools',
      'engine',
      'router',
    ]);
  });

  it('uwg-te-req-evt-5: layout and tool diagnostics come once per registry resolution', () => {
    const tool = defineTextEditorTool({
      id: 'stamp',
      kind: 'button',
      label: 'Stamp',
      action: () => [],
    });
    const tooling = resolveTextEditorTooling(
      resolution({ tools: [tool, tool], layout: { toolbar: [['stamp', 'no-such-tool']] } }),
    );
    expect(tooling.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'text-editor-tool-duplicate',
      'text-editor-layout-unknown',
    ]);
    const previous = resolution();
    expect(textEditorResolutionSteps(previous, { ...previous, readOnly: true }, false)).toEqual([
      'access',
      'router',
    ]);
  });

  it('uwg-te-req-engine-11: without an engine the reserved keys keep one identity, so a sync re-registers nothing', () => {
    const previous = resolution();
    const tooling = resolveTextEditorTooling(previous);
    const a = textEditorRouterConfig(previous, tooling);
    const b = textEditorRouterConfig(resolution(), tooling);
    expect(a.reservedKeys).toBe(b.reservedKeys);
    expect(Object.isFrozen(a.reservedKeys)).toBe(true);
    expect(textEditorResolutionSteps(previous, { ...previous }, false)).not.toContain('router');
    expect(
      textEditorResolutionSteps(previous, { ...previous, defaultValue: '<p>Dock</p>' }, false),
    ).toEqual(['default']);
    const disabled = { ...previous, disabled: true };
    expect(textEditorResolutionSteps(previous, disabled, false)).toContain('router');
    const config = textEditorRouterConfig(disabled, tooling);
    expect([config.reservedKeys, config.registry]).toEqual([a.reservedKeys, a.registry]);
    expect(config.reservedKeys).toBe(a.reservedKeys);
    expect(config.access).toEqual({ readOnly: false, disabled: true });
    const engine = new FakeTextEngine({ reservedKeys: ['Mod+K'] }) as TextEditorEngine;
    expect(textEditorRouterConfig(resolution({ engine }), tooling).reservedKeys).toBe(
      engine.reservedKeys,
    );
  });
});

// Controller wiring --------------------------------------------------------------------------

describe('tp-text-editor controller wiring', () => {
  it('uwg-te-req-prop-1: a resolution passes tools, access, the default in its format and the task-checkbox name', () => {
    const calls: [string, unknown][] = [];
    const record =
      (name: string) =>
      (value: unknown): void =>
        void calls.push([name, value]);
    const target = {
      setTools: record('setTools'),
      setAccess: record('setAccess'),
      setDefaultContent: record('setDefaultContent'),
      setNodes: record('setNodes'),
      setViewLabels: record('setViewLabels'),
      setEngine: record('setEngine'),
    };
    const input = resolution({
      readOnly: true,
      defaultValue: '# Dock',
      format: 'markdown',
      strings: { taskCheckbox: 'Finished' },
    });
    const tooling = resolveTextEditorTooling(input);
    applyTextEditorResolution(
      target,
      textEditorResolutionSteps(null, input, false),
      input,
      tooling,
    );
    expect(calls).toEqual([
      [
        'setTools',
        { registry: tooling.registry, layout: tooling.layout, strings: tooling.strings },
      ],
      ['setAccess', { readOnly: true, disabled: false }],
      ['setDefaultContent', { content: '# Dock', format: 'markdown' }],
      ['setViewLabels', { taskCheckbox: 'Finished' }],
    ]);
    calls.length = 0;
    const cleared = { ...input, defaultValue: null };
    applyTextEditorResolution(
      target,
      textEditorResolutionSteps(input, cleared, false),
      cleared,
      tooling,
    );
    expect(calls).toEqual([['setDefaultContent', null]]);
  });
});

describe('tp-text-editor placement (uwg-te-req-engine-8, uwg-te-req-evt-5)', () => {
  /** A node under the given shadow roots, innermost first; a plain object stands for the document. */
  const nodeUnder = (...modes: ('open' | 'closed')[]) => {
    const document = { nodeType: 9 };
    let outer: object = document;
    const roots: { mode: string; host: { getRootNode(): object } }[] = [];
    for (const mode of [...modes].reverse()) {
      const parent = outer;
      const root = { mode, host: { getRootNode: () => parent } };
      roots.unshift(root);
      outer = root;
    }
    const inner = outer;
    return { node: { getRootNode: () => inner } as unknown as Node, roots };
  };

  it('V-579 unit part: the innermost closed ancestor root is found through open ones; open roots give null', () => {
    expect(closedAncestorRoot(nodeUnder().node)).toBeNull();
    expect(closedAncestorRoot(nodeUnder('open', 'open').node)).toBeNull();
    const closedOuter = nodeUnder('open', 'closed');
    expect(closedAncestorRoot(closedOuter.node)).toBe(closedOuter.roots[1]);
    const closedBoth = nodeUnder('closed', 'open', 'closed');
    expect(closedAncestorRoot(closedBoth.node)).toBe(closedBoth.roots[0]);
  });

  it('a host that is its own root ends the walk', () => {
    const root: { mode: string; host: { getRootNode(): unknown } } = {
      mode: 'open',
      host: { getRootNode: () => root },
    };
    expect(closedAncestorRoot({ getRootNode: () => root } as unknown as Node)).toBeNull();
  });

  it('names an element by its local name and identifier', () => {
    expect(describeElement({ localName: 'section', id: 'vault' } as Element)).toBe('section#vault');
    expect(describeElement({ localName: 'x-panel', id: '' } as Element)).toBe('x-panel');
  });
});
