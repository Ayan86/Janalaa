import fs from 'fs';
import path from 'path';
import { executeUniversalQuery, getDbConfig } from './index.ts';

const LOCAL_STORE_PATH = path.join(process.cwd(), 'uploads', 'content_database.json');

// Ensure uploads directory exists
try {
  const dir = path.dirname(LOCAL_STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
} catch {}

interface LocalDatabaseStructure {
  contentItems: any[];
  genres: any[];
  people: any[];
  mediaAssets: any[];
  seasons: any[];
  episodes: any[];
  auditLogs: any[];
}

const DEFAULT_GENRES = [
  { id: 1, name: 'Action', slug: 'action' },
  { id: 2, name: 'Drama', slug: 'drama' },
  { id: 3, name: 'Thriller', slug: 'thriller' },
  { id: 4, name: 'Romance', slug: 'romance' },
  { id: 5, name: 'Comedy', slug: 'comedy' },
  { id: 6, name: 'Mystery', slug: 'mystery' },
  { id: 7, name: 'Crime', slug: 'crime' },
  { id: 8, name: 'Documentary', slug: 'documentary' },
];

function getLocalStore(): LocalDatabaseStructure {
  try {
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      const data = fs.readFileSync(LOCAL_STORE_PATH, 'utf8');
      const parsed = JSON.parse(data);
      if (!parsed.genres || parsed.genres.length === 0) parsed.genres = DEFAULT_GENRES;
      return parsed;
    }
  } catch (e) {
    console.warn('Local content store parse notice:', e);
  }
  return {
    contentItems: [],
    genres: DEFAULT_GENRES,
    people: [],
    mediaAssets: [],
    seasons: [],
    episodes: [],
    auditLogs: [],
  };
}

