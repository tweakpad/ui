import type { TpDragDropList } from './components/drag-drop-list/index.js';
import type {
  TpSelectTrigger,
  TpSelectClear,
  TpSelectChipRemove,
  TpSelectOption,
} from './components/select/index.js';
import type { TpCommandList } from './components/command-palette/index.js';
import type {
  TpMenuItem,
  TpMenuCheckboxItem,
  TpMenuRadioGroup,
  TpMenuRadioItem,
} from './components/menu/index.js';
import type { TpNavigationMenuItem } from './components/navigation-menu/index.js';
import type {
  TpNavigationPanelInset,
  TpNavigationPanelHeader,
  TpNavigationPanelContent,
  TpNavigationPanelFooter,
  TpNavigationPanelGroup,
  TpNavigationPanelGroupLabel,
  TpNavigationPanelGroupContent,
  TpNavigationPanelMenu,
  TpNavigationPanelItem,
  TpNavigationPanelSubmenu,
  TpNavigationPanelSubitem,
  TpNavigationPanelTrigger,
  TpNavigationPanelResizeRail,
  TpNavigationPanelGroupAction,
  TpNavigationPanelLink,
  TpNavigationPanelAction,
  TpNavigationPanelSublink,
  TpNavigationPanelInput,
  TpNavigationPanelBadge,
  TpNavigationPanelSeparator,
  TpNavigationPanelLoadingPlaceholder,
} from './components/navigation-panel/index.js';
import type {
  TpMediaPlayer,
  TpMediaContainer,
  TpMediaControls,
  TpMediaControlsGroup,
  TpMediaPoster,
  TpMediaTitle,
  TpMediaHotkey,
  TpMediaGesture,
  TpMediaPlayButton,
  TpMediaMuteButton,
  TpMediaSeekButton,
  TpMediaFullscreenButton,
  TpMediaPipButton,
  TpMediaCaptionsButton,
  TpMediaPlaybackRateButton,
  TpMediaLiveButton,
  TpMediaRemotePlaybackButton,
  TpMediaTime,
  TpMediaBufferingIndicator,
  TpMediaErrorDialog,
  TpMediaStatusIndicator,
  TpMediaSeekIndicator,
  TpMediaVolumeIndicator,
  TpMediaTimeSlider,
  TpMediaTimeSliderPreview,
  TpMediaThumbnail,
  TpMediaChapterTitle,
  TpMediaVolumeSlider,
  TpMediaVolumePopover,
  TpMediaPlaybackRateRadioGroup,
  TpMediaCaptionsRadioGroup,
  TpMediaAudioTrackRadioGroup,
  TpMediaQualityRadioGroup,
  TpMediaSettingsMenu,
  TpMediaVideoLayout,
  TpMediaAudioLayout,
} from './components/media-player/index.js';
import type { TpMap, TpMapPin, TpMapOverlay, TpMapControl } from './components/map/index.js';
import type { TpCodeBlock } from './components/code-block/index.js';
import type { TpMarkdown } from './components/markdown/index.js';
import type { TpImage, TpImageGroup } from './components/image/index.js';
import type {
  TpTableOfContents,
  TpTableOfContentsItem,
} from './components/table-of-contents/index.js';
import type { TpTreeItem, TpTreeView } from './components/tree-view/index.js';
import type { TpAccordion } from './components/accordion.js';
import type { TpAccordionItem } from './components/accordion-item.js';
import type { TpButton } from './components/button.js';
import type { TpCheckbox } from './components/checkbox.js';
import type { TpIcon } from './components/icon.js';
import type { TpCommandPalette, TpSelect } from './components/choices.js';
import type { TpCollapsible } from './components/collapsible.js';
import type {
  TpAvatar,
  TpAvatarGroup,
  TpCarousel,
  TpDataVisualization,
  TpMessageScroller,
  TpMessageScrollerItem,
  TpMessageScrollerViewport,
  TpMessageScrollerContent,
  TpMessageScrollerReturnControl,
  TpProgress,
  TpResizablePanelGroup,
  TpResizablePanel,
  TpResizableHandle,
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
  TpDrawerProvider,
  TpDrawerIndent,
  TpDrawerIndentBackground,
  TpDrawerVirtualKeyboardProvider,
  TpDrawerSwipeArea,
  TpPopover,
  TpPreviewCard,
  TpSidePanel,
  TpTooltip,
} from './components/overlays.js';
import type {
  TpAlert,
  TpAspectRatio,
  TpAttachment,
  TpAttachmentGroup,
  TpBadge,
  TpBubble,
  TpBubbleGroup,
  TpButtonGroup,
  TpButtonGroupText,
  TpCard,
  TpEmptyState,
  TpKeyHint,
  TpKeyHintGroup,
  TpLabel,
  TpListItem,
  TpListItemGroup,
  TpListItemSeparator,
  TpMarker,
  TpMessage,
  TpMessageGroup,
  TpSkeleton,
  TpTable,
  TpTime,
  TpTableHeader,
  TpTableBody,
  TpTableFooter,
  TpTableRow,
  TpTableHead,
  TpTableCell,
  TpTableCaption,
} from './components/primitives.js';
import type { TpSwitch } from './components/switch.js';
import type { TpThemeSwitcher } from './components/theme-switcher.js';
import type { TpTabs } from './components/tabs.js';
import type { TpToggle } from './components/toggle.js';
import type { TpToggleGroup } from './components/toggle-group.js';
import type { TpRadioGroupItem } from './components/radio-group/index.js';
import type { TpSliderThumb } from './components/slider/index.js';

