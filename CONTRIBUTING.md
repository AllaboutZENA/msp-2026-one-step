# 기여와 기록 방법

실제 팀원은 각자 본인 GitHub 계정과 본인의 커밋 이름·이메일을 사용합니다. 원격 설정 전 계정과 저장소 소유자를 확인합니다.

1. Issue에 해결할 문제, 담당자, 완료 기준, 예정 주차를 적습니다.
2. 최신 develop에서 `codex/<작업명>` 브랜치를 만듭니다.
3. 한 가지 목적의 실제 변경을 커밋합니다. `feat:`, `fix:`, `docs:`, `test:`, `chore:` 등을 사용합니다.
4. PR base를 develop으로 선택하고 관련 Issue 번호, 변경 이유, 확인 결과를 적습니다.
5. 2명은 상대 팀원이 내용을 검토합니다. 1명은 자기 점검 후 병합하며 승인 1명 필수 규칙을 걸지 않습니다.
6. develop에서 완료 조건을 확인하고 Issue에 PR 링크를 남긴 뒤 닫습니다. Projects를 Done으로 갱신합니다.
7. 안정본 준비 시 develop → master PR을 따로 만들고 실제 실행·문서 상태를 확인합니다.

기본 브랜치를 master로 쓰면 develop 대상 PR 본문의 `Closes #번호`만으로 Issue가 자동 종료되지 않습니다. `관련 Issue: #번호`로 기록하고 통합·완료 기준 확인 후 수동으로 닫습니다. [GitHub 공식 설명](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue)

커밋 예시: `docs: 팀원 소개와 역할 추가`, `feat: 세부 작업 진행률 표시`, `fix: 작업이 없을 때 진행률 계산 수정`. [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)

주간 기록에는 실제 작업, Issue·PR 링크, 확인 결과, 어려웠던 점, 다음 주 계획을 씁니다. 코드·디자인·문서 기여를 구분하고 AI 보조를 사용했다면 생성·수정·검증 범위를 기록합니다. 팀원 대신 과거 활동이나 검증 결과를 만들어 넣지 않습니다.

API 키·비밀번호·학번·개인 대화 캡처는 저장소에 올리지 않습니다. `.gitignore`는 이미 커밋된 파일을 삭제하지 않으므로 커밋 전 변경 목록도 직접 확인합니다.
