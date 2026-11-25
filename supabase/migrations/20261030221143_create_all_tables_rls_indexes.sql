/*
# Complete schema: all tables, RLS policies, admin functions, and performance indexes

1. Purpose
   Creates every table Sanctify needs with idempotent guards, enables RLS on all,
   defines per-user and admin-scoped policies, adds SECURITY DEFINER functions for
   privileged admin operations, and creates performance indexes for category filtering.

2. New Tables (all IF NOT EXISTS)
   - profiles, creator_profiles, creator_content, tracks, lectures,
     favorites, playlists, playlist_tracks, user_folders, folder_tracks,
     creator_notifications, admin_notifications, donations, creator_earnings,
     creator_analytics_daily, benefactor_sponsors

3. Security
   - RLS on every table. User-owned tables: 4 policies per CRUD verb scoped to auth.uid().
   - Public-read tables (tracks, published content/lectures): SELECT to anon+authenticated.
   - Join tables: ownership checked via parent.
   - Privilege columns (profiles.role, creator_profiles.status, creator_content.status)
     protected via column-level GRANT.
   - Admin operations via SECURITY DEFINER functions checking profiles.role = 'admin'.

4. Indexes
   - Category indexes on creator_content, tracks, lectures, user_folders.
   - Owner indexes on all user-owned tables.
   - Composite indexes on join tables.
*/

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles (role);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON profiles TO authenticated;
REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url) ON profiles TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =========================================================
-- CREATOR PROFILES
-- =========================================================
CREATE TABLE IF NOT EXISTS creator_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  ministry_name text,
  status text NOT NULL DEFAULT 'pending',
  agreed_terms_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creator_profiles_status_idx ON creator_profiles (status);

ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON creator_profiles TO authenticated;
REVOKE UPDATE (status) ON creator_profiles FROM authenticated;

DROP POLICY IF EXISTS "select_own_creator_profile" ON creator_profiles;
CREATE POLICY "select_own_creator_profile" ON creator_profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR status = 'approved');

DROP POLICY IF EXISTS "insert_own_creator_profile" ON creator_profiles;
CREATE POLICY "insert_own_creator_profile" ON creator_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_creator_profile" ON creator_profiles;
CREATE POLICY "update_own_creator_profile" ON creator_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =========================================================
-- CREATOR CONTENT
-- =========================================================
CREATE TABLE IF NOT EXISTS creator_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  artist text,
  category text NOT NULL DEFAULT 'music',
  subcategory text,
  file_url text,
  audio_url text,
  artwork_url text,
  bible_verse text,
  lyrics text,
  status text NOT NULL DEFAULT 'under_review',
  feedback text,
  duration integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creator_content_status_idx ON creator_content (status);
CREATE INDEX IF NOT EXISTS creator_content_category_idx ON creator_content (category);
CREATE INDEX IF NOT EXISTS creator_content_user_id_idx ON creator_content (user_id);
CREATE INDEX IF NOT EXISTS creator_content_creator_id_idx ON creator_content (creator_id);
CREATE INDEX IF NOT EXISTS creator_content_status_category_idx ON creator_content (status, category);

ALTER TABLE creator_content ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON creator_content TO authenticated;
REVOKE UPDATE (status, feedback) ON creator_content FROM authenticated;

DROP POLICY IF EXISTS "select_published_or_own_content" ON creator_content;
CREATE POLICY "select_published_or_own_content" ON creator_content FOR SELECT
  TO authenticated USING (
    status = 'published'
    OR user_id = auth.uid()
    OR creator_id = auth.uid()
  );

DROP POLICY IF EXISTS "insert_own_content" ON creator_content;
CREATE POLICY "insert_own_content" ON creator_content FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND status = 'under_review'
  );

