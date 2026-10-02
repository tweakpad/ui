import type { PresentationDictionary, PresentationRule } from './resolver.js';
import { componentDefinitions } from './components.js';
import { componentAppearance } from './recipes.js';

const rule = (
  declarations: PresentationRule['declarations'],
  selector?: string,
): PresentationRule => (selector ? { declarations, selector } : { declarations });

const interactive = '&:not(:disabled, [aria-disabled="true"]):hover';

/** Shared paint only. Geometry and interaction policy are not inferred from a variant. */
export function variantPresentation(
  variant: string,
  isInteractive = false,
): readonly PresentationRule[] {
  if (variant === 'plain')
    return [rule({ background: 'transparent', 'border-color': 'transparent', color: 'inherit' })];
  if (['default', 'secondary', 'destructive'].includes(variant)) {
    const role = variant === 'default' ? 'primary' : variant;
    const rules = [
      rule({
        background: `var(--tp-${role})`,
        color: `var(--tp-${role}-foreground)`,
        'border-color': `var(--tp-${role})`,
      }),
    ];
    if (isInteractive)
      rules.push(
        rule(
          {
            'background-color': `color-mix(in oklab, var(--tp-${role}) ${variant === 'destructive' ? 85 : 80}%, light-dark(var(--tp-foreground), var(--tp-background)))`,
          },
          interactive,
        ),
      );
    return rules;
  }
  if (['outline', 'ghost', 'link'].includes(variant)) {
    const rules = [
      rule({
        color: 'var(--tp-foreground)',
        background: variant === 'outline' ? 'var(--tp-background)' : 'transparent',
        'border-color': variant === 'outline' ? 'var(--tp-border)' : 'transparent',
      }),
    ];
    if (isInteractive && variant === 'link')
      rules.push(
        rule(
          { 'text-decoration': 'underline' },
          '&:not(:disabled, [aria-disabled="true"]):is(:hover, :focus-visible)',
        ),
      );
    else if (isInteractive)
      rules.push(
        rule(
          {
            position: 'absolute',
            inset: '0',
            'z-index': '0',
            'border-radius': 'inherit',
            'background-color': 'color-mix(in oklab, var(--tp-input) 50%, transparent)',
            content: "''",
            opacity: '0',
            'pointer-events': 'none',
            transition:
              'opacity calc(var(--tp-duration-fast) * var(--tp-motion-scale)) var(--tp-easing-standard)',
          },
          '&::before',
        ),
        rule({ 'background-color': 'var(--tp-background)' }, interactive),
        rule({ opacity: '1' }, `${interactive}::before`),
      );
    return rules;
  }
  // No invented treatment for unresolved cataloged variants.
  return [];
}

export function controlSizePresentation(size: string): readonly PresentationRule[] {
  const step = size.replace('icon-', '').replace(/^icon$/, 'default');
  const height = step === 'xs' || step === 'sm' ? 'sm' : step === 'lg' ? 'lg' : 'md';
  return [
    rule({
      'min-block-size': `var(--tp-control-height-${height})`,
      'block-size': `var(--tp-control-height-${height})`,
      padding:
        step === 'xs'
          ? 'var(--tp-space-1) var(--tp-space-2)'
          : step === 'sm'
            ? 'var(--tp-space-1) var(--tp-space-3)'
            : step === 'lg'
              ? 'var(--tp-space-3) var(--tp-space-4)'
              : 'var(--tp-space-2) var(--tp-space-3)',
      'font-size': `var(--tp-text-${step === 'default' ? 'base' : step})`,
      ...(size.startsWith('icon')
        ? { 'inline-size': `var(--tp-control-height-${height})`, 'padding-inline': '0' }
        : {}),
    }),
    rule(
      { 'block-size': 'auto', 'min-block-size': 'auto', padding: '0' },
      ':host([variant="link"]) &',
    ),
  ];
}

