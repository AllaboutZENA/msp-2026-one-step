// Small fetch wrapper for the 마감한칸 API: base URL, bearer token, timeout,
// and one error type the screens can show directly.
import { API_BASE_URL } from './health';
import type { Assignment, AssignmentDetail, AssignmentInput, User } from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T>(method: string, path: string, body?: unknown, timeoutMs = 10000): Promise<T> {
  if (!API_BASE_URL) throw new ApiError(0, 'API 주소가 설정되지 않았습니다 (EXPO_PUBLIC_API_BASE_URL)');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'AbortError';
    throw new ApiError(0, timedOut ? '서버 응답이 늦어요. 잠시 후 다시 시도해 주세요' : '서버에 연결할 수 없어요. 네트워크를 확인해 주세요');
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && authToken) onUnauthorized?.();
    throw new ApiError(res.status, data?.message ?? `요청 실패 (HTTP ${res.status})`, data?.fields ?? {});
  }
  return data as T;
}

interface AuthResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export const api = {
  signUp: (email: string, password: string, displayName?: string) =>
    request<AuthResponse>('POST', '/auth/signup', { email, password, displayName }),
  logIn: (email: string, password: string) => request<AuthResponse>('POST', '/auth/login', { email, password }),
  logOut: () => request<void>('POST', '/auth/logout'),
  me: () => request<{ user: User }>('GET', '/auth/me'),

  listAssignments: (status: 'open' | 'submitted' | 'all' = 'open') =>
    request<{ assignments: Assignment[] }>('GET', `/assignments?status=${status}`).then((r) => r.assignments),
  getAssignment: (id: string) =>
    request<{ assignment: AssignmentDetail }>('GET', `/assignments/${encodeURIComponent(id)}`).then((r) => r.assignment),
  createAssignment: (input: AssignmentInput) =>
    request<{ assignment: Assignment }>('POST', '/assignments', input).then((r) => r.assignment),
  updateAssignment: (id: string, patch: Partial<AssignmentInput> & { submitted?: boolean }) =>
    request<{ assignment: Assignment }>('PATCH', `/assignments/${encodeURIComponent(id)}`, patch).then((r) => r.assignment),
  deleteAssignment: (id: string) => request<void>('DELETE', `/assignments/${encodeURIComponent(id)}`),
};
