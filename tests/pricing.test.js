// 계산 규칙 시험. 기대값은 pricing.js를 쓰지 않고 이 파일에서 따로 셈한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultKnobs, models, plans } from '../site/js/data/catalog.js';
import {
  costOf, monthlyDeviceFee, profitPerCustomer, combos, compareTotals, residualValue,
  earlyTerminationExample, sensitivity, validateKnob, validateBill, isValidKnobs, won,
} from '../site/js/core/pricing.js';

const K = defaultKnobs;
const CASE2 = { ...K, feeRate: 84, dispRate: 20 };

// 따로 셈하기: BigInt로 정확히 계산(반올림 경계 확인용)
function feeRef(cost, rate) {
  const num = BigInt(cost) * BigInt(rate); // 원가 × 기기료율
  const den = 240000n; // 24 × 100 × 100
  const q = num / den; const r = num % den;
  return Number(r * 2n >= den ? q + 1n : q) * 100;
}

test('ac05 손잡이 기본값 4개', () => {
  assert.deepEqual({ ...K }, { feeRate: 114, dispRate: 30, returnRate: 90, lossRate: 5 });
});

test('ac06 조합 6개 · 요금제 3개', () => {
  assert.equal(combos(K).length, 6);
  assert.equal(plans.length, 3);
  assert.equal(models.length, 3);
});

test('ac07 등급 B 원가 = A × 75%', () => {
  assert.equal(costOf('mid', 'A'), 400000);
  assert.equal(costOf('mid', 'B'), 300000);
  assert.equal(costOf('high', 'B'), 525000);
});

test('ac08 월 기기료 100원 반올림 · 정수(경계 14,250 → 14,300)', () => {
  assert.equal(monthlyDeviceFee(400000, K), 19000);
  assert.equal(monthlyDeviceFee(300000, K), 14300);
  for (const c of combos(K)) {
    assert.equal(c.fee, feeRef(c.cost, K.feeRate));
    assert.ok(Number.isInteger(c.fee));
  }
  for (let rate = 50; rate <= 200; rate++) {
    for (const cost of [150000, 200000, 300000, 400000, 525000, 700000]) {
      assert.equal(monthlyDeviceFee(cost, { ...K, feeRate: rate }), feeRef(cost, rate), `cost ${cost} rate ${rate}`);
    }
  }
});

test('ac09 고객당 기기 이익 식', () => {
  assert.equal(profitPerCustomer(400000, K), 141200);
  // 456,000 × 0.95 + 400,000 × 0.3 × 0.9 − 400,000
  assert.equal(profitPerCustomer(400000, K), 433200 + 108000 - 400000);
});

test('ac11 민감도 표 5행', () => {
  const rows = sensitivity(400000, K);
  assert.equal(rows.length, 5);
  // 2차 기획안 민감도 표(14.1만 · 8.7만 · 11.7만 · 9.6만 · 7.5만)와 같은 값
  assert.deepEqual(rows.map((r) => r.profit), [141200, 87200, 117200, 95600, 75200]);
});

test('ac14 · ac15 기본값에서는 적자 0개', () => {
  assert.equal(combos(K).filter((c) => c.deficit).length, 0);
});

test('ac17 사례 2: 중급형 A −8,800원, 6개 모두 적자', () => {
  assert.equal(profitPerCustomer(400000, CASE2), -8800);
  assert.equal(combos(CASE2).filter((c) => c.deficit).length, 6);
  assert.equal(won(-8800), '−8,800');
});

test('ac18 손잡이 입력 검사', () => {
  assert.deepEqual(validateKnob('feeRate', '84'), { ok: true, value: 84 });
  for (const bad of ['', '  ', 'abc', '12.5', '49', '201', '1e2']) {
    assert.equal(validateKnob('feeRate', bad).ok, false, bad);
  }
  assert.equal(validateKnob('dispRate', '81').ok, false);
  assert.equal(validateKnob('lossRate', '0').ok, true);
  assert.match(validateKnob('feeRate', '300').reason, /50~200/);
});

test('ac26 · ac28 · ac29 · ac30 사례 1: 중급형 A · 보통', () => {
  const t = compareTotals({ modelId: 'mid', gradeId: 'A', planId: 'm', currentBill: 35750, knobs: K });
  assert.equal(t.stay, 858000);
  assert.equal(t.buy, 860000);
  assert.equal(t.subscribe, 816000);
  assert.equal(t.monthlySubscription, 34000);
});

test('ac31 지금 내는 요금 검사', () => {
  assert.deepEqual(validateBill('35,750'), { ok: true, value: 35750 });
  assert.deepEqual(validateBill('0'), { ok: true, value: 0 });
  for (const bad of ['', '-1', '200001', '삼만', '3.5']) assert.equal(validateBill(bad).ok, false, bad);
});

test('ac33 인수 값 = 원가 × 처분율', () => {
  assert.equal(residualValue(400000, K), 120000);
});

test('ac34 해지 비용 예시 12개월', () => {
  assert.deepEqual(earlyTerminationExample(19000), { monthsUsed: 12, remaining: 12, amount: 22800 });
});

test('저장값 검사: 정수 · 범위', () => {
  assert.equal(isValidKnobs(K), true);
  assert.equal(isValidKnobs({ ...K, feeRate: 114.5 }), false);
  assert.equal(isValidKnobs({ ...K, dispRate: 90 }), false);
  assert.equal(isValidKnobs(null), false);
});
