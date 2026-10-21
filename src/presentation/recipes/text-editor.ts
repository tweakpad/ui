import { TEXT_EDITOR_COLORS, type TextEditorColor } from '../../foundation/text-editor/palette.js';
import type {
  PresentationDeclarations,
  PresentationDictionary,
  PresentationRule,
} from '../resolver.js';
import {
  inputGroupAddonInsetBlock,
  inputGroupAddonInsetInline,
  inputGroupBoundary,
} from './input-group.js';
import { overflowListAppearance } from './overflow-list.js';
import { calloutSurface } from './shared/callout-surface.js';
import {
  codeInsetBlock,
  codeInsetInline,
  codeSurface,
  codeTypography,
} from './shared/code-surface.js';
import { dividerLine } from './shared/divider.js';
import {
  at,
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
  type DocumentFlowVariables,
} from './shared/document-content.js';
import { documentTableRules } from './shared/document-table.js';
import { nativeChoiceAppearance } from './shared/selection-control.js';
import { selectionFill, selectionLine } from './shared/selection.js';
import { resizeSeparatorRules } from './shared/separator.js';
import { statusAppearance } from './shared/status.js';
import {
  floatingToolbarAppearance,
  floatingToolbarStructure,
  popupBorderColor,
} from './shared/surface.js';
import { swatchCorner, swatchFill } from './shared/swatch.js';
import {
  control,
  disabledBackground,
  fieldBoundary,
  fieldFocus,
  textAreaRules,
} from './shared/text-control.js';
import { controlStepDeclarations, controlStepOf } from './shared/variant.js';

/** The content scope's spacing variables (`dcp-flow`). */
const flow: DocumentFlowVariables = {
  flow: '--_tp-text-editor-flow',
  headingFlow: '--_tp-text-editor-heading-flow',
};

/** The quick-add Buttons' extent, and their gap from the table, in the reserved wrapper space. */
const tableAddExtent = valueOfStep('min-block-size');
const tableAddGap = 'var(--tp-space-1)';

function valueOfStep(property: string): string {
  const value = controlStepDeclarations(controlStepOf('icon-xs'), { square: true })[property];
  if (value === undefined) throw new Error(`The text editor recipe lost the icon-xs ${property}.`);
  return String(value);
}

/** The root's fill, which the toolbar lays over the background role. */
const fill = '--_tp-text-editor-fill';

/** The editing root or the preview root: the content part's only element child. */
const root = '& > *';

/**
 * The declarations of the rule of `rules` that `match` selects; it throws when the rule is
 * missing, so a moved source fails at import instead of dropping a value.
 */
function declarationsOf(
  rules: readonly PresentationRule[] | undefined,
  match: (rule: PresentationRule) => boolean,
): PresentationDeclarations {
  const rule = rules?.find(match);
  if (!rule) throw new Error('The text editor recipe lost a shared source rule.');
  return rule.declarations;
}

/** The value `declarations` gives `property`; it throws when the source no longer declares it. */
function valueOf(declarations: PresentationDeclarations, property: string): string | number {
  const value = declarations[property];
  if (value === undefined) throw new Error(`The text editor recipe lost a shared ${property}.`);
  return value;
}

/** `rules` bound inside `element` of the part: each `&` becomes `& <element>`. */
function within(element: string, rules: readonly PresentationRule[]): readonly PresentationRule[] {
  return rules.map((rule) => ({
    ...rule,
    selector: (rule.selector ?? '&').replaceAll('&', `& ${element}`),
  }));
}

/**
 * Content colors (`ccx-paint`, `uwg-te-req-pres-3`): text color paints the hue's foreground role;
 * a highlight and a cell background paint the hue with its paired foreground.
 */
function contentColorRules(colors: readonly TextEditorColor[]): readonly PresentationRule[] {
  return colors.flatMap((hue) => [
    at(`& .tp-te-color[data-color="${hue}"]`, {
      color: `var(--tp-content-${hue}-foreground)`,
    }),
    at(`& .tp-te-highlight[data-color="${hue}"], & .tp-te-cell[data-background="${hue}"]`, {
      'background-color': `var(--tp-content-${hue})`,
      color: `var(--tp-content-${hue}-foreground)`,
    }),
  ]);
}

