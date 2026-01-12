import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { configManager } from '../src/utils/configManager.js';
import twitterRouter from './routes/twitter.js';
import pixivRouter from './routes/pixiv.js';
import plurkRouter from './routes/plurk.js';
import blueskyRouter from './routes/bluesky.js';
import bahaRouter from './routes/baha.js';
import ehRouter from './routes/eh.js';
import pchomeRouter from './routes/pchome.js';
import misskeyRouter from './routes/misskey.js';
import tiktokRouter from './routes/tiktok.js';
import bilibiliRouter from './routes/bilibili.js';
import instagramRouter from './routes/instagramRoutes.js';
import threadsRouter from './routes/threadsRoutes.js';
import pttRouter from './routes/pttRoutes.js';
import weiboRouter from './routes/weiboRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { rateLimiter } from './middlewares/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const config = await configManager();
const PORT = config.API_PORT || 3000;

// Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(cors());
app.use(express.json());
app.use(rateLimiter);

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Documentation page
app.get('/api-test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes
app.use('/api/v1/twitter', twitterRouter);
app.use('/api/v1/pixiv', pixivRouter);
app.use('/api/v1/plurk', plurkRouter);
app.use('/api/v1/bluesky', blueskyRouter);
app.use('/api/v1/baha', bahaRouter);
app.use('/api/v1/eh', ehRouter);
app.use('/api/v1/pchome', pchomeRouter);
app.use('/api/v1/misskey', misskeyRouter);
app.use('/api/v1/tiktok', tiktokRouter);
app.use('/api/v1/bilibili', bilibiliRouter);
app.use('/api/v1/instagram', instagramRouter);
app.use('/api/v1/threads', threadsRouter);
app.use('/api/v1/ptt', pttRouter);
app.use('/api/v1/weibo', weiboRouter);

// API Documentation
app.get('/api/v1', (req, res) => {
  res.json({
    version: '1.0.0',
    endpoints: {
      twitter: '/api/v1/twitter/:statusId',
      pixiv: '/api/v1/pixiv/:illustId',
      plurk: '/api/v1/plurk/:plurkId',
      bluesky: '/api/v1/bluesky/:handle/:postId',
      baha: '/api/v1/baha/:postId',
      eh: '/api/v1/eh/:galleryId/:token',
      pchome: '/api/v1/pchome/:productId',
      misskey: '/api/v1/misskey/:noteId',
      tiktok: '/api/v1/tiktok',
      bilibili: '/api/v1/bilibili/:opusId',
      instagram: '/api/v1/instagram/:postId',
      threads: '/api/v1/threads (POST with url)',
      ptt: '/api/v1/ptt/:board/:postId',
      weibo: '/api/v1/weibo/:statusId',
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});

export default app;
