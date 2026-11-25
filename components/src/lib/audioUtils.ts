export function getProxiedAudioUrl(originalUrl: string): string {
  if (!originalUrl) return '';
  
  // Tu dominio exacto de Cloudflare R2 extraído de la base de datos
  const r2Domain = 'https://pub-695900c697294aa480c3ee497955f125.r2.dev';
  
  // Si estamos en entorno de desarrollo local (npm run dev) y pertenece a R2, usamos el proxy
  if (import.meta.env.DEV && originalUrl.startsWith(r2Domain)) {
    return originalUrl.replace(r2Domain, '/audio-api');
  }
  
  return originalUrl;
}