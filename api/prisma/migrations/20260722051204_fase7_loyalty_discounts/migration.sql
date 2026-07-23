-- AlterTable
ALTER TABLE `customers` ADD COLUMN `loyaltyPoints` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `loyaltyPointsEarned` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `discount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `discountReason` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `loyalty_programs` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `businessId` VARCHAR(80) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `pointsPerCurrency` DECIMAL(10, 2) NOT NULL DEFAULT 10,
    `pointValue` DECIMAL(10, 2) NOT NULL DEFAULT 0.50,
    `minRedeemPoints` INTEGER NOT NULL DEFAULT 10,
    `maxRedeemPerOrder` INTEGER NULL,
    `autoAward` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `loyalty_programs_businessId_key`(`businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loyalty_redemptions` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `businessId` VARCHAR(80) NOT NULL,
    `customerId` VARCHAR(80) NOT NULL,
    `orderId` VARCHAR(80) NOT NULL,
    `pointsUsed` INTEGER NOT NULL,
    `discountAmount` DECIMAL(14, 2) NOT NULL,
    `notes` VARCHAR(191) NULL,

    INDEX `loyalty_redemptions_customerId_createdAt_idx`(`customerId`, `createdAt`),
    INDEX `loyalty_redemptions_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `customers_businessId_loyaltyPoints_idx` ON `customers`(`businessId`, `loyaltyPoints`);

-- AddForeignKey
ALTER TABLE `loyalty_programs` ADD CONSTRAINT `loyalty_programs_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loyalty_redemptions` ADD CONSTRAINT `loyalty_redemptions_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loyalty_redemptions` ADD CONSTRAINT `loyalty_redemptions_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loyalty_redemptions` ADD CONSTRAINT `loyalty_redemptions_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
