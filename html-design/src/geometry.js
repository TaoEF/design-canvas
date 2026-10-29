// Self-contained so the export browser uses this same trusted geometry function.
// BCR gives the transformed center; the composed linear basis gives dimensions
// and parent-coordinate deltas without resetting the author's CSS or origin.
export function elementGeometry(el) {
  const number = value => parseFloat(value) || 0;
  const angleValue = value => {
    if (value === 'none') return 0;
    const parts = value.trim().split(/\s+/), angle = parts.pop();
    if (parts.length && parts.join(' ') !== 'z' && parts.join(' ') !== '0 0 1') return NaN;
    const n = parseFloat(angle);
    return angle.endsWith('rad') && !angle.endsWith('grad') ? n * 180 / Math.PI : angle.endsWith('grad') ? n * .9 : angle.endsWith('turn') ? n * 360 : n;
  };
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  const chain = [];
  for (let n = el; n; n = n.parentElement) chain.unshift(n);
  let matrix = new DOMMatrix(), parent = matrix, supported = true;
  for (const n of chain) {
    const s = getComputedStyle(n), t = new DOMMatrix(s.transform), angle = angleValue(s.rotate);
    const scales = s.scale === 'none' ? [1, 1] : s.scale.split(/\s+/).map(Number);
    if (scales.length === 1) scales.push(scales[0]);
    const x = Math.hypot(t.a, t.b), y = Math.hypot(t.c, t.d), tolerance = .0001 * Math.max(1, x * y);
    if (!t.is2D || t.a * t.d - t.b * t.c <= 0 || x < .000001 || Math.abs(x - y) > .0001 * Math.max(x, y) ||
      Math.abs(t.a * t.c + t.b * t.d) > tolerance || !Number.isFinite(angle) || scales.length !== 2 ||
      scales[0] <= 0 || Math.abs(scales[0] - scales[1]) > .0001 || s.perspective !== 'none' || s.offsetPath !== 'none') supported = false;
    const zoom = Number(s.zoom) || 1;
    if (n === el) parent = matrix.scale(zoom);
    // CSS transforms do not apply to ordinary non-replaced inline boxes.
    if (s.display !== 'inline' || n.matches('img,svg,canvas,video,iframe')) {
      matrix = matrix.rotate(Number.isFinite(angle) ? angle : 0).scale(scales[0] || 1)
        .multiply(new DOMMatrix([t.a, t.b, t.c, t.d, 0, 0]));
    }
    matrix = matrix.scale(zoom);
  }
  const scale = Math.hypot(matrix.a, matrix.b);
  const border = axis => {
    const sides = axis === 'width' ? ['Left', 'Right'] : ['Top', 'Bottom'];
    const value = parseFloat(cs[axis]);
    return Number.isFinite(value) ? value + (cs.boxSizing === 'border-box' ? 0 : sides.reduce((sum, side) => sum + number(cs[`padding${side}`]) + number(cs[`border${side}Width`]), 0)) : NaN;
  };
  const inline = cs.display === 'inline' && !el.matches('img,svg,canvas,video,iframe');
  const w = inline ? r.width / scale : border('width'), h = inline ? r.height / scale : border('height');
  if (!scale || !Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0 || (inline && el.getClientRects().length > 1)) supported = false;
  const plain = m => ({ a: m.a, b: m.b, c: m.c, d: m.d });
  return { supported, inline, w, h, cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2,
    scale, angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI, individual: angleValue(cs.rotate), matrix: plain(matrix), parent: plain(parent) };
}

export function inverseDelta(matrix, x, y) {
  const d = matrix.a * matrix.d - matrix.b * matrix.c;
  return { x: (matrix.d * x - matrix.c * y) / d, y: (matrix.a * y - matrix.b * x) / d };
}
export function mappedDelta(matrix, x, y) {
  return { x: matrix.a * x + matrix.c * y, y: matrix.b * x + matrix.d * y };
}
export const normalizedAngle = angle => ((angle + 180) % 360 + 360) % 360 - 180;
export function snappedAngle(angle, event) {
  if (event.altKey) return angle;
  if (event.shiftKey) return Math.round(angle / 15) * 15;
  const nearest = Math.round(angle / 90) * 90;
  return Math.abs(nearest - angle) <= 3 ? nearest : angle;
}
