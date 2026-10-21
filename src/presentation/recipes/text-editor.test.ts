import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  VOCABULARY_CLASSES,
  isVocabularyClass,
} from '../../foundation/text-editor/adapters/shared/vocabulary.test.js';
import { ENGINES } from '../../foundation/text-editor/index.test.js';
import { TEXT_EDITOR_COLORS } from '../../foundation/text-editor/palette.js';
import { textEditorPresentation } from '../families/text-editor.js';
import { motionTransition } from '../motion.js';
import {
  serializeDeclarations,
  type PresentationDictionary,
  type PresentationRule,
} from '../resolver.js';
import {
  inputGroupAddonInsetBlock,
  inputGroupAddonInsetInline,
  inputGroupBoundary,
} from './input-group.js';
import { calloutSurface } from './shared/callout-surface.js';
import {
  codeInsetBlock,
  codeInsetInline,
  codeSurface,
  codeTypography,
} from './shared/code-surface.js';
import { dividerLine } from './shared/divider.js';
import {
  documentFlowRules,
  documentHeadingRules,
  documentImageRules,
  documentInlineCodeRules,
  documentLinkRules,
  documentListItemRules,
  documentListRules,
  documentQuoteRules,
  documentScope,
  documentStrongRules,
} from './shared/document-content.js';
import { documentTableRules } from './shared/document-table.js';
import { selectionFill } from './shared/selection.js';
import { checkboxRules, nativeChoiceAppearance } from './shared/selection-control.js';
import { statusAppearance } from './shared/status.js';
import {
  control,
  disabledBackground,
  fieldBoundary,
  fieldFocus,
  textAreaRules,
} from './shared/text-control.js';
import { controlStepDeclarations, controlStepOf } from './shared/variant.js';
import {
  textEditorAppearance,
  textEditorBlockCursorRules,
  textEditorStructure,
} from './text-editor.js';

/** The parts of `uwg-te-tab-anatomy`, `uwg-te-tab-anatomy-status` and `uwg-te-tab-anatomy-tables`, in that order. */
const anatomy = [
  'text-editor',
  'text-editor-toolbar',
  'text-editor-viewport',
  'text-editor-content',
  'text-editor-overlay',
  'text-editor-placeholder',
  'text-editor-gutter',
  'text-editor-insert',
  'text-editor-grip',
  'text-editor-drop-indicator',
  'text-editor-block-selection',
  'text-editor-selection-toolbar',
  'text-editor-suggestions',
  'text-editor-link-popover',
  'text-editor-image-popover',
  'text-editor-table-picker',
  'text-editor-swatch',
  'text-editor-status',
  'text-editor-row-grip',
  'text-editor-column-grip',
  'text-editor-cell-handle',
  'text-editor-add-row',
  'text-editor-add-column',
  'text-editor-resize-handle',
  'text-editor-table-selection',
  'text-editor-sticky-header',
];

describe('text editor family', () => {
  it('uwg-te-req-pres-1, uwg-te-tab-anatomy: one family for tp-text-editor with the 26 anatomy parts in anatomy order and no axis', () => {
    const { definition, appearance } = textEditorPresentation;
    expect(definition.name).toBe('Text editor');
    expect(definition.tagName).toBe('tp-text-editor');
    expect(definition.kind).toBe('flattening-compound');
    expect(definition).not.toHaveProperty('axes');
    expect(anatomy).toHaveLength(26);
    expect(definition.parts).toEqual(anatomy.map((name) => ({ name })));
    expect(Object.keys(appearance)).toEqual(anatomy);
  });

  it("uwg-te-req-pres-1: bindings name only the widget's own parts", () => {
    expect(textEditorPresentation.bindings).toEqual({
      'tp-text-editor': Object.fromEntries(anatomy.map((name) => [`[part~="${name}"]`, name])),
    });
  });
});

const flow = {
  flow: '--_tp-text-editor-flow',
  headingFlow: '--_tp-text-editor-heading-flow',
} as const;

const dictionaries = [textEditorAppearance, textEditorStructure];

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const recipeSource = source('./text-editor.ts');
const familySource = source('../families/text-editor.ts');

const rulesOf = (dictionary: PresentationDictionary, key: string): readonly PresentationRule[] =>
  dictionary[key] ?? [];

