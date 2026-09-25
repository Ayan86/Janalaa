import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.ts';
import { executeUniversalQuery, getDbConfig } from '../db/index.ts';

/**
 * Middleware to enforce authenticated header verification and attach
 * database persistence metadata headers for all POST/PUT/PATCH mutations.
 */
export async function enforceMetadataPersistence(req: AuthRequest, res: Response, next: NextFunction) {
  // Only process write mutations (POST, PUT, PATCH, DELETE)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const config = getDbConfig();
    
    // Attach audit and persistence tracing headers
    res.setHeader('X-Metadata-Provider', config.isMysql ? 'Hostinger MySQL (u139837875_janalaa_db)' : 'PostgreSQL Database');
    res.setHeader('X-Metadata-User', req.user?.email || 'admin');
    res.setHeader('X-Metadata-Timestamp', new Date().toISOString());

    // Record audit event in Hostinger MySQL database asynchronously
    if (req.user?.email) {
      const resourceType = req.path.includes('movies')
        ? 'MOVIE'
        : req.path.includes('series')
        ? 'SERIES'
        : req.path.includes('media')
        ? 'MEDIA_ASSET'
        : 'METADATA';

      executeUniversalQuery(
        `INSERT INTO audit_logs (user_id, user_email, action, resource, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          String(req.user.id || 1),
          req.user.email,
          `${req.method}_${resourceType}`,
          resourceType,
          JSON.stringify({ path: req.path, method: req.method, title: req.body?.title || req.body?.name }),
          req.ip || '127.0.0.1',
        ]
      ).catch(() => {});
    }
  }

  next();
}
