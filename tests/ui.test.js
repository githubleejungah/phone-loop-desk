// 화면 그리기 함수(HTML 글자)를 Node에서 검사한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { defaultKnobs, models, grades, plans } from '../site/js/data/catalog.js';
import { renderOps } from '../site/js/ui/ops.js';
import { initialOnboarding, reduce, reconcile, renderOnboarding, STEPS } from '../site/js/ui/onboarding.js';

const K = defaultKnobs;
const CASE2 = { ...K, feeRate: 84, dispRate: 20 };
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const count = (s, re) => (s.match(re) || []).length;

function walk(actions, knobs = K, st = initialOnboarding()) {
  for (const a of actions) st = reduce(st, a, knobs);
  return st;
}
const pick = (m, g, p) => [{ type: 'pick-combo', modelId: m, gradeId: g }, { type: 'pick-plan', planId: p }];
const toStep = (n, m = 'mid', g = 'A', p = 'm') => walk([...pick(m, g, p), ...Array(n - 1).fill({ type: 'next' })]);

// 따로 셈하기(화면 금액 대조용, pricing.js 안 씀)
function refTotals(costA, gradePct, planFee, bill, k) {
  const cost = costA * gradePct / 100;
  const fee = Math.round(cost * k.feeRate / 240000) * 100;
  return { stay: bill * 24, buy: cost * 1.25 + planFee * 24, subscribe: (fee + planFee) * 24 };
}
const fmt = (n) => `${Math.round(n).toLocaleString('ko-KR')}원`;

