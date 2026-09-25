-- ====================================================================
-- JANALA OTT FRESH DATABASE SCHEMA & CLOUDFLARE R2 STREAMING CATALOG
-- Target Databases: janalaa_db / u139837875_janalaa_db
-- Hostinger phpMyAdmin: https://auth-db1403.hstgr.io/index.php?db=u139837875_janalaa_db
-- User: janalaa_admin / u139837875_janalaa_admin
-- Password: JanalaaDbPass@2026
-- Cloudflare R2 Bucket: ayan (Account: 61fb1c91a19b595b9e0e767447383afe)
-- Public CDN Base: https://pub-ee38c54312d840848b29a64fc376234e.r2.dev
-- ====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. DROP EXISTING TABLES FOR CLEAN FRESH INSTALLATION
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `upload_parts`;
DROP TABLE IF EXISTS `upload_sessions`;
DROP TABLE IF EXISTS `subtitles`;
DROP TABLE IF EXISTS `audio_tracks`;
DROP TABLE IF EXISTS `content_cast_crew`;
DROP TABLE IF EXISTS `content_genres`;
DROP TABLE IF EXISTS `episodes`;
DROP TABLE IF EXISTS `seasons`;
DROP TABLE IF EXISTS `media_assets`;
DROP TABLE IF EXISTS `content_items`;
DROP TABLE IF EXISTS `people`;
DROP TABLE IF EXISTS `genres`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `subscription_plans`;

