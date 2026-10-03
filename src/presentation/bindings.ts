/** Component-owned associations between existing hosts and their published part slots. */
export const partBindings: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'tp-checkbox': {
    '.root': 'checkbox',
    '.indicator': 'checkbox-indicator',
  },
  'tp-button': {
    '.control': 'button',
    "[part~='button-leading-mark']": 'button-leading-mark',
    "[part~='button-trailing-mark']": 'button-trailing-mark',
  },
  'tp-tabs': {
    "[part='tabs']": 'tabs',
    "[part='tabs-list']": 'tabs-list',
  },
  'tp-alert': {
    '.alert': 'alert',
    '.title': 'alert-title',
  },
  'tp-attachment': {
    '.attachment': 'attachment-root',
    '.meta': 'attachment-content',
    '.name': 'attachment-title',
    '.size': 'attachment-description',
    '[part="remove focusable"]': 'attachment-action',
  },
  'tp-badge': {
    '.badge': 'badge',
  },
  'tp-bubble': {
    '.bubble': 'bubble-root',
  },
  'tp-button-group': {
    "[part~='button-group']": 'button-group',
  },
  'tp-card': {
    '.card > header': 'card-header',
    '.card > .content': 'card-content',
    '.card > footer': 'card-footer',
  },
  'tp-empty-state': {
    '.root': 'empty-state',
    '.description': 'empty-state-description',
  },
  'tp-key-hint': {
    kbd: 'key-hint',
  },
  'tp-label': {
    '.optional': 'label-optional-indicator',
  },
  'tp-list-item': {
    '.item': 'list-item-root',
    '.description': 'list-item-description',
  },
  'tp-message': {
    '.message': 'message-root',
    '.meta': 'message-header',
  },
  'tp-input': {
    input: 'input',
  },
  'tp-text-area': {
    textarea: 'text-area',
  },
  'tp-native-select': {
    '[part~="native-select"]': 'native-select',
    '[part~="native-select-control"]': 'native-select-control',
    '[part~="native-select-option-group"]': 'native-select-option-group',
    '[part~="native-select-option"]': 'native-select-option',
    '[part~="native-select-indicator"]': 'native-select-indicator',
  },
  'tp-slider': {
    '[part~="slider"]': 'slider',
    '[part~="slider-track"]': 'slider-track',
    '[part~="slider-range"]': 'slider-range',
    '[part~="slider-thumb"]': 'slider-thumb',
    '[part~="slider-label"]': 'slider-label',
    '[part~="slider-output"]': 'slider-output',
  },
  'tp-slider-thumb': {
    '[part~="slider-thumb"]': 'slider-thumb',
  },
  'tp-field': {
    "[part='field-legend']": 'field-legend',
    "[part='field-field-group']": 'field-field-group',
    "[part='field-field']": 'field-field',
    "[part='field-control-region']": 'field-control-region',
    "[part='field-title']": 'field-title',
    "[part='field-separator']": 'field-separator',
    "[part='field']": 'field',
    "[part='field-label']": 'field-label',
    "[part='field-description']": 'field-description',
    "[part='field-error']": 'field-error',
  },
  'tp-input-group': {
    "[part='input-group']": 'input-group',
    '.addon': 'input-group-addon',
  },
  'tp-calendar': {
    '.root': 'calendar',
    '.header': 'calendar-header',
    '.months': 'calendar-month-grid',
    '.day': 'calendar-day',
  },
  'tp-questionnaire': {
    form: 'questionnaire',
    fieldset: 'questionnaire-question',
    "[part='questionnaire-progress']": 'questionnaire-progress',
    "[part='questionnaire-title']": 'questionnaire-title',
    "[part='questionnaire-description']": 'questionnaire-description',
    "[part='questionnaire-choices']": 'questionnaire-choices',
    "[part='questionnaire-choice']": 'questionnaire-choice',
    "[part='questionnaire-error']": 'questionnaire-error',
    "[part='questionnaire-actions']": 'questionnaire-actions',
  },
  'tp-progress': {
    '[part~="progress"]': 'progress',
    '[part~="progress-label"]': 'progress-label',
    '[part~="progress-value-output"]': 'progress-value-output',
    '[part~="progress-track"]': 'progress-track',
    '[part~="progress-indicator"]': 'progress-indicator',
  },
  'tp-resizable-panel-group': {
    '.handle': 'resizable-panel-group-separator',
  },
  'tp-scroll-area': {
    '.viewport': 'scroll-area-viewport',
  },
  'tp-toast': {
    '.toast': 'toast-toast',
    '.content': 'toast-content',
    '[part="close focusable"]': 'toast-close',
  },
  'tp-breadcrumb': {
    '.list': 'breadcrumb-ordered-list',
  },
  'tp-pagination': {
    '.root': 'pagination',
    '[part="previous focusable"]': 'pagination-previous',
    '[part="next focusable"]': 'pagination-next',
    '[part="page focusable"]': 'pagination-page-link',
  },
  'tp-navigation-panel': {
    '.panel': 'navigation-panel',
  },
  'tp-combobox': {
    '.root': 'combobox',
    '.editor': 'combobox-input',
    '.listbox': 'combobox-content',
    '.option': 'combobox-option',
    '[part="empty"]': 'combobox-empty-state',
  },
  'tp-select': {
    '[part~="select"]': 'select',
    '[part~="select-trigger"]': 'select-trigger',
    '[part~="select-value"]': 'select-value',
    '[part~="select-content"]': 'select-content',
    '[part~="select-list"]': 'select-list',
    '[part~="select-group"]': 'select-group',
    '[part~="select-label"]': 'select-label',
    '[part~="select-option"]': 'select-option',
    '[part~="select-separator"]': 'select-separator',
    '[part~="select-scroll-up-button"]': 'select-scroll-up-button',
    '[part~="select-scroll-down-button"]': 'select-scroll-down-button',
  },
  'tp-command-palette': {
    '.root': 'command-palette',
    '.control': 'command-palette-input-wrapper',
    '.editor': 'command-palette-input',
    '.listbox': 'command-palette-list',
    '.option': 'command-palette-item',
    '[part="empty"]': 'command-palette-empty-state',
  },
  'tp-carousel': {
    '[part="previous focusable"]': 'carousel-previous',
    '[part="next focusable"]': 'carousel-next',
    '[part="root"]': 'carousel',
    '.viewport': 'carousel-viewport',
    '.track': 'carousel-track',
  },
  'tp-avatar': {
    ':host': 'avatar',
    img: 'avatar-image',
    "[part~='fallback']": 'avatar-fallback',
  },
  'tp-spinner': {
    ':host': 'spinner',
    '.visually-hidden': 'spinner-accessible-label',
  },
  'tp-separator': {
    ':host': 'separator',
  },
  'tp-marker': {
    ':host': 'marker',
  },
  'tp-skeleton': {
    "[part~='skeleton']": 'skeleton',
  },
  'tp-switch': {
    '.root': 'switch',
    '.thumb': 'switch-thumb',
  },
  'tp-otp-field': {
    '.root': 'one-time-code-field',
    "[part='group']": 'one-time-code-field-group',
    '.slot': 'one-time-code-field-slot',
  },
};
