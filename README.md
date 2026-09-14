# 마감한칸

대학생이 과제를 작은 할 일로 나누고 마감과 진행률을 확인하는 개인용 모바일 앱입니다.

> 상태: 기획 초안. 앱 코드는 아직 구현하지 않았습니다. 수업의 README_sample.md 원본을 받으면 항목과 형식을 대조하여 수정합니다.

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

1. 과목명을 포함한 과제 등록·수정·삭제와 기기 내부 저장.
2. 과제별 세부 작업 체크와 진행률 계산. 과제 제출 완료는 별도 표시.
3. 마감순 조회·지연 표시·완료 목록과 로컬 알림.

알림은 실제 기기 실험 후 확정합니다. 로그인, 서버, 학교 LMS 연동, 공동편집, AI 자동 계획은 이번 범위에 포함하지 않습니다.

## Tech Stack — 제안

React Native · Expo · TypeScript · SQLite · GitHub Issues / Projects / Wiki

팀의 기존 기술 경험과 테스트 기기를 확인한 뒤 확정합니다. 설치된 의존성과 지원 플랫폼은 개발 착수 후 기록합니다.

## Run

현재는 기획·협업 준비 파일만 있으며 실행할 앱이 없습니다. 첫 실행이 확인된 뒤 이 항목에 Node.js·패키지 버전, 설치·실행 명령, 테스트 기기, 시연 데이터를 추가합니다. 환경 변수는 현재 사용하지 않습니다.

## Roadmap

| 기간 | 목표 |
| --- | --- |
| 1~2주 | 팀·주제·저장소 구성 |
| 3~4주 | 사용자 확인·화면·데이터 설계·기기 실험 |
| 5~8주 | 과제 등록·저장·수정·삭제와 중간 시연 |
| 9~10주 | 세부 작업·진행률·마감·알림 |
| 11~13주 | 테스트·사용성 확인·개선 |
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
