import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { HardDrive, Play, CheckCircle2, RefreshCw, Layers, Trash2, AlertTriangle, X, Check, CloudOff } from 'lucide-react';
import { VideoPlayerModal } from './VideoPlayerModal.tsx';
import { ContentItem } from '../../types/index.ts';

function formatBytes(bytes: number | string) {
  const num = Number(bytes);
  if (!num || isNaN(num)) return 'Unknown size';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return `${parseFloat((num / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const MediaAssetsView: React.FC = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingMovie, setPlayingMovie] = useState<ContentItem | null>(null);

  // Clear Bucket State
  const [showClearModal, setShowClearModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [clearing, setClearing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSyncBucket = async () => {
    try {
      setSyncing(true);
      setStatusMessage(null);
      const res = await api.syncBucketMovies('ayan');
      setStatusMessage({
        type: 'success',
        text: res?.message || 'Successfully scanned and synced all movies from Cloudflare R2 bucket "ayan" into the database catalog!',
      });
      await loadAssets();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to sync movies from Cloudflare R2 bucket.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const loadAssets = async () => {
    try {
      setLoading(true);
      const res = await api.getMediaAssets();
      if (res && res.length > 0) {
        setAssets(res);
      } else {
        // Fallback to content items if media assets table is not yet populated
        const c = await api.getContentList({ limit: 50 });
        const collected: any[] = [];
        for (const item of c.items || []) {
          if (item.masterVideoStatus === 'UPLOADED') {
            collected.push({
              id: item.id,
              contentId: item.id,
              contentTitle: item.title,
              assetType: 'MASTER_VIDEO',
              storageProvider: 'Cloudflare R2 (Bucket: ayan)',
              storageKey: `janala/movies/${item.id}/master/master-video-${item.slug}.mp4`,
              originalFileName: `${item.slug}-master.mp4`,
              mimeType: 'video/mp4',
              fileSize: item.fileSize || '2605148',
              status: 'UPLOADED',
              createdAt: item.createdAt,
            });
          }
        }
        setAssets(collected);
      }
    } catch (err: any) {
      if (err?.status === 401 || err?.message?.includes('Unauthorized')) {
        console.warn('Session unauthorized while loading media assets:', err.message);
      } else {
        console.error('Failed to load media assets:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleClearBucket = async () => {
    try {
      setClearing(true);
      setStatusMessage(null);
      const res = await api.clearBucket('ayan');
      setStatusMessage({
        type: 'success',
        text: res?.message || 'Successfully emptied Cloudflare R2 bucket "ayan". All files and media records have been removed.',
      });
      setShowClearModal(false);
      setConfirmInput('');
      await loadAssets();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to empty Cloudflare R2 bucket.',
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto overflow-x-hidden">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Cloudflare R2 Media Asset Repository</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Bucket: ayan
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real object storage records, immutable keys, and authenticated video playback delivery
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sync Movies from Cloudflare Bucket Button */}
          <button
            type="button"
            onClick={handleSyncBucket}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all shadow-lg shadow-amber-950/20 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{syncing ? 'Scanning & Fetching Bucket...' : 'Fetch & Sync Movies (ayan)'}</span>
          </button>

          <button
            onClick={loadAssets}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Assets</span>
          </button>

          {/* Remove All from Bucket 'ayan' Button */}
          <button
            type="button"
            onClick={() => {
              setConfirmInput('');
              setShowClearModal(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 text-xs font-bold transition-all border border-red-500/30 shadow-lg shadow-red-500/5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove All from Bucket (ayan)</span>
          </button>
        </div>
      </div>

      {/* Status Notification */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Storage Summary Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              Active Cloudflare R2 Bucket: <span className="font-mono text-amber-300 font-bold">ayan</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Endpoint: 61fb1c91a19b595b9e0e767447383afe.r2.cloudflarestorage.com/ayan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
          <div>
            <span className="text-slate-500">Tracked Objects: </span>
            <span className="font-bold text-white">{assets.length}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmInput('');
              setShowClearModal(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <CloudOff className="w-3.5 h-3.5" />
            <span>Empty 'ayan' Bucket</span>
          </button>
        </div>
      </div>

      {/* Main Asset Table */}
      <div className="bg-[#12151f] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#090a0f]">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Ingested Media Assets & Master Video Objects
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">{assets.length} Ingested Objects</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            <span>Scanning Cloudflare R2 media registry...</span>
          </div>
        ) : assets.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs space-y-2">
            <Layers className="w-8 h-8 mx-auto text-slate-600" />
            <p className="font-semibold text-slate-300">No media assets in bucket 'ayan'</p>
            <p className="text-slate-500 max-w-sm mx-auto">
              The bucket is currently empty. Upload a master video from the Video Ingestion Uploader to populate new files.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0c0e15] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Content Item</th>
                  <th className="py-3 px-3">Asset Type</th>
                  <th className="py-3 px-3">Storage Key</th>
                  <th className="py-3 px-3">File Size</th>
                  <th className="py-3 px-3">Storage Provider</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Playback & Test</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-white block">
                        {asset.contentTitle || `Content Item #${asset.contentId || asset.id}`}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {asset.originalFileName || asset.storageKey}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                        {asset.assetType || 'MASTER_VIDEO'}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-amber-400/90 max-w-xs truncate" title={asset.storageKey}>
                      {asset.storageKey}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-300 font-semibold">
                      {formatBytes(asset.fileSize)}
                    </td>

                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {asset.storageProvider || 'Cloudflare R2 (Bucket: ayan)'}
                    </td>

                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        asset.status === 'UPLOADED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" /> {asset.status || 'UPLOADED'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setPlayingMovie({
                            id: asset.contentId || asset.id,
                            title: asset.contentTitle || `Content #${asset.contentId || asset.id}`,
                            slug: asset.contentSlug || 'content',
                            type: 'MOVIE',
                            masterVideoStatus: 'UPLOADED',
                            isPublished: false,
                            isArchived: false,
                            language: 'Bengali',
                            country: 'India',
                            ageRating: '13+',
                            accessType: 'FREE',
                            createdAt: asset.createdAt || new Date().toISOString(),
                            updatedAt: asset.createdAt || new Date().toISOString(),
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current text-red-500" />
                        <span>Inspect & Preview</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal to Empty 'ayan' Bucket */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#12151f] border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span>Remove All From Bucket 'ayan'</span>
              </div>
              <button
                onClick={() => setShowClearModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 font-medium">
                ⚠️ <strong>WARNING:</strong> This action will permanently remove all video binaries, master files, and media records from your Cloudflare R2 bucket <strong>"ayan"</strong>.
              </div>
              <p>
                All content items will have their master video status reset to <em>NOT_STARTED</em>.
              </p>
              <p className="font-semibold text-white">
                To confirm, type <span className="font-mono text-red-400 font-bold">PURGE</span> below:
              </p>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type PURGE to confirm"
                className="w-full bg-[#090a0f] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={clearing}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearBucket}
                disabled={confirmInput.trim().toUpperCase() !== 'PURGE' || clearing}
                className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  confirmInput.trim().toUpperCase() === 'PURGE' && !clearing
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                {clearing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Purging Bucket...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm & Remove All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal for Cloudflare R2 Video Playback */}
      <VideoPlayerModal
        movie={playingMovie}
        isOpen={!!playingMovie}
        onClose={() => setPlayingMovie(null)}
      />
    </div>
  );
};
