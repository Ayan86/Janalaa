import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutBucketCorsCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

export interface StorageConfig {
  provider: 'r2' | 'local';
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName?: string;
  endpoint?: string;
  publicUrl?: string;
}

const CONFIG_FILE = path.join(process.cwd(), 'r2_config.json');

export function saveStorageConfig(newConfig: Partial<StorageConfig>): StorageConfig {
  let fileData: Record<string, any> = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      fileData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch {}
  }
  const merged: StorageConfig = {
    ...getStorageConfig(),
    ...fileData,
    ...newConfig,
  };
  if (merged.accountId) {
    merged.accountId = merged.accountId.trim().replace(/[./\\]+$/, '');
    if (!merged.endpoint) {
      merged.endpoint = `https://${merged.accountId}.r2.cloudflarestorage.com`;
    }
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
  s3ClientInstance = null; // force re-instantiation
  return merged;
}

export function getStorageConfig(): StorageConfig {
  let fileConfig: Partial<StorageConfig> = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch {}
  }

  let accountId = (fileConfig.accountId || process.env.R2_ACCOUNT_ID || '61fb1c91a19b595b9e0e767447383afe').trim();
  // Strip any trailing dots, slashes, or whitespace from accountId
  accountId = accountId.replace(/[./\\]+$/, '');

  const accessKeyId = (fileConfig.accessKeyId || process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (fileConfig.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucketName = (fileConfig.bucketName || process.env.R2_BUCKET_NAME || 'ayan').trim();

  // Normalize provider: support 'Cloudflare R2', 'r2', 'R2', or presence of accessKeyId
  const rawProvider = (fileConfig.provider || process.env.STORAGE_PROVIDER || '').trim().toLowerCase();
  const provider: 'r2' | 'local' =
    rawProvider === 'local'
      ? 'local'
      : rawProvider.includes('r2') || rawProvider.includes('cloudflare') || Boolean(accessKeyId) || Boolean(accountId)
      ? 'r2'
      : 'local';
  
  let endpoint = fileConfig.endpoint?.trim() || process.env.R2_ENDPOINT?.trim();
  if (!endpoint && accountId) {
    endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  }

  return {
    provider,
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint,
    publicUrl: fileConfig.publicUrl?.trim() || process.env.R2_PUBLIC_URL?.trim(),
  };
}

let s3ClientInstance: S3Client | null = null;

export function getS3Client(): S3Client | null {
  const config = getStorageConfig();
  if (config.provider !== 'r2') {
    return null;
  }
  if (!config.accessKeyId || !config.secretAccessKey || !config.endpoint) {
    return null;
  }

  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    // Automatically ensure CORS is configured on R2 bucket
    ensureBucketCors().catch((err) => {
      console.warn('Initial ensureBucketCors non-fatal error:', err?.message || err);
    });
  }

  return s3ClientInstance;
}

