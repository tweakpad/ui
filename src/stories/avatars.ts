/**
 * Sample people for avatar examples. The portraits in `assets/avatars/` are original illustrations
 * drawn for this repository; Storybook serves them at `avatars/` (see `.storybook/main.ts`), so
 * copied example markup keeps a short relative path.
 */
export interface SamplePerson {
  readonly handle: string;
  readonly name: string;
  readonly initials: string;
  readonly src: string;
}

export const samplePeople = [
  { handle: 'maravoss', name: 'Mara Voss', initials: 'MV', src: 'avatars/mara-voss.svg' },
  { handle: 'theolind', name: 'Theo Lindqvist', initials: 'TL', src: 'avatars/theo-lindqvist.svg' },
  { handle: 'inesokafor', name: 'Ines Okafor', initials: 'IO', src: 'avatars/ines-okafor.svg' },
  { handle: 'ravic', name: 'Ravi Castellano', initials: 'RC', src: 'avatars/ravi-castellano.svg' },
] as const satisfies readonly SamplePerson[];

export const [mara, theo, ines, ravi] = samplePeople;
