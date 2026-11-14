/**
 * The types the documentation shows, read from the TypeScript compiler, never rewritten by hand.
 *
 * For every element in the Custom Elements Manifest it resolves each project type its public
 * members, methods and events name, and for each such type it keeps a card: the declaration as
 * the compiler prints it, the doc comment an editor's hover shows, the package entry that exports
 * it, and the project types the declaration names (each with its own card). The renderers draw
 * a signature's type names as clickable tokens that open these cards.
 *
 * It fails (exit 1) when a reached project type is not exported from a package entry or has no
 * doc comment, so the docs never show a type a developer cannot import or understand.
 *
 *   node scripts/manifest/api-types.mjs [--root <dir>] [--out <file>]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/** Package entries whose exports a developer imports types from, by preference. */
const ENTRY_ORDER = (specifier) => (specifier === '.' ? 0 : specifier.split('/').length);
/**
 * The members a page can show: every public instance member, inherited ones included, since a
 * table or a story may print any of them. Which rows a page shows is the renderers' choice; every
 * type those rows can name has its card.
 */
const shown = (member) =>
  !member.static && (member.privacy ?? 'public') === 'public' && !/^[_#]/u.test(member.name);

/** The type names a text writes as a code span (`DialogInitialFocus`), which the docs link too. */
const codeSpans = (text) => [...(text ?? '').matchAll(/`([A-Z]\w*)`/gu)].map((match) => match[1]);

/** Entries that only re-export framework bindings, registration or tooling. */
const SKIPPED_ENTRY =
  /^\.\/(?:react|vue|preact|solid|svelte|register|docs|icons|patterns|styles|package)|\*|\.json$|^\.\/widgets\/(?:react|vue|preact|solid|svelte)/u;

/** A specification citation (`§6.3`, `uwg-te-req-evt-5`, `Widgets 6.3`), which docs never show. */
const CITATION =
  /§|\b[a-z]{2,4}-[a-z]{2,6}-(?:req|par|tab)-|\b(?:Widgets|Foundation)(?: Specification)? §?\d|\bSpecification \d/u;

const TYPE_DECLARATION = (node) =>
  ts.isInterfaceDeclaration(node) ||
  ts.isTypeAliasDeclaration(node) ||
  ts.isClassDeclaration(node) ||
  ts.isEnumDeclaration(node);

/**
 * Builds the type data of a project plus the problems it found: `elements` (the type names each
 * element's rows mention, by card id), `symbols` (the cards) and `names` (every card by its name,
 * when the name is unique), so a renderer links any code that names a type.
 */
export function buildApiTypes({ root, manifest, packageJson }) {
  const configPath = join(root, 'tsconfig.build.json');
  const config = ts.getParsedCommandLineOfConfigFile(
    configPath,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      },
    },
  );
  const program = ts.createProgram(config.fileNames, { ...config.options, noEmit: true });
  const checker = program.getTypeChecker();
  const source = resolve(root, 'src');
  const projectFile = (file) =>
    !!file && resolve(file.fileName).startsWith(source) && !file.isDeclarationFile;
  const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });

  /** A symbol through its import aliases. */
  const target = (symbol) =>
    symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  const declarationOf = (symbol) => symbol?.declarations?.find(TYPE_DECLARATION);
  const idOf = (symbol, declaration) =>
    `${relative(root, declaration.getSourceFile().fileName).split('\\').join('/')}#${symbol.name}`;

  // Which package entry exports each project type: the shortest specifier wins.
  const importFrom = new Map();
  /** Exported project types by name: a name used out of scope resolves when it is unique. */
  const exportedByName = new Map();
  const entries = Object.entries(packageJson.exports ?? {})
    .filter(([specifier]) => !SKIPPED_ENTRY.test(specifier))
    .sort(([a], [b]) => ENTRY_ORDER(a) - ENTRY_ORDER(b));
  for (const [specifier, value] of entries) {
    const declared = typeof value === 'string' ? undefined : value.types;
    if (typeof declared !== 'string') continue;
    const file = resolve(
      root,
      declared.replace(/^\.\/dist\//u, 'src/').replace(/\.d\.ts$/u, '.ts'),
    );
    const sourceFile = program.getSourceFile(file);
    const module = sourceFile && checker.getSymbolAtLocation(sourceFile);
    if (!module) continue;
    const name = specifier === '.' ? packageJson.name : `${packageJson.name}/${specifier.slice(2)}`;
    for (const exported of checker.getExportsOfModule(module)) {
      const symbol = target(exported);
      const declaration = declarationOf(symbol);
      if (!declaration || !projectFile(declaration.getSourceFile())) continue;
      const id = idOf(symbol, declaration);
      if (!importFrom.has(id)) importFrom.set(id, { name: exported.name, from: name });
      exportedByName.set(
        symbol.name,
        new Map([...(exportedByName.get(symbol.name) ?? []), [id, symbol]]),
      );
    }
  }

  // The type names in scope in a file, imports included, resolved once per file.
  const scopes = new Map();
  const scopeOf = (node) => {
    const file = node.getSourceFile();
    let scope = scopes.get(file);
    if (!scope) {
      scope = new Map();
      for (const symbol of checker.getSymbolsInScope(
        file,
        ts.SymbolFlags.Type | ts.SymbolFlags.Alias | ts.SymbolFlags.Namespace,
      ))
        scope.set(symbol.name, symbol);
      scopes.set(file, scope);
    }
    return scope;
  };

  const symbols = {};
  const pending = [];
  const problems = new Set();
  /** The card id of a project type symbol, queuing its card; undefined for any other symbol. */
  const reach = (symbol, via) => {
    const resolved = target(symbol);
    const declaration = declarationOf(resolved);
    if (!declaration || !projectFile(declaration.getSourceFile())) return undefined;
    const id = idOf(resolved, declaration);
    if (!(id in symbols)) {
      symbols[id] = null;
      pending.push({ id, symbol: resolved, declaration, via });
    }
    return id;
  };
  /**
   * Project type names, resolved in the scope of `node`: every capitalized name of a type text,
   * or the given names (a description's code spans).
   */
  const namesIn = (
    text,
    node,
    via,
    names = [...text.matchAll(/\b[A-Z]\w*\b/gu)].map(([n]) => n),
  ) => {
    const refs = {};
    const scope = scopeOf(node);
    for (const name of names) {
      if (name in refs) continue;
      // The manifest may name a type the file never imports (an indexed type it resolved).
      const unique = exportedByName.get(name);
      const symbol = scope.get(name) ?? (unique?.size === 1 ? [...unique.values()][0] : undefined);
      const id = symbol && reach(symbol, via);
      if (id) refs[name] = id;
    }
    return refs;
  };

  // Every element's public surface, resolved where each member is declared.
  const elements = {};
  for (const module of manifest.modules ?? [])
    for (const declaration of module.declarations ?? []) {
      if (!declaration.tagName || !declaration.name) continue;
      const file = program.getSourceFile(resolve(root, module.path));
      const classNode = file?.statements.find(
        (statement) =>
          ts.isClassDeclaration(statement) && statement.name?.text === declaration.name,
      );
      if (!classNode) continue;
      const classType = checker.getTypeAtLocation(classNode);
      const refs = {};
      const add = (text, node, label) => Object.assign(refs, namesIn(text ?? '', node, label));
      const prose = (text, node, label) =>
        Object.assign(refs, namesIn('', node, label, codeSpans(text)));
      for (const member of declaration.members ?? []) {
        if (!shown(member)) continue;
        const property = classType.getProperty(member.name);
        const at = property?.valueDeclaration ?? property?.declarations?.[0] ?? classNode;
        const label = `${declaration.tagName}.${member.name}`;
        add(member.type?.text, at, label);
        add(member.return?.type?.text, at, label);
        for (const parameter of member.parameters ?? []) add(parameter.type?.text, at, label);
        prose(member.description, at, label);
      }
      for (const attribute of declaration.attributes ?? []) {
        if (/^_/u.test(attribute.fieldName ?? attribute.name)) continue;
        const label = `${declaration.tagName}[${attribute.name}]`;
        add(attribute.type?.text, classNode, label);
        prose(attribute.description, classNode, label);
      }
      for (const event of declaration.events ?? []) {
        const label = `${declaration.tagName} ${event.name}`;
        add(event.type?.text, classNode, label);
        prose(event.description, classNode, label);
      }
      for (const entry of [
        ...(declaration.slots ?? []),
        ...(declaration.cssParts ?? []),
        ...(declaration.cssProperties ?? []),
      ])
        prose(entry.description, classNode, `${declaration.tagName} ${entry.name || 'slot'}`);
      elements[declaration.tagName] = refs;
    }

  // Cards, followed through every project type a declaration names.
  while (pending.length) {
    const { id, symbol, declaration, via } = pending.shift();
    const refs = {};
    const visit = (node) => {
      if (ts.isTypeReferenceNode(node) || ts.isExpressionWithTypeArguments(node)) {
        const name = ts.isTypeReferenceNode(node) ? node.typeName : node.expression;
        const referenced = checker.getSymbolAtLocation(
          ts.isQualifiedName(name) ? name.right : name,
        );
        const ref = referenced && reach(referenced, `${symbol.name} (from ${via})`);
        if (ref) refs[(ts.isQualifiedName(name) ? name.right : name).getText()] = ref;
      }
      ts.forEachChild(node, visit);
    };
    let text;
    if (ts.isClassDeclaration(declaration)) {
      // A class used as a type: its header, not its body.
      const heritage = (declaration.heritageClauses ?? [])
        .map((clause) => clause.getText())
        .join(' ');
      const parameters = declaration.typeParameters
        ? `<${declaration.typeParameters.map((parameter) => parameter.getText()).join(', ')}>`
        : '';
      text = `class ${symbol.name}${parameters}${heritage ? ` ${heritage}` : ''}`;
      // Its bases link only when a developer can import them; internal bases stay plain names.
      for (const clause of declaration.heritageClauses ?? [])
        for (const type of clause.types) {
          const base = target(checker.getSymbolAtLocation(type.expression));
          const baseDeclaration = declarationOf(base);
          if (!baseDeclaration || !projectFile(baseDeclaration.getSourceFile())) continue;
          if (importFrom.has(idOf(base, baseDeclaration))) visit(type);
        }
    } else {
      text = printer
        .printNode(ts.EmitHint.Unspecified, declaration, declaration.getSourceFile())
        .replace(/^(?: {4})+/gmu, (indent) => '  '.repeat(indent.length / 4))
        .replace(/^export\s+(?:declare\s+)?/u, '')
        .trim();
      visit(declaration);
    }
    const documentation = ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
    // The types its doc comment writes as code spans open their cards too.
    Object.assign(
      refs,
      namesIn('', declaration, `${symbol.name} (from ${via})`, codeSpans(documentation)),
      refs,
    );
    delete refs[symbol.name];
    const exported = importFrom.get(id);
    symbols[id] = {
      name: symbol.name,
      kind: ts.isInterfaceDeclaration(declaration)
        ? 'interface'
        : ts.isTypeAliasDeclaration(declaration)
          ? 'type'
          : ts.isEnumDeclaration(declaration)
            ? 'enum'
            : 'class',
      declaration: text,
      documentation,
      ...(exported ? { importFrom: exported.from } : {}),
      refs,
    };
    if (!exported)
      problems.add(
        `${symbol.name} (${id.split('#')[0]}) is not exported from a package entry; reached from ${via}`,
      );
    if (CITATION.test(documentation))
      problems.add(
        `${symbol.name} (${id.split('#')[0]}) cites the specification in its doc comment`,
      );
    if (!documentation)
      problems.add(`${symbol.name} (${id.split('#')[0]}) has no doc comment; reached from ${via}`);
  }
  // Every card by its name, when no other card shares it: renderers link any code naming it.
  const byName = new Map();
  for (const [id, symbol] of Object.entries(symbols))
    byName.set(symbol.name, byName.has(symbol.name) ? null : id);
  const names = Object.fromEntries([...byName].filter(([, id]) => id).sort());
  return { types: { elements, symbols, names }, problems: [...problems].sort() };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argument = (name, fallback) => {
    const at = process.argv.indexOf(name);
    return at > 0 ? process.argv[at + 1] : fallback;
  };
  const root = resolve(argument('--root', join(dirname(fileURLToPath(import.meta.url)), '../..')));
  const out = resolve(root, argument('--out', 'dist/api-types.json'));
  const manifestPath = join(root, 'dist/custom-elements.json');
  if (!existsSync(manifestPath)) {
    console.error('api-types: dist/custom-elements.json is missing; run `cem analyze` first');
    process.exit(1);
  }
  const { types, problems } = buildApiTypes({
    root,
    manifest: JSON.parse(readFileSync(manifestPath, 'utf8')),
    packageJson: JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')),
  });
  writeFileSync(out, JSON.stringify(types));
  const count = Object.keys(types.symbols).length;
  if (problems.length) {
    // exitCode, not exit(): a long report written to a pipe would be cut off.
    process.exitCode = 1;
    console.error(
      `api-types: ${problems.length} problem(s) in ${count} types:\n  ${problems.join('\n  ')}`,
    );
  } else
    console.log(`api-types: ${count} types for ${Object.keys(types.elements).length} elements`);
}
