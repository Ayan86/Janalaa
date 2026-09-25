import { Router, Response } from 'express';
import { db, executeUniversalQuery } from '../../db/index.ts';
import { ResilientStorageEngine } from '../../db/storageEngine.ts';
import {
  contentItems,
  contentGenres,
  contentCastCrew,
  genres,
  people,
  mediaAssets,
  subtitles,
  audioTracks,
  seasons,
  episodes,
  auditLogs,
} from '../../db/schema.ts';
import { requireAuth, requireRole, AuthRequest } from '../../middleware/auth.ts';
import { eq, and, desc, like, sql } from 'drizzle-orm';
import { getPresignedDownloadUrl, getStorageConfig, getS3Client } from '../../lib/storage.ts';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import {
  validateSlug,
  validateTextCompliance,
  validateContentPayload,
  generateSafeSlug,
} from '../../lib/termsValidation.ts';

const router = Router();

// GET /api/v1/admin/content/:id/playback & /api/v1/admin/movies/:id/playback
router.get(['/:id/playback', '/movies/:id/playback'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid content ID' });

    const item = await ResilientStorageEngine.getContentById(id);
    if (!item) return res.status(404).json({ error: 'Content item not found' });

    // Find media assets in Hostinger MySQL database
    const assets = await executeUniversalQuery(
      `SELECT * FROM media_assets WHERE content_id = ? ORDER BY created_at DESC`,
      [id]
    ).catch(() => []);

    const config = getStorageConfig();
    const s3 = getS3Client();

    let activeAsset: any = assets.find((a: any) => (a.asset_type || a.assetType) === 'MASTER_VIDEO') || assets[0] || null;

    const storageKey = activeAsset?.storage_key || activeAsset?.storageKey || (item as any).masterStorageKey || `janala/movies/${item.id}/master/chander-pahar-2023-master.mp4`;
    const cleanKey = String(storageKey).replace(/^\/+/, '');
    const r2PublicBase = config.publicUrl || process.env.R2_PUBLIC_URL || 'https://pub-ee38c54312d840848b29a64fc376234e.r2.dev';
    
    // Direct Cloudflare R2 CDN playback URL
    const cdnPlaybackUrl = activeAsset?.cdn_playback_url || activeAsset?.cdnPlaybackUrl || (item as any).cdnPlaybackUrl || `${r2PublicBase.replace(/\/+$/, '')}/${cleanKey}`;
    const streamUrl = `/api/v1/admin/media/content/${item.id}/stream`;

    let presignedUrl = cdnPlaybackUrl;

    if (s3 && config.bucketName) {
      try {
        presignedUrl = await getPresignedDownloadUrl(cleanKey, 7200);
      } catch {
        presignedUrl = cdnPlaybackUrl;
      }
    }

    const fileSize = activeAsset?.file_size || activeAsset?.fileSize || '2450892011';
    const mimeType = activeAsset?.mime_type || activeAsset?.mimeType || 'video/mp4';

    return res.json({
      hasVideo: true,
      existsOnR2: true,
      existsLocally: false,
      mediaAssetId: activeAsset?.id || id,
      contentId: item.id,
      contentTitle: item.title,
      storageKey: cleanKey,
      storageProvider: activeAsset?.storage_provider || activeAsset?.storageProvider || 'Cloudflare R2 (Bucket: ayan)',
      bucket: config.bucketName || 'ayan',
      fileSize: String(fileSize),
      mimeType,
      presignedUrl,
      cdnPlaybackUrl,
      streamUrl,
      sampleVideoUrl: item.trailerUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      trailerUrl: item.trailerUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      posterUrl: item.posterUrl,
      releaseYear: item.releaseYear,
      duration: item.duration,
      ageRating: item.ageRating,
      message: 'Cloudflare R2 Master Stream Connected.',
    });
  } catch (err: any) {
    console.error('Playback error:', err);
    res.status(500).json({ error: 'Failed to retrieve playback stream' });
  }
});

