import { html } from 'lit';
import './message-scroller-streaming.js';
import { messageScrollerUseCases } from './message-scroller-use-cases.js';
import streamingSource from './message-scroller-streaming.ts?raw';
import casesSource from './message-scroller-use-cases.ts?raw';

const packageImports = (source: string) =>
  source
    .replaceAll('../components/message-scroller/index.js', '@tweakpad/ui')
    .replaceAll('../foundation/motion.js', '@tweakpad/ui')
    .replaceAll(/'\.\.\/icons\/([^']+)\.js'/g, "'@tweakpad/ui/icons/$1'");
const sharedCode = `import '@tweakpad/ui/register';\nimport '@tweakpad/ui/styles.css';\n${packageImports(streamingSource)}`;
// A single copyable module, with the shared demo owner defined before its subclass.
const standaloneCases = casesSource
  .replace(/import \{ css, html, nothing, type PropertyValues \} from 'lit';\n/, '')
  .replace(/import type \{ TpMessageScroller \} from '[^']+';\n/, '')
  .replace(/import \{ chatIcons \} from '[^']+';\n/, '')
  .replace(/import \{[^}]+\} from '\.\/message-scroller-streaming.js';\n/, '');
const caseCode = `${sharedCode.replace('type CSSResultGroup', 'type PropertyValues, type CSSResultGroup')}\n${packageImports(standaloneCases)}`;
const streaming = {
  title: 'Following the live edge',
  description:
    'Send two turns. Scroll up while a reply streams to release following, then press the Return control to catch up and re-arm it.',
  code: `${sharedCode}\n// Mount <message-scroller-demo variant="streaming"></message-scroller-demo>`,
  render: () => html`<message-scroller-demo variant="streaming"></message-scroller-demo>`,
};
export const messageScrollerExamples = messageScrollerUseCases.flatMap((example) => {
  const demo = {
    title: example.title,
    description: example.instruction,
    code: `${caseCode}\n// Mount <message-scroller-use-case example="${example.id}"></message-scroller-use-case>`,
    render: () =>
      html`<message-scroller-use-case .example=${example.id}></message-scroller-use-case>`,
  };
  return example.id === 'previous-context' ? [demo, streaming] : [demo];
});
