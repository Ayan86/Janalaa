import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { MultipartVideoUploader } from '../../services/uploader.ts';
import { ContentItem, Genre, Person, UploadProgress, VideoStatus } from '../../types/index.ts';
import {
  X,
  Save,
  Film,
  AlertCircle,
  Plus,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Play,
  UploadCloud,
  CheckCircle2,
  ShieldAlert,
  Wand2,
  Video,
  Pause,
  Clock,
  Zap,
  Layers,
  ArrowRight,
  FileVideo,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { VideoPlayerModal } from '../media/VideoPlayerModal.tsx';
import {
  validateSlug,
  validateTextCompliance,
  validateContentPayload,
  generateSafeSlug,
} from '../../lib/termsValidation.ts';

interface MovieEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: ContentItem | null;
  onOpenVideoUploader?: (movie: ContentItem) => void;
}

export const MovieEditorModal: React.FC<MovieEditorModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialData,
  onOpenVideoUploader,
}) => {
  const { isAdmin, isContentManager } = useAuth();
  const [activeTab, setActiveTab] = useState<'details' | 'video'>('details');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [releaseYear, setReleaseYear] = useState('2026');
  const [duration, setDuration] = useState('120');
  const [language, setLanguage] = useState('Bengali');
  const [country, setCountry] = useState('Bangladesh');
  const [ageRating, setAgeRating] = useState('U/A 16+');
  const [accessType, setAccessType] = useState('PREMIUM');
  const [type, setType] = useState('MOVIE');
  const [posterUrl, setPosterUrl] = useState('');
  const [landscapeUrl, setLandscapeUrl] = useState('');
  const [heroUrl, setHeroUrl] = useState('');
  const [trailerUrl, setTrailerUrl] = useState('');
  const [masterVideoStatus, setMasterVideoStatus] = useState<VideoStatus>('NOT_STARTED');

  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingLandscape, setUploadingLandscape] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [posterNotice, setPosterNotice] = useState<string | null>(null);
  const [landscapeNotice, setLandscapeNotice] = useState<string | null>(null);
  const [heroNotice, setHeroNotice] = useState<string | null>(null);

  const [genresList, setGenresList] = useState<Genre[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>([]);

  const [peopleList, setPeopleList] = useState<Person[]>([]);
  const [castCrew, setCastCrew] = useState<Array<{ name: string; role: string; characterName?: string; personId?: number }>>([]);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  // In-modal Video Upload State
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [uploader, setUploader] = useState<MultipartVideoUploader | null>(null);
  const [videoProgress, setVideoProgress] = useState<UploadProgress | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadSuccess, setVideoUploadSuccess] = useState<string | null>(null);
  const [newContentIdCreated, setNewContentIdCreated] = useState<number | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Live compliance check computations for Reserved & Prohibited Terms
  const titleCompliance = validateTextCompliance(title, 'Title');
  const slugValidation = slug ? validateSlug(slug) : null;
  const shortDescCompliance = validateTextCompliance(shortDescription, 'Logline');
  const fullDescCompliance = validateTextCompliance(fullDescription, 'Synopsis');

  const hasComplianceErrors =
    !titleCompliance.valid ||
    (slugValidation !== null && !slugValidation.valid) ||
    !shortDescCompliance.valid ||
    !fullDescCompliance.valid;

  const handleAutoGenerateSlug = () => {
    if (!title) return;
    const safe = generateSafeSlug(title);
    setSlug(safe);
  };

  useEffect(() => {
    async function loadCatalogMeta() {
      try {
        const [gRes, pRes] = await Promise.all([api.getGenres(), api.getPeople()]);
        setGenresList(gRes || []);
        setPeopleList(pRes || []);
      } catch (err) {
        console.error('Failed to load genres or people:', err);
      }
    }
    if (isOpen) {
      loadCatalogMeta();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setSlug(initialData.slug || '');
      setShortDescription(initialData.shortDescription || '');
      setFullDescription(initialData.fullDescription || '');
      setReleaseDate(initialData.releaseDate || '');
      setReleaseYear(String(initialData.releaseYear || 2026));
      setDuration(String(initialData.duration || 120));
      setLanguage(initialData.language || 'Bengali');
      setCountry(initialData.country || 'Bangladesh');
      setAgeRating(initialData.ageRating || 'U/A 16+');
      setAccessType(initialData.accessType || 'PREMIUM');
      setType(initialData.type || 'MOVIE');
      setPosterUrl(initialData.posterUrl || '');
      setLandscapeUrl(initialData.landscapeUrl || '');
      setHeroUrl(initialData.heroUrl || '');
      setTrailerUrl(initialData.trailerUrl || '');
      setMasterVideoStatus(initialData.masterVideoStatus || 'NOT_STARTED');

      if (initialData.genres) {
        setSelectedGenreIds(initialData.genres.map((g) => g.id));
      }
      if (initialData.castCrew) {
        setCastCrew(
          initialData.castCrew.map((c) => ({
            name: c.name || '',
            role: c.role || 'Actor',
            characterName: c.characterName || '',
            personId: c.personId,
          }))
        );
      }
    } else {
      // Defaults for new movie
      setTitle('');
      setSlug('');
      setShortDescription('');
      setFullDescription('');
      setReleaseDate('2026-03-25');
      setReleaseYear('2026');
      setDuration('125');
      setLanguage('Bengali');
      setCountry('Bangladesh');
      setAgeRating('U/A 16+');
      setAccessType('PREMIUM');
      setType('MOVIE');
      setPosterUrl('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80');
      setLandscapeUrl('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80');
      setHeroUrl('https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&auto=format&fit=crop&q=80');
      setTrailerUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      setMasterVideoStatus('NOT_STARTED');
      setSelectedGenreIds([1, 2]);
      setCastCrew([]);
    }

    // Reset upload state on open
    setSelectedVideoFile(null);
    setVideoProgress(null);
    setIsUploadingVideo(false);
    setVideoUploadSuccess(null);
    setError(null);
    setSuccessMsg(null);
    setActiveTab('details');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleToggleGenre = (id: number) => {
    if (selectedGenreIds.includes(id)) {
      setSelectedGenreIds(selectedGenreIds.filter((gid) => gid !== id));
    } else {
      setSelectedGenreIds([...selectedGenreIds, id]);
    }
  };

  const handleAddCastMember = () => {
    setCastCrew([...castCrew, { name: '', role: '', characterName: '' }]);
  };

  const handleRemoveCastMember = (index: number) => {
    setCastCrew(castCrew.filter((_, i) => i !== index));
  };

  const handleUploadImageFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'poster' | 'landscape' | 'hero'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP, AVIF).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('Image file size must be under 25MB.');
      return;
    }

    if (target === 'poster') setUploadingPoster(true);
    else if (target === 'landscape') setUploadingLandscape(true);
    else if (target === 'hero') setUploadingHero(true);

    setError(null);

    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      try {
        const base64Data = uploadEvent.target?.result as string;
        const res = await api.uploadImage({
          image: base64Data,
          assetType: target,
          contentId: initialData?.id,
          slug: slug || generateSafeSlug(title || 'movie-artwork'),
          fileName: file.name,
          mimeType: file.type,
        });

        if (target === 'poster') {
          setPosterUrl(res.url);
          setPosterNotice(`Saved to folder "${res.folder || 'uploads/images/posters/'}" & linked to DB`);
          setTimeout(() => setPosterNotice(null), 6000);
        } else if (target === 'landscape') {
          setLandscapeUrl(res.url);
          setLandscapeNotice(`Saved to folder "${res.folder || 'uploads/images/landscapes/'}" & linked to DB`);
          setTimeout(() => setLandscapeNotice(null), 6000);
        } else if (target === 'hero') {
          setHeroUrl(res.url);
          setHeroNotice(`Saved to folder "${res.folder || 'uploads/images/heroes/'}" & linked to DB`);
          setTimeout(() => setHeroNotice(null), 6000);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to upload and save image to folder');
      } finally {
        if (target === 'poster') setUploadingPoster(false);
        else if (target === 'landscape') setUploadingLandscape(false);
        else if (target === 'hero') setUploadingHero(false);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  // Video File Selection Handler
  const handleSelectVideoFile = (file: File) => {
    setError(null);
    setVideoUploadSuccess(null);
    const validExtensions = ['.mp4', '.mov', '.mkv', '.webm'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setError('Invalid video file format. Cinema master video must be MP4, MOV, MKV, or WEBM.');
      return;
    }

    const maxSizeBytes = 10 * 1024 * 1024 * 1024; // 10 GB limit
    if (file.size > maxSizeBytes) {
      setError(`File size exceeds 10 GB limit (Current size: ${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB).`);
      return;
    }

    setSelectedVideoFile(file);
    setVideoProgress(null);
  };

  // Sample video payload generator for instant in-browser test streaming
  const handleGenerateSampleVideo = (sizeMb: number) => {
    setError(null);
    const currentSlug = slug || generateSafeSlug(title || 'sample-master');
    const chunkBuffer = new Uint8Array(1024 * 1024); // 1MB buffer
    for (let i = 0; i < chunkBuffer.length; i++) {
      chunkBuffer[i] = i % 256;
    }

    const blobParts: Uint8Array[] = [];
    for (let i = 0; i < sizeMb; i++) {
      blobParts.push(chunkBuffer);
    }

    const sampleBlob = new Blob(blobParts as unknown as BlobPart[], { type: 'video/mp4' });
    const sampleFile = new File([sampleBlob], `${currentSlug}-cinema-master-${sizeMb}mb.mp4`, {
      type: 'video/mp4',
    });

    handleSelectVideoFile(sampleFile);
  };

  // Core metadata save helper
  const saveMetadataDetails = async (): Promise<ContentItem | null> => {
    if (!title.trim()) {
      setError('Title is required');
      setActiveTab('details');
      return null;
    }

    if (hasComplianceErrors) {
      const errs: string[] = [];
      if (!titleCompliance.valid && titleCompliance.error) errs.push(titleCompliance.error);
      if (slugValidation && !slugValidation.valid) errs.push(...slugValidation.errors);
      if (!shortDescCompliance.valid && shortDescCompliance.error) errs.push(shortDescCompliance.error);
      if (!fullDescCompliance.valid && fullDescCompliance.error) errs.push(fullDescCompliance.error);
      setError(errs.join(' '));
      setActiveTab('details');
      return null;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      title: title.trim(),
      slug: slug ? slug.trim() : undefined,
      shortDescription,
      fullDescription,
      releaseDate: releaseDate || new Date().toISOString().split('T')[0],
      releaseYear: parseInt(releaseYear) || 2026,
      duration: parseInt(duration) || 120,
      language,
      country,
      ageRating,
      accessType,
      type,
      posterUrl,
      landscapeUrl,
      heroUrl,
      trailerUrl,
      genreIds: selectedGenreIds,
      castCrew,
    };

    try {
      let savedMovie: ContentItem;
      if (initialData?.id) {
        savedMovie = await api.updateMovie(initialData.id, payload);
      } else {
        savedMovie = await api.createMovie(payload);
      }

      setSuccessMsg(`"${savedMovie.title}" successfully saved to database.`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jaanala:content-updated', { detail: savedMovie }));
      }
      onSaved();
      return savedMovie;
    } catch (err: any) {
      setError(err.message || 'Failed to save movie');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await saveMetadataDetails();
    if (saved) {
      onClose();
    }
  };

  // Start in-modal multipart video upload
  const handleStartVideoUpload = async () => {
    if (!selectedVideoFile) {
      setError('Please select a video file or generate a sample video payload.');
      return;
    }

    let targetContentId = initialData?.id;
    let isNewTempItem = false;

    // If new unsaved movie, save metadata first to get an ID
    if (!targetContentId) {
      const saved = await saveMetadataDetails();
      if (!saved || !saved.id) return;
      targetContentId = saved.id;
      isNewTempItem = true;
      setNewContentIdCreated(saved.id);
    }

    setIsUploadingVideo(true);
    setError(null);
    setVideoUploadSuccess(null);

    const uploadContentType =
      type === 'WEB_SERIES' || type === 'TV_SHOW'
        ? 'series'
        : type === 'DOCUMENTARY'
        ? 'documentaries'
        : type === 'SHORT_FILM'
        ? 'short_films'
        : 'movies';

    const isReplacement = masterVideoStatus === 'UPLOADED' || masterVideoStatus === 'READY';

    const instance = new MultipartVideoUploader({
      file: selectedVideoFile,
      contentId: targetContentId,
      contentType: uploadContentType,
      partSize: 5 * 1024 * 1024, // 5MB chunks
      isReplacement,
      onProgress: (p) => {
        setVideoProgress({ ...p });
      },
      onComplete: (res) => {
        setIsUploadingVideo(false);
        setMasterVideoStatus('UPLOADED');
        setVideoUploadSuccess(`Master video "${selectedVideoFile.name}" successfully uploaded and linked to this title!`);
        setNewContentIdCreated(null); // successful upload, keep the metadata item
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('jaanala:content-updated'));
        }
        onSaved();
      },
      onError: async (err) => {
        setIsUploadingVideo(false);
        setError(err.message || 'Video upload failed. Please try again.');
        
        // Cleanup metadata if it was newly created specifically for this failed upload session
        if (isNewTempItem && targetContentId) {
          try {
            await api.deleteContent(targetContentId);
          } catch {}
          setNewContentIdCreated(null);
        }
      },
    });

    setUploader(instance);
    await instance.start();
  };

  const handlePauseUpload = () => {
    if (uploader) uploader.pause();
  };

  const handleResumeUpload = () => {
    if (uploader) uploader.resume();
  };

  const handleAbortUpload = async () => {
    if (uploader) {
      await uploader.abort();
      setUploader(null);
      setVideoProgress(null);
      setIsUploadingVideo(false);
      setSelectedVideoFile(null);
      
      // Cleanup metadata if this was a new item created specifically for this aborted upload session
      if (newContentIdCreated) {
        try {
          await api.deleteContent(newContentIdCreated);
        } catch {}
        setNewContentIdCreated(null);
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSec: number) => {
    const mbps = (bytesPerSec / (1024 * 1024)).toFixed(2);
    return `${mbps} MB/s`;
  };

  const formatEta = (seconds: number) => {
    if (seconds <= 0 || !isFinite(seconds)) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-[99990] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#12151f] border border-slate-800/90 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-[#090a0f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-red-950/50">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{initialData ? `Edit: ${initialData.title}` : 'Add New Title'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {type}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {initialData ? 'Update catalog metadata, master video file, artwork, and credits' : 'Create new title record with master video streaming'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs: [ Movie Details & Artwork ] vs [ Master Video & Streaming (Upload / Replace) ] */}
        <div className="px-6 border-b border-slate-800 bg-[#0c0e17] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'details'
                  ? 'border-red-500 text-white bg-red-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>1. Movie Details & Artwork</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('video')}
              className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer relative ${
                activeTab === 'video'
                  ? 'border-red-500 text-white bg-red-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
              <span>2. Master Video & Streaming</span>
              {masterVideoStatus === 'UPLOADED' || masterVideoStatus === 'READY' ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Ready
                </span>
              ) : isUploadingVideo ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 animate-pulse">
                  Uploading
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                  Upload Required
                </span>
              )}
            </button>
          </div>

          {/* Quick Play Button if video exists */}
          {initialData && (masterVideoStatus === 'UPLOADED' || masterVideoStatus === 'READY' || initialData.masterVideoStatus === 'UPLOADED') && (
            <button
              type="button"
              onClick={() => setShowPlayer(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Preview Playback</span>
            </button>
          )}
        </div>

        {/* Global Error & Success Alerts */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-950/40 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {activeTab === 'details' ? (
            /* TAB 1: METADATA & ARTWORK */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Video Status Quick Bar */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    masterVideoStatus === 'UPLOADED' || masterVideoStatus === 'READY'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}>
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">Master Cinema Video Stream:</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                        masterVideoStatus === 'UPLOADED' || masterVideoStatus === 'READY'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        {masterVideoStatus === 'UPLOADED' || masterVideoStatus === 'READY' ? 'STREAM READY (R2/S3)' : 'NO VIDEO ATTACHED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {masterVideoStatus === 'UPLOADED' || masterVideoStatus === 'READY'
                        ? 'Master cinema file is linked and ready for subscribers.'
                        : 'Upload cinema master file (MP4, MOV, MKV up to 10GB) via the Video tab.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('video')}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{masterVideoStatus === 'UPLOADED' || masterVideoStatus === 'READY' ? 'Replace / Upload Video' : 'Upload Video File'}</span>
                  </button>
                </div>
              </div>

              {/* Title & Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Content Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-[#090a0f] border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    <option value="MOVIE">Movie (Feature Film)</option>
                    <option value="WEB_SERIES">Web Series</option>
                    <option value="DOCUMENTARY">Documentary</option>
                    <option value="SHORT_FILM">Short Film</option>
                    <option value="TV_SERIES">TV Series</option>
                    <option value="TV_SHOW">TV Show (Broadcast)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Content Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (!initialData && !slug) {
                        setSlug(generateSafeSlug(e.target.value));
                      }
                    }}
                    placeholder="e.g. Shadows of the Delta"
                    className={`w-full bg-[#090a0f] border rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none ${
                      titleCompliance.hasProhibited ? 'border-red-500 focus:border-red-500' : 'border-slate-800 focus:border-red-500'
                    }`}
                  />
                  {titleCompliance.hasProhibited && (
                    <div className="mt-1.5 p-2 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-[11px] flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>
                        <strong>Prohibited term detected:</strong> [{titleCompliance.prohibitedTerms.join(', ')}].
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* URL Slug & Routing Compliance */}
              <div className="p-3.5 rounded-xl bg-[#0b0d14] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold uppercase tracking-wider text-slate-400">
                    Content URL Slug <span className="text-[10px] text-slate-500 normal-case">(Validated against Reserved & Prohibited Terms)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateSlug}
                    className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 font-medium cursor-pointer"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>Auto-Generate Safe Slug</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono text-xs select-none">/watch/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    placeholder="shadows-of-the-delta"
                    className={`flex-1 bg-[#090a0f] border rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 font-mono text-xs focus:outline-none ${
                      slugValidation?.hasProhibited
                        ? 'border-red-500 text-red-200'
                        : slugValidation?.isReserved
                        ? 'border-amber-500 text-amber-200'
                        : slug && slugValidation?.valid
                        ? 'border-emerald-500/50 text-slate-100'
                        : 'border-slate-800 focus:border-red-500'
                    }`}
                  />
                </div>

                {slugValidation && slug && (
                  <div>
                    {slugValidation.isReserved && (
                      <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-[11px] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>
                            <strong>Reserved Term:</strong> '{slugValidation.reservedTerm}' is a system routing keyword.
                          </span>
                        </div>
                        {slugValidation.suggestions.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSlug(slugValidation.suggestions[0])}
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[10px] shrink-0 cursor-pointer"
                          >
                            Use "{slugValidation.suggestions[0]}"
                          </button>
                        )}
                      </div>
                    )}

                    {!slugValidation.isReserved && !slugValidation.hasProhibited && slugValidation.valid && (
                      <div className="text-emerald-400 text-[11px] flex items-center gap-1.5 pt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Compliant and URL-safe slug: <strong>/watch/{slugValidation.value}</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Synopses */}
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Short Logline (1-2 sentences for hero banners)
                  </label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="A gripping tale of bravery and cinema..."
                    className="w-full bg-[#090a0f] border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Full Synopsis & Narrative Description
                  </label>
                  <textarea
                    rows={3}
                    value={fullDescription}
                    onChange={(e) => setFullDescription(e.target.value)}
                    placeholder="Detailed storyline..."
                    className="w-full bg-[#090a0f] border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Release & Classification Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Release Year
                  </label>
                  <input
                    type="number"
                    value={releaseYear}
                    onChange={(e) => setReleaseYear(e.target.value)}
                    className="w-full bg-[#090a0f] border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Duration (mins)
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-[#090a0f] border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-[#090a0f] border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    <option value="Bengali">Bengali</option>
                    <option value="Hindi">Hindi</option>
                    <option value="English">English</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Malayalam">Malayalam</option>
                    <option value="Multi-Audio">Multi-Audio</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Age Rating
                  </label>
                  <select
                    value={ageRating}
                    onChange={(e) => setAgeRating(e.target.value)}
                    className="w-full bg-[#090a0f] border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    <option value="U (All Ages)">U (All Ages)</option>
                    <option value="U/A 7+">U/A 7+</option>
                    <option value="U/A 13+">U/A 13+</option>
                    <option value="U/A 16+">U/A 16+</option>
                    <option value="A 18+">A 18+ (Adults Only)</option>
                  </select>
                </div>
              </div>

              {/* Genres */}
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Genres (Select multiple)
                </label>
                <div className="flex flex-wrap gap-2">
                  {genresList.map((g) => {
                    const isSelected = selectedGenreIds.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleToggleGenre(g.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-950/40'
                            : 'bg-[#090a0f] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Artwork Media Section */}
              <div className="space-y-4 pt-2 border-t border-slate-800/80">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-red-400" />
                  <span>Poster & Landscape Artwork</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Poster */}
                  <div className="p-3.5 rounded-xl bg-[#090a0f] border border-slate-800 space-y-3">
                    <label className="font-semibold uppercase tracking-wider text-slate-400 block">
                      Vertical Poster (2:3 Aspect)
                    </label>
                    <div className="aspect-[2/3] max-h-48 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden relative flex items-center justify-center">
                      {posterUrl ? (
                        <img src={posterUrl} alt="Poster" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-slate-600 text-[11px]">No Poster Uploaded</span>
                      )}
                      {uploadingPoster && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <label className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                      <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
                      <span>Upload Poster File</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingPoster}
                        onChange={(e) => handleUploadImageFile(e, 'poster')}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={posterUrl}
                      onChange={(e) => setPosterUrl(e.target.value)}
                      placeholder="Or paste image URL"
                      className="w-full bg-[#0d0e14] border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 text-[11px]"
                    />
                  </div>

                  {/* Landscape */}
                  <div className="p-3.5 rounded-xl bg-[#090a0f] border border-slate-800 space-y-3">
                    <label className="font-semibold uppercase tracking-wider text-slate-400 block">
                      Landscape Backdrop (16:9 Aspect)
                    </label>
                    <div className="aspect-video max-h-48 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden relative flex items-center justify-center">
                      {landscapeUrl ? (
                        <img src={landscapeUrl} alt="Landscape" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-slate-600 text-[11px]">No Backdrop Uploaded</span>
                      )}
                      {uploadingLandscape && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <label className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                      <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
                      <span>Upload Landscape File</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingLandscape}
                        onChange={(e) => handleUploadImageFile(e, 'landscape')}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={landscapeUrl}
                      onChange={(e) => setLandscapeUrl(e.target.value)}
                      placeholder="Or paste image URL"
                      className="w-full bg-[#0d0e14] border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Cast & Crew Tagging */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="font-semibold uppercase tracking-wider text-slate-400">
                    Cast & Crew Credits
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCastMember}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Member
                  </button>
                </div>

                <div className="space-y-2">
                  {castCrew.map((member, index) => (
                    <div key={index} className="flex flex-wrap md:flex-nowrap items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                      <input
                        type="text"
                        placeholder="Person Name"
                        value={member.name || ''}
                        onChange={(e) => {
                          const updated = [...castCrew];
                          updated[index].name = e.target.value;
                          setCastCrew(updated);
                        }}
                        className="flex-1 bg-[#090a0f] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                      />
                      <input
                        type="text"
                        placeholder="Role (e.g. Lead Actor, Director)"
                        value={member.role || ''}
                        onChange={(e) => {
                          const updated = [...castCrew];
                          updated[index].role = e.target.value;
                          setCastCrew(updated);
                        }}
                        className="w-36 bg-[#090a0f] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCastMember(index)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            /* TAB 2: MASTER VIDEO & STREAMING UPLOAD IN EDIT */
            <div className="space-y-6">
              {/* Status Header */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#171b26] to-[#12151f] border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                      <Film className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Cinema Master Video File</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                          masterVideoStatus === 'UPLOADED' || masterVideoStatus === 'READY'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {masterVideoStatus === 'UPLOADED' || masterVideoStatus === 'READY' ? 'READY & STREAMING' : 'UPLOAD REQUIRED'}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Upload or replace cinema master video directly for "{title || initialData?.title || 'This Title'}".
                      </p>
                    </div>
                  </div>

                  {initialData && (masterVideoStatus === 'UPLOADED' || masterVideoStatus === 'READY') && (
                    <button
                      type="button"
                      onClick={() => setShowPlayer(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Test Playback Stream</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Video Upload Success Notice */}
              {videoUploadSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{videoUploadSuccess}</span>
                </div>
              )}

              {/* Drag & Drop / File Selector Area */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) {
                    handleSelectVideoFile(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-6 text-center space-y-4 transition-all ${
                  selectedVideoFile
                    ? 'border-emerald-500/60 bg-emerald-950/10'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto shadow-inner">
                  <UploadCloud className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">
                    {selectedVideoFile ? selectedVideoFile.name : 'Drag & Drop Master Video File Here'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {selectedVideoFile
                      ? `File size: ${formatBytes(selectedVideoFile.size)} • Ready to upload chunk stream`
                      : 'Supported formats: MP4, MOV, MKV, WEBM (Cinema 4K/1080p, up to 10 GB)'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept=".mp4,.mov,.mkv,.webm,video/*"
                    disabled={isUploadingVideo}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleSelectVideoFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={isUploadingVideo}
                    onClick={() => videoInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                  >
                    <FileVideo className="w-4 h-4 text-red-400" />
                    <span>{selectedVideoFile ? 'Choose Different File' : 'Browse Local Video File'}</span>
                  </button>

                  {/* Quick Test Video Generators */}
                  <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 px-2 font-mono">Test Stream:</span>
                    <button
                      type="button"
                      disabled={isUploadingVideo}
                      onClick={() => handleGenerateSampleVideo(5)}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono cursor-pointer"
                    >
                      5MB
                    </button>
                    <button
                      type="button"
                      disabled={isUploadingVideo}
                      onClick={() => handleGenerateSampleVideo(25)}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono cursor-pointer"
                    >
                      25MB
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Progress & Controls */}
              {isUploadingVideo && videoProgress && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span>Uploading to Cloudflare R2 / S3 Bucket...</span>
                    </span>
                    <span className="font-mono text-red-400 font-bold text-xs">
                      {(videoProgress.percentage || 0).toFixed(1)}%
                    </span>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 transition-all duration-300 rounded-full"
                      style={{ width: `${videoProgress.percentage || 0}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-slate-400 font-mono pt-1">
                    <div>
                      <span className="text-slate-500">Chunk:</span> {videoProgress.currentPart || 0} / {videoProgress.totalParts || 1}
                    </div>
                    <div>
                      <span className="text-slate-500">Uploaded:</span> {formatBytes(videoProgress.uploadedBytes || 0)} / {formatBytes(videoProgress.fileSize || 0)}
                    </div>
                    <div>
                      <span className="text-slate-500">Speed:</span> {formatSpeed(videoProgress.speedBytesPerSec || 0)}
                    </div>
                    <div>
                      <span className="text-slate-500">ETA:</span> {formatEta(videoProgress.etaSeconds || 0)}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handlePauseUpload}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                    <button
                      type="button"
                      onClick={handleResumeUpload}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" /> Resume
                    </button>
                    <button
                      type="button"
                      onClick={handleAbortUpload}
                      className="px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 text-red-300 text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Start Upload Button */}
              {selectedVideoFile && !isUploadingVideo && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-200 text-xs font-semibold">
                      Ready to stream: <strong>{selectedVideoFile.name}</strong> ({formatBytes(selectedVideoFile.size)})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartVideoUpload}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-red-950/50 cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload & Attach Master Video</span>
                  </button>
                </div>
              )}

              {/* Standalone Fullscreen Uploader Link */}
              {initialData && onOpenVideoUploader && (
                <div className="p-4 rounded-xl bg-[#090a0f] border border-slate-800/80 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-300">Prefer dedicated Full-Screen Uploader modal?</span>
                    <p className="text-[11px] text-slate-500">
                      Launch the dedicated multi-track video uploader for advanced chunk slicing and batch encoding.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenVideoUploader(initialData);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Open Multi-Track Uploader</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-[#090a0f] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium cursor-pointer transition-colors"
            >
              Close
            </button>

            {initialData?.id && (isAdmin || isContentManager) && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={submitting || deleting || isUploadingVideo}
                className="px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 border border-red-900/60 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Title</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab === 'details' ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('video')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Go to Video Upload &rarr;</span>
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || deleting || isUploadingVideo}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-semibold shadow-lg shadow-red-950/50 flex items-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <Save className="w-4 h-4" />
                  <span>{submitting ? 'Saving to Database...' : 'Save Metadata Details'}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <span>&larr; Back to Details</span>
                </button>
                <button
                  onClick={async () => {
                    await saveMetadataDetails();
                    onClose();
                  }}
                  disabled={submitting || deleting || isUploadingVideo}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-semibold shadow-lg shadow-red-950/50 flex items-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <Save className="w-4 h-4" />
                  <span>Save & Finish</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && initialData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#12151f] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-base font-bold text-white">Delete Movie</h3>
                <p className="text-xs text-slate-300">
                  Are you sure you want to permanently delete <strong className="text-white font-semibold">"{initialData.title}"</strong>?
                </p>
                <div className="bg-red-950/25 border border-red-900/40 rounded-xl p-3 text-left space-y-1">
                  <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold">
                    <span>Irreversible Action</span>
                  </div>
                  <p className="text-[11px] text-red-300/80 leading-relaxed">
                    This will permanently delete this title from Content Hub & Movies, including linked cast & crew credits, genres, and metadata.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 text-xs font-medium cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!initialData?.id) return;
                    try {
                      setDeleting(true);
                      await api.deleteMovie(initialData.id);
                      setShowDeleteConfirm(false);
                      onSaved();
                      onClose();
                    } catch (err: any) {
                      setError(err.message || 'Failed to delete movie');
                      setShowDeleteConfirm(false);
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-950/50 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deleting ? 'Deleting...' : 'Permanently Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cloudflare R2 Video Player Modal */}
      {initialData && (
        <VideoPlayerModal
          movie={initialData}
          isOpen={showPlayer}
          onClose={() => setShowPlayer(false)}
          onOpenUploader={(movie) => {
            setShowPlayer(false);
            if (onOpenVideoUploader) onOpenVideoUploader(movie);
          }}
        />
      )}
    </div>
  );
};