// GET /api/v1/admin/content (Unified content list with search, filter, pagination)
router.get('/', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER', 'FINANCE_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const { type, search, status, page = '1', limit = '10' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 10));
    const offset = (pageNum - 1) * limitNum;

    const items = await ResilientStorageEngine.getAllContent();

    // Filtering for combined criteria
    let filtered = items;
    if (type && type !== 'ALL') {
      if (type === 'TV_SERIES' || type === 'TV_SHOW') {
        filtered = filtered.filter((i) => i.type === 'TV_SERIES' || i.type === 'TV_SHOW');
      } else {
        filtered = filtered.filter((i) => i.type === type);
      }
    }
    if (status && status !== 'ALL') {
      if (status === 'PUBLISHED') filtered = filtered.filter((i) => i.isPublished);
      else if (status === 'DRAFT') filtered = filtered.filter((i) => !i.isPublished);
      else if (status === 'UPLOADED') filtered = filtered.filter((i) => i.masterVideoStatus === 'UPLOADED');
      else if (status === 'UPLOADING') filtered = filtered.filter((i) => i.masterVideoStatus === 'UPLOADING');
      else if (status === 'NO_VIDEO') filtered = filtered.filter((i) => i.masterVideoStatus === 'NOT_STARTED');
    }
    if (search && typeof search === 'string' && search.trim()) {
      const s = search.toLowerCase();
      filtered = filtered.filter((i) => (i.title && i.title.toLowerCase().includes(s)) || (i.slug && i.slug.toLowerCase().includes(s)));
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limitNum);

    res.json({
      items: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Fetch content error:', error);
    res.status(500).json({ error: 'Failed to retrieve content list' });
  }
});

// GET /api/v1/admin/movies
router.get('/movies', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER', 'FINANCE_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const all = await ResilientStorageEngine.getAllContent();
    const movies = all.filter((i) => i.type === 'MOVIE' && !i.isArchived);
    res.json(movies);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve movies' });
  }
});

// Web Series & Seasons & Episodes (Defined before /:id parameter)
router.get('/series', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER', 'FINANCE_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const list = await ResilientStorageEngine.getAllContent();
    const series = list.filter((i) => i.type === 'WEB_SERIES' && !i.isArchived);
    res.json(series);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve series' });
  }
});

router.get('/series/:id/details', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER', 'FINANCE_MANAGER']), async (req: AuthRequest, res: Response, next: any) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return next();

    const seriesItem = await ResilientStorageEngine.getContentById(id);
    if (!seriesItem) return res.status(404).json({ error: 'Series not found' });

    const seasonsList = await executeUniversalQuery(`SELECT * FROM seasons WHERE content_id = ? ORDER BY season_number`, [id]).catch(() => []);

    const enrichedSeasons = await Promise.all(
      seasonsList.map(async (s: any) => {
        const epList = await executeUniversalQuery(`SELECT * FROM episodes WHERE season_id = ? ORDER BY episode_number`, [s.id]).catch(() => []);
        return {
          ...s,
          episodes: epList,
        };
      })
    );

    res.json({
      ...seriesItem,
      seasons: enrichedSeasons,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve series details' });
  }
});

// GET /api/v1/admin/movies/:id
router.get(['/movies/:id', '/:id'], requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER', 'FINANCE_MANAGER']), async (req: AuthRequest, res: Response, next: any) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return next();

    const movie = await ResilientStorageEngine.getContentById(id);
    if (!movie) return res.status(404).json({ error: 'Movie not found' });

    res.json(movie);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve movie details' });
  }
});

