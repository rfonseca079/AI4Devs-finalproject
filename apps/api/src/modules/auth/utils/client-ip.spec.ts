import { resolveLoginClientIp } from './client-ip';

describe('resolveLoginClientIp', () => {
  const trusted = new Set(['10.0.0.8']);

  it('uses the first forwarded address when the socket is the proxy', () => {
    expect(
      resolveLoginClientIp({
        remoteAddress: '10.0.0.8',
        forwardedFor: '203.0.113.10, 10.0.0.1',
        trustedProxyAddresses: trusted,
      }),
    ).toBe('203.0.113.10');
    expect(
      resolveLoginClientIp({
        remoteAddress: '::ffff:10.0.0.8',
        forwardedFor: '203.0.113.11',
        trustedProxyAddresses: trusted,
      }),
    ).toBe('203.0.113.11');
  });

  it('ignores a spoofed header on a direct connection', () => {
    expect(
      resolveLoginClientIp({
        remoteAddress: '198.51.100.20',
        forwardedFor: '203.0.113.10',
        trustedProxyAddresses: trusted,
      }),
    ).toBe('198.51.100.20');
    expect(
      resolveLoginClientIp({
        remoteAddress: '198.51.100.20',
        forwardedFor: '203.0.113.99',
        trustedProxyAddresses: trusted,
      }),
    ).toBe('198.51.100.20');
  });

  it('falls back to the socket address when the proxy omits a client ip', () => {
    expect(
      resolveLoginClientIp({
        remoteAddress: '10.0.0.8',
        forwardedFor: 'not-an-ip',
        trustedProxyAddresses: trusted,
      }),
    ).toBe('10.0.0.8');
    expect(
      resolveLoginClientIp({
        remoteAddress: '198.51.100.20',
        forwardedFor: undefined,
        trustedProxyAddresses: new Set(),
      }),
    ).toBe('198.51.100.20');
  });
});
