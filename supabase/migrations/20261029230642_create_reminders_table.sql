/*
# Create reminders table (per-user daily reading reminders)

1. New Tables
- `reminders`
  - `id` (uuid, primary key)
  - `user_id` (uuid, owner; defaults to the signed-in user and references auth.users)
  - `topic` (text, 1-40 characters) - the name shown in the reminder
  - `time_of_day` (time) - the hour the reminder fires
  - `start_date` (date) - first day the reminder applies
  - `recurring` (boolean) - true = every day, false = only on start_date
  - `end_date` (date, optional) - last day for recurring reminders; null = no end
  - `enabled` (boolean) - whether the reminder is active
  - `last_fired_date` (date, optional) - last day the reminder was shown, to avoid repeats
  - `created_at` (timestamptz)

2. Security
- Row level security enabled on `reminders`.
- Grants to `authenticated` only (the app requires sign-in).
- Four separate policies (select, insert, update, delete), each restricted to the owner via auth.uid().

3. Important Notes
- Rows are removed automatically when the owning account is deleted.
- Each user can only see and change their own reminders.
*/

CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL CHECK (char_length(topic) BETWEEN 1 AND 40),
  time_of_day time NOT NULL,
  start_date date NOT NULL,
  recurring boolean NOT NULL DEFAULT false,
  end_date date,
  enabled boolean NOT NULL DEFAULT true,
  last_fired_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reminders_end_after_start CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS reminders_user_id_idx ON reminders (user_id);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON reminders TO authenticated;

DROP POLICY IF EXISTS "select_own_reminders" ON reminders;
CREATE POLICY "select_own_reminders" ON reminders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_reminders" ON reminders;
CREATE POLICY "insert_own_reminders" ON reminders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_reminders" ON reminders;
CREATE POLICY "update_own_reminders" ON reminders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reminders" ON reminders;
CREATE POLICY "delete_own_reminders" ON reminders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
