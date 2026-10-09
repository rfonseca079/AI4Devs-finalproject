import { lookup } from 'dns/promises';
import { isIP } from 'net';

/**
 * Login rate limiting trusts X-Forwarded-For only when the socket peer is the
 * Compose web proxy. A direct client cannot choose its tracker with that header.
 */
export function normalizeIp(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (trimmed.toLowerCase().startsWith('::ffff:')) {
    return trimmed.slice('::ffff:'.length);
  }
  return trimmed;
}

export function firstForwardedIp(
  forwardedFor: string | string[] | undefined,
): string | null {
  const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  if (!raw) {
    return null;
  }
  const first = raw.split(',')[0]?.trim() ?? '';
  if (!first || isIP(first) === 0) {
    return null;
  }
  return normalizeIp(first);
}

export function resolveLoginClientIp(input: {
  remoteAddress: string | undefined;
  forwardedFor: string | string[] | undefined;
  trustedProxyAddresses: ReadonlySet<string>;
}): string {
  const remote = normalizeIp(input.remoteAddress);
  if (remote && input.trustedProxyAddresses.has(remote)) {
    return firstForwardedIp(input.forwardedFor) ?? remote;
  }
  return remote || 'unknown';
}

export async function loadTrustedProxyAddresses(
  env: NodeJS.ProcessEnv = process.env,
): Promise<Set<string>> {
  const trusted = new Set<string>();

  for (const value of (env.TRUSTED_PROXY_IPS ?? '').split(',')) {
    const ip = normalizeIp(value);
    if (ip && isIP(ip) !== 0) {
      trusted.add(ip);
    }
  }

  for (const value of (env.TRUSTED_PROXY_HOSTS ?? '').split(',')) {
    const host = value.trim();
    if (!host) {
      continue;
    }
    try {
      const records = await lookup(host, { all: true });
      for (const record of records) {
        const ip = normalizeIp(record.address);
        if (ip) {
          trusted.add(ip);
        }
      }
    } catch {
      // The Compose service name is absent when the API runs outside that network.
    }
  }

  return trusted;
}
