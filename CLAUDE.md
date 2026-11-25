# 작업 규칙 — phone-loop-desk

## 스택 (ADR 0001)
- 정적 HTML · CSS · JavaScript(ES 모듈), 빌드 없음. GitHub Pages.
- 시험: Node 기본 시험 도구(`node --test`).

## 규칙
- 데이터는 모두 가상. 실제 회사 이름 · 고객 · 가격 금지. 공개본에 지원 회사 이름 · 브랜드 이름을 쓰지 않는다('알뜰폰 회사'). 가리지 않은 원문은 저장소 밖 지원 폴더에 둔다.
- 순서: 요구(docs/requirements.md) 확인 → 아키텍처 · 데이터 · 흐름 설계 승인 → 코드.
- 숫자는 근거(인터뷰 답 A · 문서 D · 관찰 O · 추론 I)를 단다. 근거 없는 숫자는 가정 표에 질문으로 올린다.
- 손익 · 가격 계산은 한 모듈에만 둔다. 화면에 보이는 금액과 다시 계산한 금액이 같은지 시험한다.
- 되풀이되는 곳(이의 제기 · 미납 안내 · 재시도)은 끝나는 조건을 둔다.
- 해지 · 반납 버튼을 숨기지 않는다. 제3자 제공 동의는 선택으로 둔다.
- 구조 · 데이터 · 흐름이 바뀌면 같은 커밋에서 docs/도 고친다.
- push · 배포는 사용자 승인 뒤. Pages 배포는 올리기와 배포를 다른 작업으로 나눈다.

## 자주 쓰는 명령
- 요구 문서 검사: `python "C:/dev/workspace-igm/self study/ref-project/sdd/99_toolchain/01_automation/doc_lint.py" ears docs/requirements.md --strict`
- 시험: `node --test tests/`
- 로컬 보기: `python -m http.server 8797 --directory site` → http://localhost:8797
- 공개 전 회사 이름 검사: 저장소 밖 지원 폴더 스크립트(ADR 0003)