-- 2. USERS TABLE (Admin Authentication & Roles)
CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uid` VARCHAR(255) NOT NULL UNIQUE,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NULL,
    `name` VARCHAR(255) NOT NULL DEFAULT 'Janala Admin User',
    `role` VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
    `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    `avatar_url` TEXT NULL,
    `two_factor_enabled` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_email` (`email`),
    INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. GENRES TABLE
CREATE TABLE `genres` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `slug` VARCHAR(100) NOT NULL UNIQUE,
    `description` TEXT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. PEOPLE TABLE (Cast, Crew, Directors, Producers)
CREATE TABLE `people` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `role` VARCHAR(100) NOT NULL DEFAULT 'ACTOR',
    `photo_url` TEXT NULL,
    `biography` TEXT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_people_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. CONTENT ITEMS TABLE (Movies, Web Series, Metadata & Cloudflare Streaming Links)
CREATE TABLE `content_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `type` VARCHAR(50) NOT NULL DEFAULT 'MOVIE',
    `title` VARCHAR(500) NOT NULL,
    `slug` VARCHAR(255) NOT NULL UNIQUE,
    `short_description` TEXT NULL,
    `full_description` LONGTEXT NULL,
    `release_date` VARCHAR(50) NULL,
    `release_year` INT NULL,
    `duration` INT NULL,
    `language` VARCHAR(100) NOT NULL DEFAULT 'Bengali',
    `country` VARCHAR(100) NOT NULL DEFAULT 'Bangladesh',
    `age_rating` VARCHAR(50) NOT NULL DEFAULT 'U/A 13+',
    `access_type` VARCHAR(50) NOT NULL DEFAULT 'PREMIUM',
    `is_published` TINYINT(1) NOT NULL DEFAULT 1,
    `published_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
    `archived_at` DATETIME NULL,
    `poster_url` TEXT NULL,
    `landscape_url` TEXT NULL,
    `hero_url` TEXT NULL,
    `trailer_url` TEXT NULL,
    `stream_url` TEXT NULL,
    `cdn_playback_url` TEXT NULL,
    `r2_bucket` VARCHAR(100) NOT NULL DEFAULT 'ayan',
    `master_video_status` VARCHAR(50) NOT NULL DEFAULT 'UPLOADED',
    `created_by` VARCHAR(255) NULL DEFAULT 'janalaa_admin',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_content_items_slug` (`slug`),
    INDEX `idx_content_items_type` (`type`),
    INDEX `idx_content_items_published` (`is_published`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. CONTENT <-> GENRES JUNCTION
CREATE TABLE `content_genres` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `content_id` INT NOT NULL,
    `genre_id` INT NOT NULL,
    UNIQUE KEY `uq_content_genre` (`content_id`, `genre_id`),
    CONSTRAINT `fk_cg_content` FOREIGN KEY (`content_id`) REFERENCES `content_items` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_cg_genre` FOREIGN KEY (`genre_id`) REFERENCES `genres` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. CONTENT <-> CAST/CREW JUNCTION
CREATE TABLE `content_cast_crew` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `content_id` INT NOT NULL,
    `person_id` INT NOT NULL,
    `character_name` VARCHAR(255) NULL,
    `role` VARCHAR(100) NOT NULL DEFAULT 'ACTOR',
    CONSTRAINT `fk_cc_content` FOREIGN KEY (`content_id`) REFERENCES `content_items` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_cc_person` FOREIGN KEY (`person_id`) REFERENCES `people` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. MEDIA ASSETS TABLE (Cloudflare R2 Master Objects & Direct CDN URLs)
CREATE TABLE `media_assets` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `content_id` INT NULL,
    `episode_id` INT NULL,
    `asset_type` VARCHAR(50) NOT NULL DEFAULT 'MASTER_VIDEO',
    `storage_provider` VARCHAR(100) NOT NULL DEFAULT 'Cloudflare R2 (Bucket: ayan)',
    `storage_key` TEXT NOT NULL,
    `stream_url` TEXT NULL,
    `cdn_playback_url` TEXT NULL,
    `r2_bucket` VARCHAR(100) NOT NULL DEFAULT 'ayan',
    `original_file_name` VARCHAR(500) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL DEFAULT 'video/mp4',
    `file_size` BIGINT DEFAULT 2450892011,
    `status` VARCHAR(50) NOT NULL DEFAULT 'UPLOADED',
    `etag` VARCHAR(255) NULL,
    `is_current` TINYINT(1) NOT NULL DEFAULT 1,
    `metadata` JSON NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_media_assets_content` (`content_id`),
    CONSTRAINT `fk_media_content` FOREIGN KEY (`content_id`) REFERENCES `content_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. UPLOAD SESSIONS TABLE (Multipart Direct R2 Upload Tracking)
CREATE TABLE `upload_sessions` (
    `id` VARCHAR(255) PRIMARY KEY,
    `media_asset_id` INT NOT NULL,
    `upload_id` TEXT NULL,
    `storage_provider` VARCHAR(50) NOT NULL DEFAULT 'r2',
    `object_key` TEXT NOT NULL,
    `file_name` VARCHAR(500) NOT NULL,
    `file_size` BIGINT NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    `total_parts` INT NOT NULL DEFAULT 10,
    `uploaded_parts_count` INT NOT NULL DEFAULT 10,
    `expires_at` DATETIME NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_upload_media` FOREIGN KEY (`media_asset_id`) REFERENCES `media_assets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. AUDIT LOGS TABLE
CREATE TABLE `audit_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` VARCHAR(100) NULL DEFAULT '1',
    `user_email` VARCHAR(255) NULL,
    `action` VARCHAR(100) NOT NULL,
    `resource` VARCHAR(100) NOT NULL,
    `resource_id` VARCHAR(255) NULL,
    `details` JSON NULL,
    `ip_address` VARCHAR(100) NULL DEFAULT '127.0.0.1',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_audit_logs_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- SEED DEFAULT ADMIN USERS, GENRES, PEOPLE & CLOUDFLARE R2 MOVIES
-- ====================================================================

-- 1. Admin Users (Authenticates against Hostinger MySQL users table)
INSERT INTO `users` (`id`, `uid`, `email`, `password_hash`, `name`, `role`, `status`) VALUES
(1, 'usr_ayan_001', 'ayan.sit@gmail.com', '$2a$10$wT8Kz/HwQe6C91xK5u5X/OSkPvZcI56hSvy8M2vK1N5pCq17qR2eq', 'Ayan Sit', 'ADMIN', 'ACTIVE'),
(2, 'usr_admin_002', 'admin@janalaa.com', '$2a$10$wT8Kz/HwQe6C91xK5u5X/OSkPvZcI56hSvy8M2vK1N5pCq17qR2eq', 'Janala Super Admin', 'ADMIN', 'ACTIVE');

-- 2. Genres Catalog
INSERT INTO `genres` (`id`, `name`, `slug`, `description`) VALUES
(1, 'Action', 'action', 'High octane stunts, adventures and thrillers'),
(2, 'Drama', 'drama', 'Emotionally rich narrative Bengal storytelling'),
(3, 'Thriller', 'thriller', 'Suspense, mysteries and edge-of-seat twists'),
(4, 'Romance', 'romance', 'Love, human connections and relationships'),
(5, 'Comedy', 'comedy', 'Lighthearted Bengali comedy and satire'),
(6, 'Mystery', 'mystery', 'Enigmatic investigations and detective cases'),
(7, 'Crime', 'crime', 'Underworld, law enforcement and crime drama'),
(8, 'Documentary', 'documentary', 'Real-world exposés, arts and cultural history');

-- 3. People Catalog
INSERT INTO `people` (`id`, `name`, `role`, `photo_url`) VALUES
(1, 'Dev Adhikari', 'ACTOR', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80'),
(2, 'Prosenjit Chatterjee', 'ACTOR', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80'),
(3, 'Parambrata Chattopadhyay', 'ACTOR', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80'),
(4, 'Srijit Mukherji', 'DIRECTOR', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80'),
(5, 'Satyajit Ray', 'DIRECTOR', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80');

-- 4. Content Items (All metadata & original Cloudflare R2 links)
INSERT INTO `content_items` (
    `id`, `type`, `title`, `slug`, `short_description`, `full_description`,
    `release_date`, `release_year`, `duration`, `language`, `country`,
    `age_rating`, `access_type`, `is_published`, `master_video_status`,
    `poster_url`, `landscape_url`, `hero_url`, `trailer_url`,
    `stream_url`, `cdn_playback_url`, `r2_bucket`, `created_by`
) VALUES
(
    1, 'MOVIE', 'Chander Pahar', 'chander-pahar',
    'Shankar embarks on a dangerous treasure quest through the African wilderness.',
    'Based on the timeless adventure classic by Bibhutibhushan Bandyopadhyay. Follow Shankar Roy Chowdhury through African deserts and volcanic mountains in search of the legendary Mountain of the Moon.',
    '2023-12-20', 2023, 148, 'Bengali', 'India',
    'U/A 13+', 'PREMIUM', 1, 'UPLOADED',
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1489599849997-425fc5c5553b?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    'https://admin.janalaa.com/api/v1/admin/media/content/1/stream',
    'https://pub-ee38c54312d840848b29a64fc376234e.r2.dev/janala/movies/1/master/chander-pahar-2023-master.mp4',
    'ayan', 'janalaa_admin'
),
(
    2, 'MOVIE', 'Baishe Srabon', 'baishe-srabon',
    'A serial killer targets Kolkata with Bengali poetry clues while two officers investigate.',
    'A dark psychological thriller following ex-cop Prabir Roy Chowdhury and ACP Abhijit Pakrashi as they race to stop a poet killer haunting Kolkata streets.',
    '2021-10-01', 2021, 140, 'Bengali', 'India',
    'A 18+', 'PREMIUM', 1, 'UPLOADED',
    'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    'https://admin.janalaa.com/api/v1/admin/media/content/2/stream',
    'https://pub-ee38c54312d840848b29a64fc376234e.r2.dev/janala/movies/2/master/baishe-srabon-remastered.mp4',
    'ayan', 'janalaa_admin'
),
(
    3, 'MOVIE', 'Pather Panchali', 'pather-panchali',
    'Satyajit Ray masterpiece depicting young Apu and his sister Durga in rural Bengal.',
    'The iconic first installment of the Apu Trilogy. A breathtaking exploration of childhood, poverty, resilience, and beauty in 1920s rural Nischindipur.',
    '1955-08-26', 1955, 125, 'Bengali', 'India',
    'U', 'FREE', 1, 'UPLOADED',
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    'https://admin.janalaa.com/api/v1/admin/media/content/3/stream',
    'https://pub-ee38c54312d840848b29a64fc376234e.r2.dev/janala/movies/3/master/pather-panchali-4k.mp4',
    'ayan', 'janalaa_admin'
),
(
    4, 'MOVIE', 'Apur Sansar', 'apur-sansar',
    'Apu navigates adulthood, marriage, and fatherhood in classical cinema history.',
    'The final masterpiece of the Apu Trilogy starring Soumitra Chatterjee and Sharmila Tagore. A story of young love, devastating tragedy, and ultimate redemption.',
    '1959-05-01', 1959, 105, 'Bengali', 'India',
    'U', 'PREMIUM', 1, 'UPLOADED',
    'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    'https://admin.janalaa.com/api/v1/admin/media/content/4/stream',
    'https://pub-ee38c54312d840848b29a64fc376234e.r2.dev/janala/movies/4/master/apur-sansar-master.mp4',
    'ayan', 'janalaa_admin'
);

-- 5. Media Assets (Cloudflare R2 Storage Keys & Direct CDN Links)
INSERT INTO `media_assets` (
    `id`, `content_id`, `asset_type`, `storage_provider`, `storage_key`,
    `stream_url`, `cdn_playback_url`, `r2_bucket`, `original_file_name`,
    `mime_type`, `file_size`, `status`, `is_current`
) VALUES
(
    1, 1, 'MASTER_VIDEO', 'Cloudflare R2 (Bucket: ayan)',
    'janala/movies/1/master/chander-pahar-2023-master.mp4',
    'https://admin.janalaa.com/api/v1/admin/media/content/1/stream',
    'https://pub-ee38c54312d840848b29a64fc376234e.r2.dev/janala/movies/1/master/chander-pahar-2023-master.mp4',
    'ayan', 'chander-pahar-2023-master.mp4', 'video/mp4', 2450892011, 'UPLOADED', 1
),
(
    2, 2, 'MASTER_VIDEO', 'Cloudflare R2 (Bucket: ayan)',
    'janala/movies/2/master/baishe-srabon-remastered.mp4',
    'https://admin.janalaa.com/api/v1/admin/media/content/2/stream',
    'https://pub-ee38c54312d840848b29a64fc376234e.r2.dev/janala/movies/2/master/baishe-srabon-remastered.mp4',
    'ayan', 'baishe-srabon-remastered.mp4', 'video/mp4', 2189038200, 'UPLOADED', 1
),
(
    3, 3, 'MASTER_VIDEO', 'Cloudflare R2 (Bucket: ayan)',
    'janala/movies/3/master/pather-panchali-4k.mp4',
    'https://admin.janalaa.com/api/v1/admin/media/content/3/stream',
    'https://pub-ee38c54312d840848b29a64fc376234e.r2.dev/janala/movies/3/master/pather-panchali-4k.mp4',
    'ayan', 'pather-panchali-4k.mp4', 'video/mp4', 3189038200, 'UPLOADED', 1
),
(
    4, 4, 'MASTER_VIDEO', 'Cloudflare R2 (Bucket: ayan)',
    'janala/movies/4/master/apur-sansar-master.mp4',
    'https://admin.janalaa.com/api/v1/admin/media/content/4/stream',
    'https://pub-ee38c54312d840848b29a64fc376234e.r2.dev/janala/movies/4/master/apur-sansar-master.mp4',
    'ayan', 'apur-sansar-master.mp4', 'video/mp4', 1989038200, 'UPLOADED', 1
);

-- 6. Content <-> Genres Junction
INSERT INTO `content_genres` (`content_id`, `genre_id`) VALUES
(1, 1), (1, 2),
(2, 3), (2, 7),
(3, 2),
(4, 2), (4, 4);

-- 7. Content <-> Cast Crew Junction
INSERT INTO `content_cast_crew` (`content_id`, `person_id`, `character_name`, `role`) VALUES
(1, 1, 'Shankar Roy Chowdhury', 'ACTOR'),
(2, 2, 'Prabir Roy Chowdhury', 'ACTOR'),
(2, 3, 'ACP Abhijit Pakrashi', 'ACTOR'),
(2, 4, 'Director', 'DIRECTOR'),
(3, 5, 'Director', 'DIRECTOR'),
(4, 5, 'Director', 'DIRECTOR');

SET FOREIGN_KEY_CHECKS = 1;
