# 폰 순환 구독 데스크 (시제품)

알뜰폰 손님이 **검수한 리퍼폰 + 요금제**를 매달 한 번에 내고 24개월을 쓰고, 끝나면 폰을 돌려주는 상품을 가정한 시제품입니다.

| 화면 | 누가 | 하는 일 |
|---|---|---|
| 가입 온보딩 | 손님 | 폰 · 등급 · 요금제 고르기, 24개월 총액 비교, 계약 끝 선택지 미리 보기 |
| 손익 계산기 | 상품 · 운영 담당자 | 원가 · 월 기기료 · 처분가 · 회수율 · 미납률을 바꾸며 고객당 이익과 민감도 보기 |

- 데이터는 모두 가상입니다. 실제 회사 · 고객 · 가격이 아닙니다.
- 알뜰폰 회사의 서비스 기획자 지원용 개인 프로젝트입니다. 문서 초안 · 코드는 Claude(AI)와 함께 만들었습니다.
- 시연: https://githubleejungah.github.io/phone-loop-desk/
- 상태: 화면 2개 구현 · 시험 41개 통과(2026-11-25).

## 실행법

빌드 없는 정적 페이지입니다(ADR 0001). Node 20 이상 · Python 3이 있으면 됩니다.

```
node --test tests/
python -m http.server 8797 --directory site
```

- 두 번째 명령 뒤 http://localhost:8797 을 엽니다.
- 시연 순서: [docs/flows.md](docs/flows.md) F4.

## 문서

| 문서 | 위치 |
|---|---|
| 요구(원문 · 인터뷰 · 가정 · 수용 기준) | [docs/requirements.md](docs/requirements.md) |
| 아키텍처 | [docs/architecture.md](docs/architecture.md) |
| 데이터 설계 | [docs/data-model.md](docs/data-model.md) |
| 흐름 설계 | [docs/flows.md](docs/flows.md) |
| 설계 결정 기록 | [docs/adr/](docs/adr/) |
| 작업 규칙 | [CLAUDE.md](CLAUDE.md) |

## 연락처

이메일: [veryfar@naver.com](mailto:veryfar@naver.com)
