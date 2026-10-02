# 3주차 개발 기록 — 개발 환경과 서버 구성 확정

기간: 2026-10-02 (수업 주차는 강의계획서 확인 전, 계획상 3주차 범위) · 작성자: 박초원 / AllaboutZENA · 도구: Claude Code 보조

## 이번 주 목표

- 9/30 인수인계 기준으로 맥북 개발 환경을 갖추고, 앱·API 최소 실행 골격으로 앱 → API → DB 흐름을 확인한다.
- SQLite 초기안과 EC2 API + PostgreSQL 방향의 문서 충돌을 정리한다.
- 주차별 GitHub 마일스톤(W01–W10)과 진행 대시보드를 만든다.

## 실제 수행한 작업

| 작업 | 담당자 | Issue | PR·커밋 | 상태 |
| --- | --- | --- | --- | --- |
| EC2 API·PostgreSQL 구성안 검토·병합 | 박초원 | — | [#8](https://github.com/AllaboutZENA/msp-2026-one-step/pull/8) | 완료 |
| Node 24 LTS · Xcode iOS 18.3 시뮬레이터 · PostgreSQL 18 설치 | 박초원 | [#5](https://github.com/AllaboutZENA/msp-2026-one-step/issues/5) | 이 PR | 완료(로컬) |
| Expo SDK 57 앱 골격 (연결 상태 첫 화면) | 박초원 | [#5](https://github.com/AllaboutZENA/msp-2026-one-step/issues/5) | 이 PR | 완료(시뮬레이터) |
| Express API `/health`, `/health/db` + 테스트 5개 | 박초원 | [#5](https://github.com/AllaboutZENA/msp-2026-one-step/issues/5) | 이 PR | 완료(로컬) |
| users → assignments → subtasks 마이그레이션 초안 | 박초원 | [#4](https://github.com/AllaboutZENA/msp-2026-one-step/issues/4) | 이 PR | 초안 |
| README·Wiki의 SQLite/서버 제외 문구 정리 | 박초원 | [#4](https://github.com/AllaboutZENA/msp-2026-one-step/issues/4) | 이 PR | 완료 |
| GitHub 마일스톤 W01–W10 생성, Issue·PR 연결 | 박초원 | — | — | 완료 |
| min2030 저장소 접근 확인 | 박초원 | [#6](https://github.com/AllaboutZENA/msp-2026-one-step/issues/6) | — | 완료(write) |
| AWS 로그인·계정 제약 확인 (시드니만 허용, Free plan 크레딧) | 박초원 | — | 서버 PR | 완료 |
| EC2 t3.micro·PostgreSQL 18·API systemd 구성, 재부팅·백업 복원 검증 | 박초원 | — | 서버 PR | 완료(HTTPS 제외) |

## 확인과 배운 점

- 실행 환경·수행 절차: macOS 15.3.2, iPhone 16 시뮬레이터(iOS 18.3), Expo Go 57.0.9. 절차와 명령은 [세팅 기록](../setup/pc-setup-2026-10-02.md).
- 실제 확인 결과와 증빙: 시뮬레이터 첫 화면에서 API 응답 정상, PostgreSQL 18.6 표시([화면](../setup/img/2026-10-02-ios-simulator.png)). DB 중지 시 `/health/db` 503, 재시작 후 200.
- 이해한 핵심 코드·설계 이유: API는 `127.0.0.1`에만 바인딩하고 외부 노출은 Nginx가 담당한다. 시뮬레이터는 맥 네트워크를 공유해 `localhost`로 접근하지만 실제 휴대폰은 그렇지 않다. `EXPO_PUBLIC_*`는 앱에 포함되므로 비밀 값을 넣지 않는다.
- 어려웠던 점과 해결 또는 남은 문제: iOS 시뮬레이터 런타임이 없어 8.7GB를 내려받았다. Expo Go 첫 실행 때 URL 열기가 한 번 시간 초과됐고 재시도로 해결했다. AWS CLI 로그인은 콘솔 세션이 시드니 로그인 도메인이라 서울 주소로는 세션 선택이 되지 않았고, `--region ap-southeast-2`로 해결했다. 서버 빌드 단계는 앱 사용자 권한 문제로 한 번 실패해 스크립트를 수정했다.
- AI 등 도구 도움과 직접 수정·검증한 범위: 코드·문서·설치·검증 명령은 Claude Code가 박초원의 요청과 승인 아래 작성·실행했다. 실행 결과는 위 증빙으로 확인했으며, 팀원 개인 실습을 대신하지 않는다.

## 다음 주 계획

- HTTPS 도메인 결정 후 Nginx 443 구성, 실제 휴대폰에서 서버 연결(W04).
- 화면 4개 스케치와 인증 방식 결정(#4), 실제 휴대폰 첫 화면·로컬 알림 실험(#5).
- 학생 3–5명 인터뷰(#3).
