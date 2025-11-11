-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EMPLOYEE', 'TEAMLEADER');

-- CreateEnum
CREATE TYPE "SalaryType" AS ENUM ('HOURLY', 'FIXED_MONTHLY', 'CONTRACT');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('MEMBER', 'LEAD');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('FULL_LEAVE', 'WORK_FROM_HOME', 'SICK_LEAVE', 'CASUAL_LEAVE', 'EMERGENCY_LEAVE');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LEAVE_APPROVED', 'WFH_APPROVED', 'LATE', 'HALF_DAY');

-- CreateEnum
CREATE TYPE "AttendanceException" AS ENUM ('WORKED_ON_APPROVED_LEAVE', 'NO_WORK_ON_WFH', 'ABSENT_DESPITE_DENIAL', 'WORKED_DESPITE_DENIAL', 'ATTENDANCE_WORK_MISMATCH', 'MISSING_CHECKOUT', 'WORK_WITHOUT_CHECKIN');

-- CreateEnum
CREATE TYPE "WarningType" AS ENUM ('ATTENDANCE', 'LEAVE_MISUSE', 'BREAK_EXCEEDED', 'WORK_QUALITY', 'BEHAVIORAL', 'SYSTEM_MISUSE');

-- CreateEnum
CREATE TYPE "WarningSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PenaltyType" AS ENUM ('ATTENDANCE_DEDUCTION', 'LATE_PENALTY', 'UNAUTHORIZED_ABSENCE', 'POLICY_VIOLATION', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LEAVE_REQUEST_UPDATE', 'WARNING_ISSUED', 'PENALTY_ISSUED', 'ATTENDANCE_ALERT', 'SYSTEM_NOTIFICATION', 'REMINDER');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('LAPTOP', 'DESKTOP', 'MONITOR', 'KEYBOARD', 'MOUSE', 'HEADSET', 'PHONE', 'TABLET', 'PRINTER', 'FURNITURE', 'SOFTWARE_LICENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'NEEDS_REPAIR');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'RETIRED', 'LOST', 'STOLEN');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'RETURNED', 'LOST', 'DAMAGED_RETURN');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('ROUTINE_MAINTENANCE', 'REPAIR', 'UPGRADE', 'REPLACEMENT', 'WARRANTY_SERVICE', 'INSPECTION');

