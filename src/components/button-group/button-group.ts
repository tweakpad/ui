import { css } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { setPartComposition } from '../../presentation/controller.js';
import { TpJoinedGroup, type JoinedGroupParts } from '../shared/joined-group.js';
import { paginationMembers, type GroupMember } from '../shared/group-members.js';
import { buttonGroupPresentation } from '../../presentation/families/button-group.js';

/**
 * Arranges existing action and choice controls as one visual set; the shared joined-group
 * owner applies seams and part aliases while every member keeps its own behavior.
 */
export class TpButtonGroup extends TpJoinedGroup {
  static tagName = 'tp-button-group';
  static override presentation = buttonGroupPresentation;
  static override styles = [
    ...TpJoinedGroup.styles,
    css`
      :host {
        display: inline-flex;
        inline-size: fit-content;
      }

      ::slotted(tp-input),
      ::slotted(tp-text-area),
      ::slotted(tp-input-group) {
        flex: 1;
      }

      ::slotted(tp-pagination),
      ::slotted(tp-button-group) {
        flex-shrink: 0;
      }
    `,
  ];
  protected readonly groupParts: JoinedGroupParts = {
    root: 'button-group',
    control: 'button-group-control',
    separator: 'button-group-separator',
    text: 'button-group-text-segment',
  };
  override label = 'Actions';
  #pagination = new Map<TpElement, string>();
  /** A direct Pagination participates through its page and direction links. */
  protected override expand(child: Element): (GroupMember | undefined)[] {
    if (!(child instanceof TpElement) || child.localName !== 'tp-pagination')
      return super.expand(child);
    const key = `${this.joined}:${this.orientation}`;
    if (this.#pagination.get(child) !== key) {
      this.#pagination.set(child, key);
      setPartComposition(child, this, {
        'pagination-list': {
          styleHook: {
            ...(this.joined ? { gap: '0' } : {}),
            'flex-direction': this.orientation === 'vertical' ? 'column' : 'row',
            'align-items': 'stretch',
            'flex-wrap': 'nowrap',
          },
        },
        'pagination-page-item': {
          styleHook: { 'flex-direction': 'column', 'align-items': 'stretch' },
        },
        'pagination-page-link': {
          styleHook: this.orientation === 'vertical' ? { 'min-inline-size': '100%' } : {},
        },
      });
    }
    return [undefined, ...paginationMembers(child), undefined];
  }
  protected override prune(children: readonly Element[]): void {
    for (const previous of this.#pagination.keys()) {
      if (children.includes(previous)) continue;
      setPartComposition(previous, this);
      this.#pagination.delete(previous);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-button-group': TpButtonGroup;
  }
}
