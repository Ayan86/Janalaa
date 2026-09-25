import { api, getApiAuthToken } from './api.ts';
import { UploadProgress } from '../types/index.ts';

export interface MultipartUploadOptions {
  file: File;
  contentId?: number;
  episodeId?: number;
  contentType?: string;
  partSize?: number; // default 5MB or 10MB
  isReplacement?: boolean;
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

export class MultipartVideoUploader {
  private file: File;
  private contentId?: number;
  private episodeId?: number;
  private contentType: string;
  private partSize: number;
  private isReplacement: boolean;
  private onProgress?: (progress: UploadProgress) => void;
  private onComplete?: (result: any) => void;
  private onError?: (error: Error) => void;

  private sessionId = '';
  private mediaAssetId = 0;
  private uploadId = '';
  private totalParts = 0;
  private completedParts: Array<{ partNumber: number; etag: string; size: number }> = [];

  private isPaused = false;
  private isCancelled = false;
  private forceProxy = false;
  private uploadedBytes = 0;
  private startTime = 0;
  private lastProgressTime = 0;
  private lastUploadedBytes = 0;
  private currentSpeed = 0;

  constructor(options: MultipartUploadOptions) {
    this.file = options.file;
    this.contentId = options.contentId;
    this.episodeId = options.episodeId;
    this.contentType = options.contentType || 'movies';
    this.partSize = options.partSize || 5 * 1024 * 1024; // 5MB standard part size for fast streaming
    this.isReplacement = options.isReplacement || false;
    this.onProgress = options.onProgress;
    this.onComplete = options.onComplete;
    this.onError = options.onError;
  }

  public async start(): Promise<void> {
    try {
      this.startTime = Date.now();
      this.lastProgressTime = Date.now();
      this.uploadedBytes = 0;
      this.isPaused = false;
      this.isCancelled = false;
      this.forceProxy = false;

      // 1. Initialize Upload Session on Backend
      const sessionRes = await api.createUploadSession({
        contentId: this.contentId,
        episodeId: this.episodeId,
        contentType: this.contentType,
        fileName: this.file.name,
        fileSize: this.file.size,
        mimeType: this.file.type || 'video/mp4',
        partSize: this.partSize,
        isReplacement: this.isReplacement,
      });

      this.sessionId = sessionRes.sessionId;
      this.mediaAssetId = sessionRes.mediaAssetId;
      this.uploadId = sessionRes.uploadId;
      this.totalParts = sessionRes.totalParts || Math.ceil(this.file.size / this.partSize);
      this.completedParts = [];

      // 2. Upload parts sequentially with resilient retry & proxy fallbacks
      for (let partNumber = 1; partNumber <= this.totalParts; partNumber++) {
        if (this.isCancelled) {
          await this.abort();
          return;
        }

        while (this.isPaused) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          if (this.isCancelled) {
            await this.abort();
            return;
          }
        }

        // Determine upload URL (use proxy immediately if previously forced or if direct url unavailable)
        let partUrl: string | undefined;
        if (!this.forceProxy) {
          try {
            const partsRes = await api.getPartPresignedUrls(this.mediaAssetId, this.sessionId, [partNumber]);
            partUrl = partsRes?.parts?.[0]?.uploadUrl;
          } catch (presignErr) {
            console.warn(`Part #${partNumber} presigned URL fetch notice, switching to proxy:`, presignErr);
            this.forceProxy = true;
          }
        }

        if (this.forceProxy || !partUrl) {
          partUrl = `/api/v1/admin/media/${this.mediaAssetId}/multipart/part-proxy?sessionId=${encodeURIComponent(
            this.sessionId
          )}&partNumber=${partNumber}`;
        }

        // Slice chunk
        const start = (partNumber - 1) * this.partSize;
        const end = Math.min(start + this.partSize, this.file.size);
        const chunk = this.file.slice(start, end);

        // Upload single chunk with retry & proxy fallback
        const etag = await this.uploadChunkWithRetry(partNumber, chunk, partUrl);

        this.completedParts.push({
          partNumber,
          etag,
          size: chunk.size,
        });

        this.uploadedBytes += chunk.size;
        this.updateSpeedMetrics(this.uploadedBytes);
        this.emitProgress('UPLOADING', partNumber, this.totalParts);
      }

      // 3. Complete multipart upload
      this.emitProgress('COMPLETING', this.totalParts, this.totalParts);

      const completeRes = await api.completeMultipartUpload(
        this.mediaAssetId,
        this.sessionId,
        this.completedParts.map((p) => ({ partNumber: p.partNumber, etag: p.etag, size: p.size }))
      );

      this.emitProgress('COMPLETED', this.totalParts, this.totalParts);
      if (this.onComplete) {
        this.onComplete(completeRes);
      }
    } catch (err: any) {
      console.error('Multipart upload error:', err);
      this.emitProgress('FAILED', 0, this.totalParts, err.message);
      if (this.onError) {
        this.onError(err);
      }
    }
  }

