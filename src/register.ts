import { defineElement } from './foundation/define.js';
import { TpButton } from './components/button.js';
import { TpCombobox, TpCommandPalette, TpSelect } from './components/choices.js';
import {
  TpAccordion,
  TpCheckbox,
  TpCollapsible,
  TpSwitch,
  TpTabs,
  TpToggle,
  TpToggleGroup,
} from './components/discrete.js';
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
  TpPopover,
  TpPreviewCard,
  TpSidePanel,
  TpTooltip,
} from './components/overlays.js';
import {
  TpBreadcrumb,
  TpContextMenu,
  TpMenu,
  TpMenubar,
  TpNavigationMenu,
  TpNavigationPanel,
  TpPagination,
} from './components/navigation.js';
import {
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
import {
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

defineElement(TpAccordion.tagName, TpAccordion);
defineElement(TpButton.tagName, TpButton);
defineElement(TpCombobox.tagName, TpCombobox);
defineElement(TpCommandPalette.tagName, TpCommandPalette);
defineElement(TpSelect.tagName, TpSelect);
defineElement(TpCheckbox.tagName, TpCheckbox);
defineElement(TpCollapsible.tagName, TpCollapsible);
defineElement(TpSwitch.tagName, TpSwitch);
defineElement(TpTabs.tagName, TpTabs);
defineElement(TpToggle.tagName, TpToggle);
defineElement(TpToggleGroup.tagName, TpToggleGroup);
defineElement(TpCalendar.tagName, TpCalendar);
defineElement(TpField.tagName, TpField);
defineElement(TpForm.tagName, TpForm);
defineElement(TpInput.tagName, TpInput);
defineElement(TpInputGroup.tagName, TpInputGroup);
defineElement(TpNativeSelect.tagName, TpNativeSelect);
defineElement(TpOtpField.tagName, TpOtpField);
defineElement(TpQuestionnaire.tagName, TpQuestionnaire);
defineElement(TpRadioGroup.tagName, TpRadioGroup);
defineElement(TpSlider.tagName, TpSlider);
defineElement(TpTextArea.tagName, TpTextArea);
defineElement(TpAlertDialog.tagName, TpAlertDialog);
defineElement(TpDialog.tagName, TpDialog);
defineElement(TpDrawer.tagName, TpDrawer);
defineElement(TpPopover.tagName, TpPopover);
defineElement(TpPreviewCard.tagName, TpPreviewCard);
defineElement(TpSidePanel.tagName, TpSidePanel);
defineElement(TpTooltip.tagName, TpTooltip);
defineElement(TpBreadcrumb.tagName, TpBreadcrumb);
defineElement(TpContextMenu.tagName, TpContextMenu);
defineElement(TpMenu.tagName, TpMenu);
defineElement(TpMenubar.tagName, TpMenubar);
defineElement(TpNavigationMenu.tagName, TpNavigationMenu);
defineElement(TpNavigationPanel.tagName, TpNavigationPanel);
defineElement(TpPagination.tagName, TpPagination);
defineElement(TpAvatar.tagName, TpAvatar);
defineElement(TpCarousel.tagName, TpCarousel);
defineElement(TpDataVisualization.tagName, TpDataVisualization);
defineElement(TpMessageScroller.tagName, TpMessageScroller);
defineElement(TpProgress.tagName, TpProgress);
defineElement(TpResizablePanelGroup.tagName, TpResizablePanelGroup);
defineElement(TpScrollArea.tagName, TpScrollArea);
defineElement(TpSeparator.tagName, TpSeparator);
defineElement(TpSpinner.tagName, TpSpinner);
defineElement(TpToast.tagName, TpToast);
defineElement(TpAlert.tagName, TpAlert);
defineElement(TpAspectRatio.tagName, TpAspectRatio);
defineElement(TpAttachment.tagName, TpAttachment);
defineElement(TpBadge.tagName, TpBadge);
defineElement(TpBubble.tagName, TpBubble);
defineElement(TpButtonGroup.tagName, TpButtonGroup);
defineElement(TpCard.tagName, TpCard);
defineElement(TpEmptyState.tagName, TpEmptyState);
defineElement(TpKeyHint.tagName, TpKeyHint);
defineElement(TpLabel.tagName, TpLabel);
defineElement(TpListItem.tagName, TpListItem);
defineElement(TpMarker.tagName, TpMarker);
defineElement(TpMessage.tagName, TpMessage);
defineElement(TpSkeleton.tagName, TpSkeleton);
defineElement(TpTable.tagName, TpTable);

export * from './index.js';
