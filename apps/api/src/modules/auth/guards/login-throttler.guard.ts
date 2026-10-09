import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  loadTrustedProxyAddresses,
  resolveLoginClientIp,
} from '../utils/client-ip';

@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const socket = req.socket as { remoteAddress?: string } | undefined;
    const headers = req.headers as
      | Record<string, string | string[] | undefined>
      | undefined;
    const trusted = await loadTrustedProxyAddresses();
    return resolveLoginClientIp({
      remoteAddress: socket?.remoteAddress,
      forwardedFor: headers?.['x-forwarded-for'],
      trustedProxyAddresses: trusted,
    });
  }
}
