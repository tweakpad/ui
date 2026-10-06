import { selectStateMarkers } from './state.js';
import { setPartComposition } from '../../presentation/controller.js';
import type { PartPresentation } from '../../presentation/resolver.js';
import { TpButton } from '../button.js';
import type { PropertyValues } from 'lit';
import type { ComponentPartContract, ElementReference, PartState } from '../../foundation/part.js';
import { attachPartReference, detachPartReference } from '../../foundation/part-reference.js';
import { buttonPresentation } from '../../presentation/families/button.js';
import { selectPresentation } from '../../presentation/families/select.js';

/** Companion actions retain Button's press, native/delegated anatomy and mark owners. */
class SelectAction extends TpButton {
  static presentationTagName = 'tp-button';
  static override presentation = buttonPresentation;
  static presentationFamilyTagNames = ['tp-select'];
  static override presentationFamilies = [selectPresentation];
  static override properties = {
    ...TpButton.properties,
    selectState: { attribute: false },
    selectContract: { attribute: false },
    selectReference: { attribute: false },
    selectPresentation: { attribute: false },
  };
  protected selectPart = '';
  selectState: PartState = {};
  selectContract: ComponentPartContract | undefined;
  selectReference: ElementReference | undefined;
  selectPresentation: PartPresentation = {};
  #element: HTMLElement | null = null;
  #releasePart: (() => void) | undefined;
  #consumerReference: ElementReference | undefined;
  #ownerReference: ElementReference | undefined;
  readonly #reference = (element: HTMLElement | null): void => {
    this.#releasePart?.();
    this.#releasePart = undefined;
    this.#element = element;
    if (element) {
      element.part.add(this.selectPart);
      this.#releasePart = this.presentationController.registerPart(this.selectPart, element);
      attachPartReference(this, this.#consumerReference, element);
      attachPartReference(this, this.#ownerReference, element);
    } else {
      detachPartReference(this, this.#consumerReference);
      detachPartReference(this, this.#ownerReference);
    }
  };
  protected override buttonTabIndex(): string | null {
    return '-1';
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (changed.has('selectPresentation')) setPartComposition(this, this, this.selectPresentation);
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#element?.part.add(this.selectPart);
  }
  protected override buttonPartContract(): ComponentPartContract | undefined {
    const parent = this.selectContract ?? {};
    const terminal = this.partContracts.button ?? {};
    const consumer = terminal.elementReference ?? parent.elementReference;
    if (consumer !== this.#consumerReference) {
      detachPartReference(this, this.#consumerReference);
      this.#consumerReference = consumer;
      if (this.#element) attachPartReference(this, consumer, this.#element);
    }
    if (this.selectReference !== this.#ownerReference) {
      detachPartReference(this, this.#ownerReference);
      this.#ownerReference = this.selectReference;
      if (this.#element) attachPartReference(this, this.#ownerReference, this.#element);
    }
    const contract = { ...parent, ...terminal };
    const state = (native: PartState): PartState => ({ ...this.selectState, ...native });
    return {
      ...contract,
      elementReference: this.#reference,
      hostProperties: {
        ...parent.hostProperties,
        ...terminal.hostProperties,
        ...selectStateMarkers(this.selectState),
      },
      ...(typeof contract.classHook === 'function'
        ? {
            classHook: (native: PartState) =>
              (contract.classHook as (s: PartState) => string)(state(native)),
          }
        : {}),
      ...(typeof contract.styleHook === 'function'
        ? {
            styleHook: (native: PartState) =>
              (contract.styleHook as (s: PartState) => Record<string, string | number>)(
                state(native),
              ),
          }
        : {}),
      ...(typeof contract.content === 'function'
        ? {
            content: (native: PartState) =>
              (contract.content as (s: PartState) => unknown)(state(native)),
          }
        : {}),
      ...(contract.renderDelegate
        ? {
            renderDelegate: (context) =>
              contract.renderDelegate!({ ...context, state: state(context.state) }),
          }
        : {}),
    };
  }
}
export class TpSelectTrigger extends SelectAction {
  static override tagName = 'tp-select-trigger';
  protected override selectPart = 'select-trigger';
}
export class TpSelectClear extends SelectAction {
  static override tagName = 'tp-select-clear';
  protected override selectPart = 'select-clear';
}
export class TpSelectChipRemove extends SelectAction {
  static override tagName = 'tp-select-chip-remove';
  protected override selectPart = 'select-chip-remove';
  protected override buttonTabIndex(): string | null {
    return this.disabled ? '-1' : this.nativeAction ? null : '0';
  }
}
