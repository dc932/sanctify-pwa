import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../supabase';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Headphones,
  Heart,
  Instagram,
  Mail,
  MessageCircle,
  MessageSquarePlus,
  Play,
  Quote,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Video,
  X,
  Youtube,
} from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
}

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  role?: string;
  created_at: string;
}

const SHARE_URL = 'https://sanctify-catholic-st-y388.bolt.host';

const features = [
  { icon: Headphones, title: 'Audio espiritual', description: 'Música, oración guiada y podcasts para acompañar tu día.' },
  { icon: BookOpen, title: 'Lecturas que nutren', description: 'Meditaciones, Evangelio y Lectio Divina en un solo lugar.' },
  { icon: Video, title: 'Contenido de comunidad', description: 'Descubre videos y voces que fortalecen tu camino de fe.' },
  { icon: Users, title: 'Círculos de fe', description: 'Conecta con personas y comunidades que comparten tu propósito.' },
];

// Reseñas estáticas por defecto en caso de que la tabla en Supabase esté vacía al inicio
const fallbackReviews: Review[] = [
  { id: '1', name: 'María G.', role: 'Oyente activa', comment: 'Sanctify me acompaña en mis mañanas. Todo el contenido se siente hecho con mucho cuidado.', rating: 5, created_at: new Date().toISOString() },
  { id: '2', name: 'P. Andrés R.', role: 'Creador de contenido', comment: 'Por fin una herramienta sencilla para compartir reflexiones que llegan a más personas.', rating: 5, created_at: new Date().toISOString() },
  { id: '3', name: 'Lucía M.', role: 'Miembro de la comunidad', comment: 'La encontré buscando música para rezar y terminé descubriendo una comunidad hermosa.', rating: 5, created_at: new Date().toISOString() },
];

function Stars({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-0.5 text-[#3CC8F5]" aria-label={`${count} de 5 estrellas`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className="h-3.5 w-3.5" fill={index < count ? 'currentColor' : 'none'} />
      ))}
    </div>
  );
}

