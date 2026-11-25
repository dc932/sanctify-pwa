import { useEffect, useRef, useState } from 'react';

export function useAudioAnalyser(audioElement: HTMLAudioElement | null, isPlaying: boolean) {
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(0));
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioElement) return;

    // Asegurar CORS para evitar bloqueos con URLs externas o Cloudflare R2
    audioElement.crossOrigin = 'anonymous';

    // Inicializar AudioContext y AnalyserNode una única vez de forma segura
    if (!audioCtxRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
        analyserRef.current = audioCtxRef.current.createAnalyser();
        
        analyserRef.current.fftSize = 64; 
        analyserRef.current.smoothingTimeConstant = 0.8;

        sourceRef.current = audioCtxRef.current.createMediaElementSource(audioElement);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioCtxRef.current.destination);
      } catch (err) {
        // Maneja de forma silenciosa si el elemento de audio ya poseía una fuente conectada
      }
    }
  }, [audioElement]);

  // Manejar el estado de reproducción y reanudación del contexto de audio
  useEffect(() => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;

    if (isPlaying && audioCtx?.state === 'suspended') {
      audioCtx.resume().catch((err) => {
        console.warn('No se pudo reanudar el AudioContext:', err);
      });
    }

    if (!analyserRef.current || !isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateAnalyser = () => {
      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
        // Crear una nueva instancia para forzar la reactividad en React
        setFrequencyData(new Uint8Array(dataArray));
        animationFrameRef.current = requestAnimationFrame(updateAnalyser);
      }
    };

    updateAnalyser();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying]);

  return frequencyData;
}