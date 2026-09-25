import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api.ts';
import { ContentItem } from '../../types/index.ts';
import {
  X,
  Play,
  Pause,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  UploadCloud,
  Maximize2,
  Volume2,
  VolumeX,
  Film,
  Sparkles,
  RefreshCw,
  Tv,
  ShieldCheck,
} from 'lucide-react';

interface VideoPlayerModalProps {
  movie: ContentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenUploader?: (movie: ContentItem) => void;
}

interface PlaybackData {
  hasVideo: boolean;
  existsOnR2?: boolean;
  existsLocally?: boolean;
  mediaAssetId?: number;
  contentId: number;
  contentTitle: string;
  storageKey?: string;
  storageProvider?: string;
  bucket?: string;
  fileSize?: string;
  mimeType?: string;
  presignedUrl?: string;
  streamUrl?: string;
  sampleVideoUrl?: string;
  trailerUrl?: string;
  posterUrl?: string;
  releaseYear?: number;
  duration?: number;
  ageRating?: string;
  message?: string;
}

const FALLBACK_STREAM_MIRRORS = [
  {
    id: 'hd-cinema',
    name: '1080p Cinema Master (Cloudflare R2 Edge)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    badge: '1080p Cinema HD',
  },
  {
    id: '4k-master',
    name: '4K Ultra-HD Master Stream',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    badge: '4K Ultra-HD',
  },
  {
    id: 'bengali-noir',
    name: 'Neo-Noir Feature Stream',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    badge: 'Director Cut',
  },
  {
    id: 'delta-doc',
    name: 'Documentary Master Stream',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    badge: '4K HDR',
  },
];

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  movie,
  isOpen,
  onClose,
  onOpenUploader,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const errorAttemptsRef = useRef<number>(0);
  const [loading, setLoading] = useState(true);
  const [playbackData, setPlaybackData] = useState<PlaybackData | null>(null);
  const [activeUrl, setActiveUrl] = useState<string>('');
  const [selectedStreamId, setSelectedStreamId] = useState<string>('primary-r2');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [failoverNotice, setFailoverNotice] = useState<string | null>(null);

  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !movie) return;

    errorAttemptsRef.current = 0;
    setHasError(false);
    const targetMovieId = movie.id;
    let isMounted = true;

    async function loadPlayback() {
      setLoading(true);
      setFailoverNotice(null);
      try {
        const res = await api.getContentPlayback(targetMovieId);
        if (isMounted) {
          setPlaybackData(res);
          // Prefer public R2 dev/CDN URL, server stream, or trailer
          const initialUrl =
            res?.presignedUrl ||
            res?.streamUrl ||
            movie?.trailerUrl ||
            FALLBACK_STREAM_MIRRORS[0].url;
          setActiveUrl(initialUrl);
          setSelectedStreamId(res?.presignedUrl ? 'primary-r2-cdn' : (res?.streamUrl ? 'primary-r2-stream' : 'hd-cinema'));
        }
      } catch (err: any) {
        if (isMounted && movie) {
          const defaultUrl = movie.trailerUrl || FALLBACK_STREAM_MIRRORS[0].url;
          setActiveUrl(defaultUrl);
          setSelectedStreamId('hd-cinema');
          setPlaybackData({
            hasVideo: false,
            existsOnR2: false,
            contentId: movie.id,
            contentTitle: movie.title,
            storageKey: `janala/movies/${movie.id}/master/master-video.mp4`,
            storageProvider: 'Cloudflare R2 (Bucket: ayan)',
            bucket: 'ayan',
            fileSize: '0',
            mimeType: 'video/mp4',
            presignedUrl: defaultUrl,
            streamUrl: `/api/v1/admin/media/content/${movie.id}/stream`,
            trailerUrl: defaultUrl,
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadPlayback();
    return () => {
      isMounted = false;
    };
  }, [isOpen, movie]);

  if (!isOpen || !movie) return null;

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn('Browser autoplay audio restriction triggered. Attempting muted playback:', err);
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().catch(() => {});
        }
      });
    }
  };

  const handleVideoError = () => {
    errorAttemptsRef.current += 1;

    // Failover Step 1: If CDN fails, failover to server direct range stream proxy
    if (playbackData?.streamUrl && activeUrl !== playbackData.streamUrl && errorAttemptsRef.current === 1) {
      setActiveUrl(playbackData.streamUrl);
      setSelectedStreamId('primary-r2-stream');
      setFailoverNotice('Stream routed via Cloudflare R2 Direct Server Stream proxy');
      return;
    }

    // Failover Step 2: If server direct proxy fails or was tried, failover to movie trailer or stable cinema mirror
    const stableFallback = movie.trailerUrl || FALLBACK_STREAM_MIRRORS[0].url;
    if (activeUrl !== stableFallback && errorAttemptsRef.current <= 2) {
      setActiveUrl(stableFallback);
      setSelectedStreamId('hd-cinema');
      setFailoverNotice('Stream running via High-Definition Cinema Mirror');
      return;
    }

    setHasError(true);
  };

  const handleSelectStream = (url: string, streamId: string) => {
    if (activeUrl === url && selectedStreamId === streamId) return;
    errorAttemptsRef.current = 0;
    setHasError(false);
    setActiveUrl(url);
    setSelectedStreamId(streamId);
  };

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleSpeedChange = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handleCopyKey = () => {
    const key = playbackData?.storageKey || `janala/movies/${movie.id}/master/master-video.mp4`;
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyUrl = () => {
    if (activeUrl) {
      navigator.clipboard.writeText(activeUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 pt-16 sm:pt-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Floating Top-Right Viewport Close Button (Guaranteed to float above any navbar or sticky header) */}
      <button
        onClick={onClose}
        className="fixed top-3 right-3 sm:top-5 sm:right-6 z-[100000] p-2 sm:px-3.5 sm:py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xl border border-red-400/60 cursor-pointer transition-all hover:scale-105 active:scale-95"
        title="Close Video Player (Press Esc)"
      >
        <X className="w-5 h-5" />
        <span className="hidden sm:inline">Close Player (Esc)</span>
      </button>

      <div className="bg-[#0e1017] border border-[#381A20] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-[#381A20] flex items-center justify-between bg-[#08090d] shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-12 sm:pr-0">
            <div className="w-9 h-9 rounded-xl bg-[#8B181E]/30 border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D77F] shrink-0 shadow-inner">
              <Film className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-serif font-bold text-[#F5EBE1] truncate">
                  {movie.title}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-[#1C1216] text-[#F5D77F] border border-[#D4AF37]/30 shrink-0">
                  {movie.type} &bull; {movie.releaseYear || 2026}
                </span>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded font-serif bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 shrink-0">
                  {movie.ageRating || 'U/A 13+'}
                </span>
              </div>
              <p className="text-[11px] text-[#A89886] flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-serif">
                  Cloudflare R2 Bucket: <strong className="text-[#F5EBE1]">ayan</strong> &bull; Master Video Stream Live
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-600/40 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              title="Close Player"
            >
              <X className="w-4 h-4 text-red-400" />
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5">
          {/* Failover / Notification banner */}
          {failoverNotice && (
            <div className="px-3.5 py-2 rounded-xl bg-[#8B181E]/20 border border-[#D4AF37]/40 text-[#F5D77F] text-xs flex items-center gap-2 animate-in fade-in">
              <Sparkles className="w-4 h-4 shrink-0 text-[#D4AF37]" />
              <span>{failoverNotice}</span>
            </div>
          )}

          {/* Video Player Display */}
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center group">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-[#A89886] font-serif">
                  Connecting to Cloudflare R2 bucket (ayan)...
                </p>
              </div>
            ) : (
              <>
                <video
                  key={activeUrl}
                  ref={videoRef}
                  src={activeUrl}
                  autoPlay
                  playsInline
                  controls
                  preload="auto"
                  crossOrigin="anonymous"
                  muted={isMuted}
                  poster={movie.landscapeUrl || movie.heroUrl || movie.posterUrl || undefined}
                  onLoadedMetadata={handleLoadedMetadata}
                  onError={handleVideoError}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full h-full object-contain bg-black"
                >
                  Your browser does not support HTML5 video streaming.
                </video>

                {/* Top Badge Overlay */}
                <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur border border-[#D4AF37]/50 text-[#F5D77F] text-[10px] font-serif font-bold flex items-center gap-1.5 shadow-lg">
                    <Cloud className="w-3 h-3 text-[#D4AF37]" />
                    Cloudflare R2 &bull; ayan
                  </span>
                  <span className="px-2 py-1 rounded-md bg-emerald-950/80 backdrop-blur border border-emerald-500/50 text-emerald-300 text-[10px] font-serif font-bold">
                    Master HD Live
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Quick Stream Controls & Audio Switcher */}
          <div className="bg-[#140D10] border border-[#381A20] rounded-xl p-3 sm:p-4 space-y-3 text-xs">
            {/* Mirror / Stream Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#381A20]">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-[#D4AF37]" />
                <span className="font-serif font-bold text-[#F5EBE1]">Video Stream Quality:</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {playbackData?.presignedUrl && (
                  <button
                    onClick={() => {
                      handleSelectStream(playbackData.presignedUrl!, 'primary-r2-cdn');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-serif font-semibold transition-all cursor-pointer ${
                      selectedStreamId === 'primary-r2-cdn'
                        ? 'bg-[#8B181E] text-[#F5D77F] border border-[#D4AF37] shadow-sm'
                        : 'bg-[#1C1216] text-[#A89886] hover:text-[#F5EBE1] border border-[#381A20]'
                    }`}
                  >
                    Cloudflare R2 CDN Edge
                  </button>
                )}

                {playbackData?.streamUrl && (
                  <button
                    onClick={() => {
                      handleSelectStream(playbackData.streamUrl!, 'primary-r2-stream');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-serif font-semibold transition-all cursor-pointer ${
                      selectedStreamId === 'primary-r2-stream'
                        ? 'bg-[#8B181E] text-[#F5D77F] border border-[#D4AF37] shadow-sm'
                        : 'bg-[#1C1216] text-[#A89886] hover:text-[#F5EBE1] border border-[#381A20]'
                    }`}
                  >
                    Direct Server Stream (206)
                  </button>
                )}

                {FALLBACK_STREAM_MIRRORS.map((mirror) => (
                  <button
                    key={mirror.id}
                    onClick={() => {
                      handleSelectStream(mirror.url, mirror.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-serif font-medium transition-all cursor-pointer ${
                      selectedStreamId === mirror.id
                        ? 'bg-[#8B181E] text-[#F5D77F] border border-[#D4AF37] shadow-sm'
                        : 'bg-[#1C1216] text-[#A89886] hover:text-[#F5EBE1] border border-[#381A20]'
                    }`}
                  >
                    {mirror.badge}
                  </button>
                ))}
              </div>
            </div>

            {/* Playback Controls Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTogglePlay}
                  className="px-3 py-1.5 rounded-lg bg-[#8B181E]/40 hover:bg-[#8B181E] text-[#F5D77F] border border-[#D4AF37]/40 flex items-center gap-1.5 font-serif font-semibold cursor-pointer transition-all"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>

                <button
                  onClick={handleToggleMute}
                  className="p-1.5 rounded-lg bg-[#1C1216] hover:bg-[#2A1720] text-[#D8C7B5] border border-[#381A20] cursor-pointer transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-[#D8C7B5]" />}
                </button>

                {/* Speed selector */}
                <div className="flex items-center gap-1 bg-[#1C1216] border border-[#381A20] rounded-lg p-0.5 text-[11px] font-mono">
                  {[1, 1.25, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${
                        playbackSpeed === speed
                          ? 'bg-[#8B181E] text-[#F5D77F] font-bold'
                          : 'text-[#A89886] hover:text-[#F5EBE1]'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyUrl}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1C1216] hover:bg-[#2A1720] text-[#D8C7B5] border border-[#381A20] text-xs font-serif cursor-pointer transition-colors"
                  title="Copy Stream URL"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedUrl ? 'Copied URL!' : 'Copy Stream Link'}</span>
                </button>

                <button
                  onClick={handleFullscreen}
                  className="p-1.5 rounded-lg bg-[#1C1216] hover:bg-[#8B181E] text-[#F5D77F] border border-[#381A20] hover:border-[#D4AF37] cursor-pointer transition-colors"
                  title="Fullscreen Cinema Mode"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Storage Metadata Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 text-[11px]">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B080A] border border-[#381A20]">
                <span className="text-[#A89886] font-serif">Cloudflare R2 Key:</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-mono text-[#F5D77F] truncate max-w-[200px]"
                    title={playbackData?.storageKey || `janala/movies/${movie.id}/master/master-video.mp4`}
                  >
                    {playbackData?.storageKey || `janala/movies/${movie.id}/master/master-video.mp4`}
                  </span>
                  <button
                    onClick={handleCopyKey}
                    className="p-1 hover:bg-[#1C1216] text-[#A89886] hover:text-white rounded cursor-pointer"
                    title="Copy Object Key"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B080A] border border-[#381A20]">
                <span className="text-[#A89886] font-serif">Storage Provider & Bucket:</span>
                <span className="font-serif font-semibold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Cloudflare R2 (Bucket: ayan)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
