/** Media constituents share these keys (Library mp-l-presentation). */
const mediaButtonBindings: Readonly<Record<string, string>> = {
  ':host': 'media-button',
  "[part~='mark']": 'media-button-mark',
  "[part~='text']": 'media-button-text',
  'tp-button[data-media-text]': 'media-button-text-control',
};
const mediaLayoutBindings: Readonly<Record<string, string>> = {
  ':host': 'media-layout',
  "[part~='top']": 'media-layout-region',
  "[part~='center']": 'media-layout-region',
  "[part~='bottom-start']": 'media-layout-region',
  "[part~='bottom-end']": 'media-layout-region',
  "[part~='bar']": 'media-layout-region',
  "[part~='time']": 'media-layout-region',
  "[part~='secondary']": 'media-layout-region',
};
const mediaIndicatorBindings: Readonly<Record<string, string>> = {
  ':host': 'media-indicator',
  "[part~='content']": 'media-indicator-content',
  "[part~='value']": 'media-indicator-value',
  "[part~='fill']": 'media-indicator-fill',
};

/** Component-owned associations between existing hosts and their published part slots. */
export const partBindings: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'tp-drag-drop-list': {
    ':host': 'drag-drop-list-root',
    '.list': 'drag-drop-list-list',
    '.item': 'drag-drop-list-item',
    '.handle': 'drag-drop-list-handle',
    '.empty': 'drag-drop-list-empty',
  },
  'tp-form': {
    form: 'form',
    'form > [slot="actions"]': 'form-actions',
    'form > [slot="error-summary"]': 'form-error-summary',
  },
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
  'tp-key-hint-group': {
    kbd: 'key-hint-group',
  },
  'tp-time': {
    ':host': 'time',
    time: 'time-value',
  },
  'tp-label': {
    '.optional': 'label-optional-indicator',
  },
  'tp-list-item-separator': { '.separator': 'list-item-separator' },
  'tp-list-item-group': { '.group': 'list-item' },
  'tp-list-item': {
    '.item': 'list-item-root',
    '.description': 'list-item-description',
    '.media': 'list-item-media',
    '.content': 'list-item-content',
    '.title': 'list-item-title',
    '.actions': 'list-item-actions',
    '.header': 'list-item-header',
    '.footer': 'list-item-footer',
  },
  'tp-message': {
    '.message': 'message-root',
    '.meta': 'message-header',
    '.avatar': 'message-avatar',
    '.content': 'message-content',
    '.footer': 'message-footer',
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
    '[part~="slider-buffer"]': 'slider-buffer',
    '[part~="slider-chapter"]': 'slider-chapter',
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
    '[part~="calendar"]': 'calendar',
    '[part~="calendar-header"]': 'calendar-header',
    '[part~="calendar-months"]': 'calendar-months',
    '[part~="calendar-month"]': 'calendar-month',
    '[part~="calendar-caption"]': 'calendar-caption',
    '[part~="calendar-caption-label"]': 'calendar-caption-label',
    '[part~="calendar-dropdowns"]': 'calendar-dropdowns',
    '[part~="calendar-weekdays"]': 'calendar-weekdays',
    '[part~="calendar-weekday"]': 'calendar-weekday',
    '[part~="calendar-weeks"]': 'calendar-weeks',
    '[part~="calendar-week"]': 'calendar-week',
    '[part~="calendar-week-number"]': 'calendar-week-number',
    '[part~="calendar-footer"]': 'calendar-footer',
    '[part~="calendar-month-grid"]': 'calendar-month-grid',
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
  'tp-toast': {
    '.toast': 'toast-toast',
    '.content': 'toast-content',
    '[part="close focusable"]': 'toast-close',
  },
  'tp-navigation-panel': {
    '.panel': 'navigation-panel',
  },
  'tp-select': {
    '[part~="select-anchor"]': 'select-anchor',
    '[part~="select-input"]': 'select-input',
    '[part~="select-clear"]': 'select-clear',
    '[part~="select-chip-list"]': 'select-chip-list',
    '[part~="select-chip"]': 'select-chip',
    '[part~="select-chip-remove"]': 'select-chip-remove',
    '[part~="select-collection"]': 'select-collection',
    '[part~="select-empty-state"]': 'select-empty-state',
    '[part~="select-row"]': 'select-row',
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
    '[part~="command-palette"]': 'command-palette',
    '[part~="command-palette-input-wrapper"]': 'command-palette-input-wrapper',
    '[part~="command-palette-input"]': 'command-palette-input',
    '[part~="command-palette-list"]': 'command-palette-list',
    '[part~="command-palette-group"]': 'command-palette-group',
    '[part~="command-palette-item"]': 'command-palette-item',
    '[part~="command-palette-empty-state"]': 'command-palette-empty-state',
    '[part~="command-palette-separator"]': 'command-palette-separator',
    '[part~="command-palette-shortcut-hint"]': 'command-palette-shortcut-hint',
  },
  'tp-carousel': {
    '[part~="carousel"]': 'carousel',
    '[part~="carousel-viewport"]': 'carousel-viewport',
    '[part~="carousel-track"]': 'carousel-track',
    '[part~="carousel-item"]': 'carousel-item',
    '[part~="carousel-previous"]': 'carousel-previous',
    '[part~="carousel-next"]': 'carousel-next',
    '[part~="carousel-indicator"]': 'carousel-indicator',
    '[part~="carousel-controls"]': 'carousel-controls',
    '[part~="carousel-status"]': 'carousel-status',
    '[part~="carousel-scrollbar"]': 'carousel-scrollbar',
    '[part~="carousel-thumb"]': 'carousel-thumb',
    '[part~="carousel-autoplay-control"]': 'carousel-autoplay-control',
    '[part~="carousel-announcements"]': 'carousel-announcements',
  },
  'tp-media-player': {
    ':host': 'media-player',
  },
  'tp-media-container': {
    ':host': 'media-container',
  },
  'tp-media-poster': {
    ':host': 'media-poster',
    "[part~='image']": 'media-poster-image',
  },
  'tp-media-title': {
    ':host': 'media-title',
  },
  'tp-media-controls': {
    ':host': 'media-controls',
    "[part~='backdrop']": 'media-controls-backdrop',
  },
  'tp-media-controls-group': {
    ':host': 'media-controls-group',
  },
  // Non-visual bindings: no parts (and no fallback to the root's bindings).
  'tp-media-hotkey': {},
  'tp-media-gesture': {},
  // Media buttons: the composed Button keeps its own recipe; these keys adapt the media layer.
  'tp-media-play-button': mediaButtonBindings,
  'tp-media-mute-button': mediaButtonBindings,
  'tp-media-seek-button': mediaButtonBindings,
  'tp-media-fullscreen-button': mediaButtonBindings,
  'tp-media-pip-button': mediaButtonBindings,
  'tp-media-captions-button': mediaButtonBindings,
  'tp-media-playback-rate-button': mediaButtonBindings,
  'tp-media-remote-playback-button': mediaButtonBindings,
  'tp-media-live-button': {
    ...mediaButtonBindings,
    "[part~='icon']": 'media-button-live-dot',
  },
  'tp-media-time': {
    ':host': 'media-time',
    "[part~='time']": 'media-time-value',
    "[part~='sign']": 'media-time-sign',
  },
  'tp-media-buffering-indicator': {
    ':host': 'media-buffering-indicator',
  },
  'tp-media-error-dialog': {
    ':host': 'media-error-dialog',
  },
  'tp-media-status-indicator': mediaIndicatorBindings,
  'tp-media-seek-indicator': mediaIndicatorBindings,
  'tp-media-volume-indicator': mediaIndicatorBindings,
  // Sliders compose `tp-slider` (its recipe paints track, range, buffer, chapters and thumb).
  'tp-media-time-slider': {
    ':host': 'media-time-slider',
  },
  'tp-media-volume-slider': {
    ':host': 'media-volume-slider',
  },
  'tp-media-time-slider-preview': {
    ':host': 'media-time-slider-preview',
  },
  'tp-media-thumbnail': {
    ':host': 'media-thumbnail',
    "[part~='image']": 'media-thumbnail-image',
  },
  'tp-media-chapter-title': {
    ':host': 'media-chapter-title',
  },
  // Radio groups extend the Menu radio group (Menu presentation) and add the media part.
  'tp-media-playback-rate-radio-group': { ':host': 'media-radio-group' },
  'tp-media-captions-radio-group': { ':host': 'media-radio-group' },
  'tp-media-audio-track-radio-group': { ':host': 'media-radio-group' },
  'tp-media-quality-radio-group': { ':host': 'media-radio-group' },
  // Presets compose Popover/Menu, which keep their own recipes.
  'tp-media-volume-popover': {
    ':host': 'media-volume-popover',
  },
  'tp-media-settings-menu': {
    ':host': 'media-settings-menu',
  },
  // Layouts compose the constituents above; their regions are structural.
  'tp-media-video-layout': mediaLayoutBindings,
  'tp-media-audio-layout': mediaLayoutBindings,
  'tp-avatar': {
    ':host': 'avatar',
    img: 'avatar-image',
    "[part~='fallback']": 'avatar-fallback',
  },
  'tp-avatar-group': {
    '.group': 'avatar-group',
    '.count': 'avatar-overflow-count',
  },
  'tp-spinner': {
    ':host': 'spinner',
    '.visually-hidden': 'spinner-accessible-label',
  },
  // Navigation Panel projects its separator recipe onto the inherited root.
  'tp-navigation-panel-separator': {},
  'tp-separator': {
    ':host': 'separator',
  },
  'tp-marker': {
    '.root': 'marker',
    '.icon': 'marker-icon',
    '.content': 'marker-content',
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
    '.group': 'one-time-code-field-group',
    '.slot': 'one-time-code-field-slot',
  },
};
