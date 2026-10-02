# 마감한칸

대학생이 과제를 작은 할 일로 나누고 마감과 진행률을 확인하는 개인용 모바일 앱입니다.

> 상태: 개발 환경 세팅 단계. `apps/mobile`(Expo)과 `apps/api`(Express) 최소 실행 골격만 있으며 핵심 기능은 아직 구현하지 않았습니다. 수업의 README_sample.md 원본을 받으면 항목과 형식을 대조하여 수정합니다.

## Team Members

팀명: one-step (가칭) · 저장소명: `msp-2026-one-step`

저장소 소유 계정: [AllaboutZENA](https://github.com/AllaboutZENA). 팀 인원·실명·역할은 확인 후 아래 표를 갱신합니다.

| 이름 | GitHub | 담당 역할 | 실제 익숙한 기술 |
| --- | --- | --- | --- |
| [팀원 A] | [GitHub ID] | 과제 목록·등록·수정·저장 — 제안 | [본인 입력] |
| [팀원 B, 2인일 때] | [GitHub ID] | 세부 작업·진행률·마감·알림 — 제안 | [본인 입력] |

1인 팀이면 두 번째 행을 삭제합니다. 학번·개인 연락처·로그인 정보는 저장소에 적지 않습니다.

## Target User & Problem

대상은 여러 과목의 과제와 발표 준비를 관리하는 대학생입니다. 마감일만 적었을 때 남은 작업을 파악하기 어렵다는 가설에서 출발합니다. 실제 사용자 확인은 예정되어 있으며 결과에 따라 요구사항을 수정합니다.

## Core Features — 계획

1. 과목명을 포함한 과제 등록·조회·수정·삭제와 서버(PostgreSQL) 저장.
2. 과제별 세부 작업 체크와 진행률 계산. 과제 제출 완료는 별도 표시.
3. 마감순 조회·지연 표시·완료 목록과 로컬 알림.

알림은 휴대폰의 로컬 알림이며 서버 푸시와 구분합니다. 실제 기기 실험 후 확정합니다. 공용 서버 DB를 쓰므로 최소 사용자 인증과 소유자별 접근 검사를 포함합니다(인증 방식은 3–4주차 결정). 학교 LMS 연동, AI 자동 계획, 채팅, 결제, 공동편집, 다중 기기 실시간 동기화, 앱스토어 출시는 이번 범위에 포함하지 않습니다.

## Tech Stack

| 구분 | 기술 | 비고 |
| --- | --- | --- |
| 모바일 | React Native · Expo SDK 57 · TypeScript | `apps/mobile`, 개발은 맥북 iOS 시뮬레이터 + Expo Go |
| API | Node.js 24 LTS · Express 5 · TypeScript | `apps/api`, 내부 `127.0.0.1:3000` |
| DB | PostgreSQL 18 | 서버는 EC2의 PostgreSQL, 로컬 개발은 Homebrew PostgreSQL 18 |
| 서버 | AWS EC2 t3.micro 1대 (시드니) · systemd · Nginx HTTPS 예정 | [Server-Plan](docs/wiki/Server-Plan.md) · [구성 기록](docs/infra/ec2-dev-server.md) |
| 협업 | GitHub Issues / Projects / Wiki | |

초기안의 기기 내부 SQLite 저장은 EC2 API + PostgreSQL 구성으로 바뀌었습니다. 모바일 → HTTPS Nginx → 내부 Node API → 같은 EC2의 PostgreSQL 순서로 연결하며 API·DB 포트는 인터넷에 공개하지 않습니다.

## Run

개발 환경 상세와 검증 기록: [docs/setup/pc-setup-2026-10-02.md](docs/setup/pc-setup-2026-10-02.md)

필요 도구: Node.js 24 LTS, npm, Xcode + iOS 시뮬레이터, PostgreSQL(로컬 개발용). 루트에서 `npm run install:all`, `npm run api`, `npm run ios`, `npm run check`로 줄여 실행할 수 있습니다.

```bash
# 1) 의존성 설치
npm --prefix apps/api install
npm --prefix apps/mobile install

# 2) 환경 변수 (실제 값은 커밋하지 않음)
cp apps/api/.env.example apps/api/.env              # DATABASE_URL 입력
cp apps/mobile/.env.example apps/mobile/.env.local  # EXPO_PUBLIC_API_BASE_URL

# 3) 로컬 DB 준비 (최초 1회)
createdb magam_hankan_dev
npm --prefix apps/api run db:migrate
npm --prefix apps/api run db:seed      # 합성 테스트 데이터

# 4) 실행 (터미널 2개)
npm --prefix apps/api run dev          # http://127.0.0.1:3000/health
npm --prefix apps/mobile run ios       # iOS 시뮬레이터에서 Expo Go로 열기

# 5) 검사
npm --prefix apps/api run typecheck && npm --prefix apps/api test
npm --prefix apps/mobile run typecheck
```

EC2 개발 서버 사용법(SSH 터널, 배포 명령)은 [docs/infra/ec2-dev-server.md](docs/infra/ec2-dev-server.md)에 있습니다.

iOS 시뮬레이터는 맥의 네트워크를 공유하므로 `http://localhost:3000`으로 로컬 API에 접근합니다. 실제 휴대폰에서 `localhost`는 휴대폰 자신이므로 맥의 LAN IP나 EC2 HTTPS 주소를 사용합니다. `EXPO_PUBLIC_*` 값은 앱에 포함되므로 비밀번호·키를 넣지 않습니다.

## Roadmap

| 기간 | 목표 |
| --- | --- |
| 1~2주 | 팀·주제·저장소 구성 |
| 3~4주 | 사용자 확인·화면·데이터 설계·기기 실험·AWS 접속과 API/DB 연결 검증 |
| 5~7주 | 과제 등록·조회·수정·삭제와 서버(API·DB) 연결 |
| 8주 | 휴대폰 → API → DB 중간 시연 |
| 9~10주 | 세부 작업·진행률·마감·알림 |
| 11~13주 | 통합·인증/접근 권한·사용성·오류/복구 검증과 개선 |
| 14~15주 | 안정본·문서·최종 발표 |

## GitHub 운영

- `master`: 발표·시연 가능한 안정 상태와 검토된 문서.
- `develop`: 다음 안정본을 위한 개발 통합.
- `codex/<작업명>`: Issue 단위 작업 브랜치 예시.
- Commit: Conventional Commits. 예: `feat: 과제 등록 기능 추가`.
- 작업은 Issue, 진행은 Projects, 설계 문서는 Wiki로 관리합니다.
- 개발용 PR의 base는 develop으로 선택합니다. 안정본 반영은 develop → master PR로 진행합니다.

[기여 방법](CONTRIBUTING.md) · [Wiki 원본](docs/wiki/Home.md) · [주간 기록 틀](docs/weekly/TEMPLATE.md)

## 프로젝트 링크

- Repository: [msp-2026-one-step](https://github.com/AllaboutZENA/msp-2026-one-step)
- Projects: [마감한칸 개발 보드](https://github.com/users/AllaboutZENA/projects/3)
- Wiki: [설계 문서](https://github.com/AllaboutZENA/msp-2026-one-step/wiki)
- Demo / Release: [실제 준비 후 입력]

개인 기여와 AI 보조 사용은 실제 작업·수정·검증 내역에 맞춰 [기여 기록 틀](docs/contributions/TEMPLATE.md)에 기록합니다.

## 초기 설정 현황

2026-09-14: AllaboutZENA 계정에서 Codex의 도움으로 저장소, master·develop, 문서·템플릿, Wiki 4개 페이지, Issue 5개, Projects 보드와 주차·우선순위 필드를 준비했습니다. 초기 설정 PR은 [#1](https://github.com/AllaboutZENA/msp-2026-one-step/pull/1)입니다.

아직 필요한 항목은 [제출 준비 Issue #6](https://github.com/AllaboutZENA/msp-2026-one-step/issues/6)에서 관리합니다. 팀 정보 확인, 수업 원본 양식 대조, 팀원·교수자 접근, 학생 개인별 PR 실습, 폼·LMS 제출은 완료 확인 전입니다.