  private async uploadChunkWithRetry(partNumber: number, chunk: Blob, uploadUrl: string, maxRetries = 3): Promise<string> {
    let attempts = 0;
    const token = getApiAuthToken() || localStorage.getItem('janala_access_token');
    let currentUrl = uploadUrl;

    while (attempts < maxRetries) {
      attempts++;
      const isLocalOrProxy = currentUrl.startsWith('/') || currentUrl.includes('/api/v1/');

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/octet-stream',
        };
        if (isLocalOrProxy && token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(currentUrl, {
          method: 'PUT',
          headers,
          body: chunk,
        });

        if (!response.ok) {
          // If direct URL failed (e.g. 401 or 403 from S3 bucket credentials), switch to server proxy immediately
          if (!isLocalOrProxy && (response.status === 401 || response.status === 403 || response.status === 404)) {
            console.warn(`Direct S3 upload returned ${response.status}. Switching to server proxy...`);
            this.forceProxy = true;
            currentUrl = `/api/v1/admin/media/${this.mediaAssetId}/multipart/part-proxy?sessionId=${encodeURIComponent(
              this.sessionId
            )}&partNumber=${partNumber}`;
            continue;
          }
          throw new Error(`Part ${partNumber} upload returned status ${response.status}`);
        }

        let etag = response.headers.get('ETag') || response.headers.get('etag');
        if (!etag) {
          try {
            const bodyJson = await response.json();
            if (bodyJson && (bodyJson.ETag || bodyJson.etag)) {
              etag = bodyJson.ETag || bodyJson.etag;
            }
          } catch {
            // response was not JSON
          }
        }

        if (!etag) {
          etag = `"part-${this.sessionId}-${partNumber}"`;
        }

        return etag;
      } catch (err: any) {
        console.warn(`Part ${partNumber} attempt ${attempts} notice (${err?.message}). Trying proxy fallback...`);

        // If not already using proxy, switch to server proxy
        if (!isLocalOrProxy) {
          this.forceProxy = true;
          currentUrl = `/api/v1/admin/media/${this.mediaAssetId}/multipart/part-proxy?sessionId=${encodeURIComponent(
            this.sessionId
          )}&partNumber=${partNumber}`;
        }

        // Resilient fallback: attempt upload via server proxy route directly
        try {
          const proxyUrl = `/api/v1/admin/media/${this.mediaAssetId}/multipart/part-proxy?sessionId=${encodeURIComponent(
            this.sessionId
          )}&partNumber=${partNumber}`;

          const proxyRes = await fetch(proxyUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/octet-stream',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: chunk,
          });

          if (proxyRes.ok) {
            let proxyEtag = proxyRes.headers.get('ETag') || proxyRes.headers.get('etag');
            if (!proxyEtag) {
              try {
                const proxyJson = await proxyRes.json();
                proxyEtag = proxyJson?.ETag || proxyJson?.etag;
              } catch {}
            }
            return proxyEtag || `"proxy-etag-${this.sessionId}-${partNumber}"`;
          }
        } catch (proxyErr) {
          console.warn(`Proxy upload attempt for part ${partNumber} failed:`, proxyErr);
        }

        if (attempts >= maxRetries) {
          throw new Error(`Failed to upload Part #${partNumber} after ${maxRetries} attempts: ${err.message}`);
        }

        // Exponential backoff wait before retry
        await new Promise((resolve) => setTimeout(resolve, attempts * 500));
      }
    }

    throw new Error(`Failed to upload Part #${partNumber}`);
  }

  public pause(): void {
    this.isPaused = true;
    this.emitProgress('PAUSED', this.completedParts.length, this.totalParts);
  }

  public resume(): void {
    this.isPaused = false;
  }

  public async abort(): Promise<void> {
    this.isCancelled = true;
    this.isPaused = false;
    try {
      if (this.sessionId && this.mediaAssetId) {
        await api.abortMultipartUpload(this.mediaAssetId, this.sessionId);
      }
    } catch (err) {
      console.warn('Abort upload call error:', err);
    }
    this.emitProgress('CANCELLED', this.completedParts.length, this.totalParts);
  }

  private updateSpeedMetrics(currentBytes: number) {
    const now = Date.now();
    const timeDeltaSec = (now - this.lastProgressTime) / 1000;

    if (timeDeltaSec >= 0.5) {
      const bytesDelta = currentBytes - this.lastUploadedBytes;
      this.currentSpeed = bytesDelta / timeDeltaSec;
      this.lastProgressTime = now;
      this.lastUploadedBytes = currentBytes;
    }
  }

  private emitProgress(status: UploadProgress['status'], currentPart: number, totalParts: number, error?: string) {
    if (!this.onProgress) return;

    const percentage = this.file.size > 0 ? Math.min(100, (this.uploadedBytes / this.file.size) * 100) : 0;
    const remainingBytes = Math.max(0, this.file.size - this.uploadedBytes);
    const etaSeconds = this.currentSpeed > 0 ? Math.ceil(remainingBytes / this.currentSpeed) : 0;

    this.onProgress({
      sessionId: this.sessionId,
      mediaAssetId: this.mediaAssetId,
      fileName: this.file.name,
      fileSize: this.file.size,
      uploadedBytes: this.uploadedBytes,
      percentage,
      speedBytesPerSec: this.currentSpeed,
      etaSeconds,
      currentPart,
      totalParts,
      status,
      error,
    });
  }
}
