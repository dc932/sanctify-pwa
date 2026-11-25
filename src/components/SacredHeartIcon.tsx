import React from 'react';

interface SacredHeartIconProps {
  className?: string;
  filled?: boolean;
}

export function SacredHeartIcon({ className = "h-7 w-7", filled = false }: SacredHeartIconProps) {
  return (
    <svg
      viewBox="0 0 114 114"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Círculo contenedor exterior escalado un 150% */}
      <circle
        cx="57"
        cy="57"
        r="54"
        className={
          filled
            ? "fill-red-500/15 stroke-red-500/30"
            : "fill-zinc-800/40 stroke-zinc-700/50"
        }
        strokeWidth="3"
      />

      {/* Círculo contenedor interior escalado un 150% */}
      <circle
        cx="57"
        cy="57"
        r="47"
        className={filled ? "fill-red-500/10" : "fill-zinc-900/60"}
      />

      {/* Grupo base centrado y escalado con el factor acumulado de 150% (1.15 * 2.5 = 2.875) */}
      <g transform="translate(57, 57) scale(2.875) translate(-18, -18)">
        
        {/* 1. Flama y Cruz */}
        <g transform="translate(3, -3) scale(0.85)">
          <path
            d="M18 3.5C18 3.5 12 7.5 12 12.5C12 16.2 14.5 18.5 18 18.5C21.5 18.5 24 16.2 24 12.5C24 7.5 18 3.5 18 3.5Z"
            className={filled ? "fill-[#F59E0B] stroke-[#F59E0B]" : "stroke-current"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 6.5C18 6.5 14.5 9.5 14.5 12.5C14.5 14.5 16 16.5 18 16.5C20 16.5 21.5 14.5 21.5 12.5C21.5 9.5 18 6.5 18 6.5Z"
            className={filled ? "fill-[#FCD34D]" : "none"}
          />
          <path
            d="M18 5V15M14 8H22"
            className={filled ? "stroke-amber-950" : "stroke-current"}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* 2. Cuerpo del Corazón */}
        <g transform="translate(1, 4)">
          <path
            d="M25.5 20C27.2 18.2 29 16.2 29 13.5C29 9.8 26.2 7 22.5 7C20.3 7 18.3 8 16.8 9.8C15.3 8 13.3 7 11.1 7C7.4 7 4.6 9.8 4.6 13.5C4.6 16.2 6.4 18.2 8.1 20L16.8 28.5L25.5 20Z"
            className={
              filled
                ? "fill-[#EF4444] stroke-[#DC2626] drop-shadow-[0_0_10px_rgba(239,68,68,0.7)]"
                : "stroke-current"
            }
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* 3. Corona de espinas */}
        <g transform="translate(0, 4)">
          <path
            d="M6.5 16.5C10 18.2 26 18.2 29.5 16.5"
            className={filled ? "stroke-[#78350F]" : "stroke-current"}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M10 16.2L9.2 18.2M14 17L13.5 19M22 17L22.5 19M26 16.2L26.8 18.2"
            className={filled ? "stroke-[#78350F]" : "stroke-current"}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

      </g>
    </svg>
  );
}