declare global {
  interface HTMLElementTagNameMap {
    'tp-drag-drop-list': TpDragDropList;
    'tp-menu-item': TpMenuItem;
    'tp-menu-checkbox-item': TpMenuCheckboxItem;
    'tp-menu-radio-group': TpMenuRadioGroup;
    'tp-menu-radio-item': TpMenuRadioItem;
    'tp-navigation-menu-item': TpNavigationMenuItem;

    'tp-accordion': TpAccordion;
    'tp-accordion-item': TpAccordionItem;
    'tp-alert': TpAlert;
    'tp-alert-dialog': TpAlertDialog;
    'tp-aspect-ratio': TpAspectRatio;
    'tp-attachment': TpAttachment;
    'tp-attachment-group': TpAttachmentGroup;
    'tp-avatar': TpAvatar;
    'tp-avatar-group': TpAvatarGroup;
    'tp-badge': TpBadge;
    'tp-breadcrumb': TpBreadcrumb;
    'tp-bubble': TpBubble;
    'tp-bubble-group': TpBubbleGroup;
    'tp-button': TpButton;
    'tp-button-group': TpButtonGroup;
    'tp-button-group-text': TpButtonGroupText;
    'tp-calendar': TpCalendar;
    'tp-card': TpCard;
    'tp-code-block': TpCodeBlock;
    'tp-markdown': TpMarkdown;
    'tp-image': TpImage;
    'tp-image-group': TpImageGroup;
    'tp-table-of-contents': TpTableOfContents;
    'tp-table-of-contents-item': TpTableOfContentsItem;
    'tp-tree-view': TpTreeView;
    'tp-tree-item': TpTreeItem;
    'tp-carousel': TpCarousel;
    'tp-checkbox': TpCheckbox;
    'tp-collapsible': TpCollapsible;
    'tp-command-palette': TpCommandPalette;
    'tp-data-visualization': TpDataVisualization;
    'tp-dialog': TpDialog;
    'tp-drawer': TpDrawer;
    'tp-drawer-provider': TpDrawerProvider;
    'tp-drawer-indent': TpDrawerIndent;
    'tp-drawer-indent-background': TpDrawerIndentBackground;
    'tp-drawer-virtual-keyboard-provider': TpDrawerVirtualKeyboardProvider;
    'tp-drawer-swipe-area': TpDrawerSwipeArea;
    'tp-empty-state': TpEmptyState;
    'tp-field': TpField;
    'tp-form': TpForm;
    'tp-input': TpInput;
    'tp-input-group': TpInputGroup;
    'tp-icon': TpIcon;
    'tp-key-hint': TpKeyHint;
    'tp-key-hint-group': TpKeyHintGroup;
    'tp-label': TpLabel;
    'tp-list-item': TpListItem;
    'tp-list-item-group': TpListItemGroup;
    'tp-list-item-separator': TpListItemSeparator;
    'tp-marker': TpMarker;
    'tp-menu': TpMenu;
    'tp-menubar': TpMenubar;
    'tp-message': TpMessage;
    'tp-time': TpTime;
    'tp-message-group': TpMessageGroup;
    'tp-message-scroller': TpMessageScroller;
    'tp-message-scroller-item': TpMessageScrollerItem;
    'tp-message-scroller-viewport': TpMessageScrollerViewport;
    'tp-message-scroller-content': TpMessageScrollerContent;
    'tp-message-scroller-return-control': TpMessageScrollerReturnControl;
    'tp-native-select': TpNativeSelect;
    'tp-navigation-menu': TpNavigationMenu;
    'tp-navigation-panel': TpNavigationPanel;
    'tp-navigation-panel-inset': TpNavigationPanelInset;
    'tp-navigation-panel-header': TpNavigationPanelHeader;
    'tp-navigation-panel-content': TpNavigationPanelContent;
    'tp-navigation-panel-footer': TpNavigationPanelFooter;
    'tp-navigation-panel-group': TpNavigationPanelGroup;
    'tp-navigation-panel-group-label': TpNavigationPanelGroupLabel;
    'tp-navigation-panel-group-content': TpNavigationPanelGroupContent;
    'tp-navigation-panel-menu': TpNavigationPanelMenu;
    'tp-navigation-panel-item': TpNavigationPanelItem;
    'tp-navigation-panel-submenu': TpNavigationPanelSubmenu;
    'tp-navigation-panel-subitem': TpNavigationPanelSubitem;
    'tp-navigation-panel-trigger': TpNavigationPanelTrigger;
    'tp-navigation-panel-resize-rail': TpNavigationPanelResizeRail;
    'tp-navigation-panel-group-action': TpNavigationPanelGroupAction;
    'tp-navigation-panel-link': TpNavigationPanelLink;
    'tp-navigation-panel-action': TpNavigationPanelAction;
    'tp-navigation-panel-sublink': TpNavigationPanelSublink;
    'tp-navigation-panel-input': TpNavigationPanelInput;
    'tp-navigation-panel-badge': TpNavigationPanelBadge;
    'tp-navigation-panel-separator': TpNavigationPanelSeparator;
    'tp-navigation-panel-loading-placeholder': TpNavigationPanelLoadingPlaceholder;
    'tp-media-player': TpMediaPlayer;
    'tp-map': TpMap;
    'tp-map-pin': TpMapPin;
    'tp-map-overlay': TpMapOverlay;
    'tp-map-control': TpMapControl;
    'tp-media-container': TpMediaContainer;
    'tp-media-controls': TpMediaControls;
    'tp-media-controls-group': TpMediaControlsGroup;
    'tp-media-poster': TpMediaPoster;
    'tp-media-title': TpMediaTitle;
    'tp-media-hotkey': TpMediaHotkey;
    'tp-media-gesture': TpMediaGesture;
    'tp-media-play-button': TpMediaPlayButton;
    'tp-media-mute-button': TpMediaMuteButton;
    'tp-media-seek-button': TpMediaSeekButton;
    'tp-media-fullscreen-button': TpMediaFullscreenButton;
    'tp-media-pip-button': TpMediaPipButton;
    'tp-media-captions-button': TpMediaCaptionsButton;
    'tp-media-playback-rate-button': TpMediaPlaybackRateButton;
    'tp-media-live-button': TpMediaLiveButton;
    'tp-media-remote-playback-button': TpMediaRemotePlaybackButton;
    'tp-media-time': TpMediaTime;
    'tp-media-buffering-indicator': TpMediaBufferingIndicator;
    'tp-media-error-dialog': TpMediaErrorDialog;
    'tp-media-status-indicator': TpMediaStatusIndicator;
    'tp-media-seek-indicator': TpMediaSeekIndicator;
    'tp-media-volume-indicator': TpMediaVolumeIndicator;
    'tp-media-time-slider': TpMediaTimeSlider;
    'tp-media-time-slider-preview': TpMediaTimeSliderPreview;
    'tp-media-thumbnail': TpMediaThumbnail;
    'tp-media-chapter-title': TpMediaChapterTitle;
    'tp-media-volume-slider': TpMediaVolumeSlider;
    'tp-media-volume-popover': TpMediaVolumePopover;
    'tp-media-playback-rate-radio-group': TpMediaPlaybackRateRadioGroup;
    'tp-media-captions-radio-group': TpMediaCaptionsRadioGroup;
    'tp-media-audio-track-radio-group': TpMediaAudioTrackRadioGroup;
    'tp-media-quality-radio-group': TpMediaQualityRadioGroup;
    'tp-media-settings-menu': TpMediaSettingsMenu;
    'tp-media-video-layout': TpMediaVideoLayout;
    'tp-media-audio-layout': TpMediaAudioLayout;

    'tp-otp-field': TpOtpField;
    'tp-pagination': TpPagination;
    'tp-popover': TpPopover;
    'tp-preview-card': TpPreviewCard;
    'tp-progress': TpProgress;
    'tp-questionnaire': TpQuestionnaire;
    'tp-radio-group': TpRadioGroup;
    'tp-radio-group-item': TpRadioGroupItem;
    'tp-resizable-panel-group': TpResizablePanelGroup;
    'tp-resizable-panel': TpResizablePanel;
    'tp-resizable-handle': TpResizableHandle;
    'tp-scroll-area': TpScrollArea;
    'tp-select': TpSelect;
    'tp-select-trigger': TpSelectTrigger;
    'tp-select-clear': TpSelectClear;
    'tp-select-chip-remove': TpSelectChipRemove;
    'tp-select-option': TpSelectOption;
    'tp-command-list': TpCommandList;
    'tp-separator': TpSeparator;
    'tp-side-panel': TpSidePanel;
    'tp-skeleton': TpSkeleton;
    'tp-slider': TpSlider;
    'tp-slider-thumb': TpSliderThumb;
    'tp-spinner': TpSpinner;
    'tp-switch': TpSwitch;
    'tp-theme-switcher': TpThemeSwitcher;
    'tp-table-header': TpTableHeader;
    'tp-table-body': TpTableBody;
    'tp-table-footer': TpTableFooter;
    'tp-table-row': TpTableRow;
    'tp-table-head': TpTableHead;
    'tp-table-cell': TpTableCell;
    'tp-table-caption': TpTableCaption;
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
