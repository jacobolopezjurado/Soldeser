-- AlterTable: add uploaded_by_id to payslips
ALTER TABLE "payslips" ADD COLUMN IF NOT EXISTS "uploaded_by_id" TEXT;

-- AddForeignKey (only if column was just added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payslips_uploaded_by_id_fkey'
  ) THEN
    ALTER TABLE "payslips" 
    ADD CONSTRAINT "payslips_uploaded_by_id_fkey" 
    FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
