# 🎬 JANALA OTT Admin Portal & Heritage Studio

[![Node.js](https://img.shields.io/badge/Node.js-18%20%7C%2020%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Storage](https://img.shields.io/badge/Storage-Cloudflare%20R2-orange.svg)](https://www.cloudflare.com/developer-platform/r2/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-336791.svg)](https://www.postgresql.org/)
[![AI](https://img.shields.io/badge/AI-Google%20Gemini%203.8%20Flash-8E75C4.svg)](https://aistudio.google.com/)

A full-stack, enterprise-grade Content, Media, and Video Management System for the **JANALA OTT** streaming platform. Built with React 19, TypeScript, Express, Cloudflare R2 direct-to-cloud video uploading, PostgreSQL metadata persistence, cryptographic JWT authentication, and Google Gemini AI automated content curation.

---

## 📑 Table of Contents
1. [Architecture & Key Features](#-architecture--key-features)
2. [Master Environment Variables Reference](#-master-environment-variables-reference)
3. [Database Setup: Full DATABASE_URL vs Individual SQL_* Parameters](#-database-setup-full-database_url-vs-individual-sql_-parameters)
   - [Comparison Summary](#comparison-summary)
   - [Method 1: Full DATABASE_URL (or DB_URL)](#method-1-full-database_url-or-db_url)
   - [Method 2: Individual SQL Connection Parameters](#method-2-individual-sql-connection-parameters)
   - [Under the Hood: Precedence & Auto-Fallback Logic](#under-the-hood-precedence--auto-fallback-logic)
   - [URL Encoding Rules for Database Passwords](#url-encoding-rules-for-database-passwords)
4. [Cloudflare R2 Storage Setup (Zero-Egress Direct Uploads)](#-cloudflare-r2-storage-setup-zero-egress-direct-uploads)
   - [Why Direct Browser-to-R2 Uploads?](#why-direct-browser-to-r2-uploads)
   - [Required R2 Environment Variables](#required-r2-environment-variables)
   - [Generating R2 API Tokens](#generating-r2-api-tokens)
   - [Mandatory R2 Bucket CORS Configuration](#mandatory-r2-bucket-cors-configuration)
5. [Authentication & JWT Security Keys](#-authentication--jwt-security-keys)
   - [Token Life Cycles & Roles](#token-life-cycles--roles)
   - [Pre-Configured Production Keys](#pre-configured-production-keys)
6. [Gemini AI Configuration (GEMINI_API_KEY)](#-gemini-ai-configuration-gemini_api_key)
   - [Capabilities & Endpoints](#capabilities--endpoints)
   - [Obtaining your Gemini API Key](#obtaining-your-gemini-api-key)
   - [Testing the Gemini AI Integration](#testing-the-gemini-ai-integration)
7. [Hostinger Deployment Guide (Step-by-Step)](#-hostinger-deployment-guide-step-by-step)
   - [Hostinger Node.js Application Settings](#hostinger-nodejs-application-settings)
   - [Directory Structure & Application Root](#directory-structure--application-root)
8. [Ready-to-Paste .env Templates](#-ready-to-paste-env-templates)
   - [Template A: Hostinger Production (Individual SQL Parameters)](#template-a-hostinger-production-individual-sql-parameters)
   - [Template B: Managed Cloud Database (DATABASE_URL)](#template-b-managed-cloud-database-database_url)
9. [Build, Run & Health Check Commands](#-build-run--health-check-commands)

---

## 🏗️ Architecture & Key Features

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                              │
│   React 19 SPA + Tailwind CSS + Lucide Icons + Presigned Upload Client │
└──────────────┬──────────────────────────────────────────┬──────────────┘
               │                                          │
    Direct Multi-GB Video                       REST API / Auth / CRUD
    Presigned Upload (Zero Egress)                        │
               │                                          ▼
               ▼                         ┌───────────────────────────────┐
┌──────────────────────────────┐         │      EXPRESS API SERVER       │
│      CLOUDFLARE R2           │         │     (server.js / port 3000)   │
│  Bucket: ayan                │         └───────┬──────────────┬────────┘
│  - Master Videos (1080p/4K)  │                 │              │
│  - Posters & Backdrops       │                 ▼              ▼
│  - Trailer & Teaser Clips    │       ┌───────────────┐  ┌───────────────┐
└──────────────────────────────┘       │  POSTGRESQL   │  │ GOOGLE GEMINI │
                                       │   DATABASE    │  │  3.8 FLASH    │
                                       │  (Metadata)   │  │ (AI Synopsis) │
                                       └───────────────┘  └───────────────┘
```

- **Zero-Egress Direct Video Uploads**: Video files up to 10GB bypass the Node.js server and stream directly into Cloudflare R2 using S3-compatible presigned URLs.
- **Dual Database Connection Engine**: Supports both all-in-one connection URIs (`DATABASE_URL`) and discrete host/user/password/dbname parameters (`SQL_*`).
- **Cryptographic RBAC Authentication**: 256-bit HMAC SHA-256 JWT tokens with role separation (`ADMIN`, `CONTENT_MANAGER`, `FINANCE_MANAGER`, `USER`).
- **AI-Powered Content Curation**: Google Gemini 3.8 Flash automated synopsis writer, logline generator, maturity ratings, and SEO tags.

---

## 📋 Master Environment Variables Reference

| Category | Variable Name | Required? | Example / Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| **Server** | `NODE_ENV` | **Yes** | `production` | Set to `production` for optimized caching and security. |
| **Server** | `PORT` | Optional | `3000` | Local port for Express API server (Hostinger assigns this). |
| **Server** | `APP_URL` | Recommended | `https://admin.janalaa.com` | Base public URL of your admin application. |
| **Server** | `ADMIN_FRONTEND_URL` | Recommended | `https://admin.janalaa.com` | Allowed CORS origin for cross-domain API calls. |
| **Database** | `DATABASE_URL` / `DB_URL` | Conditional | `postgresql://user:pass@host:5432/db` | **Option 1**: Full PostgreSQL connection URI. |
| **Database** | `SQL_HOST` / `DB_HOST` | Conditional | `localhost` | **Option 2**: Hostname or IP of PostgreSQL server. |
| **Database** | `SQL_PORT` / `DB_PORT` | Conditional | `5432` | **Option 2**: PostgreSQL port (standard 5432). |
| **Database** | `SQL_USER` / `DB_USER` | Conditional | `u123456789_janala` | **Option 2**: Database username. |
| **Database** | `SQL_PASSWORD` / `DB_PASS` | Conditional | `YourStrongPass123` | **Option 2**: Database user password. |
| **Database** | `SQL_DB_NAME` / `DB_NAME` | Conditional | `u123456789_janala_db` | **Option 2**: Database name. |
| **Database** | `SQL_SSL` / `DB_SSL` | Optional | `false` | Enable SSL (`true` for cloud DBs, `false` for Hostinger local). |
| **Storage** | `STORAGE_PROVIDER` | **Yes** | `r2` | Storage driver (`r2` for Cloudflare, or `local`). |
| **Storage** | `R2_BUCKET_NAME` | **Yes** | `ayan` | Cloudflare R2 bucket name. |
| **Storage** | `R2_ACCOUNT_ID` | **Yes** | `61fb1c91a19b595b9e0e767447383afe` | Cloudflare Account ID from R2 Overview. |
| **Storage** | `R2_ACCESS_KEY_ID` | **Yes** | `e84b1c7899996705b7bf95a2ca5eef5a` | Cloudflare R2 API Token Access Key. |
| **Storage** | `R2_SECRET_ACCESS_KEY`| **Yes** | `22209b0b4b712e4e522eb329299b5...` | Cloudflare R2 API Token Secret Key. |
| **Storage** | `R2_ENDPOINT` | Optional | Auto-derived from Account ID | Cloudflare S3 endpoint URL. |
| **Storage** | `R2_PUBLIC_URL` | Recommended | `https://pub-xxxx.r2.dev` | Public URL or custom domain used to stream videos. |
| **Auth** | `JWT_SECRET` | **Yes** | `a9f4afee3f30d219470c...` | 256-bit secret key for access tokens (8h validity). |
| **Auth** | `JWT_REFRESH_SECRET` | **Yes** | `bd9a0d047c07aa3613f7...` | 256-bit secret key for refresh tokens (7d validity). |
| **AI** | `GEMINI_API_KEY` | **Yes** | `AIzaSy...` or `AQ.Ab8...` | Google AI Studio API key for Gemini metadata generation. |

---

## 🗄️ Database Setup: Full DATABASE_URL vs Individual SQL_* Parameters

The database layer (`src/db/index.ts`) allows you to connect to PostgreSQL in **two different ways**. You do **not** need both; pick the one that matches your database provider.

### Comparison Summary

| Feature | Option 1: `DATABASE_URL` / `DB_URL` | Option 2: Individual `SQL_*` Parameters |
| :--- | :--- | :--- |
| **Best Used For** | Cloud Managed DBs (Neon, Supabase, Render, Railway, AWS RDS) | Shared & VPS Hosting (Hostinger cPanel/hPanel, direct Linux servers) |
| **Configuration Format** | Single string: `postgresql://user:pass@host:5432/db` | Multiple keys: `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME` |
| **Password Encoding** | **Requires URL-encoding** if password has `@`, `#`, `:`, `%`, etc. | **No encoding required**; special characters work verbatim |
| **SSL Flag** | Controlled via `?sslmode=require` query or `SQL_SSL=true` | Controlled via `SQL_SSL=true` or `false` |
| **Aliases Supported** | `DATABASE_URL`, `DB_URL` | `SQL_PASSWORD` = `DB_PASS`, `SQL_HOST` = `DB_HOST`, `SQL_DB_NAME` = `DB_NAME` |

---

### Method 1: Full DATABASE_URL (or DB_URL)

Use this method when your database provider generates a single connection string.

#### Format:
```text
DATABASE_URL=postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE_NAME]?sslmode=require
```

#### Example (Supabase / Neon):
```env
DATABASE_URL=postgresql://postgres.ep-sweet-glade:MySecretP%40ss@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

---

### Method 2: Individual SQL Connection Parameters

Use this method when deploying on **Hostinger Web Hosting**. Hostinger displays database credentials as separate values when you create a database under **Databases > PostgreSQL Databases**.

#### Format:
```env
SQL_HOST=localhost
SQL_PORT=5432
SQL_USER=u123456789_janala
SQL_PASSWORD=MySecurePassword#2026
SQL_DB_NAME=u123456789_janala_db
SQL_SSL=false
```

> **Aliases Supported**:
> - `SQL_PASSWORD` can also be written as `DB_PASS`
> - `SQL_HOST` can also be written as `DB_HOST`
> - `SQL_USER` can also be written as `DB_USER`
> - `SQL_DB_NAME` can also be written as `DB_NAME`
> - `SQL_PORT` can also be written as `DB_PORT`

---

### Under the Hood: Precedence & Auto-Fallback Logic

Here is the exact logic running in `src/db/index.ts`:

```typescript
// 1. Check for connection string first
const connectionString = process.env.DATABASE_URL || process.env.DB_URL;

// 2. Resolve individual connection parameters
const host = process.env.SQL_HOST || process.env.DB_HOST || 'localhost';
const port = parseInt(process.env.SQL_PORT || process.env.DB_PORT || '5432', 10);
const user = process.env.SQL_USER || process.env.DB_USER || 'postgres';
const password = process.env.SQL_PASSWORD || process.env.DB_PASSWORD || process.env.DB_PASS || '';
const database = process.env.SQL_DB_NAME || process.env.DB_NAME || 'postgres';

// 3. SSL Configuration
const useSsl = process.env.SQL_SSL === 'true' || process.env.SQL_SSL === '1' || process.env.DB_SSL === 'true';

// 4. Initialize Pool (Connection String takes precedence)
global._postgresPool = new Pool(
  connectionString
    ? { connectionString, ssl: useSsl ? { rejectUnauthorized: false } : false }
    : { host, port, user, password, database, ssl: useSsl ? { rejectUnauthorized: false } : false }
);
```

**Resolution Rule**:
1. If `DATABASE_URL` or `DB_URL` is found, the connection string is used directly.
2. If neither connection string is present, the app automatically connects using `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_PORT`, and `SQL_DB_NAME`.

---

### URL Encoding Rules for Database Passwords

If you use **Method 1 (`DATABASE_URL`)**, any non-alphanumeric character in your password will break the connection string parser unless it is URL-encoded:

| Character | Encoded Value | Example Original Password | Encoded in DATABASE_URL |
| :---: | :---: | :--- | :--- |
| `@` | `%40` | `secret@123` | `secret%40123` |
| `#` | `%23` | `ott#pass` | `ott%23pass` |
| `:` | `%3A` | `db:key` | `db%3Akey` |
| `$` | `%24` | `money$45` | `money%2445` |
| `/` | `%2F` | `path/val` | `path%2Fval` |
| `?` | `%3F` | `who?me` | `who%3Fme` |

> 💡 **Recommendation**: If your database password contains characters like `@` or `#`, using **Method 2 (`SQL_PASSWORD=secret@123`)** avoids needing to encode anything!

---

## ☁️ Cloudflare R2 Storage Setup (Zero-Egress Direct Uploads)

### Why Direct Browser-to-R2 Uploads?
Video files for movies and episodes regularly exceed 2GB to 10GB. If uploaded through a standard Node.js Express server, they cause request timeouts, memory exhaustion, and bandwidth throttling. 

JANALA OTT uses **presigned S3 multipart URLs**:
1. The admin UI requests an upload ticket from `/api/v1/admin/media/request-upload`.
2. The server creates an authorized Cloudflare R2 presigned URL.
3. The browser streams video chunks directly into Cloudflare R2 at full speed.
4. The server receives a completion confirmation and updates the PostgreSQL record.

---

### Required R2 Environment Variables

```env
STORAGE_PROVIDER=r2
R2_BUCKET_NAME=ayan
R2_ACCOUNT_ID=61fb1c91a19b595b9e0e767447383afe
R2_ACCESS_KEY_ID=e84b1c7899996705b7bf95a2ca5eef5a
R2_SECRET_ACCESS_KEY=22209b0b4b712e4e522eb329299b5e57749ce5608104d2ebc4f33db276de6ff1
R2_ENDPOINT=https://61fb1c91a19b595b9e0e767447383afe.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-xxxxxx.r2.dev
```

### Generating R2 API Tokens:
1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Select **R2 Storage** from the left navigation.
3. Your **Account ID** is displayed on the right sidebar.
4. Click **Manage R2 API Tokens** &rarr; **Create API Token**.
5. Set Permissions to **Object Read & Write**.
6. Set TTL to **Forever** (or your organizational security standard).
7. Copy the **Access Key ID** and **Secret Access Key**.

---

### Mandatory R2 Bucket CORS Configuration

To allow browsers to upload gigabyte-sized video files directly to Cloudflare without cross-origin errors, configure the CORS policy:

1. Open Cloudflare &rarr; **R2 Storage** &rarr; Select Bucket (`ayan`).
2. Go to the **Settings** tab.
3. Scroll to **CORS Policy** and click **Edit CORS Policy**.
4. Paste the following JSON:

```json
[
  {
    "AllowedOrigins": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "HEAD",
      "DELETE"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "etag",
      "Content-Range",
      "Accept-Ranges",
      "Content-Length"
    ],
    "MaxAgeSeconds": 3600
  }
]
```
5. Click **Save**.

---

## 🔑 Authentication & JWT Security Keys

JANALA OTT uses dual-token JWT cryptography to authenticate admins and content operators.

### Token Life Cycles & Roles:
- **Access Token (`JWT_SECRET`)**: Valid for **8 hours**. Sent in `Authorization: Bearer <token>` headers for all API requests.
- **Refresh Token (`JWT_REFRESH_SECRET`)**: Valid for **7 days**. Used by `/api/v1/auth/refresh` to renew access tokens without forcing re-login.
- **Roles Enforced**:
  - `ADMIN`: Full system control (content, user accounts, finance, settings).
  - `CONTENT_MANAGER`: Video library, movies, series, episodes, metadata, terms.
  - `FINANCE_MANAGER`: Subscription packages, revenue logs, billing metrics.
  - `USER`: Read-only stream consumer.

### Pre-Configured Production Keys:
These 256-bit cryptographic keys are built into the app codebase as defaults and should be added into your server environment variables:

```env
JWT_SECRET=a9f4afee3f30d219470c8c43862aad841bd7d43516a8b198adf086052ff56b2f
JWT_REFRESH_SECRET=bd9a0d047c07aa3613f7e59b02def4ce5c7ff23c473b05e6d642a9fa9946cf9d
```

---

## 🤖 Gemini AI Configuration (GEMINI_API_KEY)

JANALA OTT incorporates **Google Gemini 3.8 Flash** via the modern `@google/genai` TypeScript SDK to automate streaming catalog curation.

### Capabilities & Endpoints:
- **Automated Synopsis**: Generates 1-2 sentence hooks and rich 3-paragraph story summaries without spoilers.
- **Logline Writer**: Produces sharp, film-festival-grade single-sentence pitches.
- **Maturity & Content Advisory**: Evaluates themes and suggests ratings (`U`, `U/A 7+`, `U/A 13+`, `U/A 16+`, `A`) plus advisory tags (`Mild Violence`, `Language`).
- **Searchable OTT Tags**: Generates high-converting discoverability tags.

| Endpoint | Method | Purpose |
| :--- | :---: | :--- |
| `/api/v1/admin/ai/status` | `GET` | Verifies whether `GEMINI_API_KEY` is configured and model is active. |
| `/api/v1/admin/ai/generate-metadata` | `POST` | Generates synopsis, logline, maturity rating, and tags from title & genre. |

### Obtaining your Gemini API Key:
1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Click **Get API key** &rarr; **Create API key**.
3. Copy your key and add it as:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

### Testing the Gemini AI Integration:
From your server terminal or Postman:
```bash
curl http://localhost:3000/api/v1/admin/ai/status
```
Expected response:
```json
{
  "configured": true,
  "model": "gemini-3.8-flash",
  "provider": "Google Gemini AI",
  "features": [
    "Synopsis Generation",
    "Logline Writer",
    "Content Advisory Tags",
    "SEO Metadata"
  ]
}
```

---

## 🌐 Hostinger Deployment Guide (Step-by-Step)

### Hostinger Node.js Application Settings:
Inside Hostinger hPanel under **Websites &rarr; Manage &rarr; Setup Node.js App**:

| Setting Field | Hostinger Value | Explanation |
| :--- | :--- | :--- |
| **Node.js Version** | **`18.x`** or **`20.x`** | Compatible with modern ES Modules and React 19. |
| **Application Mode** | **`Production`** | Disables dev servers and enables compression. |
| **Application Root** | `public_html` *(or subdomain directory)* | The folder where `package.json` and `server.js` exist. |
| **Application URL** | `https://admin.yourdomain.com` | Your live admin domain. |
| **Application Startup File** | **`server.js`** | Built-in smart starter that verifies compiled assets. |

### Directory Structure on Hostinger Server:
```text
public_html/
├── server.js               <-- Hostinger startup entry file
├── package.json            <-- App dependencies & scripts
├── dist/                   <-- Generated by `npm run build`
│   ├── client/             <-- Compiled React frontend SPA
│   └── server.cjs          <-- Compiled production Express backend
├── src/                    <-- TypeScript application source code
└── .env                    <-- Environment variables (or set in hPanel)
```

---

## 📄 Ready-to-Paste .env Templates

### Template A: Hostinger Production (Individual SQL Parameters)
*Use this for Hostinger cPanel / hPanel with a local PostgreSQL database:*

```env
# 1. Server Configuration
NODE_ENV=production
PORT=3000
APP_URL=https://admin.janalaa.com
ADMIN_FRONTEND_URL=https://admin.janalaa.com

# 2. Authentication Secrets (Pre-configured 256-bit Keys)
JWT_SECRET=a9f4afee3f30d219470c8c43862aad841bd7d43516a8b198adf086052ff56b2f
JWT_REFRESH_SECRET=bd9a0d047c07aa3613f7e59b02def4ce5c7ff23c473b05e6d642a9fa9946cf9d

# 3. Google Gemini AI Key
GEMINI_API_KEY=your_gemini_api_key_here

# 4. Cloudflare R2 Storage (ayan Bucket)
STORAGE_PROVIDER=r2
R2_BUCKET_NAME=ayan
R2_ACCOUNT_ID=61fb1c91a19b595b9e0e767447383afe
R2_ACCESS_KEY_ID=e84b1c7899996705b7bf95a2ca5eef5a
R2_SECRET_ACCESS_KEY=22209b0b4b712e4e522eb329299b5e57749ce5608104d2ebc4f33db276de6ff1
R2_ENDPOINT=https://61fb1c91a19b595b9e0e767447383afe.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-xxxxxx.r2.dev

# 5. Database: Hostinger Local PostgreSQL (Option B)
SQL_HOST=localhost
SQL_PORT=5432
SQL_USER=u123456789_janala
SQL_PASSWORD=YourHostingerDatabasePassword
SQL_DB_NAME=u123456789_janala_db
SQL_SSL=false
```

---

### Template B: Managed Cloud Database (DATABASE_URL)
*Use this when using Supabase, Neon, Render, or AWS RDS:*

```env
# 1. Server Configuration
NODE_ENV=production
PORT=3000
APP_URL=https://admin.janalaa.com
ADMIN_FRONTEND_URL=https://admin.janalaa.com

# 2. Authentication Secrets
JWT_SECRET=a9f4afee3f30d219470c8c43862aad841bd7d43516a8b198adf086052ff56b2f
JWT_REFRESH_SECRET=bd9a0d047c07aa3613f7e59b02def4ce5c7ff23c473b05e6d642a9fa9946cf9d

# 3. Google Gemini AI Key
GEMINI_API_KEY=your_gemini_api_key_here

# 4. Cloudflare R2 Storage
STORAGE_PROVIDER=r2
R2_BUCKET_NAME=ayan
R2_ACCOUNT_ID=61fb1c91a19b595b9e0e767447383afe
R2_ACCESS_KEY_ID=e84b1c7899996705b7bf95a2ca5eef5a
R2_SECRET_ACCESS_KEY=22209b0b4b712e4e522eb329299b5e57749ce5608104d2ebc4f33db276de6ff1
R2_PUBLIC_URL=https://pub-xxxxxx.r2.dev

# 5. Database: Managed PostgreSQL Connection String (Option A)
DATABASE_URL=postgresql://janala_user:p%40ssw0rd@ep-cool-butterfly.us-east-2.aws.neon.tech:5432/janala_production?sslmode=require
SQL_SSL=true
```

---

## 🚀 Build, Run & Health Check Commands

### 1. Build and Run:
```bash
# Install all dependencies
npm install

# Build client (Vite) and server (esbuild) bundles
npm run build

# Start production server
npm start
# (Alternatively: node server.js)
```

### 2. Verify Deployment:
Once running, check your system health:

- **Server Health Check**:
  ```bash
  curl https://admin.yourdomain.com/api/health
  # Returns: {"status":"ok","service":"JANALA OTT Admin API","timestamp":"..."}
  ```

- **Gemini AI Status Check**:
  ```bash
  curl https://admin.yourdomain.com/api/v1/admin/ai/status
  # Returns: {"configured":true,"model":"gemini-3.8-flash","provider":"Google Gemini AI",...}
  ```

---

## 📄 License
Proprietary software for **JANALA (জানালা) OTT Heritage Studio**. All rights reserved.
