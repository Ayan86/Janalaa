import { Router, Response } from 'express';
import { db } from '../../db/index.ts';
import { genres, people, subtitles, audioTracks, auditLogs } from '../../db/schema.ts';
import { requireAuth, requireRole, AuthRequest } from '../../middleware/auth.ts';
import { eq, desc } from 'drizzle-orm';
import { validateSlug, validateTextCompliance, generateSafeSlug } from '../../lib/termsValidation.ts';

const router = Router();

// --- GENRES ---
router.get('/genres', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER', 'FINANCE_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const list = await db.select().from(genres).orderBy(genres.name);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch genres' });
  }
});

router.post('/genres', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

    // Validate name and description against prohibited compliance terms
    const nameCheck = validateTextCompliance(name.trim(), 'Genre Name');
    if (!nameCheck.valid) {
      return res.status(400).json({ error: nameCheck.error });
    }

    if (description) {
      const descCheck = validateTextCompliance(description, 'Genre Description');
      if (!descCheck.valid) {
        return res.status(400).json({ error: descCheck.error });
      }
    }

    // Validate slug
    const candidateSlug = (slug || name).toLowerCase().trim();
    const slugCheck = validateSlug(candidateSlug);
    if (!slugCheck.valid) {
      return res.status(400).json({
        error: `Invalid genre slug: ${slugCheck.errors.join('. ')}`,
        errors: slugCheck.errors,
        isReserved: slugCheck.isReserved,
        hasProhibited: slugCheck.hasProhibited,
        suggestions: slugCheck.suggestions,
      });
    }

    const finalSlug = slugCheck.value;
    const inserted = await db.insert(genres).values({
      name: name.trim(),
      slug: finalSlug,
      description,
    }).returning();

    await db.insert(auditLogs).values({
      userId: String(req.user?.id),
      userEmail: req.user?.email,
      action: 'GENRE_CREATED',
      resource: 'GENRE',
      resourceId: String(inserted[0].id),
      ipAddress: req.ip || '127.0.0.1',
      details: JSON.stringify({ name }),
    });

    res.status(201).json(inserted[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create genre' });
  }
});

// --- PEOPLE (CAST & CREW) ---
router.get('/people', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER', 'FINANCE_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const list = await db.select().from(people).orderBy(people.name);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch people' });
  }
});

router.post('/people', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, role = 'ACTOR', photoUrl, biography } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

    const inserted = await db.insert(people).values({
      name: name.trim(),
      role,
      photoUrl,
      biography,
    }).returning();

    await db.insert(auditLogs).values({
      userId: String(req.user?.id),
      userEmail: req.user?.email,
      action: 'PERSON_CREATED',
      resource: 'PERSON',
      resourceId: String(inserted[0].id),
      ipAddress: req.ip || '127.0.0.1',
      details: JSON.stringify({ name, role }),
    });

    res.status(201).json(inserted[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create person' });
  }
});

// --- SUBTITLES ---
router.get('/subtitles/:contentId', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER', 'FINANCE_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const contentId = parseInt(req.params.contentId);
    const list = await db.select().from(subtitles).where(eq(subtitles.contentId, contentId));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subtitles' });
  }
});

router.post('/subtitles', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const { contentId, episodeId, language, label, format = 'VTT', isDefault = false, isForced = false, storageKey } = req.body;
    if (!language || !label) return res.status(400).json({ error: 'Language and label are required' });

    const inserted = await db.insert(subtitles).values({
      contentId: contentId ? Number(contentId) : null,
      episodeId: episodeId ? Number(episodeId) : null,
      language,
      label,
      format,
      isDefault: Boolean(isDefault),
      isForced: Boolean(isForced),
      storageKey,
    }).returning();

    await db.insert(auditLogs).values({
      userId: String(req.user?.id),
      userEmail: req.user?.email,
      action: 'SUBTITLE_UPLOADED',
      resource: 'SUBTITLE',
      resourceId: String(inserted[0].id),
      ipAddress: req.ip || '127.0.0.1',
      details: JSON.stringify({ language, format }),
    });

    res.status(201).json(inserted[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create subtitle record' });
  }
});

// --- AUDIO TRACKS ---
router.get('/audio/:contentId', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER', 'FINANCE_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const contentId = parseInt(req.params.contentId);
    const list = await db.select().from(audioTracks).where(eq(audioTracks.contentId, contentId));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audio tracks' });
  }
});

router.post('/audio', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const { contentId, episodeId, language, label, codec = 'AAC', isDefault = false, storageKey } = req.body;
    if (!language || !label) return res.status(400).json({ error: 'Language and label are required' });

    const inserted = await db.insert(audioTracks).values({
      contentId: contentId ? Number(contentId) : null,
      episodeId: episodeId ? Number(episodeId) : null,
      language,
      label,
      codec,
      isDefault: Boolean(isDefault),
      storageKey,
    }).returning();

    await db.insert(auditLogs).values({
      userId: String(req.user?.id),
      userEmail: req.user?.email,
      action: 'AUDIO_UPLOADED',
      resource: 'AUDIO_TRACK',
      resourceId: String(inserted[0].id),
      ipAddress: req.ip || '127.0.0.1',
      details: JSON.stringify({ language, codec }),
    });

    res.status(201).json(inserted[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create audio track record' });
  }
});

export default router;
