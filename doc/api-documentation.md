# Ermiana API 文檔

## 概述

Ermiana API 提供了統一的介面來獲取各大社交媒體平台和網站的內容資訊。所有 API 都返回結構化的 JSON 資料。

## 基礎 URL

```
http://localhost:3000/api/v1
```

## 回應格式

### 成功回應

```json
{
  "success": true,
  "data": {
    // 平台特定的資料
  }
}
```

### 錯誤回應

```json
{
  "success": false,
  "error": {
    "message": "錯誤訊息",
    "code": "錯誤代碼"
  }
}
```

## API 端點

### 1. Twitter/X

獲取 Twitter/X 貼文資訊

**端點:** `GET /api/v1/twitter/:statusId`

**參數:**
- `statusId` (必填): Twitter 狀態 ID

**範例請求:**
```bash
curl http://localhost:3000/api/v1/twitter/1234567890
```

**範例回應:**
```json
{
  "success": true,
  "data": {
    "id": "1234567890",
    "author": {
      "screenName": "username",
      "name": "Display Name",
      "avatarUrl": "https://..."
    },
    "text": "Tweet content...",
    "url": "https://twitter.com/username/status/1234567890",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "stats": {
      "replies": 10,
      "retweets": 5,
      "likes": 20
    },
    "media": {
      "photos": [...],
      "videos": [...],
      "mosaic": null
    },
    "quote": null
  }
}
```

---

### 2. Pixiv

獲取 Pixiv 作品資訊

**端點:** `GET /api/v1/pixiv/:illustId`

**參數:**
- `illustId` (必填): Pixiv 作品 ID

**範例請求:**
```bash
curl http://localhost:3000/api/v1/pixiv/123456789
```

**範例回應:**
```json
{
  "success": true,
  "data": {
    "id": "123456789",
    "title": "作品標題",
    "description": "作品描述",
    "url": "https://www.pixiv.net/artworks/123456789",
    "author": {
      "id": "12345",
      "name": "作者名稱",
      "profileUrl": "https://www.pixiv.net/users/12345"
    },
    "images": ["https://pixiv.canaria.cc/..."],
    "pageCount": 1,
    "stats": {
      "bookmarks": 100,
      "views": 1000,
      "likes": 50
    },
    "tags": [
      {
        "name": "タグ",
        "translatedName": "tag"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "isR18": false
  }
}
```

---

### 3. Plurk

獲取 Plurk 噗文資訊

**端點:** `GET /api/v1/plurk/:plurkId`

**參數:**
- `plurkId` (必填): Plurk 噗文 ID (3-10 字元的英數字)

**範例請求:**
```bash
curl http://localhost:3000/api/v1/plurk/abcd1234
```

**範例回應:**
```json
{
  "success": true,
  "data": {
    "id": "abcd1234",
    "url": "https://www.plurk.com/p/abcd1234",
    "author": {
      "id": "12345",
      "nickname": "username",
      "displayName": "Display Name",
      "avatar": "https://avatars.plurk.com/..."
    },
    "content": "噗文內容...",
    "images": ["https://images.plurk.com/..."],
    "stats": {
      "responses": 10,
      "replurks": 5,
      "favorites": 20
    }
  }
}
```

---

### 4. Bluesky

獲取 Bluesky 貼文資訊

**端點:** `GET /api/v1/bluesky/:handle/:postId`

**參數:**
- `handle` (必填): 用戶 handle
- `postId` (必填): 貼文 ID

**範例請求:**
```bash
curl http://localhost:3000/api/v1/bluesky/user.bsky.social/abc123xyz456
```

**範例回應:**
```json
{
  "success": true,
  "data": {
    "id": "abc123xyz456",
    "handle": "user.bsky.social",
    "url": "https://bsky.app/profile/user.bsky.social/post/abc123xyz456",
    "author": {
      "handle": "user.bsky.social",
      "displayName": "Display Name",
      "avatar": "https://..."
    },
    "text": "Post content...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "stats": {
      "replies": 10,
      "reposts": 5,
      "likes": 20
    },
    "media": {
      "type": "app.bsky.embed.images#view",
      "images": [...],
      "videos": [],
      "thumbnail": null
    }
  }
}
```

---

### 5. 巴哈姆特

獲取巴哈姆特論壇文章資訊

**端點:** `GET /api/v1/baha/:postId`

**參數:**
- `postId` (必填): 文章 ID (例如: `C.php?bsn=60076&snA=1234567`)

**範例請求:**
```bash
curl http://localhost:3000/api/v1/baha/C.php?bsn=60076&snA=1234567
```

