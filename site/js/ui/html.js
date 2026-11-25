// 화면 글자 넣기 도우미. 모든 글자는 이스케이프한다.
const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(v) {
  return String(v).replace(/[&<>"']/g, (c) => MAP[c]);
}
