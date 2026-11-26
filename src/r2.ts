import { supabase } from './supabase';

interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
  contentType: string;
}

const extensionByMimeType: Record<string, string> = {
  'application/msword': 'doc',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'audio/aac': 'aac',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'text/plain': 'txt',
  'video/mp4': 'mp4',
};

function getUploadFileName(file: File | Blob): string {
  if (file instanceof File && file.name) return file.name;

  const extension = extensionByMimeType[file.type];
  if (!extension) {
    throw new Error('El archivo debe tener un nombre y una extensión permitida.');
  }
  return `archivo.${extension}`;
}

export async function uploadToR2(file: File | Blob, folder: string = 'tracks'): Promise<string> {
  if (!(file instanceof Blob) || file.size === 0) {
    throw new Error('El archivo proporcionado no es válido o está vacío.');
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('La sesión ha expirado. Por favor, vuelve a iniciar sesión.');
  }

  const presignResponse = await fetch('/api/uploads/presign', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: getUploadFileName(file),
      folder,
      size: file.size,
    }),
  });
  const presignedUpload = (await presignResponse.json()) as Partial<PresignedUpload> & {
    error?: string;
  };

  if (!presignResponse.ok) {
    throw new Error(presignedUpload.error || `No se pudo preparar la subida (HTTP ${presignResponse.status}).`);
  }
  if (!presignedUpload.uploadUrl || !presignedUpload.publicUrl || !presignedUpload.contentType) {
    throw new Error('El servicio de subida devolvió una respuesta incompleta.');
  }

  const uploadResponse = await fetch(presignedUpload.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': presignedUpload.contentType },
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error(`R2 rechazó el archivo (HTTP ${uploadResponse.status}).`);
  }

  return presignedUpload.publicUrl;
}
