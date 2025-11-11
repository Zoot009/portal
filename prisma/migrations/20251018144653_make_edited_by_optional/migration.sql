-- AlterTable
ALTER TABLE "attendance_edit_history" ALTER COLUMN "edited_by" DROP NOT NULL;

-- AlterTable
ALTER TABLE "employee_edit_history" ALTER COLUMN "edited_by" DROP NOT NULL;
