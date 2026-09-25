import React, { useState } from 'react';
import {
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Key,
  ShieldCheck,
  Film,
  X,
  Sparkles,
  Layers,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { ContentItem } from '../../types/index.ts';

interface CloudflareR2SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: (syncedMovies: ContentItem[]) => void;
}

export const CloudflareR2SyncModal: React.FC<CloudflareR2SyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [accountId, setAccountId] = useState('61fb1c91a19b595b9e0e767447383afe');
  const [bucketName, setBucketName] = useState('ayan');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [prefix, setPrefix] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      setResult(null);

      const res = await api.syncBucketMovies({
        bucketName,
        accountId,
        accessKeyId: accessKeyId.trim() || undefined,
        secretAccessKey: secretAccessKey.trim() || undefined,
        prefix: prefix.trim() || undefined,
      });

      setResult(res);
      if (res?.movies && Array.isArray(res.movies)) {
        onSyncComplete(res.movies);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to sync videos from Cloudflare R2 bucket');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveCredentialsOnly = async () => {
    try {
      setIsSaving(true);
      setError(null);
      const res = await api.updateStorageConfig({
        accountId: accountId.trim(),
        bucketName: bucketName.trim(),
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        provider: 'r2',
      });
      setResult({
        success: true,
        message: res?.message || 'Cloudflare R2 credentials saved successfully.',
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to save credentials');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#140D10] border border-[#521A22] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#381A20] flex items-center justify-between bg-gradient-to-r from-[#200E13] to-[#140D10]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8B181E]/40 border border-[#D4AF37]/50 flex items-center justify-center text-[#F5D77F]">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-serif font-bold text-[#F5EBE1]">
                  Sync Cloudflare R2 Bucket
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1E1116] text-[#D4AF37] border border-[#521A22]">
                  ayan
                </span>
              </div>
              <p className="text-xs text-[#A89886] font-serif">
                Scan and import previously uploaded master video files directly into the Dashboard
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A89886] hover:text-[#F5EBE1] hover:bg-[#1C1216] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-[#D8C7B5]">
          {/* Cloudflare Bucket Info Banner */}
          <div className="p-4 rounded-xl bg-[#1C1216] border border-[#381A20] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-serif font-bold text-[#F5EBE1] text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                Cloudflare R2 Bucket Details
              </span>
              <a
                href="https://dash.cloudflare.com/61fb1c91a19b595b9e0e767447383afe/r2/default/buckets/ayan"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D4AF37] hover:underline flex items-center gap-1 text-[11px] font-serif"
              >
                Open in Cloudflare Dash <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded bg-[#140D10] border border-[#2A1318]">
                <span className="text-[#8E7E70] block">Bucket Name:</span>
                <span className="text-[#F5D77F] font-bold">ayan</span>
              </div>
              <div className="p-2 rounded bg-[#140D10] border border-[#2A1318]">
                <span className="text-[#8E7E70] block">Account ID:</span>
                <span className="text-[#F5EBE1] truncate block">61fb1c91a19b595b9e0e767447383afe</span>
              </div>
            </div>
          </div>

          {/* Optional Credentials Form */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-serif font-bold text-[#F5EBE1] flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#D4AF37]" />
                Cloudflare R2 API Token Credentials (Optional)
              </label>
              <span className="text-[10px] text-[#8E7E70] font-serif">
                Generated from Cloudflare &gt; R2 &gt; Manage R2 API Tokens
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[#A89886] mb-1">R2 Access Key ID</label>
                <input
                  type="text"
                  placeholder="e.g. 794f4c4... (or leave empty if already in .env)"
                  value={accessKeyId}
                  onChange={(e) => setAccessKeyId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1C1216] border border-[#381A20] rounded-xl text-[#F5EBE1] text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#A89886] mb-1">R2 Secret Access Key</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••••••••••••••••"
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1C1216] border border-[#381A20] rounded-xl text-[#F5EBE1] text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-[#A89886] mb-1">Folder Prefix Filter (Optional)</label>
              <input
                type="text"
                placeholder="Leave blank to scan entire bucket, or specify e.g. janalaa/ or janalaa/videos/"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-full px-3 py-2 bg-[#1C1216] border border-[#381A20] rounded-xl text-[#F5EBE1] text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* Results feedback */}
          {result && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-serif font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {result.message || 'Sync operation completed successfully!'}
              </div>
              {result.syncedVideosCount !== undefined && (
                <div className="text-[11px] text-emerald-200/90 font-serif">
                  Identified <strong>{result.syncedVideosCount}</strong> master video file(s) across{' '}
                  <strong>{result.scannedObjectsCount || 0}</strong> scanned bucket objects.
                </div>
              )}
              {result.syncedItems && result.syncedItems.length > 0 && (
                <div className="mt-2 pt-2 border-t border-emerald-800/40 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                    Discovered Master Binaries:
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                    {result.syncedItems.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[11px] bg-black/30 px-2 py-1 rounded font-mono"
                      >
                        <span className="text-emerald-100 font-serif font-semibold">{item.title}</span>
                        <span className="text-[#8E7E70] text-[10px] truncate max-w-[200px]">{item.key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 flex items-start gap-2.5 text-red-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <div className="text-xs">
                <span className="font-serif font-bold block">Sync Notice</span>
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#381A20] bg-[#10090D] flex items-center justify-between gap-3">
          <button
            onClick={handleSaveCredentialsOnly}
            disabled={isSaving || isSyncing || (!accessKeyId && !secretAccessKey)}
            className="px-4 py-2 rounded-xl bg-[#1C1216] hover:bg-[#25151B] disabled:opacity-40 text-[#D8C7B5] text-xs font-serif font-medium border border-[#381A20] transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Keys Only'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-[#A89886] hover:text-[#F5EBE1] hover:bg-[#1C1216] text-xs font-serif font-medium transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#8B181E] to-[#A82027] hover:brightness-110 disabled:opacity-50 text-white text-xs font-serif font-bold flex items-center gap-2 border border-[#D4AF37]/50 shadow-lg cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Scanning Bucket ayan...' : 'Scan & Sync All Videos'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
