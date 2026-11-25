import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, STORAGE_KEY } from '../site/js/store.js';
import { defaultKnobs } from '../site/js/data/catalog.js';

function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _m: m };
}

test('저장 · 다시 읽기', () => {
  const s = memStorage();
  const a = createStore(() => s);
  a.load();
  a.set({ ...defaultKnobs, feeRate: 84 });
  const b = createStore(() => s);
  assert.equal(b.load().feeRate, 84);
  assert.equal(b.saveFailed, false);
});

test('ac20 되돌리기: 4개 모두 기본값, 1번에', () => {
  const s = memStorage();
  const st = createStore(() => s);
  st.load();
  let calls = 0;
  st.subscribe(() => calls++);
  st.set({ feeRate: 84, dispRate: 20, returnRate: 70, lossRate: 15 });
  calls = 0;
  st.reset();
  assert.deepEqual(st.get(), { ...defaultKnobs });
  assert.equal(calls, 1);
});

test('ac21 저장을 쓸 수 없으면 기본값 + 저장 안 됨', () => {
  const st = createStore(() => { throw new Error('SecurityError'); });
  assert.deepEqual(st.load(), { ...defaultKnobs });
  assert.equal(st.saveFailed, true);
  st.set({ ...defaultKnobs, feeRate: 90 }); // 메모리로는 계속 동작
  assert.equal(st.get().feeRate, 90);
});

test('ac21 쓰기만 실패해도 저장 안 됨', () => {
  const s = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); } };
  const st = createStore(() => s);
  st.load();
  assert.equal(st.saveFailed, false);
  st.set({ ...defaultKnobs, feeRate: 90 });
  assert.equal(st.saveFailed, true);
});

test('깨진 저장값 · 범위 밖 · 다른 판은 버리고 기본값', () => {
  for (const raw of ['{깨짐', JSON.stringify({ v: 1, ...defaultKnobs, feeRate: 999 }), JSON.stringify({ v: 2, ...defaultKnobs, feeRate: 84 })]) {
    const st = createStore(() => memStorage({ [STORAGE_KEY]: raw }));
    assert.deepEqual(st.load(), { ...defaultKnobs }, raw);
    assert.equal(st.saveFailed, false);
  }
});

test('검사를 거치지 않은 값은 저장 거부', () => {
  const st = createStore(() => memStorage());
  st.load();
  assert.throws(() => st.set({ ...defaultKnobs, feeRate: 12.5 }));
});
