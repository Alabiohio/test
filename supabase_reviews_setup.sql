-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone" 
ON reviews FOR SELECT 
USING (true);

CREATE POLICY "Users can create reviews for jobs they were part of" 
ON reviews FOR INSERT 
WITH CHECK (
    auth.uid() = reviewer_id
);

-- Optional: Prevent duplicate reviews for the same job by the same person
CREATE UNIQUE INDEX IF NOT EXISTS unique_review_per_job_per_reviewer 
ON reviews (job_id, reviewer_id);