/** Toggle retains shared control heights with its sourced Nova typography and spacing. */
function toggleSizePresentation(size: string): readonly PresentationRule[] {
  return controlSizePresentation(size).map((entry, index) =>
    index === 0
      ? {
          ...entry,
          declarations: {
            ...entry.declarations,
            padding: '0 calc(var(--tp-spacing) * 2.5)',
            'font-size': `var(--tp-text-${size === 'sm' ? 'xs' : 'sm'})`,
          },
        }
      : entry,
  );
}

const button: Record<string, readonly PresentationRule[]> = {
  button: [
    rule({
      appearance: 'none',
      border: 'var(--tp-border-width) var(--tp-border-style) transparent',
      'border-radius': 'var(--tp-radius-sm)',
      font: 'inherit',
      'font-weight': 'var(--tp-font-medium)',
      'text-decoration': 'none',
    }),
  ],
  'button-label': [],
  'button-leading-mark': [],
  'button-trailing-mark': [],
};
for (const part of Object.keys(button)) {
  for (const variant of ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'])
    button[`${part}-variant-${variant}`] =
      part === 'button' ? variantPresentation(variant, true) : [];
  for (const size of ['xs', 'sm', 'default', 'lg', 'icon-xs', 'icon-sm', 'icon', 'icon-lg'])
    button[`${part}-size-${size}`] = part === 'button' ? controlSizePresentation(size) : [];
}

const passive: Record<string, readonly PresentationRule[]> = {};
for (const [name, paintedPart] of [
  ['Badge', 'badge'],
  ['Bubble', 'bubble-root'],
  ['List item', 'list-item-root'],
]) {
  const definition = componentDefinitions.find((item) => item.name === name)!;
  for (const part of definition.parts)
    for (const key of part.presentationKeys ?? []) {
      if (/-variant-(subdued|tinted)$/.test(key)) continue;
      const variant = key.split('-variant-')[1];
      passive[key] = variant && part.name === paintedPart ? variantPresentation(variant) : [];
    }
}

const accordion: Record<string, readonly PresentationRule[]> = {};
for (const part of componentDefinitions.find((item) => item.name === 'Accordion')!.parts)
  for (const key of part.presentationKeys ?? [part.name]) accordion[key] = [];
accordion.accordion = [
  rule({
    gap: '0',
    overflow: 'visible',
    border: '0 var(--tp-border-style) var(--tp-border)',
    'border-radius': '0',
    background: 'transparent',
  }),
];
accordion['accordion-item'] = [
  rule({
    overflow: 'visible',
    border: '0 var(--tp-border-style) var(--tp-border)',
    'border-radius': '0',
    background: 'transparent',
  }),
];
accordion['accordion-variant-outline'] = [
  rule({
    background: 'var(--tp-background)',
    'border-width': 'var(--tp-border-width)',
    'border-radius': 'var(--tp-radius-lg)',
    overflow: 'clip',
  }),
];
for (const variant of ['outline', 'line'])
  accordion[`accordion-item-variant-${variant}`] = [
    rule({ 'border-block-start-width': 'var(--tp-border-width)' }, '&:not([data-index="0"])'),
  ];
accordion['accordion-variant-separated'] = [rule({ gap: 'var(--tp-space-2)' })];
accordion['accordion-item-variant-separated'] = [
  rule({
    background: 'var(--tp-background)',
    'border-width': 'var(--tp-border-width)',
    'border-radius': 'var(--tp-radius-lg)',
    overflow: 'clip',
  }),
];

const menus: Record<string, readonly PresentationRule[]> = {};
for (const definition of componentDefinitions.filter((item) =>
  ['Menu', 'Context menu', 'Menubar', 'Navigation menu'].includes(item.name),
))
  for (const part of definition.parts)
    for (const key of part.presentationKeys ?? [part.name]) menus[key] = [];
for (const prefix of ['menu', 'context-menu', 'menubar'])
  for (const suffix of ['item', 'checkbox-item', 'radio-item', 'sub-trigger']) {
    menus[`${prefix}-${suffix}`] = [
      rule({
        padding: 'var(--tp-space-2) var(--tp-space-3)',
        border: 'var(--tp-border-width) var(--tp-border-style) transparent',
        'border-radius': 'var(--tp-radius-sm)',
        background: 'transparent',
        color: 'var(--tp-foreground)',
        font: 'inherit',
        'text-decoration': 'none',
      }),
      rule(
        { background: 'color-mix(in oklab, var(--tp-input) 50%, var(--tp-background))' },
        '&[data-highlighted]:not([aria-disabled="true"])',
      ),
      ...variantPresentation('destructive').map((entry) => ({
        ...entry,
        selector: '&[variant="destructive"]',
      })),
      rule(
        {
          background:
            'color-mix(in oklab, var(--tp-destructive) 85%, light-dark(var(--tp-foreground), var(--tp-background)))',
        },
        '&[variant="destructive"][data-highlighted]:not([aria-disabled="true"])',
      ),
      rule({ opacity: 'var(--tp-opacity-disabled)' }, '&[aria-disabled="true"]'),
    ];
  }
menus['navigation-menu-list'] = [rule({ margin: '0', padding: '0', 'list-style': 'none' })];

const fieldAppearance = [
  rule({
    'min-height': 'var(--tp-control-height-md)',
    padding: 'var(--tp-space-2) var(--tp-space-3)',
    border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-input)',
    'border-radius': 'var(--tp-radius-sm)',
    color: 'var(--tp-foreground)',
    background: 'var(--tp-background)',
    font: 'inherit',
  }),
  rule({ 'border-color': 'var(--tp-accent)' }, '&:not(:disabled, [aria-disabled="true"]):hover'),
];
const surfaceAppearance = [
  rule({
    padding: 'var(--tp-space-3)',
    border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
    'border-radius': 'var(--tp-radius-lg)',
    color: 'var(--tp-popover-foreground)',
    background: 'var(--tp-popover)',
    'box-shadow': 'var(--tp-shadow-lg)',
  }),
];
const sharedPresentation: Record<string, readonly PresentationRule[]> = {};
for (const part of [
  'input',
  'text-area',
  'native-select-control',
  'combobox-anchor',
  'select-trigger',
  'command-palette-input-wrapper',
  'carousel-previous',
  'carousel-next',
  'pagination-previous',
  'pagination-next',
  'pagination-page-link',
  'attachment-action',
  'toast-close',
])
  sharedPresentation[part] = fieldAppearance;