-- CreateTable
CREATE TABLE "employees" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "employee_code" TEXT NOT NULL,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "department" TEXT,
    "designation" TEXT,
    "join_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "team_leader_id" INTEGER,
    "base_salary" DOUBLE PRECISION DEFAULT 0,
    "hourly_rate" DOUBLE PRECISION DEFAULT 0,
    "salary_type" "SalaryType" NOT NULL DEFAULT 'HOURLY',
    "standard_hours" DOUBLE PRECISION DEFAULT 160,
    "salary_pin" TEXT,
    "full_name" TEXT,
    "date_of_birth" DATE,
    "mother_name" TEXT,
    "contact_number" TEXT,
    "permanent_address" TEXT,
    "education_qualification" TEXT,
    "profile_completed" BOOLEAN NOT NULL DEFAULT false,
    "passport_photo" TEXT,
    "additional_photos" JSONB,
    "aadhar_card" TEXT,
    "pan_card" TEXT,
    "ssc_marksheet" TEXT,
    "hsc_marksheet" TEXT,
    "final_year_marksheet" TEXT,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_memberships" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "team_leader_id" INTEGER NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "tag_name" TEXT NOT NULL,
    "time_minutes" INTEGER NOT NULL,
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "total_minutes" INTEGER NOT NULL DEFAULT 0,
    "log_date" DATE NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_manual" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_status" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "submission_date" TIMESTAMP(3) NOT NULL,
    "submission_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_locked" BOOLEAN NOT NULL DEFAULT true,
    "total_minutes" INTEGER NOT NULL DEFAULT 0,
    "status_message" TEXT NOT NULL DEFAULT 'Data submitted successfully',

    CONSTRAINT "submission_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "leave_type" "LeaveType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" INTEGER,
    "admin_comments" TEXT,
    "is_urgent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
    "check_in_time" TIMESTAMP(3),
    "check_out_time" TIMESTAMP(3),
    "total_hours" DOUBLE PRECISION,
    "leave_request_id" INTEGER,
    "has_tag_work" BOOLEAN NOT NULL DEFAULT false,
    "has_flowace_work" BOOLEAN NOT NULL DEFAULT false,
    "tag_work_minutes" INTEGER NOT NULL DEFAULT 0,
    "flowace_minutes" INTEGER NOT NULL DEFAULT 0,
    "has_exception" BOOLEAN NOT NULL DEFAULT false,
    "exception_type" "AttendanceException",
    "exception_notes" TEXT,
    "lunch_out_time" TIMESTAMP(3),
    "lunch_in_time" TIMESTAMP(3),
    "break_out_time" TIMESTAMP(3),
    "break_in_time" TIMESTAMP(3),
    "shift" TEXT,
    "shift_start" TEXT,
    "overtime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "import_source" TEXT NOT NULL DEFAULT 'manual',
    "import_batch" TEXT,
    "has_been_edited" BOOLEAN NOT NULL DEFAULT false,
    "edited_at" TIMESTAMP(3),
    "edit_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "breaks" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "break_date" DATE NOT NULL,
    "break_in_time" TIMESTAMP(3),
    "break_out_time" TIMESTAMP(3),
    "break_duration" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "warning_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "breaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flowace_records" (
    "id" TEXT NOT NULL,
    "employee_id" INTEGER,
    "date" DATE NOT NULL,
    "active_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "available_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "idle_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "logged_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "missing_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "neutral_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "productive_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unclassified_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unproductive_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "classified_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activity_percentage" DOUBLE PRECISION,
    "productivity_percentage" DOUBLE PRECISION,
    "classified_percentage" DOUBLE PRECISION,
    "classified_billable_duration" INTEGER NOT NULL DEFAULT 0,
    "classified_non_billable_duration" INTEGER NOT NULL DEFAULT 0,
    "work_start_time" TEXT,
    "work_end_time" TEXT,
    "employee_code" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "member_email" TEXT,
    "teams" TEXT,
    "import_source" TEXT NOT NULL DEFAULT 'csv',
    "batch_id" TEXT NOT NULL,
    "upload_status" TEXT DEFAULT 'COMPLETED',
    "upload_filename" TEXT,
    "uploaded_at" TIMESTAMP(3),
    "raw_data" JSONB,
    "original_headers" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flowace_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warnings" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "warning_type" "WarningType" NOT NULL,
    "warning_date" DATE NOT NULL,
    "warning_message" TEXT NOT NULL,
    "severity" "WarningSeverity" NOT NULL DEFAULT 'LOW',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "issued_by" INTEGER,
    "related_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penalties" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "attendance_id" INTEGER,
    "penalty_type" "PenaltyType" NOT NULL,
    "amount" DOUBLE PRECISION,
    "description" TEXT NOT NULL,
    "penalty_date" DATE NOT NULL,
    "issued_by" INTEGER,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "penalties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "related_id" INTEGER,
    "related_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "issue_category" TEXT NOT NULL,
    "issue_description" TEXT NOT NULL,
    "issue_status" TEXT NOT NULL DEFAULT 'pending',
    "raised_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_date" TIMESTAMP(3),
    "admin_response" TEXT,
    "days_elapsed" INTEGER NOT NULL DEFAULT 0,
    "escalated_by" INTEGER,
    "escalated_by_name" TEXT,
    "escalation_type" TEXT NOT NULL DEFAULT 'employee',

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_leader_issues" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "team_leader_id" INTEGER NOT NULL,
    "issue_category" TEXT NOT NULL,
    "issue_description" TEXT NOT NULL,
    "issue_status" TEXT NOT NULL DEFAULT 'pending',
    "raised_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_date" TIMESTAMP(3),
    "team_leader_response" TEXT,
    "days_elapsed" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_leader_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" SERIAL NOT NULL,
    "asset_name" TEXT NOT NULL,
    "asset_type" "AssetType" NOT NULL,
    "asset_tag" TEXT,
    "serial_number" TEXT,
    "model" TEXT,
    "brand" TEXT,
    "purchase_date" DATE,
    "warranty_expiry" DATE,
    "purchase_price" DOUBLE PRECISION,
    "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_assignments" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "assigned_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "return_date" DATE,
    "assigned_by" INTEGER,
    "returned_by" INTEGER,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignment_notes" TEXT,
    "return_notes" TEXT,
    "return_condition" "AssetCondition",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_maintenance" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "maintenance_type" "MaintenanceType" NOT NULL,
    "description" TEXT NOT NULL,
    "maintenance_date" DATE NOT NULL,
    "cost" DOUBLE PRECISION,
    "performed_by" TEXT,
    "notes" TEXT,
    "next_due_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_history" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'attendance_csv',
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "processedRecords" INTEGER NOT NULL DEFAULT 0,
    "errorRecords" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "batchId" TEXT NOT NULL,
    "errors" JSONB,
    "summary" JSONB,
    "uploaded_by" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_edit_history" (
    "id" SERIAL NOT NULL,
    "attendance_id" INTEGER NOT NULL,
    "edited_by" INTEGER NOT NULL,
    "edited_by_name" TEXT NOT NULL,
    "edited_by_role" TEXT DEFAULT 'ADMIN',
    "edited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "field_changed" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "change_reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "attendance_edit_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_edit_history" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "edited_by" INTEGER NOT NULL,
    "edited_by_name" TEXT NOT NULL,
    "edited_by_role" TEXT DEFAULT 'ADMIN',
    "edited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "field_changed" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "change_reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "employee_edit_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employee_code_key" ON "employees"("employee_code");

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

