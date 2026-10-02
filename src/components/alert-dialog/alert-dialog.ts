import { TpDialog } from '../dialog/dialog.js';
export type {
  DialogInitialFocus as AlertDialogInitialFocus,
  DialogFinalFocus as AlertDialogFinalFocus,
} from '../dialog/dialog.js';

/** Alert Dialog shares Dialog anatomy/lifecycle, with mandatory decision policy. */
export class TpAlertDialog extends TpDialog {
  static override tagName = 'tp-alert-dialog';
  override initialFocus = 'cancel';
  override showCloseControl = false;
  protected override get partPrefix(): string {
    return 'alert-dialog';
  }
  protected override get isAlertDialog(): boolean {
    return true;
  }
  override get modality(): 'modal' {
    return 'modal';
  }
  override set modality(_value: 'modal' | 'non-modal' | 'trap-focus-only') {
    /* Always modal. */
  }
  override get closeOnOutsideInteraction(): boolean {
    return false;
  }
  override set closeOnOutsideInteraction(_value: boolean) {
    /* Decision surfaces never dismiss outside. */
  }
}
