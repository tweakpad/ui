import { TpAccordionItem } from './components/accordion/accordion-item.js';
import { TpAccordion } from './components/accordion/accordion.js';
import { TpAlertDialog } from './components/alert-dialog/alert-dialog.js';
import { TpAlert } from './components/alert/alert.js';
import { TpAspectRatio } from './components/aspect-ratio/aspect-ratio.js';
import { TpAttachment } from './components/attachment/attachment.js';
import { TpAttachmentGroup } from './components/attachment/group.js';
import { TpAutocomplete } from './components/autocomplete/autocomplete.js';
import { TpAvatar, TpAvatarGroup } from './components/avatar/avatar.js';
import { TpBadge } from './components/badge/badge.js';
import { TpBreadcrumb } from './components/breadcrumb/breadcrumb.js';
import { TpBubble, TpBubbleGroup } from './components/bubble/bubble.js';
import { TpButtonGroup } from './components/button-group/button-group.js';
import { TpButtonGroupText } from './components/button-group/text.js';
import { TpFieldGroup } from './components/field-group/field-group.js';
import { TpButton } from './components/button/button.js';
import { TpCalendar } from './components/calendar/calendar.js';
import { TpCard } from './components/card/card.js';
import { TpCarousel } from './components/carousel/carousel.js';
import { TpCheckbox } from './components/checkbox/checkbox.js';
import { TpCodeBlock } from './components/code-block/code-block.js';
import { TpCollapsible } from './components/collapsible/collapsible.js';
import { TpCommandPalette } from './components/command-palette/command-palette.js';
import { TpCommandList } from './components/command-palette/list.js';
import { TpDataVisualization } from './components/data-visualization/data-visualization.js';
import { TpDialog } from './components/dialog/dialog.js';
import { TpDragDropList } from './components/drag-drop-list/drag-drop-list.js';
import { TpDrawer } from './components/drawer/drawer.js';
import {
  TpDrawerProvider,
  TpDrawerIndent,
  TpDrawerIndentBackground,
} from './components/drawer/provider.js';
import { TpDrawerSwipeArea } from './components/drawer/swipe-area.js';
import { TpDrawerVirtualKeyboardProvider } from './components/drawer/virtual-keyboard.js';
import { TpEmptyState } from './components/empty-state/empty-state.js';
import { TpField } from './components/field/field.js';
import { TpForm } from './components/form/form.js';
import { TpIcon } from './components/icon/icon.js';
import { TpImageGroup } from './components/image/image-group.js';
import { TpImage } from './components/image/image.js';
import { TpInputGroup } from './components/input-group/input-group.js';
import { TpInput } from './components/input/input.js';
import { TpKeyHintGroup } from './components/key-hint/key-hint-group.js';
import { TpKeyHint } from './components/key-hint/key-hint.js';
import { TpLabel } from './components/label/label.js';
import { TpListItemGroup } from './components/list-item/group.js';
import { TpListItem } from './components/list-item/list-item.js';
import { TpListItemSeparator } from './components/list-item/separator.js';
import { TpMapControl } from './components/map/control.js';
import { TpMap } from './components/map/map.js';
import { TpMapOverlay } from './components/map/overlay.js';
import { TpMapPin } from './components/map/pin.js';
import { TpMarkdown } from './components/markdown/markdown.js';
import { TpMarker } from './components/marker/marker.js';
import { TpMediaHotkey, TpMediaGesture } from './components/media-player/bindings.js';
import {
  TpMediaPlayButton,
  TpMediaMuteButton,
  TpMediaSeekButton,
  TpMediaFullscreenButton,
  TpMediaPipButton,
  TpMediaCaptionsButton,
  TpMediaPlaybackRateButton,
  TpMediaLiveButton,
  TpMediaRemotePlaybackButton,
} from './components/media-player/buttons.js';
import { TpMediaChapterTitle } from './components/media-player/chapter-title.js';
import { TpMediaContainer } from './components/media-player/container.js';
import { TpMediaControls, TpMediaControlsGroup } from './components/media-player/controls.js';
import {
  TpMediaBufferingIndicator,
  TpMediaErrorDialog,
} from './components/media-player/feedback.js';
import {
  TpMediaStatusIndicator,
  TpMediaSeekIndicator,
  TpMediaVolumeIndicator,
} from './components/media-player/indicators.js';
import { TpMediaVideoLayout, TpMediaAudioLayout } from './components/media-player/layouts.js';
import { TpMediaPlayer } from './components/media-player/player.js';
import { TpMediaPoster } from './components/media-player/poster.js';
import { TpMediaTimeSliderPreview } from './components/media-player/preview.js';
import {
  TpMediaPlaybackRateRadioGroup,
  TpMediaCaptionsRadioGroup,
  TpMediaAudioTrackRadioGroup,
  TpMediaQualityRadioGroup,
} from './components/media-player/radio-groups.js';
import { TpMediaSettingsMenu } from './components/media-player/settings-menu.js';
import { TpMediaThumbnail } from './components/media-player/thumbnail.js';
import { TpMediaTimeSlider } from './components/media-player/time-slider.js';
import { TpMediaTime } from './components/media-player/time.js';
import { TpMediaTitle } from './components/media-player/title.js';
import { TpMediaVolumePopover } from './components/media-player/volume-popover.js';
import { TpMediaVolumeSlider } from './components/media-player/volume-slider.js';
import { TpMenuCheckboxItem } from './components/menu/menu-checkbox-item.js';
import { TpMenuItem } from './components/menu/menu-item.js';
import { TpMenuRadioGroup } from './components/menu/menu-radio-group.js';
import { TpMenuRadioItem } from './components/menu/menu-radio-item.js';
import { TpMenu } from './components/menu/menu.js';
import { TpMenubar } from './components/menubar/menubar.js';
import { TpMessageScroller } from './components/message-scroller/message-scroller.js';
import {
  TpMessageScrollerItem,
  TpMessageScrollerViewport,
  TpMessageScrollerContent,
  TpMessageScrollerReturnControl,
} from './components/message-scroller/parts.js';
import { TpMessageGroup } from './components/message/group.js';
import { TpMessage } from './components/message/message.js';
import { TpNativeSelect } from './components/native-select/native-select.js';
import { TpNavigationMenuItem } from './components/navigation-menu/navigation-menu-item.js';
import { TpNavigationMenu } from './components/navigation-menu/navigation-menu.js';
import { NavigationPanelDrawer } from './components/navigation-panel/drawer.js';
import { TpNavigationPanel } from './components/navigation-panel/navigation-panel.js';
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
} from './components/navigation-panel/parts.js';
import { TpOneTimeCodeField } from './components/one-time-code-field/one-time-code-field.js';
import { TpPagination } from './components/pagination/pagination.js';
import { TpPopover } from './components/popover/popover.js';
import { TpPreviewCard } from './components/preview-card/preview-card.js';
import { TpProgress } from './components/progress/progress.js';
import { TpQuestionnaire } from './components/questionnaire/questionnaire.js';
import { TpRadioGroupItem } from './components/radio-group/radio-group-item.js';
import { TpRadioGroup } from './components/radio-group/radio-group.js';
import { TpResizablePanelGroup } from './components/resizable-panel-group/group.js';
import { TpResizableHandle } from './components/resizable-panel-group/handle.js';
import { TpResizablePanel } from './components/resizable-panel-group/panel.js';
import { TpScrollArea } from './components/scroll-area/scroll-area.js';
import { TpScrollTrigger } from './components/scroll-trigger/scroll-trigger.js';
import { TpSelectTrigger, TpSelectClear, TpSelectChipRemove } from './components/select/actions.js';
import { TpSelectOption } from './components/select/option.js';
import { TpSelect } from './components/select/select.js';
import { TpSeparator } from './components/separator/separator.js';
import { TpSkeleton } from './components/skeleton/skeleton.js';
import { TpSliderThumb } from './components/slider/slider-thumb.js';
import { TpSlider } from './components/slider/slider.js';
import { TpSpinner } from './components/spinner/spinner.js';
import { TpSwitch } from './components/switch/switch.js';
import { TpTableOfContentsItem } from './components/table-of-contents/table-of-contents-item.js';
import { TpTableOfContents } from './components/table-of-contents/table-of-contents.js';
import {
  TpTableHeader,
  TpTableBody,
  TpTableFooter,
  TpTableRow,
  TpTableHead,
  TpTableCell,
  TpTableCaption,
} from './components/table/parts.js';
import { TpTable } from './components/table/table.js';
import { TpTabs } from './components/tabs/tabs.js';
import { TpTextArea } from './components/text-area/text-area.js';
import { TpTextMotion } from './components/text-motion/text-motion.js';
import { TpThemeSwitcher } from './components/theme-switcher/theme-switcher.js';
import { TpTime } from './components/time/time.js';
import { TpTimelineItem } from './components/timeline/timeline-item.js';
import { TpTimeline } from './components/timeline/timeline.js';
import { TpToast } from './components/toast/toast.js';
import { TpToggleGroup } from './components/toggle-group/toggle-group.js';
import { TpToggle } from './components/toggle/toggle.js';
import { TpTooltip } from './components/tooltip/tooltip.js';
import { TpTreeItem } from './components/tree-view/tree-item.js';
import { TpTreeView } from './components/tree-view/tree-view.js';
import { defineElement } from './foundation/define.js';

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
defineElement(TpOneTimeCodeField.tagName, TpOneTimeCodeField);
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
defineElement(TpFieldGroup.tagName, TpFieldGroup);
defineElement(TpCard.tagName, TpCard);
defineElement(TpCodeBlock.tagName, TpCodeBlock);
defineElement(TpMarkdown.tagName, TpMarkdown);
defineElement(TpImage.tagName, TpImage);
defineElement(TpImageGroup.tagName, TpImageGroup);
defineElement(TpScrollTrigger.tagName, TpScrollTrigger);
defineElement(TpTimeline.tagName, TpTimeline);
defineElement(TpTimelineItem.tagName, TpTimelineItem);
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
