/*
  Warnings:

  - A unique constraint covering the columns `[clerk_user_id]` on the table `employees` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "clerk_user_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "employees_clerk_user_id_key" ON "employees"("clerk_user_id");
