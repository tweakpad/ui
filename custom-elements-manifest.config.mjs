import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Custom elements manifest for consumers' editors and tooling (`customElements` in package.json).
 * Tweakpad elements declare `static tagName = 'tp-…'` and register through `defineElement`, which
 * the analyzer does not recognize, so a plugin maps each tag declaration to a manifest custom
 * element and its definition export.
 *
 * Events: components dispatch through the shared `emit(type, detail)` helper or typed event
 * classes (`new TpValueChangeEvent(…)`). The analyzer only reads `new CustomEvent('name')`, so
 * the helper's own `new CustomEvent(type)` became a bogus `type` event on every element. A second
 * plugin records `this.emit('tp-…')` calls, typed event classes and the events of shared
 * controllers a component constructs, and drops that entry.
 */

/**
 * Static scan of the sources:
 * - `eventClasses`: event class name → event name (`static readonly eventName` or `super('tp-…')`);
 * - `controllers`: exported non-event class → events its module fires, so a component that
 *   constructs a shared controller (`new ControllableState(…)`) lists the events it dispatches.
 */
function scanEventSources(...directories) {
  const sources = [];
  const walk = (folder) => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts'))
        sources.push(readFileSync(path, 'utf8'));
    }
  };
  for (const directory of directories) walk(directory);
  const eventClasses = new Map();
  const parents = new Map();
  for (const source of sources) {
    const constants = new Map(
      [...source.matchAll(/export const ([A-Z_]+) = '([a-z-]+)'/gu)].map((match) => [
        match[1],
        match[2],
      ]),
    );
    const classes = [...source.matchAll(/class (Tp\w+Event)\b(?:<[^>]*>)? extends (\w+)/gu)];
    classes.forEach((match, index) => {
      const body = source.slice(match.index, classes[index + 1]?.index ?? source.length);
      const declared = /static readonly eventName = (?:'([a-z-]+)'|([A-Z_]+))/u.exec(body);
      const name =
        declared?.[1] ??
        constants.get(declared?.[2]) ??
        /super\(\s*'(tp-[a-z-]+)'/u.exec(body)?.[1];
      if (name) eventClasses.set(match[1], name);
      else parents.set(match[1], match[2]);
    });
  }
  for (const [child, parent] of parents)
    if (eventClasses.has(parent)) eventClasses.set(child, eventClasses.get(parent));
  const controllers = new Map();
  for (const source of sources) {
    const fired = new Set([
      ...[...source.matchAll(/new (Tp\w+Event)\b/gu)]
        .map((match) => eventClasses.get(match[1]))
        .filter(Boolean),
      ...[...source.matchAll(/(?:\.emit|new CustomEvent)\(\s*'(tp-[a-z-]+)'/gu)].map(
        (match) => match[1],
      ),
    ]);
    if (!fired.size) continue;
    for (const [, name] of source.matchAll(/export class (\w+)/gu))
      if (!eventClasses.has(name)) controllers.set(name, fired);
  }
  return { eventClasses, controllers };
}

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

const tweakpadEvents = ({ eventClasses, controllers }) => ({
  name: 'tweakpad-events',
  analyzePhase({ ts, node, moduleDoc }) {
    if (!ts.isClassDeclaration(node) || !node.name) return;
    const declaration = moduleDoc.declarations?.find((entry) => entry.name === node.name.text);
    if (!declaration) return;
    const found = new Map();
    const visit = (child) => {
      if (
        ts.isCallExpression(child) &&
        ts.isPropertyAccessExpression(child.expression) &&
        child.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
        child.expression.name.text === 'emit' &&
        child.arguments[0] &&
        ts.isStringLiteralLike(child.arguments[0])
      )
        found.set(child.arguments[0].text, 'CustomEvent');
      if (ts.isNewExpression(child) && ts.isIdentifier(child.expression)) {
        const constructed = child.expression.text;
        // A typed event class can be dispatched under its own name (`new TpValueChangeEvent(…,
        // 'tp-snap-point-change')`); that name wins over the class default.
        const named = (child.arguments ?? []).find(
          (argument) => ts.isStringLiteralLike(argument) && /^tp-[a-z-]+$/u.test(argument.text),
        );
        const name = eventClasses.has(constructed)
          ? (named?.text ?? eventClasses.get(constructed))
          : undefined;
        if (name) found.set(name, constructed);
        for (const fired of controllers.get(constructed) ?? [])
          if (!found.has(fired)) found.set(fired, 'CustomEvent');
      }
      ts.forEachChild(child, visit);
    };
    ts.forEachChild(node, visit);
    if (!found.size) return;
    declaration.events ??= [];
    for (const [name, type] of found)
      if (!declaration.events.some((event) => event.name === name))
        declaration.events.push({ name, type: { text: type } });
  },
  packageLinkPhase({ customElementsManifest }) {
    // The shared helper's `new CustomEvent(type)` is not an event name, and an event class
    // dispatched with a computed first argument yields an empty one.
    for (const module of customElementsManifest.modules)
      for (const declaration of module.declarations ?? [])
        if (declaration.events)
          declaration.events = declaration.events.filter(
            (event) => event.name && event.name !== 'type',
          );
  },
});

/**
 * Consumers' tooling only needs the public surface: private/protected members (and `#private`
 * ones, which the analyzer reports with `privacy: 'private'`) are dropped from every declaration.
 * The analyzer always pretty-prints; `scripts/minify-manifest.mjs` rewrites the file compact.
 */
const tweakpadPublicMembers = () => ({
  name: 'tweakpad-public-members',
  packageLinkPhase({ customElementsManifest }) {
    const isPublic = (member) =>
      member.privacy !== 'private' &&
      member.privacy !== 'protected' &&
      !String(member.name ?? '').startsWith('#');
    for (const module of customElementsManifest.modules)
      for (const declaration of module.declarations ?? []) {
        if (declaration.members) declaration.members = declaration.members.filter(isPublic);
        if (declaration.attributes)
          declaration.attributes = declaration.attributes.filter(isPublic);
      }
  },
});

/**
 * Attributes inherited from a base element keep the base default even when the element
 * overrides the field (`override orientation = 'vertical'`), and an attribute initialized from
 * a constant shows the constant's name. The member entry carries the element's own resolved
 * default, so each attribute takes its field's default.
 */
const tweakpadAttributeDefaults = () => ({
  name: 'tweakpad-attribute-defaults',
  packageLinkPhase({ customElementsManifest }) {
    for (const module of customElementsManifest.modules)
      for (const declaration of module.declarations ?? [])
        for (const attribute of declaration.attributes ?? []) {
          const member = declaration.members?.find(
            (entry) => entry.kind === 'field' && entry.name === attribute.fieldName,
          );
          if (member?.default !== undefined) attribute.default = member.default;
        }
  },
});

/**
 * The object literal of a class's own `static properties` (a field initializer or a getter's
 * return), read as the analyzer's Lit plugin reads it; undefined for any other member.
 */
function staticPropertiesObject(ts, member) {
  if (member.name?.getText() !== 'properties') return undefined;
  if (!member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword))
    return undefined;
  const expression = ts.isGetAccessor(member)
    ? member.body?.statements.find(ts.isReturnStatement)?.expression
    : member.initializer;
  return expression && ts.isObjectLiteralExpression(expression) ? expression : undefined;
}

