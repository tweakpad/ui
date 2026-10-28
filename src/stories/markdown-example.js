/**
 * Admits `tp-badge` from raw HTML, and renders `steps` fences as a row of badges with a
 * renderer; every other node keeps its default rendering.
 */
export function setupMarkdownExtensions(root) {
  const markdown = root.querySelector('tp-markdown');
  markdown.elements = { 'tp-badge': ['variant'] };
  markdown.renderers = {
    code: (node) => {
      if (node.lang !== 'steps') return undefined;
      const row = root.ownerDocument.createElement('p');
      for (const [index, step] of node.value.split('\n').entries()) {
        const badge = root.ownerDocument.createElement('tp-badge');
        badge.variant = index === 0 ? 'default' : 'outline';
        badge.textContent = `${index + 1}. ${step}`;
        row.append(badge, ' ');
      }
      return row;
    },
  };
  return () => {};
}

const answer = `Here is how to **stream** a reply:

1. Set \`streaming\` while chunks arrive.
2. Call \`append(chunk)\` for each chunk.
3. Clear \`streaming\` when the reply ends.

\`\`\`js
markdown.streaming = true;
for await (const chunk of reply) markdown.append(chunk);
markdown.streaming = false;
\`\`\`

Unfinished *emphasis*, \`code\` and [links](https://example.com) never show their markers.`;

/** Replays a streamed reply into the bubble's Markdown; the button restarts it. */
export function setupMarkdownStreaming(root) {
  const markdown = root.querySelector('tp-markdown');
  const button = root.querySelector('tp-button');
  const view = root.ownerDocument.defaultView;
  let timer;
  const play = () => {
    view.clearInterval(timer);
    markdown.source = '';
    markdown.streaming = true;
    let index = 0;
    timer = view.setInterval(() => {
      markdown.append(answer.slice(index, index + 6));
      index += 6;
      if (index >= answer.length) {
        view.clearInterval(timer);
        markdown.streaming = false;
      }
    }, 40);
  };
  button.addEventListener('click', play);
  play();
  return () => {
    view.clearInterval(timer);
    button.removeEventListener('click', play);
  };
}

/** Builds a table of contents from the rendered section headings (h2, h3), after every render. */
export function setupMarkdownOutline(root) {
  const markdown = root.querySelector('tp-markdown');
  const toc = root.querySelector('tp-table-of-contents');
  const update = () => {
    toc.replaceChildren(
      ...markdown.headings
        .filter((heading) => heading.depth === 2 || heading.depth === 3)
        .map((heading) => {
          const item = root.ownerDocument.createElement('tp-table-of-contents-item');
          item.target = heading.element;
          item.depth = heading.depth - 1;
          item.textContent = heading.label;
          return item;
        }),
    );
  };
  // Headings rendered before this setup ran, then every later render.
  void markdown.updateComplete.then(update);
  markdown.addEventListener('tp-markdown-render', update);
  return () => markdown.removeEventListener('tp-markdown-render', update);
}
