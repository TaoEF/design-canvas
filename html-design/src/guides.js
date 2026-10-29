// Geometry stays in document pixels; the magnetic range stays constant on screen.
const anchors = (r, axis) =>
  axis === "x"
    ? [r.x, r.x + r.w / 2, r.x + r.w]
    : [r.y, r.y + r.h / 2, r.y + r.h];

const dimensions = (axis) => axis === "x" ? ["x", "w", "y", "h"] : ["y", "h", "x", "w"];
const crossRange = (rects, axis) => {
  const [, , cross, size] = dimensions(axis);
  return [Math.max(...rects.map(r => r[cross])), Math.min(...rects.map(r => r[cross] + r[size]))];
};

// Only the nearest non-overlapping neighbors on this row/column define a gap.
export function spacingCandidates(moving, peers, axis, threshold) {
  const [start, size] = dimensions(axis), end = r => r[start] + r[size];
  const center = moving[start] + moving[size] / 2;
  const related = peers.filter(r => {
    const [a, b] = crossRange([moving, r], axis);
    return b > a && r.w > 0 && r.h > 0 && [r.x, r.y, r.w, r.h].every(Number.isFinite);
  });
  const left = related.filter(r => end(r) <= center).sort((a, b) => end(b) - end(a) || b[start] - a[start])[0];
  const right = related.filter(r => r[start] >= center).sort((a, b) => a[start] - b[start] || end(a) - end(b))[0];
  const candidates = [];
  const add = (mode, a, b, position, gap) => {
    if (!a || !b || gap < 0) return;
    const [low, high] = crossRange([moving, a, b], axis);
    const offset = position - moving[start], distance = Math.abs(offset);
    if (high <= low || distance > threshold) return;
    const match = { kind: "spacing", axis, mode, peers: [a, b], gap, offset, distance };
    const placed = { ...moving, [start]: position };
    const { spans } = spacingSpans(match, placed);
    // Overlapping peers still occupy whitespace: do not skip them when choosing
    // the reference pair, or advertise a gap that crosses a third visible object.
    const [, , cross, crossSize] = dimensions(axis);
    const blocked = related.some(r => r !== a && r !== b &&
      r[cross] < high && r[cross] + r[crossSize] > low &&
      spans.some(([from, to]) => to > from && r[start] < to && end(r) > from));
    if (!blocked) candidates.push(match);
  };
  if (left && right) {
    const gap = (right[start] - end(left) - moving[size]) / 2;
    add("between", left, right, end(left) + gap, gap);
  }
  if (left) {
    const before = related.filter(r => r !== left && end(r) <= left[start] && crossRange([moving, r, left], axis)[1] > crossRange([moving, r, left], axis)[0])
      .sort((a, b) => end(b) - end(a) || b[start] - a[start])[0];
    if (before) {
      const gap = left[start] - end(before);
      add("after", before, left, end(left) + gap, gap);
    }
  }
  if (right) {
    const after = related.filter(r => r !== right && r[start] >= end(right) && crossRange([moving, r, right], axis)[1] > crossRange([moving, r, right], axis)[0])
      .sort((a, b) => a[start] - b[start] || end(a) - end(b))[0];
    if (after) {
      const gap = after[start] - end(right);
      add("before", right, after, right[start] - gap - moving[size], gap);
    }
  }
  return candidates;
}

function spacingSpans(match, moving) {
  const [start, size] = dimensions(match.axis), end = r => r[start] + r[size];
  const [a, b] = match.peers;
  const [low, high] = crossRange([moving, a, b], match.axis);
  const spans = match.mode === "between" ? [[end(a), moving[start]], [end(moving), b[start]]]
    : match.mode === "after" ? [[end(a), b[start]], [end(b), moving[start]]]
      : [[end(moving), a[start]], [end(a), b[start]]];
  return { cross: (low + high) / 2, spans };
}

export function snapMove(rect, targets, delta, threshold, peers = targets) {
  const moving = { ...rect, x: rect.x + delta.x, y: rect.y + delta.y };
  const matches = [];
  const result = { ...delta, matches }, alignments = new Map();
  for (const axis of ["x", "y"]) {
    let best = null;
    anchors(moving, axis).forEach((value, sourceIndex) => {
      for (const target of targets) {
        anchors(target, axis).forEach((at, targetIndex) => {
          const offset = at - value;
          const distance = Math.abs(offset);
          // Prefer matching edge/center roles when two alignments are equally close.
          const rank = sourceIndex === targetIndex ? 0 : 1;
          if (
            distance <= threshold &&
            (!best ||
              distance < best.distance - 1e-6 ||
              (Math.abs(distance - best.distance) < 1e-6 && rank < best.rank))
          )
            best = { axis, at, offset, distance, rank, target };
        });
      }
    });
    alignments.set(axis, best);
    for (const candidate of spacingCandidates(moving, peers, axis, threshold)) {
      // Equal corrections retain the established edge/center behavior.
      if (!best || candidate.distance < best.distance - 1e-6) best = candidate;
    }
    if (best) {
      result[axis] += best.offset;
      matches.push(best);
    }
  }
  // A correction on the other axis may move a thin row/column out of overlap.
  // Fall back to its original alignment instead of keeping an unrelated gap snap.
  for (let pass = 0; pass < 2; pass++) {
    const final = { ...rect, x: rect.x + result.x, y: rect.y + result.y };
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      if (match.kind !== "spacing") continue;
      const [low, high] = crossRange([final, ...match.peers], match.axis);
      if (high > low) continue;
      const fallback = alignments.get(match.axis);
      result[match.axis] = delta[match.axis] + (fallback?.offset || 0);
      if (fallback) matches[i] = fallback;
      else matches.splice(i, 1);
    }
  }
  return result;
}

