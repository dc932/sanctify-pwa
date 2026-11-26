import { AwsClient } from 'aws4fetch';

interface WorkerEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  ALLOWED_ORIGINS: string;
  R2_ACCESS_KEY_ID: string;
  R2_BUCKET_NAME: string;
  R2_ENDPOINT: string;
  R2_PUBLIC_BASE_URL: string;
  R2_SECRET_ACCESS_KEY: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_URL: string;
}

interface PresignRequestBody {
  fileName: string;
  folder: string;
  size: number;
}

const PRESIGN_PATH = '/api/uploads/presign';
const PRESIGN_EXPIRY_SECONDS = 300;
const MAX_PRESIGNED_PUT_BYTES = 5 * 1024 ** 3;

const extensionsByFolder: Record<string, Record<string, string>> = {
  artwork: {
    avif: 'image/avif',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  },
  artworks: {
    avif: 'image/avif',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  },
  content: {
    aac: 'audio/aac',
    avif: 'image/avif',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    lrc: 'text/plain',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    pdf: 'application/pdf',
    png: 'image/png',
    txt: 'text/plain',
    wav: 'audio/wav',
    webp: 'image/webp',
  },
  covers: {
    avif: 'image/avif',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  },
  documents: {
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pdf: 'application/pdf',
    txt: 'text/plain',
  },
  lyrics: {
    lrc: 'text/plain',
    txt: 'text/plain',
  },
  media: {
    aac: 'audio/aac',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    wav: 'audio/wav',
  },
  tracks: {
    aac: 'audio/aac',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    wav: 'audio/wav',
  },
  readings: {
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pdf: 'application/pdf',
    txt: 'text/plain',
  },
};

function jsonResponse(
  body: Record<string, string>,
  status: number,
  headers?: Headers
): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Cache-Control', 'no-store');
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

function getAllowedOrigin(request: Request, env: WorkerEnv): string | null {
  const origin = request.headers.get('Origin');
  if (!origin) return null;

  const allowedOrigins = env.ALLOWED_ORIGINS?.split(',').map((value) => value.trim()) ?? [];
  return allowedOrigins.includes(origin) ? origin : null;
}

function createCorsHeaders(origin: string): Headers {
  return new Headers({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  });
}

function getFileExtension(fileName: string): string | null {
  const baseName = fileName.trim();
  if (!baseName || baseName.length > 255 || /[\\/\0]/.test(baseName)) return null;

  const extension = baseName.split('.').pop()?.toLowerCase();
  return extension && extension !== baseName.toLowerCase() ? extension : null;
}

function hasRequiredConfiguration(env: WorkerEnv): boolean {
  return Boolean(
    env.SUPABASE_URL &&
      env.SUPABASE_ANON_KEY &&
      env.R2_ENDPOINT &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET_NAME &&
      env.R2_PUBLIC_BASE_URL &&
      env.ALLOWED_ORIGINS
  );
}

async function serveAssetOrSpaRoute(request: Request, env: WorkerEnv): Promise<Response> {
  const assetResponse = await env.ASSETS.fetch(request);
  if (
    assetResponse.status !== 404 ||
    !['GET', 'HEAD'].includes(request.method) ||
    !/\btext\/html\b/i.test(request.headers.get('Accept') ?? '')
  ) {
    return assetResponse;
  }

  const pathname = new URL(request.url).pathname;
  const lastPathSegment = pathname.slice(pathname.lastIndexOf('/') + 1);
  if (pathname.startsWith('/assets/') || /\.[^/]+$/.test(lastPathSegment)) {
    return assetResponse;
  }

  return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
}

