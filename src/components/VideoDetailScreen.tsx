import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clock3,
  Heart,
  MoreHorizontal,
  Radio,
  Share2,
  Sparkles,
  Tv,
  Users,
  X,
} from 'lucide-react';

interface VideoItem {
  id: string;
  title: string;
  channel: string;
  description: string;
  views: string;
  published: string;
  duration: string;
  videoUrl: string;
  accent: string;
}

const videos: VideoItem[] = [
  {
    id: 'mass-1',
    title: 'Santa Misa dominical desde la Catedral',
    channel: 'Sanctify Comunidad',
    description: 'Celebra la Eucaristía y encuentra un momento de paz en la presencia de Dios.',
    views: '24 mil vistas',
    published: 'Hace 2 días',
    duration: '1:12:40',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    accent: 'from-amber-500 to-orange-700',
  },
  {
    id: 'adoration-1',
    title: 'Hora Santa: permanece conmigo',
    channel: 'Parroquia San Miguel',
    description: 'Una hora de adoración, silencio y oración guiada para descansar el corazón.',
    views: '18 mil vistas',
    published: 'Hace 5 días',
    duration: '58:20',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    accent: 'from-sky-600 to-blue-950',
  },
  {
    id: 'documentary-1',
    title: 'La historia de una fe que transforma',
    channel: 'Historias de Esperanza',
    description: 'Documental especial sobre comunidades que sirven con alegría y misericordia.',
    views: '42 mil vistas',
    published: '12 oct 2026',
    duration: '45:20',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    accent: 'from-emerald-600 to-teal-950',
  },
  {
    id: 'conference-1',
    title: 'Cómo vivir la fe en tiempos difíciles',
    channel: 'Conferencias Sanctify',
    description: 'Reflexión completa para vivir con propósito, confianza y comunidad.',
    views: '9,8 mil vistas',
    published: '20 oct 2026',
    duration: '36:12',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    accent: 'from-rose-600 to-red-950',
  },
];

interface CastVideoElement extends HTMLVideoElement {
  webkitShowPlaybackTargetPicker?: () => void;
}

function VideoThumbnail({ video }: { video: VideoItem }) {
  return (
    <div className={`relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br ${video.accent}`}>
      <img src="/Sanctify_Icon_black.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-screen" />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-1 text-[11px] font-semibold text-white">
        {video.duration}
      </div>
      <div className="absolute left-3 top-3 rounded-full bg-black/25 p-2 text-white backdrop-blur-sm">
        <Radio className="h-4 w-4" />
      </div>
    </div>
  );
}

interface VideoDetailScreenProps {
  onClose: () => void;
  onOpenPayItForward: () => void;
}

