import type { PresentationDictionary } from '../resolver.js';
import { dropInto } from './shared/drop-line.js';
import { surfaceEdge } from './shared/edges.js';

// UI Widgets File explorer presentation: the regions keep the theme's gaps and text; every view,
// the tree and the controls keep their own families.

export const fileExplorerAppearance: PresentationDictionary = {
  'file-explorer': [
    {
      declarations: {
        gap: 'var(--tp-space-3)',
        color: 'var(--tp-foreground)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
  ],
  'file-explorer-toolbar': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'file-explorer-sidebar': [
    { declarations: { gap: 'var(--tp-space-2)', 'padding-inline-end': 'var(--tp-space-2)' } },
  ],
  'file-explorer-main': [
    {
      declarations: {
        'padding-inline': 'var(--tp-space-2)',
        'border-radius': 'var(--tp-radius-md)',
      },
    },
    // Files from the operating system over the explorer: the shared drop-into ring.
    { selector: '&[data-drop-files]', declarations: dropInto },
  ],
  'file-explorer-view': [],
  // Columns are separated by the surface edge, which the flat appearance clears.
  'file-explorer-column': [{ declarations: { 'border-inline-end': surfaceEdge.border } }],
  'file-explorer-details': [
    { declarations: { gap: 'var(--tp-space-3)', 'padding-inline-start': 'var(--tp-space-2)' } },
    {
      selector: '& .preview',
      declarations: {
        'aspect-ratio': '4 / 3',
        'border-radius': 'var(--tp-radius-md)',
        background: 'var(--tp-muted)',
        color: 'var(--tp-muted-foreground)',
      },
    },
    {
      selector: '& .preview-icon',
      declarations: { 'inline-size': 'var(--tp-space-12)', 'block-size': 'var(--tp-space-12)' },
    },
    { selector: '& .details-name', declarations: { 'font-weight': 'var(--tp-font-medium)' } },
  ],
  'file-explorer-status': [
    {
      declarations: {
        gap: 'var(--tp-space-3)',
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-xs)',
      },
    },
  ],
};