async function handlePresign(request: Request, env: WorkerEnv, headers: Headers): Promise<Response> {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return jsonResponse({ error: 'Se requiere Content-Type application/json.' }, 415, headers);
  }

  let body: PresignRequestBody;
  try {
    body = (await request.json()) as PresignRequestBody;
  } catch {
    return jsonResponse({ error: 'El cuerpo JSON no es válido.' }, 400, headers);
  }

  if (
    !body ||
    typeof body.fileName !== 'string' ||
    typeof body.folder !== 'string' ||
    !Object.prototype.hasOwnProperty.call(extensionsByFolder, body.folder)
  ) {
    return jsonResponse({ error: 'La carpeta o el nombre del archivo no son válidos.' }, 400, headers);
  }
  if (typeof body.size !== 'number' || !Number.isSafeInteger(body.size) || body.size <= 0) {
    return jsonResponse({ error: 'El tamaño del archivo no es válido.' }, 400, headers);
  }
  if (body.size > MAX_PRESIGNED_PUT_BYTES) {
    return jsonResponse({ error: 'El archivo supera el límite de una carga R2 individual.' }, 413, headers);
  }

  const extension = getFileExtension(body.fileName);
  const contentType = extension ? extensionsByFolder[body.folder][extension] : undefined;
  if (!contentType) {
    return jsonResponse({ error: 'El tipo de archivo no está permitido para esta carpeta.' }, 415, headers);
  }

  const authorization = request.headers.get('Authorization');
  const accessToken = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!accessToken) {
    return jsonResponse({ error: 'Se requiere una sesión válida.' }, 401, headers);
  }

  if (!hasRequiredConfiguration(env)) {
    console.error('R2 upload signing is missing required Worker configuration.');
    return jsonResponse({ error: 'El servicio de subida no está configurado.' }, 503, headers);
  }

  let userId: string;
  try {
    const supabaseBaseUrl = env.SUPABASE_URL.replace(/\/+$/, '');
    const authResponse = await fetch(`${supabaseBaseUrl}/auth/v1/user`, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (authResponse.status === 401 || authResponse.status === 403) {
      return jsonResponse({ error: 'La sesión ha expirado.' }, 401, headers);
    }
    if (!authResponse.ok) {
      console.error('Supabase Auth rejected the upload authorization check.');
      return jsonResponse({ error: 'No se pudo validar la sesión.' }, 502, headers);
    }

    const user = (await authResponse.json()) as { id?: unknown };
    if (
      typeof user.id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        user.id
      )
    ) {
      return jsonResponse({ error: 'La sesión no contiene un usuario válido.' }, 401, headers);
    }
    userId = user.id;

    const profileUrl = new URL(`${supabaseBaseUrl}/rest/v1/creator_profiles`);
    profileUrl.searchParams.set('id', `eq.${userId}`);
    profileUrl.searchParams.set('select', 'status');

    const profileResponse = await fetch(profileUrl, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      console.error('Supabase could not verify the creator profile status.');
      return jsonResponse({ error: 'No se pudo validar el perfil de creador.' }, 502, headers);
    }

    const profiles = (await profileResponse.json()) as Array<{ status?: unknown }>;
    if (!Array.isArray(profiles) || profiles[0]?.status !== 'approved') {
      return jsonResponse({ error: 'El perfil de creador no está aprobado.' }, 403, headers);
    }
  } catch {
    console.error('Supabase authorization request failed.');
    return jsonResponse({ error: 'No se pudo validar la sesión.' }, 502, headers);
  }

  try {
    const endpoint = new URL(env.R2_ENDPOINT);
    const publicBase = new URL(env.R2_PUBLIC_BASE_URL);
    if (
      endpoint.protocol !== 'https:' ||
      !endpoint.hostname.endsWith('.r2.cloudflarestorage.com') ||
      endpoint.pathname !== '/' ||
      endpoint.search ||
      endpoint.hash ||
      endpoint.username ||
      endpoint.password ||
      !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(env.R2_BUCKET_NAME) ||
      publicBase.protocol !== 'https:' ||
      publicBase.search ||
      publicBase.hash ||
      publicBase.username ||
      publicBase.password
    ) {
      return jsonResponse({ error: 'La configuración del endpoint R2 no es válida.' }, 503, headers);
    }

    const objectKey = `${userId}/${body.folder}/${crypto.randomUUID()}.${extension}`;
    const encodedKey = objectKey.split('/').map(encodeURIComponent).join('/');
    const objectUrl = `${endpoint.origin}/${encodeURIComponent(env.R2_BUCKET_NAME)}/${encodedKey}`;
    const presignUrl = new URL(objectUrl);
    presignUrl.searchParams.set('X-Amz-Expires', String(PRESIGN_EXPIRY_SECONDS));

    const signer = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      service: 's3',
      region: 'auto',
    });

    const signedRequest = await signer.sign(presignUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      aws: { signQuery: true, allHeaders: true },
    });

    const publicBaseUrl = publicBase.toString().replace(/\/+$/, '');
    const publicUrl = `${publicBaseUrl}/${encodedKey}`;

    return jsonResponse(
      {
        uploadUrl: signedRequest.url,
        publicUrl,
        contentType,
      },
      200,
      headers
    );
  } catch {
    console.error('R2 upload URL signing failed.');
    return jsonResponse({ error: 'No se pudo preparar la subida a R2.' }, 502, headers);
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) {
      return serveAssetOrSpaRoute(request, env);
    }

    const origin = getAllowedOrigin(request, env);
    if (!origin) {
      return jsonResponse({ error: 'Origen no permitido.' }, 403);
    }

    const headers = createCorsHeaders(origin);
    if (url.pathname !== PRESIGN_PATH) {
      return jsonResponse({ error: 'Ruta no encontrada.' }, 404, headers);
    }

    if (request.method === 'OPTIONS') {
      const requestedMethod = request.headers.get('Access-Control-Request-Method');
      const requestedHeaders = request.headers
        .get('Access-Control-Request-Headers')
        ?.split(',')
        .map((header) => header.trim().toLowerCase())
        .filter(Boolean);

      if (
        (requestedMethod && requestedMethod.toUpperCase() !== 'POST') ||
        requestedHeaders?.some((header) => !['authorization', 'content-type'].includes(header))
      ) {
        return jsonResponse({ error: 'Solicitud preflight no permitida.' }, 403, headers);
      }

      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST') {
      headers.set('Allow', 'POST, OPTIONS');
      return jsonResponse({ error: 'Método no permitido.' }, 405, headers);
    }

    return handlePresign(request, env, headers);
  },
};