DROP POLICY IF EXISTS "update_own_content" ON creator_content;
CREATE POLICY "update_own_content" ON creator_content FOR UPDATE
  TO authenticated USING (user_id = auth.uid() OR creator_id = auth.uid())
  WITH CHECK (user_id = auth.uid() OR creator_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_content" ON creator_content;
CREATE POLICY "delete_own_content" ON creator_content FOR DELETE
  TO authenticated USING (user_id = auth.uid() OR creator_id = auth.uid());

-- =========================================================
-- TRACKS (static catalog, read-only from app)
-- =========================================================
CREATE TABLE IF NOT EXISTS tracks (
  id text PRIMARY KEY,
  title text NOT NULL,
  artist text NOT NULL,
  album text,
  artwork_url text,
  audio_url text,
  category text NOT NULL DEFAULT 'music',
  duration integer DEFAULT 0,
  lyrics text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tracks_category_idx ON tracks (category);
CREATE INDEX IF NOT EXISTS tracks_artist_idx ON tracks (artist);
CREATE INDEX IF NOT EXISTS tracks_title_idx ON tracks (title);

ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON tracks TO anon, authenticated;

DROP POLICY IF EXISTS "select_all_tracks" ON tracks;
CREATE POLICY "select_all_tracks" ON tracks FOR SELECT
  TO anon, authenticated USING (true);

-- =========================================================
-- LECTURES
-- =========================================================
CREATE TABLE IF NOT EXISTS lectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content text,
  category text NOT NULL DEFAULT 'blog',
  artwork_url text,
  pdf_url text,
  audio_url text,
  document_url text,
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lectures_category_idx ON lectures (category);
CREATE INDEX IF NOT EXISTS lectures_status_idx ON lectures (status);
CREATE INDEX IF NOT EXISTS lectures_user_id_idx ON lectures (user_id);

ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON lectures TO authenticated;

DROP POLICY IF EXISTS "select_published_lectures" ON lectures;
CREATE POLICY "select_published_lectures" ON lectures FOR SELECT
  TO authenticated USING (status = 'published' OR user_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_lecture" ON lectures;
CREATE POLICY "insert_own_lecture" ON lectures FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- =========================================================
-- FAVORITES
-- =========================================================
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_id)
);

CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON favorites (user_id);
CREATE INDEX IF NOT EXISTS favorites_track_id_idx ON favorites (track_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON favorites TO authenticated;

DROP POLICY IF EXISTS "select_own_favorites" ON favorites;
CREATE POLICY "select_own_favorites" ON favorites FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_favorites" ON favorites;
CREATE POLICY "insert_own_favorites" ON favorites FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_favorites" ON favorites;
CREATE POLICY "update_own_favorites" ON favorites FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_favorites" ON favorites;
CREATE POLICY "delete_own_favorites" ON favorites FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- PLAYLISTS
-- =========================================================
CREATE TABLE IF NOT EXISTS playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  folder_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS playlists_user_id_idx ON playlists (user_id);

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON playlists TO authenticated;

DROP POLICY IF EXISTS "select_own_playlists" ON playlists;
CREATE POLICY "select_own_playlists" ON playlists FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_playlists" ON playlists;
CREATE POLICY "insert_own_playlists" ON playlists FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_playlists" ON playlists;
CREATE POLICY "update_own_playlists" ON playlists FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_playlists" ON playlists;
CREATE POLICY "delete_own_playlists" ON playlists FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- PLAYLIST TRACKS (join table)
-- =========================================================
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (playlist_id, track_id)
);

CREATE INDEX IF NOT EXISTS playlist_tracks_playlist_id_idx ON playlist_tracks (playlist_id);
CREATE INDEX IF NOT EXISTS playlist_tracks_track_id_idx ON playlist_tracks (track_id);

ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON playlist_tracks TO authenticated;

DROP POLICY IF EXISTS "select_playlist_tracks_own" ON playlist_tracks;
CREATE POLICY "select_playlist_tracks_own" ON playlist_tracks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_tracks.playlist_id AND playlists.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_playlist_tracks_own" ON playlist_tracks;
CREATE POLICY "insert_playlist_tracks_own" ON playlist_tracks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_tracks.playlist_id AND playlists.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_playlist_tracks_own" ON playlist_tracks;
CREATE POLICY "update_playlist_tracks_own" ON playlist_tracks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_tracks.playlist_id AND playlists.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_tracks.playlist_id AND playlists.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_playlist_tracks_own" ON playlist_tracks;
CREATE POLICY "delete_playlist_tracks_own" ON playlist_tracks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_tracks.playlist_id AND playlists.user_id = auth.uid())
  );

