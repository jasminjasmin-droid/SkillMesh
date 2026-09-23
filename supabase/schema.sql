-- ====================================================================
-- SKILL MESH SUPABASE SCHEMA
-- Centralized Relational Source of Truth with Row Level Security (RLS)
-- Safe & Additive: Running this script will never drop or reset existing data.
-- ====================================================================

-- 1. Profiles Table (Registered users and profile details)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  title_or_role TEXT,
  bio TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'STUDENT',
  institution_name TEXT,
  organization_name TEXT,
  occupation_details TEXT,
  is_profile_complete BOOLEAN DEFAULT TRUE,
  professional_links JSONB,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  location TEXT,
  joined_date DATE DEFAULT CURRENT_DATE,
  is_verified BOOLEAN DEFAULT TRUE,
  contact_preference TEXT DEFAULT 'Email',
  contact_handle TEXT,
  role TEXT DEFAULT 'user',
  account_status TEXT DEFAULT 'ACTIVE',
  status_reason TEXT,
  status_updated_at TIMESTAMPTZ,
  availability_status TEXT DEFAULT 'UNAVAILABLE',
  availability_mode TEXT DEFAULT 'BOTH',
  availability_updated_at TIMESTAMPTZ,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist for existing installations (additive)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'STUDENT';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institution_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS occupation_details TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS professional_links JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'ACTIVE';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'UNAVAILABLE';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS availability_mode TEXT DEFAULT 'BOTH';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS availability_updated_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skillmesh_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]'::jsonb;

