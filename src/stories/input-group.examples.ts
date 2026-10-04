import { interactiveMarkupExample } from './documentation-examples.js';
import { setupInputGroupExample } from './input-group-example.js';
import setupSource from './input-group-example.js?raw';

const icon = (name: string, slot = '') =>
  `<tp-icon ${slot ? `slot="${slot}"` : ''} data-input-icon="${name}"></tp-icon>`;
const field = (label: string, content: string, attributes = '') =>
  `<tp-field label="${label}" ${attributes}>${content}</tp-field>`;
const group = (content: string, attributes = '') =>
  `<tp-input-group ${attributes}>${content}</tp-input-group>`;
const input = (attributes = '') => `<tp-input ${attributes}></tp-input>`;
const area = (attributes = '') => `<tp-text-area ${attributes}></tp-text-area>`;
const stack = (content: string) =>
  `<div style="display:grid;gap:var(--tp-space-5);max-inline-size:calc(var(--tp-spacing) * 120)">${content}</div>`;
const hint = (keys: string, slot: string) => `<tp-key-hint slot="${slot}">${keys}</tp-key-hint>`;
const action = (text: string, attributes = '') => `<tp-button ${attributes}>${text}</tp-button>`;
const menu = (
  label: string,
  options: string[],
  slot: string,
) => `<tp-menu slot="${slot}" label="${label}" data-choice>
  <tp-button slot="trigger" variant="ghost" size="xs"><span data-choice-label>${options[0]}</span>${icon('down', 'icon-end')}</tp-button>
  ${options.map((value) => `<tp-menu-item value="${value}">${value}</tp-menu-item>`).join('\n')}
</tp-menu>`;

function example(title: string, content: string, description?: string) {
  const id = 'input-group-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const markup = `<div id="${id}">${stack(content)}<output aria-live="polite"></output></div>`;
  return interactiveMarkupExample(
    title,
    markup,
    setupInputGroupExample,
    `${setupSource.replaceAll("'../icons/", "'@tweakpad/ui/icons/").replaceAll(".js';", "';")}
setupInputGroupExample(document.getElementById('${id}'));`,
    description,
  );
}