-- =========================================================
-- USER FOLDERS
-- =========================================================
CREATE TABLE IF NOT EXISTS user_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES user_folders(id) ON DELETE CASCADE,
  color text DEFAULT '#3CC8F5',
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_folders_user_id_idx ON user_folders (user_id);
CREATE INDEX IF NOT EXISTS user_folders_category_idx ON user_folders (category);
CREATE INDEX IF NOT EXISTS user_folders_parent_id_idx ON user_folders (parent_id);

ALTER TABLE user_folders ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON user_folders TO authenticated;

DROP POLICY IF EXISTS "select_own_folders" ON user_folders;
CREATE POLICY "select_own_folders" ON user_folders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_folders" ON user_folders;
CREATE POLICY "insert_own_folders" ON user_folders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_folders" ON user_folders;
CREATE POLICY "update_own_folders" ON user_folders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_folders" ON user_folders;
CREATE POLICY "delete_own_folders" ON user_folders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- FOLDER TRACKS (join table with position)
-- =========================================================
CREATE TABLE IF NOT EXISTS folder_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES user_folders(id) ON DELETE CASCADE,
  track_id text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (folder_id, track_id)
);

CREATE INDEX IF NOT EXISTS folder_tracks_folder_id_idx ON folder_tracks (folder_id);
CREATE INDEX IF NOT EXISTS folder_tracks_track_id_idx ON folder_tracks (track_id);
CREATE INDEX IF NOT EXISTS folder_tracks_position_idx ON folder_tracks (folder_id, position);

ALTER TABLE folder_tracks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON folder_tracks TO authenticated;

DROP POLICY IF EXISTS "select_folder_tracks_own" ON folder_tracks;
CREATE POLICY "select_folder_tracks_own" ON folder_tracks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_folders WHERE user_folders.id = folder_tracks.folder_id AND user_folders.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_folder_tracks_own" ON folder_tracks;
CREATE POLICY "insert_folder_tracks_own" ON folder_tracks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM user_folders WHERE user_folders.id = folder_tracks.folder_id AND user_folders.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_folder_tracks_own" ON folder_tracks;
CREATE POLICY "update_folder_tracks_own" ON folder_tracks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_folders WHERE user_folders.id = folder_tracks.folder_id AND user_folders.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_folders WHERE user_folders.id = folder_tracks.folder_id AND user_folders.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_folder_tracks_own" ON folder_tracks;
CREATE POLICY "delete_folder_tracks_own" ON folder_tracks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_folders WHERE user_folders.id = folder_tracks.folder_id AND user_folders.user_id = auth.uid())
  );

-- =========================================================
-- CREATOR NOTIFICATIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS creator_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sponsor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'general',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creator_notifications_recipient_id_idx ON creator_notifications (recipient_id);
CREATE INDEX IF NOT EXISTS creator_notifications_creator_id_idx ON creator_notifications (creator_id);
CREATE INDEX IF NOT EXISTS creator_notifications_read_idx ON creator_notifications (read);

ALTER TABLE creator_notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON creator_notifications TO authenticated;
REVOKE UPDATE (title, message, type, recipient_id, creator_id, sponsor_id) ON creator_notifications FROM authenticated;
GRANT UPDATE (read) ON creator_notifications TO authenticated;

DROP POLICY IF EXISTS "select_own_creator_notifications" ON creator_notifications;
CREATE POLICY "select_own_creator_notifications" ON creator_notifications FOR SELECT
  TO authenticated USING (recipient_id = auth.uid() OR creator_id = auth.uid());

DROP POLICY IF EXISTS "insert_creator_notifications" ON creator_notifications;
CREATE POLICY "insert_creator_notifications" ON creator_notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_creator_notifications" ON creator_notifications;
CREATE POLICY "update_own_creator_notifications" ON creator_notifications FOR UPDATE
  TO authenticated USING (recipient_id = auth.uid() OR creator_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid() OR creator_id = auth.uid());

-- =========================================================
-- ADMIN NOTIFICATIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'general',
  reference_id text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_notifications_read_idx ON admin_notifications (read);
CREATE INDEX IF NOT EXISTS admin_notifications_type_idx ON admin_notifications (type);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON admin_notifications TO authenticated;
REVOKE UPDATE (title, message, type, reference_id) ON admin_notifications FROM authenticated;
GRANT UPDATE (read) ON admin_notifications TO authenticated;

