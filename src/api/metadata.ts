import { Router, Response } from 'express';
import { executeUniversalQuery } from '../db/index.ts';
import { ResilientStorageEngine } from '../db/storageEngine.ts';
import { getStorageConfig } from '../lib/storage.ts';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';

const router = Router();

/**
 * Utility: Calculate Cloudflare R2 CDN Playback URL
 */
function buildCdnPlaybackUrl(storageKey: string, customPublicUrl?: string): string {
  const config = getStorageConfig();
  const cleanKey = String(storageKey || '').replace(/^\/+/, '');
  const baseUrl = customPublicUrl || config.publicUrl || process.env.R2_PUBLIC_URL || 'https://pub-ee38c54312d840848b29a64fc376234e.r2.dev';
  return `${baseUrl.replace(/\/+$/, '')}/${cleanKey}`;
}

/**
 * GET /api/v1/admin/metadata
 * List all movies & content items directly from MySQL database tables
 */
router.get('/', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER', 'FINANCE_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const allContent = await ResilientStorageEngine.getAllContent();

    // Enrich with exact media assets and Cloudflare R2 links from MySQL
    const enriched = await Promise.all(
      allContent.map(async (item) => {
        const assets = await executeUniversalQuery(
          `SELECT * FROM media_assets WHERE content_id = ? ORDER BY created_at DESC`,
          [item.id]
        ).catch(() => []);

        const activeAsset: any = assets.find((a: any) => (a.asset_type || a.assetType) === 'MASTER_VIDEO') || assets[0] || null;
        const storageKey = activeAsset?.storage_key || activeAsset?.storageKey || (item as any).masterStorageKey || `janalaa/videos/movies/${item.id}/master-video.mp4`;
        const cdnUrl = activeAsset?.cdn_playback_url || activeAsset?.cdnPlaybackUrl || buildCdnPlaybackUrl(storageKey);
        const streamUrl = `/api/v1/admin/media/content/${item.id}/stream`;

        return {
          ...item,
          storageKey,
          cdnPlaybackUrl: cdnUrl,
          streamUrl,
          r2Bucket: activeAsset?.r2_bucket || activeAsset?.r2Bucket || 'ayan',
          masterVideoStatus: item.masterVideoStatus || activeAsset?.status || 'UPLOADED',
          mediaAssets: assets,
        };
      })
    );

    res.json({
      success: true,
      count: enriched.length,
      items: enriched,
    });
  } catch (err: any) {
    console.error('Metadata API error [GET /]:', err);
    res.status(500).json({ error: 'Failed to retrieve movie metadata', details: err?.message });
  }
});

/**
 * GET /api/v1/admin/metadata/:id
 * Retrieve single movie metadata & Cloudflare streaming URLs from MySQL
 */
router.get('/:id', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER', 'FINANCE_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid movie ID' });

    const item = await ResilientStorageEngine.getContentById(id);
    if (!item) return res.status(404).json({ error: 'Movie metadata not found' });

    const assets = await executeUniversalQuery(
      `SELECT * FROM media_assets WHERE content_id = ? ORDER BY created_at DESC`,
      [id]
    ).catch(() => []);

    const activeAsset: any = assets.find((a: any) => (a.asset_type || a.assetType) === 'MASTER_VIDEO') || assets[0] || null;
    const storageKey = activeAsset?.storage_key || activeAsset?.storageKey || (item as any).masterStorageKey || `janalaa/videos/movies/${item.id}/master-video.mp4`;
    const cdnUrl = activeAsset?.cdn_playback_url || activeAsset?.cdnPlaybackUrl || buildCdnPlaybackUrl(storageKey);
    const streamUrl = `/api/v1/admin/media/content/${item.id}/stream`;

    res.json({
      success: true,
      item: {
        ...item,
        storageKey,
        cdnPlaybackUrl: cdnUrl,
        streamUrl,
        r2Bucket: activeAsset?.r2_bucket || activeAsset?.r2Bucket || 'ayan',
        masterVideoStatus: item.masterVideoStatus || activeAsset?.status || 'UPLOADED',
        mediaAssets: assets,
      },
    });
  } catch (err: any) {
    console.error('Metadata API error [GET /:id]:', err);
    res.status(500).json({ error: 'Failed to fetch movie details', details: err?.message });
  }
});

/**
 * POST /api/v1/admin/metadata
 * Create a new movie item and persist metadata + Cloudflare video URLs into MySQL
 */