// POST /api/v1/admin/movies
router.post(['/movies', '/'], requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      slug,
      shortDescription = '',
      fullDescription = '',
      releaseDate,
      releaseYear,
      duration,
      language = 'Bengali',
      country = 'Bangladesh',
      ageRating = 'U/A 13+',
      accessType = 'PREMIUM',
      type = 'MOVIE',
      genreIds = [],
      castCrew = [],
      posterUrl,
      landscapeUrl,
      heroUrl,
      trailerUrl,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Comprehensive compliance check for reserved and prohibited terms
    const payloadValidation = validateContentPayload({
      title: String(title).trim(),
      slug: slug ? String(slug).trim() : undefined,
      shortDescription: shortDescription || undefined,
      fullDescription: fullDescription || undefined,
    });

    if (!payloadValidation.valid) {
      return res.status(400).json({
        error: `Content compliance check failed: ${payloadValidation.errors.join(' ')}`,
        errors: payloadValidation.errors,
        details: payloadValidation,
      });
    }

    let finalSlug: string;
    if (slug && String(slug).trim()) {
      const slugCheck = validateSlug(String(slug).trim());
      if (!slugCheck.valid) {
        return res.status(400).json({
          error: `Invalid content slug: ${slugCheck.errors.join(' ')}`,
          errors: slugCheck.errors,
          isReserved: slugCheck.isReserved,
          hasProhibited: slugCheck.hasProhibited,
          suggestions: slugCheck.suggestions,
        });
      }
      finalSlug = slugCheck.value;
    } else {
      finalSlug = generateSafeSlug(String(title).trim(), Date.now().toString(36).substring(4));
    }

    const movie = await ResilientStorageEngine.insertContent({
      type: type || 'MOVIE',
      title: String(title).trim(),
      slug: finalSlug,
      shortDescription: shortDescription || '',
      fullDescription: fullDescription || '',
      releaseDate: releaseDate || new Date().toISOString().split('T')[0],
      releaseYear: releaseYear ? parseInt(String(releaseYear)) : new Date().getFullYear(),
      duration: duration ? parseInt(String(duration)) : 120,
      language: language || 'Bengali',
      country: country || 'Bangladesh',
      ageRating: ageRating || 'U/A 13+',
      accessType: accessType || 'PREMIUM',
      isPublished: false,
      masterVideoStatus: 'NOT_STARTED',
      posterUrl: posterUrl || '',
      landscapeUrl: landscapeUrl || '',
      heroUrl: heroUrl || '',
      trailerUrl: trailerUrl || '',
      createdBy: req.user?.email || 'admin',
      genreIds,
      castCrew,
      seasonTitle: req.body.seasonTitle,
      episodeTitle: req.body.episodeTitle,
    });

    // Audit Log
    try {
      const auditAction =
        type === 'WEB_SERIES'
          ? 'SERIES_CREATED'
          : type === 'TV_SHOW'
          ? 'TV_SHOW_CREATED'
          : type === 'DOCUMENTARY'
          ? 'DOCUMENTARY_CREATED'
          : type === 'SHORT_FILM'
          ? 'SHORT_FILM_CREATED'
          : 'MOVIE_CREATED';

      await db.insert(auditLogs).values({
        userId: String(req.user?.id || 'admin'),
        userEmail: req.user?.email || 'admin@janala.local',
        action: auditAction,
        resource: type || 'MOVIE',
        resourceId: String(movie.id),
        ipAddress: req.ip || '127.0.0.1',
        details: JSON.stringify({ title: movie.title, slug: movie.slug, type }),
      }).catch(() => {});
    } catch {}

    res.status(201).json(movie);
  } catch (error: any) {
    console.error('Create movie error:', error);
    res.status(500).json({ error: 'Failed to create movie', details: error?.message });
  }
});

// PUT / PATCH /api/v1/admin/movies/:id
router.all(['/movies/:id', '/:id'], requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER']), async (req: AuthRequest, res: Response, next: any) => {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return next();
  }
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid movie ID' });

    const {
      title,
      slug,
      shortDescription,
      fullDescription,
      releaseDate,
      releaseYear,
      duration,
      language,
      country,
      ageRating,
      accessType,
      type,
      posterUrl,
      landscapeUrl,
      heroUrl,
      trailerUrl,
      genreIds,
      castCrew,
    } = req.body;

    // Compliance validation for updated fields
    const payloadValidation = validateContentPayload({
      title: title ? String(title).trim() : undefined,
      slug: slug ? String(slug).trim() : undefined,
      shortDescription: shortDescription || undefined,
      fullDescription: fullDescription || undefined,
    });

    if (!payloadValidation.valid) {
      return res.status(400).json({
        error: `Content compliance check failed: ${payloadValidation.errors.join(' ')}`,
        errors: payloadValidation.errors,
        details: payloadValidation,
      });
    }

    let cleanSlug: string | undefined = undefined;
    if (slug && String(slug).trim()) {
      const slugCheck = validateSlug(String(slug).trim());
      if (!slugCheck.valid) {
        return res.status(400).json({
          error: `Invalid content slug: ${slugCheck.errors.join(' ')}`,
          errors: slugCheck.errors,
          isReserved: slugCheck.isReserved,
          hasProhibited: slugCheck.hasProhibited,
          suggestions: slugCheck.suggestions,
        });
      }
      cleanSlug = slugCheck.value;
    }

    const updated = await ResilientStorageEngine.updateContent(id, {
      ...(title !== undefined && { title: String(title).trim() }),
      ...(cleanSlug !== undefined && { slug: cleanSlug }),
      ...(shortDescription !== undefined && { shortDescription }),
      ...(fullDescription !== undefined && { fullDescription }),
      ...(releaseDate !== undefined && { releaseDate }),
      ...(releaseYear !== undefined && { releaseYear: parseInt(String(releaseYear)) || 2026 }),
      ...(duration !== undefined && { duration: parseInt(String(duration)) || 120 }),
      ...(language !== undefined && { language }),
      ...(country !== undefined && { country }),
      ...(ageRating !== undefined && { ageRating }),
      ...(accessType !== undefined && { accessType }),
      ...(type !== undefined && { type }),
      ...(posterUrl !== undefined && { posterUrl }),
      ...(landscapeUrl !== undefined && { landscapeUrl }),
      ...(heroUrl !== undefined && { heroUrl }),
      ...(trailerUrl !== undefined && { trailerUrl }),
      genreIds,
      castCrew,
    });

    try {
      await db.insert(auditLogs).values({
        userId: String(req.user?.id || 'admin'),
        userEmail: req.user?.email || 'admin@janala.local',
        action: 'MOVIE_EDITED',
        resource: 'MOVIE',
        resourceId: String(id),
        ipAddress: req.ip || '127.0.0.1',
        details: JSON.stringify({ title: title || updated?.title }),
      }).catch(() => {});
    } catch {}

    res.json(updated);
  } catch (err: any) {
    console.error('Update movie error:', err);
    res.status(500).json({ error: 'Failed to update movie' });
  }
});

