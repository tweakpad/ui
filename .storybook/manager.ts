import { addons } from 'storybook/manager-api';
import { create, themes } from 'storybook/theming';

// Storybook's own UI (Controls descriptions) cannot read the library tokens, so its code font
// repeats the default `--tp-font-mono` stack.
addons.setConfig({
  theme: create({
    ...themes.normal,
    fontCode: "'Cascadia Mono', ui-monospace, sfmono-regular, menlo, monaco, consolas, monospace",
  }),
});
