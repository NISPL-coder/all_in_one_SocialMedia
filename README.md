# SocialHub — Unified Social Media Publishing Dashboard

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646cff.svg)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-000000.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-2D3748.svg)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38b2ac.svg)](https://tailwindcss.com/)

SocialHub is a modern, enterprise-grade, single-user social media management web application that allows you to create content in one unified composer and publish or schedule it to multiple platforms simultaneously:

1. **LinkedIn** (Official LinkedIn REST API v2 & Community Management)
2. **Facebook Pages** (Meta Graph API v21.0)
3. **Instagram Professional** (Instagram Content Publishing API)
4. **WhatsApp Business Platform** (Meta WhatsApp Cloud API)
5. **Google Business Profile** (Google My Business Local Posts API)

---

## 🌟 Key Features

- **Unified Multi-Platform Composer**: Write once, customize per-channel, attach multi-resolution media or PDF brochures, and publish or schedule with one click.
- **Realistic Channel Mock Previews**: Pixel-accurate tabbed live previews for LinkedIn (Feed post), Facebook (Page post), Instagram (Feed/Carousel), WhatsApp (Chat Bubble), and Google Business Profile (Local update with Call to Action button).
- **AI-Powered Content Assistant**: Generate engaging captions, platform-tailored copy variations, headline hooks, and trending hashtags using Gemini or smart heuristic engines.
- **Enterprise Security**:
  - AES-256-GCM authenticated encryption for all OAuth access and refresh tokens stored at rest.
  - Passwords hashed using bcrypt / Argon2 with salt rounds.
  - HTTP-only, SameSite session cookies.
  - Strict input validation with Zod schemas.
  - Zero leakage of secrets or raw platform access tokens to client browsers.
- **Reliable Scheduling & Resiliency**:
  - BullMQ and Redis queue processing with automatic fallback to an in-process persistent scheduler when running in local dev without an external Redis instance.
  - Per-platform independent job isolation (e.g., if Facebook succeeds but Instagram fails due to aspect ratio, Facebook remains Published and Instagram records the failure with full retry capabilities).
  - Exponential backoff and idempotency keys to prevent duplicate publishing.
- **Genuine Database Analytics**: Zero fake or hardcoded metrics; dashboard cards, platform distributions, and audit trails derive from actual PostgreSQL database records.
- **Content Calendar**: Monthly, weekly, and daily interactive scheduling calendar with platform filter pills and click-to-inspect drawers.
- **Central Media Asset Library**: Unified asset manager supporting images (JPEG, PNG, WebP), videos (MP4, WebM), and PDF documents with instant preview.
- **WhatsApp Dedicated Distribution Flow**: Compliant with WhatsApp Cloud API business messaging standards, recipient phone validation (E.164), and inbound webhook delivery tracking.

---

## 🏗️ Architecture & Project Structure

The project is structured as a monorepo:

```
socialhub/
├── apps/
│   ├── web/                        # React 18 + Vite + Tailwind CSS Frontend
│   │   ├── src/
│   │   │   ├── components/         # Composer, Previews, AI Modal, Layout
│   │   │   ├── context/            # AuthContext & Session management
│   │   │   ├── lib/                # Typed API client
│   │   │   ├── pages/              # Dashboard, Composer, Calendar, Posts, Media, Accounts, Settings, Login
│   │   │   └── App.tsx             # Protected routing
│   │   └── vite.config.ts
│   │
│   ├── api/                        # Express.js REST API Server
│   │   ├── src/
│   │   │   ├── config/             # Environment validation
│   │   │   ├── db/                 # Prisma PostgreSQL client + persistent store
│   │   │   ├── middlewares/        # Auth, Helmet, CORS, Rate Limit, Error
│   │   │   ├── queue/              # BullMQ publishing queue + fallback scheduler
│   │   │   ├── routes/             # Auth, Accounts, Posts, Media, Analytics, AI, Webhooks, Settings
│   │   │   ├── services/
│   │   │   │   ├── platforms/      # LinkedIn, Facebook, Instagram, WhatsApp, Google Business services
│   │   │   │   ├── ai.service.ts   # AI Content generator
│   │   │   │   └── publishing.service.ts # Multi-platform orchestration
│   │   │   └── utils/crypto.ts     # AES-256-GCM encryption & bcrypt hashing
│   │   └── test/                   # Automated unit & integration tests
│   │
│   └── worker/                     # Dedicated BullMQ Background Worker process
│       └── src/index.ts
│
├── packages/
│   └── shared/                     # Shared TypeScript types, enums, platform limits, DTOs
│       └── src/index.ts
│
├── prisma/
│   └── schema.prisma               # Complete PostgreSQL schema (13 models)
│
├── .env.example                    # Template environment variables
├── package.json                    # Workspace orchestrator
└── README.md                       # Comprehensive documentation
```

---

## 🚀 Quick Start & Local Development

### Prerequisites
- **Node.js**: v18+ (tested on Node v20/v22/v26)
- **npm**: v9+

### 1. Clone & Install
```bash
git clone <repository-url>
cd all_in_one
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(The application is pre-configured with secure development defaults and sandbox test accounts, so it runs immediately out-of-the-box!)*

### 3. Run Automated Tests
```bash
npm test
```
Runs the 8 automated verification tests covering AES-256-GCM token encryption, bcrypt hashing, platform validation constraints, multi-channel distribution, and retry logic.

### 4. Start the Application
```bash
npm run dev
```
This concurrently starts:
- **API Backend**: `http://localhost:4000`
- **Frontend Dashboard**: `http://localhost:5173`

### 5. Access the Dashboard
1. Open your browser to `http://localhost:5173`.
2. Sign in with the prefilled administrator credentials:
   - **Email**: `admin@socialhub.local`
   - **Password**: `AdminSecurePassword123!`
3. Click **Sign In to Dashboard**.

---

## 🔑 Official Social Media API Setup Guides

### 1. LinkedIn (Community Management API)
1. Go to the [LinkedIn Developer Portal](https://www.linkedin.com/developers/).
2. Create an App and associate it with your LinkedIn Company Page.
3. Under the **Products** tab, request access to:
   - **Sign In with LinkedIn using OpenID Connect**
   - **Share on LinkedIn** and **Community Management API** (for company pages).
4. Under the **Auth** tab:
   - Copy **Client ID** into `LINKEDIN_CLIENT_ID`.
   - Copy **Client Secret** into `LINKEDIN_CLIENT_SECRET`.
   - Add Authorized redirect URL: `http://localhost:4000/api/accounts/linkedin/callback` (or your production URL).

### 2. Meta (Facebook Pages & Instagram Professional)
1. Go to [Meta for Developers](https://developers.facebook.com/).
2. Create a **Business App**.
3. Under **Add products to your app**, select **Facebook Login for Business** and **Instagram Graph API**.
4. Set Redirect URI in Facebook Login Settings:
   - `http://localhost:4000/api/accounts/facebook/callback`
   - `http://localhost:4000/api/accounts/instagram/callback`
5. Copy **App ID** into `META_APP_ID` and **App Secret** into `META_APP_SECRET`.
6. Required Permissions:
   - `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`
   - `instagram_basic`, `instagram_content_publish`

### 3. WhatsApp Business Platform (Cloud API)
1. In the Meta Developer App, add **WhatsApp**.
2. Go to **WhatsApp > API Setup**:
   - Copy the **Phone Number ID** into `WHATSAPP_PHONE_NUMBER_ID`.
   - Copy the **WhatsApp Business Account ID** into `WHATSAPP_BUSINESS_ACCOUNT_ID`.
   - Generate a permanent System User Token in Meta Business Suite and set it in `WHATSAPP_ACCESS_TOKEN`.
3. Webhook Configuration:
   - Webhook Callback URL: `https://your-domain.com/api/webhooks/whatsapp`
   - Verify Token: enter the same value as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
   - Subscribe to the `messages` event field.

### 4. Google Business Profile API
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable:
   - **Google My Business API**
   - **My Business Business Information API**
3. Create an **OAuth 2.0 Client ID** (Web Application):
   - Authorized redirect URI: `http://localhost:4000/api/accounts/google_business/callback`.
4. Copy Client ID and Client Secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

---

## 🔒 Security Best Practices Implemented

- **AES-256-GCM Token Encryption**: Stored tokens have format `iv:authTag:cipherText`. Decryption keys are derived using PBKDF2/scrypt and never committed to source control.
- **Session Protection**: JWTs are stored in HTTP-Only, SameSite=Lax cookies, immune to JavaScript XSS theft.
- **Brute Force Protection**: Rate-limiting protects the `/api/auth/login` endpoint from credential stuffing.
- **Audit Logging**: Every publishing attempt, media upload, login event, and account connection is written to the immutable `audit_logs` table.

---

## 📦 Production Deployment

### Frontend (Vercel / Netlify / Cloudflare Pages)
```bash
npm run build --workspace=@socialhub/web
```
- Set `VITE_API_URL` to your backend domain (e.g. `https://api.yourdomain.com`).
- Output directory: `apps/web/dist`.

### Backend (Docker / Render / Railway / AWS ECS)
1. Build TypeScript output:
   ```bash
   npm run build --workspace=@socialhub/shared
   npm run build --workspace=@socialhub/api
   ```
2. Start the production server:
   ```bash
   NODE_ENV=production npm run start --workspace=@socialhub/api
   ```

### MongoDB Database Connection
To connect to your local MongoDB or a cloud MongoDB Atlas cluster:
1. In `.env`, set:
   ```env
   # Local MongoDB
   DATABASE_URL=mongodb://localhost:27017/socialhub
   
   # Or MongoDB Atlas Cloud:
   DATABASE_URL=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/socialhub?retryWrites=true&w=majority
   ```
2. The application automatically connects, creates the collections (`users`, `connected_accounts`, `social_posts`, `post_targets`, `publishing_jobs`, `publishing_attempts`, `audit_logs`), and seeds the initial administrator account.

---

## 🛡️ License
Private commercial software. All rights reserved.