sharedPresentation['questionnaire-input-region'] = fieldAppearance.map((entry) => ({
  ...entry,
  selector: (entry.selector ?? '&').replace('&', '& .control'),
}));
for (const part of [
  'attachment-root',
  'toast-toast',
  'combobox-content',
  'select-content',
  'command-palette-list',
  'dialog-content',
  'alert-dialog-content',
  'drawer-content',
  'side-panel-content',
  'popover-content',
  'preview-card-content',
  'tooltip-content',
  'menu-content',
  'context-menu-content',
])
  sharedPresentation[part] = surfaceAppearance;

// Shared anchored presence recipe; positioner geometry remains in Foundation.
for (const prefix of ['popover', 'preview-card', 'tooltip']) {
  sharedPresentation[`${prefix}-content`] = [
    ...surfaceAppearance,
    rule({
      opacity: '1',
      transform: 'scale(1) translate(0, 0)',
      transition:
        'opacity calc(var(--tp-duration-fast) * var(--tp-motion-scale)) var(--tp-easing-standard), transform calc(var(--tp-duration-fast) * var(--tp-motion-scale)) var(--tp-easing-standard)',
    }),
    rule(
      {
        opacity: '0',
        transform:
          'scale(.96) translate(var(--tp-surface-enter-x, 0px), var(--tp-surface-enter-y, 0px))',
      },
      '&:is([data-starting-style], [data-ending-style])',
    ),
    rule({ '--tp-surface-enter-y': '4px' }, '&[data-side="top"]'),
    rule({ '--tp-surface-enter-y': '-4px' }, '&[data-side="bottom"]'),
    rule({ '--tp-surface-enter-x': '4px' }, '&[data-side="left"]'),
    rule({ '--tp-surface-enter-x': '-4px' }, '&[data-side="right"]'),
    rule({ transition: 'none' }, '&:is([data-instant], [data-tp-motion-driven])'),
  ];
}
sharedPresentation['tooltip-content'] = [
  ...sharedPresentation['tooltip-content']!,
  rule({
    'max-inline-size': 'min(20rem, var(--tp-available-width))',
    padding: 'calc(var(--tp-space-1) * 1.5) var(--tp-space-3)',
    border: '0',
    'border-radius': 'var(--tp-radius-md)',
    background: 'var(--tp-foreground)',
    color: 'var(--tp-background)',
    'font-size': 'var(--tp-text-xs)',
    'line-height': 'var(--tp-leading-normal)',
    'box-shadow': 'none',
  }),
];
sharedPresentation['tooltip-arrow'] = [rule({ fill: 'var(--tp-foreground)' })];

