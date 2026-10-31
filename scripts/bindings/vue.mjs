import { posix } from 'node:path';
import { header, qualifiedType, typeImports } from './types.mjs';

/**
 * Vue bindings: one module per component (or widget) folder with a binding per element it
 * registers, and a barrel per section (`src/vue/index.ts`, `src/vue/widgets/index.ts`). Props are
 * typed by the element class; events come typed from the manifest; every lane gets a `v-model`.
 */
export function vueBindings(model) {
  const files = new Map();
  const sections = [
    { groups: model.components, folder: 'src/vue' },
    { groups: model.widgets, folder: 'src/vue/widgets' },
  ];
  for (const { groups, folder } of sections) {
    for (const group of groups)
      files.set(`${folder}/${group.folder}.ts`, groupModule(group, folder));
    files.set(
      `${folder}/index.ts`,
      [
        header,
        ...(folder === 'src/vue'
          ? [
              "export { isTweakpadElement } from './adapter.js';",
              "export type { BindingElementClass, ElementBinding, EventPropName } from './adapter.js';",
            ]
          : []),
        ...groups.map((group) => `export * from './${group.folder}.js';`),
        '',
      ].join('\n'),
    );
  }
  return files;
}

function groupModule(group, folder) {
  const relative = (path) => {
    const value = posix.relative(folder, path.replace(/\.ts$/u, '.js'));
    return value.startsWith('.') ? value : `./${value}`;
  };
  const elements = group.elements;
  const types = typeImports(
    elements.flatMap((element) => element.events.flatMap((event) => event.type.references ?? [])),
    relative,
  );
  const lines = [
    header,
    `import { createBinding, type ElementBinding } from '${relative('src/vue/adapter.ts')}';`,
    ...[...new Set(elements.map((element) => element.module))].sort().map(
      (module) =>
        `import { ${elements
          .filter((element) => element.module === module)
          .map((element) =>
            element.local === element.className
              ? element.className
              : `${element.className} as ${element.local}`,
          )
          .sort()
          .join(', ')} } from '${relative(module)}';`,
    ),
    ...types.imports,
    '',
  ];
  const union = (names) => (names.length ? names.map((name) => `'${name}'`).join(' | ') : 'never');
  for (const element of elements) {
    // A generic element binds with its default type arguments.
    const generic = element.typeParameters.length > 0;
    const keys = [...element.fields, ...element.callbacks].sort();
    const lanes = Object.keys(element.lanes).sort();
    const events = element.events.map(
      (event) => `    '${event.name}': ${qualifiedType(event.type, types.alias)};`,
    );
    const replacedGeneric = (text) =>
      generic
        ? element.typeParameters.reduce(
            (result, parameter) =>
              result.replace(
                new RegExp(`\\b${parameter}\\b`, 'gu'),
                `${element.wrapperName}Default`,
              ),
            text,
          )
        : text;
    const eventsText = events.join('\n');
    if (generic && replacedGeneric(eventsText) !== eventsText)
      lines.push(
        `/** The type argument \`${element.className}\` defaults to. */`,
        `type ${element.wrapperName}Default = ${element.local} extends ${element.local}<infer T> ? T : never;`,
      );
    lines.push(
      `/** \`<${element.tagName}>\` as a Vue component.${
        element.unreachable.length
          ? ` Vue reserves ${element.unreachable.map((name) => `\`${name}\``).join(' and ')}: set ${element.unreachable.length > 1 ? 'them' : 'it'} on the element through a template ref.`
          : ''
      } */`,
      `export const ${element.wrapperName} = /*#__PURE__*/ createBinding(${element.local}, '${element.wrapperName}', {`,
      ...(element.callbacks.length
        ? [`  callbacks: [${element.callbacks.map((name) => `'${name}'`).join(', ')}],`]
        : []),
      `  lanes: { ${lanes.map((lane) => `${lane}: '${element.lanes[lane]}'`).join(', ')} },`,
      ...(element.model ? [`  model: '${element.model}',`] : []),
      `}) as ElementBinding<`,
      `  ${element.local},`,
      `  ${union(keys)},`,
      events.length ? `  {\n${replacedGeneric(events.join('\n'))}\n  }` : '  Record<never, never>',
      ...(lanes.length || element.model
        ? [`  , ${union(lanes)}`, ...(element.model ? [`  , '${element.model}'`] : [])]
        : []),
      '>;',
      '',
    );
  }
  return lines.join('\n');
}
