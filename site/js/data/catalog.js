// 가상 데이터의 정본(docs/data-model.md 2-1). 모든 값은 예시이며 실제 회사 · 가격이 아니다.

export const models = [
  { id: 'low', name: '보급형', costA: 200000 },
  { id: 'mid', name: '중급형', costA: 400000 },
  { id: 'high', name: '상급형', costA: 700000 },
];

export const grades = [
  { id: 'A', name: '등급 A', costPct: 100, short: '흠집 거의 없음' },
  { id: 'B', name: '등급 B', costPct: 75, short: '생활 흠집' },
];

// 등급 기준표 5항목(AC-23, AS-13)
export const gradeRules = [
  { item: '화면 흠집', A: '거의 없음', B: '가까이 보면 보이는 잔흠집' },
  { item: '외관 흠집', A: '거의 없음', B: '생활 흠집' },
  { item: '배터리 최대 용량', A: '85% 이상', B: '80% 이상' },
  { item: '검수 항목 수', A: '30항목', B: '30항목' },
  { item: '보증 기간', A: '6개월', B: '6개월' },
];

// 데이터 양은 표시용 가상값. 계산에 쓰지 않는다.
export const plans = [
  { id: 's', name: '데이터 적음', data: '7GB', fee: 9900 },
  { id: 'm', name: '보통', data: '15GB', fee: 15000 },
  { id: 'l', name: '데이터 많음', data: '100GB', fee: 25000 },
];

// 손잡이 4개, 정수 %(AC-05, ADR 0002)
export const defaultKnobs = Object.freeze({ feeRate: 114, dispRate: 30, returnRate: 90, lossRate: 5 });

export const knobRanges = Object.freeze({
  feeRate: { min: 50, max: 200 },
  dispRate: { min: 0, max: 80 },
  returnRate: { min: 0, max: 100 },
  lossRate: { min: 0, max: 100 },
});

export const knobLabels = Object.freeze({
  feeRate: '기기료율(24개월 기기료 합 ÷ 원가)',
  dispRate: '처분율(처분가 ÷ 원가)',
  returnRate: '회수율(반납 · 인수 비율)',
  lossRate: '미납 · 파손 손실률',
});

export const knobKeys = Object.freeze(['feeRate', 'dispRate', 'returnRate', 'lossRate']);

// 민감도 표 5행(AC-11, AS-16). 처분율 절반은 지금 손잡이 값의 절반(정수로 내림).
export const sensitivityCases = [
  { label: '지금 값', change: (k) => k },
  { label: '처분율 절반', change: (k) => ({ ...k, dispRate: Math.floor(k.dispRate / 2) }) },
  { label: '회수율 70%', change: (k) => ({ ...k, returnRate: 70 }) },
  { label: '손실률 15%', change: (k) => ({ ...k, lossRate: 15 }) },
  { label: '처분율 절반 + 회수율 70%', change: (k) => ({ ...k, dispRate: Math.floor(k.dispRate / 2), returnRate: 70 }) },
];

export const terms = Object.freeze({
  months: 24,
  salePct: 125, // ② 같은 리퍼폰 판매가 = 원가 × 125%, 무이자(AS-11)
  etfPct: 10, // 중도 해지 비용 = 남은 기기료의 10%(AS-10, D13)
  etfExampleMonthsUsed: 12,
  currentBillDefault: 35750, // 시장 중간값(AS-12, D3)
  currentBillMin: 0,
  currentBillMax: 200000,
});
