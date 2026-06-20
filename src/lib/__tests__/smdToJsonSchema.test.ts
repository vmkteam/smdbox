import { describe, it, expect } from 'vitest';

import { smdToJsonSchema, getParamsTemplate, __internal } from '../smdToJsonSchema';
import type { SmdSchema, SmdService } from '../../types/smd';
import smdFixture from './fixtures/arithsrv-smd.json';

const smd = smdFixture as unknown as SmdSchema;

const service = (name: string): SmdService => {
  const svc = smd.services[name];
  if (!svc) throw new Error(`service ${name} missing in fixture`);
  return svc;
};

describe('smdToJsonSchema', () => {
  it('wraps parameters into an object schema with title and description', () => {
    const schema = smdToJsonSchema(service('Divide'));

    expect(schema.type).toBe('object');
    expect(schema.description).toBe('Divide divides two numbers.');
    expect(Object.keys(schema.properties ?? {})).toEqual(['a', 'b']);
    expect(schema.properties?.a).toMatchObject({
      type: 'integer',
      title: 'a',
      description: 'the a',
    });
  });

  it('does not mutate the input service', () => {
    const svc = service('Divide');
    const before = JSON.stringify(svc);
    smdToJsonSchema(svc);
    expect(JSON.stringify(svc)).toBe(before);
    // the legacy version added a `title` field onto the original param
    expect(svc.parameters[0]).not.toHaveProperty('title');
  });

  it('merges nested parameter definitions into the schema', () => {
    const schema = smdToJsonSchema(service('DoSomethingWithPoint'));
    expect(schema.definitions).toHaveProperty('objects.AbstractObject');
    expect(schema.properties?.p).toMatchObject({ type: 'object', title: 'p' });
  });

  it('handles methods without parameters', () => {
    const schema = smdToJsonSchema(service('Pi'));
    expect(schema.properties).toEqual({});
    expect(schema.definitions).toEqual({});
  });

  it('replaces empty $ref placeholders in definitions with a string type', () => {
    const svc: SmdService = {
      description: 'synthetic',
      parameters: [
        {
          name: 'p',
          type: 'object',
          definitions: {
            Broken: {
              type: 'object',
              properties: { field: { $ref: '#/definitions/' } },
            },
          },
        },
      ],
      returns: {},
    };
    const schema = smdToJsonSchema(svc);
    expect(schema.definitions?.Broken?.properties?.field).toEqual({ type: 'string' });
  });
});

describe('getParamsTemplate', () => {
  it('builds a JSON-RPC request with defaults for required params only', () => {
    const schema = smdToJsonSchema(service('Pow')); // base (required), exp (optional)
    const req = getParamsTemplate('Pow', schema);

    expect(req).toMatchObject({ jsonrpc: '2.0', method: 'Pow' });
    expect(typeof req.id).toBe('string');
    expect(req.params).toEqual({ base: '' }); // number default '', optional exp skipped
  });

  it('overrides defaults with supplied params', () => {
    const schema = smdToJsonSchema(service('Divide'));
    const req = getParamsTemplate('Divide', schema, { a: 10, b: 2 });
    expect(req.params).toEqual({ a: 10, b: 2 });
  });
});

describe('default values per type', () => {
  it('maps types to legacy default values', () => {
    const schema = {
      properties: {
        s: { type: 'string' },
        n: { type: 'integer' },
        arr: { type: 'array' },
        obj: { type: 'object' },
      },
    };
    expect(__internal.defaultValueForParam('s', schema)).toBe('');
    expect(__internal.defaultValueForParam('n', schema)).toBeUndefined();
    expect(__internal.defaultValueForParam('arr', schema)).toEqual([]);
    expect(__internal.defaultValueForParam('obj', schema)).toEqual({});
  });

  it('honours explicit default values', () => {
    const schema = { properties: { s: { type: 'string', default: 'hi' } } };
    expect(__internal.defaultValueForParam('s', schema)).toBe('hi');
  });
});