/**
 * Each reactive property a class declares itself (spreads skipped) → whether that declaration
 * creates an attribute, which only a literal `attribute: false` prevents.
 */
function declaredAttributes(ts, node) {
  const declared = new Map();
  for (const member of node.members)
    for (const property of staticPropertiesObject(ts, member)?.properties ?? []) {
      if (!ts.isPropertyAssignment(property)) continue;
      const options = ts.isObjectLiteralExpression(property.initializer)
        ? property.initializer.properties
        : [];
      const attribute = options.find(
        (option) => ts.isPropertyAssignment(option) && option.name.text === 'attribute',
      );
      declared.set(
        property.name.getText(),
        attribute?.initializer.kind !== ts.SyntaxKind.FalseKeyword,
      );
    }
  return declared;
}

/**
 * An element that redeclares an inherited reactive property with `attribute: false` has no
 * attribute for it, but the analyzer's inheritance step adds the base attribute back and gives the
 * member the base attribute and type. The nearest declaration of the property up the class chain
 * decides: without an attribute, the inherited attribute is dropped, the member loses its
 * attribute and reflection, and it keeps the type of that class's own member.
 */
const tweakpadRedeclaredAttributes = () => {
  /**
   * Class name → its superclass name, the properties it declares itself and the own member types
   * of those declared without an attribute. Classes are looked up by name, as the analyzer's
   * inheritance chain finds them.
   */
  const classes = new Map();
  return {
    name: 'tweakpad-redeclared-attributes',
    initialize() {
      classes.clear();
    },
    analyzePhase({ ts, node }) {
      if (!ts.isClassDeclaration(node) || !node.name) return;
      const heritage = node.heritageClauses?.find(
        (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword,
      )?.types[0]?.expression;
      classes.set(node.name.text, {
        superclass: heritage && ts.isIdentifier(heritage) ? heritage.text : undefined,
        declared: declaredAttributes(ts, node),
        types: new Map(),
      });
    },
    moduleLinkPhase({ moduleDoc }) {
      // The module's own member types, before the package link phase applies inheritance.
      for (const declaration of moduleDoc.declarations ?? []) {
        const own = classes.get(declaration.name);
        for (const [field, attribute] of own?.declared ?? []) {
          if (attribute) continue;
          const member = declaration.members?.find(
            (entry) => entry.kind === 'field' && !entry.static && entry.name === field,
          );
          if (member?.type) own.types.set(field, member.type);
        }
      }
    },
    packageLinkPhase({ customElementsManifest }) {
      /** The nearest class from `name` up its chain that declares `field`, if it has no attribute. */
      const propertyOnly = (name, field) => {
        const visited = new Set();
        for (let current = classes.get(name); current && !visited.has(current);) {
          visited.add(current);
          const attribute = current.declared.get(field);
          if (attribute !== undefined) return attribute ? undefined : current;
          current = current.superclass === undefined ? undefined : classes.get(current.superclass);
        }
        return undefined;
      };
      for (const module of customElementsManifest.modules)
        for (const declaration of module.declarations ?? []) {
          if (declaration.kind !== 'class' || !declaration.attributes) continue;
          const dropped = new Map();
          for (const attribute of declaration.attributes) {
            if (!attribute.inheritedFrom || !attribute.fieldName) continue;
            const owner = propertyOnly(declaration.name, attribute.fieldName);
            if (owner) dropped.set(attribute.fieldName, owner);
          }
          if (!dropped.size) continue;
          declaration.attributes = declaration.attributes.filter(
            (attribute) => !attribute.inheritedFrom || !dropped.has(attribute.fieldName),
          );
          for (const member of declaration.members ?? []) {
            const owner =
              member.kind === 'field' && !member.static ? dropped.get(member.name) : undefined;
            if (!owner) continue;
            delete member.attribute;
            delete member.reflects;
            const type = owner.types.get(member.name);
            if (type) member.type = type;
          }
        }
    },
  };
};

export default {
  // Components plus the element bases they inherit attributes and members from.
  globs: [
    'src/components/**/*.ts',
    'src/widgets/**/*.ts',
    'src/foundation/element.ts',
    'src/foundation/form-element.ts',
  ],
  exclude: ['src/**/*.test.ts'],
  outdir: 'dist',
  litelement: true,
  plugins: [
    tweakpadTagNames(),
    tweakpadEvents(scanEventSources('src/components', 'src/widgets', 'src/foundation')),
    tweakpadPublicMembers(),
    tweakpadRedeclaredAttributes(),
    tweakpadAttributeDefaults(),
  ],
};
