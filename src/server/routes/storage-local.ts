import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// PUT /api/v1/storage/local-upload (Single file presigned URL simulation)
router.put('/local-upload', (req: Request, res: Response) => {
  const key = req.query.key as string;
  if (!key) return res.status(400).send('Missing key');

  const filePath = path.join(process.cwd(), 'temp_storage', 'files', key);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const writeStream = fs.createWriteStream(filePath);
  req.pipe(writeStream);

  writeStream.on('finish', () => {
    res.setHeader('ETag', `"local-etag-${Date.now()}"`);
    res.status(200).send('OK');
  });

  writeStream.on('error', (err) => {
    console.error('Local upload write error:', err);
    res.status(500).send('Failed to write file');
  });
});

// PUT /api/v1/storage/local-multipart (Multipart part upload simulation)
router.put('/local-multipart', (req: Request, res: Response) => {
  const { uploadId, partNumber, key } = req.query;
  if (!uploadId || !partNumber) {
    return res.status(400).send('Missing uploadId or partNumber');
  }

  const partDir = path.join(process.cwd(), 'temp_storage', 'multiparts', String(uploadId));
  fs.mkdirSync(partDir, { recursive: true });

  const partPath = path.join(partDir, `part_${partNumber}`);
  const writeStream = fs.createWriteStream(partPath);
  req.pipe(writeStream);

  writeStream.on('finish', () => {
    const etag = `"local-part-${uploadId}-${partNumber}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Access-Control-Expose-Headers', 'ETag');
    res.status(200).json({ ETag: etag });
  });

  writeStream.on('error', (err) => {
    console.error('Local part write error:', err);
    res.status(500).send('Failed to write part');
  });
});

// GET /api/v1/storage/file (Serve file with HTTP 206 range support)
router.get('/file', (req: Request, res: Response) => {
  const key = req.query.key as string;
  if (!key) return res.status(400).send('Missing key');

  const filePath = path.join(process.cwd(), 'temp_storage', 'files', key);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, ETag');

  const mimeType = key.endsWith('.mp4')
    ? 'video/mp4'
    : key.endsWith('.webm')
    ? 'video/webm'
    : key.endsWith('.mov')
    ? 'video/quicktime'
    : key.endsWith('.mkv')
    ? 'video/x-matroska'
    : 'application/octet-stream';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }

    const chunkSize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mimeType,
      'Access-Control-Allow-Origin': '*',
    });
    fileStream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

export default router;
