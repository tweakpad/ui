import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

/**
 * The framework-neutral description of every element a consumer writes, from the custom
 * elements manifest. The registration entries decide which elements those are: `register.ts`
 * defines every component element and `register/widgets.ts` every widget root; the elements a
 * component or widget only renders itself (flow nodes, color picker surfaces) are internal.
 *
 * Each element lists:
 * - `fields`: its public settable properties, typed by the element class itself, apart from
 *   `unreachable` ones that frameworks reserve (`key`, `ref`);
 * - `callbacks`: the `on…` callback properties among them, invoked for the element's own lanes;
 * - `lanes`: each controllable property with the callback that receives its proposals, and
 *   `model`, the lane a framework's default two-way binding uses;
 * - `events`: every event it dispatches, with the type the manifest records for the dispatch;
 * - `typeParameters`: the element class's type parameters, for generic elements.
 * Elements are grouped by their source folder (one group per component or widget), sorted, so the
 * generated files are stable.
 */
const reserved = new Set(['key', 'ref']);

export function bindingModel(manifest, { root }) {
  const registered = (file) =>
    [
      ...readFileSync(resolve(root, file), 'utf8').matchAll(
        /defineElement\(\s*(\w+)\.tagName,\s*\1\s*\)/gu,
      ),
    ].map((match) => match[1]);
  const scopes = {
    components: new Set(registered('src/register.ts')),
    widgets: new Set(registered('src/register/widgets.ts')),
  };
  const declarations = new Map();
  for (const module of manifest.modules)
    for (const declaration of module.declarations ?? [])
      if (declaration.kind === 'class' && declaration.tagName)
        declarations.set(declaration.name, { declaration, module: module.path });

  const groups = { components: new Map(), widgets: new Map() };
  const names = new Map();
  for (const [scope, classes] of Object.entries(scopes))
    for (const className of classes) {
      const entry = declarations.get(className);
      if (!entry) throw new Error(`${className} is registered but missing from the manifest`);
      const { declaration, module } = entry;
      const folder = module.split('/')[2];
      const fields = (declaration.members ?? [])
        .filter(
          (member) =>
            member.kind === 'field' &&
            !member.static &&
            !member.readonly &&
            (member.privacy ?? 'public') === 'public' &&
            !member.name.startsWith('#') &&
            !member.name.startsWith('_'),
        )
        .map((member) => member.name);
      const unique = [...new Set(fields)].sort();
      const events = [
        ...new Map((declaration.events ?? []).map((event) => [event.name, event])).values(),
      ]
        .map((event) => ({
          name: event.name,
          prop: `on${event.name
            .split('-')
            .map((word) => word[0].toUpperCase() + word.slice(1))
            .join('')}`,
          type: event.type ?? { text: 'CustomEvent<unknown>' },
        }))
        .sort((a, b) => (a.name < b.name ? -1 : 1));
      const wrapperName = className.replace(/^Tp/u, '');
      if (names.has(wrapperName))
        throw new Error(
          `${className} and ${names.get(wrapperName)} share the binding ${wrapperName}`,
        );
      names.set(wrapperName, className);
      // React and Vue keep `key` and `ref` for themselves: a prop of that name never reaches
      // the element, so a binding leaves it out and the element takes it through a ref.
      const unreachable = unique.filter((name) => reserved.has(name));
      const settable = unique.filter((name) => !/^on[A-Z]/u.test(name) && !reserved.has(name));
      const callbacks = unique.filter((name) => /^on[A-Z]/u.test(name));
      // A lane is a settable property `x` with an `onXChange` callback that receives its
      // proposals (`onCheckedChange` → `checked`); `v-model` binds the first of the usual ones.
      const lanes = Object.fromEntries(
        callbacks
          .map((callback) => [/^on(\w+)Change$/u.exec(callback)?.[1], callback])
          .filter(([lane]) => lane)
          .map(([lane, callback]) => [lane[0].toLowerCase() + lane.slice(1), callback])
          .filter(([lane]) => settable.includes(lane)),
      );
      const model = ['value', 'checked', 'pressed', 'open'].find((lane) => lane in lanes);
      const element = {
        tagName: declaration.tagName,
        className,
        wrapperName,
        // The class's local name in a binding module, apart from the binding it names.
        local: wrapperName === className ? `${className}Element` : className,
        module,
        fields: settable,
        unreachable,
        callbacks,
        lanes,
        ...(model ? { model } : {}),
        events,
        typeParameters: typeParameters(resolve(root, module), className),
      };
      const group = groups[scope].get(folder) ?? { folder, scope, elements: [] };
      group.elements.push(element);
      groups[scope].set(folder, group);
    }
  const sorted = (map) =>
    [...map.values()]
      .sort((a, b) => (a.folder < b.folder ? -1 : 1))
      .map((group) => ({
        ...group,
        elements: group.elements.sort((a, b) => (a.tagName < b.tagName ? -1 : 1)),
      }));
  return { components: sorted(groups.components), widgets: sorted(groups.widgets) };
}

/** The type parameter names of a class, read from its declaration. */
function typeParameters(file, className) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  let found = [];
  const visit = (node) => {
    if (ts.isClassDeclaration(node) && node.name?.text === className)
      found = (node.typeParameters ?? []).map((parameter) => parameter.name.text);
    else ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}
