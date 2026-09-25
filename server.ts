import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import authRoutes from './src/server/routes/auth.ts';
import dashboardRoutes from './src/server/routes/dashboard.ts';
import contentRoutes from './src/server/routes/content.ts';
import mediaRoutes from './src/server/routes/media.ts';
import libraryRoutes from './src/server/routes/library.ts';
import financeRoutes from './src/server/routes/finance.ts';
import settingsRoutes from './src/server/routes/settings.ts';
import termsRoutes from './src/server/routes/terms.ts';
import storageLocalRoutes from './src/server/routes/storage-local.ts';
import aiRoutes from './src/server/routes/ai.ts';
import metadataRoutes from './src/api/metadata.ts';
import { enforceMetadataPersistence } from './src/middleware/dbSyncMiddleware.ts';
import { initializeDatabase } from './src/db/init.ts';

// Load environment variables (.env first, then fallback to .env.example)
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.example') });

// Process-level crash prevention (ensures Hostinger/Node never abruptly drops connection)
process.on('uncaughtException', (err) => {
  console.error('⚠️ [Server Error Non-Fatal Uncaught Exception]:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Server Error Non-Fatal Unhandled Rejection]:', reason);
});

const rawPort = process.env.PORT || 3000;

async function startServer() {
  const app = express();

  // Basic CORS & security headers
  app.use((req, res, next) => {
    // Allow all origins dynamically, prioritizing incoming origin header for seamless iframe and dev previews
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Range, Accept, Origin');
    res.setHeader('Access-Control-Expose-Headers', 'ETag, Content-Range, Content-Length, Accept-Ranges');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Ensure upload folders exist
  const uploadFolders = [
    path.join(process.cwd(), 'uploads', 'images', 'posters'),
    path.join(process.cwd(), 'uploads', 'images', 'landscapes'),
    path.join(process.cwd(), 'uploads', 'images', 'heroes'),
    path.join(process.cwd(), 'uploads', 'images', 'general'),
  ];
  uploadFolders.forEach((folder) => {
    try {
      fs.mkdirSync(folder, { recursive: true });
    } catch (e) {}
  });

  // Serve static assets from public folder and persistent uploaded image folders
  app.use(express.static(path.join(process.cwd(), 'public')));
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Local storage routes (before json parser so raw streams can be handled cleanly)
  app.use('/api/v1/storage', storageLocalRoutes);

  // Standard JSON and URL-encoded body parsers
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check with DB status
  app.get('/api/health', async (req, res) => {
    let dbStatus = 'unknown';
    let dbError = null;
    try {
      const { pool } = await import('./src/db/index.ts');
      const result = await pool.query('SELECT 1 as test');
      dbStatus = result ? 'connected' : 'disconnected';
    } catch (err: any) {
      dbStatus = 'error';
      dbError = err?.message || String(err);
    }
    res.json({
      status: 'ok',
      service: 'JANALA OTT Admin API',
      database: {
        status: dbStatus,
        error: dbError,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // One-click database bootstrap endpoint (creates tables & seed admin accounts)
  app.get(['/api/setup-db', '/api/v1/setup-db'], async (req, res) => {
    try {
      await initializeDatabase();
      res.json({
        success: true,
        message: 'JANALA OTT Database successfully initialized and seeded!',
        adminCredentials: [
          { email: 'ayan.sit@gmail.com', password: 'Admin@Janala2026!', role: 'ADMIN' },
          { email: 'admin@janala.local', password: 'Admin@Janala2026!', role: 'ADMIN' },
        ],
        loginUrl: '/login',
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to initialize database',
        details: err?.message || String(err),
        hint: 'Please check your SQL_HOST, SQL_USER, and SQL_PASSWORD in your .env file.',
      });
    }
  });

  // Version 1 API Routes
  app.use('/api/v1/admin', enforceMetadataPersistence);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/admin/dashboard', dashboardRoutes);
  app.use('/api/v1/admin/content', contentRoutes);
  app.use('/api/v1/admin/movies', contentRoutes);
  app.use('/api/v1/admin/media', mediaRoutes);
  app.use('/api/v1/admin/library', libraryRoutes);
  app.use('/api/v1/admin/finance', financeRoutes);
  app.use('/api/v1/admin/settings', settingsRoutes);
  app.use('/api/v1/admin/terms', termsRoutes);
  app.use('/api/v1/admin/ai', aiRoutes);
  app.use('/api/v1/admin/metadata', metadataRoutes);
  app.use('/api/metadata', metadataRoutes);

  // 404 handler for unknown API routes (prevents falling through to Vite SPA HTML fallback)
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // Explicit Wallpaper & Heritage Branding asset routes
  app.get(['/Janalaa_Theme.png', '/assets/Janalaa_Theme.png'], (req, res) => {
    const pngPath = path.join(process.cwd(), 'public', 'Janalaa_Theme.png');
    if (fs.existsSync(pngPath)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      return res.sendFile(pngPath);
    }
    const svgPath = path.join(process.cwd(), 'public', 'janalaa_theme_bg.svg');
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.sendFile(svgPath);
  });

  app.get(['/janalaa_theme_bg.svg', '/assets/janalaa_theme_bg.svg'], (req, res) => {
    const svgPath = path.join(process.cwd(), 'public', 'janalaa_theme_bg.svg');
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.sendFile(svgPath);
  });

  // Auto-initialize and seed database with demo users, movies, series, episodes, genres on boot
  initializeDatabase().catch((err) => {
    console.error('Database initialization non-fatal error:', err);
  });

  // Serve frontend assets (Vite dev server middleware in dev, static dist in production)
  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.join(process.cwd(), 'dist');

  if (isProduction && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(200).send(`<!DOCTYPE html><html><head><title>JANALA OTT Admin</title></head><body><h1>JANALA OTT Admin API is Running</h1><p>Frontend assets are compiling. Please refresh in a moment.</p></body></html>`);
      }
    });
  } else {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn('Vite dev middleware fallback:', viteErr);
    }
  }

  // Listen gracefully on number port or Passenger unix socket
  const portNum = Number(rawPort);
  if (!isNaN(portNum) && String(rawPort).trim() !== '' && !String(rawPort).startsWith('/') && !String(rawPort).startsWith('\\\\')) {
    app.listen(portNum, '0.0.0.0', () => {
      console.log(`🚀 JANALA OTT Admin Server running at http://0.0.0.0:${portNum}`);
    });
  } else {
    app.listen(rawPort, () => {
      console.log(`🚀 JANALA OTT Admin Server running on assigned socket/port: ${rawPort}`);
    });
  }
}

startServer();
