import { moduleExample } from './documentation-examples.js';
import { setupButtonGroupExample } from './button-group-example.js';
import setupSource from './button-group-example.js?raw';

const button = (text: string, attributes = '') =>
  `<tp-button variant="outline" ${attributes}>${text}</tp-button>`;
const icon = (name: string) => `<tp-icon slot="icon-start" data-group-icon="${name}"></tp-icon>`;
const iconButton = (name: string, label: string) =>
  button(icon(name), `size="icon" aria-label="${label}" data-echo`);
const group = (label: string, content: string, attributes = '') =>
  `<tp-button-group label="${label}" ${attributes}>${content}</tp-button-group>`;
const scrollable = (label: string, content: string) =>
  `<tp-scroll-area label="${label}" orientation="horizontal"><div style="box-sizing:border-box;inline-size:max-content;min-inline-size:100%;padding:var(--tp-space-2)">${content}</div></tp-scroll-area>`;
const input = (label: string, attributes = '') =>
  `<tp-input label="${label}" ${attributes}></tp-input>`;
const options = (values: string[]) =>
  values.map((value) => `<option value="${value}">${value}</option>`).join('');
function example(title: string, content: string, description?: string) {
  const id = 'button-group-' + title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-');
  return moduleExample({
    title,
    id,
    markup: `${content}<output aria-live="polite"></output>`,
    description,
    wrapperStyle: 'display:grid;gap:var(--tp-space-5);max-inline-size:36rem',
    setup: setupButtonGroupExample,
    source: setupSource,
    call: `setupButtonGroupExample(document.getElementById('${id}'));`,
  });
}
export const buttonGroupExamples = [
  example(
    'Sizes and independent controls',
    ['sm', 'default', 'lg']
      .map((size) =>
        group(
          `${size} actions`,
          button('Archive', `size="${size}" data-echo`) +
            button('Report', `size="${size}" data-echo`) +
            button('Unavailable', `size="${size}" disabled`),
        ),
      )
      .join('\n') +
      group(
        'Unjoined actions',
        button('Save', 'data-echo') + button('Cancel', 'data-echo'),
        'data-unjoined',
      ),
  ),
  example(
    'Input on either edge',
    group(
      'Search',
      input('Search query', 'placeholder="Search documents"') +
        button(icon('search'), 'size="icon" aria-label="Search" data-echo'),
    ) +
      group(
        'Send message',
        button('Send', 'data-echo') + input('Message', 'placeholder="Type a message"'),
      ),
  ),
  example(
    'Text and label segments',
    group(
      'Team invitation',
      '<tp-button-group-text>example.com/</tp-button-group-text>' +
        input('Workspace slug', 'placeholder="workspace"'),
    ) +
      group(
        'GPU settings',
        '<tp-button-group-text><tp-label for="group-gpu-size">GPU size</tp-label></tp-button-group-text>' +
          '<tp-input id="group-gpu-size" placeholder="16 GB"></tp-input>',
      ) +
      group(
        'Reaction',
        '<tp-toggle variant="outline" data-like>Like</tp-toggle>' +
          '<tp-button-group-text data-like-count>1,200</tp-button-group-text>',
      ),
  ),
  example(
    'Separator and split action',
    group(
      'Clipboard',
      '<tp-button variant="secondary" data-echo>Copy</tp-button><tp-separator></tp-separator><tp-button variant="secondary" data-echo>Paste</tp-button>',
    ) +
      group(
        'Create document',
        '<tp-button variant="secondary" data-echo>Create</tp-button><tp-separator></tp-separator><tp-menu label="Create options"><tp-button slot="trigger" variant="secondary" size="icon" aria-label="Create options">' +
          icon('down') +
          '</tp-button><tp-menu-item value="Document">Document</tp-menu-item><tp-menu-item value="Folder">Folder</tp-menu-item></tp-menu>',
      ),
  ),
  example(
    'Menu and popover',
    group(
      'Document actions',
      button('Update', 'data-echo') +
        `<tp-menu label="More document actions"><tp-button slot="trigger" variant="outline" size="icon" aria-label="More document actions">${icon('down')}</tp-button><tp-menu-item value="Share">${icon('share').replace('slot="icon-start"', '')}Share<tp-key-hint-group data-menu-shortcut separator="none" platform="mac"><tp-key-hint key="command"></tp-key-hint><tp-key-hint key="S"></tp-key-hint></tp-key-hint-group></tp-menu-item><tp-menu-item value="Archive">Archive</tp-menu-item><tp-separator></tp-separator><tp-menu-item value="Delete" variant="destructive">${icon('trash').replace('slot="icon-start"', '')}Delete</tp-menu-item></tp-menu>`,
    ) +
      group(
        'Assistant actions',
        button(icon('models') + 'Assistant', 'data-echo') +
          `<tp-popover label="Assistant task"><tp-button slot="trigger" variant="outline" size="icon" aria-label="Configure assistant">${icon('down')}</tp-button><span slot="title">Assistant task</span><span slot="description">Describe what the assistant should do.</span><tp-field label="Task"><tp-text-area placeholder="Describe a task"></tp-text-area></tp-field><tp-button slot="close">Done</tp-button></tp-popover>`,
      ),
  ),
  example(
    'Select and native select',
    `<tp-form><tp-label for="transfer-amount">Transfer amount</tp-label>${group('Transfer fields', `<tp-select label="Currency" name="currency" default-value="USD">${options(['USD', 'EUR', 'GBP'])}</tp-select>` + input('Amount', 'id="transfer-amount" name="amount" inputmode="decimal" placeholder="0.00"') + button('Send', 'type="submit"'))}</tp-form>` +
      group(
        'Duration',
        `<tp-native-select label="Duration unit" default-value="Hours">${options(['Hours', 'Days', 'Weeks'])}</tp-native-select>` +
          input('Duration', 'inputmode="numeric" placeholder="1"'),
      ),
  ),
  example(
    'Input group and fields',
    `<tp-field label="Dimensions">${group('Dimensions', '<tp-input-group><span slot="inline-start">W</span>' + input('Width', 'inputmode="decimal" placeholder="100"') + '<span slot="inline-end">px</span></tp-input-group>' + iconButton('settings', 'Dimension settings'))}</tp-field>` +
      group(
        'Find document',
        `<tp-input-group><tp-icon slot="inline-start" data-group-icon="search"></tp-icon>${input('Document search', 'placeholder="Search…"')}</tp-input-group>` +
          button('Search', 'data-echo'),
      ),
  ),
  example(
    'Nested groups and voice action',
    group(
      'Message composer',
      group('Attachments', iconButton('plus', 'Add attachment')) +
        group(
          'Message',
          `<tp-input-group>${input('Message', 'placeholder="Send a message…"')}<tp-tooltip slot="inline-end" label="Toggle voice mode"><tp-toggle slot="trigger" data-voice variant="ghost" size="sm" aria-label="Voice mode">${icon('bell').replace('slot="icon-start"', '')}</tp-toggle></tp-tooltip></tp-input-group>`,
        ),
    ),
    'The application toggles text entry independently from the voice action. This example does not record audio.',
  ),
  example(
    'Navigation and icon actions',
    group('History', button('Previous', 'href="#previous"') + button('Next', 'href="#next"')) +
      group(
        'Document tools',
        iconButton('search', 'Find') + iconButton('share', 'Share') + iconButton('trash', 'Delete'),
      ),
  ),
  example(
    'Pagination',
    scrollable(
      'Result page controls',
      group('Result pages', '<tp-pagination label="Results" pages="5" page="2"></tp-pagination>'),
    ),
    'Pagination retains destination links and current-page semantics. The application accepts page changes without leaving this example.',
  ),
  example(
    'Split pagination',
    scrollable(
      'Split result page controls',
      group(
        'Result navigation',
        group(
          'Page numbers',
          '<tp-pagination label="Result pages" pages="5" page="2" data-pages-only></tp-pagination>',
        ) +
          group(
            'Direction links',
            '<tp-pagination label="Previous and next results" pages="5" page="2" data-directions-only></tp-pagination>',
          ),
      ),
    ),
    'Both Pagination instances share the same application page. Nested groups retain their separate seams.',
  ),
  example(
    'Text alignment',
    `<tp-field label="Text alignment"><tp-toggle-group label="Text alignment" variant="outline" size="sm" spacing="0" default-value='["left"]'>${['Left', 'Center', 'Right', 'Justify'].map((label) => `<tp-toggle value="${label.toLowerCase()}">${label}</tp-toggle>`).join('')}</tp-toggle-group></tp-field><p data-aligned-text>Choose how this paragraph is aligned. Toggle Group owns single selection and keyboard navigation.</p>`,
    'Use Toggle Group when the joined controls represent a shared value; Button Group alone does not imply selection.',
  ),
  example(
    'Vertical and nested vertical groups',
    group(
      'Tools',
      iconButton('search', 'Find') + iconButton('settings', 'Settings'),
      'orientation="vertical"',
    ) +
      group(
        'Workspace tools',
        group(
          'Document tools',
          iconButton('folder', 'Open folder') + iconButton('book', 'Documentation'),
          'orientation="vertical"',
        ) +
          group(
            'Account tools',
            iconButton('account', 'Account') + iconButton('logout', 'Sign out'),
            'orientation="vertical"',
          ),
        'orientation="vertical"',
      ),
  ),
];