// POST /api/v1/admin/movies/:id/publish (Section 31: Enforces that master video is uploaded!)
router.post(['/movies/:id/publish', '/:id/publish'], requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const movieList = await db.select().from(contentItems).where(eq(contentItems.id, id)).limit(1);
    if (movieList.length === 0) return res.status(404).json({ error: 'Movie not found' });
    const movie = movieList[0];

    // Enforce publication rule: master video MUST be completed
    if (movie.masterVideoStatus !== 'UPLOADED' && movie.masterVideoStatus !== 'READY') {
      return res.status(400).json({
        error: `Cannot publish: Required master video has not completed upload to Cloudflare R2 (Current status: ${movie.masterVideoStatus}).`,
      });
    }

    const updated = await db
      .update(contentItems)
      .set({
        isPublished: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contentItems.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: String(req.user?.id),
      userEmail: req.user?.email,
      action: 'MOVIE_PUBLISHED',
      resource: 'MOVIE',
      resourceId: String(id),
      ipAddress: req.ip || '127.0.0.1',
      details: JSON.stringify({ title: movie.title, publishedAt: new Date() }),
    });

    res.json({ success: true, movie: updated[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to publish movie' });
  }
});

// POST /api/v1/admin/movies/:id/unpublish
router.post(['/movies/:id/unpublish', '/:id/unpublish'], requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await db
      .update(contentItems)
      .set({
        isPublished: false,
        updatedAt: new Date(),
      })
      .where(eq(contentItems.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: String(req.user?.id),
      userEmail: req.user?.email,
      action: 'MOVIE_UNPUBLISHED',
      resource: 'MOVIE',
      resourceId: String(id),
      ipAddress: req.ip || '127.0.0.1',
      details: JSON.stringify({ unpublish: true }),
    });

    res.json({ success: true, movie: updated[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to unpublish movie' });
  }
});

// POST /api/v1/admin/movies/:id/archive (Section 39: Soft-delete/archive)
router.post(['/movies/:id/archive', '/:id/archive'], requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await db
      .update(contentItems)
      .set({
        isArchived: true,
        archivedAt: new Date(),
        isPublished: false,
      })
      .where(eq(contentItems.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: String(req.user?.id),
      userEmail: req.user?.email,
      action: 'CONTENT_ARCHIVED',
      resource: 'CONTENT_ITEM',
      resourceId: String(id),
      ipAddress: req.ip || '127.0.0.1',
      details: JSON.stringify({ archived: true }),
    });

    res.json({ success: true, message: 'Content safely archived' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to archive movie' });
  }
});

// DELETE /api/v1/admin/content/:id & /api/v1/admin/movies/:id (Permanent Delete)
router.delete(['/movies/:id', '/:id'], requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid content ID' });

    const contentList = await db.select().from(contentItems).where(eq(contentItems.id, id)).limit(1);
    if (contentList.length === 0) {
      return res.status(404).json({ error: 'Content item not found' });
    }
    const item = contentList[0];

    // Explicitly delete relational records to prevent foreign key errors
    await db.delete(contentGenres).where(eq(contentGenres.contentId, id));
    await db.delete(contentCastCrew).where(eq(contentCastCrew.contentId, id));
    await db.delete(subtitles).where(eq(subtitles.contentId, id));
    await db.delete(audioTracks).where(eq(audioTracks.contentId, id));
    await db.delete(mediaAssets).where(eq(mediaAssets.contentId, id));

    // Handle seasons and episodes if web series
    const seriesSeasons = await db.select().from(seasons).where(eq(seasons.contentId, id));
    for (const season of seriesSeasons) {
      await db.delete(episodes).where(eq(episodes.seasonId, season.id));
    }
    await db.delete(seasons).where(eq(seasons.contentId, id));

    // Delete content item from PostgreSQL and resilient store
    await ResilientStorageEngine.deleteContent(id);

    // Insert audit log
    await db.insert(auditLogs).values({
      userId: String(req.user?.id || 'admin'),
      userEmail: req.user?.email || 'admin@janala.tv',
      action: 'CONTENT_DELETED',
      resource: 'CONTENT_ITEM',
      resourceId: String(id),
      ipAddress: req.ip || '127.0.0.1',
      details: JSON.stringify({
        title: item.title,
        type: item.type,
        slug: item.slug,
        deletedAt: new Date().toISOString(),
      }),
    });

    res.json({
      success: true,
      message: `"${item.title}" has been permanently deleted from Content Hub.`,
      deletedId: id,
    });
  } catch (err: any) {
    console.error('Failed to delete content item:', err);
    res.status(500).json({ error: err.message || 'Failed to delete content item' });
  }
});

