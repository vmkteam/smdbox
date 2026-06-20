/** Shared types/helpers for the parameter & return description tables. */

/** A schema node shown in the params/returns tables (param, property, ...). */
export interface DescNode {
  type?: string;
  description?: string;
  optional?: boolean;
  $ref?: string;
  items?: Record<string, string>;
  properties?: Record<string, DescNode>;
}

function refName(ref?: string): string {
  return ref ? (ref.split('/').pop() ?? '') : '';
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
