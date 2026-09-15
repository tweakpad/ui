export type CustomElementConstructorWithTag = CustomElementConstructor & {
  readonly tagName?: string;
};

export function defineElement(tagName: string, constructor: CustomElementConstructor): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, constructor);
  }
}
