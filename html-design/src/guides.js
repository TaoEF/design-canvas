// Geometry stays in document pixels; the magnetic range stays constant on screen.
const anchors = (r, axis) =>
  axis === "x"
    ? [r.x, r.x + r.w / 2, r.x + r.w]
    : [r.y, r.y + r.h / 2, r.y + r.h];

export function snapMove(rect, targets, delta, threshold) {
  const moving = { ...rect, x: rect.x + delta.x, y: rect.y + delta.y };
  const matches = [];
  const result = { ...delta, matches };
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
    if (best) {
      result[axis] += best.offset;
      matches.push(best);
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
      if (style.visibility !== "visible" || style.opacity === "0") continue;
      const r = localRect(node, o);
      if (r.w > 0 && r.h > 0) targets.push(r);
    }
    return {
      move(delta, bypass) {
        clear();
        return bypass
          ? { ...delta, matches: [] }
          : snapMove(rect, targets, delta, 6 / origin(board).s);
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
        redraw = () => {
          if (nodes.some((el) => !el.isConnected) || !board.isConnected)
            return clear();
          const now = origin(board),
            frame = svg.getBoundingClientRect();
          const moving = groupRect(now),
            pad = 8 / now.s;
          const segments = matches
            .map(({ axis, at, target }) => {
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
              const x = (v) => now.x + v * now.s - frame.left;
              const y = (v) => now.y + v * now.s - frame.top;
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
