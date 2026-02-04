import { describe, it, expect, vi } from 'vitest';
import {
  normalizePineId,
  searchPublicScripts,
  browsePublicLibrary,
  createIndicatorsClient,
} from '../../src/services/indicators';

describe('Indicators API wrapper (services/indicators) - unit', () => {
  it('normalizes url-encoded pine ids', () => {
    expect(normalizePineId('PUB%3Babc')).toBe('PUB;abc');
    expect(normalizePineId('PUB;abc')).toBe('PUB;abc');
  });

  it('searchPublicScripts maps results into a stable shape', async () => {
    const http = { get: vi.fn() };
    http.get.mockResolvedValueOnce({
      data: {
        results: [
          {
            scriptIdPart: 'PUB;c6945f5e',
            version: 'last',
            scriptName: 'Mean Reversion',
            author: { id: 42, username: 'alice' },
            imageUrl: 'img',
            access: 1,
            scriptSource: '',
            extra: { kind: 'study' },
          },
        ],
      },
    });

    const res = await searchPublicScripts('Mean', { http });

    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('PUB;c6945f5e');
    expect(res[0].name).toBe('Mean Reversion');
    expect(res[0].author.username).toBe('alice');
    expect(res[0].access).toBe('open_source');
    expect(typeof res[0].get).toBe('function');

    expect(http.get).toHaveBeenCalledTimes(1);
    const [url, config] = http.get.mock.calls[0];
    expect(url).toContain('pubscripts-suggest-json');
    expect(config.params.search).toBe('Mean');
  });

  it('browsePublicLibrary passes parameters through', async () => {
    const http = { get: vi.fn() };
    http.get.mockResolvedValueOnce({ data: { scripts: [], total: 0 } });

    const data = await browsePublicLibrary({ offset: 10, count: 5, sort: 'top', isPaid: true, http });

    expect(data).toEqual({ scripts: [], total: 0 });

    const [url, config] = http.get.mock.calls[0];
    expect(url).toContain('pubscripts-library');
    expect(config.params.offset).toBe(10);
    expect(config.params.count).toBe(5);
    expect(config.params.sort).toBe('top');
    expect(config.params.is_paid).toBe(true);
  });

  it('createIndicatorsClient wires defaults into headers', async () => {
    const http = { get: vi.fn() };
    http.get.mockResolvedValueOnce({ data: { results: [] } });

    const client = createIndicatorsClient({ language: 'fr', http });
    await client.search('RSI');

    const [, config] = http.get.mock.calls[0];
    expect(config.headers['x-language']).toBe('fr');
  });
});
