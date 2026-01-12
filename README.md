<h1 align="center">
    <img width="120" height="120" src="pic/logo.svg" alt=""><br>
    ermiana
</h1>

<p align="center">
    <a href="https://github.com/canaria3406/ermiana/blob/master/LICENSE"><img src="https://img.shields.io/github/license/canaria3406/ermiana?style=flat-square"></a>
    <a href="https://github.com/canaria3406/ermiana"><img src="https://img.shields.io/github/stars/canaria3406/ermiana?style=flat-square"></a>
    <a href="https://discord.com/application-directory/1078919650764652594"><img src="https://img.shields.io/badge/verified-%E2%9C%93%20BOT-7289da?style=flat-square&logo=discord&logoColor=white"></a>
    <a href="https://discord.com/application-directory/1078919650764652594"><img src="https://img.shields.io/endpoint?url=https%3A%2F%2Fermiana.deno.dev%2F&style=flat-square&logo=Discord&logoColor=white&cacheSeconds=86400"></a>
    <a href="https://discord.gg/QBwjpHcMyw"><img src="https://img.shields.io/discord/1172363356406042684?style=flat-square&logo=Discord&logoColor=white&label=support&color=yellow"></a>
</p>

A Discord bot that fixes sites with broken preview by providing more detailed images and webpage content. Supports multiple popular sites in Taiwan, East Asia. 

**🆕 Now with RESTful API!** All platform handlers have been extracted into independent API services that can be used by any application, not just Discord bots.

![demo](pic/demo20.png)

## Features

- 🤖 **Discord Bot** - Automatically enhance social media links with rich embeds
- 🌐 **RESTful API** - Access platform data programmatically via HTTP endpoints
- 🔧 **Modular Design** - Service-oriented architecture for easy maintenance
- 🔒 **Secure** - Rate limiting, helmet security headers, CORS support
- 📝 **Well Documented** - Comprehensive API documentation and examples
- 🔄 **Dual Mode** - Choose between direct processing or API server architecture

## Quick Start

### Discord Bot Only (Direct Mode)
```bash
npm install
npm start
```

## Getting Started

This bot uses **API Mode** to process social media links through a centralized API server.

### Setup

1. Configure `.env`:
```env
API_URL=http://localhost:3000
API_PORT=3000
```

2. Start both services:
```bash
npm install
npm run start:all
```

Or start separately:
```bash
# Terminal 1 - API Server
npm run start:api

# Terminal 2 - Discord Bot
npm start
```

### API Server Only
```bash
npm install
npm run start:api
```

## Configuration

Create a `.env` file based on `.env.example`:

```env
# Discord Bot Configuration
DCTK="Your Discord Bot Token"
DCID="Your Discord Bot Client ID"
DCWH="Your Discord Webhook URL (optional)"
BHUD="Baha User ID (optional)"
BHPD="Baha Password (optional)"

# API Server Configuration
API_PORT=3000
API_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

### Architecture

The bot operates in **API Mode** using a centralized API server:

- ✅ Better modularity and maintainability
- ✅ Independent testing and monitoring
- ✅ Shared service layer across platforms
- ✅ Professional API documentation interface
- ✅ Easier to scale and extend

See [API Integration Guide](doc/api-integration-guide.md) for detailed information.

## API Documentation

- 📖 [API Architecture](doc/api-architecture.md) - System design and architecture overview
- 📚 [API Documentation](doc/api-documentation.md) - Complete API reference
- 🧪 [API Testing Examples](doc/api-testing-examples.md) - curl and Postman examples
- � [API Integration Guide](doc/api-integration-guide.md) - How to use API mode
- 📋 [Migration Summary](API-MIGRATION-SUMMARY.md) - API migration details
- ✅ [Completeness Report](API-COMPLETENESS-REPORT.md) - Feature verification

### Example API Usage

```bash
# Get Twitter post data
curl http://localhost:3000/api/v1/twitter/1234567890

# Get Pixiv artwork data
curl http://localhost:3000/api/v1/pixiv/123456789

# Get Plurk post data
curl http://localhost:3000/api/v1/plurk/abcd1234
```

**Available Endpoints:**
- Twitter/X (`/api/v1/twitter/:statusId`)
- Pixiv (`/api/v1/pixiv/:illustId`)
- Plurk (`/api/v1/plurk/:plurkId`)
- Bluesky (`/api/v1/bluesky/:handle/:postId`)
- 巴哈姆特 (`/api/v1/baha/:postId`)
- E-Hentai (`/api/v1/eh/:galleryId/:token`)
- PChome (`/api/v1/pchome/:productId`)
- Misskey (`/api/v1/misskey/:noteId`)
- TikTok (`POST /api/v1/tiktok`)
- Bilibili (`/api/v1/bilibili/:opusId`)
- Instagram (`/api/v1/instagram/:postId`)
- Threads (`POST /api/v1/threads`)
- PTT (`/api/v1/ptt/:board/:postId`)
- Weibo (`/api/v1/weibo/:statusId`)
- PChome (`/api/v1/pchome/:productId`)
- Misskey (`/api/v1/misskey/:noteId`)
- TikTok (`POST /api/v1/tiktok`)
- Bilibili (`/api/v1/bilibili/:opusId`)

## Invite BOT

[discord.com/application-directory/1078919650764652594](https://discord.com/application-directory/1078919650764652594)

## Policies

- [Privacy Policy](doc/privacy-policy.md)
- [Terms of Service](doc/terms-of-service.md)
- [隱私權政策](doc/privacy-policy-zh_tw.md)
- [服務條款](doc/terms-of-service-zh_tw.md)

## Screenshot

![demo](pic/demo21.png)

![demo](pic/demo22.png)

![demo](pic/demo25.png)

![demo](pic/demo3.png)

![demo](pic/demo24.png)

![demo](pic/demo23.png)

## Support

- [x] Community
  - [x] PTT.cc
    - [x] 八卦板
    - [x] 希洽板
    - [x] 裏洽板
    - [x] 西斯板
    - [x] 政黑板
    - [x] 表特板
    - [x] JAV板
    - [x] HG板
    - [x] DMMG板
  - [x] 巴哈姆特電玩資訊站
    - [x] 場外休憩區
  - [x] Bilibili 專欄
  - [ ] Dcard
- [x] Social media
  - [x] Plurk
  - [x] Twitter
  - [x] Misskey
  - [x] Bluesky
  - [x] Weibo
  - [x] instagram
  - [x] tiktok
  - [x] threads
- [x] Image sharing service
  - [x] Pixiv
  - [x] ehentai
  - [x] exhentai
  - [ ] nhentai
- [x] E-commerce site
  - [x] PChome24h
