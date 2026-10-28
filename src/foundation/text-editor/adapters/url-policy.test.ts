/**
 * The URL policy on every input path of both engine adapters (node environment; Foundation
 * `mdf-urls`, Widgets `uwg-te-req-content-3`, `uwg-te-req-content-6`, `uwg-te-req-engine-12`).
 *
 * Link destinations pass the link protocols (http, https, mailto, tel, relative references and
 * fragments) and image sources the image protocols (http, https and relative references), through
 * the shared `allowedUrl`, `linkProtocols` and `imageProtocols` resolvers. A rejected link keeps
 * its text without the link; a rejected image becomes a paragraph of its alternative text, keeping
 * its identifier, or is removed when it has none. Content in HTML, Markdown and native JSON, a
 * pasted or inserted fragment, the link and image actions, the inline input rules and a pasted
 * single URL all drop the same destinations, the same way on both engines.
 */
import { describe, expect, it } from 'vitest';
import { allowedUrl, imageProtocols, linkProtocols } from '../../markdown/url.js';
import { readClipboardHtml } from '../content/html.js';
import { htmlSource } from '../content/html-source.test.js';
import type { TextEditorEngineInstance } from '../engine.js';
import { matchAutolink, matchInlineRule, matchUrl } from '../input-rules.js';
import {
  CONTENT_ENGINES,
  idSequence,
  lexicalContent,
  tiptapContent,
} from './content-engines.test.js';
import { TEST_URLS } from './shared/test-helpers.test.js';

/** Link destinations the default policy rejects; none holds Markdown syntax characters. */
const REJECTED_LINKS = [
  'javascript:alert(1)',
  'JavaScript:void(0)',
  'java\tscript:alert(1)',
  'vbscript:msgbox(1)',
  'data:text/plain,hello',
  'file:///etc/hosts',
] as const;

/** Image sources the default policy rejects. */
const REJECTED_IMAGES = [
  'javascript:alert(1)',
  'data:image/png;base64,AAAA',
  'mailto:frames@studio.example',
  'ftp://files.studio.example/kiln.png',
] as const;

/** Destinations the policy keeps. */
const ALLOWED_LINKS = [
  'https://studio.example/glazes',
  'http://studio.example',
  'mailto:desk@studio.example',
  'tel:+15550100',
  '/members/rules',
  '#firing',
  'notes/kiln.html',
] as const;
const ALLOWED_IMAGES = [
  'https://studio.example/kiln.png',
  'shelf/plate.svg',
  'blob:https://studio.example/1',
] as const;

