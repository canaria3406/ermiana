# Ermiana API 架構

## 專案結構

```
ermianaJS/
├── api/                          # API 服務 (新增)
│   ├── server.js                # API 主伺服器
│   ├── middlewares/             # 中介層
│   │   ├── errorHandler.js     # 錯誤處理
│   │   └── rateLimiter.js      # 速率限制
│   ├── routes/                  # API 路由
│   │   ├── twitter.js
│   │   ├── pixiv.js
│   │   ├── plurk.js
│   │   ├── bluesky.js
│   │   ├── baha.js
│   │   ├── eh.js
│   │   ├── pchome.js
│   │   ├── misskey.js
│   │   ├── tiktok.js
│   │   └── bilibili.js
│   └── services/                # 業務邏輯層
│       ├── twitterService.js
│       ├── pixivService.js
│       ├── plurkService.js
│       ├── blueskyService.js
│       ├── bahaService.js
│       ├── ehService.js
│       ├── pchomeService.js
│       ├── misskeyService.js
│       ├── tiktokService.js
│       └── bilibiliService.js
├── src/                         # Discord Bot 原始碼
│   ├── bot.js
│   ├── regex/                   # 正規表達式處理器
│   ├── command/                 # Discord 指令
│   ├── events/                  # Discord 事件處理
│   └── utils/                   # 工具函數
└── doc/                         # 文檔
    ├── api-documentation.md     # API 文檔 (新增)
    └── api-testing-examples.md  # API 測試範例 (新增)
```

## 架構說明

### 1. 分層架構

#### Service Layer (服務層)
- **位置:** `api/services/`
- **職責:** 
  - 包含各平台的核心業務邏輯
  - 處理第三方 API 呼叫
  - 資料轉換和格式化
  - 與 Discord 無關的純粹資料處理
- **優點:**
  - 可被 Discord Bot 和 API 共同使用
  - 易於測試
  - 邏輯集中管理

#### Route Layer (路由層)
- **位置:** `api/routes/`
- **職責:**
  - 定義 API 端點
  - 參數驗證
  - 呼叫對應的 Service
  - 回應格式化

#### Middleware Layer (中介層)
- **位置:** `api/middlewares/`
- **職責:**
  - 錯誤處理
  - 速率限制
  - 日誌記錄
  - 身份驗證（未來擴展）

### 2. API 化的好處

#### 解耦合
- **之前:** Discord Bot 直接處理所有平台邏輯
- **現在:** 業務邏輯獨立於 Discord，可被多個客戶端使用

#### 可重用性
- Discord Bot 可以呼叫 API
- 其他應用程式也可以使用相同的 API
- Web 前端可以直接整合

#### 可維護性
- 業務邏輯集中在 Service Layer
- 修改某個平台的處理方式只需要更新一個 Service
- API 變更不影響 Discord Bot 的核心功能

#### 可擴展性
- 輕鬆添加新的平台支援
- 可以為 API 添加快取、認證等功能
- 支援橫向擴展（多個 API 實例）

### 3. 資料流程

#### Discord Bot 流程（原本）
```
用戶訊息 → Discord Bot → Regex 匹配 → Handler → 第三方 API → 處理資料 → Discord Embed
```

#### API 化後的流程

**方案 A: Discord Bot 直接使用 Service**
```
用戶訊息 → Discord Bot → Regex 匹配 → Service → 第三方 API → 處理資料 → Discord Embed
```

**方案 B: Discord Bot 呼叫內部 API**
```
用戶訊息 → Discord Bot → Regex 匹配 → 內部 API 呼叫 → Service → 第三方 API → 處理資料 → Discord Embed
```

**外部使用**
```
HTTP 請求 → API 路由 → 參數驗證 → Service → 第三方 API → 處理資料 → JSON 回應
```

### 4. 統一的 API 回應格式

#### 成功回應
```json
{
  "success": true,
  "data": {
    // 平台特定資料
  }
}
```

#### 錯誤回應
```json
{
  "success": false,
  "error": {
    "message": "錯誤訊息",
    "code": "錯誤代碼"
  }
}
```

### 5. 支援的平台

目前已 API 化的平台：

1. **Twitter/X** - 推文資訊
2. **Pixiv** - 插畫作品
3. **Plurk** - 噗浪訊息
4. **Bluesky** - 貼文
5. **巴哈姆特** - 論壇文章
6. **E-Hentai** - 畫廊資訊
7. **PChome** - 商品資訊
8. **Misskey** - 筆記
9. **TikTok** - 影片
10. **Bilibili** - 專欄

### 6. 安全性考量

#### 速率限制
- 每個 IP 每分鐘限制 60 次請求
- 防止 API 濫用

#### 錯誤處理
- 統一的錯誤格式
- 不洩漏敏感資訊
- 適當的 HTTP 狀態碼

#### CORS 設定
- 使用 `cors` 中介層
- 可配置允許的來源

#### Helmet 安全標頭
- 自動設定安全的 HTTP 標頭
- 防止常見的網路攻擊

### 7. 部署建議

#### 開發環境
```bash
# 僅啟動 Discord Bot
npm start

# 僅啟動 API 伺服器
npm run start:api

# 同時啟動兩者
npm run start:all
```

#### 生產環境

**選項 1: 單一伺服器**
```bash
npm run start:all
```

**選項 2: 分離部署**
- Discord Bot: 部署在有持久連線的環境
- API 伺服器: 部署在支援 HTTP 請求的環境（可使用負載平衡）

**選項 3: Serverless**
- API 可以改造為 Serverless Function
- Discord Bot 保持傳統部署

### 8. 環境變數

在 `.env` 檔案中設定：

```env
# Discord Bot
DCTK=your_discord_token

# API 伺服器
API_PORT=3000

# 巴哈姆特（會自動刷新）
BAHAENUR=
BAHARUNE=
```

### 9. 未來擴展

#### 可能的功能
- [ ] API 金鑰認證
- [ ] 使用者配額管理
- [ ] 資料快取（Redis）
- [ ] Webhook 支援
- [ ] GraphQL 端點
- [ ] WebSocket 即時更新
- [ ] 批次處理 API
- [ ] 管理後台

#### 平台整合
- [ ] PTT (需要處理驗證碼)
- [ ] Instagram (需要處理登入)
- [ ] Threads
- [ ] Weibo
- [ ] Dcard

### 10. 效能考量

#### 快取策略
建議對頻繁存取的內容實作快取：
- Twitter 貼文: 5-10 分鐘
- Pixiv 作品: 30 分鐘
- 商品資訊: 1 小時

#### 並發處理
- 使用 Promise.all 並行處理多個請求
- 設定適當的 timeout 避免阻塞

#### 資源限制
- 設定請求大小限制
- 設定回應大小限制
- 監控記憶體使用

## 使用方式

詳細的 API 使用文檔請參考：
- [API 文檔](./api-documentation.md)
- [API 測試範例](./api-testing-examples.md)

## 注意事項

1. 某些平台（如巴哈姆特）需要 Cookie 認證
2. 某些平台（如 Pixiv）使用圖片代理服務
3. API 呼叫可能受第三方平台限制
4. 建議實作適當的錯誤重試機制
5. 生產環境建議使用 HTTPS
