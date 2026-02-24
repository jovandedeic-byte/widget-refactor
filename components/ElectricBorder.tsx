import React, { useMemo, CSSProperties, ReactNode } from 'react';

function hexToRgba(hex: string, alpha: number = 1): string {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map(c => c + c)
      .join('');
  }
  const int = parseInt(h, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface ElectricBorderProps {
  children?: ReactNode;
  color?: string;
  /** Animation speed multiplier (lower = slower). Maps to SVG animation duration. */
  speed?: number;
  /** Kept for API compat but unused — displacement is fixed at 30 for the SVG filter. */
  chaos?: number;
  borderRadius?: number;
  className?: string;
  style?: CSSProperties;
}

const ElectricBorder: React.FC<ElectricBorderProps> = ({
  children,
  color = '#5227FF',
  speed = 1,
  chaos: _chaos,
  borderRadius = 24,
  className,
  style
}) => {
  // Unique filter IDs so multiple cards on the same page don't collide
  const filterId = useMemo(() => `eb-swirl-${Math.random().toString(36).slice(2, 8)}`, []);

  // Map speed prop to animation duration (inverse relationship: higher speed = shorter duration)
  const duration = Math.max(1, 6 / speed);

  return (
    <div
      className={`relative overflow-visible isolate ${className ?? ''}`}
      style={{ borderRadius, ...style } as CSSProperties}
    >
      {/* Hidden SVG holding the turbulence filter — zero layout cost */}
      <svg
        className="absolute w-0 h-0 overflow-hidden"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <filter
            id={filterId}
            colorInterpolationFilters="sRGB"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feTurbulence
              type="turbulence"
              baseFrequency="0.02"
              numOctaves="10"
              result="noise1"
              seed="1"
            />
            <feOffset in="noise1" dx="0" dy="0" result="offsetNoise1">
              <animate
                attributeName="dy"
                values="700; 0"
                dur={`${duration}s`}
                repeatCount="indefinite"
                calcMode="linear"
              />
            </feOffset>

            <feTurbulence
              type="turbulence"
              baseFrequency="0.02"
              numOctaves="10"
              result="noise2"
              seed="1"
            />
            <feOffset in="noise2" dx="0" dy="0" result="offsetNoise2">
              <animate
                attributeName="dy"
                values="0; -700"
                dur={`${duration}s`}
                repeatCount="indefinite"
                calcMode="linear"
              />
            </feOffset>

            <feTurbulence
              type="turbulence"
              baseFrequency="0.02"
              numOctaves="10"
              result="noise3"
              seed="2"
            />
            <feOffset in="noise3" dx="0" dy="0" result="offsetNoise3">
              <animate
                attributeName="dx"
                values="490; 0"
                dur={`${duration}s`}
                repeatCount="indefinite"
                calcMode="linear"
              />
            </feOffset>

            <feTurbulence
              type="turbulence"
              baseFrequency="0.02"
              numOctaves="10"
              result="noise4"
              seed="2"
            />
            <feOffset in="noise4" dx="0" dy="0" result="offsetNoise4">
              <animate
                attributeName="dx"
                values="0; -490"
                dur={`${duration}s`}
                repeatCount="indefinite"
                calcMode="linear"
              />
            </feOffset>

            <feComposite in="offsetNoise1" in2="offsetNoise2" result="part1" />
            <feComposite in="offsetNoise3" in2="offsetNoise4" result="part2" />
            <feBlend in="part1" in2="part2" mode="color-dodge" result="combinedNoise" />

            <feDisplacementMap
              in="SourceGraphic"
              in2="combinedNoise"
              scale="30"
              xChannelSelector="R"
              yChannelSelector="B"
            />
          </filter>
        </defs>
      </svg>

      {/* Glow layers (same as before — pure CSS, no JS) */}
      <div className="absolute inset-0 rounded-[inherit] pointer-events-none z-0">
        {/* Inner border with SVG turbulence filter applied — GPU composited */}
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none"
          style={{
            border: `2px solid ${color}`,
            filter: `url(#${filterId})`,
          }}
        />
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none"
          style={{ border: `2px solid ${hexToRgba(color, 0.6)}`, filter: 'blur(1px)' }}
        />
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none"
          style={{ border: `2px solid ${color}`, filter: 'blur(4px)' }}
        />
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none -z-[1] scale-110 opacity-30"
          style={{
            filter: 'blur(32px)',
            background: `linear-gradient(-30deg, ${color}, transparent, ${color})`
          }}
        />
      </div>
      <div className="relative rounded-[inherit] z-[1]">{children}</div>
    </div>
  );
};

export default ElectricBorder;
