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
import {
  alertKindSeverity,
  calloutSurface,
  calloutTint,
  calloutTints,
} from './shared/callout-surface.js';
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
import { documentCellPadding, documentTableRules } from './shared/document-table.js';
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
/** The block size of a pending image (`uwg-te-req-surfaces-4`): room for the File upload's compact drop surface and its item row. */
const pendingImageSize = 'calc(var(--tp-space-4) * 9)';

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

/**
 * The tones of a callout block (`uwg-te-req-blocks-6`): its `tone` attribute, which the HTML
 * profile writes as `data-tone`, tints the callout surface as an Alert of the same severity. A tone
 * names an alert kind or a severity; `note`, `important` and any other tone keep the surface's text.
 */
function calloutToneRules(callout: string): readonly PresentationRule[] {
  return calloutTints.map((severity) => {
    const kinds = Object.entries(alertKindSeverity).filter(([, of]) => of === severity);
    const tones = new Set([...kinds.map(([kind]) => kind), severity]);
    return at(
      [...tones].map((tone) => `${callout}[data-tone="${tone}"]`).join(', '),
      calloutTint(severity),
    );
  });
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

/** The inline inset of the field boundary's padding. */
const fieldInlineInset = fieldBoundary.padding.split(' ').at(-1)!;

/** A table grip's length along the table's edge (the `icon-xs` step) and its thickness across it. */
const gripLength = String(gutterControl);
const gripThickness = `calc(2 * ${documentCellPadding})`;

/** The gap before the add-column Button: half the round cell handle, which is a grip thick. */
const addColumnGap = documentCellPadding;

/** A marked item opposite to a root of `direction`, written in the other direction. */
const oppositeItemOf = (direction: 'ltr' | 'rtl') =>
  `&:dir(${direction}) .tp-te-item:not(:dir(${direction}), .tp-te-nested-item, .tp-te-task-item)`;

/**
 * The list selectors of the content: an item that only wraps a nested list (one engine's
 * structure, `tp-te-nested-item`) follows the item whose list it holds, so after an opposite item
 * it takes that item's place, and its list is laid out as a list nested in that item would be.
 */
const textEditorListSelectors = {
  list: '& .tp-te-list',
  taskList: '& .tp-te-list-task',
  oppositeItem: (['ltr', 'rtl'] as const)
    .flatMap((direction) => [
      oppositeItemOf(direction),
      `${oppositeItemOf(direction)} + .tp-te-nested-item:not(:dir(${direction}))`,
    ])
    .join(', '),
  oppositeItemStandIn: (['ltr', 'rtl'] as const)
    .map((direction) => `${oppositeItemOf(direction)} + .tp-te-nested-item:dir(${direction})`)
    .join(', '),
} as const;

/**
 * Default appearance of the text editor (`uwg-te-req-pres-1`, `uwg-te-req-pres-2`): the root
 * boundary, the toolbar fill, divider and inset, the content binding, the placeholder and the
 * status.
 */
export const textEditorAppearance: PresentationDictionary = {
  // The Input group Root boundary without padding; its ring while focus is anywhere within. Focus
  // in an open popup of the widget, which sits in the top layer, reaches `:focus-within` of no
  // element outside that popup, so the widget marks the root itself (`data-focus-within`).
  'text-editor': [
    { declarations: inputGroupBoundary },
    { declarations: { [fill]: fieldBoundary.background } },
    { selector: '&:is(:focus-within, [data-focus-within])', declarations: fieldFocus },
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
    // With a gutter the inline-start inset holds it beside top-level blocks, and beside a table
    // outside the reach of the table's row grips (half an `icon-xs` control).
    {
      selector: ':host([data-gutter]) & > *',
      declarations: {
        'padding-inline-start': `calc(${gutterSize} + ${String(gutterControl)} / 2 + ${String(valueOf(growth, 'padding-block'))})`,
      },
    },
    // Without a gutter the inset still keeps a table's row grips inside the widget.
    {
      selector: ':host(:not([data-gutter])) & > *',
      declarations: {
        'padding-inline-start': `max(${fieldInlineInset}, ${String(gutterControl)} / 2)`,
      },
    },
    // The first block is the first vocabulary element: an engine element without a class (an
    // anchor ahead of a leading atom) sits outside the flow and must not keep the block's margin.
    ...documentFlowRules(flow, {
      blocks:
        '& > * > :not(.tp-te-block-cursor), & .tp-te-cell > *, & .tp-te-item .tp-te-paragraph',
      afterHeading:
        '& > * > .tp-te-heading + :not(.tp-te-block-cursor), & > * > .tp-te-heading + .tp-te-block-cursor + *',
      dividers:
        '& > * > .tp-te-divider, & > * > .tp-te-divider + :not(.tp-te-block-cursor), & > * > .tp-te-divider + .tp-te-block-cursor + *',
      first:
        "& > * > :nth-child(1 of [class*='tp-te-']:not(.tp-te-block-cursor)), & .tp-te-cell > :first-child, & .tp-te-item .tp-te-paragraph",
    }),
    ...documentHeadingRules(flow, {
      heading: '& .tp-te-heading',
      level: (level) => `& h${level}.tp-te-heading`,
    }),
    // Lists take the widget's direction (the text mechanics), and a marked item the one of its text.
    ...documentListRules(textEditorListSelectors),
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
    // A pending image reserves the box that the widget's upload card takes.
    at('& .tp-te-image-host.tp-te-image-pending', { 'min-block-size': pendingImageSize }),
    at('& .tp-te-divider', dividerLine),
    at('& .tp-te-callout', calloutSurface),
    ...calloutToneRules('& .tp-te-callout'),
    // The drag preview's backdrop (`uwg-te-req-blocks-5`) is the floating toolbar surface, so that
    // the copies stay readable over the content they pass.
    at(
      '& > .block-drag-preview::before',
      declarationsOf(floatingToolbarAppearance, (rule) => !rule.selector),
    ),
    // A custom block's element keeps to the content column without its user agent's inline
    // margins (a figure's); its own css may set them again.
    at('& > * > :where([class^="tp-te-block-"]:not(.tp-te-block-cursor))', {
      'margin-inline': '0',
    }),
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
  // Pills straddling the table's edge: half their thickness is a cell's padding, so a grip stays
  // clear of the cell's content (`uwg-te-req-tables-3`).
  'text-editor-row-grip': [
    {
      declarations: { 'z-index': '1', 'inline-size': gripThickness, 'block-size': gripLength },
    },
  ],
  'text-editor-column-grip': [
    {
      declarations: { 'z-index': '1', 'inline-size': gripLength, 'block-size': gripThickness },
    },
  ],
  // A round Button centred on the range outline, as thick as a grip: half of it is a cell's
  // padding, so it stays clear of the content of the cell beside the range.
  'text-editor-cell-handle': [
    {
      declarations: { 'z-index': '1', 'inline-size': gripThickness, 'block-size': gripThickness },
    },
  ],
  'text-editor-add-row': [
    { declarations: { 'margin-block-start': tableAddGap, 'block-size': tableAddExtent } },
  ],
  // Beside the last column, as far out as the round cell handle on that edge reaches (half its
  // size), so the two never overlap (`uwg-te-req-pres-6`). The controls sit at the overlay's left
  // origin, so in a right-to-left widget the gap pulls the Button to the left.
  'text-editor-add-column': [
    { declarations: { 'margin-inline-start': addColumnGap, 'inline-size': tableAddExtent } },
    {
      selector: '&:dir(rtl)',
      declarations: {
        'margin-inline-start': '0',
        'margin-inline-end': `calc(-1 * ${addColumnGap})`,
      },
    },
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
    // The copied cells space their blocks as the content's cells do.
    ...documentFlowRules(flow, {
      blocks: '& .tp-te-cell > *',
      afterHeading: '& .tp-te-cell > .tp-te-heading + *',
      dividers: '& .tp-te-cell > .tp-te-divider',
      first: '& .tp-te-cell > :first-child',
    }),
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
    // Over the raised table marks (z-index 1): a grip of a row under the copy stays under it.
    { declarations: { 'box-shadow': 'var(--tp-shadow-sm)', 'z-index': '2' } },
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
  // The upload card over a pending image block: its File upload takes the block's box.
  'text-editor-image-upload': [{ declarations: { 'align-content': 'stretch' } }],
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
    // An item that only wraps a nested task list (one engine's structure) takes the task item's
    // inset, so the nested items sit where they sit inside a task item.
    {
      selector: '& .tp-te-list-task > .tp-te-nested-item',
      declarations: {
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