let corsEnsured = false;
export async function ensureBucketCors(): Promise<void> {
  if (corsEnsured) return;
  const config = getStorageConfig();
  if (config.provider !== 'r2' || !config.bucketName) return;

  const s3 = getS3Client();
  if (!s3) return;

  try {
    await s3.send(
      new PutBucketCorsCommand({
        Bucket: config.bucketName,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD', 'DELETE'],
              AllowedOrigins: ['*'],
              ExposeHeaders: ['ETag', 'etag', 'Content-Range', 'Accept-Ranges', 'Content-Length'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      })
    );
    corsEnsured = true;
    console.log(`Cloudflare R2 CORS configured successfully for bucket "${config.bucketName}".`);
  } catch (err: any) {
    console.warn(`Could not set CORS on R2 bucket "${config.bucketName}":`, err?.message || err);
  }
}

// Generate an organized object key
export function generateObjectKey(params: {
  contentType: string; // 'movies', 'series', 'tv_shows', 'short_films', 'documentaries'
  contentId: string | number;
  assetType: 'master' | 'trailer' | 'poster' | 'landscape' | 'hero' | 'thumbnail' | 'subtitles' | 'audio';
  originalFileName: string;
  seasonId?: string | number;
  episodeId?: string | number;
  language?: string;
}): string {
  const ext = path.extname(params.originalFileName).toLowerCase() || '.mp4';
  const rawBase = path.basename(params.originalFileName, ext);
  const cleanBase = rawBase.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 50);
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const fileSegment = cleanBase ? `${cleanBase}-${uniqueId}${ext}` : `${uniqueId}${ext}`;

  // Videos saved inside 'janalaa' folder within 'ayan' bucket
  if (params.contentType === 'series' && params.seasonId && params.episodeId) {
    return `janalaa/videos/series/${params.contentId}/seasons/${params.seasonId}/episodes/${params.episodeId}/${fileSegment}`;
  }

  if (params.assetType === 'master') {
    return `janalaa/videos/${params.contentType}/${params.contentId}/${fileSegment}`;
  }

  if (params.assetType === 'trailer') {
    return `janalaa/trailers/${params.contentType}/${params.contentId}/${fileSegment}`;
  }

  if (params.language && (params.assetType === 'subtitles' || params.assetType === 'audio')) {
    return `janalaa/${params.contentType}/${params.contentId}/${params.assetType}/${params.language}/${fileSegment}`;
  }

  return `janalaa/${params.contentType}/${params.contentId}/${params.assetType}/${fileSegment}`;
}

// Direct Presigned Upload URL for files (1-hour 3600s default for cinema uploads)
export async function getPresignedPutUrl(
  objectKey: string,
  contentType: string,
  expiresInSeconds = 3600
): Promise<{ uploadUrl: string; provider: 'r2' | 'local' }> {
  const config = getStorageConfig();
  const s3 = getS3Client();

  if (s3 && config.bucketName) {
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
    return { uploadUrl, provider: 'r2' };
  }

  // Local storage provider URL (for development testing when R2 credentials are not set)
  return {
    uploadUrl: `/api/v1/storage/local-upload?key=${encodeURIComponent(objectKey)}`,
    provider: 'local',
  };
}

// Initiate S3 Multipart Upload for 10 GB Video
export async function initiateMultipartUpload(
  objectKey: string,
  contentType: string
): Promise<{ uploadId: string; provider: 'r2' | 'local' }> {
  const config = getStorageConfig();
  const s3 = getS3Client();

  if (s3 && config.bucketName) {
    try {
      const command = new CreateMultipartUploadCommand({
        Bucket: config.bucketName,
        Key: objectKey,
        ContentType: contentType,
      });
      const res = await s3.send(command);
      if (res.UploadId) {
        return { uploadId: res.UploadId, provider: 'r2' };
      }
    } catch (s3Err: any) {
      console.error('S3/R2 multipart initiate failed:', s3Err);
      if (config.provider === 'r2') {
        throw new Error(`Cloudflare R2 API Error: ${s3Err.message || s3Err}. Please verify your Account ID, Access Key ID, and Secret Access Key in Settings.`);
      }
    }
  }

  // Local mock multipart upload ID only if explicit local provider requested
  const localUploadId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const localDir = path.join(process.cwd(), 'temp_storage', 'multiparts', localUploadId);
  fs.mkdirSync(localDir, { recursive: true });
  return { uploadId: localUploadId, provider: 'local' };
}

// Get Presigned URL for an Upload Part
export async function getPresignedPartUploadUrl(
  objectKey: string,
  uploadId: string,
  partNumber: number,
  expiresInSeconds = 3600
): Promise<string> {
  const config = getStorageConfig();
  const s3 = getS3Client();

  if (s3 && config.bucketName && uploadId && !uploadId.startsWith('local-')) {
    try {
      const command = new UploadPartCommand({
        Bucket: config.bucketName,
        Key: objectKey,
        UploadId: uploadId,
        PartNumber: partNumber,
      });
      const signed = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
      if (signed) return signed;
    } catch (signErr: any) {
      console.warn(`Presigned URL signing error for part ${partNumber}:`, signErr?.message || signErr);
    }
  }

  // Local handler URL
  return `/api/v1/storage/local-multipart?uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}&key=${encodeURIComponent(objectKey)}`;
}

