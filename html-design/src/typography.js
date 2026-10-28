// Snapshot computed values once. Explicit spans must scale from their original sizes,
// rather than inheriting a repeatedly compounded scale from their parent.
export function textMetrics(el) {
  return [el, ...el.querySelectorAll("*")]
    .filter((n) => !n.matches("br"))
    .map((node) => {
      const cs = getComputedStyle(node);
      return {
        node,
        font: parseFloat(cs.fontSize),
        line: cs.lineHeight,
        letter: cs.letterSpacing,
        word: cs.wordSpacing,
      };
    });
}
export function scaleText(metrics, k) {
  for (const m of metrics) {
    m.node.style.fontSize = `${Math.round(m.font * k * 1000) / 1000}px`;
    for (const [prop, value] of [
      ["lineHeight", m.line],
      ["letterSpacing", m.letter],
      ["wordSpacing", m.word],
    ]) {
      m.node.style[prop] =
        value === "normal"
          ? "normal"
          : `${Math.round(parseFloat(value) * k * 1000) / 1000}px`;
    }
  }
}
