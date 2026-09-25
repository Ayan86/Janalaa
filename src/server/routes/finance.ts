import { Router, Response } from 'express';
import { db } from '../../db/index.ts';
import { subscriptions, auditLogs } from '../../db/schema.ts';
import { requireAuth, requireRole, AuthRequest } from '../../middleware/auth.ts';
import { desc, eq } from 'drizzle-orm';

const router = Router();

// GET /api/v1/admin/finance/overview (Strictly ADMIN & FINANCE_MANAGER)
router.get('/overview', requireAuth, requireRole(['ADMIN', 'FINANCE_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const list = await db.select().from(subscriptions).orderBy(desc(subscriptions.startDate));

    let totalRevenue = 0;
    let activeSubs = 0;
    let monthlySubs = 0;
    let annualSubs = 0;
    let vipSubs = 0;

    for (const sub of list) {
      if (sub.status === 'ACTIVE') {
        activeSubs++;
        totalRevenue += Number(sub.amount) || 0;
        if (sub.plan.includes('MONTHLY')) monthlySubs++;
        else if (sub.plan.includes('ANNUAL')) annualSubs++;
        else if (sub.plan.includes('FAMILY') || sub.plan.includes('VIP')) vipSubs++;
      }
    }

    res.json({
      metrics: {
        activeSubscriptions: activeSubs,
        totalRevenue: totalRevenue.toFixed(2),
        currency: 'USD',
        mrr: (monthlySubs * 9.99 + (annualSubs * 89.99) / 12 + vipSubs * 14.99).toFixed(2),
        arr: ((monthlySubs * 9.99 + (annualSubs * 89.99) / 12 + vipSubs * 14.99) * 12).toFixed(2),
      },
      planDistribution: [
        { plan: 'Premium Monthly ($9.99)', count: monthlySubs, revenue: (monthlySubs * 9.99).toFixed(2) },
        { plan: 'Premium Annual ($89.99)', count: annualSubs, revenue: (annualSubs * 89.99).toFixed(2) },
        { plan: 'VIP Family Pass ($14.99)', count: vipSubs, revenue: (vipSubs * 14.99).toFixed(2) },
      ],
      recentSubscriptions: list.slice(0, 20),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch financial data' });
  }
});

// GET /api/v1/admin/subscriptions
router.get('/subscriptions', requireAuth, requireRole(['ADMIN', 'FINANCE_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const list = await db.select().from(subscriptions).orderBy(desc(subscriptions.startDate));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

export default router;