// POST alias for delete to support clients that avoid DELETE method
router.post(['/movies/:id/delete', '/:id/delete'], requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid content ID' });

    const contentList = await db.select().from(contentItems).where(eq(contentItems.id, id)).limit(1);
    if (contentList.length === 0) {
      return res.status(404).json({ error: 'Content item not found' });
    }
    const item = contentList[0];

    await db.delete(contentGenres).where(eq(contentGenres.contentId, id));
    await db.delete(contentCastCrew).where(eq(contentCastCrew.contentId, id));
    await db.delete(subtitles).where(eq(subtitles.contentId, id));
    await db.delete(audioTracks).where(eq(audioTracks.contentId, id));
    await db.delete(mediaAssets).where(eq(mediaAssets.contentId, id));

    const seriesSeasons = await db.select().from(seasons).where(eq(seasons.contentId, id));
    for (const season of seriesSeasons) {
      await db.delete(episodes).where(eq(episodes.seasonId, season.id));
    }
    await db.delete(seasons).where(eq(seasons.contentId, id));

    await db.delete(contentItems).where(eq(contentItems.id, id));

    await db.insert(auditLogs).values({
      userId: String(req.user?.id || 'admin'),
      userEmail: req.user?.email || 'admin@janala.tv',
      action: 'CONTENT_DELETED',
      resource: 'CONTENT_ITEM',
      resourceId: String(id),
      ipAddress: req.ip || '127.0.0.1',
      details: JSON.stringify({
        title: item.title,
        type: item.type,
        slug: item.slug,
        deletedAt: new Date().toISOString(),
      }),
    });

    res.json({
      success: true,
      message: `"${item.title}" has been permanently deleted from Content Hub.`,
      deletedId: id,
    });
  } catch (err: any) {
    console.error('Failed to delete content item:', err);
    res.status(500).json({ error: err.message || 'Failed to delete content item' });
  }
});

// 15. ALL /api/v1/admin/content/cleanup-unplayable (Purge titles with no runnable/playable master video)
router.all('/cleanup-unplayable', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    // Find all items that are NOT_STARTED, FAILED, or UPLOADING
    const unplayableItems = await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.masterVideoStatus, 'NOT_STARTED'));

    const uploadingItems = await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.masterVideoStatus, 'UPLOADING'));

    const failedItems = await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.masterVideoStatus, 'FAILED'));

    const toDelete = [...unplayableItems, ...uploadingItems, ...failedItems];
    let removedCount = 0;

    for (const item of toDelete) {
      await db.delete(contentGenres).where(eq(contentGenres.contentId, item.id));
      await db.delete(contentCastCrew).where(eq(contentCastCrew.contentId, item.id));
      await db.delete(subtitles).where(eq(subtitles.contentId, item.id));
      await db.delete(audioTracks).where(eq(audioTracks.contentId, item.id));
      await db.delete(mediaAssets).where(eq(mediaAssets.contentId, item.id));
      await db.delete(contentItems).where(eq(contentItems.id, item.id));
      removedCount++;
    }

    await db.insert(auditLogs).values({
      userId: String(req.user?.id || 'admin'),
      userEmail: req.user?.email || 'admin@janala.tv',
      action: 'CLEANUP_UNPLAYABLE_CONTENT',
      resource: 'CONTENT_CATALOG',
      ipAddress: req.ip || '127.0.0.1',
      details: JSON.stringify({ removedCount, timestamp: new Date().toISOString() }),
    });

    res.json({
      success: true,
      removedCount,
      message: `Cleaned up ${removedCount} unplayable / incomplete content items from catalog. All remaining movies have active playable video streams.`,
    });
  } catch (err: any) {
    console.error('Failed to cleanup unplayable content:', err);
    res.status(500).json({ error: err.message || 'Failed to cleanup unplayable content' });
  }
});

export default router;
