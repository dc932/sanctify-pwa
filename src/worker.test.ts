// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from './worker';

const creatorId = 'c5a4822b-6433-4f90-bd7d-98a71acd2b10';
const productionOrigin = 'https://sanctify-pwa.catholic-streaming.workers.dev';

function createEnv(
  assetFetch: (request: Request) => Promise<Response> = async () => new Response('static asset')
): Parameters<typeof worker.fetch>[1] {
  return {
    ASSETS: { fetch: assetFetch },
    ALLOWED_ORIGINS: `${productionOrigin},http://localhost:5173`,
    R2_ACCESS_KEY_ID: 'test-access-key',
    R2_BUCKET_NAME: 'sanctify-media',
    R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
    R2_PUBLIC_BASE_URL: 'https://pub.example.r2.dev',
    R2_SECRET_ACCESS_KEY: 'test-secret-key',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_URL: 'https://project.supabase.co',
  };
}

function createRequest(
  body: Record<string, unknown>,
  origin = productionOrigin
): Request {
  return new Request('https://sanctify-pwa.catholic-streaming.workers.dev/api/uploads/presign', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-user-token',
      'Content-Type': 'application/json',
      Origin: origin,
    },
    body: JSON.stringify({ size: 1024, ...body }),
  });
}

function mockSupabaseFetch(profileStatus: string) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/auth/v1/user')) {
      return new Response(JSON.stringify({ id: creatorId }), { status: 200 });
    }
    return new Response(JSON.stringify([{ status: profileStatus }]), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('R2 upload Worker', () => {
  it('serves non-API requests through the static asset binding', async () => {
    const assetResponse = new Response('static asset');
    const assetFetch = vi.fn(async () => assetResponse);
    const request = new Request('https://sanctify-pwa.catholic-streaming.workers.dev/');

    const response = await worker.fetch(request, createEnv(assetFetch));

    expect(response).toBe(assetResponse);
    expect(assetFetch).toHaveBeenCalledWith(request);
  });

  it('serves an SPA route from index.html only after the asset lookup misses', async () => {
    const assetFetch = vi.fn(async (request: Request) =>
      new URL(request.url).pathname === '/index.html'
        ? new Response('<div id="root"></div>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
        : new Response('Not found', { status: 404 })
    );
    const request = new Request(
      'https://sanctify-pwa.catholic-streaming.workers.dev/creator/dashboard',
      { headers: { Accept: 'text/html' } }
    );

    const response = await worker.fetch(request, createEnv(assetFetch));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/html');
    expect(assetFetch.mock.calls.map(([assetRequest]) => new URL(assetRequest.url).pathname)).toEqual([
      '/creator/dashboard',
      '/index.html',
    ]);
  });

  it('preserves the JavaScript response for an existing bundled asset', async () => {
    const assetFetch = vi.fn(async () =>
      new Response('console.log("app");', {
        headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
      })
    );
    const request = new Request(
      'https://sanctify-pwa.catholic-streaming.workers.dev/assets/index-abc123.js',
      { headers: { Accept: '*/*' } }
    );

    const response = await worker.fetch(request, createEnv(assetFetch));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('javascript');
    expect(assetFetch).toHaveBeenCalledTimes(1);
  });

  it('does not replace a missing JavaScript asset with the SPA document', async () => {
    const assetFetch = vi.fn(async () => new Response('Not found', { status: 404 }));
    const request = new Request(
      'https://sanctify-pwa.catholic-streaming.workers.dev/assets/index-old.js',
      { headers: { Accept: '*/*' } }
    );

    const response = await worker.fetch(request, createEnv(assetFetch));

    expect(response.status).toBe(404);
    expect(assetFetch).toHaveBeenCalledTimes(1);
  });

  it('does not send unknown API paths to the static asset binding', async () => {
    const assetFetch = vi.fn(async () => new Response('static asset'));
    const request = new Request(
      'https://sanctify-pwa.catholic-streaming.workers.dev/api/unknown',
      { headers: { Origin: productionOrigin } }
    );

    const response = await worker.fetch(request, createEnv(assetFetch));

    expect(response.status).toBe(404);
    expect(assetFetch).not.toHaveBeenCalled();
  });

  it('answers preflight requests with the exact allowed origin and headers', async () => {
    const request = new Request(
      'https://sanctify-pwa.catholic-streaming.workers.dev/api/uploads/presign',
      {
        method: 'OPTIONS',
        headers: {
          Origin: productionOrigin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,content-type',
        },
      }
    );

    const response = await worker.fetch(request, createEnv());

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(productionOrigin);
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Authorization, Content-Type');
  });

  it('does not allow origins outside the configured list', async () => {
    const fetchMock = mockSupabaseFetch('approved');
    const response = await worker.fetch(
      createRequest({ fileName: 'track.mp3', folder: 'media' }, 'https://attacker.example'),
      createEnv()
    );

    expect(response.status).toBe(403);
    expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signs an upload only for an approved creator and allowed file type', async () => {
    mockSupabaseFetch('approved');
    const response = await worker.fetch(
      createRequest({ fileName: 'track.mp3', folder: 'media' }),
      createEnv()
    );
    const result = (await response.json()) as {
      contentType: string;
      publicUrl: string;
      uploadUrl: string;
    };

    expect(response.status).toBe(200);
    expect(result.contentType).toBe('audio/mpeg');
    expect(result.publicUrl).toContain(`/${creatorId}/media/`);
    expect(new URL(result.uploadUrl).searchParams.get('X-Amz-Expires')).toBe('300');
  });

  it('denies pending creators and rejects unsupported file types', async () => {
    mockSupabaseFetch('pending');
    const pendingResponse = await worker.fetch(
      createRequest({ fileName: 'track.mp3', folder: 'media' }),
      createEnv()
    );
    const unsupportedResponse = await worker.fetch(
      createRequest({ fileName: 'payload.exe', folder: 'media' }),
      createEnv()
    );

    expect(pendingResponse.status).toBe(403);
    expect(unsupportedResponse.status).toBe(415);
  });

  it('rejects bearer tokens that Supabase Auth does not recognize', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    const response = await worker.fetch(
      createRequest({ fileName: 'track.mp3', folder: 'media' }),
      createEnv()
    );

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects uploads larger than the R2 single-PUT limit before authentication', async () => {
    const fetchMock = mockSupabaseFetch('approved');
    const response = await worker.fetch(
      createRequest({ fileName: 'track.mp3', folder: 'media', size: 5 * 1024 ** 3 + 1 }),
      createEnv()
    );

    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
