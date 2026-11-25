// 가입 온보딩(손님 화면). 상태 바꾸기 · 그리기 모두 순수 함수(docs/flows.md F1 · F3).
import { plans, gradeRules, terms } from '../data/catalog.js';
import {
  combos, isAvailable, compareTotals, earlyTerminationExample, residualValue, costOf,
  validateBill, won, findModel, findGrade, findPlan,
} from '../core/pricing.js';
import { esc } from './html.js';

export const STEPS = ['고르기', '24개월 총액 비교', '계약 규칙 미리 보기', '동의', '완료'];

export const CONSENTS = [
  { key: 'terms', label: '서비스 이용약관', required: true },
  { key: 'notice', label: '중요사항(총액 · 계약 끝 선택지 · 해지 비용) 확인', required: true },
  { key: 'marketing', label: '마케팅 정보 받기', required: false },
  { key: 'thirdParty', label: '제휴사에 정보 제공', required: false },
];

export function initialOnboarding() {
  return {
    step: 1,
    modelId: null,
    gradeId: null,
    planId: null,
    currentBill: terms.currentBillDefault,
    billError: null,
    billDraft: null,
    consents: { terms: false, notice: false, marketing: false, thirdParty: false },
    applicationNo: null,
    notice: null,
  };
}

export function missingRequired(st) {
  return CONSENTS.filter((c) => c.required && !st.consents[c.key]).map((c) => c.label);
}

function hasCombo(st) { return st.modelId && st.gradeId; }

// 손잡이가 바뀐 뒤 한 번 맞추기(F3). 고른 조합이 준비 중이면 고르기로 1번 돌아간다.
export function reconcile(st, knobs) {
  if (st.step === 5 || !hasCombo(st)) return st;
  if (isAvailable(st.modelId, st.gradeId, knobs)) return st;
  return {
    ...st,
    step: 1,
    modelId: null,
    gradeId: null,
    consents: { ...initialOnboarding().consents },
    notice: '고르신 폰이 지금 준비 중입니다. 다시 골라 주세요.',
  };
}

export function reduce(st, action, knobs) {
  switch (action.type) {
    case 'pick-combo':
      if (!isAvailable(action.modelId, action.gradeId, knobs)) return st;
      return { ...st, modelId: action.modelId, gradeId: action.gradeId, notice: null };
    case 'pick-plan':
      return findPlan(action.planId) ? { ...st, planId: action.planId } : st;
    case 'next': {
      if (st.step === 1 && !(hasCombo(st) && st.planId && isAvailable(st.modelId, st.gradeId, knobs))) return st;
      if (st.step >= 4) return st;
      return { ...st, step: st.step + 1, notice: null };
    }
    case 'prev':
      return st.step > 1 && st.step < 5 ? { ...st, step: st.step - 1 } : st;
    case 'set-bill': {
      const r = validateBill(action.text);
      return r.ok
        ? { ...st, currentBill: r.value, billError: null, billDraft: null }
        : { ...st, billError: r.reason, billDraft: null }; // 바로 전 값 유지(AC-31)
    }
    case 'toggle-consent':
      if (!(action.key in st.consents)) return st;
      return { ...st, consents: { ...st.consents, [action.key]: !st.consents[action.key] } };
    case 'submit':
      if (st.step !== 4 || missingRequired(st).length) return st;
      return { ...st, step: 5, applicationNo: action.applicationNo };
    case 'restart':
      return initialOnboarding();
    default:
      return st;
  }
}

function stepper(step) {
  return `<ol class="stepper" aria-label="가입 단계">${STEPS.map((s, i) =>
    `<li${i + 1 === step ? ' aria-current="step" class="current"' : ''}${i + 1 < step ? ' class="done"' : ''}>${i + 1}. ${esc(s)}</li>`).join('')}</ol>`;
}

function nav(st, canNext, nextLabel = '다음') {
  return `<div class="nav">
    ${st.step > 1 ? '<button type="button" class="secondary" data-action="prev">이전</button>' : '<span></span>'}
    <button type="button" class="primary" data-action="next"${canNext ? '' : ' disabled'}>${esc(nextLabel)}</button>
  </div>`;
}

const returnGuide = `<div class="guide" data-guide="cancel-return">
  <h4>해지 · 반납 방법</h4>
  <p>해지와 반납은 가입한 곳과 같은 화면에서 언제든 신청할 수 있습니다. 회수 상자를 보내 드리고, 받은 폰은 가입 때 본 등급 기준으로 확인합니다.</p>
</div>`;

