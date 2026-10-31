import { posix } from 'node:path';
import { header, qualifiedType, typeImports } from './types.mjs';

/**
 * React bindings: one module per component (or widget) folder with a binding per element it
 * registers, and a barrel per section (`src/react/index.ts`, `src/react/widgets/index.ts`). A
 * binding's props are typed by the element class (`Pick` of its settable properties), so they
 * keep its generics and unions; its events come typed from the manifest.
 */
export function reactBindings(model) {
  const files = new Map();
  const sections = [
    { groups: model.components, folder: 'src/react' },
    { groups: model.widgets, folder: 'src/react/widgets' },
  ];
  for (const { groups, folder } of sections) {
    for (const group of groups)
      files.set(`${folder}/${group.folder}.ts`, groupModule(group, folder));
    files.set(
      `${folder}/index.ts`,
      [
        header,
        ...(folder === 'src/react'
          ? ["export type { BindingElementClass, ElementProps } from './adapter.js';"]
          : []),
        ...groups.map((group) => `export * from './${group.folder}.js';`),
        '',
      ].join('\n'),
    );
  }
  files.set('tests/frameworks/react/elements.tsx', usageModule(model));
  return files;
}

/**
 * Type test: every binding renders in JSX with no props, and its ref is the element class. A
 * binding whose props cannot be satisfied or whose ref widens fails `npm run typecheck`.
 */
function usageModule(model) {
  const groups = [
    ...model.components.map((group) => ({ group, entry: '../../../src/react/index.js' })),
    ...model.widgets.map((group) => ({ group, entry: '../../../src/react/widgets/index.js' })),
  ];
  const lines = [header, "import type { ReactElement } from 'react';"];
  for (const entry of ['../../../src/react/index.js', '../../../src/react/widgets/index.js']) {
    const names = groups
      .filter((item) => item.entry === entry)
      .flatMap(({ group }) => group.elements.map((element) => element.wrapperName))
      .sort();
    lines.push(`import { ${names.join(', ')} } from '${entry}';`);
  }
  const modules = new Map();
  for (const { group } of groups)
    for (const element of group.elements) {
      const list = modules.get(element.module) ?? [];
      list.push(element);
      modules.set(element.module, list);
    }
  for (const [module, elements] of [...modules].sort(([a], [b]) => (a < b ? -1 : 1)))
    lines.push(
      `import type { ${elements
        .map((element) => `${element.className} as ${element.className}Type`)
        .sort()
        .join(', ')} } from '../../../${module.replace(/\.ts$/u, '.js')}';`,
    );
  lines.push('', 'export const elements: ReactElement[] = [');
  for (const { group } of groups)
    for (const element of group.elements)
      lines.push(
        `  <${element.wrapperName} ref={(element: ${element.className}Type${
          element.typeParameters.length
            ? `<${element.typeParameters.map(() => 'never').join(', ')}>`
            : ''
        } | null) => void element} />,`,
      );
  lines.push('];', '');
  return lines.join('\n');
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
    "'use client';",
    header,
    ...(elements.some((element) => element.typeParameters.length)
      ? [`import type { ReactElement } from 'react';`]
      : []),
    `import { createBinding, type ElementProps } from '${relative('src/react/adapter.ts')}';`,
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
  for (const element of elements) {
    const generic = element.typeParameters.length > 0;
    const local = element.local;
    const parameters = element.typeParameters;
    const instance = generic ? `${local}<${parameters.join(', ')}>` : local;
    const defaults = `${element.wrapperName}Defaults`;
    const keys = [...element.fields, ...element.callbacks].sort();
    const eventLines = element.events.map(
      (event) => `    ${event.prop}: ${qualifiedType(event.type, types.alias)};`,
    );
    const props = `${element.wrapperName}Props`;
    if (generic)
      lines.push(
        `/** The type arguments \`${element.className}\` defaults to. */`,
        `type ${defaults} = ${local} extends ${local}<${parameters
          .map((parameter) => `infer ${parameter}`)
          .join(', ')}>`,
        `  ? [${parameters.join(', ')}]`,
        '  : never;',
      );
    lines.push(
      `/** Props of {@link ${element.wrapperName}}, the React binding of \`<${element.tagName}>\`.${
        element.unreachable.length
          ? ` React reserves ${element.unreachable.map((name) => `\`${name}\``).join(' and ')}: set ${element.unreachable.length > 1 ? 'them' : 'it'} on the element through a ref.`
          : ''
      } */`,
      `export type ${props}${
        generic
          ? `<${parameters.map((parameter, index) => `${parameter} = ${defaults}[${index}]`).join(', ')}>`
          : ''
      } = ElementProps<`,
      `  ${instance},`,
      `  ${keys.length ? keys.map((key) => `'${key}'`).join(' | ') : 'never'},`,
      eventLines.length ? `  {\n${eventLines.join('\n')}\n  }` : '  Record<never, never>',
      '>;',
      `/** \`<${element.tagName}>\` as a React component. */`,
      `export const ${element.wrapperName} = /*#__PURE__*/ createBinding<${props}>(`,
      `  ${local},`,
      `  '${element.wrapperName}',`,
      `  {${element.events.map((event) => ` ${event.prop}: '${event.name}',`).join('')} },`,
      `  [${element.callbacks.map((name) => `'${name}'`).join(', ')}],`,
      generic
        ? `) as <${parameters
            .map((parameter, index) => `${parameter} = ${defaults}[${index}]`)
            .join(', ')}>(props: ${props}<${parameters.join(', ')}>) => ReactElement;`
        : ');',
      '',
    );
  }
  return lines.join('\n');
}
