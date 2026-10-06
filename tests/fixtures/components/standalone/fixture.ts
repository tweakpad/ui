// Defines exactly one component, chosen by ?component=, without the global register module.
// Verifies that the component and the library elements it renders are defined and styled,
// and that no unrelated component is registered.
import { defineElement } from '../../../../src/foundation/define.js';

const modules: Record<string, () => Promise<Record<string, unknown>>> = {
  TpButton: () => import('../../../../src/components/button.js'),
  TpCarousel: () => import('../../../../src/components/carousel/index.js'),
  TpTime: () => import('../../../../src/components/time/index.js'),
  TpMessage: () => import('../../../../src/components/message/index.js'),
  TpSwitch: () => import('../../../../src/components/switch/index.js'),
};
const markup: Record<string, string> = {
  TpButton: '<tp-button loading>Save</tp-button>',
  TpCarousel:
    '<tp-carousel label="Numbers"><div>One</div><div>Two</div><div>Three</div></tp-carousel>',
  TpTime: '<tp-time datetime="2026-10-05T14:30:00Z"></tp-time>',
  TpMessage: '<tp-message author="Ada" timestamp="2026-10-05T14:30:00Z">Hello</tp-message>',
  TpSwitch: '<tp-switch>Notifications</tp-switch>',
};
const name = new URLSearchParams(location.search).get('component') ?? 'TpButton';
const module = await modules[name]!();
const constructor = module[name] as CustomElementConstructor & { tagName: string };
defineElement(constructor.tagName, constructor);
document.getElementById('stage')!.innerHTML = markup[name]!;
(window as unknown as { standaloneReady: boolean }).standaloneReady = true;
