-- 001_init: owner-scoped core tables (users → assignments → subtasks).
-- Draft schema for the EC2 PostgreSQL plan (PR #8). Auth columns are added
-- in a later migration once the auth method is decided.
-- Timestamps are timestamptz (stored as UTC); the app shows device-local time.

CREATE TABLE users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL CHECK (length(btrim(display_name)) > 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  course_name  text NOT NULL CHECK (length(btrim(course_name)) > 0),
  title        text NOT NULL CHECK (length(btrim(title)) > 0),
  due_at       timestamptz NOT NULL,
  memo         text,
  -- Set only when the user presses "제출 완료"; NULL again when undone.
  -- 100% subtask progress never sets this automatically.
  submitted_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Home list: a user's unsubmitted assignments ordered by due_at, created_at, id.
CREATE INDEX assignments_user_due_idx ON assignments (user_id, due_at, created_at, id);

CREATE TABLE subtasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments (id) ON DELETE CASCADE,
  title         text NOT NULL CHECK (length(btrim(title)) > 0),
  is_done       boolean NOT NULL DEFAULT false,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX subtasks_assignment_idx ON subtasks (assignment_id, sort_order);
