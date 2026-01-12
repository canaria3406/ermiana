# API 測試範例

這個檔案包含了使用 curl 測試 Ermiana API 的範例指令。

## 前置條件

確保 API 伺服器正在運行：
```bash
npm run start:api
```

## 測試指令

### 1. 健康檢查
```bash
curl http://localhost:3000/health
```

### 2. 獲取 API 端點列表
```bash
curl http://localhost:3000/api/v1
```

### 3. Twitter/X 測試
```bash
# 替換 1234567890 為實際的 Twitter 狀態 ID
curl http://localhost:3000/api/v1/twitter/1234567890
```

### 4. Pixiv 測試
```bash
# 替換 123456789 為實際的 Pixiv 作品 ID
curl http://localhost:3000/api/v1/pixiv/123456789
```

### 5. Plurk 測試
```bash
# 替換 abcd1234 為實際的 Plurk ID
curl http://localhost:3000/api/v1/plurk/abcd1234
```

### 6. Bluesky 測試
```bash
# 替換 handle 和 postId 為實際值
curl http://localhost:3000/api/v1/bluesky/user.bsky.social/abc123xyz456
```

### 7. 巴哈姆特測試
```bash
# 注意：URL 參數需要正確編碼
curl "http://localhost:3000/api/v1/baha/C.php?bsn=60076&snA=1234567"
```

### 8. E-Hentai 測試
```bash
# 替換 galleryId 和 token 為實際值
curl http://localhost:3000/api/v1/eh/1234567/abcdef0123
```

### 9. PChome 測試
```bash
# 替換為實際的商品 ID
curl http://localhost:3000/api/v1/pchome/ABCDEF-123456789
```

### 10. Misskey 測試
```bash
# 替換為實際的 Note ID
curl http://localhost:3000/api/v1/misskey/abc123xyz456
```

### 11. TikTok 測試 (POST)
```bash
curl -X POST http://localhost:3000/api/v1/tiktok \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.tiktok.com/@username/video/1234567890"}'
```

### 12. Bilibili 測試
```bash
# 替換為實際的 Opus ID
curl http://localhost:3000/api/v1/bilibili/123456789
```

## 錯誤測試

### 測試無效參數
```bash
curl http://localhost:3000/api/v1/twitter/invalid_id
```

### 測試速率限制
```bash
# 快速發送多個請求來觸發速率限制
for i in {1..70}; do
  curl http://localhost:3000/health &
done
wait
```

## 使用 jq 美化輸出

如果你安裝了 `jq`，可以美化 JSON 輸出：

```bash
curl http://localhost:3000/api/v1/pixiv/123456789 | jq
```

## 使用 Postman

你也可以將以下內容導入到 Postman：

### Postman Collection

```json
{
  "info": {
    "name": "Ermiana API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "http://localhost:3000/health",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["health"]
        }
      }
    },
    {
      "name": "Twitter",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "http://localhost:3000/api/v1/twitter/:statusId",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "v1", "twitter", ":statusId"],
          "variable": [
            {
              "key": "statusId",
              "value": "1234567890"
            }
          ]
        }
      }
    },
    {
      "name": "Pixiv",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "http://localhost:3000/api/v1/pixiv/:illustId",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "v1", "pixiv", ":illustId"],
          "variable": [
            {
              "key": "illustId",
              "value": "123456789"
            }
          ]
        }
      }
    }
  ]
}
```

## 環境變數測試

如果你想使用不同的端口，設定環境變數：

```bash
# Windows PowerShell
$env:API_PORT=8080; npm run start:api

# Linux/Mac
API_PORT=8080 npm run start:api
```

然後使用新端口進行測試：
```bash
curl http://localhost:8080/health
```
