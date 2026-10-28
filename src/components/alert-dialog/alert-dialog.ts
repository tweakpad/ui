import { TpDialog, type DialogModality } from '../dialog/dialog.js';
import { alertDialogPresentation } from '../../presentation/families/alert-dialog.js';

const alertDialogModalities: readonly DialogModality[] = ['modal', 'container'];
export type {
  DialogInitialFocus as AlertDialogInitialFocus,
  DialogFinalFocus as AlertDialogFinalFocus,
} from '../dialog/dialog.js';

/**
 * A modal confirmation for a consequential decision, with explicit Cancel and Confirm actions. An
 * outside press never closes it, opening focuses Cancel, and it has no corner Close button.
 *
 * @slot media - An Icon or image above the title that marks the kind of decision.
 * @slot cancel - The action that declines; it closes the dialog when pressed.
 * @slot confirm - The action that carries out the decision; its handler does the work, then closes
 *   the dialog.
 * @slot actions - Further footer actions beside Cancel and Confirm.
 */
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
