import React from 'react';
import { Film, Clapperboard, FileText, Heart, Sparkles, UploadCloud, Play, Plus, Compass } from 'lucide-react';
import { JaanalaLogo } from './JaanalaLogo.tsx';
import { JanalaaWallpaper } from './JanalaaWallpaper.tsx';

interface JaanalaHeroBannerProps {
  onOpenUploader?: () => void;
  onFilterCategory?: (category: string) => void;
  activeCategory?: string;
}

export const JaanalaHeroBanner: React.FC<JaanalaHeroBannerProps> = ({
  onOpenUploader,
  onFilterCategory,
  activeCategory = 'ALL',
}) => {
  return (
    <JanalaaWallpaper
      variant="hero"
      overlayOpacity={0}
      className="relative rounded-2xl overflow-hidden border border-[#521319]/50 shadow-2xl mb-8"
    >
      {/* Warm Ambient Heritage Lighting & Vignette */}
      <div className="absolute -top-24 left-1/4 w-96 h-96 bg-[#8B181E]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-[#D4AF37]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative Vintage Film Strip & Arch borders */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-90" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#8B181E] to-transparent opacity-90" />

      <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-10 flex flex-col items-center text-center">
        
        {/* Top Header Tagline */}
        <div className="flex flex-col items-center gap-1 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1A0E12]/40 border border-[#8B181E]/80 text-[11px] sm:text-xs font-serif font-bold tracking-[0.2em] text-[#F3D995] uppercase backdrop-blur-md shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            THE HERITAGE ICON
            <span className="w-1 h-1 rounded-full bg-[#D4AF37]" />
            ROOTED IN BENGAL. MADE FOR TOMORROW.
          </div>
        </div>

        {/* Center Grid: Left Bengali Callout, Center Logo, Right Bengali Callout */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 items-center gap-6 my-2">
          
          {/* Left Wing - Classic Literature & Cinema */}
          <div className="hidden md:flex flex-col items-end text-right pr-6 border-r border-[#8B181E]/40 space-y-3">
            <div className="space-y-1">
              <span className="text-xl lg:text-2xl font-bengali font-bold text-white leading-snug block drop-shadow-ott">
                গল্পের এক নতুন
              </span>
              <span className="text-2xl lg:text-3xl font-bengali font-extrabold text-[#F8E088] tracking-wider block glow-gold">
                জানালা
              </span>
            </div>
            <div className="flex flex-col gap-1 text-[11px] font-sans tracking-[0.2em] text-[#E2D7CD] uppercase">
              <span>WATCH &bull; EXPLORE &bull; BELONG</span>
              <span className="text-[#F8E088] text-xs font-bengali">&diams; সাহিত্য &bull; সিনেমা &bull; জীবন &diams;</span>
            </div>
          </div>

          {/* Center Showcase - Iconic Arched Window Brand Logo */}
          <div className="flex flex-col items-center justify-center py-2">
            <JaanalaLogo size="xl" variant="vertical" showTagline={true} showBengali={true} />
            
            {onOpenUploader && (
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onOpenUploader}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B181E] via-[#A82027] to-[#7B1113] hover:from-[#9E1B22] hover:to-[#8B181E] text-white font-sans font-bold text-xs tracking-wider flex items-center gap-2 shadow-lg shadow-[#8B181E]/40 border border-[#F8E088]/50 hover:border-[#F8E088] transition-all cursor-pointer group"
                >
                  <UploadCloud className="w-4 h-4 text-[#F8E088] group-hover:scale-110 transition-transform" />
                  <span>UPLOAD MASTER VIDEO</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Wing - Timeless Storytelling */}
          <div className="hidden md:flex flex-col items-start text-left pl-6 border-l border-[#8B181E]/30 space-y-3">
            <div className="space-y-1">
              <span className="text-xl lg:text-2xl font-bengali font-bold text-white leading-snug block drop-shadow-ott">
                পুরনো দিনের গল্প
              </span>
              <span className="text-2xl lg:text-3xl font-bengali font-extrabold text-[#F8E088] tracking-wider block glow-gold">
                নতুন প্রজন্মের জন্য...
              </span>
            </div>
            <div className="flex flex-col gap-1 text-[11px] font-sans tracking-[0.2em] text-[#E2D7CD] uppercase">
              <span>CINEMA &bull; SERIES &bull; DOCUMENTARIES</span>
              <span className="text-[#F8E088] text-xs font-bengali">&diams; রবীন্দ্র &bull; মানিক &bull; সত্যজিৎ &diams;</span>
            </div>
          </div>
        </div>

        {/* 4 Bottom Category Pillars (from Theme Banner) */}
        <div className="w-full max-w-4xl mt-8 pt-6 border-t border-[#8B181E]/30 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => onFilterCategory?.('MOVIE')}
            className={`px-4 py-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group ${
              activeCategory === 'MOVIE'
                ? 'bg-[#8B181E]/40 border-[#D4AF37] text-white shadow-md'
                : 'bg-[#150D10]/30 border-[#4A161C]/50 text-[#D8C7B5] hover:bg-[#201015]/50 hover:border-[#8B181E] backdrop-blur-sm'
            }`}
          >
            <Film className="w-4 h-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
            <span className="font-serif text-xs font-bold tracking-[0.15em] uppercase">MOVIES</span>
            <span className="text-[10px] text-[#A89886] font-serif">চলচ্চিত্র ও ক্ল্যাসিক</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterCategory?.('SERIES')}
            className={`px-4 py-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group ${
              activeCategory === 'SERIES'
                ? 'bg-[#8B181E]/40 border-[#D4AF37] text-white shadow-md'
                : 'bg-[#150D10]/30 border-[#4A161C]/50 text-[#D8C7B5] hover:bg-[#201015]/50 hover:border-[#8B181E] backdrop-blur-sm'
            }`}
          >
            <Clapperboard className="w-4 h-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
            <span className="font-serif text-xs font-bold tracking-[0.15em] uppercase">WEB SERIES</span>
            <span className="text-[10px] text-[#A89886] font-serif">ওয়েব সিরিজ ও পর্ব</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterCategory?.('DOCUMENTARY')}
            className={`px-4 py-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group ${
              activeCategory === 'DOCUMENTARY'
                ? 'bg-[#8B181E]/40 border-[#D4AF37] text-white shadow-md'
                : 'bg-[#150D10]/30 border-[#4A161C]/50 text-[#D8C7B5] hover:bg-[#201015]/50 hover:border-[#8B181E] backdrop-blur-sm'
            }`}
          >
            <FileText className="w-4 h-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
            <span className="font-serif text-xs font-bold tracking-[0.15em] uppercase">DOCUMENTARIES</span>
            <span className="text-[10px] text-[#A89886] font-serif">তথ্যচিত্র ও আর্কাইভ</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterCategory?.('BENGAL_BEYOND')}
            className={`px-4 py-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group ${
              activeCategory === 'BENGAL_BEYOND'
                ? 'bg-[#8B181E]/40 border-[#D4AF37] text-white shadow-md'
                : 'bg-[#150D10]/30 border-[#4A161C]/50 text-[#D8C7B5] hover:bg-[#201015]/50 hover:border-[#8B181E] backdrop-blur-sm'
            }`}
          >
            <Heart className="w-4 h-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
            <span className="font-serif text-xs font-bold tracking-[0.15em] uppercase">BENGAL & BEYOND</span>
            <span className="text-[10px] text-[#A89886] font-serif">সংস্কৃতি ও সাহিত্য</span>
          </button>
        </div>

      </div>
    </JanalaaWallpaper>
  );
};
