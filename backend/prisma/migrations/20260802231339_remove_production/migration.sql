/*
  Warnings:

  - You are about to drop the column `productionOrderId` on the `StockBatch` table. All the data in the column will be lost.
  - You are about to drop the column `productionOrderId` on the `StockMovement` table. All the data in the column will be lost.
  - You are about to drop the `ProductionOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RecipeItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProductionOrder" DROP CONSTRAINT "ProductionOrder_createdUserId_fkey";

-- DropForeignKey
ALTER TABLE "ProductionOrder" DROP CONSTRAINT "ProductionOrder_finishedProductId_fkey";

-- DropForeignKey
ALTER TABLE "ProductionOrder" DROP CONSTRAINT "ProductionOrder_quantityTypeId_fkey";

-- DropForeignKey
ALTER TABLE "RecipeItem" DROP CONSTRAINT "RecipeItem_createdUserId_fkey";

-- DropForeignKey
ALTER TABLE "RecipeItem" DROP CONSTRAINT "RecipeItem_finishedProductId_fkey";

-- DropForeignKey
ALTER TABLE "RecipeItem" DROP CONSTRAINT "RecipeItem_rawProductId_fkey";

-- DropForeignKey
ALTER TABLE "StockBatch" DROP CONSTRAINT "StockBatch_productionOrderId_fkey";

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_productionOrderId_fkey";

-- DropIndex
DROP INDEX "StockBatch_productionOrderId_key";

-- DropIndex
DROP INDEX "StockMovement_productionOrderId_createdAt_idx";

-- AlterTable
ALTER TABLE "StockBatch" DROP COLUMN "productionOrderId";

-- AlterTable
ALTER TABLE "StockMovement" DROP COLUMN "productionOrderId";

-- DropTable
DROP TABLE "ProductionOrder";

-- DropTable
DROP TABLE "RecipeItem";
