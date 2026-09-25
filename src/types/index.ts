export type UserRole = 'ADMIN' | 'CONTENT_MANAGER' | 'FINANCE_MANAGER' | 'USER';

export interface User {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'ACTIVE' | 'SUSPENDED';
  avatarUrl?: string;
  createdAt?: string;
}

export type ContentType = 'MOVIE' | 'WEB_SERIES' | 'DOCUMENTARY' | 'SHORT_FILM' | 'TV_SERIES' | 'TV_SHOW';
export type VideoStatus = 'NOT_STARTED' | 'UPLOADING' | 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED';
export type AccessType = 'FREE' | 'PREMIUM' | 'RENTAL';

export interface Genre {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface Person {
  id: number;
  name: string;
  role: string;
  photoUrl?: string;
  biography?: string;
}

export interface CastCrewMember {
  personId?: number;
  name: string;
  role: string;
  characterName?: string;
  photoUrl?: string;
}

export interface MediaAsset {
  id: number;
  contentId?: number | null;
  episodeId?: number | null;
  assetType: string;
  storageProvider: string;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  fileSize: string;
  status: VideoStatus;
  etag?: string;
  downloadUrl?: string;
  isCurrent: boolean;
  createdAt: string;
}

export interface SubtitleTrack {
  id: number;
  contentId?: number;
  language: string;
  label: string;
  format: string;
  isDefault: boolean;
  isForced: boolean;
  storageKey?: string;
}

export interface AudioTrackItem {
  id: number;
  contentId?: number;
  language: string;
  label: string;
  codec: string;
  isDefault: boolean;
  storageKey?: string;
}

export interface ContentItem {
  id: number;
  type: ContentType;
  title: string;
  slug: string;
  shortDescription?: string;
  fullDescription?: string;
  releaseDate?: string;
  releaseYear?: number;
  duration?: number;
  language: string;
  country: string;
  ageRating: string;
  accessType: AccessType;
  isPublished: boolean;
  publishedAt?: string;
  masterVideoStatus: VideoStatus;
  posterUrl?: string;
  landscapeUrl?: string;
  heroUrl?: string;
  trailerUrl?: string;
  isArchived: boolean;
  genres?: Array<Genre | string | any>;
  castCrew?: CastCrewMember[];
  mediaAssets?: MediaAsset[];
  subtitles?: SubtitleTrack[];
  audioTracks?: AudioTrackItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Season {
  id: number;
  contentId: number;
  seasonNumber: number;
  title: string;
  overview?: string;
  posterUrl?: string;
  episodes?: Episode[];
}

export interface Episode {
  id: number;
  seasonId: number;
  episodeNumber: number;
  title: string;
  overview?: string;
  duration?: number;
  isPublished: boolean;
  masterVideoStatus: VideoStatus;
  createdAt: string;
}

export interface UploadProgress {
  sessionId: string;
  mediaAssetId: number;
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  percentage: number;
  speedBytesPerSec: number;
  etaSeconds: number;
  currentPart: number;
  totalParts: number;
  status: 'IDLE' | 'UPLOADING' | 'PAUSED' | 'COMPLETING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  error?: string;
}

export interface AuditLogItem {
  id: number;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  details?: string;
  createdAt: string;
}
