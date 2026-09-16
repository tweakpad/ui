export type DefinitionKind =
  | 'compound-reexport'
  | 'flattening-compound'
  | 'preset-composition'
  | 'presentational-primitive'
  | 'thin-wrapper';

export interface PartDefinition {
  name: string;
  slot?: string;
  required?: boolean;
  multiple?: boolean;
  presentationKeys?: readonly string[];
}

export interface ComponentMotionRoleDefinition {
  name: string;
  target: string;
  kind: 'presence' | 'state' | 'ambient';
  phases: readonly ('enter' | 'exit' | 'change' | 'start' | 'stop')[];
  completion: 'blocking' | 'non-blocking';
  context?: readonly string[];
}

export interface ComponentDefinition {
  name: string;
  tagName: `tp-${string}`;
  kind: DefinitionKind;
  parts: readonly PartDefinition[];
  variants?: Readonly<Record<string, readonly string[]>>;
  states?: readonly string[];
  fixedProperties?: Readonly<Record<string, unknown>>;
  motionRoles?: readonly ComponentMotionRoleDefinition[];
}

export class DefinitionRegistry {
  readonly #definitions = new Map<string, ComponentDefinition>();

  register(definition: ComponentDefinition): () => void {
    validateDefinition(definition);
    if (
      this.#definitions.has(definition.name) ||
      [...this.#definitions.values()].some((item) => item.tagName === definition.tagName)
    ) {
      throw new Error(`Duplicate component definition: ${definition.name}`);
    }
    const frozen = deepFreeze(structuredClone(definition));
    this.#definitions.set(definition.name, frozen);
    return () => this.#definitions.delete(definition.name);
  }

  get(name: string): ComponentDefinition | undefined {
    return this.#definitions.get(name);
  }

  list(): readonly ComponentDefinition[] {
    return [...this.#definitions.values()];
  }
}

export function validateDefinition(definition: ComponentDefinition): void {
  if (!definition.name.trim()) throw new Error('Component definition name is required');
  if (!/^tp-[a-z0-9-]+$/.test(definition.tagName))
    throw new Error(`Invalid custom-element name: ${definition.tagName}`);
  const names = definition.parts.map((part) => part.name);
  if (names.length !== new Set(names).size)
    throw new Error(`Duplicate public part in ${definition.name}`);
  for (const part of definition.parts) {
    if (!/^[a-z][a-z0-9-]*$/.test(part.name))
      throw new Error(`Invalid public part name: ${part.name}`);
    if (part.slot && !/^[a-z][a-z0-9-]*$/.test(part.slot))
      throw new Error(`Invalid public slot name: ${part.slot}`);
  }
  const roleNames = definition.motionRoles?.map((role) => role.name) ?? [];
  if (roleNames.length !== new Set(roleNames).size)
    throw new Error(`Duplicate motion role in ${definition.name}`);
  for (const role of definition.motionRoles ?? []) {
    if (!/^[a-z][a-z0-9-]*$/.test(role.name))
      throw new Error(`Invalid motion role name: ${role.name}`);
    if (!definition.parts.some((part) => part.name === role.target))
      throw new Error(`Unknown motion target in ${definition.name}: ${role.target}`);
    if (!role.phases.length) throw new Error(`Motion role ${role.name} has no phases`);
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