export function createGuides({ ui, origin }) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("guides");
  svg.setAttribute("aria-hidden", "true");
  ui.append(svg);
  let redraw = null;
  const clear = () => {
    redraw = null;
    svg.replaceChildren();
  };
  const localRect = (el, o) => {
    const r = el.getBoundingClientRect();
    return {
      x: (r.left - o.x) / o.s,
      y: (r.top - o.y) / o.s,
      w: r.width / o.s,
      h: r.height / o.s,
    };
  };
  function begin(elements, board) {
    const nodes = Array.isArray(elements) ? elements : [elements];
    const groupRect = (o) => {
      const rects = nodes.map((n) => localRect(n, o));
      const x = Math.min(...rects.map((r) => r.x)),
        y = Math.min(...rects.map((r) => r.y));
      return {
        x,
        y,
        w: Math.max(...rects.map((r) => r.x + r.w)) - x,
        h: Math.max(...rects.map((r) => r.y + r.h)) - y,
      };
    };
    clear();
    const o = origin(board);
    const rect = groupRect(o);
    const targets = [
      { x: 0, y: 0, w: board.clientWidth, h: board.clientHeight },
    ];
    for (const node of board.querySelectorAll("[data-el]")) {
      if (
        nodes.some(
          (el) => node === el || node.contains(el) || el.contains(node),
        ) ||
        node.closest("[data-artboard]") !== board
      )
        continue;
      const style = getComputedStyle(node);
      let transparent = false;
      for (let ancestor = node; ancestor && ancestor !== board.parentElement; ancestor = ancestor.parentElement) {
        if (getComputedStyle(ancestor).opacity === "0") { transparent = true; break; }
      }
      if (style.visibility !== "visible" || transparent || !node.getClientRects().length) continue;
      const r = localRect(node, o);
      if (r.w > 0 && r.h > 0) targets.push(r);
    }
    return {
      move(delta, bypass) {
        clear();
        return bypass
          ? { ...delta, matches: [] }
          : snapMove(rect, targets, delta, 6 / origin(board).s, targets.slice(1));
      },
      draw(matches) {
        clear();
        if (!matches.length) return;
        const paths = ["guide-halo", "guide-line"].map((cls) => {
          const path = document.createElementNS(svg.namespaceURI, "path");
          path.setAttribute("class", cls);
          svg.append(path);
          return path;
        });
        const labels = matches.filter(match => match.kind === "spacing").flatMap(match => [0, 1].map(() => {
          const label = document.createElementNS(svg.namespaceURI, "text");
          label.setAttribute("class", "guide-distance");
          label.textContent = String(Math.round(match.gap * 10) / 10);
          svg.append(label);
          return label;
        }));
        redraw = () => {
          if (nodes.some((el) => !el.isConnected) || !board.isConnected)
            return clear();
          const now = origin(board),
            frame = svg.getBoundingClientRect();
          const moving = groupRect(now),
            pad = 8 / now.s;
          const x = v => now.x + v * now.s - frame.left;
          const y = v => now.y + v * now.s - frame.top;
          let labelIndex = 0;
          const segments = matches
            .map(match => {
              const { axis, at, target } = match;
              if (match.kind === "spacing") {
                const { cross, spans } = spacingSpans(match, moving);
                return spans.map(([from, to]) => {
                  const label = labels[labelIndex++];
                  if (axis === "x") {
                    label.setAttribute("x", x((from + to) / 2)); label.setAttribute("y", y(cross) - 6);
                    label.setAttribute("text-anchor", "middle");
                    return `M${x(from)},${y(cross)}H${x(to)}M${x(from)},${y(cross)-4}v8M${x(to)},${y(cross)-4}v8`;
                  }
                  label.setAttribute("x", x(cross) + 7); label.setAttribute("y", y((from + to) / 2) + 4);
                  return `M${x(cross)},${y(from)}V${y(to)}M${x(cross)-4},${y(from)}h8M${x(cross)-4},${y(to)}h8`;
                }).join("");
              }
              const vertical = axis === "x";
              const start =
                Math.min(
                  vertical ? moving.y : moving.x,
                  vertical ? target.y : target.x,
                ) - pad;
              const end =
                Math.max(
                  vertical ? moving.y + moving.h : moving.x + moving.w,
                  vertical ? target.y + target.h : target.x + target.w,
                ) + pad;
              return vertical
                ? `M${x(at)},${y(start)}V${y(end)}`
                : `M${x(start)},${y(at)}H${x(end)}`;
            })
            .join("");
          paths.forEach((path) => path.setAttribute("d", segments));
        };
        redraw();
      },
    };
  }
  return { begin, clear, refresh: () => redraw?.() };
}
