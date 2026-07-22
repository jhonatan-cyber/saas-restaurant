-- AlterTable
ALTER TABLE `businesses` ADD COLUMN `moduleDeliveryApp` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `moduleInventory` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `modulePosStations` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `moduleReports` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `overrideMaxUsers` INTEGER NULL,
    ADD COLUMN `planId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `currentStock` DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `shifts` ADD COLUMN `closingNotes` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `plans` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
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
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'TRIALING') NOT NULL DEFAULT 'TRIALING',
    `currentPeriodStart` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `currentPeriodEnd` DATETIME(3) NOT NULL,
    `trialEndsAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `stripeSubscriptionId` VARCHAR(191) NULL,
    `stripePriceId` VARCHAR(191) NULL,

    INDEX `subscriptions_businessId_status_idx`(`businessId`, `status`),
    INDEX `subscriptions_planId_idx`(`planId`),
    INDEX `subscriptions_status_idx`(`status`),
    UNIQUE INDEX `subscriptions_businessId_key`(`businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suppliers` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `contactName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `taxId` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `suppliers_businessId_isActive_idx`(`businessId`, `isActive`),
    UNIQUE INDEX `suppliers_businessId_branchId_name_key`(`businessId`, `branchId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchases` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NULL,
    `purchaseNumber` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `taxTotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `notes` VARCHAR(191) NULL,
    `receivedAt` DATETIME(3) NULL,
    `receivedBy` VARCHAR(191) NULL,
    `invoiceUrl` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,

    INDEX `purchases_businessId_branchId_createdAt_idx`(`businessId`, `branchId`, `createdAt`),
    INDEX `purchases_businessId_status_idx`(`businessId`, `status`),
    INDEX `purchases_supplierId_idx`(`supplierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_items` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `purchaseId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
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
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `businessId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `type` ENUM('IN', 'OUT', 'INITIAL') NOT NULL DEFAULT 'IN',
    `referenceType` ENUM('SALE', 'PURCHASE', 'ADJUSTMENT', 'SPOILAGE', 'INITIAL') NOT NULL,
    `referenceId` VARCHAR(191) NULL,
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
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `businessId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `method` ENUM('CASH', 'QR', 'TRANSFER', 'CARD') NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `tendered` DECIMAL(14, 2) NULL,
    `change` DECIMAL(14, 2) NULL,
    `reference` VARCHAR(191) NULL,
    `cashierId` VARCHAR(191) NOT NULL,

    INDEX `payments_businessId_orderId_idx`(`businessId`, `orderId`),
    INDEX `payments_businessId_createdAt_idx`(`businessId`, `createdAt`),
    INDEX `payments_cashierId_createdAt_idx`(`cashierId`, `createdAt`),
    INDEX `payments_businessId_method_createdAt_idx`(`businessId`, `method`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cash_movements` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `businessId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `shiftId` VARCHAR(191) NULL,
    `type` ENUM('CASH_IN', 'CASH_OUT') NOT NULL,
    `category` ENUM('OWNER_INVESTMENT', 'SUPPLIER_REFUND', 'LOAN_RECEIVED', 'TIP', 'OTHER_IN', 'SUPPLIES', 'MAINTENANCE', 'SALARY_ADVANCE', 'RENT', 'UTILITIES', 'OWNER_WITHDRAWAL', 'OTHER_OUT') NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,

    INDEX `cash_movements_businessId_branchId_createdAt_idx`(`businessId`, `branchId`, `createdAt`),
    INDEX `cash_movements_shiftId_idx`(`shiftId`),
    INDEX `cash_movements_createdByUserId_createdAt_idx`(`createdByUserId`, `createdAt`),
    INDEX `cash_movements_businessId_type_createdAt_idx`(`businessId`, `type`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `businessId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
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
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `stationCode` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `deviceName` VARCHAR(191) NULL,
    `activatedAt` DATETIME(3) NULL,
    `activatedBy` VARCHAR(191) NULL,
    `lastSeenAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `pos_stations_businessId_branchId_idx`(`businessId`, `branchId`),
    INDEX `pos_stations_businessId_isActive_idx`(`businessId`, `isActive`),
    UNIQUE INDEX `pos_stations_businessId_stationCode_key`(`businessId`, `stationCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reports` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `requestedBy` VARCHAR(191) NOT NULL,
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
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_ProductToSupplier_AB_unique`(`A`, `B`),
    INDEX `_ProductToSupplier_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `businesses_planId_idx` ON `businesses`(`planId`);

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `businesses` ADD CONSTRAINT `businesses_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE `cash_registers` ADD CONSTRAINT `cash_registers_openedByUserId_fkey` FOREIGN KEY (`openedByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_registers` ADD CONSTRAINT `cash_registers_closedByUserId_fkey` FOREIGN KEY (`closedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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