export default function VideoDetailScreen({ onClose, onOpenPayItForward }: VideoDetailScreenProps) {
  const [selectedVideo, setSelectedVideo] = useState(videos[0]);
  const [isLiked, setIsLiked] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const videoRef = useRef<CastVideoElement>(null);

  useEffect(() => {
    videoRef.current?.load();
  }, [selectedVideo]);

  const castVideo = () => {
    videoRef.current?.webkitShowPlaybackTargetPicker?.();
  };

  const shareVideo = async () => {
    if (navigator.share) {
      await navigator.share({ title: selectedVideo.title, text: selectedVideo.description });
    } else {
      await navigator.clipboard?.writeText(window.location.href);
    }
    setIsShared(true);
    window.setTimeout(() => setIsShared(false), 1600);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0B] pb-32 text-zinc-900 dark:text-white transition-colors duration-200">
      <header className="sticky top-0 z-30 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/95 dark:bg-[#0A0A0B]/95 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button onClick={onClose} className="flex items-center gap-2 text-sm font-semibold text-zinc-700 transition-colors hover:text-[#3CC8F5] dark:text-zinc-200 dark:hover:text-[#3CC8F5]">
            <ArrowLeft className="h-5 w-5" />
            <span>Volver</span>
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
            <img src="/Sanctify_Icon_black.png" alt="" className="h-7 w-7 rounded-lg object-cover" />
            Videos Sanctify
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.9fr)] lg:gap-10 lg:py-8">
        <div className="min-w-0">
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-black shadow-xl shadow-zinc-300/20 dark:shadow-black/40 border border-zinc-200 dark:border-zinc-800">
            <video
              ref={videoRef}
              key={selectedVideo.id}
              src={selectedVideo.videoUrl}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
              aria-label={selectedVideo.title}
            />
            <button onClick={castVideo} className="absolute bottom-14 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80" aria-label="Transmitir a TV o AirPlay">
              <Tv className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold leading-tight text-zinc-900 dark:text-white sm:text-2xl">{selectedVideo.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{selectedVideo.views}</span>
                  <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <span>{selectedVideo.published}</span>
                  <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {selectedVideo.duration}</span>
                </div>
              </div>
              <button className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 sm:flex" aria-label="Más opciones"><MoreHorizontal className="h-5 w-5" /></button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-y border-zinc-200 py-4 dark:border-zinc-800">
              <div className="flex min-w-[180px] flex-1 items-center gap-3">
                <img src="/Sanctify_Icon_black.png" alt={selectedVideo.channel} className="h-10 w-10 rounded-full object-cover" />
                <div><p className="text-sm font-bold text-zinc-900 dark:text-white">{selectedVideo.channel}</p><p className="text-xs text-zinc-500 dark:text-zinc-400">Comunidad creadora</p></div>
              </div>
              <button onClick={() => setIsLiked((value) => !value)} className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${isLiked ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}><Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} /> Me gusta</button>
              <button onClick={() => void shareVideo()} className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{isShared ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />} {isShared ? 'Listo' : 'Compartir'}</button>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">{selectedVideo.description}</p>

            <div className="mt-6 overflow-hidden rounded-2xl border border-[#3CC8F5]/20 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-[#121214] dark:to-[#0A0A0B] p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#3CC8F5] text-black shadow-lg shadow-[#3CC8F5]/20"><Sparkles className="h-5 w-5" /></div>
                <div className="flex-1"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3CC8F5]">Pay It Forward</p><h2 className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">Ayuda a que esta misión continúe</h2><p className="mt-1 text-sm leading-5 text-zinc-600 dark:text-zinc-300">Patrocina al creador o apoya el próximo hito de Sanctify para llevar esperanza a más personas.</p></div>
              </div>
              <button 
                onClick={onOpenPayItForward} 
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#3CC8F5] px-4 py-3 text-sm font-bold text-black transition-transform hover:scale-[1.01] active:scale-95 shadow-md"
              >
                <Heart className="h-4 w-4 fill-black" /> Patrocinar este contenido
              </button>
            </div>
          </div>
        </div>

        <aside className="lg:pt-1">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-zinc-900 dark:text-white">Recomendados</h2><span className="text-xs text-zinc-500 dark:text-zinc-400">Para ti</span></div>
          <div className="space-y-4">
            {videos.filter((video) => video.id !== selectedVideo.id).map((video) => (
              <button key={video.id} onClick={() => setSelectedVideo(video)} className="group flex w-full gap-3 text-left">
                <div className="w-40 shrink-0 sm:w-44"><VideoThumbnail video={video} /></div>
                <div className="min-w-0 py-0.5"><h3 className="line-clamp-2 text-sm font-semibold leading-5 text-zinc-800 transition-colors group-hover:text-[#3CC8F5] dark:text-zinc-100 dark:group-hover:text-[#3CC8F5]">{video.title}</h3><p className="mt-1.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{video.channel}</p><p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{video.views} · {video.published}</p></div>
              </button>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-zinc-100 p-3 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800"><Users className="h-4 w-4 shrink-0 text-[#3CC8F5]" /> Descubre contenido que fortalece tu comunidad.</div>
        </aside>
      </main>
    </div>
  );
}