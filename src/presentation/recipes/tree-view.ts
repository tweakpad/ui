import type { PresentationDictionary } from '../resolver.js';
import {
  navigationRow,
  rowHighlight,
  subLevelGap,
  subLevelGuideColor,
  subLevelGuideOffset,
  subLevelGuideWidth,
} from './shared/navigation-row.js';
import { checkboxRules } from './shared/selection-control.js';
import { packedExtent } from './shared/target.js';

/**
 * shadcn sidebar file tree (base + nova): rows are SidebarMenuButton rows; nested levels are
 * marked by the SidebarMenuSub `border-l` guide, drawn here once per ancestor level.
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
 * SidebarMenuSub row separation, split above and below every row so it is part of each item's
 * measured extent (virtual windows) and equal between rows of any depth in both content modes.
 */
const halfGap = `calc(${subLevelGap} / 2)`;

export const treeViewAppearance: PresentationDictionary = {
  'tree-view': [{ declarations: { 'font-size': 'var(--tp-text-sm)' } }],
  'tree-view-viewport': [],
  'tree-view-item': [],
  'tree-view-row': [
    ...navigationRow,
    {
      // SidebarMenuSub: a nested row (and its highlight) starts at its indentation.
      declarations: { 'margin-block': halfGap, 'margin-inline-start': indentation },
    },
    ...rowHighlight('&[data-selected]'),
    { selector: '&[data-selected]', declarations: { 'font-weight': 'var(--tp-font-medium)' } },
    {
      // Nova cn-sidebar-menu-button focus-visible ring, drawn inside the row.
      selector: ':host(:focus-visible) &',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'calc(-1 * var(--tp-ring-width))',
      },
    },
    { selector: '&[data-disabled]', declarations: { opacity: '0.5', cursor: 'not-allowed' } },
    { selector: '&[data-dragging]', declarations: { opacity: '0.4' } },
  ],
  // Nova sidebar size sm: h-7.
  'tree-view-row-size-sm': [
    {
      declarations: {
        'block-size': packedExtent('var(--tp-control-height-sm)'),
        'min-block-size': packedExtent('var(--tp-control-height-sm)'),
        padding: 'var(--tp-space-1-5) var(--tp-space-2)',
      },
    },
  ],
  'tree-view-row-size-default': [],
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
  ],
  'tree-view-indicator': [],
  'tree-view-checkbox': [...checkboxRules],
  'tree-view-leading': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'tree-view-label': [],
  'tree-view-trailing': [
    { declarations: { gap: 'var(--tp-space-2)', color: 'var(--tp-muted-foreground)' } },
  ],
  'tree-view-handle': [{ declarations: { cursor: 'grab' } }],
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
  'tree-view-group': [],
  'tree-view-empty': [
    { declarations: { padding: 'var(--tp-space-2)', color: 'var(--tp-muted-foreground)' } },
  ],
};
