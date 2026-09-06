export class EhentaiApiService {
  constructor({ http, batchDelayMs = 75, logger }) {
    this.http = http;
    this.batchDelayMs = batchDelayMs;
    this.logger = logger;
    this.pending = [];
    this.timer = null;
    this.flushing = false;
  }

  getGallery(galleryId, galleryToken) {
    return new Promise((resolve, reject) => {
      this.pending.push({ galleryId, galleryToken, resolve, reject });
      this.schedule();
    });
  }

  schedule() {
    if (this.timer || this.flushing || this.pending.length === 0) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.batchDelayMs);
  }

  async flush() {
    if (this.flushing || this.pending.length === 0) return;
    this.flushing = true;
    const batch = this.pending.splice(0, 25);
    try {
      const data = await this.http.postJson('https://api.e-hentai.org/api.php', {
        method: 'gdata',
        gidlist: batch.map(({ galleryId, galleryToken }) => [galleryId, galleryToken]),
        namespace: 1,
      }, { retries: 0 });
      const metadata = Array.isArray(data?.gmetadata) ? data.gmetadata : [];
      for (const [index, request] of batch.entries()) {
        const exact = metadata.find((item) => Number(item?.gid) === request.galleryId);
        const positional = metadata[index];
        const gallery = exact ?? (positional?.gid === undefined ? positional : undefined);
        if (!gallery || gallery.error) {
          request.reject(new Error(gallery?.error || 'E-Hentai response has no gallery'));
        } else {
          request.resolve(gallery);
        }
      }
    } catch (error) {
      this.logger?.warn({ err: error, batchSize: batch.length }, 'E-Hentai API batch failed');
      for (const request of batch) request.reject(error);
    } finally {
      this.flushing = false;
      this.schedule();
    }
  }
}
