/**
 * Converts an SMD service description into a JSON Schema consumable by the
 * method form (@rjsf). Ports legacy `helpers/SMDToJSONSchema.js`.
 *
 * Difference from legacy: the legacy "manual cutting of wrong definitions" loop
 * indexed name-keyed maps by numeric index, so it never actually ran. We keep
 * its *intent* — replacing an empty `$ref: '#/definitions/'` with a string type
 * — but implement it correctly over real keys.
 */
import { createRequest, type JsonRpcRequest } from './rpc';
import type { SmdService } from '../types/smd';

export interface JsonSchema {
  type?: string;
  title?: string;
  description?: string;
  optional?: boolean;
  default?: unknown;
  $ref?: string;
  items?: unknown;
  properties?: Record<string, JsonSchema>;
  definitions?: Record<string, JsonSchema>;
  [key: string]: unknown;
}

const EMPTY_REF = '#/definitions/';

/** Replaces empty `$ref` placeholders inside definitions with a string type. */
function sanitizeDefinitions(definitions: Record<string, JsonSchema>): void {
  for (const def of Object.values(definitions)) {
    if (!def?.properties) continue;
    for (const [propName, prop] of Object.entries(def.properties)) {
      if (prop?.$ref === EMPTY_REF) {
        def.properties[propName] = { type: 'string' };
      }
    }
  }
}

/** Builds a JSON Schema object describing the method's parameters. */
export function smdToJsonSchema(service: SmdService): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  let definitions: Record<string, JsonSchema> = {};

  for (const param of service.parameters) {
    if (!param.name) continue;
    properties[param.name] = { ...(param as JsonSchema), title: param.name };
    if (param.definitions) {
      definitions = { ...definitions, ...(param.definitions as Record<string, JsonSchema>) };
    }
  }

  sanitizeDefinitions(definitions);

  return {
    type: 'object',
    description: service.description,
    properties,
    definitions,
  };
}

function defaultValueForParam(name: string, schema: JsonSchema): unknown {
  const prop = schema.properties?.[name];
  if (!prop) return '';
  if (prop.default !== undefined) return prop.default;

  switch (prop.type) {
    case 'array':
      return [];
    case 'object':
      return prop.properties ? defaultParamSet(prop) : {};
    case 'integer':
      return undefined;
    default:
      return '';
  }
}

/** Default param set from a schema, skipping optional params (legacy parity). */
function defaultParamSet(schema: JsonSchema): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (!schema.properties) return params;
  for (const [name, prop] of Object.entries(schema.properties)) {
    if (prop.optional) continue;
    params[name] = defaultValueForParam(name, schema);
  }
  return params;
}

/** Builds a JSON-RPC request pre-filled with default param values. */
export function getParamsTemplate(
  method: string,
  schema: JsonSchema,
  params: Record<string, unknown> = {},
): JsonRpcRequest {
  return createRequest(method, { ...defaultParamSet(schema), ...params });
}

/** Exposed for tests. */
export const __internal = { defaultParamSet, defaultValueForParam };
