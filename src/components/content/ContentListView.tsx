import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { ContentItem, ContentType, VideoStatus } from '../../types/index.ts';
import {
  Film,
  Search,
  Filter,
  Plus,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Edit3,
  Globe2,
  Archive,
  Trash2,
  MoreVertical,
  LayoutGrid,
  List,
  Sparkles,
  Lock,
  Play,
  RefreshCw,
  HardDrive,
} from 'lucide-react';
import { VideoPlayerModal } from '../media/VideoPlayerModal.tsx';

interface ContentListViewProps {
  onOpenMovieEditor: (movie?: ContentItem) => void;
  onOpenVideoUploader: (movie: ContentItem) => void;
  initialTypeFilter?: string;
  refreshTrigger?: number;
}

export const ContentListView: React.FC<ContentListViewProps> = ({
  onOpenMovieEditor,
  onOpenVideoUploader,
  initialTypeFilter,
  refreshTrigger,
}) => {
  const { isAdmin, isContentManager } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>(initialTypeFilter || 'ALL');

  useEffect(() => {
    if (initialTypeFilter) {
      setSelectedType(initialTypeFilter);
    }
  }, [initialTypeFilter]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [playingMovie, setPlayingMovie] = useState<ContentItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ContentItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [syncingBucket, setSyncingBucket] = useState(false);
  const [cleaningUnplayable, setCleaningUnplayable] = useState(false);

  const handleCleanupUnplayable = async () => {
    try {
      setCleaningUnplayable(true);
      setActionNotice(null);
      const res = await api.cleanupUnplayable();
      setActionNotice({
        type: 'success',
        message: res.message || 'Successfully removed all unplayable / incomplete movie entries!',
      });
      await loadContent();
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Failed to remove unplayable movies.',
      });
    } finally {
      setCleaningUnplayable(false);
    }
  };

  const handleSyncBucket = async () => {
    try {
      setSyncingBucket(true);
      setActionNotice(null);
      const res = await api.syncBucketMovies('ayan');
      setActionNotice({
        type: 'success',
        message: res.message || 'Successfully synced movies from Cloudflare R2 bucket "ayan" into the database catalog!',
      });
      await loadContent();
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Failed to sync movies from Cloudflare R2 bucket.',
      });
    } finally {
      setSyncingBucket(false);
    }
  };

  const loadContent = async () => {
    try {
      setLoading(true);
      const res = await api.getContentList({
        type: selectedType,
        status: selectedStatus,
        search: searchQuery,
        limit: 50,
      });
      setItems(res.items || []);
    } catch (err: any) {
      if (err?.status === 401 || err?.message?.includes('Unauthorized')) {
        console.warn('Session unauthorized while loading content list:', err.message);
      } else {
        console.error('Failed to load content list:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, [selectedType, selectedStatus, searchQuery, refreshTrigger]);

  useEffect(() => {
    const handleGlobalUpdate = () => {
      loadContent();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('jaanala:content-updated', handleGlobalUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('jaanala:content-updated', handleGlobalUpdate);
      }
    };
  }, [selectedType, selectedStatus, searchQuery]);

  const handlePublish = async (movie: ContentItem) => {
    setActionNotice(null);
    try {
      await api.publishMovie(movie.id);
      setActionNotice({
        type: 'success',
        message: `"${movie.title}" successfully published and set live!`,
      });
      loadContent();
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Publication check failed. Master video must be completed on R2.',
      });
    }
  };

  const handleUnpublish = async (movie: ContentItem) => {
    setActionNotice(null);
    try {
      await api.unpublishMovie(movie.id);
      setActionNotice({
        type: 'success',
        message: `"${movie.title}" unpublished and moved back to Draft status.`,
      });
      loadContent();
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message });
    }
  };

  const handleArchive = async (movie: ContentItem) => {
    if (!confirm(`Are you sure you want to safely archive "${movie.title}"?`)) return;
    try {
      await api.archiveMovie(movie.id);
      setActionNotice({
        type: 'success',
        message: `"${movie.title}" safely archived.`,
      });
      loadContent();
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message });
    }
  };

  const handleDelete = (movie: ContentItem) => {
    setItemToDelete(movie);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setDeleting(true);
      const res = await api.deleteContent(itemToDelete.id);
      setActionNotice({
        type: 'success',
        message: res.message || `"${itemToDelete.title}" has been permanently deleted.`,
      });
      setItemToDelete(null);
      await loadContent();
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Failed to delete content item',
      });
    } finally {
      setDeleting(false);
    }
  };

  const renderVideoStatusBadge = (status: VideoStatus) => {
    switch (status) {
      case 'UPLOADED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Master on R2
          </span>
        );
      case 'UPLOADING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 animate-pulse">
            <UploadCloud className="w-3 h-3" /> Uploading Chunks
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <Clock className="w-3 h-3" /> Transcoding
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
            <AlertCircle className="w-3 h-3" /> Upload Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            No Master Video
          </span>
        );
    }
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto overflow-x-hidden">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">OTT Catalog & Content Hub</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {items.length} Titles
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage Movies, Web Series, TV Shows, Short Films and Documentaries
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Cloudflare R2 Sync Button */}
          <button
            type="button"
            onClick={handleSyncBucket}
            disabled={syncingBucket}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold shadow-lg shadow-amber-950/20 transition-all cursor-pointer"
            title="Scan and link movies stored in Cloudflare R2 bucket: ayan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingBucket ? 'animate-spin' : ''}`} />
            <span>{syncingBucket ? 'Scanning Bucket "ayan"...' : 'Sync Movies from Cloudflare Bucket (ayan)'}</span>
          </button>

          {/* Remove Unplayable Titles Button */}
          <button
            type="button"
            onClick={handleCleanupUnplayable}
            disabled={cleaningUnplayable}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold shadow-lg shadow-red-950/10 transition-all cursor-pointer"
            title="Purge titles with incomplete or unplayable master videos"
          >
            <Trash2 className={`w-3.5 h-3.5 ${cleaningUnplayable ? 'animate-spin' : ''}`} />
            <span>{cleaningUnplayable ? 'Purging...' : 'Remove Non-Running Movies'}</span>
          </button>

          {(isAdmin || isContentManager) && (
            <button
              onClick={() => onOpenMovieEditor()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-semibold shadow-lg shadow-red-950/50 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Content Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Notice Alert */}
      {actionNotice && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            actionNotice.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-200 border-emerald-800/60'
              : 'bg-red-950/40 text-red-200 border-red-800/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-white font-mono text-sm ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filters, Search & View Controls */}
      <div className="bg-[#140D10] border border-[#381A20] rounded-2xl p-4 space-y-4 shadow-xl">
        {/* Content Type Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-[#381A20]">
          {[
            { id: 'ALL', label: 'All Catalog', bengali: 'সব' },
            { id: 'MOVIE', label: 'Movies', bengali: 'চলচ্চিত্র' },
            { id: 'WEB_SERIES', label: 'Web Series', bengali: 'ওয়েব সিরিজ' },
            { id: 'DOCUMENTARY', label: 'Documentaries', bengali: 'তথ্যচিত্র' },
            { id: 'SHORT_FILM', label: 'Short Films', bengali: 'স্বল্পদৈর্ঘ্য' },
            { id: 'TV_SERIES', label: 'TV Series', bengali: 'টিভি সিরিজ' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3.5 py-2 rounded-xl font-serif text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedType === tab.id
                  ? 'bg-gradient-to-r from-[#8B181E] to-[#6A0E13] text-[#F5D77F] border border-[#D4AF37]/50 shadow-md font-bold'
                  : 'text-[#C5B4A0] hover:text-[#FAF4EE] hover:bg-[#1E1116] border border-transparent'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] opacity-75">({tab.bengali})</span>
            </button>
          ))}
        </div>

        {/* Search Bar & Secondary Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#A89886] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by title or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B080A] border border-[#381A20] rounded-xl pl-9 pr-4 py-2 text-xs text-[#F5EBE1] placeholder-[#6E5A60] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#0B080A] border border-[#381A20] rounded-xl px-3 py-2 text-xs text-[#D8C7B5] font-serif focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published Only</option>
              <option value="DRAFT">Draft Only</option>
              <option value="UPLOADED">Master Video on R2</option>
              <option value="NO_VIDEO">Missing Master Video</option>
            </select>

            <div className="flex items-center bg-[#0B080A] border border-[#381A20] rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-[#8B181E] text-[#F5D77F]' : 'text-[#A89886] hover:text-white'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[#8B181E] text-[#F5D77F]' : 'text-[#A89886] hover:text-white'
                }`}
                title="Grid Posters View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Table / Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-[#12151f] border border-slate-800 rounded-2xl space-y-3">
          <Film className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No content items match current criteria</h3>
          <p className="text-xs text-slate-500">Try adjusting your filters or search terms.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-[#140D10] border border-[#381A20] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#381A20] bg-[#0E080A] text-[11px] font-serif font-bold text-[#F5D77F] uppercase tracking-wider">
                  <th className="py-3 px-4">Title & Artwork</th>
                  <th className="py-3 px-3">Type & Year</th>
                  <th className="py-3 px-3">Genres</th>
                  <th className="py-3 px-3">Access Tier</th>
                  <th className="py-3 px-3">R2 Master Video</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#381A20]/60">
                {items.map((movie) => (
                  <tr key={movie.id} className="hover:bg-[#1C1216]/60 transition-colors group">
                    {/* Title & Artwork */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div
                          onClick={() => setPlayingMovie(movie)}
                          className="w-20 aspect-video rounded-lg bg-[#0B080A] overflow-hidden shrink-0 border border-[#4A1D24] shadow-sm relative group/poster cursor-pointer"
                          title="Click to Play Video from Cloudflare R2"
                        >
                          {movie.landscapeUrl || movie.posterUrl ? (
                            <img
                              src={movie.landscapeUrl || movie.posterUrl}
                              alt={movie.title}
                              className="w-full h-full object-cover group-hover/poster:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#A89886]">
                              <Film className="w-4 h-4 text-[#D4AF37]" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/poster:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="w-4 h-4 fill-current text-[#F5D77F]" />
                          </div>
                        </div>
                        <div>
                          <span
                            onClick={() => setPlayingMovie(movie)}
                            className="font-serif font-bold text-[#F5EBE1] text-xs block truncate max-w-xs hover:text-[#F5D77F] cursor-pointer transition-colors"
                            title="Click to Play"
                          >
                            {movie.title}
                          </span>
                          <span className="text-[10px] text-[#A89886] font-mono">/{movie.slug}</span>
                        </div>
                      </div>
                    </td>

                    {/* Type & Year */}
                    <td className="py-3 px-3 text-[#E8DDD2]">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-serif font-bold bg-[#1C1216] border border-[#521A22] text-[#F5D77F]">
                        {movie.type}
                      </span>
                      <span className="block text-[10px] text-[#A89886] mt-1 font-mono">
                        {movie.releaseYear || 2025} &bull; {movie.duration ? `${movie.duration}m` : 'Series'}
                      </span>
                    </td>

                    {/* Genres */}
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {movie.genres && movie.genres.length > 0 ? (
                          movie.genres.map((g) => (
                            <span
                              key={g.id}
                              className="px-1.5 py-0.5 rounded bg-[#0B080A] text-[#D8C7B5] border border-[#381A20] text-[10px] font-serif"
                            >
                              {g.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-[#6E5A60]">None</span>
                        )}
                      </div>
                    </td>

                    {/* Access Tier */}
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-serif font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          movie.accessType === 'PREMIUM'
                            ? 'bg-[#8B181E]/30 text-[#F5D77F] border border-[#D4AF37]/40'
                            : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                        }`}
                      >
                        {movie.accessType}
                      </span>
                    </td>

                    {/* R2 Master Video Status */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {renderVideoStatusBadge(movie.masterVideoStatus)}
                        {movie.masterVideoStatus === 'UPLOADED' && (
                          <button
                            onClick={() => setPlayingMovie(movie)}
                            className="p-1 rounded bg-[#8B181E]/30 hover:bg-[#8B181E] text-[#F5D77F] hover:text-white border border-[#D4AF37]/40 transition-colors cursor-pointer"
                            title="Play Video Stream from Cloudflare R2"
                          >
                            <Play className="w-3 h-3 fill-current" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Publication Status */}
                    <td className="py-3 px-3">
                      {movie.isPublished ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-serif font-semibold text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-serif font-medium text-[#A89886]">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" /> Draft
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Play Video Button */}
                        <button
                          onClick={() => setPlayingMovie(movie)}
                          className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all text-[11px] font-serif font-bold cursor-pointer shadow-sm ${
                            movie.masterVideoStatus === 'UPLOADED'
                              ? 'bg-[#8B181E]/40 hover:bg-[#8B181E] text-[#F5D77F] hover:text-white border border-[#D4AF37]/50'
                              : 'bg-[#1C1216] hover:bg-[#2A1720] text-[#D8C7B5] hover:text-white border border-[#381A20]'
                          }`}
                          title="Play Video from Cloudflare R2"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play</span>
                        </button>

                        {/* Direct Video Upload CTA (Upload or Replace) */}
                        {(isAdmin || isContentManager) && (
                          <button
                            onClick={() => onOpenVideoUploader(movie)}
                            className="p-1.5 rounded-lg bg-[#1C1216] hover:bg-[#8B181E] hover:text-white text-[#D8C7B5] border border-[#381A20] hover:border-[#D4AF37] transition-colors cursor-pointer"
                            title={
                              movie.masterVideoStatus === 'UPLOADED'
                                ? 'Replace Master Video on Cloudflare R2'
                                : 'Upload Master Video directly to Cloudflare R2'
                            }
                          >
                            <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
                          </button>
                        )}

                        {/* Edit metadata */}
                        {(isAdmin || isContentManager) && (
                          <button
                            onClick={() => onOpenMovieEditor(movie)}
                            className="p-1.5 rounded-lg bg-[#1C1216] hover:bg-[#2A1720] text-[#D8C7B5] hover:text-white border border-[#381A20] transition-colors cursor-pointer"
                            title="Edit Metadata"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Publish / Unpublish Toggle */}
                        {(isAdmin || isContentManager) && (
                          movie.isPublished ? (
                            <button
                              onClick={() => handleUnpublish(movie)}
                              className="px-2 py-1 rounded-lg bg-[#0B080A] hover:bg-[#1C1216] text-[#A89886] hover:text-[#F5D77F] border border-[#381A20] text-[10px] font-serif font-semibold transition-colors cursor-pointer"
                              title="Unpublish"
                            >
                              Unpublish
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePublish(movie)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-700 hover:text-white text-emerald-300 border border-emerald-600/40 text-[10px] font-serif font-bold transition-all shadow-sm cursor-pointer"
                              title="Publish Movie"
                            >
                              Publish
                            </button>
                          )
                        )}

                        {/* Archive */}
                        {(isAdmin || isContentManager) && (
                          <button
                            onClick={() => handleArchive(movie)}
                            className="p-1.5 rounded-lg bg-[#0B080A] hover:bg-[#1C1216] text-[#A89886] hover:text-white border border-[#381A20] transition-colors cursor-pointer"
                            title="Archive"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete */}
                        {(isAdmin || isContentManager) && (
                          <button
                            onClick={() => handleDelete(movie)}
                            className="p-1.5 rounded-lg bg-[#0B080A] hover:bg-red-950/60 text-[#A89886] hover:text-red-400 border border-[#381A20] hover:border-red-900/50 transition-colors cursor-pointer"
                            title="Delete Content Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID POSTER VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((movie) => (
            <div
              key={movie.id}
              className="bg-[#140D10] border border-[#381A20] rounded-2xl overflow-hidden hover:border-[#D4AF37]/60 transition-all group flex flex-col justify-between shadow-lg"
            >
              <div className="relative aspect-[2/3] bg-[#0B080A] overflow-hidden">
                {movie.posterUrl ? (
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#A89886]">
                    <Film className="w-8 h-8 text-[#D4AF37]" />
                  </div>
                )}

                {/* Hover Play Button Overlay */}
                <div
                  onClick={() => setPlayingMovie(movie)}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity cursor-pointer z-10"
                >
                  <div className="w-12 h-12 rounded-full bg-[#8B181E] text-[#F5D77F] flex items-center justify-center shadow-2xl hover:scale-110 transition-transform border border-[#D4AF37]">
                    <Play className="w-5 h-5 fill-current translate-x-0.5" />
                  </div>
                  <span className="text-[10px] font-serif font-bold text-[#F5D77F] uppercase tracking-wider bg-black/80 px-2.5 py-0.5 rounded-full border border-[#D4AF37]/50">
                    Play R2 Video
                  </span>
                </div>

                <div className="absolute top-2 left-2 z-20">{renderVideoStatusBadge(movie.masterVideoStatus)}</div>

                <div className="absolute top-2 right-2 z-20">
                  <span className="text-[10px] font-serif font-bold px-1.5 py-0.5 rounded bg-black/70 backdrop-blur text-[#F5D77F] border border-[#D4AF37]/30">
                    {movie.ageRating}
                  </span>
                </div>
              </div>

              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4
                    onClick={() => setPlayingMovie(movie)}
                    className="text-xs font-serif font-bold text-[#F5EBE1] truncate cursor-pointer hover:text-[#F5D77F] transition-colors"
                  >
                    {movie.title}
                  </h4>
                  <span className="text-[10px] text-[#A89886] block font-serif">
                    {movie.releaseYear || 2025} &bull; {movie.language}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#381A20] flex items-center justify-between">
                  <button
                    onClick={() => setPlayingMovie(movie)}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#8B181E]/30 hover:bg-[#8B181E] text-[#F5D77F] hover:text-white border border-[#D4AF37]/40 text-[10px] font-serif font-bold transition-all shadow-sm cursor-pointer"
                    title="Play Video from Cloudflare R2"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Play</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {(isAdmin || isContentManager) && (
                      <button
                        onClick={() => onOpenVideoUploader(movie)}
                        className="p-1 rounded bg-[#1C1216] hover:bg-[#8B181E] text-[#D8C7B5] hover:text-white border border-[#381A20] transition-colors cursor-pointer"
                        title="Upload Master Video"
                      >
                        <UploadCloud className="w-3 h-3 text-[#D4AF37]" />
                      </button>
                    )}
                    {(isAdmin || isContentManager) && (
                      <button
                        onClick={() => onOpenMovieEditor(movie)}
                        className="p-1 rounded bg-[#1C1216] hover:bg-[#2A1720] text-[#D8C7B5] hover:text-white border border-[#381A20] transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}
                    {(isAdmin || isContentManager) && (
                      <button
                        onClick={() => handleDelete(movie)}
                        className="p-1 rounded bg-[#1C1216] hover:bg-red-950/60 text-[#A89886] hover:text-red-400 border border-[#381A20] hover:border-red-900/50 transition-colors cursor-pointer"
                        title="Delete Content Item"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#12151f] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-base font-bold text-white">Delete Content Item</h3>
                <p className="text-xs text-slate-300">
                  Are you sure you want to permanently delete <strong className="text-white font-semibold">"{itemToDelete.title}"</strong> ({itemToDelete.type})?
                </p>
                <div className="bg-red-950/25 border border-red-900/40 rounded-xl p-3 text-left space-y-1">
                  <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold">
                    <span>This action cannot be undone</span>
                  </div>
                  <p className="text-[11px] text-red-300/80 leading-relaxed">
                    This item will be permanently removed from Content Hub & Movies, including linked cast credits, genre tags, subtitle links, and metadata.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 text-xs font-medium cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-950/50 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deleting ? 'Deleting from Database...' : 'Permanently Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal for Cloudflare R2 Video Playback */}
      <VideoPlayerModal
        movie={playingMovie}
        isOpen={!!playingMovie}
        onClose={() => setPlayingMovie(null)}
        onOpenUploader={(movie) => {
          setPlayingMovie(null);
          onOpenVideoUploader(movie);
        }}
      />
    </div>
  );
};
