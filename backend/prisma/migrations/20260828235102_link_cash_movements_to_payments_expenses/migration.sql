/*
  Warnings:

  - A unique constraint covering the columns `[paymentId]` on the table `CashMovement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[expenseId]` on the table `CashMovement` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CashMovement" ADD COLUMN     "expenseId" TEXT,
ADD COLUMN     "paymentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CashMovement_paymentId_key" ON "CashMovement"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "CashMovement_expenseId_key" ON "CashMovement"("expenseId");

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
