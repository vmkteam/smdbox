import { describe, expect, it } from 'vitest';

import { defaultSmdUrlFromLocation } from '../smd';

describe('defaultSmdUrlFromLocation', () => {
  it('maps the zenrpc doc handler to its ?smd schema url', () => {
    expect(defaultSmdUrlFromLocation('https://host.tld/rpc/doc/')).toBe('https://host.tld/rpc/?smd');
    expect(defaultSmdUrlFromLocation('https://host.tld/rpc/doc')).toBe('https://host.tld/rpc/?smd');
    expect(defaultSmdUrlFromLocation('https://host.tld/api/v3/rpc/doc/')).toBe(
      'https://host.tld/api/v3/rpc/?smd',
    );
  });

  it('ignores query and hash on the doc url', () => {
    expect(defaultSmdUrlFromLocation('https://host.tld/rpc/doc/#/method/x?p=1')).toBe(
      'https://host.tld/rpc/?smd',
    );
  });

  it('returns empty string for non-doc locations', () => {
    expect(defaultSmdUrlFromLocation('https://host.tld/')).toBe('');
    expect(defaultSmdUrlFromLocation('https://host.tld/rpc/')).toBe('');
    expect(defaultSmdUrlFromLocation('https://host.tld/documents/')).toBe('');
    expect(defaultSmdUrlFromLocation('not a url')).toBe('');
  });
});
