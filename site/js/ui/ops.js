// 손익 계산기(담당자 화면). HTML 글자를 돌려주는 순수 함수(docs/architecture.md 2절).
import { knobKeys, knobLabels, knobRanges } from '../data/catalog.js';
import { combos, costOf, sensitivity, won, findModel, findGrade } from '../core/pricing.js';
import { esc } from './html.js';

// view: { knobs, drafts: {이름: 글자}, errors: {이름: 이유}, selected: {modelId, gradeId}, saveFailed }
export function renderOps(view) {
  const { knobs, errors = {}, drafts = {}, selected = { modelId: 'mid', gradeId: 'A' }, saveFailed = false } = view;
  const list = combos(knobs);
  const available = list.filter((c) => !c.deficit).length;

  const knobInputs = knobKeys.map((k) => {
    const r = knobRanges[k];
    const val = drafts[k] ?? knobs[k];
    const err = errors[k];
    return `<div class="knob">
      <label for="knob-${k}">${esc(knobLabels[k])}</label>
      <div class="knob-row">
        <input id="knob-${k}" data-knob="${k}" type="text" inputmode="numeric" value="${esc(val)}" aria-describedby="knob-${k}-hint"${err ? ' aria-invalid="true"' : ''}>
        <span class="unit">%</span>
      </div>
      <p id="knob-${k}-hint" class="${err ? 'field-error' : 'hint'}">${err ? esc(err) : `허용 ${r.min}~${r.max}`}</p>
    </div>`;
  }).join('');

  const rows = list.map((c) => {
    const isSel = c.modelId === selected.modelId && c.gradeId === selected.gradeId;
    return `<tr class="${c.deficit ? 'row-deficit' : ''}${isSel ? ' row-selected' : ''}">
      <td>${esc(c.model)}</td><td>${esc(c.grade)}</td>
      <td class="num">${won(c.cost)}</td><td class="num">${won(c.fee)}</td>
      <td class="num">${won(c.profit)}</td>
      <td>${c.deficit ? '<span class="warn" data-deficit>⚠ 적자 경고 · 손님 화면 준비 중</span>' : '<span class="ok">판매 중</span>'}</td>
      <td><button type="button" class="link" data-action="select-sens" data-model="${c.modelId}" data-grade="${c.gradeId}" aria-pressed="${isSel}">민감도</button></td>
    </tr>`;
  }).join('');

  const cost = costOf(selected.modelId, selected.gradeId);
  const sens = sensitivity(cost, knobs).map((s) => `<tr class="${s.profit < 0 ? 'row-deficit' : ''}">
      <td>${esc(s.label)}</td>
      <td class="num">${s.knobs.dispRate}% · ${s.knobs.returnRate}% · ${s.knobs.lossRate}%</td>
      <td class="num">${won(s.profit)}</td></tr>`).join('');

  return `<section class="panel" aria-labelledby="ops-title">
    <h2 id="ops-title">손익 계산기 <span class="tag">상품 · 운영 담당자</span></h2>
    <p class="lead">손잡이를 바꾸면 손님 화면 가격 · 비교표가 같은 값으로 바로 바뀝니다. 이익이 0원 미만인 조합은 손님 화면에서 '준비 중'이 됩니다.</p>
    ${saveFailed ? '<p class="notice" data-save-failed>저장 안 됨: 이 브라우저는 저장을 막고 있어 새로고침하면 기본값으로 돌아갑니다.</p>' : ''}
    <div class="knobs">${knobInputs}</div>
    <p><button type="button" class="secondary" data-action="reset-knobs">기본값으로 되돌리기</button></p>

    <h3>고객당 기기 이익 (24개월, 6개 조합)</h3>
    <p class="hint">판매 중 ${available} / 6 · 회선 원가(도매대가)는 빼고 셈한 기기 쪽 이익입니다.</p>
    <div class="table-wrap"><table data-table="profit">
      <thead><tr><th>기종</th><th>등급</th><th class="num">원가</th><th class="num">월 기기료</th><th class="num">고객당 기기 이익</th><th>상태</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>

    <h3>민감도 — ${esc(findModel(selected.modelId).name)} ${esc(findGrade(selected.gradeId).name)}</h3>
    <div class="table-wrap"><table data-table="sensitivity">
      <thead><tr><th>바꾼 가정</th><th class="num">처분율 · 회수율 · 손실률</th><th class="num">고객당 기기 이익</th></tr></thead>
      <tbody>${sens}</tbody>
    </table></div>
    <p class="hint">식: 월 기기료 × 24 × (1 − 손실률) + 원가 × 처분율 × 회수율 − 원가</p>
  </section>`;
}
