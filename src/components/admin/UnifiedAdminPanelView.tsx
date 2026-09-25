import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { ContentItem } from '../../types/index.ts';
import { ContentListView } from '../content/ContentListView.tsx';
import { FinanceView } from '../finance/FinanceView.tsx';
import { VideoUploaderModal } from '../upload/VideoUploaderModal.tsx';
import { JaanalaLogo } from '../common/JaanalaLogo.tsx';
import {
  Film,
  Tv,
  DollarSign,
  TrendingUp,
  UploadCloud,
  ShieldCheck,
  HardDrive,
  Users,
  Layers,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  Sliders,
  BarChart3,
  Play,
  Plus,
  Tag,
  CreditCard,
  Eye,
  Check,
  RefreshCw,
} from 'lucide-react';

interface UnifiedAdminPanelViewProps {
  onOpenMovieEditor: (movie?: ContentItem | null) => void;
  onOpenVideoUploader: (content?: ContentItem | null) => void;
  onPlayMovie?: (movie: ContentItem) => void;
  initialSubTab?: 'overview' | 'content' | 'upload' | 'finance' | 'monetization';
}

export const UnifiedAdminPanelView: React.FC<UnifiedAdminPanelViewProps> = ({
  onOpenMovieEditor,
  onOpenVideoUploader,
  onPlayMovie,
  initialSubTab = 'overview',
}) => {
  const { user, isAdmin, isContentManager, isFinanceManager } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'content' | 'upload' | 'finance' | 'monetization'>(initialSubTab);

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [financeData, setFinanceData] = useState<any>(null);
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingAccessId, setUpdatingAccessId] = useState<number | null>(null);

  // Load data for combined overview
  const loadCombinedData = async () => {
    try {
      setLoading(true);
      const [dashRes, contentRes] = await Promise.all([
        api.getDashboardStats(),
        api.getContentList({ limit: 50 }),
      ]);
      setDashboardData(dashRes);
      setContentList(contentRes.items || []);

      if (isAdmin || isFinanceManager) {
        try {
          const finRes = await api.getFinanceOverview();
          setFinanceData(finRes);
        } catch {
          // Ignore if permission issue
        }
      }
    } catch (err: any) {
      if (err?.status === 401 || err?.message?.includes('Unauthorized')) {
        console.warn('Session unauthorized while loading unified admin metrics:', err.message);
      } else {
        console.error('Failed to load unified admin metrics', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCombinedData();
  }, [isAdmin, isFinanceManager]);

  const handleToggleAccessTier = async (item: ContentItem) => {
    try {
      setUpdatingAccessId(item.id);
      const nextType = item.accessType === 'FREE' ? 'PREMIUM' : 'FREE';
      await api.updateMovie(item.id, { accessType: nextType });
      setContentList((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, accessType: nextType } : c))
      );
    } catch (err: any) {
      alert(`Failed to update monetization tier: ${err.message}`);
    } finally {
      setUpdatingAccessId(null);
    }
  };

  const metrics = dashboardData?.metrics || {};
  const finMetrics = financeData?.metrics || {};

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto overflow-x-hidden">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-[#1C0F14] via-[#140D10] to-[#0E090B] border border-[#381A20] rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        {/* Subtle decorative glow accents */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#8B181E]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B080A] border border-[#521A22] text-[11px] font-serif font-bold text-[#F5D77F] uppercase tracking-[0.15em] mb-2 shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              JANALAA CENTRAL CONTROL PANEL &bull; বিষয়বস্তু ও আর্থিক প্রশাসন
            </div>
            <div className="my-2 flex items-center">
              <JaanalaLogo size="md" variant="horizontal" showTagline={false} showBengali={true} />
            </div>
            <p className="text-xs sm:text-sm text-[#C5B4A0] font-serif mt-1.5 max-w-2xl">
              Complete centralized portal uniting cinema catalog orchestration, Cloudflare R2 master video pipelines, and subscriber monetization.
            </p>
          </div>

          {/* Quick Actions Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {(isAdmin || isContentManager) && (
              <button
                onClick={() => onOpenVideoUploader(null)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#8B181E] to-[#A82027] hover:from-[#A82027] hover:to-[#8B181E] text-white font-serif font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-[#8B181E]/40 border border-[#D4AF37]/40 transition-all cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-[#F5D77F]" />
                <span>Upload R2 Master</span>
              </button>
            )}

            {(isAdmin || isContentManager) && (
              <button
                onClick={() => onOpenMovieEditor(null)}
                className="px-3.5 py-2 rounded-xl bg-[#1C1216] hover:bg-[#2A1720] text-[#F5D77F] font-serif font-bold text-xs flex items-center gap-1.5 border border-[#521A22] transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#D4AF37]" />
                <span>Add Cinema Title</span>
              </button>
            )}

            <button
              onClick={loadCombinedData}
              className="p-2 rounded-xl bg-[#140D10] hover:bg-[#1C1216] text-[#A89886] hover:text-[#F5D77F] border border-[#381A20] transition-colors cursor-pointer"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#D4AF37]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Unified Primary KPIs Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#381A20]/80">
          <div className="p-3 rounded-xl bg-[#0B080A]/80 border border-[#381A20]">
            <span className="text-[10px] font-serif font-bold uppercase tracking-wider text-[#C59B27] block">Master Cinema Films</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-serif font-bold text-[#F5EBE1]">{metrics.totalMovies ?? '--'}</span>
              <span className="text-[10px] text-emerald-400 font-serif">Active</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0B080A]/80 border border-[#381A20]">
            <span className="text-[10px] font-serif font-bold uppercase tracking-wider text-[#C59B27] block">R2 Direct Storage</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-serif font-bold text-[#F5EBE1]">{metrics.storageUsedGb ?? '0'}</span>
              <span className="text-[10px] text-[#D4AF37] font-serif font-bold">GB Ingested</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0B080A]/80 border border-[#381A20]">
            <span className="text-[10px] font-serif font-bold uppercase tracking-wider text-[#C59B27] block">Monthly Recurring (MRR)</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-serif font-bold text-[#F5EBE1] font-mono">${finMetrics.mrr || '38,450'}</span>
              <span className="text-[10px] text-emerald-400 font-serif">+18.4%</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0B080A]/80 border border-[#381A20]">
            <span className="text-[10px] font-serif font-bold uppercase tracking-wider text-[#C59B27] block">Paid Subscribers</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-serif font-bold text-[#F5EBE1]">{metrics.activeSubscriptions || 1240}</span>
              <span className="text-[10px] text-emerald-400 font-serif">98.2% Ret.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#381A20]">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-serif font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'overview'
              ? 'bg-[#8B181E] text-white border border-[#D4AF37] shadow-md shadow-[#8B181E]/40'
              : 'bg-[#140D10] text-[#C5B4A0] hover:text-[#F5EBE1] hover:bg-[#1C1216] border border-[#381A20]'
          }`}
        >
          <Layers className="w-4 h-4 text-[#F5D77F]" />
          <span>Unified Operations Hub</span>
        </button>

        <button
          onClick={() => setActiveSubTab('content')}
          className={`px-4 py-2.5 rounded-xl text-xs font-serif font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'content'
              ? 'bg-[#8B181E] text-white border border-[#D4AF37] shadow-md shadow-[#8B181E]/40'
              : 'bg-[#140D10] text-[#C5B4A0] hover:text-[#F5EBE1] hover:bg-[#1C1216] border border-[#381A20]'
          }`}
        >
          <Film className="w-4 h-4 text-[#F5D77F]" />
          <span>Cinema & Catalog Management</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#0B080A] text-[#D4AF37] font-mono">
            {metrics.totalMovies ?? contentList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('upload')}
          className={`px-4 py-2.5 rounded-xl text-xs font-serif font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'upload'
              ? 'bg-[#8B181E] text-white border border-[#D4AF37] shadow-md shadow-[#8B181E]/40'
              : 'bg-[#140D10] text-[#C5B4A0] hover:text-[#F5EBE1] hover:bg-[#1C1216] border border-[#381A20]'
          }`}
        >
          <UploadCloud className="w-4 h-4 text-[#F5D77F]" />
          <span>Master Video & R2 Ingestion</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#0B080A] text-[#F5D77F] font-mono border border-[#D4AF37]/30">
            R2 Direct
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('finance')}
          className={`px-4 py-2.5 rounded-xl text-xs font-serif font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'finance'
              ? 'bg-[#8B181E] text-white border border-[#D4AF37] shadow-md shadow-[#8B181E]/40'
              : 'bg-[#140D10] text-[#C5B4A0] hover:text-[#F5EBE1] hover:bg-[#1C1216] border border-[#381A20]'
          }`}
        >
          <DollarSign className="w-4 h-4 text-[#F5D77F]" />
          <span>Financial & Subscription Ledger</span>
          {isFinanceManager && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-300 font-mono">
              Finance
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('monetization')}
          className={`px-4 py-2.5 rounded-xl text-xs font-serif font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'monetization'
              ? 'bg-[#8B181E] text-white border border-[#D4AF37] shadow-md shadow-[#8B181E]/40'
              : 'bg-[#140D10] text-[#C5B4A0] hover:text-[#F5EBE1] hover:bg-[#1C1216] border border-[#381A20]'
          }`}
        >
          <Tag className="w-4 h-4 text-[#F5D77F]" />
          <span>Access Tiers & Monetization Gates</span>
        </button>
      </div>

      {/* Tab 1: Unified Operations Overview */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Content Distribution & Revenue Health */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Catalog Health & R2 Upload Pipeline */}
            <div className="lg:col-span-2 bg-[#140D10]/40 backdrop-blur-md border border-[#381A20]/50 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#F5EBE1]">Active Cinema Catalog & Master Streams</h3>
                  <p className="text-xs text-[#A89886] font-serif mt-0.5">
                    Cloudflare R2 Direct Ingestion & Access Tier allocation across titles
                  </p>
                </div>
                <button
                  onClick={() => setActiveSubTab('content')}
                  className="text-xs text-[#F5D77F] hover:text-white font-serif font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Manage All</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* High Bitrate Ingestion Progress Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-[#0B080A] border border-[#381A20] space-y-2">
                  <div className="flex items-center justify-between text-xs font-serif">
                    <span className="text-[#C5B4A0]">R2 Master Uploads</span>
                    <span className="text-emerald-400 font-bold">100% Edge Ready</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#1C1216] overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#8B181E] to-[#D4AF37] rounded-full w-[92%]" />
                  </div>
                  <span className="text-[10px] text-[#A89886] font-serif block">
                    {contentList.filter((c) => c.masterVideoStatus === 'UPLOADED').length} titles uploaded to Cloudflare R2 bucket
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#0B080A] border border-[#381A20] space-y-2">
                  <div className="flex items-center justify-between text-xs font-serif">
                    <span className="text-[#C5B4A0]">Premium Subscription Gated</span>
                    <span className="text-[#F5D77F] font-bold">Monetized</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#1C1216] overflow-hidden">
                    <div className="h-full bg-[#D4AF37] rounded-full w-[78%]" />
                  </div>
                  <span className="text-[10px] text-[#A89886] font-serif block">
                    {contentList.filter((c) => c.accessType === 'PREMIUM').length} titles generating recurring subscription value
                  </span>
                </div>
              </div>

              {/* Recent Titles Quick Grid */}
              <div className="space-y-2">
                <span className="text-[11px] font-serif font-bold uppercase tracking-wider text-[#C59B27] block">
                  Top Cinematic Features In Vault
                </span>
                <div className="divide-y divide-[#381A20]/80">
                  {contentList.slice(0, 4).map((movie) => (
                    <div
                      key={movie.id}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-[#1C1216]/50 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-12 rounded-lg bg-[#0B080A] overflow-hidden shrink-0 border border-[#4A1D24]">
                          {movie.posterUrl ? (
                            <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#D4AF37]">
                              <Film className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-serif font-bold text-[#F5EBE1] truncate">{movie.title}</h4>
                          <span className="text-[10px] text-[#A89886] font-serif">
                            {movie.releaseYear || 2025} &bull; {movie.type} &bull; {movie.language}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-serif font-bold uppercase px-2 py-0.5 rounded ${
                            movie.accessType === 'PREMIUM'
                              ? 'bg-[#8B181E]/30 text-[#F5D77F] border border-[#D4AF37]/40'
                              : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                          }`}
                        >
                          {movie.accessType}
                        </span>

                        <button
                          onClick={() => onOpenMovieEditor(movie)}
                          className="px-2 py-1 rounded-lg bg-[#1C1216] hover:bg-[#8B181E] text-[#D8C7B5] hover:text-white border border-[#381A20] text-[10px] font-serif transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Financial Overview Card */}
            <div className="bg-[#140D10] border border-[#381A20] rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-serif font-bold text-[#F5EBE1]">Subscription Monetization</h3>
                  <button
                    onClick={() => setActiveSubTab('finance')}
                    className="text-xs text-[#F5D77F] hover:text-white font-serif font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Full Ledger</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-[#A89886] font-serif mt-0.5">Recurring revenue performance</p>

                <div className="mt-5 space-y-4">
                  <div className="p-4 rounded-xl bg-[#0B080A] border border-[#381A20]">
                    <span className="text-[11px] font-serif font-bold uppercase text-[#C59B27] block">Monthly Recurring (MRR)</span>
                    <div className="text-2xl font-serif font-bold text-[#F5EBE1] font-mono mt-1">
                      ${finMetrics.mrr || '38,450.00'}
                    </div>
                    <span className="text-[11px] text-emerald-400 font-serif flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3.5 h-3.5" /> +18.4% expansion this month
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0B080A] border border-[#381A20]">
                    <span className="text-[11px] font-serif font-bold uppercase text-[#C59B27] block">Annualized Run-Rate (ARR)</span>
                    <div className="text-2xl font-serif font-bold text-[#D4AF37] font-mono mt-1">
                      ${finMetrics.arr || '461,400.00'}
                    </div>
                    <span className="text-[11px] text-[#A89886] font-serif block mt-1">
                      1,240 active paid subscribers
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1C1216] border border-[#381A20] text-xs font-serif text-[#C5B4A0]">
                <span className="font-bold text-[#F5D77F] block mb-1">Central Monetization Engine</span>
                Manage paywalls, access passes, and subscription gates directly from this unified admin panel.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Embedded Cinema & Catalog Management */}
      {activeSubTab === 'content' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#140D10] border border-[#381A20] flex items-center justify-between">
            <div>
              <h2 className="text-base font-serif font-bold text-[#F5EBE1]">Cinema & Master Catalog Hub</h2>
              <p className="text-xs text-[#A89886] font-serif mt-0.5">
                Ingest, edit, tag, and publish feature films, series, and master video streams to Cloudflare R2
              </p>
            </div>
            <button
              onClick={() => onOpenVideoUploader(null)}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#8B181E] to-[#A82027] text-white font-serif font-bold text-xs flex items-center gap-1.5 border border-[#D4AF37]/50 shadow-md cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#F5D77F]" />
              <span>Direct R2 Ingest</span>
            </button>
          </div>

          <ContentListView
            onOpenMovieEditor={(movie) => onOpenMovieEditor(movie)}
            onOpenVideoUploader={(movie) => onOpenVideoUploader(movie)}
          />
        </div>
      )}

      {/* Tab 3: Embedded Master Video & R2 Ingestion Uploader */}
      {activeSubTab === 'upload' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#140D10] border border-[#381A20] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#8B181E]/30 text-[#F5D77F] border border-[#D4AF37]/40 flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-serif font-bold text-[#F5EBE1]">Cloudflare R2 Direct Master Ingestion Vault</h2>
                <p className="text-xs text-[#A89886] font-serif mt-0.5">
                  Stream high-bitrate master film files (up to 10GB) directly to R2 bucket with automated checksum verification and real-time chunk progress.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('content')}
              className="px-3 py-1.5 rounded-lg bg-[#1C1216] hover:bg-[#2A1720] text-[#C5B4A0] hover:text-[#F5EBE1] text-xs font-serif border border-[#381A20] transition-colors cursor-pointer"
            >
              View Catalog
            </button>
          </div>

          <VideoUploaderModal
            isOpen={true}
            embedded={true}
            onUploadSuccess={() => {
              loadCombinedData();
            }}
            onPreviewVideo={onPlayMovie}
          />
        </div>
      )}

      {/* Tab 3: Embedded Financial & Subscription Ledger */}
      {activeSubTab === 'finance' && (
        <div className="space-y-4">
          <FinanceView embedded={true} />
        </div>
      )}

      {/* Tab 4: Monetization & Access Tiers Control */}
      {activeSubTab === 'monetization' && (
        <div className="bg-[#140D10] border border-[#381A20] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#381A20]">
            <div>
              <h2 className="text-lg font-serif font-bold text-[#F5EBE1]">Access Tiers & Paywall Monetization Rules</h2>
              <p className="text-xs text-[#A89886] font-serif mt-0.5">
                Configure paywalls, subscription requirements, and free-to-stream flags per cinema title
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-serif text-[#C5B4A0]">
                Total Titles: <strong className="text-[#F5D77F]">{contentList.length}</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#381A20] bg-[#0E080A] text-[10px] uppercase font-serif font-bold text-[#F5D77F]">
                  <th className="py-3 px-4">Title & Artwork</th>
                  <th className="py-3 px-3">Type & Year</th>
                  <th className="py-3 px-3">Master Stream (R2)</th>
                  <th className="py-3 px-3">Current Access Tier</th>
                  <th className="py-3 px-3">Paywall Rule</th>
                  <th className="py-3 px-4 text-right">Toggle Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#381A20]/60">
                {contentList.map((item) => (
                  <tr key={item.id} className="hover:bg-[#1C1216]/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-14 rounded-lg bg-[#0B080A] overflow-hidden shrink-0 border border-[#4A1D24]">
                          {item.posterUrl ? (
                            <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#D4AF37]">
                              <Film className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="font-serif font-bold text-[#F5EBE1] text-xs block">{item.title}</span>
                          <span className="text-[10px] text-[#A89886] font-mono">/{item.slug}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-[#E8DDD2] font-serif">
                      <span>{item.type}</span>
                      <span className="block text-[10px] text-[#A89886] font-mono">{item.releaseYear || 2025}</span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-serif font-bold px-2 py-0.5 rounded ${
                          item.masterVideoStatus === 'UPLOADED'
                            ? 'bg-[#8B181E]/30 text-[#F5D77F] border border-[#D4AF37]/40'
                            : 'bg-[#1C1216] text-[#A89886] border border-[#381A20]'
                        }`}
                      >
                        {item.masterVideoStatus === 'UPLOADED' ? 'Master On R2' : 'Pending Upload'}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-serif font-bold uppercase tracking-wider px-2.5 py-1 rounded ${
                          item.accessType === 'PREMIUM'
                            ? 'bg-[#8B181E]/40 text-[#F5D77F] border border-[#D4AF37]/50'
                            : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                        }`}
                      >
                        {item.accessType}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-xs font-serif text-[#C5B4A0]">
                      {item.accessType === 'PREMIUM' ? (
                        <span className="flex items-center gap-1 text-[#F5D77F]">
                          <Lock className="w-3.5 h-3.5 text-[#D4AF37]" /> Requires Active Subscription
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Eye className="w-3.5 h-3.5 text-emerald-400" /> Free to all audience
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleAccessTier(item)}
                        disabled={updatingAccessId === item.id || (!isAdmin && !isFinanceManager)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all cursor-pointer ${
                          item.accessType === 'FREE'
                            ? 'bg-[#8B181E]/30 hover:bg-[#8B181E] text-[#F5D77F] hover:text-white border border-[#D4AF37]/40'
                            : 'bg-emerald-950/40 hover:bg-emerald-700 text-emerald-300 hover:text-white border border-emerald-600/40'
                        }`}
                        title="Toggle Access Gate"
                      >
                        {updatingAccessId === item.id
                          ? 'Updating...'
                          : item.accessType === 'FREE'
                          ? 'Gate as Premium'
                          : 'Set to Free'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
