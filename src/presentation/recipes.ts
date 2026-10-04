import { motionTransition } from './motion.js';
import { listItemAppearance } from './recipes/list-item.js';
import { dragDropListAppearance } from './recipes/drag-drop-list.js';
import { dataVisualizationAppearance } from './recipes/data-visualization.js';
import { questionnaireAppearance } from './recipes/questionnaire.js';
import { drawerAppearance } from './recipes/drawer.js';
import { sidePanelAppearance } from './recipes/side-panel.js';
import { resizablePanelGroupAppearance } from './recipes/resizable-panel-group.js';
import { scrollAreaAppearance } from './recipes/scroll-area.js';
import { tableAppearance } from './recipes/table.js';
import { attachmentAppearance } from './recipes/attachment.js';
import { menuFamilyAppearance } from './recipes/menu-family.js';
import { popoverAppearance } from './recipes/popover.js';
import { navigationMenuAppearance } from './recipes/navigation-menu.js';
import { navigationPanelAppearance } from './recipes/navigation-panel.js';
import type { PresentationDictionary } from './resolver.js';
import { toastAppearance } from './recipes/toast.js';
import { progressAppearance } from './recipes/progress.js';
import { nativeSelectAppearance } from './recipes/native-select.js';
import { sliderAppearance } from './recipes/slider.js';
import { selectAppearance } from './recipes/select.js';
import { switchAppearance } from './recipes/switch.js';
import { commandPaletteAppearance } from './recipes/command-palette.js';
import {
  textControlAppearance,
  inputGroupAppearance,
  oneTimeCodeAppearance,
  fieldAppearance,
} from './recipes/text-controls.js';
import { selectionControlAppearance } from './recipes/selection-controls.js';

