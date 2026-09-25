import React, { useState } from 'react';
import janalaaThemeImg from '../../assets/Janalaa_Theme.png';

interface JanalaaWallpaperProps {
  variant?: 'cover' | 'subtle' | 'login' | 'hero' | 'banner' | 'global';
  overlayOpacity?: number; // 0 to 100
  className?: string;
  children?: React.ReactNode;
  fixed?: boolean;
}

/**
 * Authentic JAANALA (জানালা) Kolkata Cinema Heritage Wallpaper Component
 * Features:
 * - Vintage 35mm projector with golden projection beam & Satyajit Ray tribute montage
 * - Howrah Bridge cantilever silhouette & setting sun on Hooghly river
 * - Victoria Memorial in golden twilight mist
 * - Victorian gas lamp, promenade wall, and heritage park bench
 */
export const JanalaaWallpaper: React.FC<JanalaaWallpaperProps> = ({
  variant = 'cover',
  overlayOpacity,
  className = '',
  children,
  fixed = false,
}) => {
  const [sourceIndex, setSourceIndex] = useState(0);
  const sources = [
    janalaaThemeImg,
    '/Janalaa_Theme.png',
    '/assets/Janalaa_Theme.png',
  ];

  const handleImgError = () => {
    if (sourceIndex < sources.length - 1) {
      setSourceIndex((prev) => prev + 1);
    }
  };

  // Zero/minimal darkening values so the user's heritage image is prominent and vivid
  const defaultOpacity = 0;

  const actualOpacity = overlayOpacity !== undefined ? overlayOpacity : defaultOpacity;
  const currentSrc = sources[sourceIndex];

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundImage: `url("${currentSrc}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Background Graphic Layer */}
      <div
        className={`${
          fixed ? 'fixed' : 'absolute'
        } inset-0 pointer-events-none select-none z-0 overflow-hidden`}
      >
        <img
          src={currentSrc}
          alt="Jaanala Heritage Cinema Wallpaper"
          onError={handleImgError}
          className="w-full h-full object-cover object-center transition-all duration-700 opacity-100"
        />

        {/* Soft Golden Ambient Highlights */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B080A]/30 via-transparent to-transparent pointer-events-none" />

        {/* Minimal Light Scrim */}
        {actualOpacity > 0 && (
          <div
            className="absolute inset-0 bg-[#0B080A] transition-opacity duration-300 pointer-events-none"
            style={{ opacity: actualOpacity / 100 }}
          />
        )}
      </div>

      {/* Children content rendered safely above wallpaper */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
};

