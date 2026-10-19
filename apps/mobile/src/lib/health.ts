// API base URL comes from EXPO_PUBLIC_API_BASE_URL (apps/mobile/.env.local).
// EXPO_PUBLIC_* values are bundled into the app: never put secrets here.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') || undefined;

export type CheckResult =
  | { state: 'ok'; detail: string }
  | { state: 'error'; detail: string }
  | { state: 'unconfigured'; detail: string };

async function getJson(path: string, timeoutMs = 5000): Promise<{ status: number; body: any }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { signal: controller.signal });
    return { status: res.status, body: await res.json().catch(() => null) };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkApi(): Promise<CheckResult> {
  if (!API_BASE_URL) return { state: 'unconfigured', detail: 'EXPO_PUBLIC_API_BASE_URL 미설정' };
  try {
    const { status, body } = await getJson('/health');
    return status === 200 && body?.status === 'ok'
      ? { state: 'ok', detail: '응답 정상' }
      : { state: 'error', detail: `HTTP ${status}` };
  } catch (err) {
    return { state: 'error', detail: err instanceof Error && err.name === 'AbortError' ? '시간 초과' : '연결 실패' };
  }
}

export async function checkDb(): Promise<CheckResult> {
  if (!API_BASE_URL) return { state: 'unconfigured', detail: 'API 주소 미설정' };
  try {
    const { status, body } = await getJson('/health/db');
    if (status === 200 && body?.status === 'ok') return { state: 'ok', detail: `PostgreSQL ${body.postgres}` };
    if (body?.status === 'unconfigured') return { state: 'unconfigured', detail: '서버에 DATABASE_URL 미설정' };
    return { state: 'error', detail: `HTTP ${status}` };
  } catch {
    return { state: 'error', detail: 'API 연결 실패' };
  }
}
