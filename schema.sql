-- =============================================================================
-- JANALA OTT (জানালা) Database Schema & Initial Seed
-- Database: PostgreSQL (Hostinger / Neon / Supabase / AWS RDS)
-- Storage: Single Cloudflare R2 Bucket (ayan) for Video Storage & Streaming
-- =============================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. USERS & ADMIN ACCOUNTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL DEFAULT 'Janala Admin User',
    role VARCHAR(50) NOT NULL DEFAULT 'ADMIN', -- 'ADMIN', 'CONTENT_MANAGER', 'FINANCE_MANAGER', 'USER'
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUSPENDED', 'PENDING'
    avatar_url TEXT,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 2. GENRES TABLE (Movie & Series Categories)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS genres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 3. PEOPLE TABLE (Cast, Crew, Directors, Producers)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS people (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'ACTOR', -- 'ACTOR', 'DIRECTOR', 'PRODUCER', 'WRITER', 'CINEMATOGRAPHER', 'MUSIC_DIRECTOR'
    photo_url TEXT,
    biography TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 4. CONTENT ITEMS TABLE (Movies, Web Series, TV Shows, Documentaries)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_items (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL DEFAULT 'MOVIE', -- 'MOVIE', 'WEB_SERIES', 'TV_SHOW', 'SHORT_FILM', 'DOCUMENTARY'
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    short_description TEXT,
    full_description TEXT,
    release_date VARCHAR(50),
    release_year INTEGER,
    duration INTEGER, -- duration in minutes
    language VARCHAR(100) NOT NULL DEFAULT 'Bengali',
    country VARCHAR(100) NOT NULL DEFAULT 'Bangladesh',
    age_rating VARCHAR(50) NOT NULL DEFAULT 'U/A 13+', -- 'U', 'U/A 7+', 'U/A 13+', 'U/A 16+', 'A'
    access_type VARCHAR(50) NOT NULL DEFAULT 'PREMIUM', -- 'FREE', 'PREMIUM'
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMP WITH TIME ZONE,
    poster_url TEXT,
    landscape_url TEXT,
    hero_url TEXT,
    trailer_url TEXT,
    master_video_status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED', -- 'NOT_STARTED', 'UPLOADING', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED'
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 5. CONTENT <-> GENRES (Many-to-Many Junction)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_genres (
    id SERIAL PRIMARY KEY,
    content_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    CONSTRAINT uq_content_genre UNIQUE (content_id, genre_id)
);

-- -----------------------------------------------------------------------------
-- 6. CONTENT <-> CAST/CREW (Many-to-Many Junction)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_cast_crew (
    id SERIAL PRIMARY KEY,
    content_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    character_name VARCHAR(255),
    role VARCHAR(100) NOT NULL DEFAULT 'ACTOR'
);

-- -----------------------------------------------------------------------------
-- 7. SEASONS TABLE (For Web Series and TV Shows)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 8. EPISODES TABLE (For Web Series Episodes)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS episodes (
    id SERIAL PRIMARY KEY,
    season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    overview TEXT,
    duration INTEGER, -- duration in minutes
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    master_video_status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 9. MEDIA ASSETS TABLE (Single Cloudflare R2 Bucket: 'ayan')
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_assets (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES content_items(id) ON DELETE SET NULL,
    episode_id INTEGER REFERENCES episodes(id) ON DELETE SET NULL,
    asset_type VARCHAR(50) NOT NULL, -- 'MASTER_VIDEO', 'TRAILER', 'POSTER', 'LANDSCAPE', 'HERO', 'SUBTITLE', 'AUDIO'
    storage_provider VARCHAR(50) NOT NULL DEFAULT 'r2',
    storage_key TEXT NOT NULL, -- S3 object key inside 'ayan' bucket (e.g. 'videos/movies/123/master.mp4')
    original_file_name VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size NUMERIC DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'READY', -- 'NOT_STARTED', 'UPLOADING', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED'
    etag VARCHAR(255),
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 10. MULTIPART UPLOAD SESSIONS (Direct-to-R2 Uploading)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS upload_sessions (
    id VARCHAR(255) PRIMARY KEY,
    media_asset_id INTEGER NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    upload_id TEXT, -- Cloudflare R2 multipart upload ID
    storage_provider VARCHAR(50) NOT NULL DEFAULT 'r2',
    object_key TEXT NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_size NUMERIC NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'UPLOADING', -- 'UPLOADING', 'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED'
    total_parts INTEGER NOT NULL DEFAULT 1,
    uploaded_parts_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 11. SUBTITLES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subtitles (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
    episode_id INTEGER REFERENCES episodes(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL, -- 'bn', 'en', 'hi', etc.
    language_label VARCHAR(100) NOT NULL, -- 'Bengali', 'English', etc.
    format VARCHAR(20) NOT NULL DEFAULT 'vtt', -- 'vtt', 'srt'
    storage_key TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 12. SUBSCRIPTION PLANS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    price NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
    billing_period VARCHAR(50) NOT NULL DEFAULT 'MONTHLY', -- 'MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME'
    features JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 13. COMPLIANCE & RESERVED TERMS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS terms (
    id SERIAL PRIMARY KEY,
    term VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL DEFAULT 'RESERVED', -- 'RESERVED', 'PROHIBITED', 'SYSTEM'
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 14. AUDIT & ACTIVITY LOGS TABLE
-- -----------------------------------------------------------------------------
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

-- =============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_content_items_slug ON content_items(slug);
CREATE INDEX IF NOT EXISTS idx_content_items_type ON content_items(type);
CREATE INDEX IF NOT EXISTS idx_content_items_published ON content_items(is_published);
CREATE INDEX IF NOT EXISTS idx_media_assets_content_id ON media_assets(content_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_storage_key ON media_assets(storage_key);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_genres_slug ON genres(slug);

-- =============================================================================
-- INITIAL SEED DATA
-- =============================================================================

-- 1. Default Admin Users (Password: Admin@Janala2026!)
INSERT INTO users (uid, email, password_hash, name, role, status, avatar_url)
VALUES 
    ('user_admin_001', 'ayan.sit@gmail.com', '$2a$10$wTfZ0jV86XfQ1w4mYp06b.d3u5W5k9U0NnIe2x7x8e3x.Y3y5m8uC', 'Ayan Sit', 'ADMIN', 'ACTIVE', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
    ('user_admin_002', 'admin@janala.local', '$2a$10$wTfZ0jV86XfQ1w4mYp06b.d3u5W5k9U0NnIe2x7x8e3x.Y3y5m8uC', 'Super Admin', 'ADMIN', 'ACTIVE', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80')
ON CONFLICT (email) DO NOTHING;

-- 2. Movie & OTT Genres
INSERT INTO genres (name, slug, description)
VALUES 
    ('Action', 'action', 'High energy cinematic action, thrill, and combat sequences'),
    ('Drama', 'drama', 'Compelling emotional narratives, family stories, and human struggles'),
    ('Thriller', 'thriller', 'Suspenseful, noir, and psychological edge-of-seat thrillers'),
    ('Romance', 'romance', 'Poetic, soulful romantic films and series'),
    ('Comedy', 'comedy', 'Lighthearted humor, situational comedy, and social satire'),
    ('Sci-Fi', 'sci-fi', 'Futuristic speculative fiction, space, and tech thrillers'),
    ('Documentary', 'documentary', 'Biographical, investigative, and cultural heritage documentaries'),
    ('Short Films', 'short-films', 'Artisanal short form cinematic storytelling'),
    ('Animation', 'animation', 'Illustrated visual art and family animated stories'),
    ('Mystery', 'mystery', 'Detective investigations, crime puzzles, and unsolved cases'),
    ('Heritage Classics', 'heritage-classics', 'Restored vintage cinema and timeless Bengali classics'),
    ('Horror', 'horror', 'Supernatural folklore, psychological terror, and suspense')
ON CONFLICT (name) DO NOTHING;

-- 3. Renowned Cast & Directors
INSERT INTO people (name, role, biography, photo_url)
VALUES 
    ('Tareque Masud', 'DIRECTOR', 'Acclaimed director known for poetic realism and national cinema.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'),
    ('Chanchal Chowdhury', 'ACTOR', 'Versatile lead actor celebrated for intense theatrical and screen roles.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'),
    ('Jaya Ahsan', 'ACTOR', 'Internationally recognized award-winning actress.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
    ('Mostofa Sarwar Farooki', 'DIRECTOR', 'Pioneering filmmaker shaping modern South Asian storytelling.', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80')
ON CONFLICT DO NOTHING;

-- 4. Initial Sample Movies (Stored & Streamed via Cloudflare R2 'ayan' bucket)
INSERT INTO content_items (
    type, title, slug, short_description, full_description, 
    release_date, release_year, duration, language, country, 
    age_rating, access_type, is_published, master_video_status,
    poster_url, landscape_url, hero_url, trailer_url
)
VALUES 
    (
        'MOVIE',
        'Nodir Opare (Beyond The River)',
        'nodir-opare',
        'An evocative journey of a riverboat captain navigating changing tides and ancient folklore.',
        'Set along the misty banks of the Padma, a veteran boatman takes on one final voyage across uncharted waters, uncovering deep family secrets and a lost musical heirloom.',
        '2024-11-15', 2024, 128, 'Bengali', 'Bangladesh',
        'U/A 13+', 'PREMIUM', TRUE, 'READY',
        'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&auto=format&fit=crop&q=80',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    ),
    (
        'MOVIE',
        'Dhaka Midnight Express',
        'dhaka-midnight-express',
        'A high-octane psychological thriller through the neon-soaked backstreets of Old Dhaka.',
        'When an undercover investigator intercepts an encrypted briefcase on the midnight express train, he finds himself trapped in a deadly cat-and-mouse chase across the metropolis.',
        '2025-01-20', 2025, 114, 'Bengali', 'Bangladesh',
        'U/A 16+', 'PREMIUM', TRUE, 'READY',
        'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1920&auto=format&fit=crop&q=80',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    )
ON CONFLICT (slug) DO NOTHING;

-- 5. Link Movies to Cloudflare R2 Media Assets ('ayan' bucket)
INSERT INTO media_assets (
    content_id, asset_type, storage_provider, storage_key, 
    original_file_name, mime_type, file_size, status, is_current
)
SELECT 
    id, 'MASTER_VIDEO', 'r2', 'videos/movies/' || slug || '/master_1080p.mp4',
    slug || '_master_1080p.mp4', 'video/mp4', 4294967296, 'READY', TRUE
FROM content_items
WHERE slug IN ('nodir-opare', 'dhaka-midnight-express')
ON CONFLICT DO NOTHING;

-- 6. Link Sample Movies to Genres
INSERT INTO content_genres (content_id, genre_id)
SELECT c.id, g.id
FROM content_items c, genres g
WHERE c.slug = 'nodir-opare' AND g.slug IN ('drama', 'heritage-classics')
ON CONFLICT DO NOTHING;

INSERT INTO content_genres (content_id, genre_id)
SELECT c.id, g.id
FROM content_items c, genres g
WHERE c.slug = 'dhaka-midnight-express' AND g.slug IN ('thriller', 'action')
ON CONFLICT DO NOTHING;

-- 7. Reserved System Terms
INSERT INTO terms (term, type, reason)
VALUES 
    ('admin', 'RESERVED', 'Reserved for system administration routes'),
    ('login', 'RESERVED', 'Reserved authentication page URL'),
    ('api', 'RESERVED', 'Reserved REST backend prefix'),
    ('stream', 'RESERVED', 'Reserved CDN streaming gateway URL'),
    ('billing', 'RESERVED', 'Reserved subscription checkout URL'),
    ('abuse', 'PROHIBITED', 'Prohibited illegal or violating keyword'),
    ('malware', 'PROHIBITED', 'Security restricted keyword')
ON CONFLICT (term) DO NOTHING;
