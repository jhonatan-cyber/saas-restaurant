-- CreateTable
CREATE TABLE `plans` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `description` VARCHAR(191) NULL,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `billingPeriod` ENUM('MONTHLY', 'YEARLY') NOT NULL DEFAULT 'MONTHLY',
    `maxUsers` INTEGER NOT NULL DEFAULT 1,
    `maxBranches` INTEGER NOT NULL DEFAULT 1,
    `maxProducts` INTEGER NOT NULL DEFAULT 50,
    `maxCategories` INTEGER NOT NULL DEFAULT 10,
    `maxMonthlyOrders` INTEGER NOT NULL DEFAULT 500,
    `maxStorageMb` INTEGER NOT NULL DEFAULT 100,
    `features` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublic` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `plans_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `businessId` VARCHAR(80) NOT NULL,
    `planId` VARCHAR(80) NOT NULL,
    `status` ENUM('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'TRIALING') NOT NULL DEFAULT 'TRIALING',
    `currentPeriodStart` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `currentPeriodEnd` DATETIME(3) NOT NULL,
    `trialEndsAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `stripeSubscriptionId` VARCHAR(191) NULL,
    `stripePriceId` VARCHAR(191) NULL,
    `stripeCustomerId` VARCHAR(191) NULL,

    INDEX `subscriptions_businessId_status_idx`(`businessId`, `status`),
    INDEX `subscriptions_planId_idx`(`planId`),
    INDEX `subscriptions_status_idx`(`status`),
    UNIQUE INDEX `subscriptions_businessId_key`(`businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `businesses` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `legalName` VARCHAR(191) NULL,
    `taxId` VARCHAR(80) NULL,
    `email` VARCHAR(80) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'BOB',
    `timezone` VARCHAR(50) NOT NULL DEFAULT 'America/La_Paz',
    `status` ENUM('ACTIVE', 'SUSPENDED', 'TRIAL') NOT NULL DEFAULT 'ACTIVE',
    `plan` VARCHAR(20) NOT NULL DEFAULT 'FREE',
    `trialEndsAt` DATETIME(3) NULL,
    `overrideMaxUsers` INTEGER NULL,
    `moduleReports` BOOLEAN NOT NULL DEFAULT false,
    `moduleInventory` BOOLEAN NOT NULL DEFAULT false,
    `modulePosStations` BOOLEAN NOT NULL DEFAULT false,
    `moduleDeliveryApp` BOOLEAN NOT NULL DEFAULT false,
    `planId` VARCHAR(80) NULL,

    UNIQUE INDEX `businesses_slug_key`(`slug`),
    INDEX `businesses_slug_idx`(`slug`),
    INDEX `businesses_status_idx`(`status`),
    INDEX `businesses_planId_idx`(`planId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branches` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `businessId` VARCHAR(80) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
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
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `email` VARCHAR(80) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `role` ENUM('SUPER_ADMIN', 'OWNER', 'ADMIN', 'CAJERO', 'MESERO', 'COCINA', 'REPARTIDOR') NOT NULL DEFAULT 'CAJERO',
    `status` ENUM('ACTIVE', 'INACTIVE', 'INVITED') NOT NULL DEFAULT 'INVITED',
    `businessId` VARCHAR(80) NOT NULL,
    `defaultBranchId` VARCHAR(80) NULL,
    `lastLoginAt` DATETIME(3) NULL,

    INDEX `users_businessId_role_idx`(`businessId`, `role`),
    INDEX `users_businessId_status_idx`(`businessId`, `status`),
    UNIQUE INDEX `users_businessId_email_key`(`businessId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `businessId` VARCHAR(80) NOT NULL,
    `branchId` VARCHAR(80) NULL,
    `name` VARCHAR(80) NOT NULL,
    `slug` VARCHAR(50) NOT NULL,
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
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `businessId` VARCHAR(80) NOT NULL,
    `branchId` VARCHAR(80) NULL,
    `categoryId` VARCHAR(80) NULL,
    `preparationAreaId` VARCHAR(80) NULL,
    `name` VARCHAR(80) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `description` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `sku` VARCHAR(80) NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `cost` DECIMAL(12, 2) NULL,
    `taxRate` DECIMAL(5, 2) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `minStock` INTEGER NULL,
    `trackStock` BOOLEAN NOT NULL DEFAULT false,
    `currentStock` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `productType` ENUM('SALE', 'COMBO', 'ADDON', 'SERVICE', 'INGREDIENT') NOT NULL DEFAULT 'SALE',
    `preparationTimeMin` INTEGER NULL,
    `comboItems` JSON NULL,
    `bulkPricing` JSON NULL,

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
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `businessId` VARCHAR(80) NOT NULL,
    `branchId` VARCHAR(80) NULL,
    `name` VARCHAR(80) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `preparation_areas_businessId_displayOrder_idx`(`businessId`, `displayOrder`),
    INDEX `preparation_areas_businessId_isActive_idx`(`businessId`, `isActive`),
    UNIQUE INDEX `preparation_areas_businessId_code_key`(`businessId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suppliers` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `businessId` VARCHAR(80) NOT NULL,
    `branchId` VARCHAR(80) NULL,
    `name` VARCHAR(50) NOT NULL,
    `contactName` VARCHAR(191) NULL,
    `email` VARCHAR(80) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `taxId` VARCHAR(80) NULL,
    `notes` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `suppliers_businessId_isActive_idx`(`businessId`, `isActive`),
    UNIQUE INDEX `suppliers_businessId_branchId_name_key`(`businessId`, `branchId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchases` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `businessId` VARCHAR(80) NOT NULL,
    `branchId` VARCHAR(80) NOT NULL,
    `supplierId` VARCHAR(80) NULL,
    `purchaseNumber` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `taxTotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `notes` VARCHAR(191) NULL,
    `receivedAt` DATETIME(3) NULL,
    `receivedBy` VARCHAR(80) NULL,
    `invoiceUrl` VARCHAR(191) NULL,
    `createdById` VARCHAR(80) NOT NULL,

    INDEX `purchases_businessId_branchId_createdAt_idx`(`businessId`, `branchId`, `createdAt`),
    INDEX `purchases_businessId_status_idx`(`businessId`, `status`),
    INDEX `purchases_supplierId_idx`(`supplierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_items` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `purchaseId` VARCHAR(80) NOT NULL,
    `productId` VARCHAR(80) NULL,
    `productName` VARCHAR(191) NOT NULL,
    `unitCost` DECIMAL(12, 2) NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `lineTotal` DECIMAL(14, 2) NOT NULL,

    INDEX `purchase_items_purchaseId_idx`(`purchaseId`),
    INDEX `purchase_items_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_movements` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `businessId` VARCHAR(80) NOT NULL,
    `branchId` VARCHAR(80) NOT NULL,
    `productId` VARCHAR(80) NOT NULL,
    `type` ENUM('IN', 'OUT', 'INITIAL') NOT NULL DEFAULT 'IN',
    `referenceType` ENUM('SALE', 'PURCHASE', 'ADJUSTMENT', 'SPOILAGE', 'INITIAL') NOT NULL,
    `referenceId` VARCHAR(80) NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `unitCost` DECIMAL(12, 2) NULL,
    `totalCost` DECIMAL(14, 2) NULL,
    `runningBalance` DECIMAL(12, 2) NOT NULL,
    `notes` VARCHAR(191) NULL,

    INDEX `inventory_movements_productId_createdAt_idx`(`productId`, `createdAt`),
    INDEX `inventory_movements_businessId_branchId_createdAt_idx`(`businessId`, `branchId`, `createdAt`),
    INDEX `inventory_movements_referenceType_referenceId_idx`(`referenceType`, `referenceId`),
    INDEX `inventory_movements_businessId_createdAt_idx`(`businessId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `restaurant_tables` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `businessId` VARCHAR(80) NOT NULL,
    `branchId` VARCHAR(80) NOT NULL,
    `number` VARCHAR(50) NOT NULL,
    `capacity` INTEGER NOT NULL DEFAULT 4,
    `location` ENUM('INDOOR', 'OUTDOOR', 'BAR', 'PATIO', 'TERRACE', 'OTHER') NOT NULL DEFAULT 'INDOOR',
    `status` ENUM('FREE', 'OCCUPIED', 'RESERVED') NOT NULL DEFAULT 'FREE',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
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
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `businessId` VARCHAR(80) NOT NULL,
    `tableId` VARCHAR(80) NOT NULL,
    `previousStatus` ENUM('FREE', 'OCCUPIED', 'RESERVED') NOT NULL,
    `newStatus` ENUM('FREE', 'OCCUPIED', 'RESERVED') NOT NULL,
    `changedByUserId` VARCHAR(80) NOT NULL,
    `reason` VARCHAR(191) NULL,

    INDEX `table_state_logs_tableId_createdAt_idx`(`tableId`, `createdAt`),
    INDEX `table_state_logs_businessId_createdAt_idx`(`businessId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `businessId` VARCHAR(80) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `taxId` VARCHAR(80) NULL,
    `taxIdType` VARCHAR(20) NULL,
    `email` VARCHAR(80) NULL,
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
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `businessId` VARCHAR(80) NOT NULL,
    `branchId` VARCHAR(80) NOT NULL,
    `tableId` VARCHAR(80) NULL,
    `customerId` VARCHAR(80) NULL,
    `cashierId` VARCHAR(80) NOT NULL,
    `waiterId` VARCHAR(80) NULL,
    `type` ENUM('DINE_IN', 'TAKEOUT', 'DELIVERY') NOT NULL DEFAULT 'DINE_IN',
    `channel` ENUM('POS_WEB', 'POS_DESKTOP', 'MOBILE', 'KIOSK', 'ADMIN') NOT NULL DEFAULT 'POS_WEB',
    `status` ENUM('DRAFT', 'PENDING', 'SENT_TO_KITCHEN', 'IN_PREPARATION', 'READY', 'DELIVERED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `subtotal` DECIMAL(14, 2) NOT NULL,
    `taxTotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL,
    `globalNotes` VARCHAR(191) NULL,
    `cashRegisterId` VARCHAR(80) NULL,
    `shiftId` VARCHAR(80) NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `cancelledAt` DATETIME(3) NULL,
    `cancelledByUserId` VARCHAR(80) NULL,
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
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `businessId` VARCHAR(80) NOT NULL,
    `orderId` VARCHAR(80) NOT NULL,
    `productId` VARCHAR(80) NULL,
    `productName` VARCHAR(191) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `taxRate` DECIMAL(5, 2) NULL,
    `preparationAreaId` VARCHAR(80) NULL,
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
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `businessId` VARCHAR(80) NOT NULL,
    `orderId` VARCHAR(80) NOT NULL,
    `fromStatus` ENUM('DRAFT', 'PENDING', 'SENT_TO_KITCHEN', 'IN_PREPARATION', 'READY', 'DELIVERED', 'PAID', 'CANCELLED') NULL,
    `toStatus` ENUM('DRAFT', 'PENDING', 'SENT_TO_KITCHEN', 'IN_PREPARATION', 'READY', 'DELIVERED', 'PAID', 'CANCELLED') NOT NULL,
    `changedByUserId` VARCHAR(80) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `metadata` JSON NULL,

    INDEX `order_state_logs_orderId_createdAt_idx`(`orderId`, `createdAt`),
    INDEX `order_state_logs_businessId_createdAt_idx`(`businessId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cash_registers` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `businessId` VARCHAR(80) NOT NULL,
    `branchId` VARCHAR(80) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedAt` DATETIME(3) NULL,
    `openedByUserId` VARCHAR(80) NOT NULL,
    `closedByUserId` VARCHAR(80) NULL,

    INDEX `cash_registers_businessId_branchId_status_idx`(`businessId`, `branchId`, `status`),
    UNIQUE INDEX `cash_registers_businessId_branchId_code_key`(`businessId`, `branchId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shifts` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `businessId` VARCHAR(80) NOT NULL,
    `branchId` VARCHAR(80) NOT NULL,
    `cashRegisterId` VARCHAR(80) NOT NULL,
    `userId` VARCHAR(80) NOT NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedAt` DATETIME(3) NULL,
    `openingAmount` DECIMAL(14, 2) NOT NULL,
    `closingAmount` DECIMAL(14, 2) NULL,
    `expectedAmount` DECIMAL(14, 2) NULL,
    `difference` DECIMAL(14, 2) NULL,
    `closingNotes` VARCHAR(191) NULL,

    INDEX `shifts_businessId_branchId_status_idx`(`businessId`, `branchId`, `status`),
    INDEX `shifts_cashRegisterId_status_idx`(`cashRegisterId`, `status`),
    INDEX `shifts_userId_status_idx`(`userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `businessId` VARCHAR(80) NOT NULL,
    `orderId` VARCHAR(80) NOT NULL,
    `method` ENUM('CASH', 'QR', 'TRANSFER', 'CARD') NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `tendered` DECIMAL(14, 2) NULL,
    `change` DECIMAL(14, 2) NULL,
    `reference` VARCHAR(191) NULL,
    `cashierId` VARCHAR(80) NOT NULL,

    INDEX `payments_businessId_orderId_idx`(`businessId`, `orderId`),
    INDEX `payments_businessId_createdAt_idx`(`businessId`, `createdAt`),
    INDEX `payments_cashierId_createdAt_idx`(`cashierId`, `createdAt`),
    INDEX `payments_businessId_method_createdAt_idx`(`businessId`, `method`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cash_movements` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `businessId` VARCHAR(80) NOT NULL,
    `branchId` VARCHAR(80) NOT NULL,
    `shiftId` VARCHAR(80) NULL,
    `type` ENUM('CASH_IN', 'CASH_OUT') NOT NULL,
    `category` ENUM('OWNER_INVESTMENT', 'SUPPLIER_REFUND', 'LOAN_RECEIVED', 'TIP', 'OTHER_IN', 'SUPPLIES', 'MAINTENANCE', 'SALARY_ADVANCE', 'RENT', 'UTILITIES', 'OWNER_WITHDRAWAL', 'OTHER_OUT') NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(80) NOT NULL,

    INDEX `cash_movements_businessId_branchId_createdAt_idx`(`businessId`, `branchId`, `createdAt`),
    INDEX `cash_movements_shiftId_idx`(`shiftId`),
    INDEX `cash_movements_createdByUserId_createdAt_idx`(`createdByUserId`, `createdAt`),
    INDEX `cash_movements_businessId_type_createdAt_idx`(`businessId`, `type`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `businessId` VARCHAR(80) NOT NULL,
    `userId` VARCHAR(80) NOT NULL,
    `entity` VARCHAR(50) NOT NULL,
    `entityId` VARCHAR(80) NOT NULL,
    `action` ENUM('CREATE', 'UPDATE', 'SOFT_DELETE', 'HARD_DELETE', 'VOID', 'PRICE_CHANGE', 'DISCOUNT', 'SHIFT_OPEN', 'SHIFT_CLOSE', 'SHIFT_ARQUEO', 'CASH_MOVEMENT', 'PAYMENT', 'STATION_ACTIVATE', 'STATION_DEACTIVATE') NOT NULL,
    `before` JSON NULL,
    `after` JSON NULL,
    `metadata` JSON NULL,

    INDEX `audit_logs_businessId_entity_entityId_idx`(`businessId`, `entity`, `entityId`),
    INDEX `audit_logs_businessId_createdAt_idx`(`businessId`, `createdAt`),
    INDEX `audit_logs_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `audit_logs_businessId_action_createdAt_idx`(`businessId`, `action`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pos_stations` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `businessId` VARCHAR(80) NOT NULL,
    `branchId` VARCHAR(80) NOT NULL,
    `stationCode` VARCHAR(80) NOT NULL,
    `name` VARCHAR(191) NULL,
    `deviceName` VARCHAR(191) NULL,
    `activatedAt` DATETIME(3) NULL,
    `activatedBy` VARCHAR(80) NULL,
    `lastSeenAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `pos_stations_businessId_branchId_idx`(`businessId`, `branchId`),
    INDEX `pos_stations_businessId_isActive_idx`(`businessId`, `isActive`),
    UNIQUE INDEX `pos_stations_businessId_stationCode_key`(`businessId`, `stationCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reports` (
    `id` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `businessId` VARCHAR(80) NOT NULL,
    `requestedBy` VARCHAR(80) NOT NULL,
    `type` ENUM('SALES_DAILY', 'SALES_RANGE', 'PAYMENT_METHODS', 'TOP_PRODUCTS', 'GROSS_PROFIT', 'INVENTORY', 'CLOSE_REPORT') NOT NULL,
    `format` ENUM('PDF', 'XLSX') NOT NULL DEFAULT 'PDF',
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `params` JSON NOT NULL,
    `resultUrl` VARCHAR(191) NULL,
    `resultSize` INTEGER NULL,
    `errorMessage` VARCHAR(191) NULL,
    `completedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,

    INDEX `reports_businessId_createdAt_idx`(`businessId`, `createdAt`),
    INDEX `reports_businessId_status_idx`(`businessId`, `status`),
    INDEX `reports_businessId_requestedBy_idx`(`businessId`, `requestedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ProductToSupplier` (
    `A` VARCHAR(80) NOT NULL,
    `B` VARCHAR(80) NOT NULL,

    UNIQUE INDEX `_ProductToSupplier_AB_unique`(`A`, `B`),
    INDEX `_ProductToSupplier_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `businesses` ADD CONSTRAINT `businesses_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE `cash_registers` ADD CONSTRAINT `cash_registers_openedByUserId_fkey` FOREIGN KEY (`openedByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_registers` ADD CONSTRAINT `cash_registers_closedByUserId_fkey` FOREIGN KEY (`closedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_cashRegisterId_fkey` FOREIGN KEY (`cashRegisterId`) REFERENCES `cash_registers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_cashierId_fkey` FOREIGN KEY (`cashierId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_movements` ADD CONSTRAINT `cash_movements_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_movements` ADD CONSTRAINT `cash_movements_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_movements` ADD CONSTRAINT `cash_movements_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_movements` ADD CONSTRAINT `cash_movements_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_stations` ADD CONSTRAINT `pos_stations_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_stations` ADD CONSTRAINT `pos_stations_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_stations` ADD CONSTRAINT `pos_stations_activatedBy_fkey` FOREIGN KEY (`activatedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_requestedBy_fkey` FOREIGN KEY (`requestedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ProductToSupplier` ADD CONSTRAINT `_ProductToSupplier_A_fkey` FOREIGN KEY (`A`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ProductToSupplier` ADD CONSTRAINT `_ProductToSupplier_B_fkey` FOREIGN KEY (`B`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
