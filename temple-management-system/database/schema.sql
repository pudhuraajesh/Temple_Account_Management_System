-- Temple Management System Database Schema
-- Compatible with MySQL 5.7+ / MySQL 8.0+ / MariaDB / TiDB / Aiven

CREATE DATABASE IF NOT EXISTS `temple_db`;
USE `temple_db`;

-- 1. Financial Years Table
CREATE TABLE IF NOT EXISTS `financial_years` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `mobile` VARCHAR(50) NOT NULL,
    `financial_year` VARCHAR(50) NOT NULL,
    `is_selected` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Current Balance Table
CREATE TABLE IF NOT EXISTS `current_balance` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `financial_year_id` INT NOT NULL,
    `financial_year` VARCHAR(50) NOT NULL,
    `initial_balance` DECIMAL(15,2) DEFAULT 0.00,
    `amount` DECIMAL(15,2) DEFAULT 0.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Income Table (Donations / Receipts)
CREATE TABLE IF NOT EXISTS `income` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `financial_year_id` INT NOT NULL,
    `financial_year` VARCHAR(50) NOT NULL,
    `receipt_no` VARCHAR(100) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `place` VARCHAR(255) DEFAULT '',
    `mobile` VARCHAR(50) DEFAULT '',
    `type` VARCHAR(100) NOT NULL,
    `amount` DECIMAL(15,2) NOT NULL,
    `payment_method` VARCHAR(50) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Other Income Table
CREATE TABLE IF NOT EXISTS `other_income` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `financial_year_id` INT NOT NULL,
    `financial_year` VARCHAR(50) NOT NULL,
    `details` TEXT,
    `name` VARCHAR(255) DEFAULT '',
    `mobile` VARCHAR(50) DEFAULT '',
    `amount` DECIMAL(15,2) NOT NULL,
    `payment_method` VARCHAR(50) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Expenses Table
CREATE TABLE IF NOT EXISTS `expenses` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `financial_year_id` INT NOT NULL,
    `financial_year` VARCHAR(50) NOT NULL,
    `details` TEXT,
    `expense_type` VARCHAR(100) NOT NULL,
    `amount` DECIMAL(15,2) NOT NULL,
    `payment_method` VARCHAR(50) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Other Expenses Table
CREATE TABLE IF NOT EXISTS `other_expenses` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `financial_year_id` INT NOT NULL,
    `financial_year` VARCHAR(50) NOT NULL,
    `details` TEXT,
    `amount` DECIMAL(15,2) NOT NULL,
    `payment_method` VARCHAR(50) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
