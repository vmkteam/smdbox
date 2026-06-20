/**
 * OpenRPC -> SMD normalization.
 *
 * Converts an OpenRPC document (https://spec.open-rpc.org, meta-schema in
 * open-rpc/meta-schema) into our internal SmdSchema so the rest of the app
 * (smdToJsonSchema, MethodDescription, ...) works unchanged.
 *
 * Scope: methods, params, result (inline or contentDescriptor $ref), errors,
 * components.schemas with transitive $ref closure. Refs `#/components/schemas/X`
 * are rewritten to `#/definitions/X`; `required[]` becomes per-field `optional`.
 */
import type { SmdDefinition, SmdJsonSchema, SmdProperty, SmdSchema, SmdService } from '../types/smd';

interface OrSchema {
  type?: string;
  description?: string;
  $ref?: string;
  required?: string[];
  properties?: Record<string, OrSchema>;
  items?: OrSchema | OrSchema[];
}

interface OrParam {
  name: string;
  description?: string;
  required?: boolean;
  schema?: OrSchema;
}

type OrResult = { name?: string; summary?: string; schema?: OrSchema } | { $ref: string };

interface OrMethod {
  name: string;
  summary?: string;
  description?: string;
  params?: OrParam[];
  result?: OrResult;
  errors?: { code: number; message: string }[];
}

export interface OpenRpcDocument {
  openrpc: string;
  servers?: { url: string; name?: string }[];
  methods: OrMethod[];
  components?: {
    schemas?: Record<string, OrSchema>;
    contentDescriptors?: Record<string, { name?: string; summary?: string; schema?: OrSchema }>;
  };
}

const SCHEMAS_PREFIX = '#/components/schemas/';
const CONTENT_PREFIX = '#/components/contentDescriptors/';

function rewriteRef(ref: string): string {
  return ref.startsWith(SCHEMAS_PREFIX) ? `#/definitions/${ref.slice(SCHEMAS_PREFIX.length)}` : ref;
}

function firstItem(items?: OrSchema | OrSchema[]): OrSchema | undefined {
  return Array.isArray(items) ? items[0] : items;
}

function itemsDescriptor(items?: OrSchema | OrSchema[]): Record<string, string> | undefined {
  const it = firstItem(items);
  if (!it) return undefined;
  return it.$ref ? { $ref: rewriteRef(it.$ref) } : { type: it.type ?? '' };
}

/** Converts a nested JSON-schema node into an SmdProperty. */
function toProperty(schema: OrSchema, optional: boolean): SmdProperty {
  if (schema.$ref) {
    return { type: 'object', optional, $ref: rewriteRef(schema.$ref), description: schema.description };
  }
  const node: SmdProperty = { type: schema.type, optional, description: schema.description };
  const items = itemsDescriptor(schema.items);
  if (items) node.items = items;
  if (schema.properties) {
    const required = new Set(schema.required ?? []);
    node.properties = {};
    for (const [key, child] of Object.entries(schema.properties)) {
      node.properties[key] = toProperty(child, !required.has(key));
    }
  }
  return node;
}

/** Converts an object schema into an SmdDefinition (for definition tables). */
function toDefinition(schema: OrSchema): SmdDefinition {
  const def: SmdDefinition = { type: schema.type ?? 'object' };
  if (schema.properties) {
    const required = new Set(schema.required ?? []);
    def.properties = {};
    for (const [key, child] of Object.entries(schema.properties)) {
      def.properties[key] = toProperty(child, !required.has(key));
    }
  }
  return def;
}

/** Collects schema names referenced (transitively) from a raw node. */
function collectRefs(node: unknown, schemas: Record<string, OrSchema>, acc: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  const ref = (node as OrSchema).$ref;
  if (typeof ref === 'string' && ref.startsWith(SCHEMAS_PREFIX)) {
    const name = ref.slice(SCHEMAS_PREFIX.length);
    if (!acc.has(name)) {
      acc.add(name);
      if (schemas[name]) collectRefs(schemas[name], schemas, acc);
    }
  }
  for (const value of Object.values(node as Record<string, unknown>)) {
    if (Array.isArray(value)) value.forEach((v) => collectRefs(v, schemas, acc));
    else if (value && typeof value === 'object') collectRefs(value, schemas, acc);
  }
}

/** Builds the definition map (transitive closure) referenced by a raw node. */
function definitionsFor(
  node: unknown,
  schemas: Record<string, OrSchema>,
): Record<string, SmdDefinition> | undefined {
  const names = new Set<string>();
  collectRefs(node, schemas, names);
  if (names.size === 0) return undefined;
  const out: Record<string, SmdDefinition> = {};
  for (const name of names) {
    const schema = schemas[name];
    if (schema) out[name] = toDefinition(schema);
  }
  return out;
}

function resolveResult(
  result: OrResult | undefined,
  doc: OpenRpcDocument,
): { schema: OrSchema; description?: string } | null {
  if (!result) return null;
  if ('$ref' in result) {
    if (!result.$ref.startsWith(CONTENT_PREFIX)) return null;
    const cd = doc.components?.contentDescriptors?.[result.$ref.slice(CONTENT_PREFIX.length)];
    return cd?.schema ? { schema: cd.schema, description: cd.summary } : null;
  }
  return result.schema ? { schema: result.schema, description: result.schema.description } : null;
}

function toService(method: OrMethod, doc: OpenRpcDocument): SmdService {
  const schemas = doc.components?.schemas ?? {};

  const parameters: SmdJsonSchema[] = (method.params ?? []).map((param) => {
    const schema = param.schema ?? {};
    const node = toProperty(schema, !param.required) as SmdJsonSchema;
    node.name = param.name;
    if (param.description) node.description = param.description;
    const defs = definitionsFor(schema, schemas);
    if (defs) node.definitions = defs;
    return node;
  });

  let returns: SmdJsonSchema = {};
  const resolved = resolveResult(method.result, doc);
  if (resolved) {
    returns = toProperty(resolved.schema, true) as SmdJsonSchema;
    if (resolved.description) returns.description = resolved.description;
    const defs = definitionsFor(resolved.schema, schemas);
    if (defs) returns.definitions = defs;
  }

  const service: SmdService = {
    description: method.description ?? method.summary ?? '',
    parameters,
    returns,
  };
  if (method.errors?.length) {
    service.errors = Object.fromEntries(method.errors.map((e) => [String(e.code), e.message]));
  }
  return service;
}

/** True if the parsed document looks like an OpenRPC document. */
export function isOpenRpc(doc: unknown): doc is OpenRpcDocument {
  return (
    !!doc &&
    typeof doc === 'object' &&
    typeof (doc as OpenRpcDocument).openrpc === 'string' &&
    Array.isArray((doc as OpenRpcDocument).methods)
  );
}

/** Converts an OpenRPC document to our internal SmdSchema. */
export function openRpcToSmd(doc: OpenRpcDocument): SmdSchema {
  const services: Record<string, SmdService> = {};
  for (const method of doc.methods) {
    if (method.name) services[method.name] = toService(method, doc);
  }
  return {
    transport: 'POST',
    envelope: 'JSON-RPC-2.0',
    contentType: 'application/json',
    SMDVersion: '2.0',
    target: doc.servers?.[0]?.url ?? '/',
    description: undefined,
    services,
  };
}

/** Normalizes a raw schema document (SMD or OpenRPC) into SmdSchema. */
export function normalizeSchema(raw: unknown): SmdSchema {
  if (isOpenRpc(raw)) return openRpcToSmd(raw);
  return raw as SmdSchema;
}
