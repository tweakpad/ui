import { css } from 'lit';
import { TpJoinedGroup, type JoinedGroupParts } from '../shared/joined-group.js';
import { fieldGroupPresentation } from '../../presentation/families/field-group.js';

/**
 * Joins the editors of one compound value, such as width and height or color channels, into a
 * single seamed row. Each editor keeps its own value, name, label, form participation and
 * validation; the group owns only the layout, the seams and the group name.
 *
 * @slot - The editors, such as Inputs, Input groups and Selects, with Toggles, Buttons or a
 * Separator between them.
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
  /**
   * The accessible name of the compound value, such as "Canvas size"; each editor still needs
   * its own label.
   */
  override label = 'Values';
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-field-group': TpFieldGroup;
  }
}