// Complete Multipart Upload
export async function completeMultipartUpload(
  objectKey: string,
  uploadId: string,
  parts: Array<{ PartNumber: number; ETag: string }>
): Promise<{ location?: string; etag?: string }> {
  const config = getStorageConfig();
  const s3 = getS3Client();

  const safeObjectKey = String(objectKey || 'video.mp4');
  const safeUploadId = String(uploadId || 'local-fallback');

  if (s3 && config.bucketName && safeUploadId && !safeUploadId.startsWith('local-')) {
    try {
      const command = new CompleteMultipartUploadCommand({
        Bucket: config.bucketName,
        Key: safeObjectKey,
        UploadId: safeUploadId,
        MultipartUpload: {
          Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
        },
      });
      const res = await s3.send(command);
      return { location: res.Location, etag: res.ETag || 'completed' };
    } catch (compErr: any) {
      console.error('S3 complete multipart error:', compErr);
      if (config.provider === 'r2') {
        throw new Error(`Cloudflare R2 Complete Multipart Failed: ${compErr.message || compErr}. Please verify that all parts uploaded successfully.`);
      }
    }
  }

  // Local complete & parts assembly
  const baseMultipartsDir = path.join(process.cwd(), 'temp_storage', 'multiparts');
  let localDir = path.join(baseMultipartsDir, safeUploadId);

  // If specific uploadId directory is missing, scan for potential matching directories in temp_storage
  if (!fs.existsSync(localDir) && fs.existsSync(baseMultipartsDir)) {
    const candidateDirs = fs.readdirSync(baseMultipartsDir);
    for (const d of candidateDirs) {
      const candidatePath = path.join(baseMultipartsDir, d);
      if (fs.statSync(candidatePath).isDirectory()) {
        if (d.includes(safeUploadId) || safeUploadId.includes(d) || fs.readdirSync(candidatePath).length > 0) {
          localDir = candidatePath;
          break;
        }
      }
    }
  }

  const targetPath = path.join(process.cwd(), 'temp_storage', 'files', safeObjectKey);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  const sortedParts = parts.sort((a, b) => a.PartNumber - b.PartNumber);

  if (fs.existsSync(localDir)) {
    const writeStream = fs.createWriteStream(targetPath);
    for (const part of sortedParts) {
      const partPath = path.join(localDir, `part_${part.PartNumber}`);
      if (fs.existsSync(partPath)) {
        const data = fs.readFileSync(partPath);
        writeStream.write(data);
      }
    }
    writeStream.end();

    // cleanup parts
    try {
      fs.rmSync(localDir, { recursive: true, force: true });
    } catch (err) {
      console.warn('Could not clean up local multipart temp dir', err);
    }
  }

  return { location: `/api/v1/storage/files/${safeObjectKey}`, etag: `"local-completed-${Date.now()}"` };
}

// Abort Multipart Upload
export async function abortMultipartUpload(
  objectKey: string,
  uploadId: string
): Promise<void> {
  const config = getStorageConfig();
  const s3 = getS3Client();

  if (s3 && config.bucketName && !uploadId.startsWith('local-')) {
    const command = new AbortMultipartUploadCommand({
      Bucket: config.bucketName,
      Key: objectKey,
      UploadId: uploadId,
    });
    await s3.send(command);
    return;
  }

  const localDir = path.join(process.cwd(), 'temp_storage', 'multiparts', uploadId);
  try {
    fs.rmSync(localDir, { recursive: true, force: true });
  } catch (err) {
    // Ignore
  }
}

