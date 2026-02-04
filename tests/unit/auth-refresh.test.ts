import { describe, it, expect, vi } from 'vitest';
import { withCredentialRefresh } from '../../src/services/auth';

describe('withCredentialRefresh', () => {
  it('refreshes credentials on 401 and retries', async () => {
    let call = 0;
    const fn = async (session: string, signature?: string) => {
      call += 1;
      if (call === 1) {
        const err: any = new Error('401 Unauthorized');
        err.response = { status: 401 };
        throw err;
      }
      return `${session}:${signature}`;
    };

    const refreshed = { session: 'new-session', signature: 'new-signature' };
    const refresh = vi.fn(async () => ({
      id: 1,
      username: 'user',
      firstName: 'First',
      lastName: 'Last',
      reputation: 0,
      following: 0,
      followers: 0,
      notifications: { user: 0, following: 0 },
      session: refreshed.session,
      signature: refreshed.signature,
      sessionHash: 'hash',
      privateChannel: 'channel',
      authToken: 'token',
      joinDate: new Date(),
    }));

    const result = await withCredentialRefresh(
      fn,
      {
        session: 'old-session',
        signature: 'old-signature',
        username: 'user',
        password: 'pass',
        onRefresh: () => {},
      },
      { refresh },
    );

    expect(result).toBe('new-session:new-signature');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(call).toBe(2);
  });

  it('throws when no credentials for refresh', async () => {
    const fn = async () => {
      const err: any = new Error('401 Unauthorized');
      err.response = { status: 401 };
      throw err;
    };

    await expect(withCredentialRefresh(fn, { session: 's', signature: 'sig' }))
      .rejects
      .toThrow('401');
  });
});
