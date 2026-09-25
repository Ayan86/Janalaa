import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { ContentItem, Season, Episode } from '../../types/index.ts';
import { Tv, Plus, Layers, Play, CheckCircle2, AlertCircle, UploadCloud, ChevronRight, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface SeriesManagerViewProps {
  onOpenVideoUploader: (content: ContentItem) => void;
  onPlayMovie?: (content: ContentItem) => void;
}

export const SeriesManagerView: React.FC<SeriesManagerViewProps> = ({ onOpenVideoUploader, onPlayMovie }) => {
  const { isAdmin, isContentManager } = useAuth();
  const [seriesList, setSeriesList] = useState<ContentItem[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadSeries = async () => {
    try {
      setLoading(true);
      const list = await api.getSeriesList();
      setSeriesList(list || []);
      if (list && list.length > 0) {
        const details = await api.getSeriesDetails(list[0].id);
        setSelectedSeries(details);
      } else {
        setSelectedSeries(null);
      }
    } catch (err: any) {
      if (err?.status === 401 || err?.message?.includes('Unauthorized')) {
        console.warn('Session unauthorized while loading series:', err.message);
      } else {
        console.error('Failed to load series:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeries();
  }, []);

  const handleSelectSeries = async (id: number) => {
    try {
      const details = await api.getSeriesDetails(id);
      setSelectedSeries(details);
    } catch (err) {
      console.error('Failed to get series details:', err);
    }
  };

  const handleDeleteSeries = async (series: ContentItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to permanently delete "${series.title}" and all its seasons & episodes?`)) {
      return;
    }
    try {
      setDeletingId(series.id);
      await api.deleteContent(series.id);
      setActionNotice({
        type: 'success',
        message: `"${series.title}" has been deleted.`,
      });
      const updatedList = seriesList.filter((item) => item.id !== series.id);
      setSeriesList(updatedList);
      if (selectedSeries?.id === series.id) {
        if (updatedList.length > 0) {
          handleSelectSeries(updatedList[0].id);
        } else {
          setSelectedSeries(null);
        }
      }
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Failed to delete series.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Web Series & Episodic Hub</h1>
        <p className="text-xs text-slate-400 mt-1">
          Hierarchical OTT season builder, multi-part episodes and per-episode Cloudflare R2 video ingestion
        </p>
      </div>

      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between font-serif font-medium border shadow-lg ${
            actionNotice.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
              : 'bg-red-950/60 text-red-300 border-red-800/60'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-xs opacity-70 hover:opacity-100 font-sans cursor-pointer ml-4"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Series Sidebar Selector */}
        <div className="bg-[#12151f] border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold uppercase text-slate-400">All Web Series</span>
            <span className="text-xs text-purple-400 font-mono">{seriesList.length} Active</span>
          </div>

          <div className="space-y-2">
            {seriesList.map((s) => {
              const isSelected = selectedSeries?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => handleSelectSeries(s.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 group relative ${
                    isSelected
                      ? 'bg-purple-950/30 border-purple-800/60 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="w-10 h-14 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-slate-700 relative">
                    {s.posterUrl && <img src={s.posterUrl} alt={s.title} className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate">{s.title}</h4>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {s.releaseYear} &bull; {s.accessType}
                    </span>
                  </div>

                  {/* Actions on sidebar item */}
                  <div className="flex items-center gap-1">
                    {onPlayMovie && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayMovie(s);
                        }}
                        className="p-1.5 rounded-lg bg-[#8B181E]/40 hover:bg-[#8B181E] text-[#F5D77F] hover:text-white border border-[#D4AF37]/40 transition-colors cursor-pointer"
                        title="Preview Stream"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    )}

                    {(isAdmin || isContentManager) && (
                      <button
                        onClick={(e) => handleDeleteSeries(s, e)}
                        disabled={deletingId === s.id}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/80 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-900 transition-colors cursor-pointer"
                        title="Delete Web Series"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}

                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Series Seasons & Episodes Explorer */}
        <div className="lg:col-span-2 bg-[#12151f] border border-slate-800 rounded-2xl p-6 space-y-6">
          {selectedSeries ? (
            <>
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{selectedSeries.title}</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                      {selectedSeries.accessType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">{selectedSeries.shortDescription}</p>
                </div>

                {/* Series Main Action Buttons: Preview & Delete */}
                <div className="flex items-center gap-2 shrink-0">
                  {onPlayMovie && (
                    <button
                      onClick={() => onPlayMovie(selectedSeries)}
                      className="px-3 py-1.5 rounded-lg bg-[#8B181E] hover:bg-[#A82027] text-[#F5D77F] border border-[#D4AF37]/50 text-xs font-serif font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                      title="Preview / Play Stream"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Preview</span>
                    </button>
                  )}

                  {(isAdmin || isContentManager) && (
                    <button
                      onClick={(e) => handleDeleteSeries(selectedSeries, e)}
                      disabled={deletingId === selectedSeries.id}
                      className="px-3 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-800 text-red-200 hover:text-white border border-red-800/60 text-xs font-serif font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Delete Web Series"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Seasons & Episodes Listing */}
              <div className="space-y-6">
                {selectedSeries.seasons && selectedSeries.seasons.length > 0 ? (
                  selectedSeries.seasons.map((season: Season) => (
                    <div key={season.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-purple-400" />
                          {season.title}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {season.episodes?.length || 0} Episodes Ingested
                        </span>
                      </div>

                      <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
                        {season.episodes?.map((ep: Episode) => (
                          <div
                            key={ep.id}
                            className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-400 font-mono text-[11px] flex items-center justify-center font-bold">
                                {ep.episodeNumber}
                              </span>
                              <div>
                                <h5 className="text-xs font-semibold text-white">{ep.title}</h5>
                                <span className="text-[10px] text-slate-400">{ep.duration} mins &bull; Master 4K H.264/AAC</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" /> Master on R2
                              </span>

                              {onPlayMovie && (
                                <button
                                  onClick={() =>
                                    onPlayMovie({
                                      ...selectedSeries,
                                      title: `${selectedSeries.title} - ${season.title} E${ep.episodeNumber}: ${ep.title}`,
                                    })
                                  }
                                  className="p-1.5 rounded-lg bg-[#8B181E]/30 hover:bg-[#8B181E] text-[#F5D77F] hover:text-white border border-[#D4AF37]/30 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                                  title="Preview Episode Stream"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Preview</span>
                                </button>
                              )}

                              {(isAdmin || isContentManager) && (
                                <button
                                  onClick={() => onOpenVideoUploader(selectedSeries)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 transition-colors"
                                  title="Replace Episode Master Video on Cloudflare R2"
                                >
                                  <UploadCloud className="w-3.5 h-3.5 text-[#D4AF37]" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 text-xs">No seasons added yet.</div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">Select a series to manage seasons and episodes.</div>
          )}
        </div>
      </div>
    </div>
  );
};