// Card and dialog-family footers share section paint; each owner supplies layout.
const sectionFooterAppearance = [
  rule({
    background: 'var(--tp-muted)',
    'border-block-start': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
  }),
];
for (const prefix of ['dialog', 'alert-dialog', 'drawer', 'side-panel']) {
  sharedPresentation[`${prefix}-content`] = [...surfaceAppearance, rule({ padding: '0' })];
  sharedPresentation[`${prefix}-title`] = [
    rule({
      'font-size': 'var(--tp-text-lg)',
      'font-weight': 'var(--tp-font-semibold)',
      'line-height': 'var(--tp-leading-tight)',
    }),
  ];
  sharedPresentation[`${prefix}-description`] = [
    rule({
      color: 'var(--tp-muted-foreground)',
      'font-size': 'var(--tp-text-sm)',
    }),
  ];
  sharedPresentation[`${prefix}-${prefix === 'alert-dialog' ? 'actions' : 'footer'}`] =
    sectionFooterAppearance;
  sharedPresentation[`${prefix}-overlay`] = [
    rule({
      background:
        'color-mix(in srgb, light-dark(var(--tp-foreground), var(--tp-background)) calc(var(--tp-opacity-backdrop) * 100%), transparent)',
      opacity: '1',
      transition:
        'opacity calc(var(--tp-duration-normal) * var(--tp-motion-scale)) var(--tp-easing-standard)',
    }),
    rule({ opacity: '0' }, '&:is([data-starting-style], [data-ending-style])'),
    ...(prefix === 'dialog' || prefix === 'alert-dialog'
      ? [rule({ transition: 'none' }, '&[data-ending-style]')]
      : []),
    rule({ transition: 'none' }, '&[data-tp-motion-driven]'),
  ];
}