-- CreateIndex
CREATE UNIQUE INDEX "team_memberships_team_id_employee_id_team_leader_id_key" ON "team_memberships"("team_id", "employee_id", "team_leader_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_employee_id_tag_id_key" ON "assignments"("employee_id", "tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "logs_employee_id_tag_id_log_date_key" ON "logs"("employee_id", "tag_id", "log_date");

-- CreateIndex
CREATE UNIQUE INDEX "submission_status_employee_id_submission_date_key" ON "submission_status"("employee_id", "submission_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_employee_id_date_key" ON "attendance_records"("employee_id", "date");

-- CreateIndex
CREATE INDEX "flowace_records_employee_id_idx" ON "flowace_records"("employee_id");

-- CreateIndex
CREATE INDEX "flowace_records_date_idx" ON "flowace_records"("date");

-- CreateIndex
CREATE INDEX "flowace_records_batch_id_idx" ON "flowace_records"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "flowace_records_employee_code_date_batch_id_key" ON "flowace_records"("employee_code", "date", "batch_id");

-- CreateIndex
CREATE INDEX "warnings_employee_id_idx" ON "warnings"("employee_id");

-- CreateIndex
CREATE INDEX "warnings_warning_date_idx" ON "warnings"("warning_date");

-- CreateIndex
CREATE INDEX "penalties_employee_id_idx" ON "penalties"("employee_id");

-- CreateIndex
CREATE INDEX "penalties_penalty_date_idx" ON "penalties"("penalty_date");

-- CreateIndex
CREATE INDEX "notifications_employee_id_idx" ON "notifications"("employee_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "issues_employee_id_idx" ON "issues"("employee_id");

-- CreateIndex
CREATE INDEX "issues_issue_status_idx" ON "issues"("issue_status");

-- CreateIndex
CREATE INDEX "team_leader_issues_employee_id_idx" ON "team_leader_issues"("employee_id");

-- CreateIndex
CREATE INDEX "team_leader_issues_team_leader_id_idx" ON "team_leader_issues"("team_leader_id");

-- CreateIndex
CREATE INDEX "team_leader_issues_issue_status_idx" ON "team_leader_issues"("issue_status");

-- CreateIndex
CREATE UNIQUE INDEX "assets_asset_tag_key" ON "assets"("asset_tag");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_asset_type_idx" ON "assets"("asset_type");

-- CreateIndex
CREATE INDEX "assets_asset_name_idx" ON "assets"("asset_name");

-- CreateIndex
CREATE INDEX "assets_serial_number_idx" ON "assets"("serial_number");

-- CreateIndex
CREATE INDEX "asset_assignments_asset_id_idx" ON "asset_assignments"("asset_id");

-- CreateIndex
CREATE INDEX "asset_assignments_employee_id_idx" ON "asset_assignments"("employee_id");

-- CreateIndex
CREATE INDEX "asset_assignments_status_idx" ON "asset_assignments"("status");

-- CreateIndex
CREATE INDEX "asset_assignments_assigned_date_idx" ON "asset_assignments"("assigned_date");

-- CreateIndex
CREATE INDEX "asset_maintenance_asset_id_idx" ON "asset_maintenance"("asset_id");

-- CreateIndex
CREATE INDEX "asset_maintenance_maintenance_date_idx" ON "asset_maintenance"("maintenance_date");

-- CreateIndex
CREATE INDEX "asset_maintenance_maintenance_type_idx" ON "asset_maintenance"("maintenance_type");

-- CreateIndex
CREATE UNIQUE INDEX "upload_history_batchId_key" ON "upload_history"("batchId");

-- CreateIndex
CREATE INDEX "upload_history_batchId_idx" ON "upload_history"("batchId");

-- CreateIndex
CREATE INDEX "upload_history_status_idx" ON "upload_history"("status");

-- CreateIndex
CREATE INDEX "upload_history_uploadedAt_idx" ON "upload_history"("uploadedAt");

-- CreateIndex
CREATE INDEX "attendance_edit_history_attendance_id_idx" ON "attendance_edit_history"("attendance_id");

-- CreateIndex
CREATE INDEX "attendance_edit_history_edited_by_idx" ON "attendance_edit_history"("edited_by");

-- CreateIndex
CREATE INDEX "attendance_edit_history_edited_at_idx" ON "attendance_edit_history"("edited_at");

-- CreateIndex
CREATE INDEX "employee_edit_history_employee_id_idx" ON "employee_edit_history"("employee_id");

-- CreateIndex
CREATE INDEX "employee_edit_history_edited_by_idx" ON "employee_edit_history"("edited_by");

-- CreateIndex
CREATE INDEX "employee_edit_history_edited_at_idx" ON "employee_edit_history"("edited_at");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_team_leader_id_fkey" FOREIGN KEY ("team_leader_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_leader_id_fkey" FOREIGN KEY ("team_leader_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_status" ADD CONSTRAINT "submission_status_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_leave_request_id_fkey" FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breaks" ADD CONSTRAINT "breaks_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flowace_records" ADD CONSTRAINT "flowace_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalties" ADD CONSTRAINT "penalties_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendance_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalties" ADD CONSTRAINT "penalties_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_leader_issues" ADD CONSTRAINT "team_leader_issues_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_leader_issues" ADD CONSTRAINT "team_leader_issues_team_leader_id_fkey" FOREIGN KEY ("team_leader_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenance" ADD CONSTRAINT "asset_maintenance_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_edit_history" ADD CONSTRAINT "attendance_edit_history_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_edit_history" ADD CONSTRAINT "attendance_edit_history_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_edit_history" ADD CONSTRAINT "employee_edit_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_edit_history" ADD CONSTRAINT "employee_edit_history_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