export default function LandingPage({ onEnterApp }: LandingPageProps) {
  const [email, setEmail] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Estados para el sistema de Reseñas Dinámicas
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Estados de compartir y contenido publicado
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [publishedContent, setPublishedContent] = useState<any[]>([]);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    fetchPublishedContent();
    fetchReviews();
  }, []);

  const fetchPublishedContent = async () => {
    try {
      const { data, error } = await supabase
        .from('creator_content')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        setPublishedContent(data);
      }
    } catch (err) {
      console.error('Error al cargar contenido publicado:', err);
    }
  };

  // Cargar reseñas en tiempo real desde Supabase
  const fetchReviews = async () => {
    setIsLoadingReviews(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setReviewsList(data);
      } else {
        setReviewsList(fallbackReviews);
      }
    } catch (err) {
      console.error('Error al cargar reseñas:', err);
      setReviewsList(fallbackReviews);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  // Guardar nueva reseña localmente y en Supabase
  const handleAddReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!newReviewName.trim() || !newReviewComment.trim()) return;

    setIsSubmittingReview(true);
    try {
      const { error } = await supabase.from('reviews').insert([
        {
          name: newReviewName.trim(),
          rating: newReviewRating,
          comment: newReviewComment.trim(),
        },
      ]);

      if (error) throw error;

      // Limpiar el formulario y recargar la lista
      setNewReviewName('');
      setNewReviewRating(5);
      setNewReviewComment('');
      setShowReviewModal(false);
      await fetchReviews();
    } catch (err: any) {
      console.error('Error al enviar reseña:', err);
      alert('Ocurrió un error al guardar tu reseña: ' + (err.message || 'Inténtalo de nuevo'));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(SHARE_URL);
      setCopied(true);
      setMessage('¡Enlace copiado al portapapeles!');
      window.setTimeout(() => {
        setCopied(false);
        setMessage('');
        setShowShareMenu(false);
      }, 2200);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: 'Sanctify',
      text: 'Descubre Sanctify, una nueva forma de vivir tu fe con música, lecturas y comunidad.',
      url: SHARE_URL,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        setShowShareMenu(!showShareMenu);
      }
    } else {
      setShowShareMenu(!showShareMenu);
    }
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent('Descubre Sanctify, una nueva forma de vivir tu fe: ' + SHARE_URL);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    setShowShareMenu(false);
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Te invito a conocer Sanctify');
    const body = encodeURIComponent('Hola,\n\nTe comparto Sanctify, una plataforma para encontrar música, reflexiones y comunidad espiritual: ' + SHARE_URL);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    setShowShareMenu(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      alert('Error al conectar con Google: ' + error.message);
    }
  };

  const handleEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);

    if (error) {
      alert('Error al enviar enlace: ' + error.message);
    } else {
      alert('¡Enlace enviado! Revisa tu bandeja de entrada para entrar.');
      setShowLogin(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#0A0A0B] text-white">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/[0.06] bg-[#0A0A0B]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5 cursor-pointer" aria-label="Ir al inicio">
            <img src="/Sanctify_Icon_black.png" alt="Sanctify" className="h-9 w-9 rounded-xl object-cover" />
            <span className="text-lg font-bold tracking-tight">Sanctify</span>
          </button>
          <nav className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">
            <a href="#contenido" className="transition-colors hover:text-white">Contenido</a>
            <a href="#comunidad" className="transition-colors hover:text-white">Comunidad</a>
            <a href="#reseñas" className="transition-colors hover:text-white">Reseñas</a>
          </nav>
          <button onClick={() => setShowLogin(true)} className="rounded-full border border-[#3CC8F5]/50 px-4 py-2 text-xs font-bold text-[#3CC8F5] transition-all hover:bg-[#3CC8F5] hover:text-black cursor-pointer">
            Iniciar sesión
          </button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-32 sm:px-6 sm:pt-40 lg:px-8 lg:pb-24">
          <div className="pointer-events-none absolute -right-40 -top-20 h-[32rem] w-[32rem] rounded-full bg-[#3CC8F5]/[0.08] blur-3xl" />
          <div className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#3CC8F5]/25 bg-[#3CC8F5]/[0.08] px-3 py-1.5 text-xs font-semibold text-[#3CC8F5]">
                <Sparkles className="h-3.5 w-3.5" />
                Una nueva forma de vivir tu fe
              </div>

              <div className="my-6 w-full max-w-5xl overflow-hidden rounded-3xl border border-zinc-800 bg-[#121214] shadow-2xl">
                <img
                  src="/Sanctify_V2_logo_black.png"
                  alt="Sanctify logo"
                  className="h-[400px] sm:h-[500px] lg:h-[600px] w-full object-cover object-center"
                />
              </div>

              <a
                href="https://tally.so/r/4aXQAo"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#22d3ee] hover:bg-[#06b6d4] text-gray-950 font-bold py-3 px-8 rounded-full shadow-lg transition-all transform hover:scale-105 inline-block text-center cursor-pointer"
              >
                Unirme a la Lista de Espera 🚀
              </a>
              
              <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Tu fe merece un espacio que <span className="text-[#3CC8F5]">te acompañe.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
                Música, lecturas, podcasts y comunidad para hacer de cada momento una oportunidad de encuentro.
                Sanctify es gratuito, sin anuncios y creado para crecer contigo.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={onEnterApp} className="group flex items-center gap-2 rounded-full bg-[#3CC8F5] px-5 py-3 text-sm font-bold text-black transition-all hover:scale-[1.02] hover:bg-[#edca72] cursor-pointer">
                  Explorar Sanctify <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <a href="#contenido" className="flex items-center gap-2 rounded-full border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-900">
                  Conoce la experiencia
                </a>
              </div>
              <div className="mt-8 flex items-center gap-5 text-xs text-zinc-500">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#3CC8F5]" /> Sin anuncios</span>
                <span className="flex items-center gap-1.5"><Heart className="h-4 w-4 text-[#3CC8F5]" /> 100% gratuito</span>
              </div>
            </div>

            {/* Mockup Reproductor */}
            <div className="relative mx-auto w-full max-w-md lg:mr-4">
              <div className="absolute -inset-4 rounded-[2.5rem] bg-[#3CC8F5]/10 blur-2xl" />
              <div className="relative rounded-[2rem] border border-zinc-700 bg-[#121214] p-3 shadow-2xl shadow-black/60">
                <div className="overflow-hidden rounded-[1.5rem] border border-white/[0.06] bg-[#0f0f10]">
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                    <div className="flex items-center gap-2"><img src="/Sanctify_Icon_black.png" alt="" className="h-7 w-7 rounded-lg" /><span className="font-bold">Sanctify</span></div>
                    <span className="rounded-full bg-[#3CC8F5]/10 px-2.5 py-1 text-[10px] font-semibold text-[#3CC8F5]">Para ti</span>
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3CC8F5]">Tu momento de paz</p>
                    <h2 className="mt-2 text-2xl font-bold">Vuelve a lo trascendente</h2>
                    <p className="mt-1 text-xs text-zinc-500">Una selección para acompañar tu oración.</p>
                    
                    <div className="mt-5 space-y-3">
                      {publishedContent.length > 0 ? (
                        publishedContent.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 items-start">
                            <img src={item.artwork_url || 'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=240'} alt={item.title} className="h-14 w-14 rounded-xl object-cover aspect-square" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{item.title}</p>
                              <p className="mt-1 text-xs text-zinc-500 truncate">{item.category || 'Creador'}</p>
                            </div>
                            <button onClick={onEnterApp} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3CC8F5] text-black shrink-0 cursor-pointer" aria-label="Reproducir"><Play className="ml-0.5 h-4 w-4" fill="currentColor" /></button>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 items-start">
                          <img src="https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=240" alt="Música espiritual" className="h-14 w-14 rounded-xl object-cover aspect-square" />
                          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">Ave Maria</p><p className="mt-1 text-xs text-zinc-500 truncate">Schola Cantorum</p></div>
                          <button onClick={onEnterApp} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3CC8F5] text-black cursor-pointer" aria-label="Reproducir"><Play className="ml-0.5 h-4 w-4" fill="currentColor" /></button>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-zinc-900 p-3"><BookOpen className="h-4 w-4 text-[#3CC8F5]" /><p className="mt-2 text-xs font-semibold">Lecturas del día</p></div>
                      <div className="rounded-xl bg-zinc-900 p-3"><Users className="h-4 w-4 text-[#3CC8F5]" /><p className="mt-2 text-xs font-semibold">Tu comunidad</p></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-2xl border border-zinc-700 bg-[#171719] p-3 shadow-xl sm:flex"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"><Check className="h-4 w-4" /></div><div><p className="text-xs font-bold">Tu espacio, a tu ritmo</p><p className="text-[10px] text-zinc-500">Disponible siempre</p></div></div>
            </div>
          </div>
        </section>

        {/* Sección Contenido */}
        <section id="contenido" className="border-y border-white/[0.06] bg-[#0d0d0e] py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3CC8F5]">Todo en un solo lugar</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Contenido que se adapta a tu camino.</h2><p className="mt-4 text-base leading-7 text-zinc-400">Desde unos minutos de silencio hasta una conversación que cambia tu perspectiva. Encuentra algo para cada momento.</p></div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-start">
              {features.map(({ icon: Icon, title, description }) => (
                <div key={title} className="group rounded-2xl border border-zinc-800 bg-[#121214] p-5 transition-all hover:-translate-y-1 hover:border-[#3CC8F5]/40">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3CC8F5]/10 text-[#3CC8F5] transition-colors group-hover:bg-[#3CC8F5] group-hover:text-black"><Icon className="h-5 w-5" /></div>
                  <h3 className="mt-5 font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
                  <button onClick={onEnterApp} className="mt-4 flex items-center gap-1 text-xs font-bold text-[#3CC8F5] cursor-pointer">Explorar <ChevronRight className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECCIÓN DE RESEÑAS DINÁMICAS Y CONEXIÓN CON SUPABASE */}
        <section id="reseñas" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3CC8F5]">Una comunidad que crece</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">La fe se vive mejor acompañados.</h2>
              <div className="mt-4 flex items-center gap-4">
                <span className="text-4xl sm:text-5xl font-bold">4.9</span>
                <div>
                  <Stars count={5} />
                  <p className="mt-1 text-xs text-zinc-500">Basado en opiniones de la comunidad</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowReviewModal(true)}
              className="flex items-center gap-2.5 rounded-full bg-[#3CC8F5] px-6 py-3 text-sm font-bold text-black transition-all hover:bg-[#32b0d8] hover:scale-105 shadow-lg shadow-[#3CC8F5]/20 cursor-pointer"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Escribir una reseña
            </button>
          </div>

          {/* Grid de Reseñas Dinámicas */}
          {isLoadingReviews ? (
            <div className="text-center py-12 text-zinc-500 animate-pulse text-sm">Cargando reseñas comunitarias...</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
              {reviewsList.map((review) => (
                <article key={review.id} className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-[#121214] p-6 shadow-md hover:border-zinc-700 transition-colors">
                  <div>
                    <Quote className="h-5 w-5 text-[#3CC8F5]" />
                    <p className="mt-4 text-sm leading-6 text-zinc-300 italic">"{review.comment}"</p>
                  </div>
                  <div className="mt-6 border-t border-zinc-800/80 pt-4 flex items-center justify-between">
                    <div>
                      <Stars count={review.rating} />
                      <p className="mt-1.5 text-sm font-bold text-white">{review.name}</p>
                      <p className="text-[11px] text-zinc-500">{review.role || 'Miembro de la comunidad'}</p>
                    </div>
                    <span className="text-[10px] text-zinc-600">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Sección Compartir Comunidad */}
        <section id="comunidad" className="border-y border-white/[0.06] bg-gradient-to-br from-[#15130e] to-[#0d0d0e] py-16">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-7 px-4 text-center sm:px-6 lg:flex-row lg:px-8 lg:text-left">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3CC8F5]">Haz que llegue más lejos</p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Comparte Sanctify con alguien que quieres.</h2>
              <p className="mt-2 text-sm text-zinc-400">Un enlace puede ser el inicio de un momento de paz.</p>
            </div>
            
            <div className="relative">
              <button 
                onClick={handleNativeShare}
                className="flex items-center gap-2.5 rounded-xl bg-[#3CC8F5] px-6 py-3.5 text-sm font-bold text-black transition-all hover:bg-[#32b0d8] hover:scale-105 shadow-lg shadow-[#3CC8F5]/20 cursor-pointer"
              >
                <Share2 className="h-4 w-4" /> Compartir Sanctify
              </button>

              {showShareMenu && (
                <div className="absolute right-0 lg:left-0 mt-2 w-56 rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl z-50 text-left animate-in fade-in slide-in-from-top-2">
                  <button 
                    onClick={shareViaWhatsApp}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp
                  </button>
                  <button 
                    onClick={shareViaEmail}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
                  >
                    <Mail className="h-4 w-4 text-[#3CC8F5]" /> Correo Electrónico
                  </button>
                  <button 
                    onClick={handleCopy}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
                  >
                    <Copy className="h-4 w-4 text-zinc-400" /> {copied ? '¡Copiado!' : 'Copiar enlace'}
                  </button>
                </div>
              )}
            </div>
          </div>
          {message && <p className="mt-4 text-center text-xs text-[#3CC8F5]">{message}</p>}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-8 md:flex-row">
            <div className="max-w-xs">
              <div className="flex items-center gap-2">
                <img src="/Sanctify_Icon_black.png" alt="" className="h-8 w-8 rounded-lg" />
                <span className="font-bold">Sanctify</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-500">Una plataforma gratuita para encontrar música, palabras y comunidad en tu camino espiritual.</p>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm text-zinc-500">
              <a href="#contenido" className="hover:text-white">Contenido</a>
              <a href="#comunidad" className="hover:text-white">Comunidad</a>
              <a href="#reseñas" className="hover:text-white">Reseñas</a>
              <button onClick={onEnterApp} className="text-left hover:text-white cursor-pointer">Abrir app</button>
              <a href="#" className="hover:text-white">Privacidad</a>
              <a href="#" className="hover:text-white">Términos</a>
            </div>
          </div>
          <div className="mt-10 flex flex-col justify-between gap-4 border-t border-zinc-800 pt-5 text-xs text-zinc-600 sm:flex-row">
            <span>© 2026 Sanctify. Creado para servir.</span>
            <div className="flex items-center gap-3">
              <a href="#" aria-label="YouTube" className="hover:text-white"><Youtube className="h-4 w-4" /></a>
              <a href="#" aria-label="Instagram" className="hover:text-white"><Instagram className="h-4 w-4" /></a>
              <a href="mailto:hola@sanctify.app" aria-label="Email" className="hover:text-white"><Mail className="h-4 w-4" /></a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating CTA */}
      <div className="fixed bottom-4 left-1/2 z-30 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-2xl border border-[#3CC8F5]/30 bg-[#171719]/95 p-2 pl-4 shadow-2xl shadow-black/60 backdrop-blur-xl sm:bottom-5">
        <span className="text-xs font-semibold text-zinc-200">Empieza tu camino en Sanctify</span>
        <button onClick={onEnterApp} className="flex items-center gap-1.5 rounded-xl bg-[#3CC8F5] px-3.5 py-2.5 text-xs font-bold text-black cursor-pointer">
          Entrar <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* MODAL DE FORMULARIO DE RESEÑAS */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true">
          <div className="relative w-full max-w-md rounded-3xl border border-zinc-700 bg-[#151517] p-6 shadow-2xl text-white">
            <button 
              onClick={() => setShowReviewModal(false)} 
              className="absolute right-4 top-4 text-zinc-400 hover:text-white transition-colors cursor-pointer" 
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-xl font-bold">Déjanos tu reseña</h3>
            <p className="mt-1 text-xs text-zinc-400">Comparte tu experiencia con la comunidad de Sanctify.</p>

            <form onSubmit={handleAddReview} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
                  Tu Nombre
                </label>
                <input
                  type="text"
                  required
                  value={newReviewName}
                  onChange={(e) => setNewReviewName(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#3CC8F5]"
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
                      onClick={() => setNewReviewRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= newReviewRating ? 'text-[#3CC8F5] fill-[#3CC8F5]' : 'text-zinc-700'
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
                  value={newReviewComment}
                  onChange={(e) => setNewReviewComment(e.target.value)}
                  placeholder="¿Cómo te ha acompañado Sanctify en tu día a día?"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#3CC8F5] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReview}
                className="w-full bg-[#3CC8F5] text-black font-bold py-3 rounded-xl transition-all hover:bg-[#32b0d8] disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingReview ? 'Publicando...' : 'Publicar Reseña'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Login */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Iniciar sesión">
          <div className="relative w-full max-w-sm rounded-3xl border border-zinc-700 bg-[#151517] p-6 shadow-2xl">
            <button onClick={() => setShowLogin(false)} className="absolute right-4 top-4 text-zinc-500 hover:text-white cursor-pointer" aria-label="Cerrar"><X className="h-5 w-5" /></button>
            <div className="flex items-center gap-2">
              <img src="/Sanctify_Icon_black.png" alt="" className="h-8 w-8 rounded-lg" />
              <span className="font-bold">Sanctify</span>
            </div>
            <h2 className="mt-6 text-2xl font-bold">Bienvenido de vuelta</h2>
            <p className="mt-1 text-sm text-zinc-500">Guarda tus favoritos y continúa donde lo dejaste.</p>
            
            <button 
              onClick={handleGoogleLogin} 
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 py-3 text-sm font-semibold hover:border-zinc-500 disabled:opacity-50 cursor-pointer"
            >
              <span className="font-bold">G</span> {loading ? 'Cargando...' : 'Continuar con Google'}
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-zinc-600">
              <span className="h-px flex-1 bg-zinc-800" />o con email<span className="h-px flex-1 bg-zinc-800" />
            </div>

            <form onSubmit={handleEmail}>
              <input 
                autoFocus 
                type="email" 
                value={email} 
                onChange={(event) => setEmail(event.target.value)} 
                placeholder="tu@email.com" 
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-[#3CC8F5]" 
                required 
              />
              <button 
                type="submit" 
                disabled={loading}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#3CC8F5] py-3 text-sm font-bold text-black disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Enviando...' : 'Continuar'} <ArrowRight className="h-4 w-4" />
              </button>
            </form>
            
            <p className="mt-4 text-center text-[11px] text-zinc-600">Al continuar aceptas nuestros términos y política de privacidad.</p>
          </div>
        </div>
      )}
    </div>
  );
}