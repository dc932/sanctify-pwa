import { useState } from 'react';
import { Share2, Check } from 'lucide-react';

interface ShareButtonProps {
  className?: string;
  variant?: 'icon' | 'full';
}

export default function ShareButton({ className = '', variant = 'full' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: 'Sanctify',
      text: 'Descubre música, podcasts y lecturas espirituales increíbles en Sanctify.',
      url: window.location.origin, // O la URL pública de tu app
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // El usuario canceló o el navegador bloqueó la acción
        console.log('Error al compartir:', err);
      }
    } else {
      // Fallback para navegadores de escritorio que no soportan Web Share API
      try {
        await navigator.clipboard.writeText(shareData.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (err) {
        console.error('Error al copiar enlace', err);
      }
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleShare}
        className={`flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-[#3CC8F5] hover:text-[#3CC8F5] transition-all cursor-pointer ${className}`}
        title="Compartir aplicación"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className={`flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:border-[#3CC8F5] hover:text-[#3CC8F5] transition-all cursor-pointer ${className}`}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4 text-[#3CC8F5]" />}
      {copied ? '¡Enlace copiado!' : 'Compartir Aplicación'}
    </button>
  );
}