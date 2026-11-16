import type { PresentationDictionary } from '../resolver.js';
import {
  navigationRow,
  rowHighlight,
  subLevelGap,
  subLevelGuideColor,
  subLevelGuideOffset,
  subLevelGuideWidth,
} from './shared/navigation-row.js';
import { dropInto, listDropLine } from './shared/drop-line.js';
import { floatEdge } from './shared/edges.js';
import { checkboxRules } from './shared/selection-control.js';
import { packedExtent } from './shared/target.js';
import { dragGhost } from './shared/drag-look.js';
import { controlStepDeclarations, controlStepOf } from './shared/variant.js';

/**
 * Rows are navigation rows; nested levels are marked by an inline-start guide line, drawn once
 * per ancestor level.
 */
// The indent covers the levels before the row, so each guide sits under its ancestor's indicator.
const guideOffset = subLevelGuideOffset;
const guideStop = `calc(${guideOffset} + ${subLevelGuideWidth})`;
const guides = (direction: 'right' | 'left') =>
  `linear-gradient(to ${direction}, transparent ${guideOffset}, ${subLevelGuideColor} ${guideOffset}, ${subLevelGuideColor} ${guideStop}, transparent ${guideStop})`;
/** One indentation step per level beyond the first. */
const indentation = 'calc(var(--_tp-tree-depth, 0) * var(--tp-tree-view-indent))';
const indented = (padding: string) => `calc(${padding} + ${indentation})`;
/**
 * Sub-level row separation, split above and below every row so it is part of each item's
 * measured extent (virtual windows) and equal between rows of any depth in both content modes.
 */
const halfGap = `calc(${subLevelGap} / 2)`;
/**
 * A handle at the start stays at the row's edge at every depth: the row spans the full width,
 * the indentation follows the handle, and the guides move over by the handle and its gap.
 */
const handleExtent = controlStepDeclarations(controlStepOf('icon-xs'), { square: true })[
  'inline-size'
] as string;
const handleLead = `calc(${handleExtent} + var(--tp-space-2))`;
const handleStart = "[part~='row'][data-handle-start]";

export const treeViewAppearance: PresentationDictionary = {
  'tree-view': [{ declarations: { 'font-size': 'var(--tp-text-sm)' } }],
  'tree-view-row': [
    ...navigationRow,
    {
      // A nested row (and its highlight) starts at its indentation.
      declarations: { 'margin-block': halfGap, 'margin-inline-start': indentation },
    },
    ...rowHighlight('&[data-selected]'),
    { selector: '&[data-selected]', declarations: { 'font-weight': 'var(--tp-font-medium)' } },
    {
      // The focus-visible ring is drawn inside the row.
      selector: ':host(:focus-visible) &',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'calc(-1 * var(--tp-ring-width))',
      },
    },
    { selector: '&[data-disabled]', declarations: { opacity: '0.5', cursor: 'not-allowed' } },
    // The dragged item is lifted from pick-up until it settles in its new place: a floating
    // surface over the rows it passes, while a dimmed copy holds its place in the list.
    {
      selector: '&[data-dragging]',
      declarations: {
        background: 'var(--tp-popover)',
        'box-shadow': `var(--tp-shadow-md), ${floatEdge.ring}`,
      },
    },
    { selector: '&[data-drop-into]', declarations: dropInto },
    { selector: '&[data-handle-start]', declarations: { 'margin-inline-start': '0' } },
  ],
  'tree-view-drop-indicator': [{ declarations: listDropLine('tree-view') }],
  'tree-view-drag-ghost': [{ declarations: dragGhost }],
  'tree-view-row-size-sm': [
    {
      declarations: {
        'block-size': packedExtent('var(--tp-control-height-sm)'),
        'min-block-size': packedExtent('var(--tp-control-height-sm)'),
        padding: 'var(--tp-space-1-5) var(--tp-space-2)',
      },
    },
  ],
  'tree-view-indent': [
    {
      declarations: {
        'inset-inline-start': `calc(-1 * ${indentation})`,
        // The guides continue through the separation between rows.
        'inset-block': `calc(-1 * ${halfGap})`,
        'background-image': guides('right'),
        'background-size': 'var(--tp-tree-view-indent) 100%',
      },
    },
    { selector: ':host(:dir(rtl)) &', declarations: { 'background-image': guides('left') } },
    { selector: ':host([data-guides="none"]) &', declarations: { 'background-image': 'none' } },
    { selector: `${handleStart} &`, declarations: { 'inset-inline-start': handleLead } },
  ],
  'tree-view-checkbox': [...checkboxRules],
  'tree-view-leading': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'tree-view-trailing': [
    { declarations: { gap: 'var(--tp-space-2)', color: 'var(--tp-muted-foreground)' } },
  ],
  'tree-view-handle': [
    { declarations: { cursor: 'grab' } },
    { selector: `${handleStart} &`, declarations: { 'margin-inline-end': indentation } },
  ],
  'tree-view-status': [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        padding: 'var(--tp-space-1) var(--tp-space-2)',
        'padding-inline-start': `calc(${indented('var(--tp-space-2)')} + var(--tp-tree-view-indent))`,
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
        'min-block-size': 'var(--tp-control-height-sm)',
      },
    },
  ],
  'tree-view-empty': [
    { declarations: { padding: 'var(--tp-space-2)', color: 'var(--tp-muted-foreground)' } },
  ],
};
