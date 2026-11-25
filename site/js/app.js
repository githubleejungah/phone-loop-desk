// 역할 전환 · 처음 그리기 · 손잡이 바뀜 → 두 화면 다시 그리기(docs/architecture.md 3절).
import { createStore } from './store.js';
import { validateKnob } from './core/pricing.js';
import { renderOps } from './ui/ops.js';
import { initialOnboarding, reduce, reconcile, renderOnboarding } from './ui/onboarding.js';

const store = createStore(() => window.localStorage);
let knobs = store.load();
let onb = initialOnboarding();
const ops = { drafts: {}, errors: {}, selected: { modelId: 'mid', gradeId: 'A' } };
let role = 'customer';

const $customer = document.getElementById('view-customer');
const $ops = document.getElementById('view-ops');

function render() {
  const t0 = performance.now();
  $customer.innerHTML = renderOnboarding(onb, knobs);
  $ops.innerHTML = renderOps({ knobs, ...ops, saveFailed: store.saveFailed });
  $customer.hidden = role !== 'customer';
  $ops.hidden = role !== 'ops';
  for (const b of document.querySelectorAll('[data-role]')) b.setAttribute('aria-pressed', String(b.dataset.role === role));
  window.__lastRenderMs = performance.now() - t0; // AC-12 확인용
}

store.subscribe((k) => {
  knobs = k;
  onb = reconcile(onb, knobs);
  render();
});

function newApplicationNo() {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return `DEMO-${String(n[0] % 1000000).padStart(6, '0')}`;
}

function commitKnob(input) {
  const name = input.dataset.knob;
  const r = validateKnob(name, input.value);
  if (!r.ok) {
    ops.errors[name] = r.reason; // 바로 전 값 유지(AC-18 · AC-19)
    delete ops.drafts[name];
    render();
    return;
  }
  ops.errors = {}; // 받은 값이 생기면 지난 거절 안내는 지운다
  delete ops.drafts[name];
  if (r.value === knobs[name]) { render(); return; }
  store.set({ ...knobs, [name]: r.value });
}

function dispatchOnb(action) {
  onb = reduce(onb, action, knobs);
  render();
}

document.addEventListener('click', (e) => {
  const roleBtn = e.target.closest('[data-role]');
  if (roleBtn) { role = roleBtn.dataset.role; render(); return; }
  const btn = e.target.closest('[data-action]');
  if (!btn || btn.disabled) return;
  const a = btn.dataset.action;
  if (a === 'reset-knobs') { ops.errors = {}; ops.drafts = {}; store.reset(); return; }
  if (a === 'select-sens') { ops.selected = { modelId: btn.dataset.model, gradeId: btn.dataset.grade }; render(); return; }
  if (a === 'pick-combo') return dispatchOnb({ type: a, modelId: btn.dataset.model, gradeId: btn.dataset.grade });
  if (a === 'pick-plan') return dispatchOnb({ type: a, planId: btn.dataset.plan });
  if (a === 'submit') return dispatchOnb({ type: a, applicationNo: newApplicationNo() });
  if (['next', 'prev', 'restart'].includes(a)) return dispatchOnb({ type: a });
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.matches('[data-knob]')) commitKnob(t);
  else if (t.matches('[data-bill]')) dispatchOnb({ type: 'set-bill', text: t.value });
  else if (t.matches('[data-consent]')) dispatchOnb({ type: 'toggle-consent', key: t.dataset.consent });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('[data-knob], [data-bill]')) e.target.blur();
});

render();