// Existing appearance values moved without changing layout, behavior, or token choices.
export const componentAppearance: PresentationDictionary = {
  ...dragDropListAppearance,
  ...dataVisualizationAppearance,
  form: fieldAppearance['field-field-group']!,
  'form-actions': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'form-error-summary': [
    { declarations: { color: 'var(--tp-destructive)', 'font-size': 'var(--tp-text-sm)' } },
  ],
  checkbox: [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'checkbox-indicator': [
    {
      selector: '&',
      declarations: {
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'border-radius': 'var(--tp-radius-sm)',
      },
    },
    {
      selector: '.root[data-checked] &',
      declarations: {
        color: 'var(--tp-accent-foreground)',
        background: 'var(--tp-accent)',
        'border-color': 'var(--tp-accent)',
      },
    },
    {
      selector: '.root[data-indeterminate] &',
      declarations: {
        color: 'var(--tp-accent-foreground)',
        background: 'var(--tp-accent)',
        'border-color': 'var(--tp-accent)',
      },
    },
    {
      selector: ':host([invalid]) &',
      declarations: {
        'border-color': 'var(--tp-destructive)',
      },
    },
    {
      selector: '.root input:focus-visible + &',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
      },
    },
    {
      selector: ':host([invalid]) input:focus-visible + &',
      declarations: {
        'outline-color': 'var(--tp-destructive)',
      },
    },
  ],
  button: [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'button-leading-mark': [
    {
      selector: '&',
      declarations: {
        'font-size': 'var(--tp-icon-size-md)',
      },
    },
    {
      selector: ":host([size='xs']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='icon-xs']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='sm']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='icon-sm']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='lg']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-lg)',
      },
    },
    {
      selector: ":host([size='icon-lg']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-lg)',
      },
    },
  ],
  'button-trailing-mark': [
    {
      selector: '&',
      declarations: {
        'font-size': 'var(--tp-icon-size-md)',
      },
    },
    {
      selector: ":host([size='xs']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='icon-xs']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='sm']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='icon-sm']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='lg']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-lg)',
      },
    },
    {
      selector: ":host([size='icon-lg']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-lg)',
      },
    },
  ],
  tabs: [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'tabs-list': [
    {
      selector: '&',
      declarations: {
        padding: 'var(--tp-space-1)',
        'border-radius': 'var(--tp-radius-lg)',
        color: 'var(--tp-muted-foreground)',
      },
    },
    { selector: ":host([variant='enclosed']) &", declarations: { background: 'var(--tp-muted)' } },
    {
      selector: ":host([variant='underline']) &",
      declarations: { background: 'transparent', gap: 'var(--tp-space-1)', 'border-radius': '0' },
    },
  ],
  'tabs-trigger': [
    {
      selector: '&',
      declarations: {
        border: 'var(--tp-border-width) solid transparent',
        background: 'transparent',
        color: 'var(--tp-muted-foreground)',
        font: 'inherit',
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
        padding: 'var(--tp-space-1) var(--tp-space-2)',
        gap: 'var(--tp-space-2)',
        'border-radius': 'var(--tp-radius-md)',
      },
    },
    { selector: '&:hover:not([data-disabled])', declarations: { color: 'var(--tp-foreground)' } },
    {
      selector: '&:focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) solid var(--tp-ring)',
        'outline-offset': 'calc(-1 * var(--tp-ring-width))',
      },
    },
    { selector: '&[data-disabled]', declarations: { opacity: 'var(--tp-opacity-disabled)' } },
    { selector: '&[data-selected]', declarations: { color: 'var(--tp-foreground)' } },
    {
      selector: ":host([variant='enclosed']) &[data-selected]",
      declarations: { background: 'var(--tp-background)', 'box-shadow': 'var(--tp-shadow-sm)' },
    },
    {
      selector: ":host([variant='underline']) &",
      declarations: {
        'border-block-end': 'var(--tp-border-width-strong) solid transparent',
        'border-radius': '0',
      },
    },
    {
      selector: ":host([variant='underline']) &[data-selected]",
      declarations: { 'border-block-end-color': 'var(--tp-foreground)' },
    },
    {
      selector: ":host([variant='underline'][orientation='vertical']) &",
      declarations: {
        'border-block-end-color': 'transparent',
        'border-inline-end': 'var(--tp-border-width-strong) solid transparent',
      },
    },
    {
      selector: ":host([variant='underline'][orientation='vertical']) &[data-selected]",
      declarations: { 'border-inline-end-color': 'var(--tp-foreground)' },
    },
    {
      selector: ':host([data-has-indicator]) &[data-selected]',
      declarations: {
        background: 'transparent',
        'box-shadow': 'none',
        'border-color': 'transparent',
      },
    },
  ],
  'tabs-indicator': [
    {
      selector: '&',
      declarations: {
        background: 'var(--tp-background)',
        'border-radius': 'var(--tp-radius-md)',
        'box-shadow': 'var(--tp-shadow-sm)',
      },
    },
    {
      selector: ":host([variant='underline']) &",
      declarations: {
        background: 'var(--tp-foreground)',
        'border-radius': '0',
        'box-shadow': 'none',
      },
    },
  ],
  'tabs-content': [
    { selector: '&', declarations: { 'font-size': 'var(--tp-text-sm)' } },
    {
      selector: '&:focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) solid var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
      },
    },
  ],
  alert: [
    {
      selector: '&',
      declarations: {
        'column-gap': 'var(--tp-space-2)',
        padding: 'var(--tp-space-2) var(--tp-space-3)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'border-radius': 'var(--tp-radius-lg)',
        background: 'var(--tp-card)',
        color: 'var(--tp-card-foreground)',
        'font-size': 'var(--tp-text-sm)',
        'box-shadow': 'var(--tp-shadow-none)',
      },
    },
    {
      selector: '& > .body',
      declarations: { gap: 'calc(var(--tp-space-1) / 2)' },
    },
    ...(['success', 'warning', 'danger'] as const).map((severity) => ({
      selector: `:host([severity='${severity}']) &`,
      declarations: {
        color: `color-mix(in oklab, var(--tp-${severity === 'danger' ? 'destructive' : severity}) 85%, var(--tp-card-foreground))`,
      },
    })),
  ],
  'alert-title': [
    {
      selector: '&',
      declarations: {
        'font-weight': 'var(--tp-font-medium)',
      },
    },
  ],
  'alert-description': [
    { selector: '&', declarations: { color: 'var(--tp-muted-foreground)' } },
    {
      selector: ":host(:is([severity='success'], [severity='warning'], [severity='danger'])) &",
      declarations: { color: 'inherit' },
    },
    { selector: '& ::slotted(p)', declarations: { margin: '0' } },
  ],
  'alert-mark': [
    { selector: '&', declarations: { 'padding-block-start': 'calc(var(--tp-space-1) / 2)' } },
  ],
  'alert-action': [{ selector: '&', declarations: { gap: 'var(--tp-space-2)' } }],
  badge: [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-1)',
        padding: 'var(--tp-space-1) var(--tp-space-2)',
        'border-radius': 'var(--tp-radius-full)',
        'font-size': 'var(--tp-text-xs)',
        'font-weight': 'var(--tp-font-semibold)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
      },
    },
  ],
  bubble: [{ selector: '&', declarations: { gap: 'var(--tp-space-2)' } }],
  'bubble-root': [{ selector: '&', declarations: { gap: 'var(--tp-space-1)' } }],
  'bubble-content': [
    {
      selector: '&',
      declarations: {
        'border-radius': 'var(--tp-radius-lg)',
        padding: 'var(--tp-space-2) var(--tp-space-3)',
        border: 'var(--tp-border-width) var(--tp-border-style) transparent',
        'font-size': 'var(--tp-text-sm)',
        'line-height': 'var(--tp-leading-relaxed)',
        'font-family': 'inherit',
        'text-align': 'start',
        'text-decoration': 'none',
      },
    },
    {
      selector: '&:is(button,a)',
      declarations: { cursor: 'pointer' },
    },
    {
      selector: ':host([variant="ghost"]) &',
      declarations: { padding: '0', 'border-radius': '0', border: '0' },
    },
    {
      selector: '&:is(button,a):focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
      },
    },
  ],
  'bubble-reactions': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-1)',
        padding: 'calc(var(--tp-spacing) * 0.5) calc(var(--tp-spacing) * 1.5)',
        'border-radius': 'var(--tp-radius-full)',
        background: 'var(--tp-muted)',
        'box-shadow': '0 0 0 var(--tp-border-width-strong) var(--tp-background)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
    {
      selector: '&[data-controls]',
      declarations: { padding: '0', 'border-radius': 'var(--tp-radius-lg)' },
    },
  ],
  'button-group': [
    {
      selector: ':host(:not([joined])) &, &[data-nested]',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'button-group-text-segment': [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        padding: '0 calc(var(--tp-spacing) * 2.5)',
        background: 'var(--tp-muted)',
        color: 'var(--tp-foreground)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-input)',
        'border-radius': 'var(--tp-radius-lg)',
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
      },
    },
  ],
  'button-group-separator': [{ declarations: { background: 'var(--tp-input)' } }],
  'card-header': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-1)',
      },
    },
  ],
  'card-content': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-5)',
      },
    },
  ],
  'card-footer': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'empty-state': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-4)',
        padding: 'var(--tp-space-6)',
        'border-radius': 'var(--tp-radius-lg)',
      },
    },
  ],
  'empty-state-header': [{ selector: '&', declarations: { gap: 'var(--tp-space-2)' } }],
  'empty-state-media': [
    { selector: '&', declarations: { 'margin-block-end': 'var(--tp-space-2)' } },
    {
      selector: ':host([media-treatment="icon"]) &',
      declarations: {
        background: 'var(--tp-muted)',
        color: 'var(--tp-foreground)',
        'inline-size': 'var(--tp-space-8)',
        'block-size': 'var(--tp-space-8)',
        'border-radius': 'var(--tp-radius-md)',
      },
    },
  ],
  'empty-state-title': [
    {
      selector: '&',
      declarations: {
        margin: '0',
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
        'letter-spacing': 'var(--tp-tracking-tight)',
      },
    },
  ],
  'empty-state-description': [
    {
      selector: '&',
      declarations: {
        color: 'var(--tp-muted-foreground)',
        margin: '0',
        'font-size': 'var(--tp-text-sm)',
        'line-height': 'var(--tp-leading-relaxed)',
      },
    },
  ],
  'empty-state-content': [
    { selector: '&', declarations: { gap: 'var(--tp-space-2)', 'font-size': 'var(--tp-text-sm)' } },
  ],
  'key-hint': [
    {
      selector: '&',
      declarations: {
        padding: '0 var(--tp-space-1)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'border-bottom-width': 'var(--tp-border-width-strong)',
        'border-radius': 'var(--tp-radius-sm)',
        background: 'var(--tp-card)',
        font: 'inherit',
        'font-family': 'var(--tp-font-mono)',
        'font-size': 'var(--tp-text-xs)',
      },
    },
  ],
  'label-optional-indicator': [
    {
      selector: '&',
      declarations: {
        'font-weight': 'var(--tp-font-normal)',
        color: 'var(--tp-muted-foreground)',
      },
    },
  ],
  ...listItemAppearance,
  'message-root': [
    { declarations: { gap: 'var(--tp-space-2)', 'font-size': 'var(--tp-text-sm)' } },
  ],
  'message-header': [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-xs)',
        'padding-inline': 'var(--tp-space-3)',
        'margin-block-end': 'var(--tp-space-2)',
      },
    },
  ],
  'message-footer': [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-xs)',
        'padding-inline': 'var(--tp-space-3)',
        'margin-block-start': 'var(--tp-space-2)',
      },
    },
  ],
  'message-scroller-content': [
    { declarations: { gap: 'var(--tp-space-6)', padding: 'var(--tp-space-3)' } },
  ],
  field: [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-1)',
        padding: '0',
        border: '0',
      },
    },
  ],
  'field-label': [
    {
      selector: '&',
      declarations: {
        'font-weight': 'var(--tp-font-semibold)',
      },
    },
  ],
  'field-description': [
    {
      selector: '&',
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
  ],
  'field-error': [
    {
      selector: '&',
      declarations: {
        color: 'var(--tp-destructive)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
  ],
  calendar: [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-3)',
      },
    },
  ],
  'calendar-header': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'calendar-month-grid': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-4)',
      },
    },
  ],
  'calendar-day': [
    {
      selector: '&',
      declarations: {
        padding: 'var(--tp-space-1)',
        border: '0',
        'border-radius': 'var(--tp-radius-sm)',
        color: 'inherit',
        background: 'transparent',
      },
    },
    {
      selector: '&[data-outside]',
      declarations: {
        color: 'var(--tp-muted-foreground)',
      },
    },
    {
      selector: '&[data-range-middle]',
      declarations: {
        'border-radius': '0',
        background: 'var(--tp-accent)',
      },
    },
    {
      selector: '&[data-selected]',
      declarations: {
        color: 'var(--tp-accent-foreground)',
        background: 'var(--tp-accent)',
      },
    },
    {
      selector: '&[data-today]',
      declarations: {
        'box-shadow': 'inset 0 0 0 var(--tp-border-width) currentcolor',
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
  ...questionnaireAppearance,
  'toast-toast': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-3)',
      },
    },
  ],
  'breadcrumb-ordered-list': [
    {
      declarations: {
        margin: '0',
        padding: '0',
        'list-style': 'none',
        gap: 'calc(var(--tp-spacing) * 1.5)',
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
  ],
  'breadcrumb-item': [{ declarations: { gap: 'var(--tp-space-1)' } }],
  'breadcrumb-link': [
    {
      declarations: {
        color: 'inherit',
        'text-decoration': 'none',
        transition: motionTransition(['color'], 'fast'),
      },
    },
    { selector: '&:hover', declarations: { color: 'var(--tp-foreground)' } },
  ],
  'breadcrumb-current-page': [
    { declarations: { color: 'var(--tp-foreground)', 'font-weight': 'var(--tp-font-normal)' } },
  ],
  'breadcrumb-ellipsis': [
    {
      declarations: {
        'inline-size': 'var(--tp-space-5)',
        'block-size': 'var(--tp-space-5)',
        display: 'inline-flex',
        'align-items': 'center',
        'justify-content': 'center',
      },
    },
  ],
  'pagination-list': [
    {
      declarations: {
        margin: '0',
        padding: '0',
        'list-style': 'none',
        gap: 'calc(var(--tp-spacing) / 2)',
      },
    },
  ],
  'pagination-page-link-variant-icon': [
    {
      declarations: {
        'inline-size': 'max(var(--tp-control-height-md), var(--tp-target-size-min))',
        'padding-inline': '0',
        'justify-content': 'center',
      },
    },
  ],
  'pagination-ellipsis': [
    {
      declarations: {
        'inline-size': 'max(var(--tp-control-height-md), var(--tp-target-size-min))',
        'block-size': 'max(var(--tp-control-height-md), var(--tp-target-size-min))',
      },
    },
  ],
  avatar: [
    {
      selector: '&',
      declarations: {
        width: 'var(--tp-control-height-lg)',
        height: 'var(--tp-control-height-lg)',
        'border-radius': 'var(--tp-radius-full)',
        background: 'transparent',
      },
    },
    {
      selector: '&::after',
      declarations: {
        content: "''",
        position: 'absolute',
        inset: '0',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'border-radius': 'inherit',
        'pointer-events': 'none',
      },
    },
    {
      selector: "&[size='sm']",
      declarations: {
        width: 'var(--tp-control-height-md)',
        height: 'var(--tp-control-height-md)',
      },
    },
    {
      selector: "&[size='lg']",
      declarations: {
        width: 'var(--tp-space-16)',
        height: 'var(--tp-space-16)',
      },
    },
  ],
  'avatar-image': [
    {
      selector: '&',
      declarations: {
        'font-weight': 'var(--tp-font-semibold)',
      },
    },
  ],
  'avatar-fallback': [
    {
      selector: '&',
      declarations: {
        'font-weight': 'var(--tp-font-semibold)',
        background: 'var(--tp-muted)',
        color: 'var(--tp-muted-foreground)',
        'border-radius': 'inherit',
      },
    },
  ],
  'avatar-overflow-count': [
    ...(['sm', 'default', 'lg'] as const).map((size, index) => ({
      selector: `:host([size="${size}"]) & > tp-icon`,
      declarations: {
        'min-inline-size': `var(--tp-space-${index + 3})`,
        'max-inline-size': `var(--tp-space-${index + 3})`,
        'min-block-size': `var(--tp-space-${index + 3})`,
        'max-block-size': `var(--tp-space-${index + 3})`,
      },
    })),
  ],
  'avatar-badge': [
    {
      declarations: {
        'inline-size': 'calc(var(--tp-spacing) * 2.5)',
        'block-size': 'calc(var(--tp-spacing) * 2.5)',
        'border-radius': 'var(--tp-radius-full)',
        background: 'var(--tp-primary)',
        color: 'var(--tp-primary-foreground)',
        'box-shadow': '0 0 0 var(--tp-border-width-strong) var(--tp-background)',
      },
    },
    {
      selector: ':host([size="sm"]) &',
      declarations: { 'inline-size': 'var(--tp-space-2)', 'block-size': 'var(--tp-space-2)' },
    },
    {
      selector: ':host([size="lg"]) &',
      declarations: { 'inline-size': 'var(--tp-space-3)', 'block-size': 'var(--tp-space-3)' },
    },
    {
      selector: '& ::slotted(tp-icon)',
      declarations: {
        'max-inline-size': 'var(--tp-space-2)',
        'max-block-size': 'var(--tp-space-2)',
      },
    },
    {
      selector: ':host([size="sm"]) & ::slotted(tp-icon)',
      declarations: { visibility: 'hidden' },
    },
  ],
  separator: [
    {
      selector: '&',
      declarations: {
        'background-color': 'var(--tp-border)',
      },
    },
  ],
  spinner: [
    {
      selector: '&',
      declarations: {
        color: 'inherit',
        width: 'var(--tp-icon-size-md)',
        height: 'var(--tp-icon-size-md)',
        border: 'var(--tp-border-width-strong) var(--tp-border-style) currentcolor',
        'border-right-color': 'transparent',
        'border-radius': 'var(--tp-radius-full)',
      },
    },
    {
      selector: "&[size='sm']",
      declarations: {
        width: 'var(--tp-icon-size-sm)',
        height: 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: "&[size='lg']",
      declarations: {
        width: 'var(--tp-icon-size-lg)',
        height: 'var(--tp-icon-size-lg)',
      },
    },
  ],
  marker: [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        'min-block-size': 'var(--tp-icon-size-sm)',
        color: 'var(--tp-muted-foreground)',
        font: 'inherit',
        'font-size': 'var(--tp-text-sm)',
        'text-align': 'start',
        background: 'transparent',
        border: '0',
        padding: '0',
      },
    },
    { selector: ':host([tone="accent"]) &', declarations: { color: 'var(--tp-primary)' } },
    { selector: ':host([tone="danger"]) &', declarations: { color: 'var(--tp-destructive)' } },
    { selector: ':host([tone="success"]) &', declarations: { color: 'var(--tp-success)' } },
    {
      selector: ':host([variant="separator"]) &::before, :host([variant="separator"]) &::after',
      declarations: {
        content: "''",
        'block-size': 'var(--tp-border-width)',
        'min-inline-size': '0',
        flex: '1',
        background: 'var(--tp-border)',
      },
    },
    {
      selector: ':host([variant="separator"]) &::before',
      declarations: { 'margin-inline-end': 'var(--tp-space-1)' },
    },
    {
      selector: ':host([variant="separator"]) &::after',
      declarations: { 'margin-inline-start': 'var(--tp-space-1)' },
    },
    {
      selector: ':host([variant="border"]) &',
      declarations: {
        'border-block-end': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'padding-block-end': 'var(--tp-space-2)',
      },
    },
    { selector: '&:is(button,a)', declarations: { cursor: 'pointer' } },
    {
      selector: '&:is(a)',
      declarations: {
        'text-decoration': 'underline',
        'text-underline-offset': 'var(--tp-space-1)',
      },
    },
    { selector: '&:is(button,a):hover', declarations: { color: 'var(--tp-foreground)' } },
    {
      selector: '&:is(button,a):focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
      },
    },
  ],
  'marker-icon': [
    {
      declarations: {
        'inline-size': 'var(--tp-icon-size-sm)',
        'block-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: '& ::slotted(tp-icon)',
      declarations: {
        'min-inline-size': '100%',
        'max-inline-size': '100%',
        'min-block-size': '100%',
        'max-block-size': '100%',
      },
    },
  ],
  'marker-content': [
    { selector: ':host([variant="separator"]) &', declarations: { 'text-align': 'center' } },
    {
      selector: '& ::slotted(a)',
      declarations: {
        color: 'inherit',
        'text-decoration': 'underline',
        'text-underline-offset': 'var(--tp-space-1)',
      },
    },
    { selector: '& ::slotted(a:hover)', declarations: { color: 'var(--tp-foreground)' } },
  ],
  skeleton: [
    {
      selector: '&',
      declarations: {
        'border-radius': 'inherit',
        background: 'var(--tp-muted)',
      },
    },
    {
      selector: '&[animated][data-motion="sweep"]::after',
      declarations: {
        background: 'linear-gradient(90deg, transparent, var(--tp-muted-foreground), transparent)',
      },
    },
  ],
  icon: [
    {
      selector: '&',
      declarations: {
        'inline-size': 'var(--tp-icon-size, var(--tp-icon-size-md))',
        'block-size': 'var(--tp-icon-size, var(--tp-icon-size-md))',
        color: 'inherit',
      },
    },
  ],
  'collapsible-heading': [
    {
      selector: '&',
      declarations: {
        font: 'inherit',
      },
    },
  ],
  'collapsible-trigger': [
    {
      selector: '&:focus-visible',
      declarations: {
        'outline-offset': 'calc(-1 * var(--tp-ring-width))',
      },
    },
  ],
  'collapsible-leading': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'collapsible-trailing': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  ...toastAppearance,
  ...textControlAppearance,
  ...inputGroupAppearance,
  ...oneTimeCodeAppearance,
  ...fieldAppearance,
  ...selectionControlAppearance,
  ...progressAppearance,
  ...nativeSelectAppearance,
  ...sliderAppearance,
  ...selectAppearance,
  ...switchAppearance,
  ...commandPaletteAppearance,
  ...attachmentAppearance,
  ...tableAppearance,
  ...scrollAreaAppearance,
  ...sidePanelAppearance,
  ...drawerAppearance,
  ...resizablePanelGroupAppearance,
  ...navigationPanelAppearance,
  ...menuFamilyAppearance,
  ...popoverAppearance,
  ...navigationMenuAppearance,
};
