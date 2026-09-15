-- ==========================================================
-- REHANSHI DATABASE UPDATE SCRIPT (LATEST)
-- Run this directly in phpMyAdmin / MySQL CLI
-- ==========================================================

-- 1. Add banner_media column to service_packages (Yesterday's Change)
ALTER TABLE service_packages 
ADD COLUMN IF NOT EXISTS anner_media TEXT NULL AFTER 
ame;

-- 2. Create login_logs table (If not exists)
CREATE TABLE IF NOT EXISTS login_logs (
  id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  user_type varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  user_id bigint(20) UNSIGNED NOT NULL,
  user_name varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  email varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  phone varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ole varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ip_address varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  user_agent text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  device_name varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  device_id varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  platform varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  cm_token text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  pns_token text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  latitude decimal(10,7) DEFAULT NULL,
  longitude decimal(10,7) DEFAULT NULL,
  location_name varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  status varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Success',
  is_blocked tinyint(1) NOT NULL DEFAULT 0,
  metadata json DEFAULT NULL,
  created_at timestamp NULL DEFAULT NULL,
  updated_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY login_logs_user_type_user_id_index (user_type,user_id),
  KEY login_logs_is_blocked_index (is_blocked),
  KEY login_logs_created_at_index (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create testimonials table (If not exists)
CREATE TABLE IF NOT EXISTS 	estimonials (
  id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  
ame varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  ole varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  vatar text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ating decimal(3,2) NOT NULL DEFAULT 5.00,
  eview text COLLATE utf8mb4_unicode_ci NOT NULL,
  location varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  status varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  sort_order int(11) NOT NULL DEFAULT 0,
  metadata json DEFAULT NULL,
  created_at timestamp NULL DEFAULT NULL,
  updated_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create notification_deliveries table (If not exists)
CREATE TABLE IF NOT EXISTS 
otification_deliveries (
  id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  
otification_id bigint(20) UNSIGNED DEFAULT NULL,
  ecipient_type varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  ecipient_id bigint(20) UNSIGNED NOT NULL,
  device_token text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  channel varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fcm',
  status varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sent',
  error_message text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  metadata json DEFAULT NULL,
  created_at timestamp NULL DEFAULT NULL,
  updated_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY 
otification_deliveries_recipient_index (ecipient_type,ecipient_id),
  KEY 
otification_deliveries_status_index (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
