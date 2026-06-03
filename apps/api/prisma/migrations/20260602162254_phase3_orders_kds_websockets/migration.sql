-- CreateTable
CREATE TABLE `businesses` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `legalName` VARCHAR(191) NULL,
    `taxId` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'BOB',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'America/La_Paz',
    `status` ENUM('ACTIVE', 'SUSPENDED', 'TRIAL') NOT NULL DEFAULT 'ACTIVE',
    `plan` VARCHAR(191) NOT NULL DEFAULT 'FREE',
    `trialEndsAt` DATETIME(3) NULL,

    UNIQUE INDEX `businesses_slug_key`(`slug`),
    INDEX `businesses_slug_idx`(`slug`),
    INDEX `businesses_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branches` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `isMain` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',

    INDEX `branches_businessId_idx`(`businessId`),
    UNIQUE INDEX `branches_businessId_code_key`(`businessId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `role` ENUM('SUPER_ADMIN', 'OWNER', 'ADMIN', 'CAJERO', 'MESERO', 'COCINA', 'REPARTIDOR') NOT NULL DEFAULT 'CAJERO',
    `status` ENUM('ACTIVE', 'INACTIVE', 'INVITED') NOT NULL DEFAULT 'INVITED',
    `businessId` VARCHAR(191) NOT NULL,
    `defaultBranchId` VARCHAR(191) NULL,
    `lastLoginAt` DATETIME(3) NULL,

    INDEX `users_businessId_role_idx`(`businessId`, `role`),
    INDEX `users_businessId_status_idx`(`businessId`, `status`),
    UNIQUE INDEX `users_businessId_email_key`(`businessId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `categories_businessId_displayOrder_idx`(`businessId`, `displayOrder`),
    INDEX `categories_businessId_isActive_idx`(`businessId`, `isActive`),
    INDEX `categories_businessId_deletedAt_idx`(`businessId`, `deletedAt`),
    UNIQUE INDEX `categories_businessId_branchId_slug_key`(`businessId`, `branchId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `categoryId` VARCHAR(191) NULL,
    `preparationAreaId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `sku` VARCHAR(191) NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `cost` DECIMAL(12, 2) NULL,
    `taxRate` DECIMAL(5, 2) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `minStock` INTEGER NULL,
    `trackStock` BOOLEAN NOT NULL DEFAULT false,
    `productType` ENUM('SALE', 'COMBO', 'ADDON', 'SERVICE', 'INGREDIENT') NOT NULL DEFAULT 'SALE',
    `preparationTimeMin` INTEGER NULL,

    INDEX `products_businessId_categoryId_idx`(`businessId`, `categoryId`),
    INDEX `products_businessId_isActive_idx`(`businessId`, `isActive`),
    INDEX `products_businessId_sku_idx`(`businessId`, `sku`),
    INDEX `products_businessId_productType_idx`(`businessId`, `productType`),
    INDEX `products_businessId_deletedAt_idx`(`businessId`, `deletedAt`),
    UNIQUE INDEX `products_businessId_slug_key`(`businessId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `preparation_areas` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `preparation_areas_businessId_displayOrder_idx`(`businessId`, `displayOrder`),
    INDEX `preparation_areas_businessId_isActive_idx`(`businessId`, `isActive`),
    UNIQUE INDEX `preparation_areas_businessId_branchId_code_key`(`businessId`, `branchId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `restaurant_tables` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `capacity` INTEGER NOT NULL DEFAULT 4,
    `location` ENUM('INDOOR', 'OUTDOOR', 'BAR', 'PATIO', 'TERRACE', 'OTHER') NOT NULL DEFAULT 'INDOOR',
    `status` ENUM('FREE', 'OCCUPIED', 'RESERVED') NOT NULL DEFAULT 'FREE',
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `notes` VARCHAR(191) NULL,
    `posX` INTEGER NULL,
    `posY` INTEGER NULL,

    INDEX `restaurant_tables_businessId_branchId_status_idx`(`businessId`, `branchId`, `status`),
    INDEX `restaurant_tables_branchId_displayOrder_idx`(`branchId`, `displayOrder`),
    INDEX `restaurant_tables_businessId_deletedAt_idx`(`businessId`, `deletedAt`),
    UNIQUE INDEX `restaurant_tables_businessId_branchId_number_key`(`businessId`, `branchId`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `table_state_logs` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `businessId` VARCHAR(191) NOT NULL,
    `tableId` VARCHAR(191) NOT NULL,
    `previousStatus` ENUM('FREE', 'OCCUPIED', 'RESERVED') NOT NULL,
    `newStatus` ENUM('FREE', 'OCCUPIED', 'RESERVED') NOT NULL,
    `changedByUserId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,

    INDEX `table_state_logs_tableId_createdAt_idx`(`tableId`, `createdAt`),
    INDEX `table_state_logs_businessId_createdAt_idx`(`businessId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `taxId` VARCHAR(191) NULL,
    `taxIdType` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `addressReference` VARCHAR(191) NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `notes` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `totalOrders` INTEGER NOT NULL DEFAULT 0,
    `totalSpent` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `lastOrderAt` DATETIME(3) NULL,

    INDEX `customers_businessId_isActive_idx`(`businessId`, `isActive`),
    INDEX `customers_businessId_name_idx`(`businessId`, `name`),
    INDEX `customers_businessId_taxId_idx`(`businessId`, `taxId`),
    INDEX `customers_businessId_deletedAt_idx`(`businessId`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `tableId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NULL,
    `cashierId` VARCHAR(191) NOT NULL,
    `waiterId` VARCHAR(191) NULL,
    `type` ENUM('DINE_IN', 'TAKEOUT', 'DELIVERY') NOT NULL DEFAULT 'DINE_IN',
    `channel` ENUM('POS_WEB', 'POS_DESKTOP', 'MOBILE', 'KIOSK', 'ADMIN') NOT NULL DEFAULT 'POS_WEB',
    `status` ENUM('DRAFT', 'PENDING', 'SENT_TO_KITCHEN', 'IN_PREPARATION', 'READY', 'DELIVERED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `subtotal` DECIMAL(14, 2) NOT NULL,
    `taxTotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL,
    `globalNotes` VARCHAR(191) NULL,
    `cashRegisterId` VARCHAR(191) NULL,
    `shiftId` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `cancelledAt` DATETIME(3) NULL,
    `cancelledByUserId` VARCHAR(191) NULL,
    `cancellationReason` VARCHAR(191) NULL,

    INDEX `orders_businessId_branchId_status_idx`(`businessId`, `branchId`, `status`),
    INDEX `orders_businessId_branchId_tableId_status_idx`(`businessId`, `branchId`, `tableId`, `status`),
    INDEX `orders_businessId_createdAt_idx`(`businessId`, `createdAt`),
    INDEX `orders_businessId_branchId_createdAt_idx`(`businessId`, `branchId`, `createdAt`),
    INDEX `orders_businessId_cashierId_createdAt_idx`(`businessId`, `cashierId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `businessId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `productName` VARCHAR(191) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `taxRate` DECIMAL(5, 2) NULL,
    `preparationAreaId` VARCHAR(191) NULL,
    `preparationAreaName` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL,
    `notes` VARCHAR(191) NULL,
    `lineTotal` DECIMAL(14, 2) NOT NULL,

    INDEX `order_items_businessId_orderId_idx`(`businessId`, `orderId`),
    INDEX `order_items_businessId_preparationAreaId_idx`(`businessId`, `preparationAreaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_state_logs` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `businessId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `fromStatus` ENUM('DRAFT', 'PENDING', 'SENT_TO_KITCHEN', 'IN_PREPARATION', 'READY', 'DELIVERED', 'PAID', 'CANCELLED') NULL,
    `toStatus` ENUM('DRAFT', 'PENDING', 'SENT_TO_KITCHEN', 'IN_PREPARATION', 'READY', 'DELIVERED', 'PAID', 'CANCELLED') NOT NULL,
    `changedByUserId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `metadata` JSON NULL,

    INDEX `order_state_logs_orderId_createdAt_idx`(`orderId`, `createdAt`),
    INDEX `order_state_logs_businessId_createdAt_idx`(`businessId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cash_registers` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedAt` DATETIME(3) NULL,
    `openedByUserId` VARCHAR(191) NOT NULL,
    `closedByUserId` VARCHAR(191) NULL,

    INDEX `cash_registers_businessId_branchId_status_idx`(`businessId`, `branchId`, `status`),
    UNIQUE INDEX `cash_registers_businessId_branchId_code_key`(`businessId`, `branchId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shifts` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `cashRegisterId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedAt` DATETIME(3) NULL,
    `openingAmount` DECIMAL(14, 2) NOT NULL,
    `closingAmount` DECIMAL(14, 2) NULL,
    `expectedAmount` DECIMAL(14, 2) NULL,
    `difference` DECIMAL(14, 2) NULL,

    INDEX `shifts_businessId_branchId_status_idx`(`businessId`, `branchId`, `status`),
    INDEX `shifts_cashRegisterId_status_idx`(`cashRegisterId`, `status`),
    INDEX `shifts_userId_status_idx`(`userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `branches` ADD CONSTRAINT `branches_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_defaultBranchId_fkey` FOREIGN KEY (`defaultBranchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_preparationAreaId_fkey` FOREIGN KEY (`preparationAreaId`) REFERENCES `preparation_areas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `preparation_areas` ADD CONSTRAINT `preparation_areas_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `preparation_areas` ADD CONSTRAINT `preparation_areas_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurant_tables` ADD CONSTRAINT `restaurant_tables_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurant_tables` ADD CONSTRAINT `restaurant_tables_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `table_state_logs` ADD CONSTRAINT `table_state_logs_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `table_state_logs` ADD CONSTRAINT `table_state_logs_tableId_fkey` FOREIGN KEY (`tableId`) REFERENCES `restaurant_tables`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_tableId_fkey` FOREIGN KEY (`tableId`) REFERENCES `restaurant_tables`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_cashierId_fkey` FOREIGN KEY (`cashierId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_waiterId_fkey` FOREIGN KEY (`waiterId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_cashRegisterId_fkey` FOREIGN KEY (`cashRegisterId`) REFERENCES `cash_registers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_state_logs` ADD CONSTRAINT `order_state_logs_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_state_logs` ADD CONSTRAINT `order_state_logs_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_registers` ADD CONSTRAINT `cash_registers_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_registers` ADD CONSTRAINT `cash_registers_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_cashRegisterId_fkey` FOREIGN KEY (`cashRegisterId`) REFERENCES `cash_registers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
