import { describe, it, expect } from 'vitest';

import { isOpenRpc, normalizeSchema, openRpcToSmd, type OpenRpcDocument } from '../openrpc';
import { deriveEndpoint } from '../smd';
import { smdToJsonSchema } from '../smdToJsonSchema';

const doc = {
  openrpc: '1.2.6',
  servers: [{ url: 'https://api.example.com/rpc/' }],
  methods: [
    {
      name: 'user.Get',
      summary: 'Get a user',
      params: [
        { name: 'id', schema: { type: 'integer' }, required: true },
        { name: 'opts', schema: { $ref: '#/components/schemas/Opts' } },
      ],
      result: { name: 'UserResp', schema: { $ref: '#/components/schemas/User' } },
      errors: [{ code: 404, message: 'not found' }],
    },
    {
      name: 'ping',
      params: [],
      result: { $ref: '#/components/contentDescriptors/Bool' },
    },
  ],
  components: {
    contentDescriptors: { Bool: { name: 'Bool', summary: 'ok', schema: { type: 'boolean' } } },
    schemas: {
      Opts: { properties: { q: { type: 'string' } }, required: [] },
      User: {
        required: ['id'],
        properties: {
          id: { type: 'integer' },
          tags: { type: 'array', items: [{ $ref: '#/components/schemas/Tag' }] },
        },
      },
      Tag: { properties: { label: { type: 'string' } }, required: ['label'] },
    },
  },
} satisfies OpenRpcDocument;

describe('format detection', () => {
  it('detects OpenRPC and rejects SMD', () => {
    expect(isOpenRpc(doc)).toBe(true);
    expect(isOpenRpc({ services: {}, SMDVersion: '2.0' })).toBe(false);
  });

  it('passes SMD documents through unchanged', () => {
    const smd = { services: { A: { description: 'a', parameters: [], returns: {} } } };
    expect(normalizeSchema(smd)).toBe(smd);
  });
});

describe('openRpcToSmd', () => {
  const smd = openRpcToSmd(doc);
  const userGet = smd.services['user.Get']!;

  it('maps target from servers and keeps method names', () => {
    expect(smd.target).toBe('https://api.example.com/rpc/');
    expect(Object.keys(smd.services)).toEqual(['user.Get', 'ping']);
  });

  it('maps params with required -> optional and rewrites $ref', () => {
    expect(userGet.description).toBe('Get a user');
    expect(userGet.parameters[0]).toMatchObject({ name: 'id', type: 'integer', optional: false });
    expect(userGet.parameters[1]).toMatchObject({
      name: 'opts',
      type: 'object',
      optional: true,
      $ref: '#/definitions/Opts',
    });
  });

  it('resolves the result and attaches the transitive definition closure', () => {
    expect(userGet.returns.$ref).toBe('#/definitions/User');
    expect(Object.keys(userGet.returns.definitions ?? {}).sort()).toEqual(['Tag', 'User']);
    // nested required propagates to optional on the definition's fields
    expect(userGet.returns.definitions?.User?.properties?.id?.optional).toBe(false);
  });

  it('maps errors to a code->message map', () => {
    expect(userGet.errors).toEqual({ '404': 'not found' });
  });

  it('resolves a contentDescriptor result', () => {
    const ping = smd.services['ping']!;
    expect(ping.returns).toMatchObject({ type: 'boolean', description: 'ok' });
  });

  it('feeds smdToJsonSchema so the form sees merged definitions', () => {
    const schema = smdToJsonSchema(userGet);
    expect(Object.keys(schema.properties ?? {})).toEqual(['id', 'opts']);
    expect(schema.definitions).toHaveProperty('Opts');
  });
});

describe('deriveEndpoint with absolute target', () => {
  it('uses an absolute OpenRPC server url as-is', () => {
    expect(
      deriveEndpoint('https://api.example.com/rpc/openrpc.json', 'https://api.example.com/rpc/'),
    ).toBe('https://api.example.com/rpc/');
  });
});
