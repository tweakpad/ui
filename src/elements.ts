import type { TpAccordion } from './components/accordion.js';
import type { TpAccordionItem } from './components/accordion-item.js';
import type { TpButton } from './components/button.js';
import type { TpCheckbox } from './components/checkbox.js';
import type { TpIcon } from './components/icon.js';
import type { TpCombobox, TpCommandPalette, TpSelect } from './components/choices.js';
import type { TpCollapsible } from './components/collapsible.js';
import type {
  TpAvatar,
  TpCarousel,
  TpDataVisualization,
  TpMessageScroller,
  TpProgress,
  TpResizablePanelGroup,
  TpScrollArea,
  TpSeparator,
  TpSpinner,
  TpToast,
} from './components/display.js';
import type {
  TpCalendar,
  TpField,
  TpForm,
  TpInput,
  TpInputGroup,
  TpNativeSelect,
  TpOtpField,
  TpQuestionnaire,
  TpRadioGroup,
  TpSlider,
  TpTextArea,
} from './components/forms.js';
import type {
  TpBreadcrumb,
  TpContextMenu,
  TpMenu,
  TpMenubar,
  TpNavigationMenu,
  TpNavigationPanel,
  TpPagination,
} from './components/navigation.js';
import type {
  TpAlertDialog,
  TpDialog,
  TpDrawer,
  TpPopover,
  TpPreviewCard,
  TpSidePanel,
  TpTooltip,
} from './components/overlays.js';
import type {
  TpAlert,
  TpAspectRatio,
  TpAttachment,
  TpBadge,
  TpBubble,
  TpButtonGroup,
  TpCard,
  TpEmptyState,
  TpKeyHint,
  TpLabel,
  TpListItem,
  TpMarker,
  TpMessage,
  TpSkeleton,
  TpTable,
} from './components/primitives.js';
import type { TpSwitch } from './components/switch.js';
import type { TpTabs } from './components/tabs.js';
import type { TpToggle } from './components/toggle.js';
import type { TpToggleGroup } from './components/toggle-group.js';
import type { TpRadioGroupItem } from './components/radio-group/index.js';

declare global {
  interface HTMLElementTagNameMap {
    'tp-accordion': TpAccordion;
    'tp-accordion-item': TpAccordionItem;
    'tp-alert': TpAlert;
    'tp-alert-dialog': TpAlertDialog;
    'tp-aspect-ratio': TpAspectRatio;
    'tp-attachment': TpAttachment;
    'tp-avatar': TpAvatar;
    'tp-badge': TpBadge;
    'tp-breadcrumb': TpBreadcrumb;
    'tp-bubble': TpBubble;
    'tp-button': TpButton;
    'tp-button-group': TpButtonGroup;
    'tp-calendar': TpCalendar;
    'tp-card': TpCard;
    'tp-carousel': TpCarousel;
    'tp-checkbox': TpCheckbox;
    'tp-collapsible': TpCollapsible;
    'tp-combobox': TpCombobox;
    'tp-command-palette': TpCommandPalette;
    'tp-context-menu': TpContextMenu;
    'tp-data-visualization': TpDataVisualization;
    'tp-dialog': TpDialog;
    'tp-drawer': TpDrawer;
    'tp-empty-state': TpEmptyState;
    'tp-field': TpField;
    'tp-form': TpForm;
    'tp-input': TpInput;
    'tp-input-group': TpInputGroup;
    'tp-icon': TpIcon;
    'tp-key-hint': TpKeyHint;
    'tp-label': TpLabel;
    'tp-list-item': TpListItem;
    'tp-marker': TpMarker;
    'tp-menu': TpMenu;
    'tp-menubar': TpMenubar;
    'tp-message': TpMessage;
    'tp-message-scroller': TpMessageScroller;
    'tp-native-select': TpNativeSelect;
    'tp-navigation-menu': TpNavigationMenu;
    'tp-navigation-panel': TpNavigationPanel;
    'tp-otp-field': TpOtpField;
    'tp-pagination': TpPagination;
    'tp-popover': TpPopover;
    'tp-preview-card': TpPreviewCard;
    'tp-progress': TpProgress;
    'tp-questionnaire': TpQuestionnaire;
    'tp-radio-group': TpRadioGroup;
    'tp-radio-group-item': TpRadioGroupItem;
    'tp-resizable-panel-group': TpResizablePanelGroup;
    'tp-scroll-area': TpScrollArea;
    'tp-select': TpSelect;
    'tp-separator': TpSeparator;
    'tp-side-panel': TpSidePanel;
    'tp-skeleton': TpSkeleton;
    'tp-slider': TpSlider;
    'tp-spinner': TpSpinner;
    'tp-switch': TpSwitch;
    'tp-table': TpTable;
    'tp-tabs': TpTabs;
    'tp-text-area': TpTextArea;
    'tp-toast': TpToast;
    'tp-toggle': TpToggle;
    'tp-toggle-group': TpToggleGroup;
    'tp-tooltip': TpTooltip;
  }
}

export {};
