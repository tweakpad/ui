import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

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
  // A shared controller fires what its own class body dispatches (plus module-level helpers it
  // calls by name), not everything its module fires: a module can hold several controllers.
  const firedIn = (text) =>
    new Set([
      ...[...text.matchAll(/new (Tp\w+Event)\b/gu)]
        .map((match) => eventClasses.get(match[1]))
        .filter(Boolean),
      ...[...text.matchAll(/(?:\.emit|new CustomEvent)\(\s*'(tp-[a-z-]+)'/gu)].map(
        (match) => match[1],
      ),
    ]);
  const controllers = new Map();
  for (const source of sources) {
    const classes = [...source.matchAll(/export class (\w+)/gu)];
    if (!classes.length) continue;
    // Module-level functions, each with the events its body fires.
    const helpers = new Map();
    const functions = [...source.matchAll(/^(?:export )?function (\w+)/gmu)];
    functions.forEach((match, index) => {
      const end = Math.min(
        ...[functions[index + 1]?.index, ...classes.map((entry) => entry.index)].filter(
          (position) => position !== undefined && position > match.index,
        ),
        source.length,
      );
      helpers.set(match[1], firedIn(source.slice(match.index, end)));
    });
    classes.forEach((match, index) => {
      const name = match[1];
      if (eventClasses.has(name)) return;
      const body = source.slice(match.index, classes[index + 1]?.index ?? source.length);
      const fired = firedIn(body);
      for (const [helper, events] of helpers)
        if (new RegExp(`\\b${helper}\\(`, 'u').test(body))
          for (const event of events) fired.add(event);
      if (fired.size) controllers.set(name, fired);
    });
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
        // A controller given its own `eventFactory` dispatches the factory's events instead of
        // its defaults (a Drawer's controllable snap point fires `tp-snap-point-change`).
        const ownFactory = (child.arguments ?? []).some(
          (argument) =>
            ts.isObjectLiteralExpression(argument) &&
            argument.properties.some((property) => property.name?.getText() === 'eventFactory'),
        );
        if (!ownFactory)
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
 * A class that redeclares an inherited member keeps its own visibility. The analyzer's
 * inheritance step gives the redeclared member the base's privacy, so a protected base property
 * that an element makes public (`override queryOwner = null`) was dropped with the protected
 * members. Runs before `tweakpadPublicMembers`.
 */
const tweakpadRedeclaredPrivacy = () => {
  /** Class name, static flag and member name → the privacy the class declares (none: public). */
  const own = new Map();
  const key = (declaration, member) =>
    `${declaration.name}\0${member.static ? 'static' : ''}\0${member.name}`;
  return {
    name: 'tweakpad-redeclared-privacy',
    initialize() {
      own.clear();
    },
    moduleLinkPhase({ moduleDoc }) {
      // The module's own members, before the package link phase applies inheritance.
      for (const declaration of moduleDoc.declarations ?? [])
        for (const member of declaration.members ?? [])
          own.set(key(declaration, member), member.privacy);
    },
    packageLinkPhase({ customElementsManifest }) {
      for (const module of customElementsManifest.modules)
        for (const declaration of module.declarations ?? [])
          for (const member of declaration.members ?? []) {
            if (!member.inheritedFrom || !own.has(key(declaration, member))) continue;
            const privacy = own.get(key(declaration, member));
            if (privacy === undefined) delete member.privacy;
            else member.privacy = privacy;
          }
    },
  };
};

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

/**
 * The library elements an element renders, for the documentation's Related sections: each class's
 * `static get elementDependencies()` lists the element classes its own templates render, and
 * `defineElement` walks the whole class chain, so an element renders what every class above it
 * declares too. The plugin reads the identifiers of each getter's array literal, resolves them to
 * tags once every module is analyzed, unions them up the superclass chain and writes the tags as
 * the declaration's `renders` field.
 */
const tweakpadRenders = () => {
  /** Class name → identifiers its own getter returns. */
  const declared = new Map();
  return {
    name: 'tweakpad-renders',
    initialize() {
      declared.clear();
    },
    analyzePhase({ ts, node }) {
      if (!ts.isClassDeclaration(node) || !node.name) return;
      const getter = node.members.find(
        (member) =>
          ts.isGetAccessor(member) &&
          member.name?.getText() === 'elementDependencies' &&
          member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword),
      );
      if (!getter) return;
      const identifiers = [];
      const visit = (child) => {
        if (ts.isArrayLiteralExpression(child))
          for (const element of child.elements)
            if (ts.isIdentifier(element)) identifiers.push(element.text);
        ts.forEachChild(child, visit);
      };
      ts.forEachChild(getter, visit);
      declared.set(node.name.text, identifiers);
    },
    packageLinkPhase({ customElementsManifest }) {
      const declarations = new Map();
      for (const module of customElementsManifest.modules)
        for (const declaration of module.declarations ?? [])
          if (declaration.kind === 'class') declarations.set(declaration.name, declaration);
      const tagOf = (name) => declarations.get(name)?.tagName;
      for (const declaration of declarations.values()) {
        if (!declaration.tagName) continue;
        const tags = new Set();
        const visited = new Set();
        for (
          let current = declaration;
          current && !visited.has(current.name);
          current = declarations.get(current.superclass?.name)
        ) {
          visited.add(current.name);
          for (const identifier of declared.get(current.name) ?? []) {
            const tag = tagOf(identifier);
            if (tag && tag !== declaration.tagName) tags.add(tag);
          }
        }
        declaration.renders = [...tags].sort();
      }
    },
  };
};

/**
 * Shadow parts and presentation axes, from the presentation families (`src/presentation/
 * families/*.ts`), which declare each component's parts with their descriptions and each axis
 * with its values. A class exposes a part when its templates set `part="<name>"` (or
 * `part: '<name>'` through `renderPart`); the plugin lists those parts under `cssParts` with the
 * family's description, keeping any `@csspart` JSDoc entry already there. An attribute that is
 * one of the family's axes shows the axis values as its type when the field is typed `string`.
 */
function scanFamilies(folder) {
  const families = [];
  const text = (node) => (ts.isStringLiteralLike(node) ? node.text : undefined);
  const property = (object, name) =>
    object.properties.find(
      (entry) => ts.isPropertyAssignment(entry) && entry.name.getText() === name,
    )?.initializer;
  for (const entry of readdirSync(folder)) {
    if (!entry.endsWith('.ts') || entry === 'index.ts' || entry === 'widgets.ts') continue;
    const source = ts.createSourceFile(
      entry,
      readFileSync(join(folder, entry), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    let definition;
    const bindings = new Set();
    const visit = (node) => {
      if (
        ts.isVariableDeclaration(node) &&
        node.name.getText() === 'definition' &&
        node.initializer
      )
        if (ts.isObjectLiteralExpression(node.initializer)) definition = node.initializer;
      if (ts.isPropertyAssignment(node) && node.name.getText() === 'bindings')
        if (ts.isObjectLiteralExpression(node.initializer))
          for (const binding of node.initializer.properties) {
            const tag = binding.name && text(binding.name);
            if (tag) bindings.add(tag);
          }
      ts.forEachChild(node, visit);
    };
    visit(source);
    if (!definition) continue;
    const tagName = text(property(definition, 'tagName') ?? ts.factory.createNull());
    const parts = new Map();
    const partsNode = property(definition, 'parts');
    if (partsNode && ts.isArrayLiteralExpression(partsNode))
      for (const part of partsNode.elements)
        if (ts.isObjectLiteralExpression(part)) {
          const name = text(property(part, 'name') ?? ts.factory.createNull());
          const description = property(part, 'description');
          if (name) parts.set(name, description ? text(description) : undefined);
        }
    const axes = new Map();
    const axesNode = property(definition, 'axes');
    if (axesNode && ts.isArrayLiteralExpression(axesNode))
      for (const axis of axesNode.elements)
        if (ts.isObjectLiteralExpression(axis)) {
          const name = text(property(axis, 'name') ?? ts.factory.createNull());
          const values = property(axis, 'values');
          if (name && values && ts.isArrayLiteralExpression(values))
            axes.set(name, values.elements.map(text).filter(Boolean));
        }
    families.push({ tagName, bindings, parts, axes });
  }
  return families;
}

const tweakpadParts = (families) => {
  /** Class name → part names its own source exposes. */
  const exposed = new Map();
  const familyOf = (tagName) =>
    families.find((family) => family.tagName === tagName) ??
    families.find((family) => family.bindings.has(tagName));
  return {
    name: 'tweakpad-parts',
    initialize() {
      exposed.clear();
    },
    analyzePhase({ ts, node }) {
      if (!ts.isClassDeclaration(node) || !node.name) return;
      const source = node.getText();
      // Parts the class sets directly: a `part` attribute or property literal (not a `data-*-part`
      // marker) and `renderPart('<name>', …)`, which sets `part` to its first argument.
      const direct = new Set([
        ...[...source.matchAll(/(?<![\w-])part(?:="|: ')([\w-]+)['"]/gu)].map((match) => match[1]),
        ...[...source.matchAll(/renderPart\(\s*['"]([\w-]+)['"]/gu)].map((match) => match[1]),
      ]);
      // A part name passed through a variable (`renderPart(name, …)`) is still a string literal
      // somewhere in the class; it counts only in a class that renders parts that way and only
      // when the element's family declares that part. A bare word (`map`, `label`) is too common
      // to trust: it counts only as the element's own root (`checkbox` on `tp-checkbox`), and not
      // where the template names its root part `root` (Label, Separator).
      const literals = /renderPart\(\s*(?!['"`])/u.test(source)
        ? new Set([...source.matchAll(/['"`]([a-z][\w-]*)['"`]/gu)].map((match) => match[1]))
        : new Set();
      exposed.set(node.name.text, { direct, literals });
    },
    packageLinkPhase({ customElementsManifest }) {
      const declarations = new Map();
      for (const module of customElementsManifest.modules)
        for (const declaration of module.declarations ?? [])
          if (declaration.kind === 'class') declarations.set(declaration.name, declaration);
      for (const declaration of declarations.values()) {
        if (!declaration.tagName) continue;
        const family = familyOf(declaration.tagName);
        const names = new Set();
        const visited = new Set();
        for (
          let current = declaration;
          current && !visited.has(current.name);
          current = declarations.get(current.superclass?.name)
        ) {
          visited.add(current.name);
          const found = exposed.get(current.name);
          for (const name of found?.direct ?? []) names.add(name);
          for (const name of found?.literals ?? []) {
            if (!family?.parts.has(name)) continue;
            const compound = name.includes('-');
            if (compound || (declaration.tagName === `tp-${name}` && !found.direct.has('root')))
              names.add(name);
          }
        }
        if (names.size) {
          declaration.cssParts ??= [];
          for (const name of [...names].sort()) {
            const existing = declaration.cssParts.find((part) => part.name === name);
            const description =
              family?.parts.get(name) ??
              families.find((other) => other.parts.get(name))?.parts.get(name);
            if (existing) {
              if (!existing.description && description) existing.description = description;
            } else declaration.cssParts.push({ name, ...(description ? { description } : {}) });
          }
        }
        if (!family) continue;
        for (const attribute of declaration.attributes ?? []) {
          const values = attribute.fieldName && family.axes.get(attribute.fieldName);
          if (values?.length && (!attribute.type?.text || attribute.type.text === 'string'))
            attribute.type = { text: values.map((value) => `'${value}'`).join(' | ') };
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
    tweakpadRedeclaredPrivacy(),
    tweakpadPublicMembers(),
    tweakpadRedeclaredAttributes(),
    tweakpadAttributeDefaults(),
    tweakpadRenders(),
    tweakpadParts(scanFamilies('src/presentation/families')),
  ],
};
