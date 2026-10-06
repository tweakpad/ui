import { componentDefinitions } from '../components.js';
import { motionTransition } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';

/**
 * Media player appearance (Library mp-l-presentation; Video.js default video skin traced in the
 * implementation checklist). Only existing token roles are used:
 *
 * - Regions over video use a scoped `color-scheme: dark`, so every `light-dark()` role resolves to
 *   its dark value without new color tokens; audio (`visibility="always"`) follows the page scheme.
 * - The controls scrim is an OKLab mix of the `background` role toward transparent.
 * - Controls/title visibility and poster presence use the shared finite-motion timing, which the
 *   motion policy collapses under reduced motion (playback is never affected).
 *
 * Constituents that compose library controls (Button, Slider, Menu, Popover, Spinner, Alert dialog)
 * keep those components' recipes; their media part keys stay empty until a media-specific
 * adaptation is required.
 */
export const mediaPlayerAppearance: PresentationDictionary = {
  ...Object.fromEntries(
    componentDefinitions
      .find((definition) => definition.tagName === 'tp-media-player')!
      .parts.flatMap((part) => (part.presentationKeys ?? [part.name]).map((key) => [key, []])),
  ),
  'media-container': [
    {
      declarations: {
        'border-radius': 'var(--tp-radius-lg)',
        overflow: 'clip',
        'font-family': 'var(--tp-font-sans)',
      },
    },
    {
      selector: '&[data-media-type="video"]',
      declarations: {
        'color-scheme': 'dark',
        background: 'var(--tp-background)',
        color: 'var(--tp-foreground)',
      },
    },
    {
      selector: '&:focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
      },
    },
  ],
  'media-poster': [{ declarations: { transition: motionTransition(['opacity', 'visibility']) } }],
  'media-title': [
    {
      declarations: {
        'color-scheme': 'dark',
        color: 'var(--tp-foreground)',
        padding: 'var(--tp-space-3) var(--tp-space-4)',
        'font-size': 'var(--tp-text-base)',
        'font-weight': 'var(--tp-font-semibold)',
        'line-height': 'var(--tp-leading-normal)',
        transition: motionTransition(['opacity']),
      },
    },
  ],
  'media-controls': [
    {
      declarations: {
        color: 'var(--tp-foreground)',
        padding: 'var(--tp-space-2)',
        transition: motionTransition(['opacity']),
      },
    },
  ],
  'media-controls-visibility-auto': [{ declarations: { 'color-scheme': 'dark' } }],
  'media-controls-backdrop-visibility-auto': [
    {
      declarations: {
        'inset-block-start': 'calc(-1 * var(--tp-space-16))',
        background:
          'linear-gradient(to top, color-mix(in oklab, var(--tp-background) 70%, transparent), transparent)',
      },
    },
  ],
  'media-controls-group': [{ declarations: { gap: 'var(--tp-space-1)' } }],
  // Buttons: the composed `tp-button` (ghost, icon) keeps its recipe; these keys adapt the
  // icon/text region and widen text-bearing buttons (rate, live) beyond the square icon size.
  'media-button-mark': [{ declarations: { gap: 'var(--tp-space-1)' } }],
  'media-button-text': [
    {
      declarations: {
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-semibold)',
        'font-variant-numeric': 'tabular-nums',
        'line-height': 'var(--tp-leading-tight)',
      },
    },
    {
      selector: ':host(tp-media-live-button) &',
      declarations: { 'text-transform': 'uppercase', 'letter-spacing': 'var(--tp-tracking-wide)' },
    },
  ],
  'media-button-text-control': [
    {
      selector: '&::part(button)',
      declarations: {
        'inline-size': 'auto',
        'min-inline-size': 'var(--tp-control-height-md)',
        'padding-inline': 'var(--tp-space-2)',
      },
    },
  ],
  'media-button-live-dot': [
    {
      declarations: {
        'inline-size': 'var(--tp-icon-size-sm)',
        'block-size': 'var(--tp-icon-size-sm)',
        color: 'color-mix(in oklab, currentColor 40%, transparent)',
        transition: motionTransition(['color']),
      },
    },
    { selector: ':host([data-live-edge]) &', declarations: { color: 'var(--tp-destructive)' } },
  ],
  // Time: tabular numerals keep the clock width stable; an unknown time is subdued.
  'media-time': [
    {
      declarations: {
        'font-size': 'var(--tp-text-sm)',
        'font-variant-numeric': 'tabular-nums',
      },
    },
  ],
  'media-time-value': [
    {
      declarations: {
        'font-variant-numeric': 'tabular-nums',
        transition: motionTransition(['opacity']),
      },
    },
    {
      selector: ':host([data-unavailable]) &',
      declarations: { opacity: 'var(--tp-opacity-disabled)' },
    },
  ],
  // Buffering: the decorative Spinner over a role-derived scrim.
  'media-buffering-indicator': [
    {
      declarations: {
        'color-scheme': 'dark',
        color: 'var(--tp-foreground)',
        background: 'color-mix(in oklab, var(--tp-background) 35%, transparent)',
      },
    },
  ],
  // Feedback indicators: a translucent surface near the top (status, volume) or at the side of
  // the seek direction (seek); presence uses the shared finite-motion timing.
  'media-indicator': [
    {
      declarations: {
        'color-scheme': 'dark',
        color: 'var(--tp-foreground)',
        padding: 'var(--tp-space-3)',
      },
    },
    {
      selector: ':host(tp-media-seek-indicator) &',
      declarations: { padding: 'var(--tp-space-6)' },
    },
  ],
  'media-indicator-content': [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        padding: 'var(--tp-space-1) var(--tp-space-3)',
        'border-radius': 'var(--tp-radius-md)',
        background: 'color-mix(in oklab, var(--tp-background) 70%, transparent)',
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
        transition: motionTransition(['opacity', 'scale'], 'fast'),
      },
    },
    {
      selector: ':host(:is([data-starting-style], [data-ending-style])) &',
      declarations: { opacity: '0', scale: '0.96' },
    },
    {
      selector: ':host(tp-media-seek-indicator) &',
      declarations: { background: 'transparent', 'font-size': 'var(--tp-text-base)' },
    },
    {
      selector: ':host(tp-media-volume-indicator) &',
      declarations: { 'min-inline-size': 'calc(var(--tp-spacing) * 48)' },
    },
  ],
  'media-indicator-value': [{ declarations: { 'font-variant-numeric': 'tabular-nums' } }],
  'media-indicator-fill': [
    {
      declarations: {
        'block-size': 'var(--tp-spacing)',
        'border-radius': 'var(--tp-radius-full)',
        background: 'color-mix(in oklab, currentColor 20%, transparent)',
      },
    },
    {
      selector: '&::after',
      declarations: {
        background: 'currentColor',
        'border-radius': 'inherit',
        transition: motionTransition(['inline-size']),
      },
    },
  ],
  // Sliders compose `tp-slider`, whose recipe paints the track, range, buffer, chapters and
  // thumb; the media hosts only size the control (Video.js default skin slider widths).
  'media-time-slider': [{ declarations: { 'flex-grow': '1', 'min-inline-size': '0' } }],
  'media-volume-slider': [],
  // Preview (Video.js default skin): the thumbnail sits on a translucent backdrop surface above
  // tabular text; the chapter title truncates to the preview width.
  'media-time-slider-preview': [
    {
      declarations: {
        'color-scheme': 'dark',
        color: 'var(--tp-foreground)',
        gap: 'var(--tp-space-1)',
        'font-size': 'var(--tp-text-sm)',
        'font-variant-numeric': 'tabular-nums',
        'text-shadow': '0 1px 2px color-mix(in oklab, var(--tp-background) 60%, transparent)',
        transition: motionTransition(['opacity', 'visibility'], 'fast'),
      },
    },
  ],
  'media-thumbnail': [
    {
      declarations: {
        'max-inline-size': 'calc(var(--tp-spacing) * 40)',
        'max-block-size': 'calc(var(--tp-spacing) * 40)',
        'border-radius': 'var(--tp-radius-md)',
        background: 'color-mix(in oklab, var(--tp-background) 90%, transparent)',
        'box-shadow': 'var(--tp-shadow-md)',
      },
    },
  ],
  'media-thumbnail-image': [
    { declarations: { transition: motionTransition(['opacity']) } },
    { selector: ':host([data-loading]) &', declarations: { opacity: '0' } },
  ],
  'media-chapter-title': [
    {
      declarations: {
        'max-inline-size': 'calc(var(--tp-spacing) * 40)',
        'padding-inline': 'var(--tp-space-6)',
        'font-weight': 'var(--tp-font-medium)',
      },
    },
  ],
  'media-volume-popover': [],
  'media-settings-menu': [],
  // Selected-value hint of a settings submenu trigger, before the Menu's chevron.
  'media-settings-hint': [
    {
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
        'margin-inline-end': 'var(--tp-space-1)',
      },
    },
  ],
};
