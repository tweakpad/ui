// The custom-elements-manifest check of the package smoke test (`pack-smoke.mjs`), which the
// manifest unit test runs against the sources as well: the published description of
// `tp-text-editor` (uwg-te-req-prop-1, uwg-te-req-prop-2, uwg-te-req-value-1, uwg-te-req-evt-1 to
// uwg-te-req-evt-5).

/** Attributes the element declares itself (uwg-te-req-prop-1). */
export const TEXT_EDITOR_OWN_ATTRIBUTES = Object.freeze([
  'default-value',
  'format',
  'placeholder',
  'label',
]);
/** Attributes of the form control contract (uwg-te-req-prop-1). */
export const TEXT_EDITOR_FORM_ATTRIBUTES = Object.freeze(['name', 'form']);
/** Members that are properties only (uwg-te-req-prop-1). */
export const TEXT_EDITOR_PROPERTY_ONLY = Object.freeze([
  'engine',
  'features',
  'tools',
  'layout',
  'nodes',
  'strings',
]);
/** Events the element dispatches (uwg-te-req-evt-1 to uwg-te-req-evt-5). */
export const TEXT_EDITOR_EVENTS = Object.freeze([
  'tp-text-editor-request',
  'tp-text-editor-request-failed',
  'tp-value-change',
  'tp-value-commit',
  'tp-text-editor-ready',
  'tp-text-editor-error',
  'tp-diagnostic',
]);

/**
 * The problems of the description of `tp-text-editor` in a custom elements manifest, one line
 * each; empty when it holds. The element base's attributes are read from the manifest's own
 * `TpElement` declaration, so the check follows that base.
 * @param {{ modules: { path: string, declarations?: Record<string, any>[] }[] }} manifest
 * @returns {string[]}
 */
export function textEditorManifestProblems(manifest) {
  const declarations = manifest.modules.flatMap((module) => module.declarations ?? []);
  const editor = declarations.find((declaration) => declaration.tagName === 'tp-text-editor');
  if (!editor) return ['tp-text-editor is not declared'];
  const base = declarations.find((declaration) => declaration.name === 'TpElement');
  if (!base) return ['TpElement is not declared'];
  const problems = [];
  const attributes = editor.attributes ?? [];
  const names = new Set(attributes.map((attribute) => attribute.name));
  const expected = new Set([
    ...TEXT_EDITOR_OWN_ATTRIBUTES,
    ...TEXT_EDITOR_FORM_ATTRIBUTES,
    ...(base.attributes ?? []).map((attribute) => attribute.name),
  ]);
  const missing = [...expected].filter((name) => !names.has(name));
  const extra = [...names].filter((name) => !expected.has(name));
  if (missing.length) problems.push(`attributes missing: ${missing.join(', ')}`);
  if (extra.length) problems.push(`attributes not in the contract: ${extra.join(', ')}`);
  for (const attribute of attributes) {
    if (TEXT_EDITOR_OWN_ATTRIBUTES.includes(attribute.name) && attribute.inheritedFrom)
      problems.push(`attribute ${attribute.name} is inherited, not declared by the element`);
    if (
      TEXT_EDITOR_FORM_ATTRIBUTES.includes(attribute.name) &&
      attribute.inheritedFrom?.name !== 'TpFormElement'
    )
      problems.push(`attribute ${attribute.name} is not inherited from TpFormElement`);
  }
  const field = (name) =>
    (editor.members ?? []).find(
      (member) => member.kind === 'field' && !member.static && member.name === name,
    );
  const value = field('value');
  if (!value) problems.push('field value is missing');
  else {
    if (value.readonly !== true) problems.push('field value is not read-only');
    if (value.attribute !== undefined) problems.push('field value has an attribute');
    if (value.reflects !== undefined) problems.push('field value reflects');
  }
  for (const name of TEXT_EDITOR_PROPERTY_ONLY) {
    const member = field(name);
    if (!member) problems.push(`field ${name} is missing`);
    else if (member.attribute !== undefined) problems.push(`field ${name} has an attribute`);
  }
  const events = new Set((editor.events ?? []).map((event) => event.name));
  const absent = TEXT_EDITOR_EVENTS.filter((name) => !events.has(name));
  if (absent.length) problems.push(`events missing: ${absent.join(', ')}`);
  if (events.has('type')) problems.push('the bogus `type` event is listed');
  return problems;
}
