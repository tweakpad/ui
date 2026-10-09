import { TpDialog, type DialogModality } from '../dialog/dialog.js';
import { alertDialogPresentation } from '../../presentation/families/alert-dialog.js';

const alertDialogModalities: readonly DialogModality[] = ['modal', 'container'];
export type {
  DialogInitialFocus as AlertDialogInitialFocus,
  DialogFinalFocus as AlertDialogFinalFocus,
} from '../dialog/dialog.js';

/** Alert Dialog shares Dialog anatomy/lifecycle, with mandatory decision policy. */
export class TpAlertDialog extends TpDialog {
  static override tagName = 'tp-alert-dialog';
  static override presentation = alertDialogPresentation;
  override initialFocus = 'cancel';
  override showCloseControl = false;
  protected override get partPrefix(): string {
    return 'alert-dialog';
  }
  protected override get isAlertDialog(): boolean {
    return true;
  }
  /**
   * Always isolating: document `modal` (default) or `container` modality. Non-isolating values
   * normalize to `modal`.
   */
  protected override get supportedModalities(): readonly DialogModality[] {
    return alertDialogModalities;
  }
  override get closeOnOutsideInteraction(): boolean {
    return false;
  }
  override set closeOnOutsideInteraction(_value: boolean) {
    /* Decision surfaces never dismiss outside. */
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-alert-dialog': TpAlertDialog;
  }
}
