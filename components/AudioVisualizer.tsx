import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  frequencyData: Uint8Array;
  isPlaying: boolean;
  barColor?: string;
  barCount?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  frequencyData,
  isPlaying,
  barColor = '#3CC8F5',
  barCount = 16,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Si no está reproduciendo o no hay datos, mostrar barras sutiles en reposo
    if (!isPlaying || frequencyData.length === 0) {
      const barWidth = width / barCount - 2;
      for (let i = 0; i < barCount; i++) {
        ctx.fillStyle = barColor;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(i * (barWidth + 2), height - 4, barWidth, 4);
      }
      return;
    }

    const barWidth = width / barCount - 3;
    ctx.globalAlpha = 1;

    for (let i = 0; i < barCount; i++) {
      // Mapear el valor de frecuencia actual a la altura del canvas
      const value = frequencyData[i] || 0;
      const percent = value / 255;
      const barHeight = Math.max(6, percent * height);

      const x = i * (barWidth + 3);
      const y = height - barHeight;

      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, barColor);
      gradient.addColorStop(1, '#93C5FD');

      ctx.fillStyle = gradient;

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
      } else {
        ctx.rect(x, y, barWidth, barHeight);
      }
      ctx.fill();
    }
  }, [frequencyData, isPlaying, barColor, barCount]);

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <canvas
        ref={canvasRef}
        width={300}
        height={90}
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default AudioVisualizer;