const allRules = (list: readonly PresentationDictionary[]): PresentationRule[] =>
  list.flatMap((dictionary) => Object.values(dictionary).flat());

/** Each rule as the generator writes it, `&` for the part. */
const cssOf = (list: readonly PresentationDictionary[]): string[] =>
  allRules(list).map(
    (rule) => `${rule.selector ?? '&'}{${serializeDeclarations(rule.declarations)}}`,
  );

/** Whether `rules` holds `run` as one contiguous run of equal rules. */
function holdsRun(rules: readonly PresentationRule[], run: readonly PresentationRule[]): boolean {
  if (!run.length) return false;
  return rules.some((_rule, start) =>
    run.every((expected, offset) => {
      const actual = rules[start + offset];
      return (
        actual !== undefined &&
        actual.selector === expected.selector &&
        JSON.stringify(actual.declarations) === JSON.stringify(expected.declarations)
      );
    }),
  );
}

const ruleAt = (rules: readonly PresentationRule[], selector: string | undefined) =>
  rules.filter((rule) => rule.selector === selector);

/** The literal engine hooks that the recipe never names. */
const ENGINE_HOOKS = [
  'selectedCell',
  'tableWrapper',
  'column-resize-handle',
  'resize-cursor',
  'gapcursor',
  'is-empty',
  'is-editor-empty',
  'has-focus',
  'data-placeholder',
  'pm-',
];

/** The texts that name an engine or one of its hooks. */
export function engineHookOffenders(texts: readonly string[]): string[] {
  return texts.filter(
    (text) => ENGINES.pattern.test(text) || ENGINE_HOOKS.some((hook) => text.includes(hook)),
  );
}

const NAMED_COLORS =
  /\b(?:black|white|red|green|blue|gray|grey|orange|yellow|purple|pink|brown|silver|navy|teal)\b/iu;

/** Declarations that write a color literal instead of a token. */
export function literalColorOffenders(list: readonly PresentationDictionary[]): string[] {
  return allRules(list).flatMap((rule) =>
    Object.entries(rule.declarations)
      .filter(([, value]) => {
        const text = String(value).replace(/--[\w-]+/gu, '');
        return (
          /#[0-9a-f]{3,8}\b/iu.test(text) ||
          /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/iu.test(text) ||
          NAMED_COLORS.test(text)
        );
      })
      .map(([property, value]) => `${rule.selector ?? '&'} ${property}: ${value}`),
  );
}

/** Declarations that transition a background. */
export function backgroundTransitionOffenders(list: readonly PresentationDictionary[]): string[] {
  return allRules(list).flatMap((rule) =>
    Object.entries(rule.declarations)
      .filter(
        ([property, value]) =>
          property.startsWith('transition') && /background|\ball\b/u.test(String(value)),
      )
      .map(([property, value]) => `${rule.selector ?? '&'} ${property}: ${value}`),
  );
}

/** Values the shared sets own, which the recipe must compose instead of writing. */
const ROLE_LITERALS = [
  'var(--tp-font-mono)',
  'var(--tp-border)',
  'var(--tp-input)',
  'var(--tp-ring)',
  'var(--tp-muted)',
  'var(--tp-muted-foreground)',
  'var(--tp-card)',
  'var(--tp-radius-lg)',
  'var(--tp-radius-xl)',
  'var(--tp-space-1-5)',
  'var(--tp-space-16)',
  'var(--tp-text-base)',
  'var(--tp-control-height-md)',
  'var(--tp-font-heading)',
];

/** The shared role values that `text` writes itself. */
export function restatedRoleLiterals(text: string): string[] {
  return ROLE_LITERALS.filter((literal) => text.includes(literal));
}

/** Vocabulary classes recorded with no binding, with their reasons. */
const UNBOUND_CLASSES: Readonly<Record<string, string>> = {
  'tp-te-list-bullet': 'dcp-roles-table-r3: the native list element and its marker',
  'tp-te-list-ordered': 'dcp-roles-table-r3: the native list element and its marker',
  'tp-te-checked': 'dcp-semantics: the native checked state',
  'tp-te-image-host': 'dcp-roles-table-r11: a flow block; the role binds the image',
  'tp-te-table-selection': 'uwg-te-tab-vocabulary-r12: base mechanics hide the native selection',
};

