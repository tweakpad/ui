/**
 * Custom elements manifest for consumers' editors and tooling (`customElements` in package.json).
 * Tweakpad elements declare `static tagName = 'tp-…'` and register through `defineElement`, which
 * the analyzer does not recognize, so this plugin maps each tag declaration to a manifest
 * custom element and its definition export.
 */
function staticTagName(ts, node) {
  for (const member of node.members ?? []) {
    if (
      ts.isPropertyDeclaration(member) &&
      member.name?.getText() === 'tagName' &&
      member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) &&
      member.initializer &&
      ts.isStringLiteralLike(member.initializer)
    )
      return member.initializer.text;
  }
  return undefined;
}

const tweakpadTagNames = () => ({
  name: 'tweakpad-tag-names',
  analyzePhase({ ts, node, moduleDoc }) {
    if (!ts.isClassDeclaration(node) || !node.name) return;
    const tagName = staticTagName(ts, node);
    if (!tagName?.startsWith('tp-')) return;
    const declaration = moduleDoc.declarations?.find((entry) => entry.name === node.name.text);
    if (!declaration) return;
    declaration.customElement = true;
    declaration.tagName = tagName;
    moduleDoc.exports ??= [];
    if (
      !moduleDoc.exports.some(
        (entry) => entry.kind === 'custom-element-definition' && entry.name === tagName,
      )
    )
      moduleDoc.exports.push({
        kind: 'custom-element-definition',
        name: tagName,
        declaration: { name: node.name.text, module: moduleDoc.path },
      });
  },
});

export default {
  // Components plus the element bases they inherit attributes and members from.
  globs: ['src/components/**/*.ts', 'src/foundation/element.ts', 'src/foundation/form-element.ts'],
  exclude: ['src/**/*.test.ts', 'src/**/*.stories.ts', 'src/stories/**', 'src/stylesheet.ts'],
  outdir: 'dist',
  litelement: true,
  plugins: [tweakpadTagNames()],
};
