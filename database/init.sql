-- =========================================================
-- FSSIMS - Database Initialization
-- Database: db_2026_fssims
--
-- File này tự động chạy khi container MySQL khởi tạo lần đầu
-- (mount vào /docker-entrypoint-initdb.d)
-- =========================================================

CREATE DATABASE IF NOT EXISTS db_2026_fssims
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE db_2026_fssims;


-- =========================================================
-- 1. user_role
-- =========================================================
CREATE TABLE IF NOT EXISTS user_role (
    role_id      BIGINT       NOT NULL AUTO_INCREMENT,
    role_code    VARCHAR(50)  NOT NULL,
    role_name    VARCHAR(100) NOT NULL,
    description  VARCHAR(255) NULL,
    createdate   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate  DATETIME     NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby     VARCHAR(100) NULL,
    modifieby    VARCHAR(100) NULL,
    PRIMARY KEY (role_id),
    UNIQUE KEY uk_user_role_role_code (role_code)
) ENGINE = InnoDB;


-- =========================================================
-- 2. user_account
-- =========================================================
CREATE TABLE IF NOT EXISTS user_account (
    user_account_id BIGINT       NOT NULL AUTO_INCREMENT,
    role_id         BIGINT       NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    full_name       VARCHAR(150) NOT NULL,
    phone_number    VARCHAR(20)  NOT NULL,
    dob             DATE         NULL,
    gender          VARCHAR(10)  NULL,
    address         VARCHAR(255) NULL,
    avatar_url      VARCHAR(255) NULL,
    note            VARCHAR(255) NULL,
    createdate      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate     DATETIME     NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby        VARCHAR(100) NULL,
    modifieby       VARCHAR(100) NULL,
    PRIMARY KEY (user_account_id),
    UNIQUE KEY uk_user_account_email (email),
    KEY idx_user_account_role_id (role_id),
    CONSTRAINT fk_user_account_role
        FOREIGN KEY (role_id)
        REFERENCES user_role (role_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE = InnoDB;


-- =========================================================
-- 3. refresh_token
-- =========================================================
CREATE TABLE IF NOT EXISTS refresh_token (
    refresh_token_id BIGINT       NOT NULL AUTO_INCREMENT,
    user_account_id  BIGINT       NOT NULL,
    token            VARCHAR(512) NOT NULL,
    expires_at       DATETIME     NOT NULL,
    createdate       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate      DATETIME     NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby         VARCHAR(100) NULL,
    modifieby        VARCHAR(100) NULL,
    PRIMARY KEY (refresh_token_id),
    UNIQUE KEY uk_refresh_token_token (token),
    KEY idx_refresh_token_account (user_account_id),
    KEY idx_refresh_token_expires_at (expires_at),
    CONSTRAINT fk_refresh_token_account
        FOREIGN KEY (user_account_id)
        REFERENCES user_account (user_account_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE = InnoDB;


-- =========================================================
-- 4. Initial Data - user_role
-- =========================================================

INSERT INTO user_role (
    role_code,
    role_name,
    description
)
VALUES
    ('OWNER', 'Owner', 'Store owner'),
    ('SALES', 'Sales', 'Sales employee'),
    ('ACCOUNTANT', 'Accountant', 'Accounting employee'),
    ('LEADERSTAFF', 'LeaderStaff', 'Team leader'),
    ('CUSTOMER', 'Customer', 'Customer account')
ON DUPLICATE KEY UPDATE
    role_name = VALUES(role_name),
    description = VALUES(description);