import { existsSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import ts from 'typescript';

/**
 * The type of every `tp-*` event a class dispatches, read with the type checker from the dispatch
 * itself, so the manifest (and every framework binding generated from it) cannot drift from the
 * code. A class dispatches:
 * - `emit('tp-…', detail)` on any receiver (`this.emit`, a controller's `options.emit`) and
 *   `dispatchTpEvent(target, 'tp-…', detail)`: a `CustomEvent` of the detail's type (an explicit
 *   type argument wins over the inferred one);
 * - `new SomeEvent(…)` of an `Event` subclass: that event's type, named by a `tp-…` argument or
 *   the class's static `eventName`;
 * - the events of a plain function it calls, and of a controller it constructs (a non-element
 *   class that dispatches events), with the controller's type parameters replaced by the
 *   instance's type arguments. A controller given its own `eventFactory` fires the factory's
 *   events (found in the constructing class) instead of its defaults.
 *
 * Each type comes with the named types it references (`{ name, module }`), so tooling can import
 * them. Classes are keyed by `<module>#<name>`, modules relative to `root`.
 */
export function analyzeEventTypes({ root, modules }) {
  // The program starts from the analyzed modules; what they import (base classes, controllers,
  // event classes) joins it through module resolution.
  const files = modules.map((module) => resolve(root, module)).filter((file) => existsSync(file));
  if (!files.length) return new Map();
  const configPath = resolve(root, 'tsconfig.json');
  const config = ts.parseJsonConfigFileContent(
    ts.readConfigFile(configPath, ts.sys.readFile).config,
    ts.sys,
    root,
  );
  const program = ts.createProgram({
    rootNames: files,
    options: { ...config.options, noEmit: true },
  });
  const checker = program.getTypeChecker();
  const source = resolve(root, 'src');
  const inSource = (fileName) => resolve(fileName).startsWith(source);
  const modulePath = (fileName) => relative(root, fileName).split('\\').join('/');
  const flags =
    ts.TypeFormatFlags.NoTruncation |
    ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
    ts.TypeFormatFlags.WriteArrayAsGenericType;
  const text = (type) =>
    checker.typeToString(type, undefined, flags & ~ts.TypeFormatFlags.WriteArrayAsGenericType);

  /** Named source types a type mentions (aliases and interfaces/classes, not their members). */
  const references = (type, found = new Map(), seen = new Set()) => {
    if (!type || seen.has(type)) return found;
    seen.add(type);
    const add = (symbol) => {
      const declaration = symbol?.declarations?.[0];
      if (!declaration || !inSource(declaration.getSourceFile().fileName)) return false;
      const module = modulePath(declaration.getSourceFile().fileName);
      found.set(`${module}#${symbol.name}`, { name: symbol.name, module });
      return true;
    };
    if (type.aliasSymbol) {
      add(type.aliasSymbol);
      for (const argument of type.aliasTypeArguments ?? []) references(argument, found, seen);
      return found;
    }
    if (type.isUnionOrIntersection()) {
      // A union printed through an alias (`DrawerSnapPoint | null`) keeps the alias in its origin.
      const members = type.origin?.isUnionOrIntersection?.() ? type.origin.types : type.types;
      for (const member of members) references(member, found, seen);
      return found;
    }
    if (type.flags & ts.TypeFlags.Object) {
      const reference = type.objectFlags & ts.ObjectFlags.Reference ? type : undefined;
      const symbol = (reference?.target ?? type).symbol;
      for (const argument of reference ? checker.getTypeArguments(reference) : [])
        references(argument, found, seen);
      if (
        symbol &&
        !symbol.name.startsWith('__') &&
        symbol.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Interface)
      )
        add(symbol);
      else if (!reference || !symbol || symbol.name.startsWith('__'))
        for (const property of checker.getPropertiesOfType(type))
          references(checker.getTypeOfSymbol(property), found, seen);
    }
    return found;
  };
  const typed = (type) => ({ text: text(type), references: [...references(type).values()] });

  const extendsElement = (declaration) => {
    const type = checker.getTypeAtLocation(declaration);
    for (let base = type; base;) {
      if (base.symbol?.name === 'HTMLElement') return true;
      const bases = base.isClassOrInterface?.() ? checker.getBaseTypes(base) : [];
      base = bases[0];
    }
    return false;
  };
  const isEventType = (type) => {
    for (let current = type; current;) {
      const name = current.symbol?.name;
      if (name === 'Event' || name === 'CustomEvent') return true;
      const target = current.objectFlags & ts.ObjectFlags.Reference ? current.target : current;
      const bases = target.isClassOrInterface?.() ? checker.getBaseTypes(target) : [];
      current = bases[0];
    }
    return false;
  };
  /**
   * A string argument's possible values: a literal, a constant typed as one, or a union of them
   * (`ok ? 'tp-copied' : 'tp-copy-error'`, a lookup in an `as const` table).
   */
  const literals = (node) => {
    if (!node) return [];
    if (ts.isStringLiteralLike(node)) return [node.text];
    const type = checker.getTypeAtLocation(node);
    return (type.isUnion() ? type.types : [type])
      .filter((member) => member.isStringLiteral())
      .map((member) => member.value);
  };
  const isEventName = (value) => typeof value === 'string' && /^tp-[a-z-]+$/u.test(value);
  const eventName = (value) => (isEventName(value) ? value : undefined);
  /** The name an event class passes to `super('tp-…')`, up its class chain. */
  const superName = (declaration) => {
    for (let current = declaration; current && ts.isClassDeclaration(current);) {
      const constructor = current.members.find(ts.isConstructorDeclaration);
      let found;
      const visit = (node) => {
        if (found) return;
        if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.SuperKeyword)
          found = literals(node.arguments[0]).find(isEventName);
        else ts.forEachChild(node, visit);
      };
      if (constructor?.body) visit(constructor.body);
      if (found) return found;
      const heritage = current.heritageClauses?.find(
        (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword,
      )?.types[0]?.expression;
      let base = heritage && checker.getSymbolAtLocation(heritage);
      if (base && base.flags & ts.SymbolFlags.Alias) base = checker.getAliasedSymbol(base);
      current = base?.valueDeclaration;
    }
    return undefined;
  };

  /** Whether a constructed event is passed to `dispatchEvent`, directly or through a constant. */
  const dispatched = (node) => {
    const isDispatch = (call) =>
      ts.isCallExpression(call) &&
      (ts.isPropertyAccessExpression(call.expression)
        ? call.expression.name.text
        : call.expression.getText()) === 'dispatchEvent';
    if (isDispatch(node.parent)) return true;
    if (!ts.isVariableDeclaration(node.parent) || !ts.isIdentifier(node.parent.name)) return false;
    const name = node.parent.name.text;
    let scope = node.parent;
    while (scope && !ts.isFunctionLike(scope) && !ts.isSourceFile(scope)) scope = scope.parent;
    let found = false;
    const search = (child) => {
      if (found) return;
      if (isDispatch(child) && child.arguments.some((argument) => argument.getText() === name))
        found = true;
      else ts.forEachChild(child, search);
    };
    if (scope) search(scope);
    return found;
  };

  /** Class/function declaration → Map<eventName, { text, references, typeParameters? }>. */
  const cache = new Map();
  const classOf = new Map();

  const dispatches = (container) => {
    if (cache.has(container)) return cache.get(container);
    const events = new Map();
    cache.set(container, events);
    const record = (name, type) => {
      if (name && !events.has(name)) events.set(name, typed(type));
    };
    const visit = (node) => {
      // A nested class is its own owner.
      if (node !== container && ts.isClassLike(node)) return;
      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        const method = ts.isPropertyAccessExpression(callee) ? callee.name.text : undefined;
        if (method === 'emit' || (ts.isIdentifier(callee) && callee.text === 'dispatchTpEvent')) {
          const offset = method === 'emit' ? 0 : 1;
          const names = literals(node.arguments[offset]).filter(isEventName);
          const detail = node.arguments[offset + 1];
          if (names.length) {
            const explicit = node.typeArguments?.[0];
            let type = explicit ? checker.getTypeFromTypeNode(explicit) : undefined;
            if (!type && detail) {
              const parameter = checker.getResolvedSignature(node)?.parameters[offset + 1];
              const declared = parameter && checker.getTypeOfSymbolAtLocation(parameter, node);
              type =
                declared && !(declared.flags & (ts.TypeFlags.Unknown | ts.TypeFlags.Any))
                  ? declared
                  : checker.getWidenedType(checker.getTypeAtLocation(detail));
            }
            const detailText = type ? text(type) : 'undefined';
            for (const name of names)
              if (!events.has(name))
                events.set(name, {
                  text: `CustomEvent<${detailText}>`,
                  references: type ? [...references(type).values()] : [],
                });
          }
        } else {
          // The events of a plain function this code calls.
          const symbol = checker.getSymbolAtLocation(callee);
          const target =
            symbol && symbol.flags & ts.SymbolFlags.Alias
              ? checker.getAliasedSymbol(symbol)
              : symbol;
          const declaration = target?.valueDeclaration;
          if (
            declaration &&
            ts.isFunctionDeclaration(declaration) &&
            declaration.body &&
            inSource(declaration.getSourceFile().fileName)
          )
            for (const [name, type] of dispatches(declaration))
              if (!events.has(name)) events.set(name, type);
        }
      }
      if (ts.isNewExpression(node)) {
        const type = checker.getTypeAtLocation(node);
        const constructed = checker.getSymbolAtLocation(node.expression);
        const symbol =
          constructed && constructed.flags & ts.SymbolFlags.Alias
            ? checker.getAliasedSymbol(constructed)
            : constructed;
        const declaration = symbol?.valueDeclaration;
        if (isEventType(type)) {
          const named = (node.arguments ?? []).flatMap(literals).find(isEventName);
          // The class's static `eventName`, declared on it or inherited from a base event class.
          const statics = symbol && checker.getTypeOfSymbolAtLocation(symbol, node);
          const declared = statics && checker.getPropertyOfType(statics, 'eventName');
          const declaredType = declared && checker.getTypeOfSymbol(declared);
          const fallback = declaredType?.isStringLiteral() ? declaredType.value : undefined;
          const first = literals(node.arguments?.[0])[0];
          const own = declaration && inSource(declaration.getSourceFile().fileName);
          const inherited =
            own && ts.isClassDeclaration(declaration) ? superName(declaration) : undefined;
          // A platform `Event`/`CustomEvent` counts only where it is dispatched; library event
          // classes are always dispatched (directly or through a controller's dispatch option).
          if (own || dispatched(node))
            record(eventName(named ?? fallback ?? inherited ?? first), type);
        } else if (
          declaration &&
          ts.isClassDeclaration(declaration) &&
          inSource(declaration.getSourceFile().fileName) &&
          !extendsElement(declaration)
        ) {
          const ownFactory = (node.arguments ?? []).some(
            (argument) =>
              ts.isObjectLiteralExpression(argument) &&
              argument.properties.some((property) => property.name?.getText() === 'eventFactory'),
          );
          if (!ownFactory) {
            const fired = dispatches(declaration);
            const parameters = (declaration.typeParameters ?? []).map(
              (parameter) => parameter.name.text,
            );
            const target = type.objectFlags & ts.ObjectFlags.Reference ? type : undefined;
            const argumentsOf = target ? checker.getTypeArguments(target) : [];
            for (const [name, event] of fired) {
              if (events.has(name)) continue;
              let instance = event.text;
              const extra = [];
              parameters.forEach((parameter, index) => {
                const argument = argumentsOf[index];
                if (!argument) return;
                const value = text(argument);
                // A union argument needs parentheses only where an array suffix follows it.
                const wrapped = /[|&]/u.test(value) ? `(${value})` : value;
                instance = instance.replace(
                  new RegExp(`\\b${parameter}\\b`, 'gu'),
                  (match, offset, whole) =>
                    whole[offset + match.length] === '[' ? wrapped : value,
                );
                extra.push(...references(argument).values());
              });
              const merged = new Map(
                [...event.references, ...extra].map((reference) => [
                  `${reference.module}#${reference.name}`,
                  reference,
                ]),
              );
              events.set(name, { text: instance, references: [...merged.values()] });
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    if (ts.isClassLike(container)) ts.forEachChild(container, visit);
    else if (container.body) visit(container.body);
    return events;
  };

  const classes = new Map();
  for (const file of program.getSourceFiles()) {
    if (!files.includes(resolve(file.fileName)) && !files.includes(file.fileName)) continue;
    const module = modulePath(file.fileName);
    const visit = (node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        classOf.set(node, `${module}#${node.name.text}`);
        const events = dispatches(node);
        const heritage = node.heritageClauses?.find(
          (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword,
        )?.types[0]?.expression;
        let base = heritage && checker.getSymbolAtLocation(heritage);
        if (base && base.flags & ts.SymbolFlags.Alias) base = checker.getAliasedSymbol(base);
        const baseDeclaration = base?.valueDeclaration;
        classes.set(`${module}#${node.name.text}`, {
          name: node.name.text,
          module,
          ...(baseDeclaration &&
          ts.isClassDeclaration(baseDeclaration) &&
          baseDeclaration.name &&
          inSource(baseDeclaration.getSourceFile().fileName)
            ? {
                superclass: `${modulePath(baseDeclaration.getSourceFile().fileName)}#${baseDeclaration.name.text}`,
              }
            : {}),
          typeParameters: (node.typeParameters ?? []).map((parameter) => ({
            name: parameter.name.text,
            ...(parameter.default ? { default: parameter.default.getText() } : {}),
            ...(parameter.constraint ? { constraint: parameter.constraint.getText() } : {}),
          })),
          events,
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return classes;
}
