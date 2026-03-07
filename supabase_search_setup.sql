-- Enable fuzzy search extension for better partial matches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add search vectors for Jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fts tsvector GENERATED ALWAYS AS (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, ''))
) STORED;

CREATE INDEX IF NOT EXISTS jobs_fts_idx ON jobs USING GIN (fts);

-- Add search vectors for Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS fts tsvector GENERATED ALWAYS AS (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, ''))
) STORED;

CREATE INDEX IF NOT EXISTS products_fts_idx ON products USING GIN (fts);

-- Enable search on location for both using standard pg_trgm
CREATE INDEX IF NOT EXISTS jobs_location_trgm_idx ON jobs USING GIN (location gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_location_trgm_idx ON products USING GIN (location gin_trgm_ops);