const corePresentationDictionary: PresentationDictionary = {
  ...menus,
  ...accordion,
  ...button,
  ...passive,
  icon: [],
  'icon-graphic': [],
  collapsible: [],
  'collapsible-heading': [],
  'collapsible-trigger': [
    rule({
      padding: 'var(--tp-space-3) var(--tp-space-4)',
      border: '0',
      background: 'transparent',
      color: 'inherit',
      font: 'inherit',
    }),
  ],
  'collapsible-leading': [rule({ color: 'var(--tp-muted-foreground)' })],
  'collapsible-trailing': [rule({ color: 'var(--tp-muted-foreground)' })],
  'collapsible-label': [rule({ 'font-weight': 'var(--tp-font-semibold)' })],
  'collapsible-content': [],
  'collapsible-content-body': [
    rule({ padding: '0 var(--tp-space-4) var(--tp-space-4)' }),
    rule({ 'padding-inline-start': '0' }, ':host([data-content-alignment="label"]) &'),
  ],
  'input-group': [],
  'input-group-addon': [],
  'input-group-text': [],
  'input-group-action': [],
  'input-group-control': [
    rule({
      border: '0',
      'border-radius': '0',
      outline: '0',
      'min-inline-size': '0',
      flex: '1',
      font: 'inherit',
      color: 'inherit',
      background: 'transparent',
    }),
  ],
  table: [],
  'table-table': [rule({ width: '100%', 'border-collapse': 'collapse' })],
  'table-caption': [],
  'table-header': [],
  'table-body': [],
  'table-footer': [],
  'table-row': [],
  'table-column-header': [
    rule({
      padding: 'var(--tp-space-2) var(--tp-space-3)',
      'border-block-end': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
      'text-align': 'start',
    }),
  ],
  'table-cell': [
    rule({
      padding: 'var(--tp-space-2) var(--tp-space-3)',
      'border-block-end': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
      'text-align': 'start',
    }),
  ],
  toggle: [
    ...button.button!,
    rule(
      { background: 'var(--tp-muted)', color: 'var(--tp-foreground)' },
      '&[aria-pressed="true"]',
    ),
  ],
  'toggle-content': [],
  ...Object.fromEntries(
    ['toggle', 'toggle-content'].flatMap((part) => [
      ...['ghost', 'outline'].map((variant) => [
        `${part}-variant-${variant}`,
        part === 'toggle' ? variantPresentation(variant, true) : [],
      ]),
      ...['sm', 'default', 'lg'].map((size) => [
        `${part}-size-${size}`,
        part === 'toggle' ? toggleSizePresentation(size) : [],
      ]),
    ]),
  ),
  card: [
    rule({
      border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
      'border-radius': 'var(--tp-radius-lg)',
      color: 'var(--tp-card-foreground)',
      background: 'var(--tp-card)',
      'box-shadow': 'var(--tp-shadow-none)',
    }),
    rule({ 'border-width': '0' }, ':host([borders="off"]) &'),
    rule({ 'box-shadow': 'var(--tp-shadow-md)' }, ':host([elevated]) &'),
  ],
  'card-header': [
    rule({
      background: 'var(--tp-card)',
      'border-block-end': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
    }),
    rule({ 'border-width': '0' }, ':host([borders="off"]) &'),
  ],
  'card-content': [
    rule({
      background: 'color-mix(in oklab, var(--tp-card) 50%, var(--tp-muted))',
      'line-height': 'var(--tp-leading-normal)',
    }),
    rule({ background: 'var(--tp-card)' }, ':host([section-colors="off"]) &'),
  ],
  'card-footer': [
    ...sectionFooterAppearance,
    rule({ 'border-width': '0' }, ':host([borders="off"]) &'),
    rule({ background: 'var(--tp-card)' }, ':host([section-colors="off"]) &'),
  ],
  'card-title': [
    rule({
      margin: '0',
      'font-size': 'var(--tp-text-lg)',
      'font-weight': 'var(--tp-font-semibold)',
      'line-height': 'var(--tp-leading-normal)',
    }),
  ],
  'card-description': [
    rule({
      margin: '0',
      color: 'var(--tp-muted-foreground)',
      'font-size': 'var(--tp-text-sm)',
      'line-height': 'var(--tp-leading-normal)',
    }),
  ],
  'card-action': [],
  ...Object.fromEntries(
    [
      'card',
      'card-header',
      'card-content',
      'card-footer',
      'card-title',
      'card-description',
      'card-action',
    ].flatMap((part) =>
      ['sm', 'default'].map((size) => [
        `${part}-size-${size}`,
        ['card-header', 'card-content', 'card-footer'].includes(part)
          ? [rule({ padding: `var(--tp-space-${size === 'sm' ? 3 : 5})` })]
          : [],
      ]),
    ),
  ),
};

export const defaultPresentationDictionary: PresentationDictionary = Object.fromEntries(
  [
    ...new Set([
      ...Object.keys(sharedPresentation),
      ...Object.keys(corePresentationDictionary),
      ...Object.keys(componentAppearance),
    ]),
  ].map((key) => [
    key,
    [
      ...(sharedPresentation[key] ?? []),
      ...(componentAppearance[key] ?? []),
      ...(corePresentationDictionary[key] ?? []),
    ],
  ]),
);
