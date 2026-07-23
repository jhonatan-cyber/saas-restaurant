-- CreateTable: SaaS platform users (separados de business users)
CREATE TABLE `saas_users` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `email` VARCHAR(80) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `role` ENUM('SUPER_ADMIN', 'SUPPORT', 'BILLING') NOT NULL DEFAULT 'SUPER_ADMIN',
    `status` ENUM('ACTIVE', 'INVITED', 'SUSPENDED', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
    `lastLoginAt` DATETIME(3) NULL,

    UNIQUE INDEX `saas_users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterEnum: Remove SUPER_ADMIN from business users role
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('OWNER', 'ADMIN', 'CAJERO', 'MESERO', 'COCINA', 'REPARTIDOR') NOT NULL DEFAULT 'CAJERO';
