# Hostinger Deployment & Database Configuration Guide

## Database Overview
Your Hostinger Database is hosted on **MySQL / MariaDB** managed via **phpMyAdmin**:
- **phpMyAdmin URL**: [https://auth-db1403.hstgr.io/index.php?db=u139837875_janalaa_db](https://auth-db1403.hstgr.io/index.php?db=u139837875_janalaa_db)
- **Database Name**: `u139837875_janalaa_db`
- **Database User**: `u139837875_janalaa_db` (or user created in hPanel)

---

## 1. Why Did "504 Gateway Time-out" Occur?
When Node.js attempted to connect to PostgreSQL on port 5432 while Hostinger was running MySQL on port 3306, the database connection stalled waiting for a TCP handshake. The Nginx reverse proxy reached its 30-second timeout and returned `504 Gateway Time-out`.

### The Solution:
1. **Multi-Driver Engine**: The backend now natively connects to **MySQL (port 3306)** and **PostgreSQL (port 5432)** with automatic detection.
2. **2-Second Safety Timeout**: Database queries have a 2000ms safety timeout limit.
3. **Resilient Dual-Sync**: If the remote database is initializing, the server instantly responds using the resilient local cache so **HTTP requests never hang or time out**.

---

## 2. Hostinger Environment Variables (`.env`)

In **Hostinger hPanel** &rarr; **Websites** &rarr; **Manage** &rarr; **Node.js** &rarr; **Environment Variables**, add:

```ini
DB_TYPE=mysql
SQL_HOST=localhost
SQL_PORT=3306
SQL_USER=u139837875_janalaa_db
SQL_PASSWORD=YourDatabasePassword
SQL_DB_NAME=u139837875_janalaa_db
SQL_SSL=false

NODE_ENV=production
ADMIN_FRONTEND_URL=https://admin.janalaa.com
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=61fb1c91a19b595b9e0e767447383afe
R2_ACCESS_KEY_ID=72161e7dfa2d62e802747c593b202772
R2_SECRET_ACCESS_KEY=7c2d65330e9a65c59d624ec20d8c992687a73b73b715a7b1af64346dcfa7ff61
R2_BUCKET_NAME=ayan
R2_ENDPOINT=https://61fb1c91a19b595b9e0e767447383afe.r2.cloudflarestorage.com
JWT_SECRET=a9f4afee3f30d219470c8c43862aad841bd7d43516a8b198adf086052ff56b2f
JWT_REFRESH_SECRET=bd9a0d047c07aa3613f7e59b02def4ce5c7ff23c473b05e6d642a9fa9946cf9d
```

---

## 3. Importing Schema to phpMyAdmin (One-Click)

1. Open your phpMyAdmin: [https://auth-db1403.hstgr.io/index.php?db=u139837875_janalaa_db](https://auth-db1403.hstgr.io/index.php?db=u139837875_janalaa_db)
2. Click on the **SQL** tab at the top.
3. Open `schema_mysql.sql` (or copy from the **Settings &rarr; Hostinger MySQL & phpMyAdmin Hub** in the JANALA Admin panel).
4. Paste the SQL statements and click **Go**.
5. All 15 tables (`users`, `content_items`, `genres`, `people`, `media_assets`, `seasons`, `episodes`, etc.) will be created immediately.

---

## 4. Default Admin Credentials
- **Email**: `ayan.sit@gmail.com`
- **Password**: `Admin@Janala2026!`
- **Role**: `ADMIN`
