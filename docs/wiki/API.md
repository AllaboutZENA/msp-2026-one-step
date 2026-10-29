# API 명세 — v1 (2026-10-29, 세부 작업 추가)

기준 주소: 로컬 `http://localhost:3000`, EC2는 HTTPS 주소(공개 저장소에는 적지 않음).
모든 요청·응답은 JSON입니다. 날짜는 시간대가 포함된 ISO 8601(UTC 저장)이며 앱이 기기 현지 시간으로 표시합니다.

## 인증

이메일·비밀번호 로그인 후 받은 토큰을 `Authorization: Bearer <token>` 헤더로 보냅니다. 토큰은 30일 뒤 만료되고 로그아웃 시 즉시 무효가 됩니다.

| 메서드 | 경로 | 본문 | 성공 | 실패 |
| --- | --- | --- | --- | --- |
| POST | `/auth/signup` | `{email, password, displayName?}` | 201 `{token, expiresAt, user}` | 400 입력 오류, 409 이미 가입 |
| POST | `/auth/login` | `{email, password}` | 200 `{token, expiresAt, user}` | 401 (이메일 없음·비밀번호 틀림 동일 메시지) |
| POST | `/auth/logout` | — | 204 | 401 |
| GET | `/auth/me` | — | 200 `{user}` | 401 |

비밀번호 8–128자, 이메일은 대소문자 구분 없이 하나의 계정입니다.

## 과제 (로그인 필요)

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/assignments?status=open\|submitted\|all` | 기본 `open`(미제출): `dueAt` → `createdAt` → `id` 순. `submitted`는 제출 시각 최신순 |
| POST | `/assignments` | `{courseName, title, dueAt, memo?}` → 201 |
| GET | `/assignments/:id` | 과제 + `subtasks` 배열 |
| PATCH | `/assignments/:id` | 바꿀 항목만: `courseName`, `title`, `dueAt`, `memo`, `submitted`(true/false) |
| DELETE | `/assignments/:id` | 204, 세부 작업 함께 삭제 |

과제 객체:

```json
{
  "id": "uuid",
  "courseName": "모바일 SW",
  "title": "주간 보고서 작성",
  "dueAt": "2026-10-20T14:59:00.000Z",
  "memo": null,
  "submittedAt": null,
  "createdAt": "…",
  "updatedAt": "…",
  "progress": { "done": 1, "total": 3, "percent": 33 }
}
```

- 다른 사용자의 과제 ID, 잘못된 형식의 ID는 모두 **404**로 응답합니다(존재 여부를 드러내지 않음).
- `submitted: true`는 처음 제출 시각을 유지하고, `false`는 제출 기록을 지웁니다. 진행률 100%가 되어도 자동 제출되지 않습니다.
- 지연 여부는 앱이 `submittedAt == null && dueAt < 현재 시각`으로 표시합니다.

## 세부 작업 (로그인 필요)

과제가 로그인한 사용자의 것이어야 합니다. 아니면 과제·세부 작업 모두 404입니다. 변경 응답에는 다시 계산한 과제 진행률이 들어 있어 앱이 바로 반영합니다.

| 메서드 | 경로 | 본문 | 성공 |
| --- | --- | --- | --- |
| POST | `/assignments/:id/subtasks` | `{title}` (1–200자) | 201 `{subtask, progress}`, 맨 뒤에 추가 |
| PATCH | `/assignments/:id/subtasks/:subtaskId` | `{title?, isDone?}` | 200 `{subtask, progress}` |
| DELETE | `/assignments/:id/subtasks/:subtaskId` | — | 200 `{progress}` |

```json
{ "subtask": { "id": "uuid", "title": "자료 조사", "isDone": true, "sortOrder": 0 },
  "progress": { "done": 1, "total": 3, "percent": 33 } }
```

- 과제당 최대 100개(초과 시 400). 진행률 = 완료 ÷ 전체 × 100 반올림, 0개면 0%.
- 진행률이 100%가 되어도 `submittedAt`은 바뀌지 않습니다.

## 오류 형식

```json
{ "status": "error", "message": "입력값을 확인해 주세요", "fields": { "title": "제목을(를) 입력해 주세요" } }
```

| 코드 | 의미 |
| --- | --- |
| 400 | 입력 오류 (`fields`에 항목별 메시지), JSON 형식 오류 |
| 401 | 로그인 필요·토큰 만료 |
| 404 | 없는 과제 또는 다른 사용자의 과제 |
| 409 | 이미 가입된 이메일 |
| 500 | 예상하지 못한 서버 오류(DB 중단 등). 내부 정보 없이 "서버에 일시적인 문제가 생겼어요…" 안내 |
| 503 | 서버에 DB 미설정 |


