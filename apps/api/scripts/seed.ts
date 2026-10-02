// Inserts synthetic demo data for local development only. Never put real
// student data here. Fixed ids make the script safe to re-run.
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set (see apps/api/.env.example)');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed demo data when NODE_ENV=production');
  process.exit(1);
}

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

const users = [
  { id: '00000000-0000-4000-8000-000000000001', name: '테스트 사용자 A' },
  { id: '00000000-0000-4000-8000-000000000002', name: '테스트 사용자 B' },
];
const assignments = [
  { id: '10000000-0000-4000-8000-000000000001', user: users[0].id, course: '모바일 SW', title: '주간 보고서 작성', due: now + 2 * DAY },
  { id: '10000000-0000-4000-8000-000000000002', user: users[0].id, course: '자료구조', title: '실습 3 제출', due: now - DAY },
  { id: '10000000-0000-4000-8000-000000000003', user: users[1].id, course: '데이터베이스', title: 'ERD 초안', due: now + 5 * DAY },
];
const subtasks = [
  { id: '20000000-0000-4000-8000-000000000001', assignment: assignments[0].id, title: '자료 조사', done: true, order: 0 },
  { id: '20000000-0000-4000-8000-000000000002', assignment: assignments[0].id, title: '초안 작성', done: false, order: 1 },
  { id: '20000000-0000-4000-8000-000000000003', assignment: assignments[0].id, title: '검토 후 제출', done: false, order: 2 },
];

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query('BEGIN');
  for (const u of users) {
    await client.query(
      'INSERT INTO users (id, display_name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
      [u.id, u.name],
    );
  }
  for (const a of assignments) {
    await client.query(
      `INSERT INTO assignments (id, user_id, course_name, title, due_at)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
      [a.id, a.user, a.course, a.title, new Date(a.due)],
    );
  }
  for (const s of subtasks) {
    await client.query(
      `INSERT INTO subtasks (id, assignment_id, title, is_done, sort_order)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
      [s.id, s.assignment, s.title, s.done, s.order],
    );
  }
  await client.query('COMMIT');
  console.log(`ensured ${users.length} users, ${assignments.length} assignments, ${subtasks.length} subtasks (synthetic)`);
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  await client.end();
}
