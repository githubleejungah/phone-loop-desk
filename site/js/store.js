// 손잡이 4개만 저장한다(ADR 0002, docs/data-model.md 2-2).
import { defaultKnobs, knobKeys } from './data/catalog.js';
import { isValidKnobs } from './core/pricing.js';

export const STORAGE_KEY = 'pld:v1:knobs';

function pick(obj) {
  const out = {};
  for (const k of knobKeys) out[k] = obj[k];
  return out;
}

// storageGetter: localStorage를 돌려주는 함수. 접근만 해도 예외가 날 수 있어 함수로 받는다.
export function createStore(storageGetter) {
  let knobs = { ...defaultKnobs };
  let saveFailed = false;
  const listeners = new Set();

  function storage() {
    try {
      const s = storageGetter();
      if (!s) throw new Error('no storage');
      return s;
    } catch {
      saveFailed = true;
      return null;
    }
  }

  function load() {
    const s = storage();
    if (!s) return knobs;
    let raw = null;
    try {
      raw = s.getItem(STORAGE_KEY);
    } catch {
      saveFailed = true; // 읽기 자체가 막힘 → 기본값 + 안내
      return knobs;
    }
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        if (obj && obj.v === 1 && isValidKnobs(obj)) knobs = pick(obj);
      } catch {
        // 깨진 값은 버리고 기본값(안내 없음)
      }
    }
    return knobs;
  }

  function persist() {
    const s = storage();
    if (!s) return;
    try {
      s.setItem(STORAGE_KEY, JSON.stringify({ v: 1, ...knobs }));
      saveFailed = false;
    } catch {
      saveFailed = true;
    }
  }

  function set(next) {
    if (!isValidKnobs(next)) throw new Error('invalid knobs');
    knobs = pick(next);
    persist();
    for (const fn of listeners) fn(knobs);
  }

  return {
    load,
    get: () => ({ ...knobs }),
    set,
    reset: () => set({ ...defaultKnobs }),
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    get saveFailed() { return saveFailed; },
  };
}
