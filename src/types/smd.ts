/**
 * SMD (Service Mapping Description) contract as emitted by vmkteam/zenrpc.
 * Mirrors zenrpc `smd/model.go` as serialized to JSON (the wire format).
 *
 * Note: Go's `PropertyList` marshals to a JSON object keyed by property name,
 * so on the wire `properties` is a `Record<string, SmdProperty>`, and the
 * property's own name is its key (not an inline field).
 */

export const SmdType = {
  String: 'string',
  Integer: 'integer',
  Array: 'array',
  Boolean: 'boolean',
  Float: 'number',
  Object: 'object',
} as const;

export type SmdTypeName = (typeof SmdType)[keyof typeof SmdType] | string;

/** Top-level SMD schema document. */
export interface SmdSchema {
  transport?: string;
  envelope?: string;
  contentType?: string;
  SMDVersion?: string;
  target?: string;
  description?: string;
  services: Record<string, SmdService>;
}

/** A single RPC method description. */
export interface SmdService {
  description: string;
  parameters: SmdJsonSchema[];
  returns: SmdJsonSchema;
  /** Error code (as string key) -> message. */
  errors?: Record<string, string>;
}

/** Parameter / return-value schema node. */
export interface SmdJsonSchema {
  name?: string;
  type?: SmdTypeName;
  typeName?: string;
  optional?: boolean;
  default?: unknown;
  description?: string;
  properties?: Record<string, SmdProperty>;
  definitions?: Record<string, SmdDefinition>;
  /** Array item descriptor, e.g. { "type": "string" } or { "$ref": "#/..." }. */
  items?: Record<string, string>;
  /** Set when the node is a reference (used by OpenRPC normalization). */
  $ref?: string;
}

/** A nested property; its name is the key in the parent `properties` map. */
export interface SmdProperty {
  type?: SmdTypeName;
  optional?: boolean;
  description?: string;
  items?: Record<string, string>;
  definitions?: Record<string, SmdDefinition>;
  $ref?: string;
  /** Inline nested properties (used by OpenRPC normalization). */
  properties?: Record<string, SmdProperty>;
}

/** Reusable type definition referenced via `$ref`. */
export interface SmdDefinition {
  type?: SmdTypeName;
  properties?: Record<string, SmdProperty>;
}
