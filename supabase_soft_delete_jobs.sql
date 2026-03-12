-- Add is_deleted column for soft delete
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_jobs_is_deleted ON jobs(is_deleted);