function renderNone() {
  return `<div class="empty" data-empty>
    <p class="empty-title">지금 가입할 수 있는 폰이 없습니다.</p>
    <p>요금제만 가입: 폰 없이 요금제만 쓰시려면 일반 요금제 가입으로 이어집니다(이 시제품 범위 밖).</p>
  </div>`;
}

function renderStep1(st, knobs) {
  const list = combos(knobs);
  const cards = list.map((c) => {
    const sel = c.modelId === st.modelId && c.gradeId === st.gradeId;
    const g = findGrade(c.gradeId);
    return `<button type="button" class="card${sel ? ' selected' : ''}" data-action="pick-combo" data-model="${c.modelId}" data-grade="${c.gradeId}" aria-pressed="${sel}"${c.deficit ? ' disabled data-soldout' : ''}>
      <span class="card-title">${esc(c.model)} · ${esc(c.grade)}</span>
      <span class="card-sub">${esc(g.short)}</span>
      ${c.deficit ? '<span class="soldout">준비 중</span>' : `<span class="card-price">월 기기료 ${won(c.fee)}원</span>`}
    </button>`;
  }).join('');
  const planCards = plans.map((p) => {
    const sel = p.id === st.planId;
    return `<button type="button" class="card${sel ? ' selected' : ''}" data-action="pick-plan" data-plan="${p.id}" aria-pressed="${sel}">
      <span class="card-title">${esc(p.name)}</span><span class="card-sub">${esc(p.data)}</span>
      <span class="card-price">월 ${won(p.fee)}원</span></button>`;
  }).join('');
  const rules = gradeRules.map((r) => `<tr><th scope="row">${esc(r.item)}</th><td>${esc(r.A)}</td><td>${esc(r.B)}</td></tr>`).join('');
  const canNext = !!(hasCombo(st) && st.planId);
  return `${st.notice ? `<p class="notice" role="status">${esc(st.notice)}</p>` : ''}
    <h3>폰 · 등급</h3>
    <div class="cards cards-3">${cards}</div>
    <h4>등급 기준</h4>
    <div class="table-wrap"><table data-table="grade-rules"><thead><tr><th>항목</th><th>등급 A</th><th>등급 B</th></tr></thead><tbody>${rules}</tbody></table></div>
    <ul class="checks" data-grade-notes>
      <li>사람이 검수함</li>
      <li>분실 · 도난 확인 완료</li>
      <li>반납 때도 이 기준으로 봅니다. 정상 사용 흠집은 비용이 없습니다</li>
    </ul>
    <h3>요금제</h3>
    <div class="cards cards-3">${planCards}</div>
    ${nav(st, canNext)}`;
}

function renderStep2(st, knobs) {
  const t = compareTotals({ ...st, knobs });
  const plan = findPlan(st.planId);
  const salePrice = Math.round((costOf(st.modelId, st.gradeId) * terms.salePct) / 100);
  const val = st.billDraft ?? st.currentBill.toLocaleString('ko-KR');
  return `<div class="field">
      <label for="bill">지금 내는 월 요금(할인 끝난 정가)</label>
      <div class="knob-row"><input id="bill" data-bill type="text" inputmode="numeric" value="${esc(val)}"${st.billError ? ' aria-invalid="true"' : ''} aria-describedby="bill-hint"><span class="unit">원</span></div>
      <p id="bill-hint" class="${st.billError ? 'field-error' : 'hint'}">${st.billError ? esc(st.billError) : `처음 값 ${won(terms.currentBillDefault)}원은 할인 끝난 알뜰폰 요금의 시장 중간값입니다. 내 요금으로 바꿔 보세요.`}</p>
    </div>
    <div class="table-wrap"><table class="compare" data-table="compare">
      <thead><tr><th></th>
        <th scope="col">① 지금 그대로<span class="th-sub">정가 요금, 쓰던 폰</span></th>
        <th scope="col">② 폰 사고 요금제 따로<span class="th-sub">같은 리퍼폰 ${won(salePrice)}원 무이자 24개월 + ${esc(plan.name)}</span></th>
        <th scope="col" class="col-sub">③ 구독<span class="th-sub">월 ${won(t.monthlySubscription)}원 (기기 ${won(t.fee)} + 요금제 ${won(plan.fee)})</span></th>
      </tr></thead>
      <tbody>
        <tr data-row="total"><th scope="row">24개월 총액</th>
          <td class="num" data-col="stay">${won(t.stay)}원</td>
          <td class="num" data-col="buy">${won(t.buy)}원</td>
          <td class="num col-sub" data-col="subscribe">${won(t.subscribe)}원</td></tr>
        <tr data-row="leftover"><th scope="row">24개월 뒤 손에 남는 것</th>
          <td>쓰던 폰(더 낡음)</td>
          <td>폰 1대(예상 값 ${won(t.buyLeftover)}원)</td>
          <td class="col-sub">폰 없음 · 새 폰으로 교체 또는 반납</td></tr>
      </tbody>
    </table></div>
    <p class="hint">②는 끝에 폰이 남습니다. ③은 남는 폰 대신 교체 · 반납 · 보증을 받습니다. 직접 비교해 고르세요.</p>
    ${nav(st, true)}`;
}

