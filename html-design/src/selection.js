export function selectionRoots(nodes) {
  const unique = [...new Set(nodes)].filter((n) => n?.isConnected);
  return unique.filter(
    (n) => !unique.some((other) => other !== n && other.contains(n)),
  );
}

export function unionRect(nodes) {
  const rects = nodes.map((n) => n.getBoundingClientRect());
  const left = Math.min(...rects.map((r) => r.left)),
    top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.right)),
    bottom = Math.max(...rects.map((r) => r.bottom));
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

export function selectable(board) {
  return [...board.querySelectorAll("[data-el]")].filter((n) => {
    const r = n.getBoundingClientRect(),
      s = getComputedStyle(n);
    return (
      n.closest("[data-artboard]") === board &&
      r.width > 0 &&
      r.height > 0 &&
      s.visibility === "visible" &&
      s.opacity !== "0"
    );
  });
}

export function directionTarget(nodes, board, key) {
  const selected = selectionRoots(nodes);
  if (!selected.length) return null;
  const from = selected.at(-1).getBoundingClientRect();
  const x = from.left + from.width / 2,
    y = from.top + from.height / 2;
  const horizontal = ["ArrowLeft", "ArrowRight"].includes(key),
    sign = ["ArrowLeft", "ArrowUp"].includes(key) ? -1 : 1;
  let best = null;
  for (const node of selectable(board)) {
    if (
      selected.some((n) => n === node || n.contains(node) || node.contains(n))
    )
      continue;
    const r = node.getBoundingClientRect(),
      dx = r.left + r.width / 2 - x,
      dy = r.top + r.height / 2 - y;
    const forward = (horizontal ? dx : dy) * sign,
      cross = Math.abs(horizontal ? dy : dx);
    if (forward <= 1) continue;
    const score = forward + cross * 2;
    if (!best || score < best.score) best = { node, score };
  }
  return best?.node || null;
}

export function createSelectionOverlay(ui) {
  const members = document.createElement("div"),
    marquee = document.createElement("div");
  members.className = "selection-members";
  marquee.className = "marquee";
  marquee.hidden = true;
  ui.append(members, marquee);
  return {
    draw(nodes) {
      members.replaceChildren();
      if (nodes.length < 2) return;
      for (const node of nodes) {
        const r = node.getBoundingClientRect(),
          frame = document.createElement("div");
        frame.className = "selection-member";
        Object.assign(frame.style, {
          left: r.left + "px",
          top: r.top + "px",
          width: r.width + "px",
          height: r.height + "px",
        });
        members.append(frame);
      }
    },
    marquee(rect) {
      marquee.hidden = !rect;
      if (rect)
        Object.assign(marquee.style, {
          left: rect.left + "px",
          top: rect.top + "px",
          width: rect.width + "px",
          height: rect.height + "px",
        });
    },
  };
}
