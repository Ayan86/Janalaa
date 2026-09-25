import React from 'react';

interface JaanalaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  variant?: 'full' | 'icon' | 'horizontal' | 'compact' | 'badge' | 'vertical';
  showTagline?: boolean;
  showBengali?: boolean;
  className?: string;
  theme?: 'crimson' | 'gold' | 'monochrome';
}

/**
 * Authentic JAANALA (জানালা) Bengali Heritage Cinema Logo
 * Featuring:
 * - Iconic Arched Window (খড়খড়ি খিলান জানালা) with central Play Button
 * - Radiant Fanlight Panes, Wooden Louvers, and Classic Typography
 * - Balanced, matching dual-script typography: "JANALAA" & Bengali "জানালা"
 */
export const JaanalaLogo: React.FC<JaanalaLogoProps> = ({
  size = 'md',
  variant = 'horizontal',
  showTagline = true,
  showBengali = true,
  className = '',
  theme = 'crimson',
}) => {
  // Enhanced, bolder dimensions so the arched window matches the typography harmoniously
  const iconSizes = {
    xs: { w: 26, h: 34 },
    sm: { w: 42, h: 54 },
    md: { w: 56, h: 72 },
    lg: { w: 78, h: 100 },
    xl: { w: 104, h: 134 },
    hero: { w: 140, h: 180 },
  };

  const { w, h } = iconSizes[size] || iconSizes.md;

  const primaryColor = theme === 'gold' ? '#D4AF37' : theme === 'monochrome' ? '#FFFFFF' : '#8B181E';
  const accentGold = '#D4AF37';

  // Crisp Vector SVG of the Arched Window with Sunburst / Fanlight + Play Button + Shutters
  const WindowIcon = (
    <svg
      width={w}
      height={h}
      viewBox="0 0 100 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-lg transition-transform duration-300 hover:scale-105"
    >
      <defs>
        <linearGradient id="jaanalaArchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B3242C" />
          <stop offset="50%" stopColor="#8B181E" />
          <stop offset="100%" stopColor="#540B0F" />
        </linearGradient>
        <linearGradient id="goldArchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F7DF94" />
          <stop offset="60%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#997A15" />
        </linearGradient>
        <linearGradient id="goldAccentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="50%" stopColor="#FFF1B8" />
          <stop offset="100%" stopColor="#C59B27" />
        </linearGradient>
        <filter id="archGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#8B181E" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Main Arch Frame Outer Border */}
      <path
        d="M 12 122 L 12 50 C 12 26 29 8 50 8 C 71 8 88 26 88 50 L 88 122 Z"
        fill={theme === 'gold' ? 'url(#goldArchGrad)' : 'url(#jaanalaArchGrad)'}
        filter="url(#archGlow)"
      />

      {/* Outer Golden Fine Bevel */}
      <path
        d="M 12 122 L 12 50 C 12 26 29 8 50 8 C 71 8 88 26 88 50 L 88 122 Z"
        fill="none"
        stroke="url(#goldAccentGrad)"
        strokeWidth="1.5"
      />

      {/* Inner Cutout (Dark heritage chamber void) */}
      <path
        d="M 19 116 L 19 50 C 19 32 33 16 50 16 C 67 16 81 32 81 50 L 81 116 Z"
        fill="#0D0A0C"
      />

      {/* Top Fanlight / Semi-circular Sunburst Arches */}
      <path
        d="M 50 20 C 35 20 23 32 23 48 L 77 48 C 77 32 65 20 50 20 Z"
        fill={theme === 'gold' ? 'url(#goldArchGrad)' : 'url(#jaanalaArchGrad)'}
      />
      {/* Sunburst radial divider blades */}
      <path d="M 50 48 L 50 22" stroke="#0D0A0C" strokeWidth="2.5" />
      <path d="M 50 48 L 30 30" stroke="#0D0A0C" strokeWidth="2.5" />
      <path d="M 50 48 L 70 30" stroke="#0D0A0C" strokeWidth="2.5" />
      <path d="M 50 48 L 24 42" stroke="#0D0A0C" strokeWidth="2" />
      <path d="M 50 48 L 76 42" stroke="#0D0A0C" strokeWidth="2" />

      {/* Small semi-circle cap at base of fanlight */}
      <path d="M 44 48 C 44 44.5 46.5 42 50 42 C 53.5 42 56 44.5 56 48 Z" fill="#0D0A0C" />

      {/* Center Arch Transom Bar with gold trim */}
      <rect
        x="16"
        y="48"
        width="68"
        height="4"
        fill={theme === 'gold' ? '#F6E09E' : '#A82027'}
      />
      <rect x="18" y="49" width="64" height="1" fill="#FFEDB3" opacity="0.8" />

      {/* Left Shutter Slat Louvers */}
      <rect x="22" y="56" width="22" height="3" rx="0.5" fill={primaryColor} />
      <rect x="22" y="62" width="22" height="3" rx="0.5" fill={primaryColor} />
      <rect x="22" y="68" width="22" height="3" rx="0.5" fill={primaryColor} />
      <rect x="22" y="74" width="22" height="3" rx="0.5" fill={primaryColor} />
      <rect x="22" y="80" width="22" height="3" rx="0.5" fill={primaryColor} />
      <rect x="22" y="86" width="22" height="3" rx="0.5" fill={primaryColor} />
      <rect x="22" y="92" width="22" height="3" rx="0.5" fill={primaryColor} />
      <rect x="22" y="98" width="22" height="3" rx="0.5" fill={primaryColor} />
      <rect x="22" y="104" width="22" height="3" rx="0.5" fill={primaryColor} />
      <rect x="22" y="110" width="22" height="3" rx="0.5" fill={primaryColor} />

      {/* Right Shutter Slat Louvers */}
      <rect x="56" y="56" width="22" height="3" rx="0.5" fill={primaryColor} />
      <rect x="56" y="62" width="22" height="3" rx="0.5" fill={primaryColor} />
      <rect x="56" y="68" width="22" height="3" rx="0.5" fill={primaryColor} />
      <rect x="56" y="74" width="22" height="3" rx="0.5" fill={primaryColor} />
      <rect x="56" y="80" width="22" height="3" rx="0.5" fill={primaryColor} />
      <rect x="56" y="86" width="22" height="3" rx="0.5" fill={primaryColor} />
      <rect x="56" y="92" width="22" height="3" rx="0.5" fill={primaryColor} />
      <rect x="56" y="98" width="22" height="3" rx="0.5" fill={primaryColor} />
      <rect x="56" y="104" width="22" height="3" rx="0.5" fill={primaryColor} />
      <rect x="56" y="110" width="22" height="3" rx="0.5" fill={primaryColor} />

      {/* Center Cinematic Play Triangle - Floating in Window Aperture */}
      <polygon
        points="44,66 65,78 44,90"
        fill="url(#goldAccentGrad)"
        stroke="#0D0A0C"
        strokeWidth="1.5"
      />

      {/* Bottom Base Sill */}
      <rect
        x="8"
        y="120"
        width="84"
        height="5"
        rx="1"
        fill={theme === 'gold' ? 'url(#goldArchGrad)' : 'url(#jaanalaArchGrad)'}
      />
      {/* Decorative Golden Baseline Trim */}
      <rect x="16" y="124" width="68" height="1.5" fill="url(#goldAccentGrad)" />
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center justify-center ${className}`}>{WindowIcon}</div>;
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        {WindowIcon}
        <div className="flex flex-col justify-center">
          <span className="font-sans text-lg sm:text-xl font-extrabold tracking-wider text-white leading-tight drop-shadow-ott">
            JANALAA
          </span>
          {showBengali && (
            <span className="font-bengali text-sm sm:text-base font-bold text-[#F8E088] leading-tight glow-gold">
              জানালা
            </span>
          )}
          {showTagline && (
            <span className="text-[9px] font-semibold tracking-widest text-[#FFEAA5] uppercase mt-0.5">
              BENGAL CINEMA &bull; OTT
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'vertical' || size === 'hero' || size === 'xl') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        {WindowIcon}
        <div className="mt-3.5 flex flex-col items-center">
          <h1 className="font-sans text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-[0.18em] text-white uppercase drop-shadow-ott leading-tight">
            JANALAA
          </h1>

          {showBengali && (
            <div className="flex items-center justify-center gap-3 sm:gap-4 my-1.5 sm:my-2">
              <div className="w-8 sm:w-16 h-[2px] bg-gradient-to-r from-transparent via-[#F8E088] to-[#F8E088]" />
              <span className="font-bengali text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-widest text-[#F8E088] drop-shadow-ott glow-gold">
                জানালা
              </span>
              <div className="w-8 sm:w-16 h-[2px] bg-gradient-to-l from-transparent via-[#F8E088] to-[#F8E088]" />
            </div>
          )}

          {showTagline && (
            <p className="mt-1 text-[11px] sm:text-xs font-semibold tracking-[0.25em] text-[#E2D7CD] uppercase drop-shadow-sm font-bengali">
              গল্পের এক নতুন জানালা &bull; STORIES FIND A HOME
            </p>
          )}
        </div>
      </div>
    );
  }

  // Default 'horizontal' variant - Bengali 'জানালা' positioned gracefully beneath English 'JANALAA'
  return (
    <div className={`inline-flex items-center gap-3 sm:gap-3.5 ${className}`}>
      {WindowIcon}
      <div className="flex flex-col justify-center">
        <span className="font-sans text-xl sm:text-2xl lg:text-3xl font-black tracking-[0.14em] text-white drop-shadow-ott leading-tight">
          JANALAA
        </span>
        {showBengali && (
          <span className="font-bengali text-sm sm:text-base lg:text-lg font-bold tracking-[0.06em] text-[#F8E088] leading-tight mt-0.5 glow-gold">
            জানালা
          </span>
        )}
        {showTagline && (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] sm:text-[10px] text-[#E2D7CD] tracking-[0.16em] font-medium uppercase">
              Cinema &bull; Series &bull; Heritage
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