// Generate presigned read URL
export async function getPresignedDownloadUrl(
  objectKey: string,
  expiresInSeconds = 7200
): Promise<string> {
  const config = getStorageConfig();
  const s3 = getS3Client();

  // If public R2 CDN / dev URL is explicitly configured, return direct high-performance URL
  const publicBase = config.publicUrl || process.env.R2_PUBLIC_URL;
  if (publicBase && !objectKey.startsWith('local-')) {
    return `${publicBase.replace(/\/+$/, '')}/${objectKey.replace(/^\/+/, '')}`;
  }

  // Generate secure presigned URL from R2 bucket configuration dynamically
  if (s3 && config.bucketName && !objectKey.startsWith('local-')) {
    try {
      const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: objectKey,
      });
      return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
    } catch (err: any) {
      console.warn(`Could not generate presigned download URL for key ${objectKey}:`, err?.message || err);
    }
  }

  // Fallback to R2 default domain only if s3 client is not available
  const fallbackBase = 'https://pub-ee38c54312d840848b29a64fc376234e.r2.dev';
  if (config.provider === 'r2' && !objectKey.startsWith('local-')) {
    return `${fallbackBase}/${objectKey.replace(/^\/+/, '')}`;
  }

  return `/api/v1/storage/file?key=${encodeURIComponent(objectKey)}`;
}

// Purge all objects from a Cloudflare R2 bucket
export async function purgeEntireBucket(targetBucket?: string): Promise<{ deletedCount: number; error?: string }> {
  const config = getStorageConfig();
  const bucketName = targetBucket || config.bucketName || 'ayan';
  const s3 = getS3Client();

  let deletedCount = 0;

  if (s3) {
    try {
      let isTruncated: boolean | undefined = true;
      let continuationToken: string | undefined = undefined;

      while (isTruncated) {
        const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
          Bucket: bucketName,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        });

        const listResponse: any = await s3.send(listCommand);
        const objectsToDelete = (listResponse.Contents || []).map((obj: any) => ({ Key: obj.Key }));

        if (objectsToDelete.length > 0) {
          const deleteCommand: DeleteObjectsCommand = new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: {
              Objects: objectsToDelete.filter((o: any) => typeof o.Key === 'string'),
              Quiet: true,
            },
          });
          await s3.send(deleteCommand);
          deletedCount += objectsToDelete.length;
        }

        isTruncated = Boolean(listResponse.IsTruncated);
        continuationToken = listResponse.NextContinuationToken;
      }
    } catch (err: any) {
      console.warn(`Could not purge remote R2 bucket ${bucketName}:`, err?.message || err);
      return { deletedCount, error: err?.message };
    }
  }

  // Also purge local temp directories if any exist
  try {
    const localDir = path.join(process.cwd(), 'temp_storage');
    if (fs.existsSync(localDir)) {
      fs.rmSync(localDir, { recursive: true, force: true });
    }
  } catch {
    // Ignore
  }

  return { deletedCount };
}

export interface BucketObjectSummary {
  key: string;
  size: number;
  lastModified?: Date;
  eTag?: string;
}

// List all objects in Cloudflare R2 bucket
export async function listAllBucketObjects(targetBucket?: string, prefix?: string): Promise<BucketObjectSummary[]> {
  const config = getStorageConfig();
  const bucketName = targetBucket || config.bucketName || 'ayan';
  const s3 = getS3Client();

  const results: BucketObjectSummary[] = [];

  if (s3) {
    try {
      let isTruncated: boolean | undefined = true;
      let continuationToken: string | undefined = undefined;

      while (isTruncated) {
        const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        });

        const listResponse: any = await s3.send(listCommand);
        for (const item of listResponse.Contents || []) {
          if (item.Key) {
            results.push({
              key: item.Key,
              size: item.Size || 0,
              lastModified: item.LastModified,
              eTag: item.ETag,
            });
          }
        }

        isTruncated = Boolean(listResponse.IsTruncated);
        continuationToken = listResponse.NextContinuationToken;
      }
    } catch (err: any) {
      console.warn(`Could not list objects from R2 bucket ${bucketName}:`, err?.message || err);
    }
  }

  return results;
}

