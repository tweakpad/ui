import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { motionTransition } from '../../motion.js';
import type { PresentationRule } from '../../resolver.js';

// Each case imports the set it tests, so a missing set fails only its own case.
const load = () => import('./document-content.js');

/** A consumer's own flow variable names, other than Markdown's. */
const flow = { flow: '--_x-flow', headingFlow: '--_x-heading-flow' } as const;

/** The declarations of the rule at `selector`, or of the rule without one for `&`. */
function at(rules: readonly PresentationRule[], selector: string) {
  return rules.find((rule) => (rule.selector ?? '&') === selector)?.declarations;
}

describe('document content sets', () => {
  it("binds Markdown's roles through the shared sets and restates none of their declarations (`dcp-binding`, `mdl-presentation`)", async () => {
    const source = readFileSync(new URL('../markdown.ts', import.meta.url), 'utf8');
    expect(source).toContain("from './shared/document-content.js'");
    for (const restated of [
      '--tp-font-heading',
      '--tp-leading-tight',
      '--tp-tracking-',
      'uppercase',
      '--tp-font-semibold',
      '--tp-font-mono',
      'liga',
      'var(--tp-muted)',
      '--tp-border-width-strong',
      'list-style',
      'max-inline-size',
      '--tp-radius-md',
      'text-decoration-color',
      'text-underline-offset',
      'overflow-wrap',
      "'margin-block'",
      "'margin-inline'",
      'motionTransition',
      '--tp-space-8',
      '--tp-space-3',
      '--tp-space-0-5',
    ])
      expect(source, restated).not.toContain(restated);
    expect(source).not.toMatch(/var\(--tp-text-(?:2xl|xl|lg|base)\)/u);

    const { markdownAppearance } = await import('../markdown.js');
    const {
      documentImageRules,
      documentLinkRules,
      documentListRules,
      documentQuoteRules,
      documentStrongRules,
    } = await load();
    expect(markdownAppearance['markdown-blockquote']).toEqual(documentQuoteRules('&'));
    expect(markdownAppearance['markdown-link']).toEqual(documentLinkRules('&'));
    expect(markdownAppearance['markdown-image']).toEqual(documentImageRules('&'));
    expect(markdownAppearance['markdown-strong']).toEqual(documentStrongRules('&'));
    expect(markdownAppearance['markdown-list']).toEqual(
      documentListRules({ list: '&', taskList: '&[data-task-list]' }),
    );
  });

  it("declares both spacing variables under the consumer's names, smaller in the compact scale (`dcp-scale`, `dcp-flow`)", async () => {
    const { documentScope } = await load();
    expect(Object.entries(documentScope(flow, 'default'))).toEqual([
      ['font-size', 'var(--tp-text-base)'],
      ['overflow-wrap', 'break-word'],
      ['--_x-flow', 'var(--tp-space-4)'],
      ['--_x-heading-flow', 'var(--tp-space-8)'],
    ]);
    expect(Object.entries(documentScope(flow, 'compact'))).toEqual([
      ['font-size', 'var(--tp-text-sm)'],
      ['--_x-flow', 'var(--tp-space-3)'],
      ['--_x-heading-flow', 'var(--tp-space-6)'],
    ]);
  });

  it('spaces blocks on their block-start edge only, none on the first, section spacing around dividers and a small step after a heading (`dcp-flow`)', async () => {
    const { documentFlowRules } = await load();
    const selectors = {
      blocks: '& .content > *',
      afterHeading: '& .content > .heading + *',
      dividers: '& .content > hr, & .content > hr + *',
      first: '& .content > :first-child',
    };
    const rules = documentFlowRules(flow, selectors);
    expect(rules).toEqual([
      { selector: selectors.blocks, declarations: { 'margin-block': 'var(--_x-flow) 0' } },
      {
        selector: selectors.afterHeading,
        declarations: { 'margin-block-start': 'var(--tp-space-2)' },
      },
      {
        selector: selectors.dividers,
        declarations: { 'margin-block-start': 'var(--_x-heading-flow)' },
      },
      { selector: selectors.first, declarations: { 'margin-block-start': '0' } },
    ]);
    const variables = JSON.stringify(rules).match(/var\(--_[\w-]+\)/gu) ?? [];
    expect(new Set(variables)).toEqual(new Set(['var(--_x-flow)', 'var(--_x-heading-flow)']));
    expect(JSON.stringify(rules)).not.toContain('--_tp-markdown');
  });

  it('keeps the heading scale and tracking, compact only where a consumer has a size axis (`dcp-roles-table-r2`, `dcp-scale`)', async () => {
    const { documentHeadingRules } = await load();
    const level = (n: number) => `& h${n}.heading`;
    const rules = documentHeadingRules(flow, { heading: '& .heading', level });
    expect(rules).toHaveLength(7);
    expect(Object.entries(at(rules, '& .heading') ?? {})).toEqual([
      ['margin-block-start', 'var(--_x-heading-flow)'],
      ['font-family', 'var(--tp-font-heading)'],
      ['font-weight', 'var(--tp-font-semibold)'],
      ['line-height', 'var(--tp-leading-tight)'],
      ['letter-spacing', 'var(--tp-tracking-normal)'],
      ['color', 'var(--tp-foreground)'],
      ['scroll-margin-block-start', 'var(--tp-space-4)'],
    ]);
    expect([1, 2, 3, 4, 5, 6].map((n) => at(rules, level(n))?.['font-size'])).toEqual([
      'var(--tp-text-2xl)',
      'var(--tp-text-xl)',
      'var(--tp-text-lg)',
      'var(--tp-text-base)',
      'var(--tp-text-sm)',
      'var(--tp-text-xs)',
    ]);
    expect([1, 2, 3, 4, 5, 6].map((n) => at(rules, level(n))?.color)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      'var(--tp-muted-foreground)',
      'var(--tp-muted-foreground)',
    ]);
    expect(at(rules, level(1))?.['letter-spacing']).toBe('var(--tp-tracking-tight)');
    expect(at(rules, level(6))).toMatchObject({
      'text-transform': 'uppercase',
      'letter-spacing': 'var(--tp-tracking-wide)',
    });
    for (const n of [2, 3, 4, 5]) expect(at(rules, level(n))).not.toHaveProperty('letter-spacing');

    const compactLevel = (n: number) => `:host([size="sm"]) & h${n}.heading`;
    const compact = documentHeadingRules(flow, { heading: '& .heading', level, compactLevel });
    expect(compact).toHaveLength(11);
    expect(compact.slice(0, 7)).toEqual(rules);
    expect(compact.slice(7)).toEqual([
      { selector: compactLevel(1), declarations: { 'font-size': 'var(--tp-text-xl)' } },
      { selector: compactLevel(2), declarations: { 'font-size': 'var(--tp-text-lg)' } },
      { selector: compactLevel(3), declarations: { 'font-size': 'var(--tp-text-base)' } },
      { selector: compactLevel(4), declarations: { 'font-size': 'var(--tp-text-sm)' } },
    ]);
  });

  it("places rules at the consumer's selectors, and a rule on the bound element itself without a selector (`dcp-binding`)", async () => {
    const {
      documentHeadingRules,
      documentImageRules,
      documentLinkRules,
      documentListRules,
      documentQuoteRules,
      documentStrongRules,
    } = await load();
    const bound = documentLinkRules('&');
    expect(bound.map((rule) => rule.selector)).toEqual([undefined, '&:hover', '&:focus-visible']);
    expect(Object.keys(bound[0] ?? {})).toEqual(['declarations']);
    expect(bound[0]?.declarations).toMatchObject({
      'text-decoration-line': 'underline',
      'text-decoration-color': 'color-mix(in oklab, var(--tp-foreground) 30%, transparent)',
      transition: motionTransition(['text-decoration-color'], 'fast'),
    });
    expect(bound[1]?.declarations).toEqual({ 'text-decoration-color': 'var(--tp-foreground)' });
    expect(bound[2]?.declarations).toMatchObject({
      outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
    });

    const descendant = documentLinkRules('& .link');
    expect(descendant.map((rule) => rule.selector)).toEqual([
      '& .link',
      '& .link:hover',
      '& .link:focus-visible',
    ]);
    expect(descendant.map((rule) => rule.declarations)).toEqual(
      bound.map((rule) => rule.declarations),
    );

    for (const rules of [
      documentQuoteRules('&'),
      documentImageRules('&'),
      documentStrongRules('&'),
      documentListRules({ list: '&', taskList: '&.task' }),
      documentHeadingRules(flow, { heading: '&', level: (n) => `&.h${n}` }),
    ])
      expect(Object.keys(rules[0] ?? {})).toEqual(['declarations']);
    expect(documentQuoteRules('& .quote')[0]?.selector).toBe('& .quote');
    expect(documentImageRules('& img')[0]?.selector).toBe('& img');
    expect(documentStrongRules('& strong')).toEqual([
      { selector: '& strong', declarations: { 'font-weight': 'var(--tp-font-semibold)' } },
    ]);
  });

  it("insets lists but not task lists, steps items and nested lists, mutes markers and hides unmarked items' markers (`dcp-roles-table-r3`, `dcp-roles-table-r4`)", async () => {
    const { documentListItemRules, documentListRules } = await load();
    expect(documentListRules({ list: '& .list', taskList: '& .task-list' })).toEqual([
      { selector: '& .list', declarations: { 'padding-inline-start': 'var(--tp-space-6)' } },
      {
        selector: '& .task-list',
        declarations: { 'list-style': 'none', 'padding-inline-start': '0' },
      },
    ]);

    const selectors = {
      nextItem: '& .item + .item',
      marker: '& .item::marker',
      nestedList: '& .item > .list',
      unmarkedItem: '& .task-item',
    };
    const tight = documentListItemRules(flow, selectors);
    expect(tight).toEqual([
      { selector: selectors.nextItem, declarations: { 'margin-block-start': 'var(--tp-space-2)' } },
      { selector: selectors.marker, declarations: { color: 'var(--tp-muted-foreground)' } },
      {
        selector: selectors.nestedList,
        declarations: { 'margin-block-start': 'var(--tp-space-2)' },
      },
      { selector: selectors.unmarkedItem, declarations: { 'list-style': 'none' } },
    ]);

    const loose = documentListItemRules(flow, {
      ...selectors,
      nextLooseItem: '& .item.loose + .item.loose',
    });
    expect(loose).toHaveLength(5);
    expect(loose[1]).toEqual({
      selector: '& .item.loose + .item.loose',
      declarations: { 'margin-block-start': 'var(--_x-flow)' },
    });
    expect([loose[0], ...loose.slice(2)]).toEqual(tight);
  });

  it("sets code spans one step under body text and keeps a heading's size inside a heading (`dcp-roles-table-r7`)", async () => {
    const { documentInlineCodeRules } = await load();
    const plain = documentInlineCodeRules({ code: '& code', inHeading: '& .heading code' });
    expect(plain).toHaveLength(2);
    expect(plain[0]?.declarations).toMatchObject({
      'font-family': 'var(--tp-font-mono)',
      'font-size': 'var(--tp-text-sm)',
      'font-feature-settings': '"liga" 0, "calt" 0',
      background: 'var(--tp-muted)',
      'overflow-wrap': 'anywhere',
    });
    expect(plain[1]).toEqual({
      selector: '& .heading code',
      declarations: { 'font-size': 'inherit' },
    });

    const scaled = documentInlineCodeRules({
      code: '&',
      compact: { code: ':host([size="sm"]) &', inHeading: ':host([size="sm"]) .heading &' },
      inHeading: '.heading &',
    });
    expect(scaled.map((rule) => rule.selector)).toEqual([
      undefined,
      ':host([size="sm"]) &',
      '.heading &',
      ':host([size="sm"]) .heading &',
    ]);
    expect(scaled[0]).toEqual({ declarations: plain[0]?.declarations });
    expect(scaled[1]?.declarations).toEqual({ 'font-size': 'var(--tp-text-xs)' });
    expect(scaled[2]?.declarations).toEqual({ 'font-size': 'inherit' });
    expect(scaled[3]?.declarations).toEqual({ 'font-size': 'inherit' });
  });

  it('takes the code face of code spans from the code surface, as code blocks do (`dcp-roles-table-r7`, `dcp-roles-table-r8`)', async () => {
    const { documentInlineCodeRules } = await load();
    const { codeFace, codeTypography } = await import('./code-surface.js');
    const [code] = documentInlineCodeRules({ code: '&', inHeading: '.heading &' });
    expect(Object.keys(codeFace)).toEqual(['font-family', 'font-feature-settings']);
    for (const [property, value] of Object.entries(codeFace)) {
      expect(code?.declarations[property], property).toBe(value);
      expect(codeTypography[property], property).toBe(value);
    }
    const own = readFileSync(new URL('./document-content.ts', import.meta.url), 'utf8');
    expect(own).not.toContain('--tp-font-mono');
    expect(own).not.toContain('liga');
  });

  it('keeps the heading size for a code span inside a heading at every Markdown size (`dcp-roles-table-r7`, `mdl-typography`)', async () => {
    const { markdownAppearance } = await import('../markdown.js');
    // The code part's rules as the presentation controller writes them into the shadow root, with
    // the part's selector in place of `&`.
    const part = '[part~="markdown-code"]';
    const rules = (markdownAppearance['markdown-code'] ?? []).map((rule) => ({
      selector: rule.selector?.includes('&')
        ? rule.selector.replaceAll('&', part)
        : part + (rule.selector ?? ''),
      fontSize: rule.declarations['font-size'],
    }));
    // The selectors hold only the size condition on the host, attribute selectors and descendant
    // combinators, so each attribute selector and each `:host` adds one to the specificity.
    for (const { selector } of rules)
      expect(
        selector.replace(
          /:host(?:\(\[size="sm"\]\))?|\[part~="markdown-(?:code|heading)"\]|\s+/gu,
          '',
        ),
        selector,
      ).toBe('');
    const specificity = (selector: string) =>
      (selector.match(/\[[^\]]*\]/gu) ?? []).length + (selector.match(/:host\b/gu) ?? []).length;
    /** The font size that wins on a code span: the most specific applicable rule, else the later. */
    const fontSize = (size: 'default' | 'sm', inHeading: boolean) =>
      rules
        .filter(
          ({ selector, fontSize }) =>
            fontSize !== undefined &&
            (size === 'sm' || !selector.includes(':host([size="sm"])')) &&
            (inHeading || !selector.includes('[part~="markdown-heading"]')),
        )
        .reduce<(typeof rules)[number] | undefined>(
          (winner, rule) =>
            winner && specificity(winner.selector) > specificity(rule.selector) ? winner : rule,
          undefined,
        )?.fontSize;
    expect({
      default: fontSize('default', false),
      'default in a heading': fontSize('default', true),
      sm: fontSize('sm', false),
      'sm in a heading': fontSize('sm', true),
    }).toEqual({
      default: 'var(--tp-text-sm)',
      'default in a heading': 'inherit',
      sm: 'var(--tp-text-xs)',
      'sm in a heading': 'inherit',
    });
  });

  it('changes appearance only (`dcp-semantics`)', async () => {
    const sets = await load();
    const rules: PresentationRule[] = [
      { declarations: sets.documentScope(flow, 'default') },
      { declarations: sets.documentScope(flow, 'compact') },
      ...sets.documentFlowRules(flow, {
        blocks: '& > *',
        afterHeading: '& h2 + *',
        dividers: '& hr',
        first: '& > :first-child',
      }),
      ...sets.documentHeadingRules(flow, {
        heading: '& h',
        level: (n) => `& h${n}`,
        compactLevel: (n) => `.sm & h${n}`,
      }),
      ...sets.documentListRules({ list: '& ul', taskList: '& ul.task' }),
      ...sets.documentListItemRules(flow, {
        nextItem: '& li + li',
        nextLooseItem: '& li.loose + li.loose',
        marker: '& li::marker',
        nestedList: '& li > ul',
        unmarkedItem: '& li.task',
      }),
      ...sets.documentQuoteRules('& blockquote'),
      ...sets.documentInlineCodeRules({
        code: '& code',
        compact: { code: '.sm & code', inHeading: '.sm & h code' },
        inHeading: '& h code',
      }),
      ...sets.documentLinkRules('& a'),
      ...sets.documentImageRules('& img'),
      ...sets.documentStrongRules('& strong'),
    ];
    expect(rules).toHaveLength(34);
    for (const rule of rules)
      for (const property of ['display', 'visibility', 'content'])
        expect(rule.declarations, `${rule.selector ?? '&'} ${property}`).not.toHaveProperty(
          property,
        );
  });
});
