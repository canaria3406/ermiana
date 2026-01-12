# Ermiana - API 化專案

已成功將 regex 資料夾內的處理方式全部 API 化！

## 🎯 完成項目

### ✅ 1. API 服務基礎架構
- 建立 Express.js 伺服器 (`api/server.js`)
- 實作錯誤處理中介層 (`api/middlewares/errorHandler.js`)
- 實作速率限制中介層 (`api/middlewares/rateLimiter.js`)
- 設定 CORS 和 Helmet 安全標頭

### ✅ 2. 服務層 (Service Layer)
將所有平台的處理邏輯抽取為獨立服務，移除 Discord 依賴：

- `twitterService.js` - Twitter/X 貼文處理
- `pixivService.js` - Pixiv 插畫處理
- `plurkService.js` - Plurk 噗文處理
- `blueskyService.js` - Bluesky 貼文處理
- `bahaService.js` - 巴哈姆特論壇處理
- `ehService.js` - E-Hentai 畫廊處理
- `pchomeService.js` - PChome 商品處理
- `misskeyService.js` - Misskey 筆記處理
- `tiktokService.js` - TikTok 影片處理
- `bilibiliService.js` - Bilibili 專欄處理

### ✅ 3. API 路由 (Routes)
為每個平台建立對應的 RESTful API 端點：

- `GET /api/v1/twitter/:statusId`
- `GET /api/v1/pixiv/:illustId`
- `GET /api/v1/plurk/:plurkId`
- `GET /api/v1/bluesky/:handle/:postId`
- `GET /api/v1/baha/:postId`
- `GET /api/v1/eh/:galleryId/:token`
- `GET /api/v1/pchome/:productId`
- `GET /api/v1/misskey/:noteId`
- `POST /api/v1/tiktok` (需要傳送 URL body)
- `GET /api/v1/bilibili/:opusId`

### ✅ 4. 文檔
- [API 架構說明](./doc/api-architecture.md) - 完整的架構設計文檔
- [API 使用文檔](./doc/api-documentation.md) - 詳細的 API 端點說明
- [API 測試範例](./doc/api-testing-examples.md) - curl 和 Postman 測試範例

### ✅ 5. 專案配置
- 更新 `package.json` 加入新的依賴和啟動腳本
- 新增 `express`, `cors`, `helmet` 依賴
- 新增 `concurrently` 用於同時運行多個服務
- 新增啟動指令：`start:api` 和 `start:all`

## 📁 新增的檔案結構

```
api/
├── server.js                    # API 主伺服器
├── middlewares/
│   ├── errorHandler.js         # 統一錯誤處理
│   └── rateLimiter.js          # 速率限制 (60 req/min)
├── routes/                      # 10 個 API 路由
│   ├── twitter.js
│   ├── pixiv.js
│   ├── plurk.js
│   ├── bluesky.js
│   ├── baha.js
│   ├── eh.js
│   ├── pchome.js
│   ├── misskey.js
│   ├── tiktok.js
│   └── bilibili.js
└── services/                    # 10 個業務邏輯服務
    ├── twitterService.js
    ├── pixivService.js
    ├── plurkService.js
    ├── blueskyService.js
    ├── bahaService.js
    ├── ehService.js
    ├── pchomeService.js
    ├── misskeyService.js
    ├── tiktokService.js
    └── bilibiliService.js

doc/
├── api-architecture.md          # 架構說明文檔
├── api-documentation.md         # API 使用文檔
└── api-testing-examples.md      # 測試範例
```

## 🚀 使用方式

### 安裝依賴
```bash
npm install
```

### 啟動服務

#### 僅啟動 Discord Bot（原有功能）
```bash
npm start
```

#### 僅啟動 API 伺服器
```bash
npm run start:api
```

#### 同時啟動 Discord Bot 和 API 伺服器
```bash
npm run start:all
```

### 測試 API