**範例回應:**
```json
{
  "success": true,
  "data": {
    "id": "C.php?bsn=60076&snA=1234567",
    "url": "https://forum.gamer.com.tw/C.php?bsn=60076&snA=1234567",
    "title": "文章標題",
    "description": "文章描述",
    "image": "https://..."
  }
}
```

---

### 6. E-Hentai

獲取 E-Hentai 畫廊資訊

**端點:** `GET /api/v1/eh/:galleryId/:token`

**參數:**
- `galleryId` (必填): 畫廊 ID
- `token` (必填): 畫廊 token

**範例請求:**
```bash
curl http://localhost:3000/api/v1/eh/1234567/abcdef0123
```

**範例回應:**
```json
{
  "success": true,
  "data": {
    "id": "1234567",
    "token": "abcdef0123",
    "url": "https://e-hentai.org/g/1234567/abcdef0123",
    "exhentaiUrl": "https://exhentai.org/g/1234567/abcdef0123",
    "title": {
      "english": "English Title",
      "japanese": "日本語タイトル",
      "display": "Display Title"
    },
    "thumbnail": "https://...",
    "category": "Manga",
    "rating": 4.5,
    "tags": [
      {
        "type": "artist",
        "name": "artist_name"
      }
    ]
  }
}
```

---

### 7. PChome

獲取 PChome 商品資訊

**端點:** `GET /api/v1/pchome/:productId`

**參數:**
- `productId` (必填): 商品 ID (格式: `XXXXXX-XXXXXXXXX`)

**範例請求:**
```bash
curl http://localhost:3000/api/v1/pchome/ABCDEF-123456789
```

**範例回應:**
```json
{
  "success": true,
  "data": {
    "id": "ABCDEF-123456789",
    "url": "https://24h.pchome.com.tw/prod/ABCDEF-123456789",
    "title": "商品名稱",
    "description": "商品描述",
    "image": "https://...",
    "price": "$1,234"
  }
}
```

---

### 8. Misskey

獲取 Misskey 筆記資訊

**端點:** `GET /api/v1/misskey/:noteId`

**參數:**
- `noteId` (必填): 筆記 ID (10-16 字元的英數字)

**範例請求:**
```bash
curl http://localhost:3000/api/v1/misskey/abc123xyz456
```

**範例回應:**
```json
{
  "success": true,
  "data": {
    "id": "abc123xyz456",
    "url": "https://misskey.io/notes/abc123xyz456",
    "author": {
      "id": "user123",
      "username": "username",
      "name": "Display Name",
      "avatarUrl": "https://..."
    },
    "text": "Note content...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "stats": {
      "replies": 10,
      "renotes": 5,
      "reactions": 20
    },
    "media": {
      "images": [...],
      "videos": [...]
    },
    "isSensitive": false
  }
}
```

---

### 9. TikTok

獲取 TikTok 影片資訊

**端點:** `POST /api/v1/tiktok`

**請求 Body:**
```json
{
  "url": "https://www.tiktok.com/@username/video/1234567890"
}
```

**範例請求:**
```bash
curl -X POST http://localhost:3000/api/v1/tiktok \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.tiktok.com/@username/video/1234567890"}'
```

**範例回應:**
```json
{
  "success": true,
  "data": {
    "url": "https://www.tiktok.com/@username/video/1234567890",
    "title": "影片標題",
    "description": "影片描述",
    "thumbnail": "https://...",
    "videoUrl": "https://..."
  }
}
```

---

### 10. Bilibili

獲取 Bilibili 專欄資訊

**端點:** `GET /api/v1/bilibili/:opusId`

**參數:**
- `opusId` (必填): 專欄 ID

**範例請求:**
```bash
curl http://localhost:3000/api/v1/bilibili/123456789
```

**範例回應:**
```json
{
  "success": true,
  "data": {
    "id": "123456789",
    "url": "https://www.bilibili.com/opus/123456789",
    "title": "專欄標題",
    "description": "專欄描述",
    "image": "https://..."
  }
}
```

---

### 11. Instagram

獲取 Instagram 貼文資訊（通過代理）

**端點:** `GET /api/v1/instagram/:postId`

**參數:**
- `postId` (必填): Instagram 貼文 ID

**範例請求:**
```bash
curl http://localhost:3000/api/v1/instagram/ABC123xyz
```

**範例回應:**
```json
{
  "success": true,
  "data": {
    "proxyUrl": "https://www.ddinstagram.com/p/ABC123xyz/",
    "source": "ddinstagram"
  }
}
```

---

### 12. Threads

獲取 Threads 貼文資訊（通過代理）

**端點:** `POST /api/v1/threads`

**請求體:**
```json
{
  "url": "https://www.threads.net/@username/post/ABC123"
}
```

