import { EASING_DIRECTIONS } from '../../foundation/easing/types.js';
import type { EasingEditorStrings, EasingPresetGroup } from './types.js';

const DIRECTION_NAME: Readonly<Record<string, keyof EasingEditorStrings>> = {
  in: 'directionIn',
  out: 'directionOut',
  'in-out': 'directionInOut',
  'out-in': 'directionOutIn',
};

const FAMILIES: ReadonlyArray<readonly [string, keyof EasingEditorStrings]> = [
  ['sine', 'familySine'],
  ['power', 'familyPower'],
  ['expo', 'familyExpo'],
  ['circ', 'familyCirc'],
  ['back', 'familyBack'],
  ['elastic', 'familyElastic'],
  ['bounce', 'familyBounce'],
];

/**
 * The built-in preset table (Widgets 6.2 Properties): basic CSS easings, four springs and one
 * group per Penner family with the four directions. Labels come from the strings so a locale
 * can rename them; ids are stable.
 */
export function builtinPresetGroups(strings: EasingEditorStrings): readonly EasingPresetGroup[] {
  const families = FAMILIES.map(([family, name]) => ({
    id: family,
    label: strings[name],
    presets: EASING_DIRECTIONS.map((direction) => ({
      id: `${family}-${direction}`,
      label: `${strings[name]} ${strings[DIRECTION_NAME[direction]!].toLowerCase()}`,
      value: `${family}(${direction})`,
    })),
  }));
  return [
    {
      id: 'basic',
      label: strings.presetBasic,
      presets: [
        { id: 'linear', label: strings.presetLinear, value: 'linear' },
        { id: 'ease', label: strings.presetEase, value: 'ease' },
        { id: 'ease-in', label: strings.presetEaseIn, value: 'ease-in' },
        { id: 'ease-out', label: strings.presetEaseOut, value: 'ease-out' },
        { id: 'ease-in-out', label: strings.presetEaseInOut, value: 'ease-in-out' },
        { id: 'steps', label: strings.presetSteps, value: 'steps(4, jump-end)' },
      ],
    },
    {
      id: 'spring',
      label: strings.presetSpring,
      presets: [
        { id: 'spring-default', label: strings.presetSpringDefault, value: 'spring(1 100 10)' },
        { id: 'spring-snappy', label: strings.presetSpringSnappy, value: 'spring(1 300 20)' },
        { id: 'spring-bouncy', label: strings.presetSpringBouncy, value: 'spring(1 200 8)' },
        { id: 'spring-strong', label: strings.presetSpringStrong, value: 'spring(1.5 400 25)' },
      ],
    },
    ...families,
  ];
}
