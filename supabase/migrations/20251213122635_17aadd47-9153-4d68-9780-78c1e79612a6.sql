
-- Add AI review and translations columns to games table
ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS ai_review text,
ADD COLUMN IF NOT EXISTS ai_review_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb;

-- ai_review_status can be: null (not requested), 'pending', 'completed', 'rejected'
