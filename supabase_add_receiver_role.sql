-- Add receiver_role column to reviews table to distinguish between
-- reviews left for clients vs reviews left for students.
-- Run this in your Supabase SQL editor.

ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS receiver_role TEXT CHECK (receiver_role IN ('client', 'student'));

-- Backfill existing reviews based on the receiver's role in the profiles table
UPDATE reviews r
SET receiver_role = p.role
FROM profiles p
WHERE r.receiver_id = p.id;