/** The Text area's growth rule: its minimum block size and block padding. */
const growth = declarationsOf(
  textAreaRules,
  (rule) => !rule.selector && 'field-sizing' in rule.declarations,
);
const growthMinimum = valueOf(growth, 'min-block-size');

/** The inline size of one gutter Button: the `icon-xs` control step (`uwg-te-tab-anatomy-r7`). */
const gutterControl = valueOf(
  controlStepDeclarations(controlStepOf('icon-xs'), { square: true }),
  'min-block-size',
);

/** The gutter's inline size: its two Buttons. */
const gutterSize = `calc(2 * ${String(gutterControl)})`;

/**
 * Default appearance of the text editor (`uwg-te-req-pres-1`, `uwg-te-req-pres-2`): the root
 * boundary, the toolbar fill, divider and inset, the content binding, the placeholder and the
 * status.
 */
export const textEditorAppearance: PresentationDictionary = {
  // The Input group Root boundary without padding; its ring while focus is anywhere within.
  'text-editor': [
    { declarations: inputGroupBoundary },
    { declarations: { [fill]: fieldBoundary.background } },
    { selector: '&:focus-within', declarations: fieldFocus },
    {
      selector: ':host([data-disabled]) &',
      declarations: { background: disabledBackground, [fill]: disabledBackground },
    },
  ],
  // An opaque row: by default the root's fill over the background role, so content never shows
  // through it; an application's own part fill replaces it.
  'text-editor-toolbar': [
    {
      declarations: {
        background: `linear-gradient(var(${fill}), var(${fill})), var(--tp-background)`,
        'border-block-end': `var(--tp-border-width) var(--tp-border-style) ${dividerLine['background-color']}`,
        'padding-block': inputGroupAddonInsetBlock,
        'padding-inline': inputGroupAddonInsetInline,
      },
    },
  ],
  'text-editor-content': [
    { declarations: documentScope(flow, 'default') },
    { declarations: { 'min-block-size': growthMinimum } },
    {
      selector: root,
      declarations: {
        padding: fieldBoundary.padding,
        'padding-block': valueOf(growth, 'padding-block'),
        'min-block-size': growthMinimum,
      },
    },
    // The root's ring is the only indication of the editing root.
    { selector: root, declarations: { outline: 'none' } },
    // With a gutter the inline-start inset holds it beside top-level blocks.
    {
      selector: ':host([data-gutter]) & > *',
      declarations: {
        'padding-inline-start': `calc(${gutterSize} + ${String(valueOf(growth, 'padding-block'))})`,
      },
    },
    ...documentFlowRules(flow, {
      blocks:
        '& > * > :not(.tp-te-block-cursor), & .tp-te-cell > *, & .tp-te-item .tp-te-paragraph',
      afterHeading:
        '& > * > .tp-te-heading + :not(.tp-te-block-cursor), & > * > .tp-te-heading + .tp-te-block-cursor + *',
      dividers:
        '& > * > .tp-te-divider, & > * > .tp-te-divider + :not(.tp-te-block-cursor), & > * > .tp-te-divider + .tp-te-block-cursor + *',
      first:
        '& > * > :nth-child(1 of :not(.tp-te-block-cursor)), & .tp-te-cell > :first-child, & .tp-te-item .tp-te-paragraph',
    }),
    ...documentHeadingRules(flow, {
      heading: '& .tp-te-heading',
      level: (level) => `& h${level}.tp-te-heading`,
    }),
    ...documentListRules({ list: '& .tp-te-list', taskList: '& .tp-te-list-task' }),
    ...documentListItemRules(flow, {
      nextItem: '& .tp-te-item + .tp-te-item',
      marker: '& .tp-te-item::marker',
      nestedList: '& .tp-te-item:not(.tp-te-nested-item) .tp-te-list',
      unmarkedItem: '& :is(.tp-te-nested-item, .tp-te-task-item)',
    }),
    ...documentQuoteRules('& .tp-te-quote'),
    ...documentInlineCodeRules({
      code: '& .tp-te-code',
      inHeading: '& .tp-te-heading .tp-te-code',
    }),
    // The code surface holds no line elements, so the line inset moves to the block.
    at('& .tp-te-code-block', codeSurface),
    at('& .tp-te-code-block', codeTypography),
    at('& .tp-te-code-block', {
      'padding-block': codeInsetBlock,
      'padding-inline': codeInsetInline,
    }),
    // A native code element inside the block would replace the inherited face with its own.
    at('& .tp-te-code-block > code', { 'font-family': 'inherit' }),
    ...documentLinkRules('& .tp-te-link'),
    ...documentStrongRules('& .tp-te-bold'),
    ...documentImageRules('& .tp-te-image'),
    at('& .tp-te-divider', dividerLine),
    at('& .tp-te-callout', calloutSurface),
    ...within('.tp-te-task-marker', nativeChoiceAppearance('checkbox', 'input')),
    ...documentTableRules({
      wrapper: '& .tp-te-table-wrapper',
      table: '& .tp-te-table',
      sizedTable: '& .tp-te-table:has(> colgroup > col[style*="width"])',
      cell: '& .tp-te-cell',
      headerCell: '& .tp-te-header-cell',
      selectedCell: '& .tp-te-cell-selected',
    }),
    // Marks without a profile role restate their native presentation (`uwg-te-tab-vocabulary-r14`).
    at('& .tp-te-italic', { 'font-style': 'italic' }),
    at('& .tp-te-underline', { 'text-decoration-line': 'underline' }),
    at('& .tp-te-strike', { 'text-decoration-line': 'line-through' }),
    at('& .tp-te-underline.tp-te-strike', { 'text-decoration-line': 'underline line-through' }),
    at('& .tp-te-sub', { 'vertical-align': 'sub' }),
    at('& .tp-te-sup', { 'vertical-align': 'super' }),
    ...contentColorRules(TEXT_EDITOR_COLORS),
    // Content colors win over the link role and over a highlight nested in colored text.
    at(
      '& :is(.tp-te-color, .tp-te-highlight)[data-color] .tp-te-link, & .tp-te-cell[data-background] .tp-te-link',
      { color: 'inherit' },
    ),
    at('& .tp-te-color[data-color] .tp-te-highlight[data-color]', { color: 'inherit' }),
  ],
  // The field placeholder paint, in every status.
  'text-editor-placeholder': [
    { declarations: declarationsOf(control, (rule) => rule.selector === '&::placeholder') },
  ],
  'text-editor-status': statusAppearance,
  // Blocks (M8): the selected-block fill and outline (R15) and the drop indicator line.
  'text-editor-block-selection': [
    {
      selector: '&[data-layer="fill"]',
      declarations: { background: selectionFill, 'border-radius': 'var(--tp-radius-sm)' },
    },
    {
      selector: '&[data-layer="outline"]',
      declarations: {
        outline: `var(--tp-border-width) var(--tp-border-style) ${selectionLine}`,
        'border-radius': 'var(--tp-radius-sm)',
      },
    },
  ],
  'text-editor-drop-indicator': [
    {
      declarations: {
        'border-block-start': `calc(2 * var(--tp-border-width)) var(--tp-border-style) ${selectionLine}`,
        translate: '0 -50%',
      },
    },
  ],
  // Tables (M9): the cell-range outline (R15), the resize separator line and ring (R14), the
  // resize guide, the quick-add Buttons filling their reserved space, the size picker and the
  // sticky header copy under the content binding (R25).
  'text-editor-table-selection': [
    {
      declarations: {
        outline: `calc(2 * var(--tp-border-width)) var(--tp-border-style) ${selectionLine}`,
        'outline-offset': 'calc(-1 * var(--tp-border-width))',
      },
    },
  ],
  'text-editor-resize-handle': resizeSeparatorRules,
  'text-editor-overlay': [
    {
      selector: '& .table-guide',
      declarations: {
        'inline-size': 'calc(2 * var(--tp-border-width))',
        background: selectionLine,
      },
    },
  ],
  'text-editor-row-grip': [{ declarations: { 'z-index': '1' } }],
  'text-editor-column-grip': [{ declarations: { 'z-index': '1' } }],
  'text-editor-cell-handle': [{ declarations: { 'z-index': '1' } }],
  'text-editor-add-row': [
    { declarations: { 'margin-block-start': tableAddGap, 'block-size': tableAddExtent } },
  ],
  'text-editor-add-column': [
    { declarations: { 'margin-inline-start': tableAddGap, 'inline-size': tableAddExtent } },
  ],
  'text-editor-table-picker': [
    {
      selector: '& .table-picker-body',
      declarations: { display: 'grid', gap: 'var(--tp-space-3)', 'justify-items': 'start' },
    },
    {
      selector: '& .table-picker-grid',
      declarations: {
        display: 'grid',
        'grid-template-columns': 'repeat(8, var(--tp-space-4))',
        gap: 'var(--tp-space-0-5)',
      },
    },
    {
      selector: '& .table-picker-cell',
      declarations: {
        'block-size': 'var(--tp-space-4)',
        'box-sizing': 'border-box',
        border: `var(--tp-border-width) var(--tp-border-style) ${dividerLine['background-color']}`,
        'border-radius': 'var(--tp-radius-sm)',
      },
    },
    {
      selector: '& .table-picker-cell[data-active]',
      declarations: { background: selectionFill, 'border-color': selectionLine },
    },
    { selector: '& .table-picker-size', declarations: { 'font-size': 'var(--tp-text-sm)' } },
    {
      selector: '& .table-picker-fields',
      declarations: {
        display: 'grid',
        'grid-template-columns': '1fr 1fr',
        gap: 'var(--tp-space-2)',
        'inline-size': '100%',
      },
    },
  ],
  // Floating surfaces (M7): the selection toolbar takes the flow node toolbar's surface.
  'text-editor-selection-toolbar': floatingToolbarAppearance,
  // A swatch of a color menu item: a letter in the hue's text color, or a filled square.
  'text-editor-swatch': [
    {
      selector: '&[data-swatch="letter"]',
      declarations: { 'font-weight': 'var(--tp-font-semibold)' },
    },
    {
      selector: '&[data-swatch="fill"]',
      declarations: {
        'border-radius': swatchCorner,
        'box-shadow': `inset 0 0 0 var(--tp-border-width) ${popupBorderColor}`,
      },
    },
    ...TEXT_EDITOR_COLORS.flatMap((hue): PresentationRule[] => [
      {
        selector: `&[data-swatch="letter"][data-color="${hue}"]`,
        declarations: { color: `var(--tp-content-${hue}-foreground)` },
      },
      {
        selector: `&[data-swatch="fill"][data-color="${hue}"]`,
        declarations: swatchFill(
          `linear-gradient(var(--tp-content-${hue}), var(--tp-content-${hue}))`,
          'calc(var(--tp-icon-size-md) / 4)',
        ),
      },
    ]),
  ],
  'text-editor-sticky-header': [
    { declarations: documentScope(flow, 'default') },
    ...documentTableRules({
      wrapper: '& .tp-te-table-wrapper',
      table: '& .tp-te-table',
      sizedTable: '& .tp-te-table',
      cell: '& .tp-te-cell',
      headerCell: '& .tp-te-header-cell',
      selectedCell: '& .tp-te-cell-selected',
    }),
    // An opaque row over the content it covers.
    at('& .tp-te-table', { background: 'var(--tp-background)' }),
    ...contentColorRules(TEXT_EDITOR_COLORS),
    { declarations: { 'box-shadow': 'var(--tp-shadow-sm)' } },
  ],
};