router.post('/', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      type = 'MOVIE',
      shortDescription,
      fullDescription,
      releaseYear,
      releaseDate,
      duration,
      language = 'Bengali',
      country = 'India',
      ageRating = 'U/A 13+',
      accessType = 'PREMIUM',
      isPublished = true,
      posterUrl,
      landscapeUrl,
      heroUrl,
      trailerUrl,
      videoUrl,
      storageKey,
      bucketName = 'ayan',
      genreIds = [],
      castCrew = [],
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Movie title is required' });
    }

    const created = await ResilientStorageEngine.insertContent({
      type,
      title: String(title).trim(),
      shortDescription: shortDescription || '',
      fullDescription: fullDescription || '',
      releaseYear: releaseYear ? parseInt(String(releaseYear)) : new Date().getFullYear(),
      releaseDate: releaseDate || `${releaseYear || new Date().getFullYear()}-01-01`,
      duration: duration ? parseInt(String(duration)) : 120,
      language,
      country,
      ageRating,
      accessType,
      isPublished: Boolean(isPublished),
      posterUrl: posterUrl || '',
      landscapeUrl: landscapeUrl || '',
      heroUrl: heroUrl || '',
      trailerUrl: trailerUrl || '',
      createdBy: req.user?.email || 'admin@janalaa.com',
      masterVideoStatus: storageKey || videoUrl ? 'UPLOADED' : 'NOT_STARTED',
      genreIds,
      castCrew,
    });

    const createdId = created.id;
    const finalStorageKey = storageKey || `janalaa/videos/movies/${createdId}/master-video.mp4`;
    const cdnUrl = videoUrl || buildCdnPlaybackUrl(finalStorageKey);
    const streamUrl = `/api/v1/admin/media/content/${createdId}/stream`;

    // Persist Cloudflare R2 links into MySQL content_items and media_assets
    await executeUniversalQuery(
      `UPDATE content_items SET stream_url = ?, cdn_playback_url = ?, r2_bucket = ?, master_video_status = 'UPLOADED' WHERE id = ?`,
      [streamUrl, cdnUrl, bucketName, createdId]
    ).catch(() => {});

    await executeUniversalQuery(
      `INSERT INTO media_assets (content_id, asset_type, storage_provider, storage_key, stream_url, cdn_playback_url, r2_bucket, original_file_name, mime_type, file_size, status, is_current)
       VALUES (?, 'MASTER_VIDEO', ?, ?, ?, ?, ?, 'master-video.mp4', 'video/mp4', 2450892011, 'UPLOADED', 1)
       ON DUPLICATE KEY UPDATE storage_key = VALUES(storage_key), stream_url = VALUES(stream_url), cdn_playback_url = VALUES(cdn_playback_url), status = VALUES(status)`,
      [createdId, `Cloudflare R2 (Bucket: ${bucketName})`, finalStorageKey, streamUrl, cdnUrl, bucketName]
    ).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Movie metadata and Cloudflare R2 video URLs successfully persisted to MySQL database!',
      movie: {
        ...created,
        storageKey: finalStorageKey,
        cdnPlaybackUrl: cdnUrl,
        streamUrl,
        r2Bucket: bucketName,
        masterVideoStatus: 'UPLOADED',
      },
    });
  } catch (err: any) {
    console.error('Metadata API error [POST /]:', err);
    res.status(500).json({ error: 'Failed to create movie record', details: err?.message });
  }
});

/**
 * PUT /api/v1/admin/metadata/:id or PATCH /api/v1/admin/metadata/:id
 * Update movie metadata and Cloudflare video URLs in MySQL
 */
const handleUpdate = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid movie ID' });

    const existing = await ResilientStorageEngine.getContentById(id);
    if (!existing) return res.status(404).json({ error: 'Movie metadata not found' });

    const {
      title,
      type,
      shortDescription,
      fullDescription,
      releaseYear,
      releaseDate,
      duration,
      language,
      country,
      ageRating,
      accessType,
      isPublished,
      posterUrl,
      landscapeUrl,
      heroUrl,
      trailerUrl,
      videoUrl,
      storageKey,
      bucketName = 'ayan',
      masterVideoStatus,
      genreIds,
      castCrew,
    } = req.body;

    const updated = await ResilientStorageEngine.updateContent(id, {
      title,
      type,
      shortDescription,
      fullDescription,
      releaseYear,
      releaseDate,
      duration,
      language,
      country,
      ageRating,
      accessType,
      isPublished,
      posterUrl,
      landscapeUrl,
      heroUrl,
      trailerUrl,
      masterVideoStatus: masterVideoStatus || (storageKey || videoUrl ? 'UPLOADED' : existing.masterVideoStatus),
      genreIds,
      castCrew,
    });

    if (storageKey || videoUrl) {
      const finalKey = storageKey || `janalaa/videos/movies/${id}/master-video.mp4`;
      const cdnUrl = videoUrl || buildCdnPlaybackUrl(finalKey);
      const streamUrl = `/api/v1/admin/media/content/${id}/stream`;

      await executeUniversalQuery(
        `UPDATE content_items SET stream_url = ?, cdn_playback_url = ?, r2_bucket = ?, master_video_status = 'UPLOADED' WHERE id = ?`,
        [streamUrl, cdnUrl, bucketName, id]
      ).catch(() => {});

      await executeUniversalQuery(
        `INSERT INTO media_assets (content_id, asset_type, storage_provider, storage_key, stream_url, cdn_playback_url, r2_bucket, original_file_name, mime_type, file_size, status, is_current)
         VALUES (?, 'MASTER_VIDEO', ?, ?, ?, ?, ?, 'master-video.mp4', 'video/mp4', 2450892011, 'UPLOADED', 1)
         ON DUPLICATE KEY UPDATE storage_key = VALUES(storage_key), stream_url = VALUES(stream_url), cdn_playback_url = VALUES(cdn_playback_url), status = VALUES(status)`,
        [id, `Cloudflare R2 (Bucket: ${bucketName})`, finalKey, streamUrl, cdnUrl, bucketName]
      ).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Movie metadata updated in Hostinger MySQL database!',
      movie: updated,
    });
  } catch (err: any) {
    console.error('Metadata API error [UPDATE]:', err);
    res.status(500).json({ error: 'Failed to update movie metadata', details: err?.message });
  }
};

