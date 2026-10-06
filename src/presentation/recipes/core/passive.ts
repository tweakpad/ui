import type { ComponentDefinition } from '../../definition.js';
import type { PresentationDictionary, PresentationRule } from '../../resolver.js';
import { variantPresentation } from '../shared/variant.js';

/** Variant paint for passive Badge, Bubble and List item parts; other keys stay empty. */
export function passiveVariantAppearance(
  definition: ComponentDefinition,
  paintedPart: string,
): PresentationDictionary {
  const name = definition.name;
  const passive: Record<string, readonly PresentationRule[]> = {};
  for (const part of definition.parts)
    for (const key of part.presentationKeys ?? []) {
      if (name === 'Badge' && /-variant-(subdued|tinted)$/.test(key)) continue;
      const variant = key.split('-variant-')[1];
      passive[key] =
        variant && part.name === paintedPart
          ? variantPresentation(variant, name === 'Bubble' || name === 'Badge').map((entry) =>
              name === 'Bubble' && entry.selector
                ? { ...entry, selector: entry.selector.replaceAll('&', '&:is(button,a)') }
                : name === 'Badge' && entry.selector
                  ? {
                      ...entry,
                      selector: `:host([interactive]) ${entry.selector.replaceAll('&', '&:is(button,a)')}`,
                    }
                  : entry,
            )
          : [];
    }
  return passive;
}
