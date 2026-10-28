import type { PresentationDictionary, PresentationRule } from '../resolver.js';
import { motionTransition } from '../motion.js';
import { emptyStateAppearance } from './empty-state.js';
import { fillColor, fillShown } from './shared/fill.js';
import { invalidFocusRing } from './shared/focus.js';
import { fieldFocus, fieldInvalid } from './shared/text-control.js';

/**
 * File upload appearance (CL `fupl-q2`): the Dropzone is an Empty state surface with a dashed
 * border; its media, title and description reuse the Empty state recipe. Drop-target fill fades through the shared fill layer; rejection is the part's own fill.
 */
const shared = (key: string): readonly PresentationRule[] => emptyStateAppearance[key] ?? [];

export const fileUploadAppearance: PresentationDictionary = {
  'file-upload': [{ declarations: { gap: 'var(--tp-space-3)' } }],
  'file-upload-dropzone': [
    ...shared('empty-state'),
    {
      declarations: {
        padding: 'var(--tp-space-12)',
        // Empty state rhythm: header items 2 apart, the content row 4 below (see hint/trigger).
        gap: 'var(--tp-space-2)',
        'border-radius': 'var(--tp-radius-lg)',
        border: 'var(--tp-border-width) dashed var(--tp-border)',
        color: 'var(--tp-foreground)',
        cursor: 'pointer',
        transition: motionTransition(['border-color', 'outline-color'], 'fast'),
      },
    },
    {
      selector: ":host([size='sm']) &",
      declarations: { padding: 'var(--tp-space-6)' },
    },
    {
      selector: "[data-layout='grid'] &",
      declarations: { padding: 'var(--tp-space-4)', gap: 'var(--tp-space-1)' },
    },
    fillColor('color-mix(in oklab, var(--tp-muted) 50%, transparent)'),
    fillShown('&:hover:not([data-disabled], [data-readonly], [data-full])'),
    fillShown('&[data-drop-target]'),
    { selector: '&[data-drop-target]', declarations: { 'border-color': 'var(--tp-ring)' } },
    { selector: '&[data-focus-visible]', declarations: fieldFocus },
    { selector: '&[data-invalid]', declarations: { 'border-color': 'var(--tp-destructive)' } },
    {
      selector: '&[data-invalid][data-focus-visible]',
      declarations: { ...fieldInvalid, ...invalidFocusRing },
    },
    {
      selector: '&[data-drop-reject]',
      declarations: {
        'border-color': 'var(--tp-destructive)',
        'background-color': 'color-mix(in oklab, var(--tp-destructive) 5%, transparent)',
      },
    },
    { selector: '&[data-readonly], &[data-full]', declarations: { cursor: 'default' } },
    { selector: '&[data-disabled]', declarations: { cursor: 'not-allowed' } },
  ],
  'file-upload-media': [
    ...shared('empty-state-media'),
    {
      declarations: {
        color: 'var(--tp-muted-foreground)',
        opacity: '0.75',
        '--_tp-file-upload-icon-size': 'calc(var(--tp-icon-size-lg) * 2)',
      },
    },
    {
      selector: ":host([size='sm']) &",
      declarations: { '--_tp-file-upload-icon-size': 'var(--tp-icon-size-lg)' },
    },
    {
      selector: "[data-layout='grid'] &",
      declarations: {
        'margin-block-end': '0',
        '--_tp-file-upload-icon-size': 'var(--tp-icon-size-lg)',
      },
    },
  ],
  'file-upload-title': shared('empty-state-title'),
  'file-upload-description': [
    ...shared('empty-state-description'),
    // A one-line hint, not a paragraph: wrapped lines keep the body leading.
    { declarations: { 'line-height': 'var(--tp-leading-normal)' } },
  ],
  'file-upload-hint': [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
        'margin-block-start': 'var(--tp-space-2)',
      },
    },
  ],
  'file-upload-trigger': [{ declarations: { 'margin-block-start': 'var(--tp-space-2)' } }],
  'file-upload-input': [],
  'file-upload-summary': [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
  ],
  'file-upload-clear': [],
  'file-upload-items': [
    { declarations: { gap: 'var(--tp-space-2)' } },
    { selector: "&[data-layout='grid']", declarations: { gap: 'var(--tp-space-3)' } },
  ],
  'file-upload-item': [],
  'file-upload-item-preview': [],
  'file-upload-item-progress': [],
  'file-upload-item-retry': [],
  'file-upload-item-delete': [],
};
