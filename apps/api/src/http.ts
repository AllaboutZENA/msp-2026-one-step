// Shared HTTP error type and small input validators. Validation errors carry
// per-field Korean messages so the app can show them next to the inputs.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Body = Record<string, unknown>;

export function asBody(value: unknown): Body {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new HttpError(400, '요청 본문은 JSON 객체여야 합니다');
  }
  return value as Body;
}

export class Validator {
  readonly errors: Record<string, string> = {};

  constructor(private body: Body) {}

  has(key: string): boolean {
    return this.body[key] !== undefined;
  }

  text(key: string, label: string, { required = true, max = 200 } = {}): string | null | undefined {
    const raw = this.body[key];
    if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
      if (required) this.errors[key] = `${label}을(를) 입력해 주세요`;
      return raw === undefined ? undefined : null;
    }
    if (typeof raw !== 'string') {
      this.errors[key] = `${label}은(는) 문자열이어야 합니다`;
      return undefined;
    }
    const value = raw.trim();
    if (value.length > max) this.errors[key] = `${label}은(는) ${max}자 이하로 입력해 주세요`;
    return value;
  }

  // ISO 8601 with an explicit offset (e.g. 2026-10-20T14:59:00.000Z), so the
  // stored instant never depends on the server's time zone.
  instant(key: string, label: string, { required = true } = {}): Date | undefined {
    const raw = this.body[key];
    if (raw === undefined || raw === null || raw === '') {
      if (required) this.errors[key] = `${label}을(를) 입력해 주세요`;
      return undefined;
    }
    if (typeof raw !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(raw) || Number.isNaN(Date.parse(raw))) {
      this.errors[key] = `${label}은(는) 시간대가 포함된 ISO 8601 날짜여야 합니다`;
      return undefined;
    }
    return new Date(raw);
  }

  bool(key: string, label: string): boolean | undefined {
    const raw = this.body[key];
    if (raw === undefined) return undefined;
    if (typeof raw !== 'boolean') {
      this.errors[key] = `${label}은(는) true 또는 false여야 합니다`;
      return undefined;
    }
    return raw;
  }

  done(): void {
    if (Object.keys(this.errors).length) throw new HttpError(400, '입력값을 확인해 주세요', this.errors);
  }
}
