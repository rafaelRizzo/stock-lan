/*
  Warnings:

  - A unique constraint covering the columns `[productionOrderId]` on the table `StockBatch` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('RAW_MATERIAL', 'FINISHED', 'BOTH');

-- DropForeignKey
ALTER TABLE "StockBatch" DROP CONSTRAINT "StockBatch_supplierId_fkey";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "type" "ProductType" NOT NULL DEFAULT 'BOTH';

-- AlterTable
ALTER TABLE "StockBatch" ADD COLUMN     "productionOrderId" TEXT,
ALTER COLUMN "supplierId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "productionOrderId" TEXT;

-- CreateTable
CREATE TABLE "RecipeItem" (
    "id" TEXT NOT NULL,
    "finishedProductId" TEXT NOT NULL,
    "rawProductId" TEXT NOT NULL,
    "quantityPerUnit" DECIMAL(14,3) NOT NULL,
    "createdUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" TEXT NOT NULL,
    "finishedProductId" TEXT NOT NULL,
    "quantityTypeId" TEXT NOT NULL,
    "quantityProduced" DECIMAL(14,3) NOT NULL,
    "costUnit" DECIMAL(14,2) NOT NULL,
    "dateProduced" DATE NOT NULL,
    "obs" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecipeItem_rawProductId_idx" ON "RecipeItem"("rawProductId");

-- CreateIndex
CREATE INDEX "RecipeItem_createdUserId_idx" ON "RecipeItem"("createdUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeItem_finishedProductId_rawProductId_key" ON "RecipeItem"("finishedProductId", "rawProductId");

-- CreateIndex
CREATE INDEX "ProductionOrder_finishedProductId_createdAt_idx" ON "ProductionOrder"("finishedProductId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductionOrder_status_createdAt_idx" ON "ProductionOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ProductionOrder_createdUserId_idx" ON "ProductionOrder"("createdUserId");

-- CreateIndex
CREATE UNIQUE INDEX "StockBatch_productionOrderId_key" ON "StockBatch"("productionOrderId");

-- CreateIndex
CREATE INDEX "StockMovement_productionOrderId_createdAt_idx" ON "StockMovement"("productionOrderId", "createdAt");

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_finishedProductId_fkey" FOREIGN KEY ("finishedProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_rawProductId_fkey" FOREIGN KEY ("rawProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_createdUserId_fkey" FOREIGN KEY ("createdUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_finishedProductId_fkey" FOREIGN KEY ("finishedProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_quantityTypeId_fkey" FOREIGN KEY ("quantityTypeId") REFERENCES "QuantityType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_createdUserId_fkey" FOREIGN KEY ("createdUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
