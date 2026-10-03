import { comboboxStateMarkers } from './state.js';
import { setPartComposition } from '../../presentation/controller.js';
import type { PartPresentation } from '../../presentation/resolver.js';
import { TpButton } from '../button.js';
import type { PropertyValues } from 'lit';
import type { ComponentPartContract, ElementReference, PartState } from '../../foundation/part.js';
import { attachPartReference, detachPartReference } from '../../foundation/part-reference.js';

/** Companion actions retain Button's press, native/delegated anatomy and mark owners. */
class ComboboxAction extends TpButton {
  static presentationTagName = 'tp-button';
  static presentationFamilyTagNames = ['tp-combobox'];
  static override properties = {
    ...TpButton.properties,
    comboboxState: { attribute: false },
    comboboxContract: { attribute: false },
    comboboxReference: { attribute: false },
    comboboxPresentation: { attribute: false },
  };
  protected comboboxPart = '';
  comboboxState: PartState = {};
  comboboxContract: ComponentPartContract | undefined;
  comboboxReference: ElementReference | undefined;
  comboboxPresentation: PartPresentation = {};
  #element: HTMLElement | null = null;
  #releasePart: (() => void) | undefined;
  #consumerReference: ElementReference | undefined;
  #ownerReference: ElementReference | undefined;
  readonly #reference = (element: HTMLElement | null): void => {
    this.#releasePart?.();
    this.#releasePart = undefined;
    this.#element = element;
    if (element) {
      element.part.add(this.comboboxPart);
      this.#releasePart = this.presentationController.registerPart(this.comboboxPart, element);
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
    if (changed.has('comboboxPresentation'))
      setPartComposition(this, this, this.comboboxPresentation);
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#element?.part.add(this.comboboxPart);
  }
  protected override buttonPartContract(): ComponentPartContract | undefined {
    const parent = this.comboboxContract ?? {};
    const terminal = this.partContracts.button ?? {};
    const consumer = terminal.elementReference ?? parent.elementReference;
    if (consumer !== this.#consumerReference) {
      detachPartReference(this, this.#consumerReference);
      this.#consumerReference = consumer;
      if (this.#element) attachPartReference(this, consumer, this.#element);
    }
    if (this.comboboxReference !== this.#ownerReference) {
      detachPartReference(this, this.#ownerReference);
      this.#ownerReference = this.comboboxReference;
      if (this.#element) attachPartReference(this, this.#ownerReference, this.#element);
    }
    const contract = { ...parent, ...terminal };
    const state = (native: PartState): PartState => ({ ...this.comboboxState, ...native });
    return {
      ...contract,
      elementReference: this.#reference,
      hostProperties: {
        ...parent.hostProperties,
        ...terminal.hostProperties,
        ...comboboxStateMarkers(this.comboboxState),
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
export class TpComboboxTrigger extends ComboboxAction {
  static override tagName = 'tp-combobox-trigger';
  protected override comboboxPart = 'combobox-trigger';
}
export class TpComboboxClear extends ComboboxAction {
  static override tagName = 'tp-combobox-clear';
  protected override comboboxPart = 'combobox-clear';
}
export class TpComboboxChipRemove extends ComboboxAction {
  static override tagName = 'tp-combobox-chip-remove';
  protected override comboboxPart = 'combobox-chip-remove';
  protected override buttonTabIndex(): string | null {
    return this.disabled ? '-1' : this.nativeAction ? null : '0';
  }
}
