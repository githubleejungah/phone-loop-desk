// 금액 · 이익 계산은 모두 여기서만 한다(CLAUDE.md, docs/data-model.md 3절). 원 단위 정수.
import { models, grades, plans, knobRanges, knobKeys, sensitivityCases, terms } from '../data/catalog.js';

const M = terms.months;

export function findModel(id) { return models.find((m) => m.id === id); }
export function findGrade(id) { return grades.find((g) => g.id === id); }
export function findPlan(id) { return plans.find((p) => p.id === id); }

// AC-07: 등급 B 원가 = A × 75%
export function costOf(modelId, gradeId) {
  const m = findModel(modelId);
  const g = findGrade(gradeId);
  if (!m || !g) throw new Error(`unknown combo ${modelId}/${gradeId}`);
  return Math.round((m.costA * g.costPct) / 100);
}

// AC-08: 원가 × 기기료율 ÷ 24, 100원 단위 반올림. 분자를 정수로 두고 한 번만 나눈다.
export function monthlyDeviceFee(cost, knobs) {
  return Math.round((cost * knobs.feeRate) / (M * 100 * 100)) * 100;
}

// AC-09: 월 기기료 × 24 × (1 − 손실률) + 원가 × 처분율 × 회수율 − 원가, 마지막에 원 단위 반올림
export function profitPerCustomer(cost, knobs) {
  const fee = monthlyDeviceFee(cost, knobs);
  const deviceRevenue = (fee * M * (100 - knobs.lossRate)) / 100;
  const residual = (cost * knobs.dispRate * knobs.returnRate) / 10000;
  return Math.round(deviceRevenue + residual - cost);
}

// 6개 조합(AC-10 · AC-14 · AC-15)
export function combos(knobs) {
  const out = [];
  for (const m of models) {
    for (const g of grades) {
      const cost = costOf(m.id, g.id);
      const fee = monthlyDeviceFee(cost, knobs);
      const profit = profitPerCustomer(cost, knobs);
      out.push({ modelId: m.id, gradeId: g.id, model: m.name, grade: g.name, cost, fee, profit, deficit: profit < 0 });
    }
  }
  return out;
}

export function isAvailable(modelId, gradeId, knobs) {
  return profitPerCustomer(costOf(modelId, gradeId), knobs) >= 0;
}

// 인수 값 · ② 끝에 남는 폰 값(AC-25 · AC-33)
export function residualValue(cost, knobs) {
  return Math.round((cost * knobs.dispRate) / 100);
}

// 3열 총액(AC-26 · AC-28 · AC-29)
export function compareTotals({ modelId, gradeId, planId, currentBill, knobs }) {
  const cost = costOf(modelId, gradeId);
  const plan = findPlan(planId);
  if (!plan) throw new Error(`unknown plan ${planId}`);
  const fee = monthlyDeviceFee(cost, knobs);
  return {
    stay: currentBill * M,
    buy: Math.round((cost * terms.salePct) / 100) + plan.fee * M,
    subscribe: (fee + plan.fee) * M,
    buyLeftover: residualValue(cost, knobs),
    monthlySubscription: fee + plan.fee,
    fee,
  };
}

// AC-34: 12개월 쓰고 해지 → 남은 개월 × 월 기기료 × 10%
export function earlyTerminationExample(fee) {
  const remaining = M - terms.etfExampleMonthsUsed;
  return { monthsUsed: terms.etfExampleMonthsUsed, remaining, amount: Math.round((remaining * fee * terms.etfPct) / 100) };
}

// AC-11: 민감도 표 5행
export function sensitivity(cost, knobs) {
  return sensitivityCases.map((c) => {
    const k = c.change(knobs);
    return { label: c.label, knobs: k, profit: profitPerCustomer(cost, k) };
  });
}

const INT = /^\s*-?\d+\s*$/;

// AC-18: 정수이고 허용 범위 안이어야 받는다
export function validateKnob(name, text) {
  const r = knobRanges[name];
  if (!r) return { ok: false, reason: '알 수 없는 칸입니다' };
  const range = `${r.min}~${r.max} 사이 정수(%)`;
  const s = String(text ?? '').trim();
  if (s === '') return { ok: false, reason: `빈칸은 받지 않습니다. ${range}` };
  if (!INT.test(s)) return { ok: false, reason: `숫자(정수)만 받습니다. ${range}` };
  const v = Number(s);
  if (v < r.min || v > r.max) return { ok: false, reason: `범위 밖입니다. ${range}` };
  return { ok: true, value: v };
}

// AC-31: 지금 내는 월 요금 0~200,000원 정수
export function validateBill(text) {
  const range = `${won(terms.currentBillMin)}~${won(terms.currentBillMax)}원 사이 숫자`;
  const s = String(text ?? '').replace(/,/g, '').replace(/원$/, '').trim();
  if (s === '' || !INT.test(s)) return { ok: false, reason: `숫자만 받습니다. ${range}` };
  const v = Number(s);
  if (v < terms.currentBillMin || v > terms.currentBillMax) return { ok: false, reason: `범위 밖입니다. ${range}` };
  return { ok: true, value: v };
}

export function isValidKnobs(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return knobKeys.every((k) => Number.isInteger(obj[k]) && obj[k] >= knobRanges[k].min && obj[k] <= knobRanges[k].max);
}

// 화면 표시용 금액 글자. 음수는 진짜 빼기 기호(−).
export function won(n) {
  const s = Math.abs(n).toLocaleString('ko-KR');
  return n < 0 ? `−${s}` : s;
}
