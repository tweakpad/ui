import { css } from 'lit';
import { TpJoinedGroup, type JoinedGroupParts } from '../shared/joined-group.js';
import { fieldGroupPresentation } from '../../presentation/families/field-group.js';

/**
 * Joins value editors as one related tuple (width and height, X/Y/Z, color channels). Each
 * editor keeps its own value, name, label, form participation and validation; the group owns
 * only the layout, the seams and the group name (Component Library §22 Field group).
 */
export class TpFieldGroup extends TpJoinedGroup {
  static tagName = 'tp-field-group';
  static override presentation = fieldGroupPresentation;
  static override styles = [
    ...TpJoinedGroup.styles,
    css`
      :host {
        display: flex;
      }

      /* Editors share the main axis equally unless one declares its own size. */
      ::slotted(tp-input),
      ::slotted(tp-input-group),
      ::slotted(tp-text-area),
      ::slotted(tp-select),
      ::slotted(tp-native-select) {
        flex: 1 1 0;
      }
    `,
  ];
  protected readonly groupParts: JoinedGroupParts = {
    root: 'field-group',
    control: 'field-group-control',
    separator: 'field-group-separator',
  };
  override label = 'Values';
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-field-group': TpFieldGroup;
  }
}
