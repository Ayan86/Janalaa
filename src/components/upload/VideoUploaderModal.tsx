import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { MultipartVideoUploader } from '../../services/uploader.ts';
import { UploadProgress, ContentItem, Genre, Person, ContentType } from '../../types/index.ts';
import { validateSlug, validateTextCompliance, generateSafeSlug } from '../../lib/termsValidation.ts';
import {
  UploadCloud,
  X,
  Play,
  Pause,
  AlertCircle,
  CheckCircle2,
  FileVideo,
  Layers,
  Clock,
  Zap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Film,
  Tv,
  Video,
  Plus,
  Trash2,
  Image as ImageIcon,
  Info,
  Calendar,
  Globe,
  Tag,
  Users,
  Check,
  Save,
  FileText,
  Sliders,
  Compass,
  ChevronDown,
} from 'lucide-react';

interface VideoUploaderModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onUploadSuccess: () => void;
  preselectedContent?: ContentItem | null;
  onPreviewVideo?: (movie: ContentItem) => void;
  embedded?: boolean;
}

export const VideoUploaderModal: React.FC<VideoUploaderModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  preselectedContent,
  onPreviewVideo,
  embedded = false,
}) => {
  // Mode: 'create_new' or 'existing'
  const [targetMode, setTargetMode] = useState<'create_new' | 'existing'>('create_new');
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [targetContentId, setTargetContentId] = useState<string>('');
  const [createdContentItem, setCreatedContentItem] = useState<ContentItem | null>(null);

  // Active subtab inside uploader
  const [activeTab, setActiveTab] = useState<'metadata' | 'video'>('metadata');

  // Master Video File State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isReplacement, setIsReplacement] = useState(false);
  const [uploader, setUploader] = useState<MultipartVideoUploader | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [savingMetadata, setSavingMetadata] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Catalog Reference Lists
  const [genresList, setGenresList] = useState<Genre[]>([]);
  const [peopleList, setPeopleList] = useState<Person[]>([]);

  // Metadata Form Fields (Movie, Web Series, Documentary, Short Film, TV Show)
  const [contentType, setContentType] = useState<ContentType>('MOVIE');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [releaseDate, setReleaseDate] = useState('2026-03-25');
  const [releaseYear, setReleaseYear] = useState('2026');
  const [duration, setDuration] = useState('120');
  const [language, setLanguage] = useState('Bengali');
  const [country, setCountry] = useState('Bangladesh');
  const [ageRating, setAgeRating] = useState('U/A 13+');
  const [accessType, setAccessType] = useState<'FREE' | 'PREMIUM' | 'RENTAL'>('PREMIUM');
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>([1, 2]);
  const [posterUrl, setPosterUrl] = useState(
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80'
  );
  const [landscapeUrl, setLandscapeUrl] = useState(
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80'
  );
  const [heroUrl, setHeroUrl] = useState(
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80'
  );
  const [trailerUrl, setTrailerUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [castCrew, setCastCrew] = useState<Array<{ name: string; role: string; characterName?: string; personId?: number }>>([]);

  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingLandscape, setUploadingLandscape] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [posterNotice, setPosterNotice] = useState<string | null>(null);
  const [landscapeNotice, setLandscapeNotice] = useState<string | null>(null);
  const [heroNotice, setHeroNotice] = useState<string | null>(null);

  // Web Series / TV Show Specific Details
  const [seasonTitle, setSeasonTitle] = useState('Season 1: Origins');
  const [episodeTitle, setEpisodeTitle] = useState('Episode 1: Pilot');
  const [episodeOverview, setEpisodeOverview] = useState('');

  // Documentary Specific Details
  const [docuSubject, setDocuSubject] = useState('');
  const [docuResearcher, setDocuResearcher] = useState('');
  const [aspectRatio, setAspectRatio] = useState('2.39:1 Scope');

  // Short Film Specific Details
  const [shortFilmFestival, setShortFilmFestival] = useState('');
  const [shortFilmNotes, setShortFilmNotes] = useState('');

  // Compliance Validations
  const titleCompliance = validateTextCompliance(title, 'Title');
  const slugValidation = slug ? validateSlug(slug) : null;
  const shortDescCompliance = validateTextCompliance(shortDescription, 'Logline');
  const fullDescCompliance = validateTextCompliance(fullDescription, 'Synopsis');

  const hasComplianceErrors =
    !titleCompliance.valid ||
    (slugValidation !== null && !slugValidation.valid) ||
    !shortDescCompliance.valid ||
    !fullDescCompliance.valid;

  // Presets helper for poster images & default duration
  const applyPresetArtwork = (type: ContentType) => {
    if (type === 'WEB_SERIES') {
      setPosterUrl('https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop&q=80');
      setLandscapeUrl('https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=1200&auto=format&fit=crop&q=80');
      setHeroUrl('https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1600&auto=format&fit=crop&q=80');
      setDuration('45');
    } else if (type === 'TV_SHOW') {
      setPosterUrl('https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=600&auto=format&fit=crop&q=80');
      setLandscapeUrl('https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&auto=format&fit=crop&q=80');
      setHeroUrl('https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=1600&auto=format&fit=crop&q=80');
      setDuration('40');
    } else if (type === 'DOCUMENTARY') {
      setPosterUrl('https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?w=600&auto=format&fit=crop&q=80');
      setLandscapeUrl('https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200&auto=format&fit=crop&q=80');
      setHeroUrl('https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&auto=format&fit=crop&q=80');
      setDuration('85');
    } else if (type === 'SHORT_FILM') {
      setPosterUrl('https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop&q=80');
      setLandscapeUrl('https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&auto=format&fit=crop&q=80');
      setHeroUrl('https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1600&auto=format&fit=crop&q=80');
      setDuration('20');
    } else {
      // MOVIE
      setPosterUrl('https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80');
      setLandscapeUrl('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80');
      setHeroUrl('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80');
      setDuration('120');
    }
  };

  const handleContentTypeChange = (newType: ContentType) => {
    setContentType(newType);
    applyPresetArtwork(newType);
  };

  // Populate form from existing ContentItem
  const populateFromContentItem = (item: ContentItem) => {
    setContentType(item.type || 'MOVIE');
    setTitle(item.title || '');
    setSlug(item.slug || '');
    setShortDescription(item.shortDescription || '');
    setFullDescription(item.fullDescription || '');
    setReleaseDate(item.releaseDate || '2026-03-25');
    setReleaseYear(String(item.releaseYear || 2026));
    setDuration(String(item.duration || 120));
    setLanguage(item.language || 'Bengali');
    setCountry(item.country || 'Bangladesh');
    setAgeRating(item.ageRating || 'U/A 13+');
    setAccessType(item.accessType || 'PREMIUM');
    setPosterUrl(item.posterUrl || '');
    setLandscapeUrl(item.landscapeUrl || '');
    setHeroUrl(item.heroUrl || '');
    setTrailerUrl(item.trailerUrl || '');
    if (item.genres && item.genres.length > 0) {
      setSelectedGenreIds(item.genres.map((g) => g.id));
    }
    if (item.castCrew && item.castCrew.length > 0) {
      setCastCrew(
        item.castCrew.map((c) => ({
          name: c.name || '',
          role: c.role || 'Actor',
          characterName: c.characterName || '',
          personId: c.personId,
        }))
      );
    }
    setIsReplacement(item.masterVideoStatus === 'UPLOADED');
  };

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [contentRes, genresRes, peopleRes] = await Promise.all([
          api.getContentList({ limit: 100 }),
          api.getGenres(),
          api.getPeople(),
        ]);
        setContentList(contentRes.items || []);
        setGenresList(genresRes || []);
        setPeopleList(peopleRes || []);

        if (preselectedContent?.id) {
          setTargetMode('existing');
          setTargetContentId(String(preselectedContent.id));
          populateFromContentItem(preselectedContent);
          setActiveTab('video'); // If launched from a specific item card, prioritize video tab
        } else {
          setTargetMode('create_new');
          setActiveTab('metadata');
          if (contentRes.items && contentRes.items.length > 0) {
            setTargetContentId(String(contentRes.items[0].id));
          }
        }
      } catch (err) {
        console.error('Failed to load initial data for uploader:', err);
      }
    }

    if (isOpen) {
      loadInitialData();
      setError(null);
      setSuccessMsg(null);
      setIsCompleted(false);
      setProgress(null);
    }
  }, [isOpen, preselectedContent]);

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

  const handleImageFileUpload = async (
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
        const dataUrl = uploadEvent.target?.result as string;
        const res = await api.uploadImage({
          image: dataUrl,
          assetType: target,
          contentId: preselectedContent?.id,
          slug: slug || generateSafeSlug(title || 'content-artwork'),
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

  const handleAutoGenerateSlug = () => {
    if (!title) return;
    const safe = generateSafeSlug(title);
    setSlug(safe);
  };

  const handleFileSelect = (file: File) => {
    setError(null);
    const validExtensions = ['.mp4', '.mov', '.mkv', '.webm'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setError('Invalid file format. Master video must be MP4, MOV, MKV, or WEBM.');
      return;
    }

    const maxSizeBytes = 10 * 1024 * 1024 * 1024; // 10 GB limit
    if (file.size > maxSizeBytes) {
      setError(`File size exceeds 10 GB limit (Current size: ${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB).`);
      return;
    }

    setSelectedFile(file);
    setIsCompleted(false);
    setProgress(null);
  };

  // Quick generator for testing real chunk slicing & multipart uploads in the browser
  const handleGenerateSampleVideo = (sizeMb: number) => {
    setError(null);
    const currentSlug = slug || generateSafeSlug(title || 'sample-master');
    const totalBytes = sizeMb * 1024 * 1024;
    const chunkBuffer = new Uint8Array(1024 * 1024); // 1MB buffer
    for (let i = 0; i < chunkBuffer.length; i++) {
      chunkBuffer[i] = i % 256;
    }

    const blobParts: Uint8Array[] = [];
    for (let i = 0; i < sizeMb; i++) {
      blobParts.push(chunkBuffer);
    }

    const sampleBlob = new Blob(blobParts as unknown as BlobPart[], { type: 'video/mp4' });
    const sampleFile = new File([sampleBlob], `${currentSlug}-master-stream-${sizeMb}mb.mp4`, {
      type: 'video/mp4',
    });

    handleFileSelect(sampleFile);
  };

  // Persist or save metadata to Cloud SQL
  const saveMetadataDetails = async (): Promise<ContentItem | null> => {
    if (!title.trim()) {
      setError('Title is required. Please fill in the content title in Step 1 (Metadata).');
      setActiveTab('metadata');
      return null;
    }

    if (hasComplianceErrors) {
      const errs: string[] = [];
      if (!titleCompliance.valid && titleCompliance.error) errs.push(titleCompliance.error);
      if (slugValidation && !slugValidation.valid) errs.push(...slugValidation.errors);
      if (!shortDescCompliance.valid && shortDescCompliance.error) errs.push(shortDescCompliance.error);
      if (!fullDescCompliance.valid && fullDescCompliance.error) errs.push(fullDescCompliance.error);
      setError(errs.join(' '));
      setActiveTab('metadata');
      return null;
    }

    setSavingMetadata(true);
    setError(null);

    // Build payload with clean fallbacks for all optional fields
    const payload = {
      title: title.trim(),
      slug: slug ? slug.trim() : undefined,
      shortDescription: shortDescription || '',
      fullDescription:
        contentType === 'DOCUMENTARY' && docuSubject
          ? `${fullDescription || ''}\n\n[Focus: ${docuSubject} | Lead: ${docuResearcher || 'Documentary Research Team'}]`
          : contentType === 'SHORT_FILM' && shortFilmFestival
          ? `${fullDescription || ''}\n\n[Festival Circuit: ${shortFilmFestival}${shortFilmNotes ? ` | Note: ${shortFilmNotes}` : ''}]`
          : fullDescription || '',
      releaseDate: releaseDate || new Date().toISOString().split('T')[0],
      releaseYear: parseInt(releaseYear) || 2026,
      duration: parseInt(duration) || 120,
      language: language || 'Bengali',
      country: country || 'Bangladesh',
      ageRating: ageRating || 'U/A 13+',
      accessType: accessType || 'PREMIUM',
      type: contentType || 'MOVIE',
      posterUrl: posterUrl || '',
      landscapeUrl: landscapeUrl || '',
      heroUrl: heroUrl || '',
      trailerUrl: trailerUrl || '',
      genreIds: selectedGenreIds,
      castCrew,
      // Web Series / TV Show initial season / episode
      seasonTitle: contentType === 'WEB_SERIES' || contentType === 'TV_SHOW' ? (seasonTitle || 'Season 1') : undefined,
      episodeTitle: contentType === 'WEB_SERIES' || contentType === 'TV_SHOW' ? (episodeTitle || 'Episode 1: Pilot') : undefined,
      episodeOverview: contentType === 'WEB_SERIES' || contentType === 'TV_SHOW' ? episodeOverview : undefined,
    };

    try {
      if (targetMode === 'existing' && targetContentId) {
        const updated = await api.updateMovie(parseInt(targetContentId), payload);
        setSuccessMsg(`"${title}" metadata saved & catalog updated successfully.`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('jaanala:content-updated', { detail: updated }));
        }
        onUploadSuccess?.();
        return updated;
      } else {
        const created = await api.createMovie(payload);
        setCreatedContentItem(created);
        setTargetContentId(String(created.id));
        setTargetMode('existing');
        setSuccessMsg(`New ${contentType.replace('_', ' ')} "${created.title}" successfully created in database.`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('jaanala:content-updated', { detail: created }));
        }
        onUploadSuccess?.();
        return created;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save content details');
      return null;
    } finally {
      setSavingMetadata(false);
    }
  };

  const handleSaveDetailsOnly = async () => {
    const saved = await saveMetadataDetails();
    if (saved) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jaanala:content-updated', { detail: saved }));
      }
      onUploadSuccess?.();
    }
  };

  const handleSaveAndProceedToVideo = async () => {
    if (!title.trim()) {
      setError('Title is required. Please enter the content title in Step 1 (Metadata) before proceeding to video upload.');
      setActiveTab('metadata');
      return;
    }
    const saved = await saveMetadataDetails();
    if (saved) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jaanala:content-updated', { detail: saved }));
      }
      onUploadSuccess?.();
      setActiveTab('video');
    }
  };

  // Upload Trigger: Validates metadata & saves it, then starts multipart streaming
  const handleStartUpload = async () => {
    if (!selectedFile) {
      setError('Please select a cinema master video file or generate a test video payload.');
      setActiveTab('video');
      return;
    }

    let activeContentId: number | undefined;

    if (targetMode === 'create_new') {
      const savedItem = await saveMetadataDetails();
      if (!savedItem || !savedItem.id) {
        return; // Validation failed, errors already set
      }
      activeContentId = savedItem.id;
    } else {
      if (!targetContentId) {
        setError('Please select an existing catalog item or switch to "Create New Title".');
        return;
      }
      // Optionally update metadata if modified
      if (title.trim()) {
        await saveMetadataDetails();
      }
      activeContentId = parseInt(targetContentId);
    }

    setError(null);
    setIsCompleted(false);

    // Map ContentType to uploader uploadType
    const uploadContentType =
      contentType === 'WEB_SERIES' || contentType === 'TV_SHOW'
        ? 'series'
        : contentType === 'DOCUMENTARY'
        ? 'documentaries'
        : contentType === 'SHORT_FILM'
        ? 'short_films'
        : 'movies';

    const instance = new MultipartVideoUploader({
      file: selectedFile,
      contentId: activeContentId,
      contentType: uploadContentType,
      partSize: 5 * 1024 * 1024, // 5MB chunks for smooth responsive progress
      isReplacement,
      onProgress: (p) => {
        setProgress({ ...p });
      },
      onComplete: (res) => {
        setIsCompleted(true);
        onUploadSuccess();
      },
      onError: (err) => {
        setError(err.message || 'Upload failed');
      },
    });

    setUploader(instance);
    await instance.start();
  };

  const handlePause = () => {
    if (uploader) uploader.pause();
  };

  const handleResume = () => {
    if (uploader) uploader.resume();
  };

  const handleAbort = async () => {
    if (uploader) {
      await uploader.abort();
      setUploader(null);
      setProgress(null);
      setSelectedFile(null);
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
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#12151f] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[96vh] sm:max-h-[94vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800/80 flex items-center justify-between bg-[#090a0f] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-xl bg-gradient-to-br from-red-600/20 to-rose-600/10 text-red-500 border border-red-500/20 flex items-center justify-center shadow-inner shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white leading-tight truncate">Master Video Ingestion</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-950/60 text-red-400 border border-red-900/50 shrink-0">
                  R2 Direct
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
                Add Movie/Series metadata & stream master video directly to Cloudflare R2
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={() => onClose()}
              disabled={progress?.status === 'UPLOADING'}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40 shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Target Mode Switcher & Tab Navigation */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#0d101a] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 sm:gap-3 shrink-0">
          {/* Target Mode Segment */}
          <div className="flex items-center bg-[#07090e] p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setTargetMode('create_new');
                setActiveTab('metadata');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                targetMode === 'create_new'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create New Title</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetMode('existing');
                if (!targetContentId && contentList.length > 0) {
                  setTargetContentId(String(contentList[0].id));
                  populateFromContentItem(contentList[0]);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                targetMode === 'existing'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Attach to Existing Title</span>
            </button>
          </div>

          {/* Workflow Tabs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('metadata')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                activeTab === 'metadata'
                  ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span>1. Metadata Details ({contentType.replace('_', ' ')})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (targetMode === 'create_new' && !createdContentItem && !title.trim()) {
                  setError('Please enter the Content Title in Step 1 (Metadata) first to register the title before uploading master video.');
                  setActiveTab('metadata');
                  return;
                }
                setActiveTab('video');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                activeTab === 'video'
                  ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <FileVideo className="w-3.5 h-3.5 text-blue-400" />
              <span>2. Master Video & Upload</span>
              {selectedFile && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-[#12151f]">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/50 flex items-start gap-3 text-red-200 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Notice</span>
                {error}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-start gap-3 text-emerald-200 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Success</span>
                {successMsg}
              </div>
            </div>
          )}

          {/* Success Screen When Upload Finished */}
          {isCompleted ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">Master Video Ingestion & Metadata Complete</h4>
                <p className="text-xs text-slate-400 max-w-lg mx-auto">
                  Binary video chunks verified and assembled in Cloudflare R2 bucket. Content item{' '}
                  <strong className="text-white font-semibold">"{title}"</strong> status updated to{' '}
                  <span className="text-emerald-400 font-semibold font-mono">UPLOADED</span>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs max-w-lg mx-auto space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Content Title:</span>
                  <span className="text-slate-200 font-semibold">{title} ({contentType})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">File Name:</span>
                  <span className="text-slate-200 font-mono">{selectedFile?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">File Size:</span>
                  <span className="text-slate-200">{formatBytes(selectedFile?.size || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Storage Destination:</span>
                  <span className="text-amber-400 font-semibold">Cloudflare R2 Object Storage</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap justify-center gap-3">
                {onPreviewVideo && (
                  <button
                    onClick={() => {
                      const target =
                        createdContentItem ||
                        contentList.find((c) => String(c.id) === targetContentId) ||
                        preselectedContent;
                      if (target) {
                        onClose?.();
                        onPreviewVideo(target);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-semibold transition-all shadow-md shadow-red-950/50 flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Preview Uploaded Master Video Now</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsCompleted(false);
                    setSelectedFile(null);
                    setProgress(null);
                    setSuccessMsg(null);
                    setActiveTab('metadata');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                >
                  Upload Another Master Video
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : progress && progress.status !== 'IDLE' ? (
            /* Active Progress Screen */
            <div className="space-y-6 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileVideo className="w-8 h-8 text-red-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white truncate max-w-md">{progress.fileName}</h4>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      <span>{formatBytes(progress.fileSize)}</span>
                      <span>&bull;</span>
                      <span>Target: <strong className="text-white">{title || 'Content Item'}</strong> ({contentType})</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-3xl font-bold text-white font-mono">{progress.percentage}%</span>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">
                    Chunk Part {progress.currentPart} of {progress.totalParts}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="w-full h-3.5 rounded-full bg-slate-800 overflow-hidden relative">
                  <div
                    className={`h-full transition-all duration-300 ${
                      progress.status === 'PAUSED'
                        ? 'bg-amber-500'
                        : progress.status === 'COMPLETING'
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500'
                    }`}
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>
                    {formatBytes(progress.uploadedBytes)} of {formatBytes(progress.fileSize)}
                  </span>
                  <span>
                    Status: <strong className="text-slate-200">{progress.status}</strong>
                  </span>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-[10px] font-semibold uppercase text-slate-500 flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" /> Transfer Speed
                  </div>
                  <div className="text-sm font-bold text-white font-mono mt-1">
                    {formatSpeed(progress.speedBytesPerSec)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-[10px] font-semibold uppercase text-slate-500 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-blue-400" /> Time Remaining
                  </div>
                  <div className="text-sm font-bold text-white font-mono mt-1">
                    {formatEta(progress.etaSeconds)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-[10px] font-semibold uppercase text-slate-500 flex items-center justify-center gap-1">
                    <Layers className="w-3 h-3 text-purple-400" /> S3 Chunk Size
                  </div>
                  <div className="text-sm font-bold text-white font-mono mt-1">5 MB / Part</div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleAbort}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-red-950/40 text-red-400 border border-red-900/30 hover:border-red-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel & Abort R2 Session
                </button>

                <div className="flex items-center gap-2">
                  {progress.status === 'PAUSED' ? (
                    <button
                      type="button"
                      onClick={handleResume}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Resume Upload
                    </button>
                  ) : progress.status === 'UPLOADING' ? (
                    <button
                      type="button"
                      onClick={handlePause}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : activeTab === 'metadata' ? (
            /* TAB 1: TITLE DETAILS (MOVIE, WEB SERIES, DOCUMENTARY) */
            <div className="space-y-6">
              {/* Existing Item Selector (when in existing mode) */}
              {targetMode === 'existing' && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Select Target Catalog Item to Update & Attach Master Video
                  </label>
                  <select
                    value={targetContentId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setTargetContentId(selId);
                      const found = contentList.find((c) => String(c.id) === selId);
                      if (found) populateFromContentItem(found);
                    }}
                    className="w-full bg-[#090a0f] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    {contentList.map((c, idx) => (
                      <option key={`target-content-opt-${c.id || idx}-${idx}`} value={c.id}>
                        [{c.type}] {c.title} — (Video Status: {c.masterVideoStatus})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Content Type Selector: Dropdown List */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <label
                      htmlFor="content-archetype-dropdown"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-200"
                    >
                      Select Content Archetype / Category <span className="text-red-400">*</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Choose category format to apply OTT streaming architecture, catalog routing and defaults
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-950/60 text-red-300 border border-red-800/60 self-start sm:self-auto">
                    {contentType === 'MOVIE' && <Film className="w-3.5 h-3.5 text-red-400" />}
                    {(contentType === 'WEB_SERIES' || contentType === 'TV_SHOW') && <Tv className="w-3.5 h-3.5 text-red-400" />}
                    {contentType === 'DOCUMENTARY' && <Compass className="w-3.5 h-3.5 text-red-400" />}
                    {contentType === 'SHORT_FILM' && <Video className="w-3.5 h-3.5 text-red-400" />}
                    <span>{contentType.replace('_', ' ')}</span>
                  </span>
                </div>

                <div className="relative">
                  <select
                    id="content-archetype-dropdown"
                    value={contentType}
                    onChange={(e) => handleContentTypeChange(e.target.value as ContentType)}
                    className="w-full appearance-none bg-[#07090f] border border-slate-700 hover:border-slate-600 focus:border-red-500 rounded-xl px-4 py-3 text-xs font-semibold text-white focus:outline-none transition-all cursor-pointer pr-10 shadow-inner"
                  >
                    <option value="MOVIE">Movie (Feature Cinema Film)</option>
                    <option value="WEB_SERIES">Web Series (Episodic OTT Streaming Series)</option>
                    <option value="DOCUMENTARY">Documentary (Non-fiction, Investigation & Archival)</option>
                    <option value="SHORT_FILM">Short Film (Short Format Narrative Cinema)</option>
                    <option value="TV_SHOW">TV Show (Television Broadcast & Serial Episodes)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* Archetype Description & Quick Preset Trigger */}
                <div className="p-3 rounded-lg bg-[#0c0f18] border border-slate-800/80 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      {contentType === 'MOVIE' && <Film className="w-3.5 h-3.5" />}
                      {(contentType === 'WEB_SERIES' || contentType === 'TV_SHOW') && <Tv className="w-3.5 h-3.5" />}
                      {contentType === 'DOCUMENTARY' && <Compass className="w-3.5 h-3.5" />}
                      {contentType === 'SHORT_FILM' && <Video className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200">
                        {contentType === 'MOVIE' && 'Cinema Feature Film Archetype'}
                        {contentType === 'WEB_SERIES' && 'Web Series Archetype'}
                        {contentType === 'DOCUMENTARY' && 'Documentary Archetype'}
                        {contentType === 'SHORT_FILM' && 'Short Film Archetype'}
                        {contentType === 'TV_SHOW' && 'Television Show Archetype'}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {contentType === 'MOVIE' && 'Single full-length cinema master with theatrical release metadata and full cast.'}
                        {contentType === 'WEB_SERIES' && 'Multi-season episodic release with automated Season 1 and Pilot episode target for master video ingestion.'}
                        {contentType === 'DOCUMENTARY' && 'Non-fiction investigative piece with subject tracking, research credits, and archival documentation.'}
                        {contentType === 'SHORT_FILM' && 'Compact narrative cinema format with festival circuit showcase metadata.'}
                        {contentType === 'TV_SHOW' && 'Broadcast episodic television serial with automated Season 1, episode numbers, and programming specs.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyPresetArtwork(contentType)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700/60 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                    title="Reset artwork and runtime presets for this category"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Reset Presets</span>
                  </button>
                </div>
              </div>

              {/* Title & Slug */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Content Title</span>
                      <span className="text-red-400 font-bold">* (Required)</span>
                    </label>
                    <span className="text-[10px] text-slate-500">{title.length}/100</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (!slug) setSlug(generateSafeSlug(e.target.value));
                    }}
                    placeholder={
                      contentType === 'WEB_SERIES'
                        ? 'e.g. Dhaka Metro Chronicles'
                        : contentType === 'TV_SHOW'
                        ? 'e.g. Crime Patrol Bangladesh'
                        : contentType === 'DOCUMENTARY'
                        ? 'e.g. Liberation 1971: The Untold Truth'
                        : contentType === 'SHORT_FILM'
                        ? 'e.g. The Last Rickshaw Puller'
                        : 'e.g. Priyotoma - Director Cut'
                    }
                    className="w-full bg-[#090a0f] border border-slate-700 hover:border-slate-600 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 font-medium"
                  />
                  {!titleCompliance.valid && (
                    <p className="text-[10px] text-red-400">{titleCompliance.error}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      URL Slug / Identifier <span className="text-slate-500 text-[10px] font-normal">(Optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateSlug}
                      className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Auto-Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. dhaka-metro-chronicles-2026"
                    className="w-full bg-[#090a0f] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 font-mono"
                  />
                  {slugValidation && !slugValidation.valid && (
                    <p className="text-[10px] text-red-400">{slugValidation.errors.join(' ')}</p>
                  )}
                </div>
              </div>

              {/* Logline & Synopsis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Logline / Short Hook <span className="text-slate-500 text-[10px] font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="A gripping one-sentence hook summarizing the premise (optional)..."
                    className="w-full bg-[#090a0f] border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Full Synopsis & Storyline <span className="text-slate-500 text-[10px] font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={fullDescription}
                    onChange={(e) => setFullDescription(e.target.value)}
                    placeholder="Comprehensive plot overview, narrative arc, or background (optional)..."
                    className="w-full bg-[#090a0f] border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>
              </div>

              {/* Web Series & TV Show Episodic Fields */}
              {(contentType === 'WEB_SERIES' || contentType === 'TV_SHOW') && (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Tv className="w-4 h-4 text-red-400" />
                    <span>
                      {contentType === 'TV_SHOW'
                        ? 'TV Show Episode & Broadcast Ingestion Specs'
                        : 'Web Series Episode Ingestion Specs'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">Season Title</label>
                      <input
                        type="text"
                        value={seasonTitle}
                        onChange={(e) => setSeasonTitle(e.target.value)}
                        placeholder="Season 1: Origins"
                        className="w-full bg-[#090a0f] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">Episode Title (Master Stream Target)</label>
                      <input
                        type="text"
                        value={episodeTitle}
                        onChange={(e) => setEpisodeTitle(e.target.value)}
                        placeholder="Episode 1: Pilot"
                        className="w-full bg-[#090a0f] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">Episode Synopsis</label>
                    <input
                      type="text"
                      value={episodeOverview}
                      onChange={(e) => setEpisodeOverview(e.target.value)}
                      placeholder="Brief overview of this specific episode..."
                      className="w-full bg-[#090a0f] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              {/* Documentary Specific Fields */}
              {contentType === 'DOCUMENTARY' && (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Compass className="w-4 h-4 text-red-400" />
                    <span>Documentary Subject & Investigative Focus</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">Subject / Theme</label>
                      <input
                        type="text"
                        value={docuSubject}
                        onChange={(e) => setDocuSubject(e.target.value)}
                        placeholder="e.g. Wildlife Conservation & Climate Migration"
                        className="w-full bg-[#090a0f] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">Lead Researcher / Archival Source</label>
                      <input
                        type="text"
                        value={docuResearcher}
                        onChange={(e) => setDocuResearcher(e.target.value)}
                        placeholder="e.g. National Archive of Bangladesh"
                        className="w-full bg-[#090a0f] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Short Film Specific Fields */}
              {contentType === 'SHORT_FILM' && (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Video className="w-4 h-4 text-red-400" />
                    <span>Short Film Festival & Premiere Details</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Festival Circuit / Premiere Location
                      </label>
                      <input
                        type="text"
                        value={shortFilmFestival}
                        onChange={(e) => setShortFilmFestival(e.target.value)}
                        placeholder="e.g. Dhaka International Film Festival (DIFF 2026)"
                        className="w-full bg-[#090a0f] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Director Statement / Exhibition Note
                      </label>
                      <input
                        type="text"
                        value={shortFilmNotes}
                        onChange={(e) => setShortFilmNotes(e.target.value)}
                        placeholder="e.g. Official Selection in Short Narrative Competition"
                        className="w-full bg-[#090a0f] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Broadcast & Metadata Specifications */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    Broadcast & Release Parameters <span className="text-slate-500 text-[10px] font-normal">(Optional)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Global OTT Standards</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Release Year <span className="text-slate-500 text-[10px] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      value={releaseYear}
                      onChange={(e) => setReleaseYear(e.target.value)}
                      className="w-full bg-[#090a0f] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Runtime (Minutes) <span className="text-slate-500 text-[10px] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-[#090a0f] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Primary Audio <span className="text-slate-500 text-[10px] font-normal">(Optional)</span>
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-[#090a0f] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value="Bengali">Bengali</option>
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Spanish">Spanish</option>
                      <option value="Arabic">Arabic</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Maturity Rating <span className="text-slate-500 text-[10px] font-normal">(Optional)</span>
                    </label>
                    <select
                      value={ageRating}
                      onChange={(e) => setAgeRating(e.target.value)}
                      className="w-full bg-[#090a0f] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value="U">U (All Ages)</option>
                      <option value="U/A 7+">U/A 7+</option>
                      <option value="U/A 13+">U/A 13+</option>
                      <option value="U/A 16+">U/A 16+</option>
                      <option value="A 18+">A 18+ (Adults Only)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Monetization Access <span className="text-slate-500 text-[10px] font-normal">(Optional)</span>
                    </label>
                    <select
                      value={accessType}
                      onChange={(e) => setAccessType(e.target.value as any)}
                      className="w-full bg-[#090a0f] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value="PREMIUM">PREMIUM (Subscriber Only)</option>
                      <option value="FREE">FREE (Ad-Supported)</option>
                      <option value="RENTAL">RENTAL (Pay-Per-View)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Country of Origin <span className="text-slate-500 text-[10px] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-[#090a0f] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Release Date <span className="text-slate-500 text-[10px] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      value={releaseDate}
                      onChange={(e) => setReleaseDate(e.target.value)}
                      className="w-full bg-[#090a0f] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Genres Picker */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-red-400" />
                  <span>Genres & Categories</span>
                  <span className="text-slate-500 text-[10px] font-normal">(Optional)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-[#090a0f] border border-slate-800">
                  {genresList.map((g, idx) => {
                    const isSelected = selectedGenreIds.includes(g.id);
                    return (
                      <button
                        key={`genre-pill-${g.id || idx}-${idx}`}
                        type="button"
                        onClick={() => handleToggleGenre(g.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{g.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cast & Crew */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>Key Cast, Director & Crew Credits</span>
                    <span className="text-slate-500 text-[10px] font-normal">(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCastMember}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Member
                  </button>
                </div>

                {castCrew.length === 0 ? (
                  <div className="p-3 rounded-xl bg-[#090a0f] border border-slate-800/80 text-center text-xs text-slate-500">
                    No cast or crew members added yet. Click "+ Add Member" to manually enter actors, directors, writers, or crew.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {castCrew.map((member, idx) => (
                      <div
                        key={`cast-member-${idx}-${member.name || 'new'}`}
                        className="flex flex-wrap md:flex-nowrap items-center gap-2 p-2.5 rounded-xl bg-[#090a0f] border border-slate-800"
                      >
                        <input
                          type="text"
                          value={member.name || ''}
                          onChange={(e) => {
                            const updated = [...castCrew];
                            updated[idx].name = e.target.value;
                            setCastCrew(updated);
                          }}
                          placeholder="Person Name (e.g. Ayan Sit, Parambrata Chatterjee)"
                          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white flex-1 min-w-[160px] focus:outline-none focus:border-red-500 placeholder-slate-600"
                        />

                        <input
                          type="text"
                          value={member.role || ''}
                          onChange={(e) => {
                            const updated = [...castCrew];
                            updated[idx].role = e.target.value;
                            setCastCrew(updated);
                          }}
                          placeholder="Role / Dept (e.g. Director, Lead Actor, Producer)"
                          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white w-full md:w-44 focus:outline-none focus:border-red-500 placeholder-slate-600"
                        />

                        <input
                          type="text"
                          value={member.characterName || ''}
                          onChange={(e) => {
                            const updated = [...castCrew];
                            updated[idx].characterName = e.target.value;
                            setCastCrew(updated);
                          }}
                          placeholder="Character / Role Name (optional)"
                          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white flex-1 min-w-[140px] focus:outline-none focus:border-red-500 placeholder-slate-600"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveCastMember(idx)}
                          className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Artwork & Posters File Uploads & URLs */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-serif font-bold text-white flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
                      Visual Artwork & Promotional Banners
                    </span>
                    <p className="text-[11px] text-slate-400 font-serif mt-0.5">
                      Upload local image files or provide secure URLs for all OTT responsive formats
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyPresetArtwork(contentType)}
                    className="text-[10px] text-[#D4AF37] hover:text-[#F5D77F] flex items-center gap-1 cursor-pointer font-serif font-medium bg-[#1C1216] px-2.5 py-1 rounded-lg border border-[#8B181E]/50"
                  >
                    <Sparkles className="w-3 h-3 text-[#D4AF37]" /> Apply Heritage Cinema Preset
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 1. Portrait Poster (2:3) */}
                  <div className="p-3 rounded-xl bg-[#090a0f] border border-slate-800 flex flex-col justify-between space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-serif font-bold text-[#F5D77F] block">
                        Portrait Poster (2:3)
                      </label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        Key Art / Mobile
                      </span>
                    </div>

                    {/* Preview Box */}
                    <div className="w-full aspect-[2/3] max-h-48 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden relative group flex items-center justify-center">
                      {posterUrl ? (
                        <>
                          <img
                            src={posterUrl}
                            alt="Portrait Poster Preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                            <button
                              type="button"
                              onClick={() => setPosterUrl('')}
                              className="px-2 py-1 rounded bg-red-600/80 hover:bg-red-600 text-white text-[10px] font-serif cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-3 text-center text-slate-500">
                          <ImageIcon className="w-6 h-6 mb-1 text-slate-600" />
                          <span className="text-[10px] font-serif">No Poster Selected</span>
                          <span className="text-[9px] text-slate-600">2:3 aspect ratio</span>
                        </div>
                      )}

                      {uploadingPoster && (
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
                          <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                          <span className="text-[10px] font-serif text-[#F5D77F]">Saving to /uploads/images/posters/...</span>
                        </div>
                      )}
                    </div>

                    {posterNotice && (
                      <div className="p-1.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-[10px] flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{posterNotice}</span>
                      </div>
                    )}

                    {/* File Upload Input & URL fallback */}
                    <div className="space-y-1.5">
                      <label className="w-full py-1.5 px-2.5 rounded-lg bg-[#1C1216] hover:bg-[#25151B] border border-[#8B181E]/60 hover:border-[#D4AF37] text-white text-[11px] font-serif flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm">
                        <UploadCloud className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>{uploadingPoster ? 'Uploading...' : 'Upload Poster Image File'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingPoster}
                          onChange={(e) => handleImageFileUpload(e, 'poster')}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="url"
                        value={posterUrl}
                        onChange={(e) => setPosterUrl(e.target.value)}
                        placeholder="Or paste /uploads/... or image URL"
                        className="w-full bg-[#12151f] border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-[#D4AF37] font-mono text-[10px]"
                      />
                    </div>
                  </div>

                  {/* 2. Landscape Banner (16:9) */}
                  <div className="p-3 rounded-xl bg-[#090a0f] border border-slate-800 flex flex-col justify-between space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-serif font-bold text-[#F5D77F] block">
                        Landscape Banner (16:9)
                      </label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        Desktop / Carousel
                      </span>
                    </div>

                    {/* Preview Box */}
                    <div className="w-full aspect-video max-h-48 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden relative group flex items-center justify-center">
                      {landscapeUrl ? (
                        <>
                          <img
                            src={landscapeUrl}
                            alt="Landscape Banner Preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                            <button
                              type="button"
                              onClick={() => setLandscapeUrl('')}
                              className="px-2 py-1 rounded bg-red-600/80 hover:bg-red-600 text-white text-[10px] font-serif cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-3 text-center text-slate-500">
                          <ImageIcon className="w-6 h-6 mb-1 text-slate-600" />
                          <span className="text-[10px] font-serif">No Banner Selected</span>
                          <span className="text-[9px] text-slate-600">16:9 aspect ratio</span>
                        </div>
                      )}

                      {uploadingLandscape && (
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
                          <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                          <span className="text-[10px] font-serif text-[#F5D77F]">Saving to /uploads/images/landscapes/...</span>
                        </div>
                      )}
                    </div>

                    {landscapeNotice && (
                      <div className="p-1.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-[10px] flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{landscapeNotice}</span>
                      </div>
                    )}

                    {/* File Upload Input & URL fallback */}
                    <div className="space-y-1.5">
                      <label className="w-full py-1.5 px-2.5 rounded-lg bg-[#1C1216] hover:bg-[#25151B] border border-[#8B181E]/60 hover:border-[#D4AF37] text-white text-[11px] font-serif flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm">
                        <UploadCloud className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>{uploadingLandscape ? 'Uploading...' : 'Upload Landscape Image File'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingLandscape}
                          onChange={(e) => handleImageFileUpload(e, 'landscape')}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="url"
                        value={landscapeUrl}
                        onChange={(e) => setLandscapeUrl(e.target.value)}
                        placeholder="Or paste /uploads/... or image URL"
                        className="w-full bg-[#12151f] border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-[#D4AF37] font-mono text-[10px]"
                      />
                    </div>
                  </div>

                  {/* 3. Hero Header Banner */}
                  <div className="p-3 rounded-xl bg-[#090a0f] border border-slate-800 flex flex-col justify-between space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-serif font-bold text-[#F5D77F] block">
                        Hero Header Banner
                      </label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        Billboard Spotlight
                      </span>
                    </div>

                    {/* Preview Box */}
                    <div className="w-full aspect-[21/9] max-h-48 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden relative group flex items-center justify-center">
                      {heroUrl ? (
                        <>
                          <img
                            src={heroUrl}
                            alt="Hero Header Preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                            <button
                              type="button"
                              onClick={() => setHeroUrl('')}
                              className="px-2 py-1 rounded bg-red-600/80 hover:bg-red-600 text-white text-[10px] font-serif cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-3 text-center text-slate-500">
                          <ImageIcon className="w-6 h-6 mb-1 text-slate-600" />
                          <span className="text-[10px] font-serif">No Hero Banner</span>
                          <span className="text-[9px] text-slate-600">Wide cinematic spotlight</span>
                        </div>
                      )}

                      {uploadingHero && (
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
                          <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                          <span className="text-[10px] font-serif text-[#F5D77F]">Saving to /uploads/images/heroes/...</span>
                        </div>
                      )}
                    </div>

                    {heroNotice && (
                      <div className="p-1.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-[10px] flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{heroNotice}</span>
                      </div>
                    )}

                    {/* File Upload Input & URL fallback */}
                    <div className="space-y-1.5">
                      <label className="w-full py-1.5 px-2.5 rounded-lg bg-[#1C1216] hover:bg-[#25151B] border border-[#8B181E]/60 hover:border-[#D4AF37] text-white text-[11px] font-serif flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm">
                        <UploadCloud className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>{uploadingHero ? 'Uploading...' : 'Upload Hero Image File'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingHero}
                          onChange={(e) => handleImageFileUpload(e, 'hero')}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="url"
                        value={heroUrl}
                        onChange={(e) => setHeroUrl(e.target.value)}
                        placeholder="Or paste /uploads/... or image URL"
                        className="w-full bg-[#12151f] border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-[#D4AF37] font-mono text-[10px]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Official Trailer Video URL</label>
                  <input
                    type="url"
                    value={trailerUrl}
                    onChange={(e) => setTrailerUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-[#090a0f] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Next Step Banner */}
              <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={handleSaveDetailsOnly}
                  disabled={savingMetadata || !title.trim()}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>{savingMetadata ? 'Saving Metadata...' : 'Save Metadata to Catalog'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndProceedToVideo}
                  disabled={savingMetadata || !title.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-red-950/50 cursor-pointer disabled:opacity-50"
                >
                  <span>{savingMetadata ? 'Saving...' : 'Save Metadata & Proceed to Video Upload'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* TAB 2: MASTER VIDEO FILE & R2 UPLOAD */
            <div className="space-y-5">
              {/* Summary Bar of Target Title */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
                    {contentType === 'WEB_SERIES' || contentType === 'TV_SHOW' ? (
                      <Tv className="w-4 h-4" />
                    ) : contentType === 'DOCUMENTARY' ? (
                      <Compass className="w-4 h-4" />
                    ) : contentType === 'SHORT_FILM' ? (
                      <Video className="w-4 h-4" />
                    ) : (
                      <Film className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {title || 'Untitled Draft Title'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700">
                        {contentType}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {targetMode === 'create_new'
                        ? 'New title will be registered in Cloud SQL upon upload initialization'
                        : `Attached to existing catalog item (ID: ${targetContentId})`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('metadata')}
                  className="text-xs text-red-400 hover:text-red-300 underline cursor-pointer"
                >
                  Edit Details
                </button>
              </div>

              {/* Master Video Replacement notice */}
              {isReplacement && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Master Video Replacement Active</span>
                    An active master video currently exists for this title. The existing master will remain live until
                    the new file upload is completed and verified on Cloudflare R2.
                  </div>
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-slate-800 hover:border-red-500/60 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-900/40 hover:bg-slate-900/80 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp4,.mov,.mkv,.webm,video/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-12 h-12 rounded-2xl bg-slate-800 group-hover:bg-red-500/10 text-slate-400 group-hover:text-red-400 border border-slate-700 group-hover:border-red-500/30 flex items-center justify-center mx-auto mb-3 transition-colors">
                  <UploadCloud className="w-6 h-6" />
                </div>

                <div className="text-sm font-semibold text-slate-200">
                  {selectedFile ? selectedFile.name : 'Choose Cinema Master Video File'}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Drag & drop ProRes, MP4, MOV, MKV up to 10 GB &bull; Uploads directly to Cloudflare R2 bucket
                </p>

                {selectedFile && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/60 text-xs text-red-300 font-mono">
                    <span>{formatBytes(selectedFile.size)}</span> &bull; <span>{selectedFile.type || 'video/mp4'}</span>
                  </div>
                )}
              </div>

              {/* Quick Sample Test Video Generator */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Quick Evaluator Test: In-Browser Multipart Generator
                  </span>
                  <span className="text-[10px] text-slate-500">Real Byte Slicing</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Don't have a multi-gigabyte film file on your machine? Generate real binary video payloads to inspect
                  chunk slicing, transfer metrics, and R2 multipart verification immediately:
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleGenerateSampleVideo(15)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    15 MB Master (3 Parts)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateSampleVideo(30)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    30 MB Master (6 Parts)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateSampleVideo(50)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    50 MB Master (10 Parts)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!isCompleted && (!progress || progress.status === 'IDLE') && (
          <div className="px-6 py-4 border-t border-slate-800/80 bg-[#090a0f] flex items-center justify-between shrink-0">
            {onClose && (
              <button
                onClick={() => onClose()}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveDetailsOnly}
                disabled={savingMetadata || !title.trim()}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingMetadata ? 'Saving...' : 'Save Metadata Details'}</span>
              </button>

              <button
                type="button"
                onClick={handleStartUpload}
                disabled={!selectedFile || !title.trim() || savingMetadata}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-semibold shadow-lg shadow-red-950/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Save Details & Start R2 Multipart Stream</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
