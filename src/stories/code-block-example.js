import { createShikiHighlighter } from '../foundation/code/index.js';

let shiki;
/** One Shiki highlighter for the page: JavaScript regex engine (no WASM), fixed languages. */
async function loadShiki() {
  shiki ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
    ]);
    const highlighter = await createHighlighterCore({
      engine: createJavaScriptRegexEngine(),
      themes: [
        import('@shikijs/themes/github-light-default'),
        import('@shikijs/themes/github-dark-default'),
      ],
      langs: [
        import('@shikijs/langs/typescript'),
        import('@shikijs/langs/html'),
        import('@shikijs/langs/css'),
        import('@shikijs/langs/json'),
        import('@shikijs/langs/bash'),
      ],
    });
    return createShikiHighlighter(highlighter, {
      themes: { light: 'github-light-default', dark: 'github-dark-default' },
    });
  })();
  return shiki;
}

/** Gives every `tp-code-block[data-shiki]` inside `root` the Shiki highlighter once it loads. */
export function setupCodeBlockExample(root) {
  let active = true;
  void loadShiki().then((highlighter) => {
    if (!active) return;
    for (const block of root.querySelectorAll('tp-code-block[data-shiki]'))
      block.highlighter = highlighter;
  });
  return () => {
    active = false;
  };
}
