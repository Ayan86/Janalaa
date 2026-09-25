import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// 1. Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase UID or local auth ID
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  name: text('name').notNull().default('Janala Admin User'),
  role: text('role').notNull().default('ADMIN'), // ADMIN, CONTENT_MANAGER, FINANCE_MANAGER, USER
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, SUSPENDED, PENDING
  avatarUrl: text('avatar_url'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 2. Genres Table
export const genres = pgTable('genres', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. People (Cast & Crew) Table
export const people = pgTable('people', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull().default('ACTOR'), // ACTOR, DIRECTOR, PRODUCER, WRITER, CINEMATOGRAPHER, MUSIC_DIRECTOR, OTHER
  photoUrl: text('photo_url'),
  biography: text('biography'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Content Items Table (Movies, Series, TV Shows, Short Films, Documentaries)
export const contentItems = pgTable('content_items', {
  id: serial('id').primaryKey(),
  type: text('type').notNull().default('MOVIE'), // MOVIE, WEB_SERIES, TV_SHOW, SHORT_FILM, DOCUMENTARY
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  shortDescription: text('short_description'),
  fullDescription: text('full_description'),
  releaseDate: text('release_date'),
  releaseYear: integer('release_year'),
  duration: integer('duration'), // duration in minutes
  language: text('language').notNull().default('Bengali'),
  country: text('country').notNull().default('Bangladesh'),
  ageRating: text('age_rating').notNull().default('U/A 13+'),
  accessType: text('access_type').notNull().default('PREMIUM'), // FREE, PREMIUM
  isPublished: boolean('is_published').notNull().default(false),
  publishedAt: timestamp('published_at'),
  isArchived: boolean('is_archived').notNull().default(false),
  archivedAt: timestamp('archived_at'),
  posterUrl: text('poster_url'),
  landscapeUrl: text('landscape_url'),
  heroUrl: text('hero_url'),
  trailerUrl: text('trailer_url'),
  masterVideoStatus: text('master_video_status').notNull().default('NOT_STARTED'), // NOT_STARTED, UPLOADING, PAUSED, UPLOADED, PROCESSING, READY, FAILED
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 5. Content <-> Genres Junction
export const contentGenres = pgTable('content_genres', {
  id: serial('id').primaryKey(),
  contentId: integer('content_id').references(() => contentItems.id, { onDelete: 'cascade' }).notNull(),
  genreId: integer('genre_id').references(() => genres.id, { onDelete: 'cascade' }).notNull(),
});

// 6. Content <-> Cast/Crew Junction
export const contentCastCrew = pgTable('content_cast_crew', {
  id: serial('id').primaryKey(),
  contentId: integer('content_id').references(() => contentItems.id, { onDelete: 'cascade' }).notNull(),
  personId: integer('person_id').references(() => people.id, { onDelete: 'cascade' }).notNull(),
  characterName: text('character_name'),
  role: text('role').notNull().default('ACTOR'),
});

// 7. Seasons Table (for Web Series and TV Shows)
export const seasons = pgTable('seasons', {
  id: serial('id').primaryKey(),
  contentId: integer('content_id').references(() => contentItems.id, { onDelete: 'cascade' }).notNull(),
  seasonNumber: integer('season_number').notNull(),
  title: text('title').notNull(),
  overview: text('overview'),
  releaseDate: text('release_date'),
  posterUrl: text('poster_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 8. Episodes Table
export const episodes = pgTable('episodes', {
  id: serial('id').primaryKey(),
  seasonId: integer('season_id').references(() => seasons.id, { onDelete: 'cascade' }).notNull(),
  episodeNumber: integer('episode_number').notNull(),
  title: text('title').notNull(),
  overview: text('overview'),
  duration: integer('duration'),
  isPublished: boolean('is_published').notNull().default(false),
  masterVideoStatus: text('master_video_status').notNull().default('NOT_STARTED'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 9. Media Assets Table
export const mediaAssets = pgTable('media_assets', {
  id: serial('id').primaryKey(),
  contentId: integer('content_id').references(() => contentItems.id, { onDelete: 'set null' }),
  episodeId: integer('episode_id').references(() => episodes.id, { onDelete: 'set null' }),
  assetType: text('asset_type').notNull(), // MASTER_VIDEO, TRAILER, POSTER, LANDSCAPE, HERO, THUMBNAIL, SUBTITLE, AUDIO
  storageProvider: text('storage_provider').notNull().default('r2'), // r2, local
  storageKey: text('storage_key').notNull(),
  originalFileName: text('original_file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: numeric('file_size').notNull().default('0'),
  status: text('status').notNull().default('NOT_STARTED'), // NOT_STARTED, UPLOADING, PAUSED, UPLOADED, PROCESSING, READY, FAILED
  etag: text('etag'),
  isCurrent: boolean('is_current').notNull().default(true),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 10. Upload Sessions Table (Multipart uploads to R2)
export const uploadSessions = pgTable('upload_sessions', {
  id: text('id').primaryKey(), // UUID string
  mediaAssetId: integer('media_asset_id').references(() => mediaAssets.id, { onDelete: 'cascade' }).notNull(),
  uploadId: text('upload_id'), // Cloudflare R2 / S3 Multipart upload ID
  storageProvider: text('storage_provider').notNull().default('r2'),
  objectKey: text('object_key').notNull(),
  fileName: text('file_name').notNull(),
  fileSize: numeric('file_size').notNull(),
  mimeType: text('mime_type').notNull(),
  status: text('status').notNull().default('UPLOADING'), // UPLOADING, PAUSED, COMPLETED, CANCELLED, FAILED
  totalParts: integer('total_parts').notNull().default(1),
  uploadedPartsCount: integer('uploaded_parts_count').notNull().default(0),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 11. Upload Parts Table
export const uploadParts = pgTable('upload_parts', {
  id: serial('id').primaryKey(),
  uploadSessionId: text('upload_session_id').references(() => uploadSessions.id, { onDelete: 'cascade' }).notNull(),
  partNumber: integer('part_number').notNull(),
  etag: text('etag'),
  size: numeric('size').notNull(),
  status: text('status').notNull().default('PENDING'), // PENDING, UPLOADED, FAILED
  uploadedAt: timestamp('uploaded_at'),
});

// 12. Subtitles Table
export const subtitles = pgTable('subtitles', {
  id: serial('id').primaryKey(),
  contentId: integer('content_id').references(() => contentItems.id, { onDelete: 'cascade' }),
  episodeId: integer('episode_id').references(() => episodes.id, { onDelete: 'cascade' }),
  language: text('language').notNull(), // English, Bengali, Hindi, Spanish, etc.
  label: text('label').notNull(),
  format: text('format').notNull().default('VTT'), // SRT, VTT
  isDefault: boolean('is_default').notNull().default(false),
  isForced: boolean('is_forced').notNull().default(false),
  storageKey: text('storage_key'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 13. Audio Tracks Table
export const audioTracks = pgTable('audio_tracks', {
  id: serial('id').primaryKey(),
  contentId: integer('content_id').references(() => contentItems.id, { onDelete: 'cascade' }),
  episodeId: integer('episode_id').references(() => episodes.id, { onDelete: 'cascade' }),
  language: text('language').notNull(),
  label: text('label').notNull(),
  codec: text('codec').notNull().default('AAC'),
  isDefault: boolean('is_default').notNull().default(false),
  storageKey: text('storage_key'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 14. Audit Logs Table
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  userEmail: text('user_email'),
  action: text('action').notNull(), // e.g. MOVIE_CREATED, MASTER_UPLOAD_STARTED, etc.
  resource: text('resource').notNull(), // MOVIE, MEDIA, SERIES, EPISODE, etc.
  resourceId: text('resource_id'),
  ipAddress: text('ip_address'),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 15. Subscriptions Table
export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  userEmail: text('user_email').notNull(),
  plan: text('plan').notNull().default('PREMIUM_MONTHLY'),
  amount: numeric('amount').notNull().default('9.99'),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, CANCELLED, EXPIRED
  startDate: timestamp('start_date').defaultNow(),
  endDate: timestamp('end_date'),
});

// Relations
export const contentItemsRelations = relations(contentItems, ({ many }) => ({
  genres: many(contentGenres),
  castCrew: many(contentCastCrew),
  seasons: many(seasons),
  mediaAssets: many(mediaAssets),
  subtitles: many(subtitles),
  audioTracks: many(audioTracks),
}));

export const seasonsRelations = relations(seasons, ({ one, many }) => ({
  content: one(contentItems, {
    fields: [seasons.contentId],
    references: [contentItems.id],
  }),
  episodes: many(episodes),
}));

export const episodesRelations = relations(episodes, ({ one, many }) => ({
  season: one(seasons, {
    fields: [episodes.seasonId],
    references: [seasons.id],
  }),
  mediaAssets: many(mediaAssets),
}));
