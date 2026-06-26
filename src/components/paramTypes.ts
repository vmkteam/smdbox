/** Shared types/helpers for the parameter & return description tables. */

/** A schema node shown in the params/returns tables (param, property, ...). */
export interface DescNode {
  type?: string;
  description?: string;
  optional?: boolean;
  $ref?: string;
  items?: Record<string, string>;
  properties?: Record<string, DescNode>;
  /** Allowed values, when the schema enumerates them. */
  enum?: unknown[];
}

function refName(ref?: string): string {
  return ref ? (ref.split('/').pop() ?? '') : '';
}

/**
 * Name of the definition this node references (directly or as array items),
 * or '' when it is not a reference. Used to inline nested type definitions.
 */
export function referencedTypeName(node: DescNode): string {
  if (node.type === 'array') return refName(node.items?.['$ref']);
  if (node.$ref) return refName(node.$ref);
  return '';
}

/** Human-readable type label, mirroring the legacy resolveType logic. */
export function resolveType(node: DescNode): string {
  if (node.type === 'array') {
    return `[]${node.items?.type ?? refName(node.items?.['$ref']) ?? ''}`;
  }
  if (node.type === 'object' && node.$ref) {
    return refName(node.$ref);
  }
  return node.type ?? '';
}