/** Vocabulary classes neither bound nor recorded, and selector classes outside the vocabulary. */
export function unboundVocabularyClasses(list: readonly PresentationDictionary[]): string[] {
  const named = new Set(
    allRules(list).flatMap((rule) =>
      [...(rule.selector ?? '').matchAll(/\.(tp-te-[\w-]+)/gu)].map((match) => match[1] ?? ''),
    ),
  );
  return [
    ...[...VOCABULARY_CLASSES].filter((name) => !named.has(name) && !(name in UNBOUND_CLASSES)),
    ...[...named].filter((name) => !isVocabularyClass(name)),
  ];
}

const CONTENT_COLOR_SELECTOR = /^& (?:\.tp-te-color|\.tp-te-highlight)\[data-color="[a-z]+"\]/u;
const SWATCH_COLOR_SELECTOR = /^&\[data-swatch="(?:letter|fill)"\]\[data-color="[a-z]+"\]$/u;

/**
 * Where a content role may appear: the content color rules of the content part and of the sticky
 * header copy, which presents header cells under the same binding (uwg-te-req-pres-2), and the
 * per-hue rules of the color menu swatches, which take the same roles (uwg-te-req-pres-3).
 */
function contentRoleAllowed(key: string, selector: string): boolean {
  if (key === 'text-editor-content' || key === 'text-editor-sticky-header')
    return CONTENT_COLOR_SELECTOR.test(selector);
  if (key === 'text-editor-swatch') return SWATCH_COLOR_SELECTOR.test(selector);
  return false;
}

/** Rules that use a content role outside the content color rules. */
export function contentRoleOffenders(dictionary: PresentationDictionary): string[] {
  return Object.entries(dictionary).flatMap(([key, rules]) =>
    rules
      .filter(
        (rule) =>
          serializeDeclarations(rule.declarations).includes('--tp-content-') &&
          !contentRoleAllowed(key, rule.selector ?? '&'),
      )
      .map((rule) => `${key} ${rule.selector ?? '&'}`),
  );
}