/**
 * The caret an engine draws beside a block that is not a textblock (`uwg-te-tab-vocabulary-r16`,
 * `uwg-te-req-engine-9`). The engine renders an empty element there and makes the root caret
 * transparent, so the rule draws a caret of one line in the text color. It takes no space in the
 * flow and no pointer input, so the transient caret never moves the content.
 */
export const textEditorBlockCursorRules: readonly PresentationRule[] = [
  {
    selector: '& .tp-te-block-cursor',
    declarations: {
      position: 'absolute',
      'block-size': '1lh',
      'border-inline-start': 'var(--tp-border-width) var(--tp-border-style) currentColor',
      'pointer-events': 'none',
    },
  },
];

/**
 * Arrangement that a replaced appearance dictionary keeps: the sticky toolbar row and its minimum
 * block size, the toolbar span structure, the caret and the task-marker and divider geometry.
 */
export const textEditorStructure: PresentationDictionary = {
  // Floating surfaces (M7) -----------------------------------------------------------------
  'text-editor-selection-toolbar': [
    ...floatingToolbarStructure,
    { declarations: { display: 'flex', 'align-items': 'center' } },
    {
      selector: '& > tp-separator',
      declarations: { 'align-self': 'stretch', 'block-size': 'auto' },
    },
  ],
  'text-editor-swatch': [
    {
      declarations: {
        display: 'inline-flex',
        'align-items': 'center',
        'justify-content': 'center',
        flex: 'none',
        'inline-size': 'var(--tp-icon-size-md)',
        'block-size': 'var(--tp-icon-size-md)',
      },
    },
  ],
  'text-editor-link-popover': [
    {
      selector: '& .link-popover',
      declarations: { display: 'flex', 'align-items': 'center', gap: 'var(--tp-space-1)' },
    },
  ],
  'text-editor-image-popover': [
    {
      selector: '& .image-popover',
      declarations: { display: 'grid', gap: 'var(--tp-space-3)' },
    },
    { selector: '& .image-popover > tp-button', declarations: { 'justify-self': 'end' } },
  ],
  // Blocks (M8): the gutter's row of Buttons, transparent while a drag keeps its capture.
  'text-editor-gutter': [
    { declarations: { display: 'flex', 'align-items': 'center', 'inline-size': gutterSize } },
    { selector: ':host([data-dragging]) &', declarations: { opacity: '0' } },
  ],
  'text-editor-toolbar': [
    {
      declarations: {
        position: 'sticky',
        'inset-block-start': '0',
        'z-index': '1',
        display: 'flex',
        'justify-content': 'center',
        'align-items': 'center',
      },
    },
    {
      selector: '& :is(.toolbar-group, .toolbar-more)',
      declarations: {
        display: 'flex',
        'align-items': 'center',
        gap: valueOf(
          declarationsOf(overflowListAppearance['overflow-list'], (rule) => !rule.selector),
          'gap',
        ),
      },
    },
    // A vertical separator stretches across the row; its own full height would not resolve here.
    {
      selector: '& .toolbar-group > tp-separator',
      declarations: { 'align-self': 'stretch', 'block-size': 'auto' },
    },
    { selector: '& .toolbar-custom', declarations: { display: 'contents' } },
    // A row whose tools are all hidden keeps the block size of the icon controls it would hold.
    {
      selector: '& > .toolbar-row',
      declarations: {
        'min-block-size': valueOf(
          controlStepDeclarations(controlStepOf('icon'), { square: true }),
          'min-block-size',
        ),
      },
    },
  ],
  'text-editor-content': [
    // The caret's containing block.
    { selector: root, declarations: { position: 'relative' } },
    ...textEditorBlockCursorRules,
    // A hanging task marker: the checkbox sits in the item's inline-start inset, on its first line.
    {
      selector: '& .tp-te-task-item',
      declarations: {
        position: 'relative',
        'padding-inline-start': 'calc(var(--tp-icon-size-md) + var(--tp-space-2))',
      },
    },
    {
      selector: '& .tp-te-task-marker',
      declarations: {
        position: 'absolute',
        'inset-block-start': '0',
        'inset-inline-start': '0',
        display: 'flex',
        'align-items': 'center',
        'block-size': '1lh',
      },
    },
    {
      selector: '& .tp-te-task-marker > input[type="checkbox"]',
      declarations: {
        'box-sizing': 'border-box',
        'inline-size': 'var(--tp-icon-size-md)',
        'block-size': 'var(--tp-icon-size-md)',
        margin: '0',
      },
    },
    // The native rule's own frame gives way to the divider line's extent.
    {
      selector: '& .tp-te-divider',
      declarations: { border: '0', 'block-size': 'var(--tp-border-width)', 'margin-inline': '0' },
    },
    // Tables (M9): the wrapper always reserves the quick-add Buttons' space below the last row and
    // beside the last column, so revealing them never shifts layout.
    {
      selector: '& .tp-te-table-wrapper',
      declarations: {
        'padding-block-end': `calc(${tableAddExtent} + ${tableAddGap})`,
        'padding-inline-end': `calc(${tableAddExtent} + ${tableAddGap})`,
      },
    },
  ],
};