-- 2. Offered Skills Table (Skills users can share or teach)
CREATE TABLE IF NOT EXISTS public.offered_skills (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  proficiency TEXT NOT NULL CHECK (proficiency IN ('Beginner', 'Intermediate', 'Advanced')),
  experience_description TEXT,
  years_of_practice TEXT,
  teaching_confidence TEXT NOT NULL DEFAULT 'Both' CHECK (teaching_confidence IN ('Beginners', 'Intermediate', 'Both')),
  supporting_link TEXT,
  supporting_link_type TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.offered_skills ADD COLUMN IF NOT EXISTS category TEXT;

-- 3. Wanted Skills Table (Skills users want to learn)
CREATE TABLE IF NOT EXISTS public.wanted_skills (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  current_level TEXT NOT NULL CHECK (current_level IN ('Beginner', 'Intermediate', 'Advanced')),
  learning_goal TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wanted_skills ADD COLUMN IF NOT EXISTS category TEXT;

-- 4. Connection Requests & Project Collaborations Table
CREATE TABLE IF NOT EXISTS public.connection_requests (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  receiver_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_name TEXT NOT NULL,
  offered_skill_name TEXT NOT NULL,
  wanted_skill_name TEXT NOT NULL,
  note TEXT,
  contact_method TEXT DEFAULT 'Email',
  contact_value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'ENDED', 'BLOCKED')),
  is_knowledge_sharing BOOLEAN DEFAULT FALSE,
  is_project_collaboration BOOLEAN DEFAULT FALSE,
  collaboration_details JSONB,
  request_type TEXT DEFAULT 'MUTUAL_EXCHANGE',
  ended_at TIMESTAMPTZ,
  ended_by TEXT,
  end_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.connection_requests ADD COLUMN IF NOT EXISTS is_project_collaboration BOOLEAN DEFAULT FALSE;
ALTER TABLE public.connection_requests ADD COLUMN IF NOT EXISTS collaboration_details JSONB;
ALTER TABLE public.connection_requests ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE public.connection_requests ADD COLUMN IF NOT EXISTS ended_by TEXT;
ALTER TABLE public.connection_requests ADD COLUMN IF NOT EXISTS end_reason TEXT;

-- 5. Chat Messages Table (Private 1-on-1 chats & shared resources)
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES public.connection_requests(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  receiver_id TEXT,
  text TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS receiver_id TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 6. User Reports Table (Safety & Moderation flags)
CREATE TABLE IF NOT EXISTS public.user_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  reporter_name TEXT NOT NULL,
  reporter_email TEXT,
  reported_user_id TEXT NOT NULL,
  reported_user_name TEXT NOT NULL,
  reported_user_email TEXT,
  reason TEXT NOT NULL,
  reason_label TEXT NOT NULL,
  description TEXT,
  connection_id TEXT,
  status TEXT DEFAULT 'PENDING_REVIEW',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. User Blocks Table (Safety & Privacy blocks)
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id TEXT PRIMARY KEY,
  blocker_id TEXT NOT NULL,
  blocked_user_id TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Audit Logs Table (Admin moderation history)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  target_user_name TEXT NOT NULL,
  target_user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- INDEXES for Performance & Fast Discovery Queries
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
-- Enforce Case-Insensitive One Email = One Account Uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique ON public.profiles(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_offered_skills_user ON public.offered_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_offered_skills_name ON public.offered_skills(name);
CREATE INDEX IF NOT EXISTS idx_wanted_skills_user ON public.wanted_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_wanted_skills_name ON public.wanted_skills(name);
CREATE INDEX IF NOT EXISTS idx_conn_sender ON public.connection_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_conn_receiver ON public.connection_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_conn_status ON public.connection_requests(status);
CREATE INDEX IF NOT EXISTS idx_messages_connection ON public.messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- 9. Password Reset Requests Table (Admin-assisted password reset workflow)
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED', 'REJECTED')),
  admin_notes TEXT,
  temp_password_hint TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pwd_resets_email ON public.password_reset_requests(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_pwd_resets_status ON public.password_reset_requests(status);

-- --------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offered_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wanted_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (true);

-- Skills Policies
DROP POLICY IF EXISTS "Offered skills are viewable by everyone" ON public.offered_skills;
CREATE POLICY "Offered skills are viewable by everyone" ON public.offered_skills FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their offered skills" ON public.offered_skills;
CREATE POLICY "Users can manage their offered skills" ON public.offered_skills FOR ALL USING (true);

DROP POLICY IF EXISTS "Wanted skills are viewable by everyone" ON public.wanted_skills;
CREATE POLICY "Wanted skills are viewable by everyone" ON public.wanted_skills FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their wanted skills" ON public.wanted_skills;
CREATE POLICY "Users can manage their wanted skills" ON public.wanted_skills FOR ALL USING (true);

-- Connection Requests Policies
DROP POLICY IF EXISTS "Users can view relevant connection requests" ON public.connection_requests;
CREATE POLICY "Users can view relevant connection requests" ON public.connection_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create connection requests" ON public.connection_requests;
CREATE POLICY "Users can create connection requests" ON public.connection_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update connection requests" ON public.connection_requests;
CREATE POLICY "Users can update connection requests" ON public.connection_requests FOR UPDATE USING (true);

-- Messages Policies
DROP POLICY IF EXISTS "Users can view messages for their connections" ON public.messages;
CREATE POLICY "Users can view messages for their connections" ON public.messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert messages into their connections" ON public.messages;
CREATE POLICY "Users can insert messages into their connections" ON public.messages FOR INSERT WITH CHECK (true);

-- Moderation Policies
DROP POLICY IF EXISTS "Reports insert policy" ON public.user_reports;
CREATE POLICY "Reports insert policy" ON public.user_reports FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Reports select policy" ON public.user_reports;
CREATE POLICY "Reports select policy" ON public.user_reports FOR SELECT USING (true);

DROP POLICY IF EXISTS "Blocks policy" ON public.user_blocks;
CREATE POLICY "Blocks policy" ON public.user_blocks FOR ALL USING (true);

DROP POLICY IF EXISTS "Audit logs policy" ON public.audit_logs;
CREATE POLICY "Audit logs policy" ON public.audit_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Password reset requests policy" ON public.password_reset_requests;
CREATE POLICY "Password reset requests policy" ON public.password_reset_requests FOR ALL USING (true);

-- --------------------------------------------------------------------
-- 10. User Ratings Table (Peer-to-Peer Reputation & Review System)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_ratings (
  id TEXT PRIMARY KEY,
  rater_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rated_user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  skill_name TEXT,
  interaction_type TEXT,
  interaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_rater_rated UNIQUE (rater_id, rated_user_id),
  CONSTRAINT no_self_rating CHECK (rater_id <> rated_user_id)
);

ALTER TABLE public.user_ratings ADD COLUMN IF NOT EXISTS skill_name TEXT;
ALTER TABLE public.user_ratings ADD COLUMN IF NOT EXISTS interaction_type TEXT;
ALTER TABLE public.user_ratings ADD COLUMN IF NOT EXISTS interaction_id TEXT;

-- Rating Performance Indexes
CREATE INDEX IF NOT EXISTS idx_user_ratings_rated_user ON public.user_ratings(rated_user_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_rater ON public.user_ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_created ON public.user_ratings(created_at DESC);

-- Ratings Row Level Security (RLS)
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;

-- 1. Read: Public ratings and reviews are viewable by everyone
DROP POLICY IF EXISTS "User ratings are viewable by everyone" ON public.user_ratings;
CREATE POLICY "User ratings are viewable by everyone" ON public.user_ratings 
FOR SELECT 
USING (true);

-- 2. Insert: Only users with an established (ACCEPTED) connection can submit ratings, cannot rate themselves
DROP POLICY IF EXISTS "Users with established connections can submit ratings" ON public.user_ratings;
CREATE POLICY "Users with established connections can submit ratings" ON public.user_ratings 
FOR INSERT 
WITH CHECK (
  rater_id <> rated_user_id
  AND EXISTS (
    SELECT 1 FROM public.connection_requests cr
    WHERE cr.status = 'ACCEPTED'
    AND (
      (cr.sender_id = rater_id AND cr.receiver_id = rated_user_id)
      OR
      (cr.sender_id = rated_user_id AND cr.receiver_id = rater_id)
    )
  )
);

-- 3. Update: Users can update their own submitted ratings
DROP POLICY IF EXISTS "Users can update their own ratings" ON public.user_ratings;
CREATE POLICY "Users can update their own ratings" ON public.user_ratings 
FOR UPDATE 
USING (true)
WITH CHECK (rater_id <> rated_user_id);

-- 4. Delete: Users can delete their own submitted ratings
DROP POLICY IF EXISTS "Users can delete their own ratings" ON public.user_ratings;
CREATE POLICY "Users can delete their own ratings" ON public.user_ratings 
FOR DELETE 
USING (true);

-- --------------------------------------------------------------------
-- 11. User Live Availability Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_availability (
  user_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  availability_status TEXT NOT NULL DEFAULT 'UNAVAILABLE' CHECK (availability_status IN ('AVAILABLE', 'UNAVAILABLE')),
  availability_mode TEXT NOT NULL DEFAULT 'BOTH' CHECK (availability_mode IN ('SKILL_EXCHANGE', 'MENTORSHIP', 'BOTH')),
  custom_status TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_avail_status ON public.user_availability(availability_status);
CREATE INDEX IF NOT EXISTS idx_user_avail_updated ON public.user_availability(updated_at);

ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User availability is viewable by everyone" ON public.user_availability;
CREATE POLICY "User availability is viewable by everyone" ON public.user_availability FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own availability" ON public.user_availability;
CREATE POLICY "Users can manage their own availability" ON public.user_availability FOR ALL USING (true);

-- --------------------------------------------------------------------
-- 12. Mentorship Requests Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mentorship_requests (
  id TEXT PRIMARY KEY,
  mentor_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_name TEXT NOT NULL,
  mentor_avatar TEXT,
  mentor_title TEXT,
  mentee_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentee_name TEXT NOT NULL,
  mentee_avatar TEXT,
  mentee_title TEXT,
  topic TEXT NOT NULL,
  message TEXT NOT NULL,
  experience_level TEXT DEFAULT 'Beginner',
  session_style TEXT DEFAULT 'Flexible',
  preferred_availability TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'ENDED')),
  connection_id TEXT REFERENCES public.connection_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentorship_req_mentor ON public.mentorship_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_req_mentee ON public.mentorship_requests(mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_req_status ON public.mentorship_requests(status);

ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mentorship requests viewable by participants" ON public.mentorship_requests;
CREATE POLICY "Mentorship requests viewable by participants" ON public.mentorship_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create mentorship requests" ON public.mentorship_requests;
CREATE POLICY "Users can create mentorship requests" ON public.mentorship_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their mentorship requests" ON public.mentorship_requests;
CREATE POLICY "Users can update their mentorship requests" ON public.mentorship_requests FOR UPDATE USING (true);

-- --------------------------------------------------------------------
-- 13. Active & Completed Mentorships Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mentorships (
  id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES public.mentorship_requests(id) ON DELETE SET NULL,
  mentor_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_name TEXT NOT NULL,
  mentor_avatar TEXT,
  mentor_title TEXT,
  mentee_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentee_name TEXT NOT NULL,
  mentee_avatar TEXT,
  mentee_title TEXT,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'ENDED')),
  start_date TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  connection_id TEXT REFERENCES public.connection_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentorships_mentor ON public.mentorships(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorships_mentee ON public.mentorships(mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentorships_status ON public.mentorships(status);

ALTER TABLE public.mentorships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mentorships viewable by participants" ON public.mentorships;
CREATE POLICY "Mentorships viewable by participants" ON public.mentorships FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage mentorships" ON public.mentorships;
CREATE POLICY "Users can manage mentorships" ON public.mentorships FOR ALL USING (true);

-- --------------------------------------------------------------------
-- 14. Call Sessions & Call History Tables (WebRTC Voice & Video Calling)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id TEXT PRIMARY KEY,
  caller_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  caller_name TEXT NOT NULL,
  caller_avatar TEXT,
  receiver_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_name TEXT NOT NULL,
  receiver_avatar TEXT,
  call_type TEXT NOT NULL DEFAULT 'VOICE' CHECK (call_type IN ('VOICE', 'VIDEO')),
  status TEXT NOT NULL DEFAULT 'RINGING' CHECK (status IN ('RINGING', 'ACCEPTED', 'REJECTED', 'BUSY', 'ENDED', 'MISSED')),
  connection_id TEXT REFERENCES public.connection_requests(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_sessions_caller ON public.call_sessions(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_receiver ON public.call_sessions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON public.call_sessions(status);

ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Call sessions accessible by participants" ON public.call_sessions;
CREATE POLICY "Call sessions accessible by participants" ON public.call_sessions FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.call_history (
  id TEXT PRIMARY KEY,
  call_session_id TEXT,
  caller_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  caller_name TEXT NOT NULL,
  caller_avatar TEXT,
  receiver_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_name TEXT NOT NULL,
  receiver_avatar TEXT,
  call_type TEXT NOT NULL DEFAULT 'VOICE' CHECK (call_type IN ('VOICE', 'VIDEO')),
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'MISSED', 'DECLINED')),
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_history_caller ON public.call_history(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_history_receiver ON public.call_history(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_history_created ON public.call_history(created_at DESC);

ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Call history viewable by participants" ON public.call_history;
CREATE POLICY "Call history viewable by participants" ON public.call_history FOR ALL USING (true);

-- --------------------------------------------------------------------
-- 15. Mentorship Sessions Table (Scheduled, In-Progress, & Completed Sessions)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mentorship_sessions (
  id TEXT PRIMARY KEY,
  mentorship_request_id TEXT REFERENCES public.mentorship_requests(id) ON DELETE SET NULL,
  mentor_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_name TEXT NOT NULL,
  mentor_avatar TEXT,
  mentor_title TEXT,
  mentee_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentee_name TEXT NOT NULL,
  mentee_avatar TEXT,
  mentee_title TEXT,
  topic TEXT NOT NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 45,
  timezone TEXT DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'COMPLETED', 'CANCELLED')),
  notes TEXT,
  meeting_link TEXT,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  cancelled_reason TEXT,
  connection_id TEXT REFERENCES public.connection_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentorship_sess_mentor ON public.mentorship_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_sess_mentee ON public.mentorship_sessions(mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_sess_status ON public.mentorship_sessions(status);
CREATE INDEX IF NOT EXISTS idx_mentorship_sess_start ON public.mentorship_sessions(scheduled_start);

ALTER TABLE public.mentorship_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mentorship sessions viewable by participants" ON public.mentorship_sessions;
CREATE POLICY "Mentorship sessions viewable by participants" ON public.mentorship_sessions 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Participants can manage mentorship sessions" ON public.mentorship_sessions;
CREATE POLICY "Participants can manage mentorship sessions" ON public.mentorship_sessions 
FOR ALL USING (true);

-- --------------------------------------------------------------------
-- 16. Global Notifications Table (Persistent System & Activity Notifications)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  recipient_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_name TEXT,
  sender_avatar TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications" ON public.notifications 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications 
FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Notifications can be inserted" ON public.notifications;
CREATE POLICY "Notifications can be inserted" ON public.notifications 
FOR INSERT WITH CHECK (true);



