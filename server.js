import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Global unhandled error protection to keep Hostinger passenger daemon alive
process.on('uncaughtException', (err) => {
  console.error('⚠️ [Server Error Uncaught Exception]:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Server Error Unhandled Rejection]:', reason);
});

const distBundle = path.join(__dirname, 'dist', 'server.cjs');

if (fs.existsSync(distBundle)) {
  try {
    require(distBundle);
  } catch (loadErr) {
    console.error('Error loading dist/server.cjs:', loadErr);
    startFallbackServer();
  }
} else {
  console.log('Production bundle dist/server.cjs not found. Attempting build...');
  let buildSucceeded = false;
  try {
    const { execSync } = require('child_process');
    execSync('npm run build', { stdio: 'inherit' });
    if (fs.existsSync(distBundle)) {
      require(distBundle);
      buildSucceeded = true;
    }
  } catch (err) {
    console.warn('Auto-build skipped or not supported in current environment:', err?.message || err);
  }

  if (!buildSucceeded) {
    startFallbackServer();
  }
}

function startFallbackServer() {
  const rawPort = process.env.PORT || 3000;
  const distDir = path.join(__dirname, 'dist');
  const publicDir = path.join(__dirname, 'public');

  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/api/health' || req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'JANALA OTT Admin Server', mode: 'static-fallback', timestamp: new Date().toISOString() }));
      return;
    }

    let filePath = path.join(distDir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      filePath = path.join(publicDir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.mp4': 'video/mp4',
        '.woff2': 'font/woff2',
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html><html><head><title>JANALA OTT Admin</title></head><body style="font-family:sans-serif;background:#0d080a;color:#f5ebe1;padding:40px;text-align:center;"><h2>JANALA OTT Admin Platform is Starting</h2><p>Please run <code>npm run build</code> to generate frontend production assets.</p></body></html>`);
    }
  });

  const portNum = Number(rawPort);
  if (!isNaN(portNum) && String(rawPort).trim() !== '' && !String(rawPort).startsWith('/') && !String(rawPort).startsWith('\\\\')) {
    server.listen(portNum, '0.0.0.0', () => {
      console.log(`🚀 Fallback JANALA OTT Admin Server running at http://0.0.0.0:${portNum}`);
    });
  } else {
    server.listen(rawPort, () => {
      console.log(`🚀 Fallback JANALA OTT Admin Server running on assigned socket/port: ${rawPort}`);
    });
  }
}
