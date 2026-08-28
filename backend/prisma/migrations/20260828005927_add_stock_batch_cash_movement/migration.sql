/*
  Warnings:

  - A unique constraint covering the columns `[stockBatchId]` on the table `CashMovement` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CashMovement" ADD COLUMN     "stockBatchId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CashMovement_stockBatchId_key" ON "CashMovement"("stockBatchId");

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_stockBatchId_fkey" FOREIGN KEY ("stockBatchId") REFERENCES "StockBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
