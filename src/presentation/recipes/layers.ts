import type { PresentationDictionary } from '../resolver.js';
import { divider } from './shared/edges.js';

// Widgets Specification Layers Presentation: the list is a Tree view, whose recipe paints the
// rows and the selection. The widget adds the bars around the list, the
// labels and icons a state value dims, and the state controls at the end of each row.

/**
 * The dimming of a layer's label and icon: the row's text color thinned enough to read as
 * off while keeping text contrast on the plain and the selected row alike.
 */
const dimmed = {
  selector: '&[data-dimmed]',
  declarations: { color: 'color-mix(in oklab, currentColor 70%, transparent)' },
};

/** The rename field's start padding and border, which its text sits behind. */
const renameInset = 'calc(var(--tp-space-2-5) + var(--tp-border-width))';

export const layersAppearance: PresentationDictionary = {
  layers: [{ declarations: { gap: 'var(--tp-space-2)', 'font-size': 'var(--tp-text-sm)' } }],
  'layers-header': [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        'padding-block-end': 'var(--tp-space-2)',
        'border-block-end': divider.border,
      },
    },
  ],
  'layers-footer': [
    {
      declarations: {
        gap: 'var(--tp-space-1)',
        'padding-block-start': 'var(--tp-space-2)',
        'border-block-start': divider.border,
      },
    },
  ],
  // The empty stack is a placeholder framed by a dashed line, as File upload's dropzone is, holding
  // an Empty state (the default "No layers" or the app's own).
  'layers-empty': [
    {
      declarations: {
        'margin-block': 'var(--tp-space-2)',
        border: `var(--tp-border-width) dashed ${divider.color}`,
        'border-radius': 'var(--tp-radius-lg)',
        color: 'var(--tp-muted-foreground)',
        'text-align': 'center',
      },
    },
  ],
  'layers-icon': [
    {
      declarations: {
        display: 'inline-flex',
        'justify-content': 'center',
        'align-items': 'center',
        'inline-size': 'var(--tp-icon-size-md)',
        'flex-shrink': '0',
      },
    },
    dimmed,
  ],
  'layers-label': [
    {
      declarations: {
        display: 'block',
        'min-inline-size': '0',
        overflow: 'hidden',
        'text-overflow': 'ellipsis',
        'white-space': 'nowrap',
      },
    },
    dimmed,
  ],
  'layers-rename': [
    {
      // The field takes the label's place: its text starts where the label's did, and it keeps the
      // row's height, its box reaching into the row's padding.
      declarations: {
        display: 'block',
        'min-inline-size': '0',
        'margin-inline-start': `calc(-1 * ${renameInset})`,
        'margin-block': 'calc((1lh - var(--tp-control-height-sm)) / 2)',
      },
    },
    // While renaming, the label's region shows the whole field, its focus ring included.
    {
      selector: 'tp-tree-item:has(> &)::part(label)',
      declarations: { overflow: 'visible', 'text-overflow': 'clip' },
    },
  ],
  'layers-states': [
    {
      declarations: { display: 'inline-flex', 'align-items': 'center', gap: 'var(--tp-space-0-5)' },
    },
  ],
  'layers-state': [
    // A value shown only on the row's hover or focus keeps its place, and shows faded, so a
    // press that changes it visibly changes it.
    { selector: '&[data-display="hover"]', declarations: { visibility: 'hidden' } },
    {
      selector: 'tp-tree-item:is(:hover, :focus-within) &[data-display="hover"]',
      declarations: { visibility: 'visible', opacity: '0.5' },
    },
  ],
};