function saveLocalStore(store: LocalDatabaseStructure) {
  try {
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {
    console.warn('Could not write to local store:', e);
  }
}

export class ResilientStorageEngine {
  /**
   * Fetch all content items with joined genres and cast
   */
  static async getAllContent(): Promise<any[]> {
    try {
      const config = getDbConfig();
      let rows: any[] = [];

      if (config.isMysql) {
        rows = await executeUniversalQuery(
          `SELECT c.*, 
            COALESCE((
              SELECT JSON_ARRAYAGG(JSON_OBJECT('id', g.id, 'name', g.name, 'slug', g.slug)) 
              FROM content_genres cg 
              JOIN genres g ON cg.genre_id = g.id 
              WHERE cg.content_id = c.id
            ), '[]') as genres_json,
            COALESCE((
              SELECT ma.status 
              FROM media_assets ma 
              WHERE ma.content_id = c.id AND ma.asset_type = 'MASTER_VIDEO' 
              ORDER BY ma.id DESC LIMIT 1
            ), c.master_video_status) as verified_master_status,
            COALESCE((
              SELECT ma.storage_key 
              FROM media_assets ma 
              WHERE ma.content_id = c.id AND ma.asset_type = 'MASTER_VIDEO' 
              ORDER BY ma.id DESC LIMIT 1
            ), NULL) as master_storage_key
           FROM content_items c 
           WHERE c.is_archived = 0
           ORDER BY c.created_at DESC`
        );
      } else {
        rows = await executeUniversalQuery(
          `SELECT c.*, 
            COALESCE((
              SELECT json_agg(json_build_object('id', g.id, 'name', g.name, 'slug', g.slug)) 
              FROM content_genres cg 
              JOIN genres g ON cg.genre_id = g.id 
              WHERE cg.content_id = c.id
            ), '[]'::json) as genres_json,
            COALESCE((
              SELECT ma.status 
              FROM media_assets ma 
              WHERE ma.content_id = c.id AND ma.asset_type = 'MASTER_VIDEO' 
              ORDER BY ma.id DESC LIMIT 1
            ), c.master_video_status) as verified_master_status,
            COALESCE((
              SELECT ma.storage_key 
              FROM media_assets ma 
              WHERE ma.content_id = c.id AND ma.asset_type = 'MASTER_VIDEO' 
              ORDER BY ma.id DESC LIMIT 1
            ), NULL) as master_storage_key
           FROM content_items c 
           WHERE c.is_archived = false 
           ORDER BY c.created_at DESC`
        );
      }

      const items = rows.map((r: any) => {
        let genresList = [];
        if (typeof r.genres_json === 'string') {
          try {
            genresList = JSON.parse(r.genres_json) || [];
          } catch {}
        } else if (Array.isArray(r.genres_json)) {
          genresList = r.genres_json;
        }

        const effectiveMasterStatus =
          (r.master_storage_key || r.verified_master_status === 'UPLOADED')
            ? 'UPLOADED'
            : (r.verified_master_status || r.master_video_status || r.masterVideoStatus || 'NOT_STARTED');

        return {
          id: r.id,
          type: r.type || 'MOVIE',
          title: r.title,
          slug: r.slug,
          shortDescription: r.short_description || r.shortDescription || '',
          fullDescription: r.full_description || r.fullDescription || '',
          releaseDate: r.release_date || r.releaseDate || '',
          releaseYear: r.release_year || r.releaseYear || new Date().getFullYear(),
          duration: r.duration || 120,
          language: r.language || 'Bengali',
          country: r.country || 'Bangladesh',
          ageRating: r.age_rating || r.ageRating || 'U/A 13+',
          accessType: r.access_type || r.accessType || 'PREMIUM',
          isPublished: Boolean(r.is_published || r.isPublished),
          publishedAt: r.published_at || r.publishedAt,
          isArchived: Boolean(r.is_archived || r.isArchived),
          posterUrl: r.poster_url || r.posterUrl || '',
          landscapeUrl: r.landscape_url || r.landscapeUrl || '',
          heroUrl: r.hero_url || r.heroUrl || '',
          trailerUrl: r.trailer_url || r.trailerUrl || '',
          masterVideoStatus: effectiveMasterStatus,
          masterStorageKey: r.master_storage_key,
          createdBy: r.created_by || r.createdBy || 'admin',
          createdAt: r.created_at || r.createdAt,
          updatedAt: r.updated_at || r.updatedAt,
          genres: genresList,
          castCrew: [],
        };
      });

      // Synchronize to resilient local store
      if (items.length > 0) {
        const store = getLocalStore();
        store.contentItems = items;
        saveLocalStore(store);
      }

      return items;
    } catch (err: any) {
      console.warn('getAllContent database notice (falling back to resilient store):', err?.message || err);
      // Fallback cleanly to resilient local cache (eliminates 504 Gateway Time-out completely)
      const store = getLocalStore();
      const assets = store.mediaAssets || [];
      
      const items = (store.contentItems || []).map((item: any) => {
        const itemAssets = assets.filter((a: any) => 
          Number(a.contentId || a.content_id) === Number(item.id) && 
          (a.assetType || a.asset_type) === 'MASTER_VIDEO'
        );
        const hasUploaded = itemAssets.some((a: any) => a.status === 'UPLOADED');
        if (hasUploaded) {
          item.masterVideoStatus = 'UPLOADED';
          item.master_video_status = 'UPLOADED';
        }
        return item;
      });
      return items.filter((i: any) => !i.isArchived);
    }
  }

  /**
   * Get single content item by ID
   */
  static async getContentById(id: number): Promise<any | null> {
    try {
      const rows = await executeUniversalQuery(
        `SELECT * FROM content_items WHERE id = ? LIMIT 1`,
        [id]
      );
      if (rows.length > 0) {
        const r = rows[0];
        const genreRows = await executeUniversalQuery(
          `SELECT g.id, g.name, g.slug FROM content_genres cg JOIN genres g ON cg.genre_id = g.id WHERE cg.content_id = ?`,
          [id]
        ).catch(() => []);

        const castRows = await executeUniversalQuery(
          `SELECT p.id as personId, p.name, cc.role, cc.character_name as characterName, p.photo_url as photoUrl 
           FROM content_cast_crew cc JOIN people p ON cc.person_id = p.id WHERE cc.content_id = ?`,
          [id]
        ).catch(() => []);

        const assetRows = await executeUniversalQuery(
          `SELECT * FROM media_assets WHERE content_id = ?`,
          [id]
        ).catch(() => []);

        return {
          id: r.id,
          type: r.type || 'MOVIE',
          title: r.title,
          slug: r.slug,
          shortDescription: r.short_description || r.shortDescription || '',
          fullDescription: r.full_description || r.fullDescription || '',
          releaseDate: r.release_date || r.releaseDate || '',
          releaseYear: r.release_year || r.releaseYear || new Date().getFullYear(),
          duration: r.duration || 120,
          language: r.language || 'Bengali',
          country: r.country || 'Bangladesh',
          ageRating: r.age_rating || r.ageRating || 'U/A 13+',
          accessType: r.access_type || r.accessType || 'PREMIUM',
          isPublished: Boolean(r.is_published || r.isPublished),
          posterUrl: r.poster_url || r.posterUrl || '',
          landscapeUrl: r.landscape_url || r.landscapeUrl || '',
          heroUrl: r.hero_url || r.heroUrl || '',
          trailerUrl: r.trailer_url || r.trailerUrl || '',
          masterVideoStatus: r.master_video_status || r.masterVideoStatus || 'NOT_STARTED',
          createdBy: r.created_by || r.createdBy || 'admin',
          createdAt: r.created_at || r.createdAt,
          updatedAt: r.updated_at || r.updatedAt,
          genres: genreRows,
          castCrew: castRows,
          mediaAssets: assetRows,
        };
      }
    } catch (e) {}

    const store = getLocalStore();
    const item = store.contentItems.find((i: any) => i.id === Number(id));
    if (item) {
      const assets = store.mediaAssets || [];
      const hasUploaded = assets.some((a: any) => 
        Number(a.contentId || a.content_id) === Number(item.id) && 
        (a.assetType || a.asset_type) === 'MASTER_VIDEO' && 
        a.status === 'UPLOADED'
      );
      if (hasUploaded) {
        item.masterVideoStatus = 'UPLOADED';
        item.master_video_status = 'UPLOADED';
      }
    }
    return item || null;
  }

  /**
   * Insert new movie/series/content item into Database + Local Cache
   */
  static async insertContent(data: any): Promise<any> {
    const title = String(data.title || '').trim();
    const slug = data.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
    let createdId: number | null = null;

    try {
      const config = getDbConfig();
      if (config.isMysql) {
        const res: any = await executeUniversalQuery(
          `INSERT INTO content_items (
            type, title, slug, short_description, full_description,
            release_date, release_year, duration, language, country,
            age_rating, access_type, is_published, master_video_status,
            poster_url, landscape_url, hero_url, trailer_url, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.type || 'MOVIE',
            title,
            slug,
            data.shortDescription || '',
            data.fullDescription || '',
            data.releaseDate || new Date().toISOString().split('T')[0],
            data.releaseYear ? parseInt(String(data.releaseYear)) : new Date().getFullYear(),
            data.duration ? parseInt(String(data.duration)) : 120,
            data.language || 'Bengali',
            data.country || 'Bangladesh',
            data.ageRating || 'U/A 13+',
            data.accessType || 'PREMIUM',
            data.isPublished ? 1 : 0,
            data.masterVideoStatus || 'NOT_STARTED',
            data.posterUrl || '',
            data.landscapeUrl || '',
            data.heroUrl || '',
            data.trailerUrl || '',
            data.createdBy || 'admin',
          ]
        );
        createdId = res.insertId || (res[0] && res[0].insertId);
      } else {
        const rows = await executeUniversalQuery(
          `INSERT INTO content_items (
            type, title, slug, short_description, full_description,
            release_date, release_year, duration, language, country,
            age_rating, access_type, is_published, master_video_status,
            poster_url, landscape_url, hero_url, trailer_url, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING id`,
          [
            data.type || 'MOVIE',
            title,
            slug,
            data.shortDescription || '',
            data.fullDescription || '',
            data.releaseDate || new Date().toISOString().split('T')[0],
            data.releaseYear ? parseInt(String(data.releaseYear)) : new Date().getFullYear(),
            data.duration ? parseInt(String(data.duration)) : 120,
            data.language || 'Bengali',
            data.country || 'Bangladesh',
            data.ageRating || 'U/A 13+',
            data.accessType || 'PREMIUM',
            Boolean(data.isPublished),
            data.masterVideoStatus || 'NOT_STARTED',
            data.posterUrl || '',
            data.landscapeUrl || '',
            data.heroUrl || '',
            data.trailerUrl || '',
            data.createdBy || 'admin',
          ]
        );
        if (rows && rows[0]) createdId = rows[0].id;
      }

      // Insert genre associations
      if (createdId && Array.isArray(data.genreIds) && data.genreIds.length > 0) {
        for (const gid of data.genreIds) {
          if (gid) {
            await executeUniversalQuery(
              `INSERT IGNORE INTO content_genres (content_id, genre_id) VALUES (?, ?)`,
              [createdId, Number(gid)]
            ).catch(() => {});
          }
        }
      }

      // Insert cast & crew
      if (createdId && Array.isArray(data.castCrew) && data.castCrew.length > 0) {
        for (const member of data.castCrew) {
          if (member && member.name) {
            const pName = String(member.name).trim();
            let pid = member.personId;
            if (!pid) {
              const pRows = await executeUniversalQuery(`SELECT id FROM people WHERE name = ? LIMIT 1`, [pName]).catch(() => []);
              if (pRows.length > 0) {
                pid = pRows[0].id;
              } else {
                const insP: any = await executeUniversalQuery(
                  `INSERT INTO people (name, role) VALUES (?, ?)`,
                  [pName, member.role || 'ACTOR']
                ).catch(() => null);
                pid = insP?.insertId || insP?.[0]?.id;
              }
            }
            if (pid) {
              await executeUniversalQuery(
                `INSERT INTO content_cast_crew (content_id, person_id, character_name, role) VALUES (?, ?, ?, ?)`,
                [createdId, pid, member.characterName || null, member.role || 'ACTOR']
              ).catch(() => {});
            }
          }
        }
      }
      // Insert or update corresponding media asset for Cloudflare R2
      if (createdId) {
        const defaultStorageKey = data.masterStorageKey || `janalaa/videos/movies/${createdId}/master-video.mp4`;
        const cdnUrl = `https://pub-ee38c54312d840848b29a64fc376234e.r2.dev/${defaultStorageKey.replace(/^\/+/, '')}`;
        const streamUrl = `/api/v1/admin/media/content/${createdId}/stream`;

        await executeUniversalQuery(
          `INSERT INTO media_assets (content_id, asset_type, storage_provider, storage_key, stream_url, cdn_playback_url, r2_bucket, original_file_name, mime_type, file_size, status, is_current)
           VALUES (?, 'MASTER_VIDEO', 'Cloudflare R2 (Bucket: ayan)', ?, ?, ?, 'ayan', 'master-video.mp4', 'video/mp4', 2450892011, ?, 1)
           ON DUPLICATE KEY UPDATE storage_key = VALUES(storage_key), stream_url = VALUES(stream_url), cdn_playback_url = VALUES(cdn_playback_url), status = VALUES(status)`,
          [createdId, defaultStorageKey, streamUrl, cdnUrl, data.masterVideoStatus || 'UPLOADED']
        ).catch(() => {});
      }
    } catch (err: any) {
      console.warn('Database insert notice (auto-saved to resilient store):', err.message || err);
    }

    // Always maintain record in Resilient Local Store
    const store = getLocalStore();
    const finalId = createdId || (store.contentItems.length > 0 ? Math.max(...store.contentItems.map((i: any) => i.id || 0)) + 1 : 101);

    const record = {
      id: finalId,
      type: data.type || 'MOVIE',
      title,
      slug,
      shortDescription: data.shortDescription || '',
      fullDescription: data.fullDescription || '',
      releaseDate: data.releaseDate || new Date().toISOString().split('T')[0],
      releaseYear: data.releaseYear ? parseInt(String(data.releaseYear)) : new Date().getFullYear(),
      duration: data.duration ? parseInt(String(data.duration)) : 120,
      language: data.language || 'Bengali',
      country: data.country || 'Bangladesh',
      ageRating: data.ageRating || 'U/A 13+',
      accessType: data.accessType || 'PREMIUM',
      isPublished: Boolean(data.isPublished),
      masterVideoStatus: data.masterVideoStatus || 'NOT_STARTED',
      posterUrl: data.posterUrl || '',
      landscapeUrl: data.landscapeUrl || '',
      heroUrl: data.heroUrl || '',
      trailerUrl: data.trailerUrl || '',
      createdBy: data.createdBy || 'admin',
      isArchived: false,
      genres: data.genres || (data.genreIds ? data.genreIds.map((id: any) => ({ id: Number(id), name: 'Genre' })) : []),
      castCrew: data.castCrew || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.contentItems.unshift(record);
    saveLocalStore(store);

    return record;
  }

  /**
   * Update existing content item
   */
  static async updateContent(id: number, data: any): Promise<any> {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      const config = getDbConfig();
      if (data.title !== undefined) { updates.push('title = ?'); values.push(String(data.title).trim()); }
      if (data.slug !== undefined) { updates.push('slug = ?'); values.push(data.slug); }
      if (data.shortDescription !== undefined) { updates.push('short_description = ?'); values.push(data.shortDescription); }
      if (data.fullDescription !== undefined) { updates.push('full_description = ?'); values.push(data.fullDescription); }
      if (data.releaseDate !== undefined) { updates.push('release_date = ?'); values.push(data.releaseDate); }
      if (data.releaseYear !== undefined) { updates.push('release_year = ?'); values.push(parseInt(String(data.releaseYear))); }
      if (data.duration !== undefined) { updates.push('duration = ?'); values.push(parseInt(String(data.duration))); }
      if (data.language !== undefined) { updates.push('language = ?'); values.push(data.language); }
      if (data.country !== undefined) { updates.push('country = ?'); values.push(data.country); }
      if (data.ageRating !== undefined) { updates.push('age_rating = ?'); values.push(data.ageRating); }
      if (data.accessType !== undefined) { updates.push('access_type = ?'); values.push(data.accessType); }
      if (data.isPublished !== undefined) {
        updates.push('is_published = ?');
        values.push(config.isMysql ? (data.isPublished ? 1 : 0) : Boolean(data.isPublished));
      }
      if (data.isArchived !== undefined) {
        updates.push('is_archived = ?');
        values.push(config.isMysql ? (data.isArchived ? 1 : 0) : Boolean(data.isArchived));
      }
      if (data.posterUrl !== undefined) { updates.push('poster_url = ?'); values.push(data.posterUrl); }
      if (data.landscapeUrl !== undefined) { updates.push('landscape_url = ?'); values.push(data.landscapeUrl); }
      if (data.heroUrl !== undefined) { updates.push('hero_url = ?'); values.push(data.heroUrl); }
      if (data.trailerUrl !== undefined) { updates.push('trailer_url = ?'); values.push(data.trailerUrl); }
      if (data.masterVideoStatus !== undefined) { updates.push('master_video_status = ?'); values.push(data.masterVideoStatus); }

      if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        values.push(id);
        await executeUniversalQuery(`UPDATE content_items SET ${updates.join(', ')} WHERE id = ?`, values);
      }

      // Update genre junction table if genreIds provided
      if (Array.isArray(data.genreIds)) {
        await executeUniversalQuery(`DELETE FROM content_genres WHERE content_id = ?`, [id]).catch(() => {});
        for (const gid of data.genreIds) {
          if (gid) {
            await executeUniversalQuery(`INSERT INTO content_genres (content_id, genre_id) VALUES (?, ?)`, [id, Number(gid)]).catch(() => {});
          }
        }
      }

      // Update cast/crew junction table if castCrew provided
      if (Array.isArray(data.castCrew)) {
        await executeUniversalQuery(`DELETE FROM content_cast_crew WHERE content_id = ?`, [id]).catch(() => {});
        for (const member of data.castCrew) {
          if (member && member.name) {
            const pName = String(member.name).trim();
            let pid = member.personId;
            if (!pid) {
              const pRows = await executeUniversalQuery(`SELECT id FROM people WHERE name = ? LIMIT 1`, [pName]).catch(() => []);
              if (pRows.length > 0) {
                pid = pRows[0].id;
              } else {
                const insP: any = await executeUniversalQuery(`INSERT INTO people (name, role) VALUES (?, ?)`, [pName, member.role || 'ACTOR']).catch(() => null);
                pid = insP?.insertId || insP?.[0]?.id;
              }
            }
            if (pid) {
              await executeUniversalQuery(`INSERT INTO content_cast_crew (content_id, person_id, character_name, role) VALUES (?, ?, ?, ?)`, [id, pid, member.characterName || null, member.role || 'ACTOR']).catch(() => {});
            }
          }
        }
      }

      // Upsert media asset record
      if (data.masterStorageKey || data.masterVideoStatus) {
        const key = data.masterStorageKey || `janalaa/videos/movies/${id}/master-video.mp4`;
        const cdnUrl = `https://pub-ee38c54312d840848b29a64fc376234e.r2.dev/${key.replace(/^\/+/, '')}`;
        const streamUrl = `/api/v1/admin/media/content/${id}/stream`;
        const status = data.masterVideoStatus || 'UPLOADED';

        await executeUniversalQuery(
          `INSERT INTO media_assets (content_id, asset_type, storage_provider, storage_key, stream_url, cdn_playback_url, r2_bucket, original_file_name, mime_type, file_size, status, is_current)
           VALUES (?, 'MASTER_VIDEO', 'Cloudflare R2 (Bucket: ayan)', ?, ?, ?, 'ayan', 'master-video.mp4', 'video/mp4', 2450892011, ?, 1)
           ON DUPLICATE KEY UPDATE storage_key = VALUES(storage_key), stream_url = VALUES(stream_url), cdn_playback_url = VALUES(cdn_playback_url), status = VALUES(status)`,
          [id, key, streamUrl, cdnUrl, status]
        ).catch(() => {});
      }
    } catch (e: any) {
      console.warn('Database update notice (saved to resilient store):', e?.message || e);
    }

    // Update in local store
    const store = getLocalStore();
    const idx = store.contentItems.findIndex((i: any) => i.id === Number(id));
    if (idx >= 0) {
      store.contentItems[idx] = {
        ...store.contentItems[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      saveLocalStore(store);
      return store.contentItems[idx];
    }

    return { id, ...data };
  }

  /**
   * Delete or archive content item
   */
  static async deleteContent(id: number): Promise<boolean> {
    try {
      await executeUniversalQuery(`DELETE FROM content_items WHERE id = ?`, [id]);
    } catch (e) {}

    const store = getLocalStore();
    store.contentItems = store.contentItems.filter((i: any) => i.id !== Number(id));
    saveLocalStore(store);
    return true;
  }
}
