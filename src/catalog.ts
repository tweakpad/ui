export interface CatalogEntry {
  name: string;
  tagName: string;
  kind:
    | 'compound-reexport'
    | 'flattening-compound'
    | 'preset-composition'
    | 'presentational-primitive'
    | 'thin-wrapper';
}

export const catalog = [
  ['Accordion', 'tp-accordion', 'compound-reexport'],
  ['Button', 'tp-button', 'compound-reexport'],
  ['Checkbox', 'tp-checkbox', 'compound-reexport'],
  ['Collapsible', 'tp-collapsible', 'compound-reexport'],
  ['Radio group', 'tp-radio-group', 'compound-reexport'],
  ['Switch', 'tp-switch', 'compound-reexport'],
  ['Tabs', 'tp-tabs', 'compound-reexport'],
  ['Toggle', 'tp-toggle', 'compound-reexport'],
  ['Toggle group', 'tp-toggle-group', 'compound-reexport'],
  ['Calendar', 'tp-calendar', 'compound-reexport'],
  ['Field', 'tp-field', 'compound-reexport'],
  ['Form', 'tp-form', 'compound-reexport'],
  ['Input', 'tp-input', 'compound-reexport'],
  ['Input group', 'tp-input-group', 'preset-composition'],
  ['Native select', 'tp-native-select', 'compound-reexport'],
  ['One-time code field', 'tp-otp-field', 'compound-reexport'],
  ['Questionnaire', 'tp-questionnaire', 'compound-reexport'],
  ['Slider', 'tp-slider', 'compound-reexport'],
  ['Text area', 'tp-text-area', 'compound-reexport'],
  ['Command palette', 'tp-command-palette', 'preset-composition'],
  ['Select', 'tp-select', 'flattening-compound'],
  ['Alert dialog', 'tp-alert-dialog', 'flattening-compound'],
  ['Dialog', 'tp-dialog', 'flattening-compound'],
  ['Drawer', 'tp-drawer', 'flattening-compound'],
  ['Popover', 'tp-popover', 'flattening-compound'],
  ['Preview card', 'tp-preview-card', 'flattening-compound'],
  ['Tooltip', 'tp-tooltip', 'flattening-compound'],
  ['Breadcrumb', 'tp-breadcrumb', 'flattening-compound'],
  ['Menu', 'tp-menu', 'flattening-compound'],
  ['Menubar', 'tp-menubar', 'flattening-compound'],
  ['Navigation menu', 'tp-navigation-menu', 'flattening-compound'],
  ['Pagination', 'tp-pagination', 'flattening-compound'],
  ['Avatar', 'tp-avatar', 'compound-reexport'],
  ['Carousel', 'tp-carousel', 'compound-reexport'],
  ['Data visualization', 'tp-data-visualization', 'presentational-primitive'],
  ['Message scroller', 'tp-message-scroller', 'compound-reexport'],
  ['Progress', 'tp-progress', 'compound-reexport'],
  ['Resizable panel group', 'tp-resizable-panel-group', 'compound-reexport'],
  ['Scroll area', 'tp-scroll-area', 'compound-reexport'],
  ['Separator', 'tp-separator', 'thin-wrapper'],
  ['Spinner', 'tp-spinner', 'presentational-primitive'],
  ['Toast', 'tp-toast', 'compound-reexport'],
  ['Alert', 'tp-alert', 'presentational-primitive'],
  ['Aspect-ratio box', 'tp-aspect-ratio', 'presentational-primitive'],
  ['Attachment', 'tp-attachment', 'preset-composition'],
  ['Badge', 'tp-badge', 'thin-wrapper'],
  ['Bubble', 'tp-bubble', 'presentational-primitive'],
  ['Button group', 'tp-button-group', 'preset-composition'],
  ['Card', 'tp-card', 'presentational-primitive'],
  ['Empty state', 'tp-empty-state', 'presentational-primitive'],
  ['Icon', 'tp-icon', 'presentational-primitive'],
  ['Key hint', 'tp-key-hint', 'presentational-primitive'],
  ['Label', 'tp-label', 'preset-composition'],
  ['List item', 'tp-list-item', 'preset-composition'],
  ['Drag Drop List', 'tp-drag-drop-list', 'preset-composition'],
  ['Marker', 'tp-marker', 'presentational-primitive'],
  ['Message', 'tp-message', 'presentational-primitive'],
  ['Skeleton', 'tp-skeleton', 'thin-wrapper'],
  ['Table', 'tp-table', 'presentational-primitive'],
  ['Time', 'tp-time', 'presentational-primitive'],
  ['Navigation panel', 'tp-navigation-panel', 'compound-reexport'],
] as const satisfies readonly (readonly [CatalogEntry['name'], string, CatalogEntry['kind']])[];

export const catalogEntries: readonly CatalogEntry[] = catalog.map(([name, tagName, kind]) => ({
  name,
  tagName,
  kind,
}));
