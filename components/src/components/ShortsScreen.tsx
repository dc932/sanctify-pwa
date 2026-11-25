import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Check,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAudio } from '@/context/AudioContext';
import { tracks } from '@/data/tracks';

interface ShortItem {
  id: string;
  videoUrl: string;
  author: string;
  description: string;
  likes: number;
  audioTrackId?: string;
}

const shorts: ShortItem[] = [
  {
    id: 'short-1',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    author: '@padre_antonio',
    description: 'Dios también habla en los momentos sencillos. Tómate un minuto para escucharle hoy.',
    likes: 12400,
    audioTrackId: 'pod-1',
  },
  {
    id: 'short-2',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    author: '@evangelio.diario',
    description: 'Minuto del Evangelio: la esperanza no decepciona cuando caminamos con fe.',
    likes: 8700,
    audioTrackId: 'blg-2',
  },
  {
    id: 'short-3',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    author: '@sacerdote_joven',
    description: 'Una oración breve para comenzar tu día con el corazón en paz.',
    likes: 15300,
    audioTrackId: 'mus-1',
  },
];

function formatCount(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : String(value);
}

export default function ShortsScreen({ onClose }: { onClose: () => void }) {
  const { isPlaying, pausePlayback, playTrack } = useAudio();
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [activeId, setActiveId] = useState(shorts[0].id);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [shared, setShared] = useState<string | null>(null);

  useEffect(() => {
    if (isPlaying) pausePlayback();
  }, [isPlaying, pausePlayback]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (!visible) return;
        const id = (visible.target as HTMLElement).dataset.shortId;
        if (id) setActiveId(id);
      },
      { threshold: 0.7 },
    );

    Object.values(videoRefs.current).forEach((video) => {
      if (video) observer.observe(video);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([id, video]) => {
      if (!video) return;
      video.pause();
      if (id === activeId) {
        video.currentTime = 0;
        video.muted = muted;
        video.play().catch(() => undefined);
      }
    });
  }, [activeId, muted]);

  const toggleLike = (id: string) => {
    setLiked((current) => ({ ...current, [id]: !current[id] }));
  };

  const shareShort = async (item: ShortItem) => {
    if (navigator.share) {
      await navigator.share({ title: 'Sanctify Shorts', text: item.description });
    } else {
      await navigator.clipboard?.writeText(window.location.href);
    }
    setShared(item.id);
    window.setTimeout(() => setShared(null), 1600);
  };

  const openAudio = (item: ShortItem) => {
    const track = tracks.find((candidate) => candidate.id === item.audioTrackId);
    if (track) {
      playTrack(track);
      onClose();
    }
  };

  return (
    <section className="fixed inset-0 z-40 flex justify-center bg-black text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 pb-10 pt-5 sm:max-w-[420px] sm:mx-auto">
        <button
          onClick={onClose}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/60"
          aria-label="Volver a Sanctify"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold tracking-tight">Sanctify</p>
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Shorts de fe</p>
        </div>
        <button
          onClick={() => setMuted((value) => !value)}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/60"
          aria-label={muted ? 'Activar sonido' : 'Silenciar video'}
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>

      <div className="relative h-full w-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain sm:max-w-[420px] sm:border-x sm:border-white/10">
        {shorts.map((item) => (
          <article key={item.id} className="relative h-[100svh] w-full snap-start snap-always overflow-hidden">
            <video
              ref={(video) => {
                videoRefs.current[item.id] = video;
              }}
              data-short-id={item.id}
              src={item.videoUrl}
              muted={muted}
              autoPlay={item.id === shorts[0].id}
              loop
              playsInline
              className="h-full w-full object-cover"
              aria-label={`Short de ${item.author}`}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20" />

            <div className="absolute bottom-7 right-3 z-10 flex flex-col items-center gap-5 sm:right-6">
              <button onClick={() => toggleLike(item.id)} className="short-action" aria-label="Me gusta" aria-pressed={liked[item.id]}>
                <Heart className={`h-7 w-7 ${liked[item.id] ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{formatCount(item.likes + (liked[item.id] ? 1 : 0))}</span>
              </button>
              <button onClick={() => void shareShort(item)} className="short-action" aria-label="Compartir">
                {shared === item.id ? <Check className="h-6 w-6 text-emerald-400" /> : <Share2 className="h-6 w-6" />}
                <span>{shared === item.id ? 'Listo' : 'Compartir'}</span>
              </button>
              <button onClick={() => setSaved((current) => ({ ...current, [item.id]: !current[item.id] }))} className="short-action" aria-label="Guardar" aria-pressed={saved[item.id]}>
                <Bookmark className={`h-6 w-6 ${saved[item.id] ? 'fill-amber-400 text-amber-400' : ''}`} />
                <span>Guardar</span>
              </button>
              <button className="short-action" aria-label="Más opciones">
                <MoreHorizontal className="h-6 w-6" />
              </button>
            </div>

            <div className="absolute bottom-7 left-4 right-20 z-10 max-w-xl sm:left-8 sm:right-32">
              <div className="mb-3 flex items-center gap-2">
                <img src="/Sanctify_Icon_black.png" alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-white/30" />
                <p className="font-semibold text-white">{item.author}</p>
              </div>
              <p className="text-sm leading-6 text-white/90 sm:text-base">{item.description}</p>
              {item.audioTrackId && (
                <button onClick={() => openAudio(item)} className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-bold text-stone-900 transition-transform hover:scale-[1.02] active:scale-95">
                  <MessageCircle className="h-4 w-4" />
                  Ver podcast/audio completo
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