const escapeHtml = (value: string) =>
  value.replace(/&/gu, '&amp;').replace(/"/gu, '&quot;').replace(/</gu, '&lt;');

const EXECUTE = { reason: 'imperative-action', focus: false } as const;

/** The document of a link and an image, as the canonical HTML of the profile writes it. */
const linkAndImage = (href: string, src: string, alt: string) =>
  [
    `<p data-id="u000000001">Read <a href="${escapeHtml(href)}">the rules</a> first.</p>`,
    `<img data-id="u000000002" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">`,
    '<p data-id="u000000003">End.</p>',
  ].join('\n');

/** What a load leaves of `linkAndImage` when both destinations are rejected. */
const dropped = (alt: string) =>
  [
    '<p data-id="u000000001">Read the rules first.</p>',
    ...(alt ? [`<p data-id="u000000002">${alt}</p>`] : []),
    '<p data-id="u000000003">End.</p>',
  ].join('\n');

const EMPTY = '<p data-id="u000000009"></p>';

describe('the shared resolvers (mdf-urls)', () => {
  it('reject the destinations of these cases and keep the allowed ones', () => {
    for (const href of REJECTED_LINKS)
      expect(allowedUrl(href, linkProtocols(null)), href).toBe(false);
    for (const src of REJECTED_IMAGES)
      expect(allowedUrl(src, imageProtocols(null)), src).toBe(false);
    for (const href of ALLOWED_LINKS)
      expect(allowedUrl(href, linkProtocols(null)), href).toBe(true);
    for (const src of ALLOWED_IMAGES) expect(allowedUrl(src, imageProtocols(null)), src).toBe(true);
    // The widget's policy is the default one.
    expect(TEST_URLS).toEqual({ links: linkProtocols(null), images: imageProtocols(null) });
  });
});

describe.each(CONTENT_ENGINES)('$name: the URL policy on every input path', (engine) => {
  const mount = (content = EMPTY) => engine.mount({ content, format: 'html' });

  it.each(
    REJECTED_LINKS.map((href, index) => [href, REJECTED_IMAGES[index % REJECTED_IMAGES.length]!]),
  )('HTML initial content and setContent drop %j and %j', (href, src) => {
    expect(mount(linkAndImage(href, src, 'A kiln')).getContent('html')).toBe(dropped('A kiln'));
    const instance = mount();
    instance.setContent(linkAndImage(href, src, ''), 'html');
    expect(instance.getContent('html')).toBe(dropped(''));
  });

  it.each(
    ALLOWED_LINKS.map((href, index) => [href, ALLOWED_IMAGES[index % ALLOWED_IMAGES.length]!]),
  )('HTML keeps %j and %j', (href, src) => {
    const html = linkAndImage(href, src, 'A kiln');
    expect(mount(html).getContent('html')).toBe(html);
  });

  it.each(REJECTED_LINKS.filter((href) => !/\s/u.test(href)))(
    'Markdown drops the link %j and the image sources the policy rejects',
    (href) => {
      for (const src of REJECTED_IMAGES) {
        const instance = mount();
        instance.setContent(`Read [the rules](${href}) first.\n\n![A kiln](${src})\n`, 'markdown');
        const html = instance.getContent('html') as string;
        expect(html, src).not.toMatch(/<a |<img /u);
        expect(instance.getContent('text'), src).toBe('Read the rules first.\n\nA kiln');
      }
    },
  );

  it('native JSON with rejected destinations loads without them', () => {
    const source = mount(
      linkAndImage('https://keep.example/a', 'https://keep.example/b.png', 'A kiln'),
    );
    const json = JSON.stringify(source.getContent('json'));
    for (const [index, href] of REJECTED_LINKS.entries()) {
      const src = REJECTED_IMAGES[index % REJECTED_IMAGES.length]!;
      const native = JSON.parse(
        json
          .replace('https://keep.example/a', JSON.stringify(href).slice(1, -1))
          .replace('https://keep.example/b.png', JSON.stringify(src).slice(1, -1)),
      ) as unknown;
      const instance = mount();
      instance.setContent(native, 'json');
      expect(instance.getContent('html'), href).toBe(dropped('A kiln'));
    }
  });

  it('an inserted or pasted fragment drops rejected destinations', () => {
    for (const [index, href] of REJECTED_LINKS.entries()) {
      const src = REJECTED_IMAGES[index % REJECTED_IMAGES.length]!;
      const payload = `<div data-text-editor-fragment="blocks">${linkAndImage(href, src, 'A kiln')}</div>`;
      const { fragment } = readClipboardHtml(htmlSource(payload), { createId: idSequence('p') });
      const instance = mount();
      expect(
        instance.execute(
          [
            {
              type: 'content.insert',
              content: fragment,
              at: { kind: 'text', anchor: { block: 'u000000009', offset: 0 } },
            },
          ],
          EXECUTE,
        ),
        href,
      ).toBe(true);
      const html = instance.getContent('html') as string;
      expect(html, href).not.toMatch(/href=|src=/u);
      expect(instance.getContent('text'), href).toBe('Read the rules first.\n\nA kiln\n\nEnd.');
    }
  });

  it('link.set refuses a rejected destination and accepts an allowed one', () => {
    const select = (instance: TextEditorEngineInstance) =>
      instance.execute(
        [
          {
            type: 'selection.set',
            selection: {
              kind: 'text',
              anchor: { block: 'u000000001', offset: 0 },
              head: { block: 'u000000001', offset: 4 },
            },
          },
        ],
        EXECUTE,
      );
    const original = '<p data-id="u000000001">Kiln rules</p>';
    for (const href of REJECTED_LINKS) {
      const instance = mount(original);
      select(instance);
      expect(instance.execute([{ type: 'link.set', href }], EXECUTE), href).toBe(false);
      expect(instance.getContent('html'), href).toBe(original);
    }
    for (const href of ALLOWED_LINKS) {
      const instance = mount(original);
      select(instance);
      expect(instance.execute([{ type: 'link.set', href }], EXECUTE), href).toBe(true);
      expect(instance.getContent('html'), href).toBe(
        `<p data-id="u000000001"><a href="${escapeHtml(href)}">Kiln</a> rules</p>`,
      );
    }
  });

  it('inserting an image or changing its source refuses a rejected source', () => {
    for (const src of REJECTED_IMAGES) {
      const instance = mount();
      expect(
        instance.execute(
          [{ type: 'blocks.insert', kind: 'image', attrs: { src, alt: 'A kiln' } }],
          EXECUTE,
        ),
        src,
      ).toBe(false);
      expect(instance.getContent('html'), src).toBe(EMPTY);
      const image = mount(linkAndImage('#a', ALLOWED_IMAGES[0], 'A kiln'));
      expect(
        image.execute([{ type: 'block.set-attrs', id: 'u000000002', attrs: { src } }], EXECUTE),
        src,
      ).toBe(false);
      expect(image.getContent('html'), src).toBe(linkAndImage('#a', ALLOWED_IMAGES[0], 'A kiln'));
    }
  });
});

describe('the URL policy across engines (uwg-te-req-engine-12)', () => {
  it('both engines write the same content for every rejected destination in every format', () => {
    for (const [index, href] of REJECTED_LINKS.entries()) {
      const src = REJECTED_IMAGES[index % REJECTED_IMAGES.length]!;
      const [first, second] = [tiptapContent, lexicalContent].map((engine) =>
        engine.mount({ content: linkAndImage(href, src, 'A kiln'), format: 'html' }),
      );
      for (const format of ['html', 'markdown', 'text'] as const)
        expect(first!.getContent(format), `${href} ${format}`).toBe(second!.getContent(format));
    }
  });

  it('the input rules and a pasted single URL link only destinations the policy allows', () => {
    const scope = { inCode: false, inLink: false };
    for (const href of REJECTED_LINKS.filter((value) => !/\s/u.test(value))) {
      expect(matchInlineRule(`see [rules](${href})`, scope, TEST_URLS), href).toBeNull();
      expect(matchUrl(href, TEST_URLS), href).toBeNull();
      expect(matchAutolink(`go ${href}`, scope, TEST_URLS), href).toBeNull();
    }
    expect(matchInlineRule('see [rules](https://studio.example)', scope, TEST_URLS)).toMatchObject({
      rule: { mark: 'link', href: 'https://studio.example' },
    });
    expect(matchUrl('https://studio.example/kiln', TEST_URLS)).toBe('https://studio.example/kiln');
    expect(matchUrl('mailto:desk@studio.example', TEST_URLS)).toBe('mailto:desk@studio.example');
  });
});