/** `exportparts`, and custom properties declared outside the private text editor names. */
export function publicHookOffenders(text: string): string[] {
  return [
    ...[...text.matchAll(/exportparts/gu)].map(() => 'exportparts'),
    ...[...text.matchAll(/['"`](--[\w-]+)['"`]/gu)]
      .map((match) => match[1] ?? '')
      .filter((name) => !name.startsWith('--_tp-text-editor-')),
  ];
}

describe('text editor recipe', () => {
  const content = rulesOf(textEditorAppearance, 'text-editor-content');

  it('uwg-te-req-pres-1, ucl17-input-group-q1: the text-editor part paints the Input group Root boundary, the ring within, the disabled background and no invalid paint', () => {
    const root = rulesOf(textEditorAppearance, 'text-editor');
    expect(root[0]?.declarations).toBe(inputGroupBoundary);
    expect(inputGroupBoundary).toMatchObject({ ...fieldBoundary, padding: '0' });
    expect(root[1]?.declarations).toEqual({ '--_tp-text-editor-fill': fieldBoundary.background });
    expect(ruleAt(root, '&:focus-within')[0]?.declarations).toBe(fieldFocus);
    expect(ruleAt(root, ':host([data-disabled]) &')[0]?.declarations).toEqual({
      background: disabledBackground,
      '--_tp-text-editor-fill': disabledBackground,
    });
    expect(root).toHaveLength(4);
    expect(JSON.stringify(root)).not.toMatch(/invalid|destructive/u);
  });

  it("uwg-te-req-pres-1: the fixed toolbar sticks at the block start on an opaque fill, by default the root's fill over the background role, with no important declaration", () => {
    const [paint] = rulesOf(textEditorAppearance, 'text-editor-toolbar');
    expect(paint?.declarations.background).toBe(
      'linear-gradient(var(--_tp-text-editor-fill), var(--_tp-text-editor-fill)), var(--tp-background)',
    );
    const [arrangement] = rulesOf(textEditorStructure, 'text-editor-toolbar');
    expect(arrangement?.selector).toBeUndefined();
    expect(arrangement?.declarations).toMatchObject({
      position: 'sticky',
      'inset-block-start': '0',
      'z-index': '1',
    });
    const toolbar = cssOf([
      { a: rulesOf(textEditorAppearance, 'text-editor-toolbar') },
      { b: rulesOf(textEditorStructure, 'text-editor-toolbar') },
    ]);
    expect(toolbar.length).toBeGreaterThan(0);
    for (const rule of toolbar) expect(rule).not.toContain('important');
  });

  it("uwg-te-req-pres-1, uwg-te-tab-anatomy-r2, uwg-te-req-pres-5: the toolbar row takes the addon inset and a divider line, centers one row, separators stretch it, and an emptied row keeps the icon control's block size; no pointer rule", () => {
    const [paint] = rulesOf(textEditorAppearance, 'text-editor-toolbar');
    expect(paint?.declarations).toMatchObject({
      'border-block-end': `var(--tp-border-width) var(--tp-border-style) ${dividerLine['background-color']}`,
      'padding-block': inputGroupAddonInsetBlock,
      'padding-inline': inputGroupAddonInsetInline,
    });
    const structure = rulesOf(textEditorStructure, 'text-editor-toolbar');
    expect(structure[0]?.declarations).toMatchObject({
      display: 'flex',
      'justify-content': 'center',
      'align-items': 'center',
    });
    expect(ruleAt(structure, '& :is(.toolbar-group, .toolbar-more)')[0]?.declarations).toEqual({
      display: 'flex',
      'align-items': 'center',
      gap: 'var(--tp-space-1)',
    });
    expect(ruleAt(structure, '& .toolbar-group > tp-separator')[0]?.declarations).toEqual({
      'align-self': 'stretch',
      'block-size': 'auto',
    });
    expect(ruleAt(structure, '& .toolbar-custom')[0]?.declarations).toEqual({
      display: 'contents',
    });
    expect(ruleAt(structure, '& > .toolbar-row')[0]?.declarations['min-block-size']).toBe(
      controlStepDeclarations(controlStepOf('icon'), { square: true })['min-block-size'],
    );
    for (const rule of [...structure, ...rulesOf(textEditorAppearance, 'text-editor-toolbar')])
      expect(Object.keys(rule.declarations)).not.toContain('pointer-events');
  });

  it("uwg-te-req-pres-2, dcp-scale: the content part is the content scope at the default scale with the widget's flow variables", () => {
    expect(content[0]?.selector).toBeUndefined();
    expect(content[0]?.declarations).toEqual(documentScope(flow, 'default'));
  });

  it("dcp-flow: flow on the root's and cells' blocks, none on item paragraphs, every facet skipping the block cursor", () => {
    const selectors = {
      blocks:
        '& > * > :not(.tp-te-block-cursor), & .tp-te-cell > *, & .tp-te-item .tp-te-paragraph',
      afterHeading:
        '& > * > .tp-te-heading + :not(.tp-te-block-cursor), & > * > .tp-te-heading + .tp-te-block-cursor + *',
      dividers:
        '& > * > .tp-te-divider, & > * > .tp-te-divider + :not(.tp-te-block-cursor), & > * > .tp-te-divider + .tp-te-block-cursor + *',
      first:
        '& > * > :nth-child(1 of :not(.tp-te-block-cursor)), & .tp-te-cell > :first-child, & .tp-te-item .tp-te-paragraph',
    };
    expect(holdsRun(content, documentFlowRules(flow, selectors))).toBe(true);
    expect(ruleAt(content, selectors.first)[0]?.declarations).toEqual({
      'margin-block-start': '0',
    });
  });

  it('dcp-binding: every role composes its shared set and restates none', () => {
    const runs = [
      documentHeadingRules(flow, {
        heading: '& .tp-te-heading',
        level: (level) => `& h${level}.tp-te-heading`,
      }),
      documentListRules({ list: '& .tp-te-list', taskList: '& .tp-te-list-task' }),
      documentListItemRules(flow, {
        nextItem: '& .tp-te-item + .tp-te-item',
        marker: '& .tp-te-item::marker',
        nestedList: '& .tp-te-item:not(.tp-te-nested-item) .tp-te-list',
        unmarkedItem: '& :is(.tp-te-nested-item, .tp-te-task-item)',
      }),
      documentQuoteRules('& .tp-te-quote'),
      documentInlineCodeRules({ code: '& .tp-te-code', inHeading: '& .tp-te-heading .tp-te-code' }),
      documentLinkRules('& .tp-te-link'),
      documentStrongRules('& .tp-te-bold'),
      documentImageRules('& .tp-te-image'),
    ];
    for (const run of runs) expect(holdsRun(content, run)).toBe(true);
    const codeBlock = ruleAt(content, '& .tp-te-code-block');
    expect(codeBlock.map((rule) => rule.declarations)).toEqual([
      codeSurface,
      codeTypography,
      { 'padding-block': codeInsetBlock, 'padding-inline': codeInsetInline },
    ]);
    expect(codeBlock[0]?.declarations).toBe(codeSurface);
    expect(codeBlock[1]?.declarations).toBe(codeTypography);
    expect(ruleAt(content, '& .tp-te-divider')[0]?.declarations).toBe(dividerLine);
    expect(ruleAt(content, '& .tp-te-callout')[0]?.declarations).toBe(calloutSurface);
    expect(textEditorAppearance['text-editor-status']).toBe(statusAppearance);
    expect(textEditorAppearance['text-editor-placeholder']?.[0]?.declarations).toBe(
      control.find((rule) => rule.selector === '&::placeholder')?.declarations,
    );
    expect(restatedRoleLiterals(ROLE_LITERALS.join(' '))).toEqual(ROLE_LITERALS);
    expect(restatedRoleLiterals(recipeSource)).toEqual([]);
  });

  it('dcp-roles-table-r5, dcp-semantics, node-001228: the task marker is the native checkbox in the Checkbox paint, with box geometry, and its disabled paint follows the native disabled state', () => {
    const native = nativeChoiceAppearance('checkbox', 'input');
    const marker = content.filter((rule) => rule.selector?.includes('.tp-te-task-marker'));
    expect(marker).toHaveLength(native.length);
    native.forEach((rule, index) => {
      expect(marker[index]?.declarations).toEqual(rule.declarations);
      expect(marker[index]?.selector).toBe(rule.selector?.replaceAll('&', '& .tp-te-task-marker'));
    });
    expect(
      ruleAt(marker, '& .tp-te-task-marker:has(> input[type="checkbox"]:disabled)')[0]
        ?.declarations,
    ).toBe(checkboxRules.find((rule) => rule.selector?.includes('data-disabled'))?.declarations);
    const structure = rulesOf(textEditorStructure, 'text-editor-content');
    expect(
      ruleAt(structure, '& .tp-te-task-marker > input[type="checkbox"]')[0]?.declarations,
    ).toEqual({
      'box-sizing': 'border-box',
      'inline-size': 'var(--tp-icon-size-md)',
      'block-size': 'var(--tp-icon-size-md)',
      margin: '0',
    });
    expect(ruleAt(structure, '& .tp-te-task-marker')[0]?.declarations).toMatchObject({
      position: 'absolute',
      'block-size': '1lh',
    });
  });

  it('uwg-te-tab-vocabulary: every vocabulary class is bound or recorded with its reason, and no selector names a class outside it', () => {
    expect(VOCABULARY_CLASSES.size).toBe(34);
    expect(unboundVocabularyClasses([])).toHaveLength(29);
    expect(unboundVocabularyClasses(dictionaries)).toEqual([]);
  });

  it('uwg-te-tab-vocabulary-r14: other marks restate their native presentation; underline with strike on one element draws both lines', () => {
    expect(ruleAt(content, '& .tp-te-italic')[0]?.declarations).toEqual({ 'font-style': 'italic' });
    expect(ruleAt(content, '& .tp-te-underline')[0]?.declarations).toEqual({
      'text-decoration-line': 'underline',
    });
    expect(ruleAt(content, '& .tp-te-strike')[0]?.declarations).toEqual({
      'text-decoration-line': 'line-through',
    });
    expect(ruleAt(content, '& .tp-te-underline.tp-te-strike')[0]?.declarations).toEqual({
      'text-decoration-line': 'underline line-through',
    });
    expect(ruleAt(content, '& .tp-te-sub')[0]?.declarations).toEqual({ 'vertical-align': 'sub' });
    expect(ruleAt(content, '& .tp-te-sup')[0]?.declarations).toEqual({ 'vertical-align': 'super' });
  });

  it('ccx-paint, uwg-te-req-pres-3: content colors paint from the hue list through the content roles and win over the link role', () => {
    for (const hue of TEXT_EDITOR_COLORS) {
      expect(ruleAt(content, `& .tp-te-color[data-color="${hue}"]`)[0]?.declarations).toEqual({
        color: `var(--tp-content-${hue}-foreground)`,
      });
      expect(
        ruleAt(
          content,
          `& .tp-te-highlight[data-color="${hue}"], & .tp-te-cell[data-background="${hue}"]`,
        )[0]?.declarations,
      ).toEqual({
        'background-color': `var(--tp-content-${hue})`,
        color: `var(--tp-content-${hue}-foreground)`,
      });
    }
    const link = content.findIndex((rule) => rule.selector === '& .tp-te-link');
    const precedence = content.findIndex(
      (rule) =>
        rule.selector ===
        '& :is(.tp-te-color, .tp-te-highlight)[data-color] .tp-te-link, & .tp-te-cell[data-background] .tp-te-link',
    );
    expect(link).toBeGreaterThanOrEqual(0);
    expect(precedence).toBeGreaterThan(link);
    expect(content[precedence]?.declarations).toEqual({ color: 'inherit' });
    expect(
      ruleAt(content, '& .tp-te-color[data-color] .tp-te-highlight[data-color]')[0]?.declarations,
    ).toEqual({ color: 'inherit' });
  });

  it("uwg-te-tab-vocabulary-r16, uwg-te-req-engine-9: the caret set and the editing root's containing block are structure", () => {
    const structure = rulesOf(textEditorStructure, 'text-editor-content');
    expect(structure[0]).toEqual({ selector: '& > *', declarations: { position: 'relative' } });
    expect(holdsRun(structure, textEditorBlockCursorRules)).toBe(true);
    expect(structure).toEqual(expect.arrayContaining([...textEditorBlockCursorRules]));
    expect(content.some((rule) => rule.selector === '& .tp-te-block-cursor')).toBe(false);
  });

  it('uwg-te-req-pres-5: the content part keeps the Text area minimum, and the editing and preview roots take the Text area inset and minimum', () => {
    const growth = textAreaRules.find(
      (rule) => !rule.selector && 'field-sizing' in rule.declarations,
    );
    expect(growth).toBeDefined();
    expect(content[1]).toEqual({
      declarations: { 'min-block-size': growth?.declarations['min-block-size'] },
    });
    expect(ruleAt(content, '& > *')[0]?.declarations).toEqual({
      padding: fieldBoundary.padding,
      'padding-block': growth?.declarations['padding-block'],
      'min-block-size': growth?.declarations['min-block-size'],
    });
    expect(ruleAt(content, '& > *')[1]?.declarations).toEqual({ outline: 'none' });
  });

  it('uwg-te-req-pres-5, uwg-te-tab-props-r4: the placeholder takes the field placeholder paint in every status', () => {
    const placeholder = rulesOf(textEditorAppearance, 'text-editor-placeholder');
    expect(placeholder).toEqual([{ declarations: { color: 'var(--tp-muted-foreground)' } }]);
    for (const rule of placeholder) expect(rule.selector ?? '').not.toMatch(/status|ready/u);
  });

  it('uwg-te-req-pres-1, ucl21-map: the status part takes the status set it shares with Map', () => {
    expect(textEditorAppearance['text-editor-status']).toBe(statusAppearance);
    expect(statusAppearance.length).toBeGreaterThan(0);
  });

  it('uwg-te-req-pres-4, uwg-te-tab-vocabulary-r12, uwg-te-tab-vocabulary-r17, uwg-te-req-pres-8: selected cells take the shared selection fill through the document table set, and the callout takes the callout surface, both composed', () => {
    const table = documentTableRules({
      wrapper: '& .tp-te-table-wrapper',
      table: '& .tp-te-table',
      sizedTable: '& .tp-te-table:has(> colgroup > col[style*="width"])',
      cell: '& .tp-te-cell',
      headerCell: '& .tp-te-header-cell',
      selectedCell: '& .tp-te-cell-selected',
    });
    expect(holdsRun(content, table)).toBe(true);
    expect(
      String(ruleAt(content, '& .tp-te-cell-selected')[0]?.declarations['background-image']),
    ).toContain(selectionFill);
    expect(ruleAt(content, '& .tp-te-callout')[0]?.declarations).toBe(calloutSurface);
  });
});

describe('text editor recipe guards', () => {
  it('uwg-req-186, req-cl-55-dictionary: no literal color in any declaration', () => {
    expect(allRules(dictionaries).length).toBeGreaterThan(0);
    expect(
      literalColorOffenders([{ x: [{ declarations: { color: '#ff0000', fill: 'red' } }] }]),
    ).toHaveLength(2);
    expect(literalColorOffenders(dictionaries)).toEqual([]);
  });

  it('uwg-te-req-pres-1, uwg-te-req-pres-2: no part, key, binding, selector or value names an engine or an engine hook', () => {
    const texts = [
      ...textEditorPresentation.definition.parts.map((part) => part.name),
      ...dictionaries.flatMap((dictionary) => Object.keys(dictionary)),
      ...Object.entries(textEditorPresentation.bindings ?? {}).flatMap(([host, map]) => [
        host,
        ...Object.entries(map).flat(),
      ]),
      ...cssOf(dictionaries),
      // In the sources, the string literals: the shared table set names its own selector keys.
      ...[recipeSource, familySource].flatMap((text) =>
        [...text.matchAll(/'([^'\n]*)'|`([^`]*)`/gu)].map((match) => match[1] ?? match[2] ?? ''),
      ),
    ];
    for (const text of [recipeSource, familySource]) expect(text).not.toMatch(ENGINES.pattern);
    expect(texts.length).toBeGreaterThan(30);
    expect(engineHookOffenders(['& .is-editor-empty p', '& .selectedCell'])).toHaveLength(2);
    expect(engineHookOffenders(texts)).toEqual([]);
  });

  it('uwg-te-req-pres-1: no background transition', () => {
    expect(
      backgroundTransitionOffenders([
        { x: [{ declarations: { transition: motionTransition(['background-color'], 'fast') } }] },
      ]),
    ).toHaveLength(1);
    expect(backgroundTransitionOffenders(dictionaries)).toEqual([]);
  });

  it('ccx-scope: content roles appear only in the content color rules', () => {
    expect(
      contentRoleOffenders({
        'text-editor-toolbar': [{ declarations: { color: 'var(--tp-content-red)' } }],
        // A swatch takes a content role only in its per-hue rules.
        'text-editor-swatch': [
          { selector: '&[data-swatch="fill"]', declarations: { color: 'var(--tp-content-red)' } },
          {
            selector: '&[data-swatch="fill"][data-color="red"]',
            declarations: { color: 'var(--tp-content-red)' },
          },
        ],
        // The sticky header copy takes one only in its content color rules.
        'text-editor-sticky-header': [
          { selector: '& .tp-te-table', declarations: { color: 'var(--tp-content-red)' } },
          {
            selector: '& .tp-te-color[data-color="red"]',
            declarations: { color: 'var(--tp-content-red-foreground)' },
          },
        ],
      }),
    ).toEqual([
      'text-editor-toolbar &',
      'text-editor-swatch &[data-swatch="fill"]',
      'text-editor-sticky-header & .tp-te-table',
    ]);
    expect(serializeDeclarations(mergedDeclarations(textEditorAppearance))).not.toBe('');
    expect(contentRoleOffenders(textEditorAppearance)).toEqual([]);
    expect(contentRoleOffenders(textEditorStructure)).toEqual([]);
  });

  it('uwg-te-req-pres-8: no exportparts and no public custom property', () => {
    expect(publicHookOffenders("'--tp-text-editor-gap' exportparts")).toHaveLength(2);
    expect(recipeSource).toContain("'--_tp-text-editor-flow'");
    expect(publicHookOffenders(recipeSource + familySource)).toEqual([]);
  });
});

/** Every declaration of a dictionary, merged, so a guard can assert a non-empty input. */
function mergedDeclarations(dictionary: PresentationDictionary): Record<string, string | number> {
  return Object.assign({}, ...allRules([dictionary]).map((rule) => rule.declarations));
}
