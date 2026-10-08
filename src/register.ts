import { TpCommandList } from './components/command-palette/index.js';
import { TpDragDropList } from './components/drag-drop-list/index.js';
import {
  TpSelectTrigger,
  TpSelectClear,
  TpSelectChipRemove,
  TpSelectOption,
} from './components/select/index.js';
import {
  TpMenuItem,
  TpMenuCheckboxItem,
  TpMenuRadioGroup,
  TpMenuRadioItem,
} from './components/menu/index.js';
import { TpNavigationMenuItem } from './components/navigation-menu/index.js';
import { defineElement } from './foundation/define.js';
import { TpAccordion } from './components/accordion.js';
import { TpAccordionItem } from './components/accordion-item.js';
import { TpButton } from './components/button.js';
import { TpCheckbox } from './components/checkbox.js';
import { TpIcon } from './components/icon.js';
import { TpCommandPalette, TpSelect } from './components/choices.js';
import { TpCollapsible } from './components/collapsible.js';
import {
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
import {
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
import {
  TpBreadcrumb,
  TpMenu,
  TpMenubar,
  TpNavigationMenu,
  TpNavigationPanel,
  TpPagination,
} from './components/navigation.js';
import {
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
import {
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
import {
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
import { NavigationPanelDrawer } from './components/navigation-panel/drawer.js';
import { TpSwitch } from './components/switch.js';
import { TpTabs } from './components/tabs.js';
import { TpToggle } from './components/toggle.js';
import { TpToggleGroup } from './components/toggle-group.js';
import { TpThemeSwitcher } from './components/theme-switcher.js';
import { TpRadioGroupItem } from './components/radio-group/index.js';
import { TpSliderThumb } from './components/slider/index.js';
import {
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
import { TpMap, TpMapPin, TpMapOverlay, TpMapControl } from './components/map/index.js';
import { TpCodeBlock } from './components/code-block/index.js';
import { TpMarkdown } from './components/markdown/index.js';
import { TpImage, TpImageGroup } from './components/image/index.js';
import { TpScrollTrigger } from './components/scroll-trigger/index.js';
import { TpAutocomplete } from './components/autocomplete/index.js';
import { TpTextMotion } from './components/text-motion/index.js';
import { TpTableOfContents, TpTableOfContentsItem } from './components/table-of-contents/index.js';
import { TpTreeItem, TpTreeView } from './components/tree-view/index.js';

defineElement(TpAccordion.tagName, TpAccordion);
defineElement(TpAccordionItem.tagName, TpAccordionItem);
defineElement(TpIcon.tagName, TpIcon);
defineElement(TpButton.tagName, TpButton);
defineElement(TpCommandList.tagName, TpCommandList);
defineElement(TpCommandPalette.tagName, TpCommandPalette);
defineElement(TpSelect.tagName, TpSelect);
defineElement(TpCheckbox.tagName, TpCheckbox);
defineElement(TpCollapsible.tagName, TpCollapsible);
defineElement(TpSwitch.tagName, TpSwitch);
defineElement(TpTabs.tagName, TpTabs);
defineElement(TpToggle.tagName, TpToggle);
defineElement(TpToggleGroup.tagName, TpToggleGroup);
defineElement(TpThemeSwitcher.tagName, TpThemeSwitcher);
defineElement(TpCalendar.tagName, TpCalendar);
defineElement(TpField.tagName, TpField);
defineElement(TpForm.tagName, TpForm);
defineElement(TpInput.tagName, TpInput);
defineElement(TpInputGroup.tagName, TpInputGroup);
defineElement(TpNativeSelect.tagName, TpNativeSelect);
defineElement(TpOtpField.tagName, TpOtpField);
defineElement(TpQuestionnaire.tagName, TpQuestionnaire);
defineElement(TpRadioGroup.tagName, TpRadioGroup);
defineElement(TpRadioGroupItem.tagName, TpRadioGroupItem);
defineElement(TpSlider.tagName, TpSlider);
defineElement(TpSliderThumb.tagName, TpSliderThumb);
defineElement(TpTextArea.tagName, TpTextArea);
defineElement(TpAlertDialog.tagName, TpAlertDialog);
defineElement(TpDialog.tagName, TpDialog);
defineElement(TpDrawer.tagName, TpDrawer);
defineElement(TpDrawerProvider.tagName, TpDrawerProvider);
defineElement(TpDrawerIndent.tagName, TpDrawerIndent);
defineElement(TpDrawerIndentBackground.tagName, TpDrawerIndentBackground);
defineElement(TpDrawerVirtualKeyboardProvider.tagName, TpDrawerVirtualKeyboardProvider);
defineElement(TpDrawerSwipeArea.tagName, TpDrawerSwipeArea);
defineElement(TpPopover.tagName, TpPopover);
defineElement(TpPreviewCard.tagName, TpPreviewCard);
defineElement(TpSidePanel.tagName, TpSidePanel);
defineElement(TpTooltip.tagName, TpTooltip);
defineElement(TpBreadcrumb.tagName, TpBreadcrumb);
defineElement(TpMenu.tagName, TpMenu);
defineElement(TpMenubar.tagName, TpMenubar);
defineElement(TpNavigationMenu.tagName, TpNavigationMenu);
defineElement(TpNavigationPanel.tagName, TpNavigationPanel);
defineElement(TpPagination.tagName, TpPagination);
defineElement(TpAvatar.tagName, TpAvatar);
defineElement(TpAvatarGroup.tagName, TpAvatarGroup);
defineElement(TpCarousel.tagName, TpCarousel);
defineElement(TpDataVisualization.tagName, TpDataVisualization);
defineElement(TpMessageScroller.tagName, TpMessageScroller);
defineElement(TpMessageScrollerItem.tagName, TpMessageScrollerItem);
defineElement(TpMessageScrollerViewport.tagName, TpMessageScrollerViewport);
defineElement(TpMessageScrollerContent.tagName, TpMessageScrollerContent);
defineElement(TpMessageScrollerReturnControl.tagName, TpMessageScrollerReturnControl);
defineElement(TpProgress.tagName, TpProgress);
defineElement(TpResizablePanel.tagName, TpResizablePanel);
defineElement(TpResizableHandle.tagName, TpResizableHandle);
defineElement(TpResizablePanelGroup.tagName, TpResizablePanelGroup);
defineElement(TpScrollArea.tagName, TpScrollArea);
defineElement(TpSeparator.tagName, TpSeparator);
defineElement(TpSpinner.tagName, TpSpinner);
defineElement(TpToast.tagName, TpToast);
defineElement(TpAlert.tagName, TpAlert);
defineElement(TpAspectRatio.tagName, TpAspectRatio);
defineElement(TpAttachment.tagName, TpAttachment);
defineElement(TpAttachmentGroup.tagName, TpAttachmentGroup);
defineElement(TpBadge.tagName, TpBadge);
defineElement(TpBubble.tagName, TpBubble);
defineElement(TpBubbleGroup.tagName, TpBubbleGroup);
defineElement(TpButtonGroup.tagName, TpButtonGroup);
defineElement(TpButtonGroupText.tagName, TpButtonGroupText);
defineElement(TpCard.tagName, TpCard);
defineElement(TpCodeBlock.tagName, TpCodeBlock);
defineElement(TpMarkdown.tagName, TpMarkdown);
defineElement(TpImage.tagName, TpImage);
defineElement(TpImageGroup.tagName, TpImageGroup);
defineElement(TpScrollTrigger.tagName, TpScrollTrigger);
defineElement(TpAutocomplete.tagName, TpAutocomplete);
defineElement(TpTextMotion.tagName, TpTextMotion);
defineElement(TpTableOfContents.tagName, TpTableOfContents);
defineElement(TpTableOfContentsItem.tagName, TpTableOfContentsItem);
defineElement(TpTreeView.tagName, TpTreeView);
defineElement(TpTreeItem.tagName, TpTreeItem);
defineElement(TpEmptyState.tagName, TpEmptyState);
defineElement(TpKeyHint.tagName, TpKeyHint);
defineElement(TpKeyHintGroup.tagName, TpKeyHintGroup);
defineElement(TpLabel.tagName, TpLabel);
defineElement(TpListItem.tagName, TpListItem);
defineElement(TpListItemGroup.tagName, TpListItemGroup);
defineElement(TpListItemSeparator.tagName, TpListItemSeparator);
defineElement(TpMarker.tagName, TpMarker);
defineElement(TpMessage.tagName, TpMessage);
defineElement(TpMessageGroup.tagName, TpMessageGroup);
defineElement(TpSkeleton.tagName, TpSkeleton);
defineElement(TpTable.tagName, TpTable);
defineElement(TpTime.tagName, TpTime);

export * from './index.js';

defineElement(TpNavigationPanelInset.tagName, TpNavigationPanelInset);
defineElement(TpNavigationPanelHeader.tagName, TpNavigationPanelHeader);
defineElement(TpNavigationPanelContent.tagName, TpNavigationPanelContent);
defineElement(TpNavigationPanelFooter.tagName, TpNavigationPanelFooter);
defineElement(TpNavigationPanelGroup.tagName, TpNavigationPanelGroup);
defineElement(TpNavigationPanelGroupLabel.tagName, TpNavigationPanelGroupLabel);
defineElement(TpNavigationPanelGroupContent.tagName, TpNavigationPanelGroupContent);
defineElement(TpNavigationPanelMenu.tagName, TpNavigationPanelMenu);
defineElement(TpNavigationPanelItem.tagName, TpNavigationPanelItem);
defineElement(TpNavigationPanelSubmenu.tagName, TpNavigationPanelSubmenu);
defineElement(TpNavigationPanelSubitem.tagName, TpNavigationPanelSubitem);
defineElement(TpNavigationPanelTrigger.tagName, TpNavigationPanelTrigger);
defineElement(TpNavigationPanelResizeRail.tagName, TpNavigationPanelResizeRail);
defineElement(TpNavigationPanelGroupAction.tagName, TpNavigationPanelGroupAction);
defineElement(TpNavigationPanelLink.tagName, TpNavigationPanelLink);
defineElement(TpNavigationPanelAction.tagName, TpNavigationPanelAction);
defineElement(TpNavigationPanelSublink.tagName, TpNavigationPanelSublink);
defineElement(TpNavigationPanelInput.tagName, TpNavigationPanelInput);
defineElement(TpNavigationPanelBadge.tagName, TpNavigationPanelBadge);
defineElement(TpNavigationPanelSeparator.tagName, TpNavigationPanelSeparator);
defineElement(TpNavigationPanelLoadingPlaceholder.tagName, TpNavigationPanelLoadingPlaceholder);
defineElement(NavigationPanelDrawer.tagName, NavigationPanelDrawer);

defineElement(TpMenuItem.tagName, TpMenuItem);
defineElement(TpMenuCheckboxItem.tagName, TpMenuCheckboxItem);
defineElement(TpMenuRadioGroup.tagName, TpMenuRadioGroup);
defineElement(TpMenuRadioItem.tagName, TpMenuRadioItem);
defineElement(TpNavigationMenuItem.tagName, TpNavigationMenuItem);

defineElement(TpSelectTrigger.tagName, TpSelectTrigger);
defineElement(TpSelectClear.tagName, TpSelectClear);
defineElement(TpSelectChipRemove.tagName, TpSelectChipRemove);
defineElement(TpSelectOption.tagName, TpSelectOption);

defineElement(TpTableHeader.tagName, TpTableHeader);

defineElement(TpTableBody.tagName, TpTableBody);

defineElement(TpTableFooter.tagName, TpTableFooter);

defineElement(TpTableRow.tagName, TpTableRow);

defineElement(TpTableHead.tagName, TpTableHead);

defineElement(TpTableCell.tagName, TpTableCell);

defineElement(TpTableCaption.tagName, TpTableCaption);
defineElement(TpDragDropList.tagName, TpDragDropList);

// The map root is defined first so pins and controls resolve it when they upgrade.
defineElement(TpMap.tagName, TpMap);
defineElement(TpMapOverlay.tagName, TpMapOverlay);
defineElement(TpMapPin.tagName, TpMapPin);
defineElement(TpMapControl.tagName, TpMapControl);

// The media root is defined first so constituents resolve it when they upgrade.
defineElement(TpMediaPlayer.tagName, TpMediaPlayer);
defineElement(TpMediaContainer.tagName, TpMediaContainer);
defineElement(TpMediaPoster.tagName, TpMediaPoster);
defineElement(TpMediaTitle.tagName, TpMediaTitle);
defineElement(TpMediaControls.tagName, TpMediaControls);
defineElement(TpMediaControlsGroup.tagName, TpMediaControlsGroup);
defineElement(TpMediaHotkey.tagName, TpMediaHotkey);
defineElement(TpMediaGesture.tagName, TpMediaGesture);
defineElement(TpMediaPlayButton.tagName, TpMediaPlayButton);
defineElement(TpMediaMuteButton.tagName, TpMediaMuteButton);
defineElement(TpMediaSeekButton.tagName, TpMediaSeekButton);
defineElement(TpMediaFullscreenButton.tagName, TpMediaFullscreenButton);
defineElement(TpMediaPipButton.tagName, TpMediaPipButton);
defineElement(TpMediaCaptionsButton.tagName, TpMediaCaptionsButton);
defineElement(TpMediaPlaybackRateButton.tagName, TpMediaPlaybackRateButton);
defineElement(TpMediaLiveButton.tagName, TpMediaLiveButton);
defineElement(TpMediaRemotePlaybackButton.tagName, TpMediaRemotePlaybackButton);
defineElement(TpMediaTime.tagName, TpMediaTime);
defineElement(TpMediaBufferingIndicator.tagName, TpMediaBufferingIndicator);
defineElement(TpMediaErrorDialog.tagName, TpMediaErrorDialog);
defineElement(TpMediaStatusIndicator.tagName, TpMediaStatusIndicator);
defineElement(TpMediaSeekIndicator.tagName, TpMediaSeekIndicator);
defineElement(TpMediaVolumeIndicator.tagName, TpMediaVolumeIndicator);
defineElement(TpMediaTimeSlider.tagName, TpMediaTimeSlider);
defineElement(TpMediaTimeSliderPreview.tagName, TpMediaTimeSliderPreview);
defineElement(TpMediaThumbnail.tagName, TpMediaThumbnail);
defineElement(TpMediaChapterTitle.tagName, TpMediaChapterTitle);
defineElement(TpMediaVolumeSlider.tagName, TpMediaVolumeSlider);
defineElement(TpMediaVolumePopover.tagName, TpMediaVolumePopover);
defineElement(TpMediaPlaybackRateRadioGroup.tagName, TpMediaPlaybackRateRadioGroup);
defineElement(TpMediaCaptionsRadioGroup.tagName, TpMediaCaptionsRadioGroup);
defineElement(TpMediaAudioTrackRadioGroup.tagName, TpMediaAudioTrackRadioGroup);
defineElement(TpMediaQualityRadioGroup.tagName, TpMediaQualityRadioGroup);
defineElement(TpMediaSettingsMenu.tagName, TpMediaSettingsMenu);
defineElement(TpMediaVideoLayout.tagName, TpMediaVideoLayout);
defineElement(TpMediaAudioLayout.tagName, TpMediaAudioLayout);