```bash
# 健康檢查
curl http://localhost:3000/health

# 測試 Twitter API
curl http://localhost:3000/api/v1/twitter/1234567890

# 測試 Pixiv API
curl http://localhost:3000/api/v1/pixiv/123456789

# 查看所有可用端點
curl http://localhost:3000/api/v1
```

## 🎨 統一的 API 回應格式

### 成功回應
```json
{
  "success": true,
  "data": {
    "id": "...",
    "url": "...",
    // 平台特定資料
  }
}
```

### 錯誤回應
```json
{
  "success": false,
  "error": {
    "message": "錯誤訊息",
    "code": "ERROR_CODE"
  }
}
```

## 🔒 安全功能

- ✅ **速率限制**: 每個 IP 每分鐘最多 60 次請求
- ✅ **Helmet**: 安全的 HTTP 標頭
- ✅ **CORS**: 跨域資源共享支援
- ✅ **錯誤處理**: 統一的錯誤格式，不洩漏敏感資訊
- ✅ **參數驗證**: 所有路由都有參數驗證

## 📊 架構優勢

### 1. 解耦合
- 業務邏輯與 Discord 獨立
- Service Layer 可被多個客戶端使用

### 2. 可重用性
- Discord Bot 可以呼叫這些 Service
- 外部應用程式可以透過 API 使用
- Web 前端可以直接整合

### 3. 可維護性
- 邏輯集中在 Service Layer
- 修改某個平台只需更新對應的 Service
- 易於測試和除錯

### 4. 可擴展性
- 輕鬆添加新平台支援
- 支援橫向擴展（多個 API 實例）
- 未來可加入快取、認證等功能

## 🛠️ 技術棧

- **Node.js** - 運行環境
- **Express.js** - Web 框架
- **Axios** - HTTP 客戶端
- **Cheerio** - HTML 解析
- **Helmet** - 安全標頭
- **CORS** - 跨域支援

## 📝 下一步建議

### 選項 A: Discord Bot 直接使用 Service
修改 `src/regex/handle*Regex.js` 檔案，直接導入和使用 Service：

```javascript
import { TwitterService } from '../../api/services/twitterService.js';

export async function handleTwitterRegex(result, message, spoiler) {
  const data = await TwitterService.getPostData(result[1]);
  // 將 data 轉換為 Discord Embed
}
```

### 選項 B: Discord Bot 呼叫內部 API
修改 Discord Bot 讓它呼叫 localhost API：

```javascript
const response = await axios.get(`http://localhost:3000/api/v1/twitter/${statusId}`);
// 使用 response.data 建立 Discord Embed
```

### 選項 C: 保持現狀
- Discord Bot 繼續使用原有的 handler
- API 獨立運作，供外部使用
- 兩者共存但不互相依賴

## 🌟 未來擴展

- [ ] API 金鑰認證
- [ ] Redis 快取
- [ ] WebSocket 支援
- [ ] GraphQL 端點
- [ ] 管理後台
- [ ] Docker 部署
- [ ] 完整的單元測試
- [ ] API 使用統計

## 📚 文檔

詳細文檔請參考：
- [API 架構說明](./doc/api-architecture.md)
- [API 使用文檔](./doc/api-documentation.md)
- [API 測試範例](./doc/api-testing-examples.md)

## 🤝 貢獻

現在 API 已經完全模組化，您可以：
1. 在 `api/services/` 添加新的平台服務
2. 在 `api/routes/` 添加對應的路由
3. 在 `api/server.js` 註冊新路由
4. 更新文檔

## ⚠️ 注意事項

1. 某些平台（如巴哈姆特）需要 Cookie 認證
2. 某些平台（如 Pixiv）使用圖片代理服務 `pixiv.canaria.cc`
3. API 呼叫可能受第三方平台的速率限制
4. 建議在生產環境使用 HTTPS
5. 環境變數 `API_PORT` 可設定 API 伺服器端口（預設 3000）

---

**專案已完成 API 化！** 🎉

所有 regex 處理邏輯都已被提取為獨立的 API 服務，可供 Discord Bot 和其他應用程式使用。
