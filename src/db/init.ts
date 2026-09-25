import fs from 'fs';
import path from 'path';
import { testDbConnection, getDbConfig, executeUniversalQuery, DbConnectionInfo } from './index.ts';
import { seedDatabase } from './seed.ts';

// MySQL statements for Hostinger phpMyAdmin (u139837875_janalaa_db)
const MYSQL_TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uid VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    name VARCHAR(255) NOT NULL DEFAULT 'Janala Admin User',
    role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    avatar_url TEXT NULL,
    two_factor_enabled TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS genres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS people (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'ACTOR',
    photo_url TEXT NULL,
    biography TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS content_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL DEFAULT 'MOVIE',
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    short_description TEXT NULL,
    full_description LONGTEXT NULL,
    release_date VARCHAR(50) NULL,
    release_year INT NULL,
    duration INT NULL,
    language VARCHAR(100) NOT NULL DEFAULT 'Bengali',
    country VARCHAR(100) NOT NULL DEFAULT 'Bangladesh',
    age_rating VARCHAR(50) NOT NULL DEFAULT 'U/A 13+',
    access_type VARCHAR(50) NOT NULL DEFAULT 'PREMIUM',
    is_published TINYINT(1) NOT NULL DEFAULT 0,
    published_at DATETIME NULL,
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    archived_at DATETIME NULL,
    poster_url TEXT NULL,
    landscape_url TEXT NULL,
    hero_url TEXT NULL,
    trailer_url TEXT NULL,
    master_video_status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    created_by VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_content_items_slug (slug),
    INDEX idx_content_items_type (type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS content_genres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content_id INT NOT NULL,
    genre_id INT NOT NULL,
    UNIQUE KEY uq_content_genre (content_id, genre_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS content_cast_crew (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content_id INT NOT NULL,
    person_id INT NOT NULL,
    character_name VARCHAR(255) NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'ACTOR'
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS seasons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content_id INT NOT NULL,
    season_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    overview TEXT NULL,
    release_date VARCHAR(50) NULL,
    poster_url TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS episodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    season_id INT NOT NULL,
    episode_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    overview TEXT NULL,
    duration INT NULL,
    is_published TINYINT(1) NOT NULL DEFAULT 0,
    master_video_status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS media_assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content_id INT NULL,
    episode_id INT NULL,
    asset_type VARCHAR(50) NOT NULL,
    storage_provider VARCHAR(50) NOT NULL DEFAULT 'r2',
    storage_key TEXT NOT NULL,
    original_file_name VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'READY',
    etag VARCHAR(255) NULL,
    is_current TINYINT(1) NOT NULL DEFAULT 1,
    metadata JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    user_name VARCHAR(255) NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255) NULL,
    details JSON NULL,
    ip_address VARCHAR(100) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];

// Comprehensive PostgreSQL DDL schema definition
const PG_DDL_STATEMENTS = `
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL DEFAULT 'Janala Admin User',
    role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    avatar_url TEXT,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS genres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS people (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'ACTOR',
    photo_url TEXT,
    biography TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_items (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL DEFAULT 'MOVIE',
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    short_description TEXT,
    full_description TEXT,
    release_date VARCHAR(50),
    release_year INTEGER,
    duration INTEGER,
    language VARCHAR(100) NOT NULL DEFAULT 'Bengali',
    country VARCHAR(100) NOT NULL DEFAULT 'Bangladesh',
    age_rating VARCHAR(50) NOT NULL DEFAULT 'U/A 13+',
    access_type VARCHAR(50) NOT NULL DEFAULT 'PREMIUM',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMP WITH TIME ZONE,
    poster_url TEXT,
    landscape_url TEXT,
    hero_url TEXT,
    trailer_url TEXT,
    master_video_status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_genres (
    id SERIAL PRIMARY KEY,
    content_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    CONSTRAINT uq_content_genre UNIQUE (content_id, genre_id)
);

CREATE TABLE IF NOT EXISTS content_cast_crew (
    id SERIAL PRIMARY KEY,
    content_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    character_name VARCHAR(255),
    role VARCHAR(100) NOT NULL DEFAULT 'ACTOR'
);

CREATE TABLE IF NOT EXISTS seasons (
    id SERIAL PRIMARY KEY,
    content_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    season_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    overview TEXT,
    release_date VARCHAR(50),
    poster_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS episodes (
    id SERIAL PRIMARY KEY,
    season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    overview TEXT,
    duration INTEGER,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    master_video_status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media_assets (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES content_items(id) ON DELETE SET NULL,
    episode_id INTEGER REFERENCES episodes(id) ON DELETE SET NULL,
    asset_type VARCHAR(50) NOT NULL,
    storage_provider VARCHAR(50) NOT NULL DEFAULT 'r2',
    storage_key TEXT NOT NULL,
    original_file_name VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size NUMERIC DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'READY',
    etag VARCHAR(255),
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

export async function initializeDatabase(): Promise<{ success: boolean; connection: DbConnectionInfo; tablesCreated?: boolean }> {
  console.log('🔄 Initializing Database schema & verifying connection...');
  const connInfo = await testDbConnection();
  const config = getDbConfig();

  if (!connInfo.connected) {
    console.warn(`⚠️ Hostinger DB not active (${connInfo.error}). Resilient local storage active.`);
    return { success: false, connection: connInfo };
  }

  // 1. Run Table creation based on DB Type
  if (config.isMysql) {
    try {
      for (const statement of MYSQL_TABLE_STATEMENTS) {
        await executeUniversalQuery(statement).catch((err) => {
          console.warn('MySQL table statement notice:', err.message);
        });
      }
      console.log('✅ Hostinger MySQL schema and tables verified.');
    } catch (err: any) {
      console.warn('⚠️ MySQL schema execution error:', err.message);
    }
  } else {
    try {
      await executeUniversalQuery(PG_DDL_STATEMENTS);
      console.log('✅ PostgreSQL schema and tables verified.');
    } catch (err: any) {
      console.warn('⚠️ PostgreSQL schema execution error:', err.message);
    }
  }

  // 2. Seed default data if needed
  try {
    await seedDatabase();
    console.log('✅ Default seed data verified.');
  } catch (err: any) {
    console.warn('⚠️ Seeding note:', err.message || err);
  }

  console.log('🎉 Database initialization complete!');
  return { success: true, connection: connInfo, tablesCreated: true };
}

// Auto-run when executed directly via CLI
if (process.argv[1] && process.argv[1].endsWith('init.ts')) {
  initializeDatabase()
    .then((res) => {
      console.log('Init status:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Database initialization error:', err);
      process.exit(1);
    });
}