DROP POLICY IF EXISTS "select_admin_notifications_admin_only" ON admin_notifications;
CREATE POLICY "select_admin_notifications_admin_only" ON admin_notifications FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_admin_notifications_any_auth" ON admin_notifications;
CREATE POLICY "insert_admin_notifications_any_auth" ON admin_notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_admin_notifications_admin_only" ON admin_notifications;
CREATE POLICY "update_admin_notifications_admin_only" ON admin_notifications FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- =========================================================
-- DONATIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  message text,
  thanked boolean NOT NULL DEFAULT false,
  thanked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS donations_user_id_idx ON donations (user_id);
CREATE INDEX IF NOT EXISTS donations_created_at_idx ON donations (created_at);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON donations TO authenticated;
REVOKE UPDATE (thanked, thanked_at, amount, user_id) ON donations FROM authenticated;

DROP POLICY IF EXISTS "select_all_donations" ON donations;
CREATE POLICY "select_all_donations" ON donations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_donation" ON donations;
CREATE POLICY "insert_own_donation" ON donations FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- =========================================================
-- CREATOR EARNINGS
-- =========================================================
CREATE TABLE IF NOT EXISTS creator_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  source text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creator_earnings_creator_id_idx ON creator_earnings (creator_id);
CREATE INDEX IF NOT EXISTS creator_earnings_created_at_idx ON creator_earnings (created_at);

ALTER TABLE creator_earnings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON creator_earnings TO authenticated;

DROP POLICY IF EXISTS "select_own_earnings" ON creator_earnings;
CREATE POLICY "select_own_earnings" ON creator_earnings FOR SELECT
  TO authenticated USING (creator_id = auth.uid());

-- =========================================================
-- CREATOR ANALYTICS DAILY
-- =========================================================
CREATE TABLE IF NOT EXISTS creator_analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  plays integer NOT NULL DEFAULT 0,
  unique_listeners integer NOT NULL DEFAULT 0,
  followers_gained integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, date)
);

CREATE INDEX IF NOT EXISTS creator_analytics_daily_creator_id_idx ON creator_analytics_daily (creator_id);
CREATE INDEX IF NOT EXISTS creator_analytics_daily_date_idx ON creator_analytics_daily (date);

ALTER TABLE creator_analytics_daily ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON creator_analytics_daily TO authenticated;

DROP POLICY IF EXISTS "select_own_analytics" ON creator_analytics_daily;
CREATE POLICY "select_own_analytics" ON creator_analytics_daily FOR SELECT
  TO authenticated USING (creator_id = auth.uid());

-- =========================================================
-- BENEFACTOR SPONSORS
-- =========================================================
CREATE TABLE IF NOT EXISTS benefactor_sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sponsor_name text,
  monthly_amount numeric NOT NULL DEFAULT 0,
  joined_date timestamptz NOT NULL DEFAULT now(),
  tier text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS benefactor_sponsors_creator_id_idx ON benefactor_sponsors (creator_id);

ALTER TABLE benefactor_sponsors ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON benefactor_sponsors TO authenticated;

DROP POLICY IF EXISTS "select_own_sponsors" ON benefactor_sponsors;
CREATE POLICY "select_own_sponsors" ON benefactor_sponsors FOR SELECT
  TO authenticated USING (creator_id = auth.uid());

-- =========================================================
-- REMINDERS (already exists — ensure indexes)
-- =========================================================
CREATE INDEX IF NOT EXISTS reminders_user_id_idx ON reminders (user_id);

-- =========================================================
-- ADMIN SECURITY DEFINER FUNCTIONS
-- =========================================================

CREATE OR REPLACE FUNCTION approve_creator(p_creator_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE creator_profiles SET status = 'approved' WHERE id = p_creator_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION approve_creator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION approve_creator(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION publish_content(p_content_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE creator_content SET status = 'published', feedback = NULL, updated_at = now()
  WHERE id = p_content_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION publish_content(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION publish_content(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION reject_content(p_content_id uuid, p_feedback text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE creator_content SET status = 'draft', feedback = p_feedback, updated_at = now()
  WHERE id = p_content_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION reject_content(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reject_content(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION thank_donation(p_donation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE donations SET thanked = true, thanked_at = now() WHERE id = p_donation_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION thank_donation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION thank_donation(uuid) TO authenticated;
