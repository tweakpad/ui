import type { ComponentDefinition } from './definition.js';

// Derived from live Component Library 0.3.14, commit 8440bff2. Not a normative snapshot.
export const componentDefinitions: readonly ComponentDefinition[] = [
  {
    name: 'Drag Drop List',
    tagName: 'tp-drag-drop-list',
    kind: 'preset-composition',
    sourceNode: 'ucl21-drag-drop-list',
    axes: [
      { name: 'variant', values: ['ghost', 'outline', 'subdued'], default: 'ghost' },
      { name: 'size', values: ['xs', 'sm', 'default'], default: 'default' },
      { name: 'orientation', values: ['vertical', 'horizontal'], default: 'vertical' },
    ],
    parts: [
      {
        name: 'drag-drop-list-root',
        publicName: 'Root',
        slot: 'root',
        presentationKeys: ['drag-drop-list-root'],
        cardinality: 'exactly one public owner host',
      },
      {
        name: 'drag-drop-list-list',
        publicName: 'List',
        slot: 'list',
        presentationKeys: ['drag-drop-list-list'],
        cardinality: 'exactly one ordered list within Root',
      },
      {
        name: 'drag-drop-list-item',
        publicName: 'Item',
        slot: 'item',
        presentationKeys: ['drag-drop-list-item'],
        cardinality: 'zero or more list items within List',
      },
      {
        name: 'drag-drop-list-handle',
        publicName: 'Handle',
        slot: 'handle',
        presentationKeys: ['drag-drop-list-handle'],
        cardinality: 'one named button per item',
      },
      {
        name: 'drag-drop-list-placeholder',
        publicName: 'Placeholder',
        slot: 'placeholder',
        presentationKeys: ['drag-drop-list-placeholder'],
        cardinality: 'at most one source placeholder',
      },
      {
        name: 'drag-drop-list-overlay',
        publicName: 'Overlay',
        slot: 'overlay',
        presentationKeys: ['drag-drop-list-overlay'],
        cardinality: 'at most one active feedback overlay',
      },
      {
        name: 'drag-drop-list-empty',
        publicName: 'Empty',
        slot: 'empty',
        presentationKeys: ['drag-drop-list-empty'],
        cardinality: 'one when the list is empty',
      },
      {
        name: 'drag-drop-list-instructions',
        publicName: 'Instructions',
        slot: 'instructions',
        presentationKeys: ['drag-drop-list-instructions'],
        cardinality: 'one per applicable accessibility owner',
      },
      {
        name: 'drag-drop-list-announcements',
        publicName: 'Announcements',
        slot: 'announcements',
        presentationKeys: ['drag-drop-list-announcements'],
        cardinality: 'one per manager accessibility owner',
      },
    ],
    states: [
      'dragging',
      'dropping',
      'drop-target',
      'drag-disabled',
      'drop-disabled',
      'preview',
      'pending',
    ],
    motionRoles: [
      {
        name: 'sort-displacement',
        target: 'Item',
        kind: 'state',
        phases: ['change'],
        completion: 'non-blocking',
        context: ['itemId', 'sourceGroup', 'targetGroup', 'fromIndex', 'toIndex', 'x', 'y'],
      },
      {
        name: 'keyboard-feedback',
        target: 'Overlay',
        kind: 'state',
        phases: ['change'],
        completion: 'non-blocking',
        context: ['itemId', 'x', 'y'],
      },
      {
        name: 'drop-settlement',
        target: 'Overlay',
        kind: 'state',
        phases: ['change'],
        completion: 'blocking',
        context: ['itemId', 'sourceGroup', 'targetGroup', 'fromIndex', 'toIndex', 'x', 'y'],
      },
    ],
  },
  {
    name: 'Accordion',
    tagName: 'tp-accordion',
    kind: 'compound-reexport',
    sourceNode: 'ucl16-accordion',
    axes: [
      {
        name: 'variant',
        values: ['plain', 'line', 'outline', 'separated'],
        default: 'plain',
      },
    ],
    parts: [
      {
        name: 'accordion',
        publicName: 'Root',
        presentationKeys: [
          'accordion',
          'accordion-variant-plain',
          'accordion-variant-line',
          'accordion-variant-outline',
          'accordion-variant-separated',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'accordion-item',
        publicName: 'Item',
        presentationKeys: [
          'accordion-item',
          'accordion-item-variant-plain',
          'accordion-item-variant-line',
          'accordion-item-variant-outline',
          'accordion-item-variant-separated',
        ],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'accordion-heading',
        publicName: 'Heading',
        presentationKeys: [
          'accordion-heading',
          'accordion-heading-variant-plain',
          'accordion-heading-variant-line',
          'accordion-heading-variant-outline',
          'accordion-heading-variant-separated',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'accordion-trigger',
        publicName: 'Trigger',
        presentationKeys: [
          'accordion-trigger',
          'accordion-trigger-variant-plain',
          'accordion-trigger-variant-line',
          'accordion-trigger-variant-outline',
          'accordion-trigger-variant-separated',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'accordion-leading',
        publicName: 'Leading',
        presentationKeys: [
          'accordion-leading',
          'accordion-leading-variant-plain',
          'accordion-leading-variant-line',
          'accordion-leading-variant-outline',
          'accordion-leading-variant-separated',
        ],
        cardinality:
          'exactly one descendant of Trigger; accepts zero or more nodes from the leading slot',
      },
      {
        name: 'accordion-label',
        publicName: 'Label',
        presentationKeys: [
          'accordion-label',
          'accordion-label-variant-plain',
          'accordion-label-variant-line',
          'accordion-label-variant-outline',
          'accordion-label-variant-separated',
        ],
        cardinality: 'exactly one descendant of Trigger; receives the label slot',
      },
      {
        name: 'accordion-trailing',
        publicName: 'Trailing',
        presentationKeys: [
          'accordion-trailing',
          'accordion-trailing-variant-plain',
          'accordion-trailing-variant-line',
          'accordion-trailing-variant-outline',
          'accordion-trailing-variant-separated',
        ],
        cardinality:
          'exactly one descendant of Trigger; accepts zero or more nodes from the trailing slot',
      },
      {
        name: 'accordion-content',
        publicName: 'Content',
        presentationKeys: [
          'accordion-content',
          'accordion-content-variant-plain',
          'accordion-content-variant-line',
          'accordion-content-variant-outline',
          'accordion-content-variant-separated',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'accordion-content-body',
        publicName: 'ContentBody',
        presentationKeys: [
          'accordion-content-body',
          'accordion-content-body-variant-plain',
          'accordion-content-body-variant-line',
          'accordion-content-body-variant-outline',
          'accordion-content-body-variant-separated',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Button',
    tagName: 'tp-button',
    kind: 'compound-reexport',
    sourceNode: 'ucl16-button',
    axes: [
      {
        name: 'variant',
        values: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
        default: 'default',
      },
      {
        name: 'size',
        values: ['xs', 'sm', 'default', 'lg', 'icon-xs', 'icon-sm', 'icon', 'icon-lg'],
        default: 'default',
      },
    ],
    parts: [
      {
        name: 'button',
        publicName: 'Control',
        presentationKeys: [
          'button',
          'button-variant-default',
          'button-variant-secondary',
          'button-variant-destructive',
          'button-variant-outline',
          'button-variant-ghost',
          'button-variant-link',
          'button-size-xs',
          'button-size-sm',
          'button-size-default',
          'button-size-lg',
          'button-size-icon-xs',
          'button-size-icon-sm',
          'button-size-icon',
          'button-size-icon-lg',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'button-leading-mark',
        publicName: 'Leading mark',
        presentationKeys: [
          'button-leading-mark',
          'button-leading-mark-variant-default',
          'button-leading-mark-variant-secondary',
          'button-leading-mark-variant-destructive',
          'button-leading-mark-variant-outline',
          'button-leading-mark-variant-ghost',
          'button-leading-mark-variant-link',
          'button-leading-mark-size-xs',
          'button-leading-mark-size-sm',
          'button-leading-mark-size-default',
          'button-leading-mark-size-lg',
          'button-leading-mark-size-icon-xs',
          'button-leading-mark-size-icon-sm',
          'button-leading-mark-size-icon',
          'button-leading-mark-size-icon-lg',
        ],
        cardinality:
          'zero or one descendant of Control; cited behavior sets any required-presence condition',
      },
      {
        name: 'button-label',
        publicName: 'Label',
        presentationKeys: [
          'button-label',
          'button-label-variant-default',
          'button-label-variant-secondary',
          'button-label-variant-destructive',
          'button-label-variant-outline',
          'button-label-variant-ghost',
          'button-label-variant-link',
          'button-label-size-xs',
          'button-label-size-sm',
          'button-label-size-default',
          'button-label-size-lg',
          'button-label-size-icon-xs',
          'button-label-size-icon-sm',
          'button-label-size-icon',
          'button-label-size-icon-lg',
        ],
        cardinality:
          'zero or one descendant of Control; cited behavior sets any required-presence condition',
      },
      {
        name: 'button-trailing-mark',
        publicName: 'Trailing mark',
        presentationKeys: [
          'button-trailing-mark',
          'button-trailing-mark-variant-default',
          'button-trailing-mark-variant-secondary',
          'button-trailing-mark-variant-destructive',
          'button-trailing-mark-variant-outline',
          'button-trailing-mark-variant-ghost',
          'button-trailing-mark-variant-link',
          'button-trailing-mark-size-xs',
          'button-trailing-mark-size-sm',
          'button-trailing-mark-size-default',
          'button-trailing-mark-size-lg',
          'button-trailing-mark-size-icon-xs',
          'button-trailing-mark-size-icon-sm',
          'button-trailing-mark-size-icon',
          'button-trailing-mark-size-icon-lg',
        ],
        cardinality:
          'zero or one descendant of Control; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Checkbox',
    tagName: 'tp-checkbox',
    kind: 'compound-reexport',
    sourceNode: 'ucl16-checkbox',
    axes: [],
    parts: [
      {
        name: 'checkbox',
        publicName: 'Control',
        presentationKeys: ['checkbox'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'checkbox-indicator',
        publicName: 'Indicator',
        presentationKeys: ['checkbox-indicator'],
        cardinality:
          'zero or one descendant of Control; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Collapsible',
    tagName: 'tp-collapsible',
    kind: 'compound-reexport',
    sourceNode: 'ucl16-collapsible',
    axes: [],
    parts: [
      {
        name: 'collapsible',
        publicName: 'Root',
        presentationKeys: ['collapsible'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'collapsible-heading',
        publicName: 'Heading',
        presentationKeys: ['collapsible-heading'],
        cardinality: 'zero or one descendant of Root; headingLevel determines semantics',
      },
      {
        name: 'collapsible-trigger',
        publicName: 'Trigger',
        presentationKeys: ['collapsible-trigger'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'collapsible-leading',
        publicName: 'Leading',
        presentationKeys: ['collapsible-leading'],
        cardinality:
          'exactly one descendant of Trigger; accepts zero or more nodes from the leading slot',
      },
      {
        name: 'collapsible-label',
        publicName: 'Label',
        presentationKeys: ['collapsible-label'],
        cardinality: 'exactly one descendant of Trigger; receives the label slot',
      },
      {
        name: 'collapsible-trailing',
        publicName: 'Trailing',
        presentationKeys: ['collapsible-trailing'],
        cardinality:
          'exactly one descendant of Trigger; accepts zero or more nodes from the trailing slot',
      },
      {
        name: 'collapsible-content',
        publicName: 'Content',
        presentationKeys: ['collapsible-content'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'collapsible-content-body',
        publicName: 'ContentBody',
        presentationKeys: ['collapsible-content-body'],
        cardinality: 'exactly one descendant of Content',
      },
    ],
  },
  {
    name: 'Radio group',
    tagName: 'tp-radio-group',
    kind: 'compound-reexport',
    sourceNode: 'ucl16-radio-group',
    axes: [
      {
        name: 'orientation',
        values: ['horizontal', 'vertical'],
        default: 'vertical',
      },
    ],
    parts: [
      {
        name: 'radio-group',
        publicName: 'Group',
        presentationKeys: [
          'radio-group',
          'radio-group-orientation-horizontal',
          'radio-group-orientation-vertical',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'radio-group-item',
        publicName: 'Item',
        presentationKeys: [
          'radio-group-item',
          'radio-group-item-orientation-horizontal',
          'radio-group-item-orientation-vertical',
        ],
        cardinality: 'zero or more descendants of Group; cited behavior sets any stronger minimum',
      },
      {
        name: 'radio-group-indicator',
        publicName: 'Indicator',
        presentationKeys: [
          'radio-group-indicator',
          'radio-group-indicator-orientation-horizontal',
          'radio-group-indicator-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Switch',
    tagName: 'tp-switch',
    kind: 'compound-reexport',
    sourceNode: 'ucl16-switch',
    axes: [
      {
        name: 'size',
        values: ['sm', 'default'],
        default: 'default',
      },
    ],
    parts: [
      {
        name: 'switch',
        publicName: 'Control',
        presentationKeys: ['switch', 'switch-size-sm', 'switch-size-default'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'switch-thumb',
        publicName: 'Thumb',
        presentationKeys: ['switch-thumb', 'switch-thumb-size-sm', 'switch-thumb-size-default'],
        cardinality:
          'zero or more descendants of Control; cited behavior sets any stronger minimum',
      },
    ],
  },
  {
    name: 'Tabs',
    tagName: 'tp-tabs',
    kind: 'compound-reexport',
    sourceNode: 'ucl16-tabs',
    axes: [
      {
        name: 'orientation',
        values: ['horizontal', 'vertical'],
        default: 'horizontal',
      },
      {
        name: 'variant',
        values: ['enclosed', 'underline'],
        default: 'enclosed',
      },
    ],
    parts: [
      {
        name: 'tabs',
        publicName: 'Root',
        presentationKeys: [
          'tabs',
          'tabs-orientation-horizontal',
          'tabs-orientation-vertical',
          'tabs-variant-enclosed',
          'tabs-variant-underline',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'tabs-list',
        publicName: 'List',
        presentationKeys: [
          'tabs-list',
          'tabs-list-orientation-horizontal',
          'tabs-list-orientation-vertical',
          'tabs-list-variant-enclosed',
          'tabs-list-variant-underline',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'tabs-trigger',
        publicName: 'Trigger',
        presentationKeys: [
          'tabs-trigger',
          'tabs-trigger-orientation-horizontal',
          'tabs-trigger-orientation-vertical',
          'tabs-trigger-variant-enclosed',
          'tabs-trigger-variant-underline',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'tabs-indicator',
        publicName: 'Indicator',
        presentationKeys: [
          'tabs-indicator',
          'tabs-indicator-orientation-horizontal',
          'tabs-indicator-orientation-vertical',
          'tabs-indicator-variant-enclosed',
          'tabs-indicator-variant-underline',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'tabs-content',
        publicName: 'Content',
        presentationKeys: [
          'tabs-content',
          'tabs-content-orientation-horizontal',
          'tabs-content-orientation-vertical',
          'tabs-content-variant-enclosed',
          'tabs-content-variant-underline',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Toggle',
    tagName: 'tp-toggle',
    kind: 'compound-reexport',
    sourceNode: 'ucl16-toggle',
    axes: [
      {
        name: 'variant',
        values: ['ghost', 'outline'],
        default: 'ghost',
      },
      {
        name: 'size',
        values: ['sm', 'default', 'lg'],
        default: 'default',
      },
    ],
    parts: [
      {
        name: 'toggle',
        publicName: 'Control',
        presentationKeys: [
          'toggle',
          'toggle-variant-ghost',
          'toggle-variant-outline',
          'toggle-size-sm',
          'toggle-size-default',
          'toggle-size-lg',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'toggle-content',
        publicName: 'Content',
        presentationKeys: [
          'toggle-content',
          'toggle-content-variant-ghost',
          'toggle-content-variant-outline',
          'toggle-content-size-sm',
          'toggle-content-size-default',
          'toggle-content-size-lg',
        ],
        cardinality:
          'zero or one descendant of Control; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Toggle group',
    tagName: 'tp-toggle-group',
    kind: 'compound-reexport',
    sourceNode: 'ucl16-toggle-group',
    axes: [
      {
        name: 'orientation',
        values: ['horizontal', 'vertical'],
        default: 'horizontal',
      },
      {
        name: 'variant',
        values: ['ghost', 'outline'],
        default: 'ghost',
      },
      {
        name: 'size',
        values: ['sm', 'default', 'lg'],
        default: 'default',
      },
    ],
    parts: [
      {
        name: 'toggle-group',
        publicName: 'Group',
        presentationKeys: [
          'toggle-group',
          'toggle-group-orientation-horizontal',
          'toggle-group-orientation-vertical',
          'toggle-group-variant-ghost',
          'toggle-group-variant-outline',
          'toggle-group-size-sm',
          'toggle-group-size-default',
          'toggle-group-size-lg',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'toggle-group-item',
        publicName: 'Item',
        presentationKeys: [
          'toggle-group-item',
          'toggle-group-item-orientation-horizontal',
          'toggle-group-item-orientation-vertical',
          'toggle-group-item-variant-ghost',
          'toggle-group-item-variant-outline',
          'toggle-group-item-size-sm',
          'toggle-group-item-size-default',
          'toggle-group-item-size-lg',
        ],
        cardinality: 'zero or more descendants of Group; cited behavior sets any stronger minimum',
      },
    ],
  },
  {
    name: 'Calendar',
    tagName: 'tp-calendar',
    kind: 'compound-reexport',
    sourceNode: 'ucl17-calendar',
    axes: [],
    parts: [
      {
        name: 'calendar',
        publicName: 'Root',
        presentationKeys: ['calendar'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'calendar-header',
        publicName: 'Header',
        presentationKeys: ['calendar-header'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'calendar-previous',
        publicName: 'Previous',
        presentationKeys: ['calendar-previous'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'calendar-next',
        publicName: 'Next',
        presentationKeys: ['calendar-next'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'calendar-month-grid',
        publicName: 'Month grid',
        presentationKeys: ['calendar-month-grid'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'calendar-day',
        publicName: 'Day',
        presentationKeys: ['calendar-day'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'calendar-months',
        publicName: 'Months',
        presentationKeys: ['calendar-months'],
        cardinality:
          'zero or more descendants of Root as required by displayed months and configured options',
      },
      {
        name: 'calendar-month',
        publicName: 'Month',
        presentationKeys: ['calendar-month'],
        cardinality:
          'zero or more descendants of Root as required by displayed months and configured options',
      },
      {
        name: 'calendar-caption',
        publicName: 'Caption',
        presentationKeys: ['calendar-caption'],
        cardinality:
          'zero or more descendants of Root as required by displayed months and configured options',
      },
      {
        name: 'calendar-caption-label',
        publicName: 'CaptionLabel',
        presentationKeys: ['calendar-caption-label'],
        cardinality:
          'zero or more descendants of Root as required by displayed months and configured options',
      },
      {
        name: 'calendar-dropdowns',
        publicName: 'Dropdowns',
        presentationKeys: ['calendar-dropdowns'],
        cardinality:
          'zero or more descendants of Root as required by displayed months and configured options',
      },
      {
        name: 'calendar-month-dropdown',
        publicName: 'MonthDropdown',
        presentationKeys: ['calendar-month-dropdown'],
        cardinality:
          'zero or more descendants of Root as required by displayed months and configured options',
      },
      {
        name: 'calendar-year-dropdown',
        publicName: 'YearDropdown',
        presentationKeys: ['calendar-year-dropdown'],
        cardinality:
          'zero or more descendants of Root as required by displayed months and configured options',
      },
      {
        name: 'calendar-weekdays',
        publicName: 'Weekdays',
        presentationKeys: ['calendar-weekdays'],
        cardinality:
          'zero or more descendants of Root as required by displayed months and configured options',
      },
      {
        name: 'calendar-weekday',
        publicName: 'Weekday',
        presentationKeys: ['calendar-weekday'],
        cardinality:
          'zero or more descendants of Root as required by displayed months and configured options',
      },
      {
        name: 'calendar-weeks',
        publicName: 'Weeks',
        presentationKeys: ['calendar-weeks'],
        cardinality:
          'zero or more descendants of Root as required by displayed months and configured options',
      },
      {
        name: 'calendar-week',
        publicName: 'Week',
        presentationKeys: ['calendar-week'],
        cardinality:
          'zero or more descendants of Root as required by displayed months and configured options',
      },
      {
        name: 'calendar-week-number',
        publicName: 'WeekNumber',
        presentationKeys: ['calendar-week-number'],
        cardinality:
          'zero or more descendants of Root as required by displayed months and configured options',
      },
      {
        name: 'calendar-footer',
        publicName: 'Footer',
        presentationKeys: ['calendar-footer'],
        cardinality:
          'zero or more descendants of Root as required by displayed months and configured options',
      },
    ],
  },
  {
    name: 'Field',
    tagName: 'tp-field',
    kind: 'compound-reexport',
    sourceNode: 'ucl17-field',
    axes: [
      {
        name: 'orientation',
        values: ['vertical', 'horizontal', 'responsive'],
        default: 'vertical',
      },
    ],
    parts: [
      {
        name: 'field',
        publicName: 'Field set',
        presentationKeys: [
          'field',
          'field-orientation-vertical',
          'field-orientation-horizontal',
          'field-orientation-responsive',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'field-legend',
        publicName: 'Legend',
        presentationKeys: [
          'field-legend',
          'field-legend-orientation-vertical',
          'field-legend-orientation-horizontal',
          'field-legend-orientation-responsive',
        ],
        cardinality:
          'zero or one descendant of Field set; cited behavior sets any required-presence condition',
      },
      {
        name: 'field-field-group',
        publicName: 'Field group',
        presentationKeys: [
          'field-field-group',
          'field-field-group-orientation-vertical',
          'field-field-group-orientation-horizontal',
          'field-field-group-orientation-responsive',
        ],
        cardinality:
          'zero or one descendant of Field set; cited behavior sets any required-presence condition',
      },
      {
        name: 'field-field',
        publicName: 'Field',
        presentationKeys: [
          'field-field',
          'field-field-orientation-vertical',
          'field-field-orientation-horizontal',
          'field-field-orientation-responsive',
        ],
        cardinality:
          'zero or one descendant of Field set; cited behavior sets any required-presence condition',
      },
      {
        name: 'field-label',
        publicName: 'Label',
        presentationKeys: [
          'field-label',
          'field-label-orientation-vertical',
          'field-label-orientation-horizontal',
          'field-label-orientation-responsive',
        ],
        cardinality:
          'zero or one descendant of Field set; cited behavior sets any required-presence condition',
      },
      {
        name: 'field-title',
        publicName: 'Title',
        presentationKeys: [
          'field-title',
          'field-title-orientation-vertical',
          'field-title-orientation-horizontal',
          'field-title-orientation-responsive',
        ],
        cardinality:
          'zero or one descendant of Field set; cited behavior sets any required-presence condition',
      },
      {
        name: 'field-control-region',
        publicName: 'Control region',
        presentationKeys: [
          'field-control-region',
          'field-control-region-orientation-vertical',
          'field-control-region-orientation-horizontal',
          'field-control-region-orientation-responsive',
        ],
        cardinality:
          'zero or one descendant of Field set; cited behavior sets any required-presence condition',
      },
      {
        name: 'field-description',
        publicName: 'Description',
        presentationKeys: [
          'field-description',
          'field-description-orientation-vertical',
          'field-description-orientation-horizontal',
          'field-description-orientation-responsive',
        ],
        cardinality:
          'zero or one descendant of Field set; cited behavior sets any required-presence condition',
      },
      {
        name: 'field-error',
        publicName: 'Error',
        presentationKeys: [
          'field-error',
          'field-error-orientation-vertical',
          'field-error-orientation-horizontal',
          'field-error-orientation-responsive',
        ],
        cardinality:
          'zero or one descendant of Field set; cited behavior sets any required-presence condition',
      },
      {
        name: 'field-separator',
        publicName: 'Separator',
        presentationKeys: [
          'field-separator',
          'field-separator-orientation-vertical',
          'field-separator-orientation-horizontal',
          'field-separator-orientation-responsive',
        ],
        cardinality:
          'zero or one descendant of Field set; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Form',
    tagName: 'tp-form',
    kind: 'compound-reexport',
    sourceNode: 'ucl17-form',
    nonVisualParts: ['Field registry'],
    axes: [],
    parts: [
      {
        name: 'form',
        publicName: 'Root',
        presentationKeys: ['form'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'form-error-summary',
        publicName: 'Error summary',
        presentationKeys: ['form-error-summary'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'form-actions',
        publicName: 'Actions',
        presentationKeys: ['form-actions'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Input',
    tagName: 'tp-input',
    kind: 'compound-reexport',
    sourceNode: 'ucl17-input',
    axes: [],
    parts: [
      {
        name: 'input',
        publicName: 'Control',
        presentationKeys: ['input'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'input-prefix',
        publicName: 'Prefix',
        presentationKeys: ['input-prefix'],
        cardinality:
          'zero or one descendant of Control; cited behavior sets any required-presence condition',
      },
      {
        name: 'input-suffix',
        publicName: 'Suffix',
        presentationKeys: ['input-suffix'],
        cardinality:
          'zero or one descendant of Control; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Input group',
    tagName: 'tp-input-group',
    kind: 'preset-composition',
    sourceNode: 'ucl17-input-group',
    axes: [
      {
        name: 'actionSize',
        values: ['xs', 'sm', 'icon-xs', 'icon-sm'],
        default: 'xs',
      },
      {
        name: 'actionVariant',
        values: ['ghost', 'default', 'secondary', 'destructive', 'outline', 'link'],
        default: 'ghost',
      },
    ],
    parts: [
      {
        name: 'input-group',
        publicName: 'Root',
        presentationKeys: ['input-group'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'input-group-control',
        publicName: 'Control',
        presentationKeys: ['input-group-control'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'input-group-addon',
        publicName: 'Addon',
        presentationKeys: ['input-group-addon'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'input-group-action',
        publicName: 'Action',
        presentationKeys: [
          'input-group-action',
          'input-group-action-size-xs',
          'input-group-action-size-sm',
          'input-group-action-size-icon-xs',
          'input-group-action-size-icon-sm',
          'input-group-action-variant-ghost',
          'input-group-action-variant-default',
          'input-group-action-variant-secondary',
          'input-group-action-variant-destructive',
          'input-group-action-variant-outline',
          'input-group-action-variant-link',
        ],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'input-group-text',
        publicName: 'Text',
        presentationKeys: ['input-group-text'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'One-time code field',
    tagName: 'tp-otp-field',
    kind: 'compound-reexport',
    sourceNode: 'ucl17-one-time-code',
    axes: [],
    parts: [
      {
        name: 'one-time-code-field',
        publicName: 'Root',
        presentationKeys: ['one-time-code-field'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'one-time-code-field-group',
        publicName: 'Group',
        presentationKeys: ['one-time-code-field-group'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'one-time-code-field-slot',
        publicName: 'Slot',
        presentationKeys: ['one-time-code-field-slot'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'one-time-code-field-separator',
        publicName: 'Separator',
        presentationKeys: ['one-time-code-field-separator'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Native select',
    tagName: 'tp-native-select',
    kind: 'compound-reexport',
    sourceNode: 'ucl17-native-select',
    axes: [
      {
        name: 'size',
        values: ['sm', 'default'],
        default: 'default',
      },
    ],
    parts: [
      {
        name: 'native-select',
        publicName: 'Wrapper',
        presentationKeys: ['native-select', 'native-select-size-sm', 'native-select-size-default'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'native-select-control',
        publicName: 'Control',
        presentationKeys: [
          'native-select-control',
          'native-select-control-size-sm',
          'native-select-control-size-default',
        ],
        cardinality:
          'zero or one descendant of Wrapper; cited behavior sets any required-presence condition',
      },
      {
        name: 'native-select-option-group',
        publicName: 'Option group',
        presentationKeys: [
          'native-select-option-group',
          'native-select-option-group-size-sm',
          'native-select-option-group-size-default',
        ],
        cardinality:
          'zero or more descendants of Wrapper; cited behavior sets any required-presence condition',
      },
      {
        name: 'native-select-option',
        publicName: 'Option',
        presentationKeys: [
          'native-select-option',
          'native-select-option-size-sm',
          'native-select-option-size-default',
        ],
        cardinality:
          'zero or more descendants of Wrapper; cited behavior sets any stronger minimum',
      },
      {
        name: 'native-select-indicator',
        publicName: 'Indicator',
        presentationKeys: [
          'native-select-indicator',
          'native-select-indicator-size-sm',
          'native-select-indicator-size-default',
        ],
        cardinality:
          'zero or one descendant of Wrapper; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Questionnaire',
    tagName: 'tp-questionnaire',
    kind: 'compound-reexport',
    sourceNode: 'ucl17-questionnaire',
    axes: [],
    parts: [
      {
        name: 'questionnaire',
        publicName: 'Root',
        presentationKeys: ['questionnaire'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'questionnaire-progress',
        publicName: 'Progress',
        presentationKeys: ['questionnaire-progress'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'questionnaire-question',
        publicName: 'Question',
        presentationKeys: ['questionnaire-question'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'questionnaire-title',
        publicName: 'Title',
        presentationKeys: ['questionnaire-title'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'questionnaire-description',
        publicName: 'Description',
        presentationKeys: ['questionnaire-description'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'questionnaire-choices',
        publicName: 'Choices',
        presentationKeys: ['questionnaire-choices'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'questionnaire-choice',
        publicName: 'Choice',
        presentationKeys: ['questionnaire-choice'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'questionnaire-input-region',
        publicName: 'Input region',
        presentationKeys: ['questionnaire-input-region'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'questionnaire-error',
        publicName: 'Error',
        presentationKeys: ['questionnaire-error'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'questionnaire-actions',
        publicName: 'Actions',
        presentationKeys: ['questionnaire-actions'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Slider',
    tagName: 'tp-slider',
    kind: 'compound-reexport',
    sourceNode: 'ucl17-slider',
    axes: [
      {
        name: 'orientation',
        values: ['horizontal', 'vertical'],
        default: 'horizontal',
      },
    ],
    parts: [
      {
        name: 'slider',
        publicName: 'Root',
        presentationKeys: [
          'slider',
          'slider-orientation-horizontal',
          'slider-orientation-vertical',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'slider-track',
        publicName: 'Track',
        presentationKeys: [
          'slider-track',
          'slider-track-orientation-horizontal',
          'slider-track-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'slider-range',
        publicName: 'Range',
        presentationKeys: [
          'slider-range',
          'slider-range-orientation-horizontal',
          'slider-range-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'slider-thumb',
        publicName: 'Thumb',
        presentationKeys: [
          'slider-thumb',
          'slider-thumb-orientation-horizontal',
          'slider-thumb-orientation-vertical',
        ],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'slider-label',
        publicName: 'Label',
        presentationKeys: [
          'slider-label',
          'slider-label-orientation-horizontal',
          'slider-label-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'slider-output',
        publicName: 'Output',
        presentationKeys: [
          'slider-output',
          'slider-output-orientation-horizontal',
          'slider-output-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Text area',
    tagName: 'tp-text-area',
    kind: 'compound-reexport',
    sourceNode: 'ucl17-textarea',
    axes: [],
    parts: [
      {
        name: 'text-area',
        publicName: 'Control',
        presentationKeys: ['text-area'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'text-area-resize-affordance',
        publicName: 'Resize affordance',
        presentationKeys: ['text-area-resize-affordance'],
        cardinality:
          'zero or one descendant of Control; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Select',
    tagName: 'tp-select',
    kind: 'flattening-compound',
    sourceNode: 'ucl18-select',
    axes: [],
    parts: [
      {
        name: 'select',
        publicName: 'Root',
        presentationKeys: ['select'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'select-trigger',
        publicName: 'Trigger',
        presentationKeys: ['select-trigger'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'select-value',
        publicName: 'Value',
        presentationKeys: ['select-value'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'select-content',
        publicName: 'Content',
        presentationKeys: ['select-content'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'select-list',
        publicName: 'List',
        presentationKeys: ['select-list'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'select-group',
        publicName: 'Group',
        presentationKeys: ['select-group'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'select-label',
        publicName: 'Label',
        presentationKeys: ['select-label'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'select-option',
        publicName: 'Option',
        presentationKeys: ['select-option'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'select-separator',
        publicName: 'Separator',
        presentationKeys: ['select-separator'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'select-scroll-up-button',
        publicName: 'ScrollUpButton',
        presentationKeys: ['select-scroll-up-button'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'select-scroll-down-button',
        publicName: 'ScrollDownButton',
        presentationKeys: ['select-scroll-down-button'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'select-anchor',
        publicName: 'Anchor',
        presentationKeys: ['select-anchor'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'select-input',
        publicName: 'Input',
        presentationKeys: ['select-input'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'select-clear',
        publicName: 'Clear',
        presentationKeys: ['select-clear'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'select-collection',
        publicName: 'Collection',
        presentationKeys: ['select-collection'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'select-empty-state',
        publicName: 'Empty state',
        presentationKeys: ['select-empty-state'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'select-chip-list',
        publicName: 'ChipList',
        presentationKeys: ['select-chip-list'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'select-chip',
        publicName: 'Chip',
        presentationKeys: ['select-chip'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'select-chip-remove',
        publicName: 'Chip remove',
        presentationKeys: ['select-chip-remove'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Command palette',
    tagName: 'tp-command-palette',
    kind: 'preset-composition',
    sourceNode: 'ucl18-command',
    nonVisualParts: ['Dialog composition'],
    axes: [],
    parts: [
      {
        name: 'command-palette',
        publicName: 'Root',
        presentationKeys: ['command-palette'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'command-palette-input-wrapper',
        publicName: 'InputWrapper',
        presentationKeys: ['command-palette-input-wrapper'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'command-palette-input',
        publicName: 'Input',
        presentationKeys: ['command-palette-input'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'command-palette-list',
        publicName: 'List',
        presentationKeys: ['command-palette-list'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'command-palette-group',
        publicName: 'Group',
        presentationKeys: ['command-palette-group'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'command-palette-item',
        publicName: 'Item',
        presentationKeys: ['command-palette-item'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'command-palette-shortcut-hint',
        publicName: 'Shortcut hint',
        presentationKeys: ['command-palette-shortcut-hint'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'command-palette-separator',
        publicName: 'Separator',
        presentationKeys: ['command-palette-separator'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'command-palette-empty-state',
        publicName: 'Empty state',
        presentationKeys: ['command-palette-empty-state'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Alert dialog',
    tagName: 'tp-alert-dialog',
    kind: 'flattening-compound',
    sourceNode: 'ucl19-alert-dialog',
    axes: [],
    parts: [
      {
        name: 'alert-dialog',
        publicName: 'Root',
        presentationKeys: ['alert-dialog'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'alert-dialog-trigger',
        publicName: 'Trigger',
        presentationKeys: ['alert-dialog-trigger'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'alert-dialog-portal',
        publicName: 'Portal',
        presentationKeys: ['alert-dialog-portal'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'alert-dialog-overlay',
        publicName: 'Overlay',
        presentationKeys: ['alert-dialog-overlay'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'alert-dialog-content',
        publicName: 'Content',
        presentationKeys: ['alert-dialog-content'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'alert-dialog-header',
        publicName: 'Header',
        presentationKeys: ['alert-dialog-header'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'alert-dialog-media',
        publicName: 'Media',
        presentationKeys: ['alert-dialog-media'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'alert-dialog-title',
        publicName: 'Title',
        presentationKeys: ['alert-dialog-title'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'alert-dialog-description',
        publicName: 'Description',
        presentationKeys: ['alert-dialog-description'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'alert-dialog-actions',
        publicName: 'Actions',
        presentationKeys: ['alert-dialog-actions'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'alert-dialog-confirm',
        publicName: 'Confirm',
        presentationKeys: ['alert-dialog-confirm'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'alert-dialog-cancel',
        publicName: 'Cancel',
        presentationKeys: ['alert-dialog-cancel'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Dialog',
    tagName: 'tp-dialog',
    kind: 'flattening-compound',
    sourceNode: 'ucl19-dialog',
    axes: [],
    parts: [
      {
        name: 'dialog',
        publicName: 'Root',
        presentationKeys: ['dialog'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'dialog-trigger',
        publicName: 'Trigger',
        presentationKeys: ['dialog-trigger'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'dialog-portal',
        publicName: 'Portal',
        presentationKeys: ['dialog-portal'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'dialog-overlay',
        publicName: 'Overlay',
        presentationKeys: ['dialog-overlay'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'dialog-content',
        publicName: 'Content',
        presentationKeys: ['dialog-content'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'dialog-header',
        publicName: 'Header',
        presentationKeys: ['dialog-header'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'dialog-title',
        publicName: 'Title',
        presentationKeys: ['dialog-title'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'dialog-description',
        publicName: 'Description',
        presentationKeys: ['dialog-description'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'dialog-footer',
        publicName: 'Footer',
        presentationKeys: ['dialog-footer'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'dialog-close',
        publicName: 'Close',
        presentationKeys: ['dialog-close'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Drawer',
    tagName: 'tp-drawer',
    kind: 'flattening-compound',
    sourceNode: 'ucl19-drawer',
    axes: [],
    parts: [
      {
        name: 'drawer',
        publicName: 'Root',
        presentationKeys: ['drawer'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'drawer-trigger',
        publicName: 'Trigger',
        presentationKeys: ['drawer-trigger'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'drawer-close',
        publicName: 'Close',
        presentationKeys: ['drawer-close'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'drawer-portal',
        publicName: 'Portal',
        presentationKeys: ['drawer-portal'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'drawer-overlay',
        publicName: 'Overlay',
        presentationKeys: ['drawer-overlay'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'drawer-viewport',
        publicName: 'Viewport',
        presentationKeys: ['drawer-viewport'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'drawer-surface',
        publicName: 'Surface',
        presentationKeys: ['drawer-surface'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'drawer-swipe-handle',
        publicName: 'Swipe handle',
        presentationKeys: ['drawer-swipe-handle'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'drawer-content',
        publicName: 'Content',
        presentationKeys: ['drawer-content'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'drawer-header',
        publicName: 'Header',
        presentationKeys: ['drawer-header'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'drawer-title',
        publicName: 'Title',
        presentationKeys: ['drawer-title'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'drawer-description',
        publicName: 'Description',
        presentationKeys: ['drawer-description'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'drawer-footer',
        publicName: 'Footer',
        presentationKeys: ['drawer-footer'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Preview card',
    tagName: 'tp-preview-card',
    kind: 'flattening-compound',
    sourceNode: 'ucl19-preview-card',
    axes: [],
    parts: [
      {
        name: 'preview-card',
        publicName: 'Root',
        presentationKeys: ['preview-card'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'preview-card-trigger',
        publicName: 'Trigger',
        presentationKeys: ['preview-card-trigger'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'preview-card-content',
        publicName: 'Content',
        presentationKeys: ['preview-card-content'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'preview-card-positioner',
        publicName: 'Positioner',
        presentationKeys: ['preview-card-positioner'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'preview-card-portal',
        publicName: 'Portal',
        presentationKeys: ['preview-card-portal'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Popover',
    tagName: 'tp-popover',
    kind: 'flattening-compound',
    sourceNode: 'ucl19-popover',
    axes: [],
    parts: [
      {
        name: 'popover',
        publicName: 'Root',
        presentationKeys: ['popover'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'popover-trigger',
        publicName: 'Trigger',
        presentationKeys: ['popover-trigger'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'popover-anchor',
        publicName: 'Anchor',
        presentationKeys: ['popover-anchor'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'popover-content',
        publicName: 'Content',
        presentationKeys: ['popover-content'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'popover-header',
        publicName: 'Header',
        presentationKeys: ['popover-header'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'popover-title',
        publicName: 'Title',
        presentationKeys: ['popover-title'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'popover-description',
        publicName: 'Description',
        presentationKeys: ['popover-description'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'popover-positioner',
        publicName: 'Positioner',
        presentationKeys: ['popover-positioner'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'popover-portal',
        publicName: 'Portal',
        presentationKeys: ['popover-portal'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Tooltip',
    tagName: 'tp-tooltip',
    kind: 'flattening-compound',
    sourceNode: 'ucl19-tooltip',
    nonVisualParts: ['Provider'],
    axes: [],
    parts: [
      {
        name: 'tooltip',
        publicName: 'Root',
        presentationKeys: ['tooltip'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'tooltip-trigger',
        publicName: 'Trigger',
        presentationKeys: ['tooltip-trigger'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'tooltip-content',
        publicName: 'Content',
        presentationKeys: ['tooltip-content'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'tooltip-positioner',
        publicName: 'Positioner',
        presentationKeys: ['tooltip-positioner'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'tooltip-portal',
        publicName: 'Portal',
        presentationKeys: ['tooltip-portal'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'tooltip-arrow',
        publicName: 'Arrow',
        presentationKeys: ['tooltip-arrow'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Breadcrumb',
    tagName: 'tp-breadcrumb',
    kind: 'flattening-compound',
    sourceNode: 'ucl20-breadcrumb',
    axes: [],
    parts: [
      {
        name: 'breadcrumb',
        publicName: 'Navigation region',
        presentationKeys: ['breadcrumb'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'breadcrumb-ordered-list',
        publicName: 'Ordered list',
        presentationKeys: ['breadcrumb-ordered-list'],
        cardinality:
          'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
      },
      {
        name: 'breadcrumb-item',
        publicName: 'Item',
        presentationKeys: ['breadcrumb-item'],
        cardinality:
          'zero or more descendants of Navigation region; cited behavior sets any stronger minimum',
      },
      {
        name: 'breadcrumb-link',
        publicName: 'Link',
        presentationKeys: ['breadcrumb-link'],
        cardinality:
          'zero or more descendants of Navigation region; cited behavior sets any stronger minimum',
      },
      {
        name: 'breadcrumb-current-page',
        publicName: 'Current page',
        presentationKeys: ['breadcrumb-current-page'],
        cardinality:
          'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
      },
      {
        name: 'breadcrumb-separator',
        publicName: 'Separator',
        presentationKeys: ['breadcrumb-separator'],
        cardinality:
          'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
      },
      {
        name: 'breadcrumb-ellipsis',
        publicName: 'Ellipsis',
        presentationKeys: ['breadcrumb-ellipsis'],
        cardinality:
          'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Menu',
    tagName: 'tp-menu',
    kind: 'flattening-compound',
    sourceNode: 'ucl20-menu',
    axes: [
      {
        name: 'itemVariant',
        values: ['ghost', 'destructive'],
        default: 'ghost',
      },
    ],
    parts: [
      {
        name: 'menu',
        publicName: 'Root',
        presentationKeys: ['menu'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'menu-trigger',
        publicName: 'Trigger',
        presentationKeys: ['menu-trigger'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'menu-target',
        publicName: 'Context target',
        presentationKeys: ['menu-target'],
        cardinality: 'one invoking region in context invocation mode',
      },
      {
        name: 'menu-content',
        publicName: 'Content',
        presentationKeys: ['menu-content'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'menu-item',
        publicName: 'Item',
        presentationKeys: ['menu-item', 'menu-item-variant-ghost', 'menu-item-variant-destructive'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'menu-checkbox-item',
        publicName: 'Checkbox item',
        presentationKeys: ['menu-checkbox-item'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'menu-radio-group',
        publicName: 'RadioGroup',
        presentationKeys: ['menu-radio-group'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'menu-radio-item',
        publicName: 'RadioItem',
        presentationKeys: ['menu-radio-item'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'menu-group',
        publicName: 'Group',
        presentationKeys: ['menu-group'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'menu-label',
        publicName: 'Label',
        presentationKeys: ['menu-label'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'menu-sub-trigger',
        publicName: 'SubTrigger',
        presentationKeys: ['menu-sub-trigger'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'menu-sub-content',
        publicName: 'SubContent',
        presentationKeys: ['menu-sub-content'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'menu-separator',
        publicName: 'Separator',
        presentationKeys: ['menu-separator'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'menu-shortcut',
        publicName: 'Shortcut',
        presentationKeys: ['menu-shortcut'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Menubar',
    tagName: 'tp-menubar',
    kind: 'flattening-compound',
    sourceNode: 'ucl20-menubar',
    axes: [],
    parts: [
      {
        name: 'menubar',
        publicName: 'Root',
        presentationKeys: ['menubar'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'menubar-menu',
        publicName: 'Menu',
        presentationKeys: ['menubar-menu'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'menubar-trigger',
        publicName: 'Trigger',
        presentationKeys: ['menubar-trigger'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'menubar-content',
        publicName: 'Content',
        presentationKeys: ['menubar-content'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'menubar-item',
        publicName: 'Item',
        presentationKeys: ['menubar-item'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'menubar-group',
        publicName: 'Group',
        presentationKeys: ['menubar-group'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'menubar-sub-trigger',
        publicName: 'SubTrigger',
        presentationKeys: ['menubar-sub-trigger'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'menubar-sub-content',
        publicName: 'SubContent',
        presentationKeys: ['menubar-sub-content'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'menubar-separator',
        publicName: 'Separator',
        presentationKeys: ['menubar-separator'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'menubar-shortcut',
        publicName: 'Shortcut',
        presentationKeys: ['menubar-shortcut'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Navigation menu',
    tagName: 'tp-navigation-menu',
    kind: 'flattening-compound',
    sourceNode: 'ucl20-navigation-menu',
    axes: [
      {
        name: 'orientation',
        values: ['horizontal', 'vertical'],
        default: 'horizontal',
      },
    ],
    parts: [
      {
        name: 'navigation-menu',
        publicName: 'Root',
        presentationKeys: [
          'navigation-menu',
          'navigation-menu-orientation-horizontal',
          'navigation-menu-orientation-vertical',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'navigation-menu-list',
        publicName: 'List',
        presentationKeys: [
          'navigation-menu-list',
          'navigation-menu-list-orientation-horizontal',
          'navigation-menu-list-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'navigation-menu-item',
        publicName: 'Item',
        presentationKeys: [
          'navigation-menu-item',
          'navigation-menu-item-orientation-horizontal',
          'navigation-menu-item-orientation-vertical',
        ],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'navigation-menu-trigger',
        publicName: 'Trigger',
        presentationKeys: [
          'navigation-menu-trigger',
          'navigation-menu-trigger-orientation-horizontal',
          'navigation-menu-trigger-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'navigation-menu-content',
        publicName: 'Content',
        presentationKeys: [
          'navigation-menu-content',
          'navigation-menu-content-orientation-horizontal',
          'navigation-menu-content-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'navigation-menu-link',
        publicName: 'Link',
        presentationKeys: [
          'navigation-menu-link',
          'navigation-menu-link-orientation-horizontal',
          'navigation-menu-link-orientation-vertical',
        ],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'navigation-menu-indicator',
        publicName: 'Indicator',
        presentationKeys: [
          'navigation-menu-indicator',
          'navigation-menu-indicator-orientation-horizontal',
          'navigation-menu-indicator-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'navigation-menu-viewport',
        publicName: 'Viewport',
        presentationKeys: [
          'navigation-menu-viewport',
          'navigation-menu-viewport-orientation-horizontal',
          'navigation-menu-viewport-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'navigation-menu-positioner',
        publicName: 'Positioner',
        presentationKeys: [
          'navigation-menu-positioner',
          'navigation-menu-positioner-orientation-horizontal',
          'navigation-menu-positioner-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Pagination',
    tagName: 'tp-pagination',
    kind: 'flattening-compound',
    sourceNode: 'ucl20-pagination',
    axes: [
      {
        name: 'pageLinkVariant',
        values: ['text', 'icon'],
        default: 'icon',
      },
    ],
    parts: [
      {
        name: 'pagination',
        publicName: 'Navigation region',
        presentationKeys: ['pagination'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'pagination-list',
        publicName: 'List',
        presentationKeys: ['pagination-list'],
        cardinality:
          'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
      },
      {
        name: 'pagination-page-item',
        publicName: 'Page item',
        presentationKeys: ['pagination-page-item'],
        cardinality:
          'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
      },
      {
        name: 'pagination-page-link',
        publicName: 'Page link',
        presentationKeys: [
          'pagination-page-link',
          'pagination-page-link-variant-text',
          'pagination-page-link-variant-icon',
        ],
        cardinality:
          'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
      },
      {
        name: 'pagination-previous',
        publicName: 'Previous',
        presentationKeys: ['pagination-previous'],
        cardinality:
          'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
      },
      {
        name: 'pagination-next',
        publicName: 'Next',
        presentationKeys: ['pagination-next'],
        cardinality:
          'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
      },
      {
        name: 'pagination-ellipsis',
        publicName: 'Ellipsis',
        presentationKeys: ['pagination-ellipsis'],
        cardinality:
          'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Avatar',
    tagName: 'tp-avatar',
    kind: 'compound-reexport',
    sourceNode: 'ucl21-avatar',
    axes: [
      {
        name: 'size',
        values: ['sm', 'default', 'lg'],
        default: 'default',
      },
    ],
    parts: [
      {
        name: 'avatar',
        publicName: 'Root',
        presentationKeys: ['avatar', 'avatar-size-sm', 'avatar-size-default', 'avatar-size-lg'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'avatar-image',
        publicName: 'Image',
        presentationKeys: [
          'avatar-image',
          'avatar-image-size-sm',
          'avatar-image-size-default',
          'avatar-image-size-lg',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'avatar-fallback',
        publicName: 'Fallback',
        presentationKeys: [
          'avatar-fallback',
          'avatar-fallback-size-sm',
          'avatar-fallback-size-default',
          'avatar-fallback-size-lg',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'avatar-badge',
        publicName: 'Badge',
        presentationKeys: [
          'avatar-badge',
          'avatar-badge-size-sm',
          'avatar-badge-size-default',
          'avatar-badge-size-lg',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'avatar-group',
        publicName: 'Group',
        presentationKeys: [
          'avatar-group',
          'avatar-group-size-sm',
          'avatar-group-size-default',
          'avatar-group-size-lg',
        ],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'avatar-overflow-count',
        publicName: 'Overflow count',
        presentationKeys: [
          'avatar-overflow-count',
          'avatar-overflow-count-size-sm',
          'avatar-overflow-count-size-default',
          'avatar-overflow-count-size-lg',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Carousel',
    tagName: 'tp-carousel',
    kind: 'compound-reexport',
    sourceNode: 'ucl21-carousel',
    axes: [
      {
        name: 'orientation',
        values: ['horizontal', 'vertical'],
        default: 'horizontal',
      },
      {
        name: 'indicatorType',
        values: ['bullets', 'fraction', 'progress', 'custom'],
        default: 'fraction',
      },
      { name: 'controlsPlacement', values: ['footer', 'inside', 'outside'], default: 'footer' },
    ],
    states: [
      'disabled',
      'readonly',
      'selected',
      'dragging',
      'transitioning',
      'locked',
      'visible',
      'fully-visible',
      'autoplay-running',
      'autoplay-paused',
      'virtual',
    ],
    motionRoles: [
      {
        name: 'track',
        target: 'carousel-track',
        kind: 'state',
        phases: ['change'],
        completion: 'non-blocking',
      },
      {
        name: 'auto-height',
        target: 'carousel-viewport',
        kind: 'state',
        phases: ['change'],
        completion: 'non-blocking',
      },
      {
        name: 'scrollbar-visibility',
        target: 'carousel-scrollbar',
        kind: 'state',
        phases: ['change'],
        completion: 'non-blocking',
      },
    ],
    parts: [
      {
        name: 'carousel',
        publicName: 'Root',
        presentationKeys: [
          'carousel',
          'carousel-orientation-horizontal',
          'carousel-orientation-vertical',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'carousel-viewport',
        publicName: 'Viewport',
        presentationKeys: [
          'carousel-viewport',
          'carousel-viewport-orientation-horizontal',
          'carousel-viewport-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'carousel-track',
        publicName: 'Track',
        presentationKeys: [
          'carousel-track',
          'carousel-track-orientation-horizontal',
          'carousel-track-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'carousel-item',
        publicName: 'Item',
        presentationKeys: [
          'carousel-item',
          'carousel-item-orientation-horizontal',
          'carousel-item-orientation-vertical',
        ],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'carousel-previous',
        publicName: 'Previous',
        presentationKeys: [
          'carousel-previous',
          'carousel-previous-orientation-horizontal',
          'carousel-previous-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'carousel-next',
        publicName: 'Next',
        presentationKeys: [
          'carousel-next',
          'carousel-next-orientation-horizontal',
          'carousel-next-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'carousel-indicator',
        publicName: 'Indicator',
        presentationKeys: [
          'carousel-indicator',
          'carousel-indicator-orientation-horizontal',
          'carousel-indicator-orientation-vertical',
          'carousel-indicator-type-bullets',
          'carousel-indicator-type-fraction',
          'carousel-indicator-type-progress',
          'carousel-indicator-type-custom',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'carousel-controls',
        publicName: 'Controls',
        presentationKeys: [
          'carousel-controls',
          'carousel-controls-placement-footer',
          'carousel-controls-placement-inside',
          'carousel-controls-placement-outside',
        ],
        cardinality: 'zero or one owned part',
      },
      {
        name: 'carousel-status',
        publicName: 'Status',
        presentationKeys: ['carousel-status'],
        cardinality: 'zero or one owned part',
      },
      {
        name: 'carousel-scrollbar',
        publicName: 'Scrollbar',
        presentationKeys: [
          'carousel-scrollbar',
          'carousel-scrollbar-orientation-horizontal',
          'carousel-scrollbar-orientation-vertical',
        ],
        cardinality: 'zero or one owned part',
      },
      {
        name: 'carousel-thumb',
        publicName: 'Thumb',
        presentationKeys: [
          'carousel-thumb',
          'carousel-thumb-orientation-horizontal',
          'carousel-thumb-orientation-vertical',
        ],
        cardinality: 'zero or one owned part',
      },
      {
        name: 'carousel-autoplay-control',
        publicName: 'Autoplay control',
        presentationKeys: ['carousel-autoplay-control'],
        cardinality: 'zero or one owned part',
      },
      {
        name: 'carousel-announcements',
        publicName: 'Announcements',
        presentationKeys: ['carousel-announcements'],
        cardinality: 'zero or one owned part',
      },
    ],
  },
  {
    name: 'Data visualization',
    tagName: 'tp-data-visualization',
    kind: 'presentational-primitive',
    sourceNode: 'ucl21-data-visualization',
    axes: [],
    parts: [
      {
        name: 'data-visualization',
        publicName: 'Root',
        presentationKeys: ['data-visualization'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'data-visualization-plot-region',
        publicName: 'Plot region',
        presentationKeys: ['data-visualization-plot-region'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'data-visualization-series',
        publicName: 'Series',
        presentationKeys: ['data-visualization-series'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'data-visualization-legend',
        publicName: 'Legend',
        presentationKeys: ['data-visualization-legend'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'data-visualization-inspection-surface',
        publicName: 'Inspection surface',
        presentationKeys: ['data-visualization-inspection-surface'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'data-visualization-style-scope',
        publicName: 'Style scope',
        presentationKeys: ['data-visualization-style-scope'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Message scroller',
    tagName: 'tp-message-scroller',
    kind: 'compound-reexport',
    sourceNode: 'ucl21-message-scroller',
    nonVisualParts: ['Provider'],
    axes: [],
    parts: [
      {
        name: 'message-scroller',
        publicName: 'Root',
        presentationKeys: ['message-scroller'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'message-scroller-viewport',
        publicName: 'Viewport',
        presentationKeys: ['message-scroller-viewport'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'message-scroller-content',
        publicName: 'Content',
        presentationKeys: ['message-scroller-content'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'message-scroller-item',
        publicName: 'Item',
        presentationKeys: ['message-scroller-item'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'message-scroller-return-control',
        publicName: 'Return control',
        presentationKeys: ['message-scroller-return-control'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Progress',
    tagName: 'tp-progress',
    kind: 'compound-reexport',
    sourceNode: 'ucl21-progress',
    axes: [],
    parts: [
      {
        name: 'progress',
        publicName: 'Root',
        presentationKeys: ['progress'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'progress-label',
        publicName: 'Label',
        presentationKeys: ['progress-label'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'progress-value-output',
        publicName: 'Value output',
        presentationKeys: ['progress-value-output'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'progress-track',
        publicName: 'Track',
        presentationKeys: ['progress-track'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'progress-indicator',
        publicName: 'Indicator',
        presentationKeys: ['progress-indicator'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Resizable panel group',
    tagName: 'tp-resizable-panel-group',
    kind: 'compound-reexport',
    sourceNode: 'ucl21-resizable-panels',
    axes: [
      {
        name: 'orientation',
        values: ['horizontal', 'vertical'],
        default: 'horizontal',
      },
    ],
    parts: [
      {
        name: 'resizable-panel-group',
        publicName: 'Group',
        presentationKeys: [
          'resizable-panel-group',
          'resizable-panel-group-orientation-horizontal',
          'resizable-panel-group-orientation-vertical',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'resizable-panel-group-panel',
        publicName: 'Panel',
        presentationKeys: [
          'resizable-panel-group-panel',
          'resizable-panel-group-panel-orientation-horizontal',
          'resizable-panel-group-panel-orientation-vertical',
        ],
        cardinality: 'zero or more descendants of Group; cited behavior sets any stronger minimum',
      },
      {
        name: 'resizable-panel-group-separator',
        publicName: 'Separator',
        presentationKeys: [
          'resizable-panel-group-separator',
          'resizable-panel-group-separator-orientation-horizontal',
          'resizable-panel-group-separator-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'resizable-panel-group-handle-decoration',
        publicName: 'Handle decoration',
        presentationKeys: [
          'resizable-panel-group-handle-decoration',
          'resizable-panel-group-handle-decoration-orientation-horizontal',
          'resizable-panel-group-handle-decoration-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Scroll area',
    tagName: 'tp-scroll-area',
    kind: 'compound-reexport',
    sourceNode: 'ucl21-scroll-area',
    axes: [
      {
        name: 'orientation',
        values: ['vertical', 'horizontal'],
        default: 'vertical',
      },
    ],
    parts: [
      {
        name: 'scroll-area',
        publicName: 'Root',
        presentationKeys: [
          'scroll-area',
          'scroll-area-orientation-vertical',
          'scroll-area-orientation-horizontal',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'scroll-area-viewport',
        publicName: 'Viewport',
        presentationKeys: [
          'scroll-area-viewport',
          'scroll-area-viewport-orientation-vertical',
          'scroll-area-viewport-orientation-horizontal',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'scroll-area-content',
        publicName: 'Content',
        presentationKeys: [
          'scroll-area-content',
          'scroll-area-content-orientation-vertical',
          'scroll-area-content-orientation-horizontal',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'scroll-area-scrollbar',
        publicName: 'Scrollbar',
        presentationKeys: [
          'scroll-area-scrollbar',
          'scroll-area-scrollbar-orientation-vertical',
          'scroll-area-scrollbar-orientation-horizontal',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'scroll-area-thumb',
        publicName: 'Thumb',
        presentationKeys: [
          'scroll-area-thumb',
          'scroll-area-thumb-orientation-vertical',
          'scroll-area-thumb-orientation-horizontal',
        ],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'scroll-area-corner',
        publicName: 'Corner',
        presentationKeys: [
          'scroll-area-corner',
          'scroll-area-corner-orientation-vertical',
          'scroll-area-corner-orientation-horizontal',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Separator',
    tagName: 'tp-separator',
    kind: 'thin-wrapper',
    sourceNode: 'ucl21-separator',
    axes: [
      {
        name: 'orientation',
        values: ['horizontal', 'vertical'],
        default: 'horizontal',
      },
    ],
    parts: [
      {
        name: 'separator',
        publicName: 'Rule',
        presentationKeys: [
          'separator',
          'separator-orientation-horizontal',
          'separator-orientation-vertical',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
    ],
  },
  {
    name: 'Spinner',
    tagName: 'tp-spinner',
    kind: 'presentational-primitive',
    sourceNode: 'ucl21-spinner',
    axes: [
      {
        name: 'size',
        values: ['default', 'sm', 'lg'],
        default: 'default',
      },
    ],
    parts: [
      {
        name: 'spinner',
        publicName: 'Indicator',
        presentationKeys: ['spinner', 'spinner-size-default', 'spinner-size-sm', 'spinner-size-lg'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'spinner-accessible-label',
        publicName: 'Accessible label',
        presentationKeys: [
          'spinner-accessible-label',
          'spinner-accessible-label-size-default',
          'spinner-accessible-label-size-sm',
          'spinner-accessible-label-size-lg',
        ],
        cardinality:
          'zero or one descendant of Indicator; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Toast',
    tagName: 'tp-toast',
    kind: 'compound-reexport',
    sourceNode: 'ucl21-toast',
    axes: [],
    nonVisualParts: ['Manager', 'Provider'],
    parts: [
      {
        name: 'toast',
        publicName: 'Portal',
        presentationKeys: ['toast'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'toast-viewport',
        publicName: 'Viewport',
        presentationKeys: ['toast-viewport'],
        cardinality:
          'zero or one descendant of Portal; cited behavior sets any required-presence condition',
      },
      {
        name: 'toast-toast',
        publicName: 'Toast',
        presentationKeys: ['toast-toast'],
        cardinality: 'zero or more descendants of Portal; cited behavior sets any stronger minimum',
      },
      {
        name: 'toast-content',
        publicName: 'Content',
        presentationKeys: ['toast-content'],
        cardinality:
          'zero or one descendant of Portal; cited behavior sets any required-presence condition',
      },
      {
        name: 'toast-title',
        publicName: 'Title',
        presentationKeys: ['toast-title'],
        cardinality:
          'zero or one descendant of Portal; cited behavior sets any required-presence condition',
      },
      {
        name: 'toast-description',
        publicName: 'Description',
        presentationKeys: ['toast-description'],
        cardinality:
          'zero or one descendant of Portal; cited behavior sets any required-presence condition',
      },
      {
        name: 'toast-action',
        publicName: 'Action',
        presentationKeys: ['toast-action'],
        cardinality: 'zero or more descendants of Portal; cited behavior sets any stronger minimum',
      },
      {
        name: 'toast-close',
        publicName: 'Close',
        presentationKeys: ['toast-close'],
        cardinality:
          'zero or one descendant of Portal; cited behavior sets any required-presence condition',
      },
      {
        name: 'toast-icon',
        publicName: 'Icon',
        presentationKeys: ['toast-icon'],
        cardinality:
          'zero or one descendant of Portal; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Alert',
    tagName: 'tp-alert',
    kind: 'presentational-primitive',
    sourceNode: 'ucl22-alert',
    axes: [],
    parts: [
      {
        name: 'alert',
        publicName: 'Root',
        presentationKeys: ['alert'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'alert-title',
        publicName: 'Title',
        presentationKeys: ['alert-title'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'alert-description',
        publicName: 'Description',
        presentationKeys: ['alert-description'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'alert-action',
        publicName: 'Action',
        presentationKeys: ['alert-action'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'alert-mark',
        publicName: 'Mark',
        presentationKeys: ['alert-mark'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Aspect-ratio box',
    tagName: 'tp-aspect-ratio',
    kind: 'presentational-primitive',
    sourceNode: 'ucl22-aspect-ratio',
    axes: [],
    parts: [
      {
        name: 'aspect-ratio-box',
        publicName: 'Root',
        presentationKeys: ['aspect-ratio-box'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'aspect-ratio-box-content',
        publicName: 'Content',
        presentationKeys: ['aspect-ratio-box-content'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Attachment',
    tagName: 'tp-attachment',
    kind: 'preset-composition',
    sourceNode: 'ucl22-attachment',
    axes: [
      {
        name: 'size',
        values: ['xs', 'sm', 'default'],
        default: 'default',
      },
      {
        name: 'orientation',
        values: ['horizontal', 'vertical'],
        default: 'horizontal',
      },
    ],
    parts: [
      {
        name: 'attachment',
        publicName: 'Group',
        presentationKeys: [
          'attachment',
          'attachment-size-xs',
          'attachment-size-sm',
          'attachment-size-default',
          'attachment-orientation-horizontal',
          'attachment-orientation-vertical',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'attachment-root',
        publicName: 'Root',
        presentationKeys: [
          'attachment-root',
          'attachment-root-size-xs',
          'attachment-root-size-sm',
          'attachment-root-size-default',
          'attachment-root-orientation-horizontal',
          'attachment-root-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'attachment-media',
        publicName: 'Media',
        presentationKeys: [
          'attachment-media',
          'attachment-media-size-xs',
          'attachment-media-size-sm',
          'attachment-media-size-default',
          'attachment-media-orientation-horizontal',
          'attachment-media-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'attachment-content',
        publicName: 'Content',
        presentationKeys: [
          'attachment-content',
          'attachment-content-size-xs',
          'attachment-content-size-sm',
          'attachment-content-size-default',
          'attachment-content-orientation-horizontal',
          'attachment-content-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'attachment-title',
        publicName: 'Title',
        presentationKeys: [
          'attachment-title',
          'attachment-title-size-xs',
          'attachment-title-size-sm',
          'attachment-title-size-default',
          'attachment-title-orientation-horizontal',
          'attachment-title-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'attachment-description',
        publicName: 'Description',
        presentationKeys: [
          'attachment-description',
          'attachment-description-size-xs',
          'attachment-description-size-sm',
          'attachment-description-size-default',
          'attachment-description-orientation-horizontal',
          'attachment-description-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'attachment-actions',
        publicName: 'Actions',
        presentationKeys: [
          'attachment-actions',
          'attachment-actions-size-xs',
          'attachment-actions-size-sm',
          'attachment-actions-size-default',
          'attachment-actions-orientation-horizontal',
          'attachment-actions-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'attachment-action',
        publicName: 'Action',
        presentationKeys: [
          'attachment-action',
          'attachment-action-size-xs',
          'attachment-action-size-sm',
          'attachment-action-size-default',
          'attachment-action-orientation-horizontal',
          'attachment-action-orientation-vertical',
        ],
        cardinality: 'zero or more descendants of Group; cited behavior sets any stronger minimum',
      },
      {
        name: 'attachment-trigger',
        publicName: 'Trigger',
        presentationKeys: [
          'attachment-trigger',
          'attachment-trigger-size-xs',
          'attachment-trigger-size-sm',
          'attachment-trigger-size-default',
          'attachment-trigger-orientation-horizontal',
          'attachment-trigger-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Badge',
    tagName: 'tp-badge',
    kind: 'thin-wrapper',
    sourceNode: 'ucl22-badge',
    axes: [
      {
        name: 'variant',
        values: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
        default: 'default',
      },
    ],
    parts: [
      {
        name: 'badge',
        publicName: 'Root',
        presentationKeys: [
          'badge',
          'badge-variant-default',
          'badge-variant-secondary',
          'badge-variant-destructive',
          'badge-variant-outline',
          'badge-variant-ghost',
          'badge-variant-link',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
    ],
  },
  {
    name: 'Bubble',
    tagName: 'tp-bubble',
    kind: 'presentational-primitive',
    sourceNode: 'ucl22-bubble',
    axes: [
      {
        name: 'variant',
        values: ['default', 'secondary', 'subdued', 'tinted', 'outline', 'ghost', 'destructive'],
        default: 'secondary',
      },
      {
        name: 'align',
        values: ['start', 'end'],
        default: 'start',
      },
      {
        name: 'reactionsAlign',
        values: ['start', 'end'],
        default: 'end',
      },
    ],
    parts: [
      {
        name: 'bubble',
        publicName: 'Group',
        presentationKeys: [
          'bubble',
          'bubble-variant-default',
          'bubble-variant-secondary',
          'bubble-variant-subdued',
          'bubble-variant-tinted',
          'bubble-variant-outline',
          'bubble-variant-ghost',
          'bubble-variant-destructive',
          'bubble-align-start',
          'bubble-align-end',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'bubble-root',
        publicName: 'Root',
        presentationKeys: [
          'bubble-root',
          'bubble-root-variant-default',
          'bubble-root-variant-secondary',
          'bubble-root-variant-subdued',
          'bubble-root-variant-tinted',
          'bubble-root-variant-outline',
          'bubble-root-variant-ghost',
          'bubble-root-variant-destructive',
          'bubble-root-align-start',
          'bubble-root-align-end',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'bubble-content',
        publicName: 'Content',
        presentationKeys: [
          'bubble-content',
          'bubble-content-variant-default',
          'bubble-content-variant-secondary',
          'bubble-content-variant-subdued',
          'bubble-content-variant-tinted',
          'bubble-content-variant-outline',
          'bubble-content-variant-ghost',
          'bubble-content-variant-destructive',
          'bubble-content-align-start',
          'bubble-content-align-end',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'bubble-reactions',
        publicName: 'Reactions',
        presentationKeys: [
          'bubble-reactions',
          'bubble-reactions-variant-default',
          'bubble-reactions-variant-secondary',
          'bubble-reactions-variant-subdued',
          'bubble-reactions-variant-tinted',
          'bubble-reactions-variant-outline',
          'bubble-reactions-variant-ghost',
          'bubble-reactions-variant-destructive',
          'bubble-reactions-align-start',
          'bubble-reactions-align-end',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Button group',
    tagName: 'tp-button-group',
    kind: 'preset-composition',
    sourceNode: 'ucl22-button-group',
    axes: [
      {
        name: 'orientation',
        values: ['horizontal', 'vertical'],
        default: 'horizontal',
      },
    ],
    parts: [
      {
        name: 'button-group',
        publicName: 'Root',
        presentationKeys: [
          'button-group',
          'button-group-orientation-horizontal',
          'button-group-orientation-vertical',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'button-group-control',
        publicName: 'Control',
        presentationKeys: [
          'button-group-control',
          'button-group-control-orientation-horizontal',
          'button-group-control-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'button-group-text-segment',
        publicName: 'Text segment',
        presentationKeys: [
          'button-group-text-segment',
          'button-group-text-segment-orientation-horizontal',
          'button-group-text-segment-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'button-group-separator',
        publicName: 'Separator',
        presentationKeys: [
          'button-group-separator',
          'button-group-separator-orientation-horizontal',
          'button-group-separator-orientation-vertical',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Card',
    tagName: 'tp-card',
    kind: 'presentational-primitive',
    sourceNode: 'ucl22-card',
    axes: [
      {
        name: 'size',
        values: ['sm', 'default'],
        default: 'default',
      },
    ],
    parts: [
      {
        name: 'card',
        publicName: 'Root',
        presentationKeys: ['card', 'card-size-sm', 'card-size-default'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'card-header',
        publicName: 'Header',
        presentationKeys: ['card-header', 'card-header-size-sm', 'card-header-size-default'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'card-title',
        publicName: 'Title',
        presentationKeys: ['card-title', 'card-title-size-sm', 'card-title-size-default'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'card-description',
        publicName: 'Description',
        presentationKeys: [
          'card-description',
          'card-description-size-sm',
          'card-description-size-default',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'card-action',
        publicName: 'Action',
        presentationKeys: ['card-action', 'card-action-size-sm', 'card-action-size-default'],
        cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
      },
      {
        name: 'card-content',
        publicName: 'Content',
        presentationKeys: ['card-content', 'card-content-size-sm', 'card-content-size-default'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'card-footer',
        publicName: 'Footer',
        presentationKeys: ['card-footer', 'card-footer-size-sm', 'card-footer-size-default'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Empty state',
    tagName: 'tp-empty-state',
    kind: 'presentational-primitive',
    sourceNode: 'ucl22-empty-state',
    axes: [],
    parts: [
      {
        name: 'empty-state',
        publicName: 'Root',
        presentationKeys: ['empty-state'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'empty-state-header',
        publicName: 'Header',
        presentationKeys: ['empty-state-header'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'empty-state-media',
        publicName: 'Media',
        presentationKeys: ['empty-state-media'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'empty-state-title',
        publicName: 'Title',
        presentationKeys: ['empty-state-title'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'empty-state-description',
        publicName: 'Description',
        presentationKeys: ['empty-state-description'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'empty-state-content',
        publicName: 'Content',
        presentationKeys: ['empty-state-content'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Icon',
    tagName: 'tp-icon',
    kind: 'presentational-primitive',
    sourceNode: 'ucl22-icon',
    axes: [],
    parts: [
      {
        name: 'icon',
        publicName: 'Root',
        presentationKeys: ['icon', 'icon-decorative', 'icon-named'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'icon-graphic',
        publicName: 'Graphic',
        presentationKeys: ['icon-graphic'],
        cardinality: 'zero or one descendant of Root; present when Icon resolves',
      },
    ],
  },
  {
    name: 'List item',
    tagName: 'tp-list-item',
    kind: 'preset-composition',
    sourceNode: 'ucl22-list-item',
    axes: [
      {
        name: 'variant',
        values: ['ghost', 'outline', 'subdued'],
        default: 'ghost',
      },
      {
        name: 'size',
        values: ['xs', 'sm', 'default'],
        default: 'default',
      },
    ],
    parts: [
      {
        name: 'list-item',
        publicName: 'Group',
        presentationKeys: [
          'list-item',
          'list-item-variant-ghost',
          'list-item-variant-outline',
          'list-item-variant-subdued',
          'list-item-size-xs',
          'list-item-size-sm',
          'list-item-size-default',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'list-item-root',
        publicName: 'Root',
        presentationKeys: [
          'list-item-root',
          'list-item-root-variant-ghost',
          'list-item-root-variant-outline',
          'list-item-root-variant-subdued',
          'list-item-root-size-xs',
          'list-item-root-size-sm',
          'list-item-root-size-default',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'list-item-media',
        publicName: 'Media',
        presentationKeys: [
          'list-item-media',
          'list-item-media-variant-ghost',
          'list-item-media-variant-outline',
          'list-item-media-variant-subdued',
          'list-item-media-size-xs',
          'list-item-media-size-sm',
          'list-item-media-size-default',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'list-item-content',
        publicName: 'Content',
        presentationKeys: [
          'list-item-content',
          'list-item-content-variant-ghost',
          'list-item-content-variant-outline',
          'list-item-content-variant-subdued',
          'list-item-content-size-xs',
          'list-item-content-size-sm',
          'list-item-content-size-default',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'list-item-title',
        publicName: 'Title',
        presentationKeys: [
          'list-item-title',
          'list-item-title-variant-ghost',
          'list-item-title-variant-outline',
          'list-item-title-variant-subdued',
          'list-item-title-size-xs',
          'list-item-title-size-sm',
          'list-item-title-size-default',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'list-item-description',
        publicName: 'Description',
        presentationKeys: [
          'list-item-description',
          'list-item-description-variant-ghost',
          'list-item-description-variant-outline',
          'list-item-description-variant-subdued',
          'list-item-description-size-xs',
          'list-item-description-size-sm',
          'list-item-description-size-default',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'list-item-actions',
        publicName: 'Actions',
        presentationKeys: [
          'list-item-actions',
          'list-item-actions-variant-ghost',
          'list-item-actions-variant-outline',
          'list-item-actions-variant-subdued',
          'list-item-actions-size-xs',
          'list-item-actions-size-sm',
          'list-item-actions-size-default',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'list-item-header',
        publicName: 'Header',
        presentationKeys: [
          'list-item-header',
          'list-item-header-variant-ghost',
          'list-item-header-variant-outline',
          'list-item-header-variant-subdued',
          'list-item-header-size-xs',
          'list-item-header-size-sm',
          'list-item-header-size-default',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'list-item-footer',
        publicName: 'Footer',
        presentationKeys: [
          'list-item-footer',
          'list-item-footer-variant-ghost',
          'list-item-footer-variant-outline',
          'list-item-footer-variant-subdued',
          'list-item-footer-size-xs',
          'list-item-footer-size-sm',
          'list-item-footer-size-default',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'list-item-separator',
        publicName: 'Separator',
        presentationKeys: [
          'list-item-separator',
          'list-item-separator-variant-ghost',
          'list-item-separator-variant-outline',
          'list-item-separator-variant-subdued',
          'list-item-separator-size-xs',
          'list-item-separator-size-sm',
          'list-item-separator-size-default',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Key hint',
    tagName: 'tp-key-hint',
    kind: 'presentational-primitive',
    sourceNode: 'ucl22-key-hint',
    axes: [],
    parts: [
      {
        name: 'key-hint',
        publicName: 'Key',
        presentationKeys: ['key-hint'],
        cardinality:
          'exactly one public owner host per Key instance; standalone or an ordered child of Group',
      },
      {
        name: 'key-hint-group',
        publicName: 'Group',
        presentationKeys: ['key-hint-group'],
        cardinality:
          'optional parent group host containing an ordered sequence of Key instances; groups may be nested to describe sequences',
      },
    ],
  },
  {
    name: 'Label',
    tagName: 'tp-label',
    kind: 'preset-composition',
    sourceNode: 'ucl22-label',
    axes: [],
    parts: [
      {
        name: 'label',
        publicName: 'Root',
        presentationKeys: ['label'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'label-optional-indicator',
        publicName: 'Optional indicator',
        presentationKeys: ['label-optional-indicator'],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Marker',
    tagName: 'tp-marker',
    kind: 'presentational-primitive',
    sourceNode: 'ucl22-marker',
    axes: [
      {
        name: 'variant',
        values: ['default', 'separator', 'border'],
        default: 'default',
      },
    ],
    parts: [
      {
        name: 'marker',
        publicName: 'Root',
        presentationKeys: [
          'marker',
          'marker-variant-default',
          'marker-variant-separator',
          'marker-variant-border',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'marker-icon',
        publicName: 'Icon',
        presentationKeys: [
          'marker-icon',
          'marker-icon-variant-default',
          'marker-icon-variant-separator',
          'marker-icon-variant-border',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
      {
        name: 'marker-content',
        publicName: 'Content',
        presentationKeys: [
          'marker-content',
          'marker-content-variant-default',
          'marker-content-variant-separator',
          'marker-content-variant-border',
        ],
        cardinality:
          'zero or one descendant of Root; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Message',
    tagName: 'tp-message',
    kind: 'presentational-primitive',
    sourceNode: 'ucl22-message',
    axes: [
      {
        name: 'align',
        values: ['start', 'end'],
        default: 'start',
      },
    ],
    parts: [
      {
        name: 'message',
        publicName: 'Group',
        presentationKeys: ['message', 'message-align-start', 'message-align-end'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'message-root',
        publicName: 'Root',
        presentationKeys: ['message-root', 'message-root-align-start', 'message-root-align-end'],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'message-avatar',
        publicName: 'Avatar',
        presentationKeys: [
          'message-avatar',
          'message-avatar-align-start',
          'message-avatar-align-end',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'message-content',
        publicName: 'Content',
        presentationKeys: [
          'message-content',
          'message-content-align-start',
          'message-content-align-end',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'message-header',
        publicName: 'Header',
        presentationKeys: [
          'message-header',
          'message-header-align-start',
          'message-header-align-end',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
      {
        name: 'message-footer',
        publicName: 'Footer',
        presentationKeys: [
          'message-footer',
          'message-footer-align-start',
          'message-footer-align-end',
        ],
        cardinality:
          'zero or one descendant of Group; cited behavior sets any required-presence condition',
      },
    ],
  },
  {
    name: 'Skeleton',
    tagName: 'tp-skeleton',
    kind: 'thin-wrapper',
    sourceNode: 'ucl22-skeleton',
    axes: [],
    parts: [
      {
        name: 'skeleton',
        publicName: 'Placeholder',
        presentationKeys: ['skeleton'],
        cardinality: 'exactly one public owner host per control instance',
      },
    ],
  },
  {
    name: 'Table',
    tagName: 'tp-table',
    kind: 'presentational-primitive',
    sourceNode: 'ucl22-table',
    axes: [],
    parts: [
      {
        name: 'table',
        publicName: 'Container',
        presentationKeys: ['table'],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'table-table',
        publicName: 'Table',
        presentationKeys: ['table-table'],
        cardinality:
          'zero or one descendant of Container; cited behavior sets any required-presence condition',
      },
      {
        name: 'table-caption',
        publicName: 'Caption',
        presentationKeys: ['table-caption'],
        cardinality:
          'zero or one descendant of Container; cited behavior sets any required-presence condition',
      },
      {
        name: 'table-header',
        publicName: 'Header',
        presentationKeys: ['table-header'],
        cardinality:
          'zero or one descendant of Container; cited behavior sets any required-presence condition',
      },
      {
        name: 'table-body',
        publicName: 'Body',
        presentationKeys: ['table-body'],
        cardinality:
          'zero or one descendant of Container; cited behavior sets any required-presence condition',
      },
      {
        name: 'table-footer',
        publicName: 'Footer',
        presentationKeys: ['table-footer'],
        cardinality:
          'zero or one descendant of Container; cited behavior sets any required-presence condition',
      },
      {
        name: 'table-row',
        publicName: 'Row',
        presentationKeys: ['table-row'],
        cardinality:
          'zero or more descendants of Container; cited behavior sets any stronger minimum',
      },
      {
        name: 'table-column-header',
        publicName: 'Column header',
        presentationKeys: ['table-column-header'],
        cardinality:
          'zero or one descendant of Container; cited behavior sets any required-presence condition',
      },
      {
        name: 'table-cell',
        publicName: 'Cell',
        presentationKeys: ['table-cell'],
        cardinality:
          'zero or more descendants of Container; cited behavior sets any stronger minimum',
      },
    ],
  },
  {
    name: 'Navigation panel',
    tagName: 'tp-navigation-panel',
    kind: 'compound-reexport',
    sourceNode: 'ucl23-navigation-panel',
    nonVisualParts: ['Provider'],
    axes: [
      {
        name: 'variant',
        values: ['integrated', 'floating', 'inset'],
        default: 'integrated',
      },
    ],
    parts: [
      {
        name: 'navigation-panel',
        publicName: 'Panel',
        presentationKeys: [
          'navigation-panel',
          'navigation-panel-variant-integrated',
          'navigation-panel-variant-floating',
          'navigation-panel-variant-inset',
        ],
        cardinality: 'exactly one public owner host per control instance',
      },
      {
        name: 'navigation-panel-trigger',
        publicName: 'Trigger',
        presentationKeys: [
          'navigation-panel-trigger',
          'navigation-panel-trigger-variant-integrated',
          'navigation-panel-trigger-variant-floating',
          'navigation-panel-trigger-variant-inset',
        ],
        cardinality:
          'zero or one descendant of Panel; cited behavior sets any required-presence condition',
      },
      {
        name: 'navigation-panel-resize-rail',
        publicName: 'Resize rail',
        presentationKeys: [
          'navigation-panel-resize-rail',
          'navigation-panel-resize-rail-variant-integrated',
          'navigation-panel-resize-rail-variant-floating',
          'navigation-panel-resize-rail-variant-inset',
        ],
        cardinality:
          'zero or one descendant of Panel; cited behavior sets any required-presence condition',
      },
      {
        name: 'navigation-panel-inset',
        publicName: 'Inset',
        presentationKeys: [
          'navigation-panel-inset',
          'navigation-panel-inset-variant-integrated',
          'navigation-panel-inset-variant-floating',
          'navigation-panel-inset-variant-inset',
        ],
        cardinality:
          'zero or one descendant of Panel; cited behavior sets any required-presence condition',
      },
      {
        name: 'navigation-panel-header',
        publicName: 'Header',
        presentationKeys: [
          'navigation-panel-header',
          'navigation-panel-header-variant-integrated',
          'navigation-panel-header-variant-floating',
          'navigation-panel-header-variant-inset',
        ],
        cardinality:
          'zero or one descendant of Panel; cited behavior sets any required-presence condition',
      },
      {
        name: 'navigation-panel-content',
        publicName: 'Content',
        presentationKeys: [
          'navigation-panel-content',
          'navigation-panel-content-variant-integrated',
          'navigation-panel-content-variant-floating',
          'navigation-panel-content-variant-inset',
        ],
        cardinality:
          'zero or one descendant of Panel; cited behavior sets any required-presence condition',
      },
      {
        name: 'navigation-panel-footer',
        publicName: 'Footer',
        presentationKeys: [
          'navigation-panel-footer',
          'navigation-panel-footer-variant-integrated',
          'navigation-panel-footer-variant-floating',
          'navigation-panel-footer-variant-inset',
        ],
        cardinality:
          'zero or one descendant of Panel; cited behavior sets any required-presence condition',
      },
      {
        name: 'navigation-panel-group',
        publicName: 'Group',
        presentationKeys: [
          'navigation-panel-group',
          'navigation-panel-group-variant-integrated',
          'navigation-panel-group-variant-floating',
          'navigation-panel-group-variant-inset',
        ],
        cardinality: 'zero or more descendants of Panel; cited behavior sets any stronger minimum',
      },
      {
        name: 'navigation-panel-group-label',
        publicName: 'GroupLabel',
        presentationKeys: [
          'navigation-panel-group-label',
          'navigation-panel-group-label-variant-integrated',
          'navigation-panel-group-label-variant-floating',
          'navigation-panel-group-label-variant-inset',
        ],
        cardinality:
          'zero or one descendant of Panel; cited behavior sets any required-presence condition',
      },
      {
        name: 'navigation-panel-group-action',
        publicName: 'GroupAction',
        presentationKeys: [
          'navigation-panel-group-action',
          'navigation-panel-group-action-variant-integrated',
          'navigation-panel-group-action-variant-floating',
          'navigation-panel-group-action-variant-inset',
        ],
        cardinality: 'zero or more descendants of Panel; cited behavior sets any stronger minimum',
      },
      {
        name: 'navigation-panel-group-content',
        publicName: 'GroupContent',
        presentationKeys: [
          'navigation-panel-group-content',
          'navigation-panel-group-content-variant-integrated',
          'navigation-panel-group-content-variant-floating',
          'navigation-panel-group-content-variant-inset',
        ],
        cardinality:
          'zero or one descendant of Panel; cited behavior sets any required-presence condition',
      },
      {
        name: 'navigation-panel-menu',
        publicName: 'Menu',
        presentationKeys: [
          'navigation-panel-menu',
          'navigation-panel-menu-variant-integrated',
          'navigation-panel-menu-variant-floating',
          'navigation-panel-menu-variant-inset',
        ],
        cardinality:
          'zero or one descendant of Panel; cited behavior sets any required-presence condition',
      },
      {
        name: 'navigation-panel-item',
        publicName: 'Item',
        presentationKeys: [
          'navigation-panel-item',
          'navigation-panel-item-variant-integrated',
          'navigation-panel-item-variant-floating',
          'navigation-panel-item-variant-inset',
        ],
        cardinality: 'zero or more descendants of Panel; cited behavior sets any stronger minimum',
      },
      {
        name: 'navigation-panel-link',
        publicName: 'Link',
        presentationKeys: [
          'navigation-panel-link',
          'navigation-panel-link-variant-integrated',
          'navigation-panel-link-variant-floating',
          'navigation-panel-link-variant-inset',
        ],
        cardinality: 'zero or more descendants of Panel; cited behavior sets any stronger minimum',
      },
      {
        name: 'navigation-panel-action',
        publicName: 'Action',
        presentationKeys: [
          'navigation-panel-action',
          'navigation-panel-action-variant-integrated',
          'navigation-panel-action-variant-floating',
          'navigation-panel-action-variant-inset',
        ],
        cardinality: 'zero or more descendants of Panel; cited behavior sets any stronger minimum',
      },
      {
        name: 'navigation-panel-badge',
        publicName: 'Badge',
        presentationKeys: [
          'navigation-panel-badge',
          'navigation-panel-badge-variant-integrated',
          'navigation-panel-badge-variant-floating',
          'navigation-panel-badge-variant-inset',
        ],
        cardinality:
          'zero or one descendant of Panel; cited behavior sets any required-presence condition',
      },
      {
        name: 'navigation-panel-loading-placeholder',
        publicName: 'LoadingPlaceholder',
        presentationKeys: [
          'navigation-panel-loading-placeholder',
          'navigation-panel-loading-placeholder-variant-integrated',
          'navigation-panel-loading-placeholder-variant-floating',
          'navigation-panel-loading-placeholder-variant-inset',
        ],
        cardinality:
          'zero or one descendant of Panel; cited behavior sets any required-presence condition',
      },
      {
        name: 'navigation-panel-submenu',
        publicName: 'Submenu',
        presentationKeys: [
          'navigation-panel-submenu',
          'navigation-panel-submenu-variant-integrated',
          'navigation-panel-submenu-variant-floating',
          'navigation-panel-submenu-variant-inset',
        ],
        cardinality: 'zero or more descendants of Panel; cited behavior sets any stronger minimum',
      },
      {
        name: 'navigation-panel-subitem',
        publicName: 'Subitem',
        presentationKeys: [
          'navigation-panel-subitem',
          'navigation-panel-subitem-variant-integrated',
          'navigation-panel-subitem-variant-floating',
          'navigation-panel-subitem-variant-inset',
        ],
        cardinality: 'zero or more descendants of Panel; cited behavior sets any stronger minimum',
      },
      {
        name: 'navigation-panel-sublink',
        publicName: 'Sublink',
        presentationKeys: [
          'navigation-panel-sublink',
          'navigation-panel-sublink-variant-integrated',
          'navigation-panel-sublink-variant-floating',
          'navigation-panel-sublink-variant-inset',
        ],
        cardinality: 'zero or more descendants of Panel; cited behavior sets any stronger minimum',
      },
      {
        name: 'navigation-panel-input',
        publicName: 'Input',
        presentationKeys: [
          'navigation-panel-input',
          'navigation-panel-input-variant-integrated',
          'navigation-panel-input-variant-floating',
          'navigation-panel-input-variant-inset',
        ],
        cardinality:
          'zero or one descendant of Panel; cited behavior sets any required-presence condition',
      },
      {
        name: 'navigation-panel-separator',
        publicName: 'Separator',
        presentationKeys: [
          'navigation-panel-separator',
          'navigation-panel-separator-variant-integrated',
          'navigation-panel-separator-variant-floating',
          'navigation-panel-separator-variant-inset',
        ],
        cardinality:
          'zero or one descendant of Panel; cited behavior sets any required-presence condition',
      },
    ],
  },
];
