-- DropIndex
DROP INDEX "Debtor_status_createdAt_idx";

-- DropIndex
DROP INDEX "ExpenseTemplate_nextDueDate_idx";

-- DropIndex
DROP INDEX "ExpenseTemplate_recurrence_idx";

-- DropIndex
DROP INDEX "Product_status_createdAt_idx";

-- DropIndex
DROP INDEX "Sale_clientName_idx";

-- DropIndex
DROP INDEX "Supplier_status_createdAt_idx";

-- DropIndex
DROP INDEX "User_createdAt_idx";

-- DropIndex
DROP INDEX "User_status_idx";

-- CreateIndex
CREATE INDEX "Debtor_status_name_idx" ON "Debtor"("status", "name");

-- CreateIndex
CREATE INDEX "Expense_dueDate_idx" ON "Expense"("dueDate");

-- CreateIndex
CREATE INDEX "ExpenseTemplate_status_nextDueDate_idx" ON "ExpenseTemplate"("status", "nextDueDate");

-- CreateIndex
CREATE INDEX "Product_status_name_idx" ON "Product"("status", "name");

-- CreateIndex
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE INDEX "Supplier_status_name_idx" ON "Supplier"("status", "name");

-- CreateIndex
CREATE INDEX "User_status_createdAt_idx" ON "User"("status", "createdAt");
