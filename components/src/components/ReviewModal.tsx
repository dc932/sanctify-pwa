import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { supabase } from '@/supabase'; // Ajusta la ruta de tu cliente Supabase

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReviewAdded: () => void;
}

export function ReviewModal({ isOpen, onClose, onReviewAdded }: ReviewModalProps) {
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !comment.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert([
        { name, rating, comment }
      ]);

      if (error) throw error;

      // Limpiar y notificar que se agregó con éxito
      setName('');
      setRating(5);
      setComment('');
      onReviewAdded();
      onClose();
    } catch (err) {
      console.error('Error al guardar la reseña:', err);
      alert('Hubo un error al enviar tu reseña. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-lg font-bold mb-1">Déjanos tu reseña</h3>
        <p className="text-xs text-zinc-400 mb-5">Tu opinión es muy importante para nosotros.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
              Tu Nombre
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Carlos Mendoza"
              className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#3CC8F5]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
              Calificación
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
              Comentario
            </label>
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Cuéntanos tu experiencia..."
              className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#3CC8F5] resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#3CC8F5] text-black font-bold py-3 rounded-xl transition-all hover:bg-[#2ab3df] disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Enviando...' : 'Publicar Reseña'}
          </button>
        </form>
      </div>
    </div>
  );
}