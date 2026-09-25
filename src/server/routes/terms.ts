import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../../middleware/auth.ts';
import { db } from '../../db/index.ts';
import { auditLogs } from '../../db/schema.ts';
import {
  RESERVED_SLUGS_CATEGORIES,
  PROHIBITED_TERMS_CATEGORIES,
  ALL_RESERVED_SLUGS,
  ALL_PROHIBITED_TERMS,
  getCustomTerms,
  addCustomTerm,
  removeCustomTerm,
  validateSlug,
  validateTextCompliance,
  validateContentPayload,
  generateSafeSlug,
} from '../../lib/termsValidation.ts';

const router = Router();

// GET /api/v1/admin/terms
// Retrieve the complete catalog of reserved system keywords and prohibited compliance terms
router.get('/', requireAuth, requireRole(['ADMIN', 'CONTENT_MANAGER', 'FINANCE_MANAGER']), (req: AuthRequest, res: Response) => {
  const custom = getCustomTerms();
  res.json({
    reserved: {
      totalCount: ALL_RESERVED_SLUGS.size + custom.reserved.length,
      categories: RESERVED_SLUGS_CATEGORIES,
      all: Array.from(ALL_RESERVED_SLUGS).sort(),
      custom: custom.reserved,
    },
    prohibited: {
      totalCount: ALL_PROHIBITED_TERMS.size + custom.prohibited.length,
      categories: PROHIBITED_TERMS_CATEGORIES,
      all: Array.from(ALL_PROHIBITED_TERMS).sort(),
      custom: custom.prohibited,
    },
  });
});

// POST /api/v1/admin/terms/validate
// Live validation endpoint for titles, slugs, and narrative descriptions
router.post('/validate', requireAuth, (req: AuthRequest, res: Response) => {
  const { title, slug, shortDescription, fullDescription } = req.body;

  const result = validateContentPayload({
    title,
    slug,
    shortDescription,
    fullDescription,
  });

  let safeSlugSuggestion: string | undefined = undefined;
  if (slug || title) {
    safeSlugSuggestion = generateSafeSlug(slug || title || 'film');
  }

  res.json({
    ...result,
    safeSlugSuggestion,
  });
});

// POST /api/v1/admin/terms/custom (ADMIN only)
// Register a custom prohibited term or reserved slug
router.post('/custom', requireAuth, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { term, type } = req.body; // type: 'reserved' | 'prohibited'
    if (!term || typeof term !== 'string' || !term.trim()) {
      return res.status(400).json({ error: 'Term string is required' });
    }
    if (type !== 'reserved' && type !== 'prohibited') {
      return res.status(400).json({ error: 'Type must be either "reserved" or "prohibited"' });
    }

    const cleanTerm = term.toLowerCase().trim();
    addCustomTerm(cleanTerm, type);

    // Audit log
    await db.insert(auditLogs).values({
      userId: String(req.user?.id),
      userEmail: req.user?.email,
      action: type === 'reserved' ? 'CUSTOM_RESERVED_TERM_ADDED' : 'CUSTOM_PROHIBITED_TERM_ADDED',
      resource: 'TERMS_POLICY',
      resourceId: cleanTerm,
      ipAddress: req.ip || '127.0.0.1',
      details: JSON.stringify({ term: cleanTerm, type }),
    });

    res.json({
      success: true,
      message: `Successfully added '${cleanTerm}' to custom ${type} terms list`,
      custom: getCustomTerms(),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add custom term' });
  }
});

// DELETE /api/v1/admin/terms/custom (ADMIN only)
router.delete('/custom', requireAuth, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { term, type } = req.body;
    if (!term || !type) {
      return res.status(400).json({ error: 'Term and type are required' });
    }

    const cleanTerm = String(term).toLowerCase().trim();
    const removed = removeCustomTerm(cleanTerm, type);

    if (!removed) {
      return res.status(404).json({ error: `Custom term '${cleanTerm}' not found` });
    }

    await db.insert(auditLogs).values({
      userId: String(req.user?.id),
      userEmail: req.user?.email,
      action: type === 'reserved' ? 'CUSTOM_RESERVED_TERM_REMOVED' : 'CUSTOM_PROHIBITED_TERM_REMOVED',
      resource: 'TERMS_POLICY',
      resourceId: cleanTerm,
      ipAddress: req.ip || '127.0.0.1',
      details: JSON.stringify({ term: cleanTerm, type }),
    });

    res.json({
      success: true,
      message: `Successfully removed '${cleanTerm}' from custom ${type} terms list`,
      custom: getCustomTerms(),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to remove custom term' });
  }
});

export default router;
