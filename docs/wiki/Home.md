# 마감한칸 Wiki

대학생이 과제를 작은 할 일로 나누고 마감과 진행률을 확인하는 개인용 모바일 앱입니다. Expo 앱과 EC2의 Node API·PostgreSQL로 구성합니다. 2026-10 중간 발표 기준으로 로그인과 과제 등록·조회·수정·삭제·제출, 과목 필터가 EC2 HTTPS 서버에서 동작합니다. 세부 작업·알림 구현과 사용자 검증은 진행 전입니다.

- [요구사항](https://github.com/AllaboutZENA/msp-2026-one-step/wiki/Requirements): 대상 사용자, 핵심 기능, 완료 기준
- [구조 설계](https://github.com/AllaboutZENA/msp-2026-one-step/wiki/Architecture): 화면과 데이터 구조, 동작 규칙
- [서버 구성안](Server-Plan.md): EC2 t3.micro 한 대의 API·DB 운영 계획
- [API 명세](API.md): 인증·과제 엔드포인트와 오류 형식
- [테스트 계획](https://github.com/AllaboutZENA/msp-2026-one-step/wiki/Test%E2%80%90Plan): 구현 후 확인할 시나리오

## 문서 관리

저장소의 `docs/wiki/`에 원본을 보관합니다. 설계 변경은 Issue와 PR로 검토한 뒤 Wiki에도 반영합니다. 회의·인터뷰·테스트 결과는 실제 수행 후 기록합니다.

## 아직 확인할 내용

팀 인원·실명·역할, 수업 README_sample 원본, 기준 테스트 기기와 기술 경험을 확인한 뒤 계획을 조정합니다.