**範例請求:**
```bash
curl -X POST http://localhost:3000/api/v1/threads \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.threads.net/@username/post/ABC123"}'
```

**範例回應:**
```json
{
  "success": true,
  "data": {
    "originalUrl": "https://www.threads.net/@username/post/ABC123",
    "proxyUrl": "https://www.fixthreads.net/@username/post/ABC123"
  }
}
```

---

### 13. PTT

獲取 PTT 文章資訊

**端點:** `GET /api/v1/ptt/:board/:postId`

**參數:**
- `board` (必填): 看板名稱（如 Gossiping, C_Chat 等）
- `postId` (必填): 文章 ID（如 M.1234567890.A.123）

**支援看板:**
- Gossiping（八卦板）
- C_Chat（希洽板）
- AC_In（裏洽板）
- H-GAME（H-Game 板）
- sex（西斯板）
- HatePolitics（政黑板）
- Beauty（表特板）
- japanavgirls（日本 AV 女優板）
- DMM_GAMES（DMM Games 板）

**範例請求:**
```bash
curl http://localhost:3000/api/v1/ptt/Gossiping/M.1234567890.A.123
```

**範例回應:**
```json
{
  "success": true,
  "data": {
    "title": "[新聞] 文章標題",
    "description": "文章內容摘要...",
    "image": "https://i.imgur.com/...",
    "board": "Gossiping",
    "postId": "M.1234567890.A.123",
    "url": "https://www.ptt.cc/bbs/Gossiping/M.1234567890.A.123.html"
  }
}
```

---

### 14. Weibo

獲取微博貼文資訊

**端點:** `GET /api/v1/weibo/:statusId`

**參數:**
- `statusId` (必填): 微博狀態 ID

**範例請求:**
```bash
curl http://localhost:3000/api/v1/weibo/1234567890123456
```

**範例回應:**
```json
{
  "success": true,
  "data": {
    "author": {
      "name": "使用者名稱",
      "id": "123456"
    },
    "text": "微博內容文字",
    "images": [
      "https://weibo-pic.canaria.cc/...",
      "https://weibo-pic.canaria.cc/..."
    ],
    "stats": {
      "comments": 100,
      "reposts": 50,
      "likes": 200
    },
    "url": "https://m.weibo.cn/detail/1234567890123456",
    "createdAt": "2024-01-01 12:00:00"
  }
}
```

---

## 速率限制

- **限制:** 每分鐘 60 次請求
- **回應標頭:** 429 Too Many Requests
- **錯誤回應:**
```json
{
  "success": false,
  "error": {
    "message": "Too many requests",
    "code": "RATE_LIMIT_EXCEEDED",
    "retryAfter": 30
  }
}
```

## 錯誤代碼

| 代碼 | 說明 |
|------|------|
| `INVALID_PARAMETER` | 無效的參數 |
| `TWITTER_API_ERROR` | Twitter API 錯誤 |
| `PIXIV_API_ERROR` | Pixiv API 錯誤 |
| `PLURK_API_ERROR` | Plurk API 錯誤 |
| `BLUESKY_API_ERROR` | Bluesky API 錯誤 |
| `BAHA_API_ERROR` | 巴哈姆特 API 錯誤 |
| `EH_API_ERROR` | E-Hentai API 錯誤 |
| `PCHOME_API_ERROR` | PChome API 錯誤 |
| `MISSKEY_API_ERROR` | Misskey API 錯誤 |
| `TIKTOK_API_ERROR` | TikTok API 錯誤 |
| `BILIBILI_API_ERROR` | Bilibili API 錯誤 |
| `INSTAGRAM_API_ERROR` | Instagram API 錯誤 |
| `THREADS_API_ERROR` | Threads API 錯誤 |
| `PTT_API_ERROR` | PTT API 錯誤 |
| `WEIBO_API_ERROR` | Weibo API 錯誤 |
| `RATE_LIMIT_EXCEEDED` | 超過速率限制 |
| `INTERNAL_ERROR` | 內部伺服器錯誤 |

## 健康檢查

**端點:** `GET /health`

**範例請求:**
```bash
curl http://localhost:3000/health
```

**範例回應:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 環境配置

在 `.env` 檔案中設定以下變數：

```env
API_PORT=3000
```

## 啟動 API 伺服器

```bash
# 僅啟動 API 伺服器
npm run start:api

# 同時啟動 Discord Bot 和 API 伺服器
npm run start:all
```

## 注意事項

1. 所有時間戳記使用 ISO 8601 格式
2. URL 必須正確編碼
3. 某些端點可能需要額外的認證或 Cookie（如巴哈姆特）
4. 圖片 URL 可能使用代理伺服器（如 Pixiv）
5. 某些平台可能有額外的速率限制或存取限制
