const flexOrGridItem = (el) =>
  /^(inline-)?(flex|grid)$/.test(getComputedStyle(el.parentElement).display);
function stackingContext(el) {
  const s = getComputedStyle(el);
  return (
    s.position === "fixed" ||
    s.position === "sticky" ||
    (s.zIndex !== "auto" && (s.position !== "static" || flexOrGridItem(el))) ||
    Number(s.opacity) < 1 ||
    s.isolation === "isolate" ||
    s.mixBlendMode !== "normal" ||
    [
      s.transform,
      s.translate,
      s.rotate,
      s.scale,
      s.filter,
      s.backdropFilter,
      s.perspective,
    ].some((v) => v && v !== "none") ||
    /paint|layout|strict|content/.test(s.contain) ||
    /transform|opacity|filter|perspective/.test(s.willChange)
  );
}

// z-index is local to a stacking context. Lift/lower existing enclosing contexts
// as well as the selected element, without flattening or reparenting the page.
export function layerChanges(el, board, front, selection = []) {
  const contextOf = (node) => {
    let parent = node.parentElement;
    while (parent && parent !== board && !stackingContext(parent))
      parent = parent.parentElement;
    return parent;
  };
  const changes = new Map();
  for (let unit = el; unit && unit !== board; ) {
    const context = contextOf(unit);
    if (!context || !board.contains(context)) break;
    const peers = [...context.querySelectorAll("*")].filter(
      (n) =>
        n !== unit &&
        !n.contains(unit) &&
        !unit.contains(n) &&
        !selection.some((s) => s === n || s.contains(n) || n.contains(s)) &&
        n.getClientRects().length &&
        (n.hasAttribute("data-el") || stackingContext(n)) &&
        contextOf(n) === context,
    );
    const z = (n) => Number.parseInt(getComputedStyle(n).zIndex) || 0;
    changes.set(unit, front ? Math.max(0, ...peers.map(z)) + 1 : 0);
    if (!front)
      for (const peer of peers) if (z(peer) <= 0) changes.set(peer, 1);
    unit = context;
  }
  return {
    nodes: [...changes.keys()],
    apply() {
      for (const [node, z] of changes) {
        if (
          getComputedStyle(node).position === "static" &&
          !flexOrGridItem(node)
        )
          node.style.position = "relative";
        node.style.zIndex = String(z);
      }
    },
  };
}