export const inputGroupExamples = [
  example(
    'Button group composition',
    '<tp-button-group label="Search actions">' +
      group(
        input('label="Search query" placeholder="Search documents"') +
          icon('search', 'inline-start'),
      ) +
      action('Search', 'variant="outline"') +
      '</tp-button-group>' +
      '<tp-button-group label="Connection settings"><tp-button-group-text>https://</tp-button-group-text>' +
      group(
        input('label="Hostname" default-value="example.com"') + icon('settings', 'inline-end'),
      ) +
      '</tp-button-group>',
  ),
  example(
    'Basic',
    [
      field('Standalone input', input('placeholder="Name"')),
      field('Grouped input', group(input('placeholder="Name"'))),
      field('Disabled', group(input('disabled placeholder="Unavailable"'))),
      field(
        'Invalid',
        group(input('invalid default-value="not-an-email"')),
        'error="Enter a valid email address."',
      ),
    ].join('\n'),
  ),
  example(
    'Addons',
    [
      field(
        'Search',
        group(
          icon('search', 'inline-start') + input('type="search" placeholder="Search documents"'),
        ),
      ),
      field('Account', group(input('placeholder="Username"') + icon('account', 'inline-end'))),
      field(
        'Amount',
        group(
          '<span slot="inline-start">$</span>' +
            input('inputmode="decimal" placeholder="0.00"') +
            '<span slot="inline-end">USD</span>',
        ),
      ),
      field(
        'Website',
        group(
          '<span slot="prefix">https://</span>' +
            input('placeholder="example"') +
            '<span slot="suffix">.com</span>',
        ),
      ),
      field(
        'First name',
        group('<span slot="block-start">Public profile</span>' + input('placeholder="Alex"')),
      ),
      field(
        'Biography',
        group(
          input('maxlength="240" placeholder="A short introduction"') +
            '<span slot="block-end" data-character-count></span>',
          'data-count="240"',
        ),
      ),
      field(
        'Optional account',
        group(input() + '<span slot="inline-end">(optional)</span>'),
        'description="You can add this later."',
      ),
      `<tp-field><tp-input-group><tp-label slot="inline-start" for="input-group-inline-name">Name</tp-label>${input('id="input-group-inline-name" aria-label="Name"')}</tp-input-group></tp-field>`,
    ].join('\n'),
  ),
  example(
    'Actions',
    [
      ...['ghost', 'outline', 'secondary'].map((variant) =>
        field(
          `${variant} action`,
          group(
            input('default-value="Clear this text"') +
              action('Clear', `slot="action" variant="${variant}" data-clear`),
          ),
        ),
      ),
      field(
        'Copy a read-only link',
        group(
          input('readonly default-value="https://example.com/project"') +
            action('Copy', 'slot="action" data-copy'),
        ),
      ),
      field(
        'Icon action',
        group(
          input('default-value="Draft"') +
            action(
              icon('trash', 'icon-start'),
              'slot="action" size="icon-xs" aria-label="Clear draft" data-clear',
            ),
        ),
      ),
      field(
        'Disabled editor with an independent action',
        group(
          input('disabled default-value="https://example.com/project"') +
            action('Copy', 'slot="action" data-copy'),
        ),
      ),
    ].join('\n'),
  ),
  example(
    'Tooltip, menu and popover',
    [
      field(
        'Project identifier',
        group(
          input('placeholder="project-name"') +
            `<tp-tooltip slot="inline-end" label="Use letters, numbers and hyphens.">${action(icon('book', 'icon-start'), 'slot="trigger" variant="ghost" size="icon-xs" aria-label="Identifier help"')}</tp-tooltip>`,
        ),
      ),
      field(
        'Phone number',
        group(
          menu('Country code', ['+1', '+44', '+46'], 'inline-start') +
            input('type="tel" placeholder="555 0100"'),
        ),
      ),
      field(
        'Search scope',
        group(
          input('type="search" placeholder="Search"') +
            menu('Search in', ['Documentation', 'Blog posts', 'Changelog'], 'inline-end'),
        ),
      ),
      field(
        'Connection',
        group(
          `<tp-popover slot="inline-start" label="Connection information">${action(icon('book', 'icon-start'), 'slot="trigger" size="icon-xs" variant="secondary" aria-label="Connection information"')}<span slot="title">Connection information</span><span slot="description">Check the destination before sharing sensitive information.</span>${action('Done', 'slot="close"')}</tp-popover><span slot="inline-start">https://</span>` +
            input('placeholder="example.com"'),
        ),
      ),
    ].join('\n'),
  ),
  example(
    'Keyboard hints and status',
    [
      field(
        'Quick search',
        group(hint('⌘K', 'inline-start') + input('type="search" placeholder="Search"')),
      ),
      field(
        'Search applications',
        group(
          input('type="search" placeholder="Search apps"') +
            '<span slot="inline-end">Ask AI</span>' +
            hint('Tab', 'inline-end'),
        ),
      ),
      field(
        'Command search',
        group(
          icon('sparkle', 'inline-start') +
            input('placeholder="Type a command"') +
            hint('Ctrl', 'inline-end') +
            hint('K', 'inline-end'),
        ),
      ),
      field(
        'Available username',
        group(input('default-value="alex"') + icon('check', 'inline-end')),
        'description="This username is available."',
      ),
      field(
        'Documentation',
        group(
          icon('search', 'inline-start') +
            input('type="search"') +
            '<span slot="inline-end">12 results</span>',
        ),
      ),
      field(
        'Loading account',
        group(
          input('disabled default-value="alex"') +
            '<tp-spinner slot="inline-end" size="sm" label="Loading account"></tp-spinner>',
        ),
      ),
      field(
        'Saving changes',
        group(
          '<tp-spinner slot="inline-start" size="sm" label=""></tp-spinner>' +
            input('disabled placeholder="Saving changes"') +
            '<span slot="inline-end">Saving…</span>',
        ),
      ),
    ].join('\n'),
  ),
  example(
    'In a card',
    `<tp-card>
    <span slot="header">Contact details</span><span slot="description">Keep your profile up to date.</span>
    <tp-form>
      ${field('Email address', group(input('name="email" type="email" required placeholder="you@example.com"') + '<span slot="inline-end">@</span>'))}
      ${field('Website URL', group('<span slot="inline-start">https://</span>' + input('name="website" placeholder="example.com"') + icon('share', 'inline-end')))}
      ${field('Feedback', group(area('name="feedback" maxlength="500" placeholder="Share your thoughts"') + '<span slot="block-end" data-character-count></span>', 'data-count="500"'))}
      <div slot="actions">${action('Reset', 'type="reset" variant="outline"')}${action('Save', 'type="submit"')}</div>
    </tp-form>
  </tp-card>`,
  ),
  example(
    'Multiline editors',
    [
      field('Standalone textarea', area('placeholder="Write a message"')),
      field('Grouped textarea', group(area('placeholder="Write a message"'))),
      field(
        'Invalid message',
        group(area('invalid default-value="Message too short"')),
        'error="Provide more detail."',
      ),
      field('Disabled message', group(area('disabled placeholder="Editing unavailable"'))),
      field(
        'Prompt',
        group(
          '<span slot="block-start">Ask, search or chat</span>' +
            area('placeholder="How can we help?"'),
        ),
      ),
      `<tp-form>${field('Comment', group(area('name="comment" maxlength="280" required placeholder="Share your thoughts"') + '<span slot="block-end" data-character-count></span>' + action('Cancel', 'slot="block-end" type="reset" variant="ghost" size="sm"') + action('Post comment', 'slot="block-end" type="submit" size="sm"'), 'data-count="280"'))}</tp-form>`,
      field(
        'Code editor',
        group(
          `<span slot="block-start">${icon('terminal')} script.js</span>${action('Clear', 'slot="block-start" data-clear variant="ghost" size="xs"')}${action('Copy', 'slot="block-start" data-copy variant="ghost" size="xs"')}${area('default-value="console.log(\'Hello, world!\');"')}<span slot="block-end">JavaScript</span>`,
        ),
      ),
    ].join('\n'),
  ),
  example(
    'Native editor interoperability',
    `<tp-input-group>
    <textarea aria-label="Autoresizing message" placeholder="This native editor grows with its content." style="field-sizing:content;min-block-size:calc(var(--tp-control-height-md) * 2);inline-size:100%;font:inherit;padding:var(--tp-space-2);resize:vertical"></textarea>
    <span slot="block-end">Native editing and selection are retained.</span>
  </tp-input-group>`,
    'A native editor can participate in the same shared boundary through the public default slot.',
  ),
];