test('ac01 역할 버튼 2개', () => {
  const html = read('../site/index.html');
  assert.equal(count(html, /data-role="/g), 2);
  assert.match(html, /data-role="customer"/);
  assert.match(html, /data-role="ops"/);
});

test('ac02 손님 화면에 내부 숫자 0개(모든 단계)', () => {
  for (let n = 1; n <= 4; n++) {
    const html = renderOnboarding(toStep(n), K);
    for (const word of ['원가', '처분율', '회수율', '손실률', '기기료율']) assert.ok(!html.includes(word), `${n}단계 ${word}`);
    assert.ok(!html.includes('400,000'), `${n}단계 원가 금액`);
  }
});

test('ac03 가상 데이터 안내 1줄', () => {
  const html = read('../site/index.html');
  assert.equal(count(html, /data-demo-note/g), 1);
  assert.match(html, /가상 데이터 시연입니다/);
});

test('ac10 · ac14 계산기 6행, 기본값 적자 0 · 사례 2 적자 6', () => {
  const a = renderOps({ knobs: K });
  assert.equal(count(a.split('data-table="profit"')[1].split('</table>')[0], /<tr class=/g), 6);
  assert.equal(count(a, /data-deficit/g), 0);
  const b = renderOps({ knobs: CASE2 });
  assert.equal(count(b, /data-deficit/g), 6);
  assert.match(b, /−8,800/);
});

test('ac11 민감도 표 5행', () => {
  const html = renderOps({ knobs: K, selected: { modelId: 'mid', gradeId: 'A' } });
  const body = html.split('data-table="sensitivity"')[1].split('<tbody>')[1].split('</tbody>')[0];
  assert.equal(count(body, /<tr/g), 5);
});

test('ac13 18개 경우 손님 화면 금액 = 따로 셈한 금액', () => {
  let n = 0;
  for (const m of models) for (const g of grades) for (const p of plans) {
    const html = renderOnboarding(toStep(2, m.id, g.id, p.id), K);
    const ref = refTotals(m.costA, g.costPct, p.fee, 35750, K);
    assert.match(html, new RegExp(`data-col="stay">${fmt(ref.stay)}<`));
    assert.match(html, new RegExp(`data-col="buy">${fmt(ref.buy)}<`));
    assert.match(html, new RegExp(`data-col="subscribe">${fmt(ref.subscribe)}<`));
    n++;
  }
  assert.equal(n, 18);
});

test('ac15 적자 조합은 준비 중 · 못 고름', () => {
  // 모든 폰이 같은 비율 손잡이를 써서 보통은 6개가 함께 바뀐다. 100원 반올림 경계에서만 일부가 갈린다.
  const knobs = { ...K, feeRate: 56, dispRate: 52 }; // 중급형 A · 상급형 A만 적자
  const st = initialOnboarding();
  const html = renderOnboarding(st, knobs);
  const soldout = count(html, /data-soldout/g);
  assert.equal(soldout, 2);
  assert.match(html, /data-model="mid" data-grade="A" aria-pressed="false" disabled data-soldout/);
  assert.equal(count(html, /준비 중/g), soldout);
  const after = reduce(st, { type: 'pick-combo', modelId: 'low', gradeId: 'B' }, CASE2);
  assert.equal(after.modelId, null);
});

test('ac16 6개 모두 적자면 안내 · 요금제만 가입', () => {
  const html = renderOnboarding(initialOnboarding(), CASE2);
  assert.equal(count(html, /지금 가입할 수 있는 폰이 없습니다/g), 1);
  assert.match(html, /요금제만 가입/);
});

test('고른 조합이 준비 중이 되면 고르기로 1번 돌아감(flows F3)', () => {
  const st = walk([...pick('mid', 'A', 'm'), { type: 'next' }, { type: 'next' }, { type: 'next' }, { type: 'toggle-consent', key: 'terms' }]);
  assert.equal(st.step, 4);
  const r = reconcile(st, CASE2);
  assert.equal(r.step, 1);
  assert.equal(r.modelId, null);
  assert.equal(r.consents.terms, false);
  assert.match(r.notice, /준비 중/);
  assert.deepEqual(reconcile(r, CASE2), r); // 되풀이 없음
});

test('ac22 5단계', () => {
  assert.deepEqual(STEPS, ['고르기', '24개월 총액 비교', '계약 규칙 미리 보기', '동의', '완료']);
  assert.equal(count(renderOnboarding(initialOnboarding(), K), /<li/g) >= 5, true);
});

test('ac23 · ac24 등급 기준표 5항목 · 3줄', () => {
  const html = renderOnboarding(initialOnboarding(), K);
  const body = html.split('data-table="grade-rules"')[1].split('<tbody>')[1].split('</tbody>')[0];
  assert.equal(count(body, /<tr>/g), 5);
  const notes = html.split('data-grade-notes')[1].split('</ul>')[0];
  assert.equal(count(notes, /<li>/g), 3);
  assert.match(notes, /정상 사용 흠집은 비용이 없습니다/);
});

test('ac25 · ac27 · ac30 비교표 3열 2줄, 기본 요금 35,750원, 사례 1', () => {
  const html = renderOnboarding(toStep(2), K);
  const table = html.split('data-table="compare"')[1].split('</table>')[0];
  assert.equal(count(table, /<th scope="col"/g), 3);
  assert.equal(count(table, /data-row="/g), 2);
  assert.match(html, /value="35,750"/);
  assert.match(table, /858,000원/);
  assert.match(table, /860,000원/);
  assert.match(table, /816,000원/);
});

test('ac31 잘못된 요금은 받지 않고 바로 전 값 유지', () => {
  const st = reduce(toStep(2), { type: 'set-bill', text: '999999' }, K);
  assert.equal(st.currentBill, 35750);
  assert.ok(st.billError);
  assert.match(renderOnboarding(st, K), /field-error/);
});

test('ac32 · ac33 · ac34 · ac35 미리 보기', () => {
  const html = renderOnboarding(toStep(3), K);
  assert.equal(count(html.split('data-end-options')[1].split('</ul>')[0], /<li[ >]/g), 3);
  assert.match(html, /data-buyout>120,000원/);
  assert.match(html, /22,800원/);
  assert.equal(count(html, /data-guide="cancel-return"/g), 1);
  assert.ok(!/<details/.test(html));
});

test('ac45 교체 때 기종 · 등급 다시 고르기와 새 폰 기준 기기료 2가지', () => {
  const html = renderOnboarding(toStep(3), K);
  const swap = html.split('data-swap>')[1].split('</li>')[0];
  assert.match(swap, /data-swap-pick>기종 · 등급을 다시 고를 수 있습니다/);
  assert.match(swap, /data-swap-fee>월 기기료는 새 폰 기준/);
});

test('ac36 이름 · 전화 · 주소 입력칸 0개', () => {
  for (let n = 1; n <= 4; n++) {
    const html = renderOnboarding(toStep(n), K);
    assert.equal(count(html, /<input[^>]*type="text"/g), n === 2 ? 1 : 0);
    assert.ok(!/이름을|전화번호를|주소를|type="tel"|type="email"/.test(html));
  }
});

test('ac37 · ac38 동의 필수 2 · 선택 2, 선택은 처음 꺼짐', () => {
  const html = renderOnboarding(toStep(4), K);
  assert.equal(count(html, /\[필수\]/g), 2);
  assert.equal(count(html, /\[선택\]/g), 2);
  assert.equal(count(html, /checked/g), 0);
});

test('ac39 · ac40 · ac41 가입 신청 버튼', () => {
  let st = toStep(4);
  assert.match(renderOnboarding(st, K), /data-action="submit" disabled/);
  assert.match(renderOnboarding(st, K), /data-missing>빠진 필수 동의/);
  assert.equal(reduce(st, { type: 'submit', applicationNo: 'DEMO-1' }, K).step, 4);
  st = walk([{ type: 'toggle-consent', key: 'terms' }, { type: 'toggle-consent', key: 'notice' }], K, st);
  assert.doesNotMatch(renderOnboarding(st, K), /data-action="submit" disabled/);
  st = reduce(st, { type: 'submit', applicationNo: 'DEMO-123456' }, K);
  assert.equal(st.step, 5);
  const done = renderOnboarding(st, K);
  assert.match(done, /data-app-no>DEMO-123456/);
  assert.match(done, /data-monthly>34,000원/);
  assert.equal(count(done, /data-guide="cancel-return"/g), 1);
});

test('ac42 색 토큰', () => {
  const css = read('../site/css/style.css');
  for (const c of ['#4326F6', '#3617CE', '#E8E4FF']) assert.ok(css.includes(c), c);
});

test('ac43 글자 대비 4.5:1 이상', () => {
  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const pairs = [
    ['#111111', '#FFFFFF'], ['#111111', '#F7F7FA'], ['#595D75', '#FFFFFF'], ['#595D75', '#F7F7FA'],
    ['#595D75', '#E8E4FF'], ['#3617CE', '#FFFFFF'], ['#3617CE', '#E8E4FF'], ['#FFFFFF', '#4326F6'],
    ['#B42318', '#FFFFFF'], ['#B42318', '#FDECEC'], ['#0E7E76', '#FFFFFF'], ['#3A3A45', '#C9C9D3'], ['#595D75', '#F2F2F5'],
  ];
  for (const [fg, bg] of pairs) assert.ok(ratio(fg, bg) >= 4.5, `${fg} on ${bg}: ${ratio(fg, bg).toFixed(2)}`);
});

test('글자 이스케이프: 화면에 꺾쇠 주입 불가', () => {
  const st = { ...toStep(5 - 1), step: 5, applicationNo: '<img src=x>' };
  assert.ok(!renderOnboarding(st, K).includes('<img'));
});
