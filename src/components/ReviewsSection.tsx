import { useState, useEffect } from 'react';
import { Star, MessageSquarePlus } from 'lucide-react';
import { supabase } from '@/supabase';
import { ReviewModal } from './ReviewModal';

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Función para cargar reseñas desde Supabase
  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setReviews(data);
    } catch (err) {
      console.error('Error cargando reseñas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  return (
    <section className="py-16 px-4 sm:px-6 max-w-6xl mx-auto w-full text-white">
      {/* Cabecera de la sección */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Lo que dicen nuestros usuarios</h2>
          <p className="text-zinc-400 text-sm mt-1">Experiencias reales de nuestra comunidad.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 px-5 py-2.5 rounded-full text-sm font-bold backdrop-blur-md transition-all cursor-pointer text-[#3CC8F5]"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Escribir una reseña
        </button>
      </div>

      {/* Grid de Reseñas */}
      {isLoading ? (
        <div className="text-center py-12 text-zinc-500 animate-pulse text-sm">Cargando reseñas...</div>
      </i> : reviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between shadow-lg hover:border-[#3CC8F5]/40 transition-colors"
            >
              <div>
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < rev.rating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed italic mb-4">"{rev.comment}"</p>
              </div>

              <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                <span className="font-bold text-sm text-white">{rev.name}</span>
                <span className="text-[10px] text-zinc-500">
                  {new Date(rev.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl">
          <p className="text-zinc-400 text-sm mb-3">Aún no hay reseñas registradas.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-bold text-[#3CC8F5] underline hover:text-white"
          >
            ¡Sé el primero en dejar una opinión!
          </button>
        </div>
      )}

      {/* Modal de formulario */}
      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onReviewAdded={fetchReviews}
      />
    </section>
  );
}