function renderStep3(st, knobs) {
  const cost = costOf(st.modelId, st.gradeId);
  const t = compareTotals({ ...st, knobs });
  const etf = earlyTerminationExample(t.fee);
  return `<h3>24개월이 끝나면 (3가지 중 선택)</h3>
    <ul class="options" data-end-options>
      <li><strong>반납</strong> 추가 비용 없이 폰을 돌려줍니다. 요금제는 일반 요금제로 계속 쓸 수 있습니다.</li>
      <li data-swap><strong>교체</strong> 반납하고 새 리퍼폰으로 24개월 구독을 다시 시작합니다. <span data-swap-pick>기종 · 등급을 다시 고를 수 있습니다(상위 기종도 가능).</span> <span data-swap-fee>월 기기료는 새 폰 기준으로 다시 정합니다.</span></li>
      <li><strong>인수</strong> 남은 값 <span data-buyout>${won(residualValue(cost, knobs))}원</span>을 한 번 내고 폰을 가집니다.</li>
    </ul>
    <h3>중간에 그만두면</h3>
    <p data-etf-rule>언제든 해지할 수 있습니다. 폰을 반납하고, 남은 기기료의 ${terms.etfPct}%를 해지 비용으로 냅니다.</p>
    <p class="hint" data-etf-example>예: ${etf.monthsUsed}개월 쓰고 해지하면 남은 ${etf.remaining}개월 × 월 기기료 ${won(t.fee)}원 × ${terms.etfPct}% = ${won(etf.amount)}원</p>
    ${returnGuide}
    ${nav(st, true)}`;
}

function renderStep4(st) {
  const missing = missingRequired(st);
  const boxes = CONSENTS.map((c) => `<label class="consent">
      <input type="checkbox" data-consent="${c.key}"${st.consents[c.key] ? ' checked' : ''}>
      <span>${c.required ? '[필수]' : '[선택]'} ${esc(c.label)}</span></label>`).join('');
  return `<p>이름 · 전화번호 · 주소는 받지 않습니다(시연).</p>
    <fieldset class="consents"><legend>동의</legend>${boxes}</fieldset>
    ${missing.length ? `<p class="field-error" data-missing>빠진 필수 동의: ${esc(missing.join(', '))}</p>` : '<p class="hint">선택 동의는 하지 않아도 가입됩니다.</p>'}
    <div class="nav">
      <button type="button" class="secondary" data-action="prev">이전</button>
      <button type="button" class="primary" data-action="submit"${missing.length ? ' disabled' : ''}>가입 신청</button>
    </div>`;
}

function renderStep5(st, knobs) {
  const t = compareTotals({ ...st, knobs });
  return `<div class="done-box" data-done>
      <p class="empty-title">신청을 받았습니다(가상)</p>
      <dl>
        <dt>신청 번호</dt><dd data-app-no>${esc(st.applicationNo)}</dd>
        <dt>고른 것</dt><dd>${esc(findModel(st.modelId).name)} · ${esc(findGrade(st.gradeId).name)} · ${esc(findPlan(st.planId).name)}</dd>
        <dt>월 구독료</dt><dd data-monthly>${won(t.monthlySubscription)}원 × 24개월</dd>
      </dl>
    </div>
    ${returnGuide}
    <div class="nav"><span></span><button type="button" class="secondary" data-action="restart">처음으로</button></div>`;
}

export function renderOnboarding(st, knobs) {
  const anyAvailable = combos(knobs).some((c) => !c.deficit);
  let body;
  if (st.step !== 5 && !anyAvailable) body = renderNone();
  else if (st.step === 1) body = renderStep1(st, knobs);
  else if (st.step === 2) body = renderStep2(st, knobs);
  else if (st.step === 3) body = renderStep3(st, knobs);
  else if (st.step === 4) body = renderStep4(st);
  else body = renderStep5(st, knobs);
  return `<section class="panel" aria-labelledby="onb-title">
    <h2 id="onb-title">폰 순환 구독 가입 <span class="tag">손님</span></h2>
    <p class="lead">검수한 리퍼폰과 요금제를 매달 한 번에 내고 24개월 쓴 뒤, 돌려주거나 바꾸거나 가질 수 있습니다.</p>
    ${stepper(st.step)}
    ${body}
  </section>`;
}