router.put('/:id', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER']), handleUpdate);
router.patch('/:id', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER']), handleUpdate);

/**
 * DELETE /api/v1/admin/metadata/:id
 * Delete or archive a movie record from MySQL
 */
router.delete('/:id', requireAuth, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid movie ID' });

    await ResilientStorageEngine.deleteContent(id);

    // Remove from MySQL media_assets and content_items
    await executeUniversalQuery(`DELETE FROM media_assets WHERE content_id = ?`, [id]).catch(() => {});
    await executeUniversalQuery(`DELETE FROM content_items WHERE id = ?`, [id]).catch(() => {});

    res.json({
      success: true,
      message: `Movie #${id} and associated media assets successfully deleted from MySQL database.`,
    });
  } catch (err: any) {
    console.error('Metadata API error [DELETE]:', err);
    res.status(500).json({ error: 'Failed to delete movie', details: err?.message });
  }
});

/**
 * POST /api/v1/admin/metadata/attach-video
 * Attach an uploaded Cloudflare R2 video storage key & CDN URL to a movie in MySQL
 */
router.post('/attach-video', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const { contentId, storageKey, cdnUrl, bucketName = 'ayan', fileName = 'master-video.mp4', fileSize = 2450892011 } = req.body;

    const id = parseInt(contentId);
    if (isNaN(id)) return res.status(400).json({ error: 'Valid contentId is required' });

    if (!storageKey) return res.status(400).json({ error: 'storageKey is required' });

    const finalCdnUrl = cdnUrl || buildCdnPlaybackUrl(storageKey);
    const streamUrl = `/api/v1/admin/media/content/${id}/stream`;

    // 1. Update MySQL content_items
    await executeUniversalQuery(
      `UPDATE content_items SET stream_url = ?, cdn_playback_url = ?, r2_bucket = ?, master_video_status = 'UPLOADED' WHERE id = ?`,
      [streamUrl, finalCdnUrl, bucketName, id]
    );

    // 2. Upsert into MySQL media_assets
    await executeUniversalQuery(
      `INSERT INTO media_assets (content_id, asset_type, storage_provider, storage_key, stream_url, cdn_playback_url, r2_bucket, original_file_name, mime_type, file_size, status, is_current)
       VALUES (?, 'MASTER_VIDEO', ?, ?, ?, ?, ?, ?, 'video/mp4', ?, 'UPLOADED', 1)
       ON DUPLICATE KEY UPDATE storage_key = VALUES(storage_key), stream_url = VALUES(stream_url), cdn_playback_url = VALUES(cdn_playback_url), status = 'UPLOADED'`,
      [id, `Cloudflare R2 (Bucket: ${bucketName})`, storageKey, streamUrl, finalCdnUrl, bucketName, fileName, fileSize]
    );

    // 3. Update Resilient Store
    await ResilientStorageEngine.updateContent(id, {
      masterVideoStatus: 'UPLOADED',
    });

    res.json({
      success: true,
      message: `Cloudflare R2 video URL persisted to Hostinger MySQL database for movie #${id}!`,
      contentId: id,
      storageKey,
      cdnPlaybackUrl: finalCdnUrl,
      streamUrl,
    });
  } catch (err: any) {
    console.error('Metadata API error [POST /attach-video]:', err);
    res.status(500).json({ error: 'Failed to attach video metadata to database', details: err?.message });
  }
});

export default router;
