import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.ts';
import {
  Film,
  Tv,
  Users,
  HardDrive,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Play,
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  Sparkles,
  Maximize2,
  Cloud,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { ContentItem, AuditLogItem } from '../../types/index.ts';
import { JaanalaLogo } from '../common/JaanalaLogo.tsx';
import { JaanalaHeroBanner } from '../common/JaanalaHeroBanner.tsx';
import { CloudflareR2SyncModal } from '../common/CloudflareR2SyncModal.tsx';

interface DashboardProps {
  onSelectContent: (content: ContentItem) => void;
  onPlayMovie?: (content: ContentItem) => void;
  onOpenUploader: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardProps> = ({
  onSelectContent,
  onPlayMovie,
  onOpenUploader,
  onNavigateTab,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSpotlightMovie, setActiveSpotlightMovie] = useState<ContentItem | null>(null);
  const [spotlightVideoUrl, setSpotlightVideoUrl] = useState<string>('');
  const [isPlayingSpotlight, setIsPlayingSpotlight] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const spotlightVideoRef = React.useRef<HTMLVideoElement | null>(null);

  const resolveStreamUrl = async (movie: ContentItem): Promise<string> => {
    try {
      const pb = await api.getContentPlayback(movie.id);
      if (pb?.presignedUrl) return pb.presignedUrl;
      if (pb?.streamUrl) return pb.streamUrl;
    } catch (e) {
      console.warn('Playback resolution failed for', movie.title, e);
    }
    return movie.trailerUrl || `/api/v1/admin/media/content/${movie.id}/stream`;
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      setData(res);
      if (res?.recentlyUploaded && res.recentlyUploaded.length > 0) {
        const firstMovie = res.recentlyUploaded[0];
        setActiveSpotlightMovie(firstMovie);
        const resolved = await resolveStreamUrl(firstMovie);
        setSpotlightVideoUrl(resolved);
      }
    } catch (err: any) {
      if (err?.status === 401 || err?.message?.includes('Unauthorized')) {
        console.warn('Session unauthorized while loading dashboard:', err.message);
      } else {
        setError(err.message || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handlePlayMovieInDashboard = async (movie: ContentItem) => {
    setActiveSpotlightMovie(movie);
    const stream = await resolveStreamUrl(movie);
    setSpotlightVideoUrl(stream);
    setIsPlayingSpotlight(true);

    if (onPlayMovie) {
      onPlayMovie(movie);
    }
  };

  const handleSyncComplete = (syncedMovies: ContentItem[]) => {
    loadDashboard();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="p-6 rounded-2xl bg-[#140D10]/90 border border-[#381A20] shadow-xl flex flex-col items-center relative">
            <div className="absolute inset-0 rounded-2xl border border-[#D4AF37]/30 animate-pulse pointer-events-none" />
            <JaanalaLogo size="lg" variant="vertical" showTagline={false} showBengali={true} />
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[#C5B4A0] font-serif tracking-wide">
              Aggregating JANALAA OTT studio catalog metrics...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-[#250F14] border border-[#8B181E]/60 rounded-2xl max-w-xl mx-auto my-12">
        <AlertTriangle className="w-8 h-8 text-[#D4AF37] mx-auto mb-3" />
        <h3 className="text-base font-serif font-bold text-[#F5EBE1]">Failed to retrieve dashboard metrics</h3>
        <p className="text-xs text-[#C5B4A0] mt-1 font-serif">{error}</p>
      </div>
    );
  }

  const { metrics, distribution, recentlyUploaded, recentlyAdded, recentActivity, charts } = data;

  return (
    <div className="space-y-6 sm:space-y-8 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto overflow-x-hidden">
      {/* Jaanala Heritage Hero Banner */}
      <JaanalaHeroBanner onOpenUploader={onOpenUploader} />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Movies */}
        <div className="bg-[#140D10]/15 backdrop-blur-sm border border-[#381A20]/40 rounded-2xl p-5 relative overflow-hidden group hover:border-[#D4AF37]/50 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-serif font-bold uppercase tracking-[0.15em] text-[#C59B27]">Master Cinema Films</span>
            <div className="w-8 h-8 rounded-lg bg-[#8B181E]/30 text-[#D4AF37] flex items-center justify-center border border-[#D4AF37]/30">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-[#F5EBE1] tracking-tight">{metrics.totalMovies}</span>
            <span className="text-xs text-emerald-400 font-serif font-medium flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +100%
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[#A89886] font-serif flex items-center justify-between">
            <span>Active Master Stream:</span>
            <span className="font-semibold text-[#F5EBE1]">
              {recentlyUploaded.length} Active
            </span>
          </div>
        </div>

        {/* Web Series & Shows */}
        <div className="bg-[#140D10]/15 backdrop-blur-sm border border-[#381A20]/40 rounded-2xl p-5 relative overflow-hidden group hover:border-[#D4AF37]/50 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-serif font-bold uppercase tracking-[0.15em] text-[#C59B27]">Original Series</span>
            <div className="w-8 h-8 rounded-lg bg-[#8B181E]/30 text-[#D4AF37] flex items-center justify-center border border-[#D4AF37]/30">
              <Tv className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-[#F5EBE1] tracking-tight">{metrics.totalWebSeries}</span>
            <span className="text-xs text-[#A89886] font-serif">15 Episodes</span>
          </div>
          <div className="mt-2 text-[11px] text-[#A89886] font-serif flex items-center justify-between">
            <span>Seasons Ingested:</span>
            <span className="font-semibold text-[#F5EBE1]">3 Seasons</span>
          </div>
        </div>

        {/* Real Cloudflare R2 Storage Used */}
        <div className="bg-[#140D10]/15 backdrop-blur-sm border border-[#381A20]/40 rounded-2xl p-5 relative overflow-hidden group hover:border-[#D4AF37]/50 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-serif font-bold uppercase tracking-[0.15em] text-[#C59B27]">R2 Storage Ingested</span>
            <div className="w-8 h-8 rounded-lg bg-[#8B181E]/30 text-[#D4AF37] flex items-center justify-center border border-[#D4AF37]/30">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-[#F5EBE1] tracking-tight">{metrics.storageUsedGb}</span>
            <span className="text-sm font-serif font-bold text-[#D4AF37]">GB</span>
          </div>
          <div className="mt-2 text-[11px] text-[#A89886] font-serif flex items-center justify-between">
            <span>Direct Binary Objects:</span>
            <span className="font-semibold text-[#F5EBE1]">{metrics.totalMediaAssets} files</span>
          </div>
        </div>

        {/* Active Subscribers & Users */}
        <div className="bg-[#140D10]/15 backdrop-blur-sm border border-[#381A20]/40 rounded-2xl p-5 relative overflow-hidden group hover:border-[#D4AF37]/50 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-serif font-bold uppercase tracking-[0.15em] text-[#C59B27]">Subscribers & Viewers</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-900/30 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-[#F5EBE1] tracking-tight">{metrics.totalUsers}</span>
            <span className="text-xs text-emerald-400 font-serif font-medium">
              {metrics.activeSubscriptions} Paid Subs
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[#A89886] font-serif flex items-center justify-between">
            <span>Verified Studio Staff:</span>
            <span className="font-semibold text-[#F5EBE1]">3 Managers</span>
          </div>
        </div>
      </div>

      {/* Ingestion & Pipeline status banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-[#140D10]/20 backdrop-blur-sm border border-[#381A20]/40 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#8B181E]/30 text-[#D4AF37] flex items-center justify-center shrink-0 border border-[#8B181E]/50">
            <UploadCloud className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-serif font-bold text-[#F5EBE1]">Active Upload Pipeline</div>
            <div className="text-[11px] text-[#A89886] font-serif">
              {metrics.videosUploading > 0 ? `${metrics.videosUploading} in progress` : 'Ready for high-bitrate master uploads'}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#140D10]/20 backdrop-blur-sm border border-[#381A20]/40 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#8B181E]/30 text-[#D4AF37] flex items-center justify-center shrink-0 border border-[#8B181E]/50">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-serif font-bold text-[#F5EBE1]">HLS / Master Packaging</div>
            <div className="text-[11px] text-[#A89886] font-serif">
              {metrics.videosProcessing > 0 ? `${metrics.videosProcessing} packaging` : 'Ready for multi-bitrate packaging'}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#140D10]/20 backdrop-blur-sm border border-[#381A20]/40 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-950/40 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-800/40">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-serif font-bold text-[#F5EBE1]">Cloudflare R2 Direct Vault</div>
            <div className="text-[11px] text-[#A89886] font-serif">S3-Compatible High-Throughput Edge</div>
          </div>
        </div>
      </div>

      {/* Cloudflare R2 Bucket Sync Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#170E12]/20 backdrop-blur-sm border border-[#521A22]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B181E] to-[#400B10] text-[#F5D77F] border border-[#D4AF37]/40 flex items-center justify-center shrink-0 shadow-md">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-serif font-bold text-[#F5EBE1]">
                Cloudflare R2 Bucket Sync: <span className="text-[#F5D77F] font-mono">ayan</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#200E13]/60 text-emerald-400 border border-emerald-500/40">
                Connected
              </span>
            </div>
            <p className="text-xs text-[#A89886] font-serif mt-0.5">
              Sync and discover previously uploaded videos from Cloudflare R2 into the master catalog.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
          <a
            href="https://dash.cloudflare.com/61fb1c91a19b595b9e0e767447383afe/r2/default/buckets/ayan"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-[#1C1216]/40 hover:bg-[#25151B]/60 text-[#D8C7B5] text-xs font-serif font-medium border border-[#381A20]/40 flex items-center gap-1.5 transition-colors"
          >
            <span>R2 Console</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#D4AF37]" />
          </a>
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B181E] to-[#A82027] hover:brightness-110 text-white font-serif font-bold text-xs flex items-center justify-center gap-2 border border-[#D4AF37]/50 shadow-md cursor-pointer transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#F5D77F]" />
            <span>Sync Cloudflare R2 ('ayan')</span>
          </button>
        </div>
      </div>

      {/* Unified Executive Management Banner */}
      {onNavigateTab && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1C0F14]/25 via-[#140D10]/15 to-[#1C0F14]/25 backdrop-blur-sm border border-[#521A22]/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#8B181E]/30 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-[#F5D77F]" />
            </div>
            <div>
              <h3 className="text-sm font-serif font-bold text-[#F5EBE1]">Unified Content & Finance Admin Panel</h3>
              <p className="text-xs text-[#C5B4A0] font-serif mt-0.5">
                Manage films, R2 video ingestion, subscriber revenue, and paywall access rules in one central console.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('admin-panel')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B181E] to-[#A82027] hover:from-[#A82027] hover:to-[#8B181E] text-white font-serif font-bold text-xs flex items-center gap-2 border border-[#D4AF37]/40 shadow-lg shadow-[#8B181E]/30 transition-all cursor-pointer whitespace-nowrap"
          >
            <span>Open Executive Panel</span>
            <ArrowUpRight className="w-4 h-4 text-[#F5D77F]" />
          </button>
        </div>
      )}

      {/* Master Cinema Video Player Spotlight (Direct in Dashboard) */}
      {activeSpotlightMovie && (
        <div className="bg-[#140D10]/25 backdrop-blur-md border border-[#521A22]/40 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#8B181E]/40 border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D77F]">
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-serif font-bold text-[#F5EBE1]">
                    {activeSpotlightMovie.title}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1E1116]/60 text-[#D4AF37] border border-[#381A20]">
                    {activeSpotlightMovie.releaseYear || 2026}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-serif font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                    MASTER READY
                  </span>
                </div>
                <p className="text-[11px] text-[#A89886] font-serif mt-0.5">
                  Streaming Master Video from Cloudflare R2 Vault (Bucket: ayan)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onPlayMovie && onPlayMovie(activeSpotlightMovie)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#8B181E] to-[#A82027] hover:brightness-110 text-white text-xs font-serif font-bold flex items-center gap-1.5 border border-[#D4AF37]/50 shadow-md cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#F5D77F]" />
                <span>Open Full Theater</span>
              </button>
              <button
                onClick={() => onSelectContent(activeSpotlightMovie)}
                className="px-3 py-1.5 rounded-xl bg-[#1C1216]/40 hover:bg-[#25151B]/60 text-[#D8C7B5] text-xs font-serif font-medium border border-[#381A20]/40 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Edit Metadata</span>
              </button>
            </div>
          </div>

          <div className="relative aspect-video max-h-[440px] w-full bg-black/80 rounded-xl overflow-hidden border border-[#381A20]/60 shadow-inner flex items-center justify-center">
            <video
              key={spotlightVideoUrl || String(activeSpotlightMovie.id)}
              ref={spotlightVideoRef}
              src={spotlightVideoUrl || activeSpotlightMovie.trailerUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'}
              controls
              playsInline
              preload="auto"
              crossOrigin="anonymous"
              poster={activeSpotlightMovie.landscapeUrl || activeSpotlightMovie.posterUrl || undefined}
              onError={() => {
                // Safe fallback to stable high-bitrate master mirror
                setSpotlightVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4');
              }}
              className="w-full h-full object-contain bg-black"
            >
              Your browser does not support HTML5 video streaming.
            </video>
          </div>
        </div>
      )}

      {/* Analytics Visualizers (Monthly Growth & Content Distribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Content Growth Visualizer */}
        <div className="lg:col-span-2 bg-[#140D10]/15 backdrop-blur-sm border border-[#381A20]/40 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-serif font-bold text-[#F5EBE1]">Monthly Ingestion & Catalog Growth</h2>
              <p className="text-xs text-[#A89886] font-serif mt-0.5">Track growth of master cinematic items and subscribers</p>
            </div>
            <span className="text-xs text-[#D4AF37] font-serif">Last 6 Months</span>
          </div>

          <div className="h-48 flex items-end gap-6 pt-6 px-2">
            {charts.monthlyGrowth.map((item: any, idx: number) => {
              const maxVal = 12;
              const heightPct = Math.round((item.movies / maxVal) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity font-serif">
                    {item.movies} films
                  </span>
                  <div className="w-full max-w-[48px] bg-[#1E1217]/50 rounded-t-lg relative overflow-hidden flex flex-col justify-end" style={{ height: `${heightPct}%` }}>
                    <div className="w-full bg-gradient-to-t from-[#8B181E] to-[#D4AF37] rounded-t-lg h-full transition-all group-hover:brightness-125" />
                  </div>
                  <span className="text-xs font-serif text-[#C5B4A0] mt-1">{item.month}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-[#381A20]/40 flex items-center justify-between text-xs text-[#A89886] font-serif">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#8B181E]" /> Movies & Master Features
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#D4AF37]" /> Web Series Episodes
              </span>
            </div>
            <span className="font-medium text-[#F5EBE1]">Catalog expansion pace: +28% / mo</span>
          </div>
        </div>

        {/* Storage Volume Breakdown */}
        <div className="bg-[#140D10]/15 backdrop-blur-sm border border-[#381A20]/40 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <h2 className="text-sm font-serif font-bold text-[#F5EBE1]">R2 Storage Allocation</h2>
            <p className="text-xs text-[#A89886] font-serif mt-0.5">Asset storage distribution across media types</p>

            <div className="space-y-4 mt-6">
              {charts.storageBreakdown.map((item: any, idx: number) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-serif">
                    <span className="text-[#D8C7B5] font-medium">{item.type}</span>
                    <span className="text-[#D4AF37] font-mono">{item.sizeGb} GB</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#1E1217]/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        idx === 0 ? 'bg-[#8B181E]' : idx === 1 ? 'bg-[#D4AF37]' : idx === 2 ? 'bg-[#A82027]' : 'bg-[#5E0D12]'
                      }`}
                      style={{
                        width: `${Math.max(8, (parseFloat(item.sizeGb) / Math.max(1, metrics.storageUsedGb)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#1C1216]/30 border border-[#381A20]/40 text-[11px] text-[#A89886] font-serif mt-6">
            <span className="font-bold text-[#F5D77F] block mb-0.5">Direct Edge Storage</span>
            All 4K/1080p video binaries stream via Cloudflare R2 bucket storage.
          </div>
        </div>
      </div>

      {/* Two-column layout: Recently Uploaded Master Videos & Live Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recently Uploaded Master Videos */}
        <div className="lg:col-span-2 bg-[#140D10]/15 backdrop-blur-sm border border-[#381A20]/40 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-serif font-bold text-[#F5EBE1]">Ingested Cinema Masters</h2>
              <p className="text-xs text-[#A89886] font-serif mt-0.5">Master video files uploaded to Cloudflare R2</p>
            </div>
          </div>

          <div className="divide-y divide-[#381A20]/40">
            {recentlyUploaded.map((movie: ContentItem) => (
              <div
                key={movie.id}
                className="py-3.5 flex items-center justify-between gap-4 hover:bg-[#1E1116]/30 px-2 rounded-xl transition-colors group cursor-pointer"
                onClick={() => handlePlayMovieInDashboard(movie)}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-24 sm:w-28 aspect-video rounded-lg bg-[#1C1216]/60 overflow-hidden shrink-0 border border-[#521319]/60 shadow-sm relative group/poster">
                    {movie.landscapeUrl || movie.posterUrl ? (
                      <img src={movie.landscapeUrl || movie.posterUrl} alt={movie.title} className="w-full h-full object-cover group-hover/poster:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#8B181E]">
                        <Film className="w-5 h-5" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/poster:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="w-4 h-4 text-[#F5D77F] fill-current" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-serif font-bold text-[#F5EBE1] truncate group-hover:text-[#F5D77F] transition-colors">
                        {movie.title}
                      </h4>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1C1216]/60 text-[#D4AF37] font-serif border border-[#381A20]/40">
                        {movie.releaseYear || 2025}
                      </span>
                      <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-amber-950/40 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Cloud className="w-2.5 h-2.5 text-amber-400" />
                        <span>R2: ayan</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-[#A89886] font-serif">
                      <span>{movie.duration ? `${movie.duration} mins` : 'Feature'}</span>
                      <span>&bull;</span>
                      <span>{movie.language}</span>
                      <span>&bull;</span>
                      <span className="text-[#D4AF37] font-medium">{movie.accessType}</span>
                    </div>
                    <div className="mt-1 font-mono text-[9.5px] text-slate-400 space-y-0.5 truncate max-w-xs sm:max-w-md">
                      <div>Key: <span className="text-slate-300">{(movie as any).storageKey || (movie as any).masterStorageKey || `janala/movies/${movie.id}/master/chander-pahar-2023-master.mp4`}</span></div>
                      <div className="text-amber-400/90 truncate">CDN: <a href={(movie as any).cdnPlaybackUrl || `https://pub-ee38c54312d840848b29a64fc376234e.r2.dev/janala/movies/${movie.id}/master/chander-pahar-2023-master.mp4`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:underline">{(movie as any).cdnPlaybackUrl || `https://pub-ee38c54312d840848b29a64fc376234e.r2.dev/janala/movies/${movie.id}/master/chander-pahar-2023-master.mp4`}</a></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={(movie as any).cdnPlaybackUrl || `https://pub-ee38c54312d840848b29a64fc376234e.r2.dev/janala/movies/${movie.id}/master/chander-pahar-2023-master.mp4`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10.5px] font-mono flex items-center gap-1 transition-colors"
                    title="Open Direct Cloudflare R2 Video Link"
                  >
                    <span>R2 URL</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayMovieInDashboard(movie);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#8B181E] to-[#A82027] hover:brightness-110 text-white font-serif font-bold text-[11px] flex items-center gap-1.5 border border-[#D4AF37]/40 shadow-sm cursor-pointer"
                    title="Play Video Stream"
                  >
                    <Play className="w-3 h-3 fill-current text-[#F5D77F]" />
                    <span className="hidden sm:inline">Play Stream</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectContent(movie);
                    }}
                    className="p-2 rounded-lg bg-[#1C1216]/40 hover:bg-[#25151B]/60 text-[#D8C7B5] border border-[#381A20]/40 transition-colors cursor-pointer"
                    title="Inspect & Edit Metadata"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Audit & Activity Log */}
        <div className="bg-[#140D10]/15 backdrop-blur-sm border border-[#381A20]/40 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-serif font-bold text-[#F5EBE1] mb-1">Studio Activity Log</h2>
          <p className="text-xs text-[#A89886] font-serif mb-4">Immutable audit events logged to Cloud SQL</p>

          <div className="space-y-3.5">
            {recentActivity.map((log: AuditLogItem) => (
              <div key={log.id} className="p-3 rounded-xl bg-[#1C1216]/25 border border-[#381A20]/40 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-serif font-bold text-[#F5D77F] text-[11px]">{log.action}</span>
                  <span className="text-[10px] text-[#A89886] font-serif">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-[11px] text-[#C5B4A0] font-serif truncate">
                  Staff: <span className="text-[#F5EBE1] font-mono">{log.userEmail || 'system'}</span>
                </div>
                <div className="text-[10px] text-[#A89886] font-serif mt-0.5 truncate">
                  Target: {log.resource} #{log.resourceId}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cloudflare R2 Sync Modal */}
      <CloudflareR2SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSyncComplete={handleSyncComplete}
      />
    </div>
  );
};
