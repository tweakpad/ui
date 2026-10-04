import { createId } from '../id.js';
import { markFeedbackRoot } from './feedback-scope.js';

/** DOM clone adaptation: native values, coherent local IDs, inert non-form participation. */
export function cloneFeedback(element: Element): {
  element: HTMLElement;
  mapping: Map<Element, Element>;
  dispose(): void;
} {
  const clone = element.cloneNode(true) as HTMLElement,
    release = markFeedbackRoot(clone);
  const originals = [element, ...element.querySelectorAll('*')],
    copies = [clone, ...clone.querySelectorAll('*')];
  const mapping = new Map<Element, Element>(),
    ids = new Map<string, string>(),
    suffix = createId('drag-preview');
  for (let index = 0; index < copies.length; index++) {
    const source = originals[index]!,
      target = copies[index]!;
    mapping.set(source, target);
    if (target.id) {
      const id = `${target.id}-${suffix}`;
      ids.set(target.id, id);
      target.id = id;
    }
    if (['input', 'select', 'textarea', 'button'].includes(target.localName)) {
      const control = target as HTMLInputElement,
        original = source as HTMLInputElement;
      if (control.type !== 'file' && 'value' in original) control.value = original.value;
      if ('checked' in original) control.checked = original.checked;
      if (target.localName === 'select')
        for (let i = 0; i < (target as HTMLSelectElement).options.length; i++)
          (target as HTMLSelectElement).options[i]!.selected =
            (source as HTMLSelectElement).options[i]?.selected ?? false;
      control.name = `${suffix}-${control.name}`;
      control.disabled = true;
      control.setAttribute('form', suffix);
    }
    if (target.localName === 'canvas') {
      const canvas = source as HTMLCanvasElement;
      if (canvas.width && canvas.height)
        (target as HTMLCanvasElement).getContext('2d')?.drawImage(canvas, 0, 0);
    }
    if (target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    if (target.localName.includes('-')) {
      target.setAttribute('disabled', '');
      target.setAttribute('form', suffix);
    }
  }
  for (const target of copies)
    for (const attribute of [...target.attributes]) {
      if (
        [
          'for',
          'aria-labelledby',
          'aria-describedby',
          'aria-controls',
          'aria-owns',
          'headers',
        ].includes(attribute.name)
      ) {
        const local = attribute.value
          .split(/\s+/)
          .map((id) => ids.get(id))
          .filter(Boolean)
          .join(' ');
        if (local) target.setAttribute(attribute.name, local);
        else target.removeAttribute(attribute.name);
      } else if (attribute.value.startsWith('#') && ids.has(attribute.value.slice(1)))
        target.setAttribute(attribute.name, `#${ids.get(attribute.value.slice(1))}`);
      else if (attribute.value.includes('url(#'))
        target.setAttribute(
          attribute.name,
          attribute.value.replace(/url\(#([^)]*)\)/g, (match, id: string) =>
            ids.has(id) ? `url(#${ids.get(id)})` : match,
          ),
        );
    }
  clone.setAttribute('inert', '');
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('tabindex', '-1');
  clone.setAttribute('data-preview', '');
  return {
    element: clone,
    mapping,
    dispose: () => {
      clone.remove();
      release();
    },
  };
}
