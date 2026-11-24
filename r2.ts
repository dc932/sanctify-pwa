import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const endpoint = import.meta.env.VITE_R2_ENDPOINT;
const accessKeyId = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const secretAccessKey = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
const bucketName = import.meta.env.VITE_R2_BUCKET_NAME;

if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
  console.warn(
    'Faltan variables de entorno de Cloudflare R2 (VITE_R2_ENDPOINT, VITE_R2_ACCESS_KEY_ID, VITE_R2_SECRET_ACCESS_KEY, VITE_R2_BUCKET_NAME).'
  );
}

// 1. Inicializar el cliente de Cloudflare R2 usando las credenciales del entorno
const r2Client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
});

function generateUniqueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Función helper para subir archivos (audios, videos, PDFs o portadas) a Cloudflare R2.
 * Convierte el archivo a Uint8Array para evitar errores de ReadableStream (.getReader) en navegador.
 */
export async function uploadToR2(file: File | Blob, folder: string = 'tracks'): Promise<string> {
  if (!(file instanceof Blob)) {
    throw new Error('El archivo proporcionado no es un File o Blob válido.');
  }

  const originalName = file instanceof File && file.name ? file.name : 'archivo.bin';
  const rawExt = originalName.includes('.') ? originalName.split('.').pop() : '';
  const sanitizedExt = (rawExt || 'bin').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bin';
  const sanitizedFolder = folder.replace(/^\/+|\/+$/g, '') || 'tracks';

  const uniqueId = generateUniqueId();
  const fileName = `${sanitizedFolder}/${Date.now()}_${uniqueId}.${sanitizedExt}`;

  // Leer el archivo en memoria como Uint8Array para compatibilidad total con @aws-sdk/client-s3 en navegador
  const arrayBuffer = await file.arrayBuffer();
  const bodyBytes = new Uint8Array(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: bodyBytes,
    ContentType: file.type || 'application/octet-stream',
    ContentLength: bodyBytes.byteLength,
  });

  await r2Client.send(command);

  const rawPublicUrl =
    import.meta.env.VITE_R2_PUBLIC_URL ||
    'https://pub-695900c697294aa480c3ee497955f125.r2.dev';

  const publicBaseUrl = rawPublicUrl.replace(/\/+$/, '');

  return `${publicBaseUrl}/${fileName}`;
}