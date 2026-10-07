const words = (
  'the a component page section reader scroll layout token theme surface control focus ' +
  'keyboard pointer screen value state event motion color spacing release team plan ' +
  'launch review document content target heading link list panel dialog menu button ' +
  'field form label message status update change design system library browser render ' +
  'measure observe frame offset region line edge start end view stays moves follows ' +
  'returns keeps shows reads writes builds shares uses needs makes finds every each one ' +
  'more less quickly carefully always often nearby visible current next previous shared'
).split(' ');

/** A small deterministic random source, so generated pages are stable between renders. */
function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generated placeholder sentences, grouped into paragraphs. */
export function generateParagraphs(seed, count, { sentences = [3, 6], length = [8, 18] } = {}) {
  const next = random(seed);
  const between = ([low, high]) => low + Math.floor(next() * (high - low + 1));
  return Array.from({ length: count }, () =>
    Array.from({ length: between(sentences) }, () => {
      const text = Array.from(
        { length: between(length) },
        () => words[Math.floor(next() * words.length)],
      ).join(' ');
      return `${text[0].toUpperCase()}${text.slice(1)}.`;
    }).join(' '),
  );
}

/** Fills every `[data-generate="count"]` inside `root` with generated paragraphs. */
export function fillGeneratedText(root, seed = 1) {
  let offset = 0;
  for (const element of root.querySelectorAll('[data-generate]')) {
    offset += 1;
    const count = Number(element.getAttribute('data-generate')) || 3;
    for (const text of generateParagraphs(seed * 97 + offset, count)) {
      const paragraph = element.ownerDocument.createElement('p');
      paragraph.textContent = text;
      element.append(paragraph);
    }
    element.removeAttribute('data-generate');
  }
}
