import { cropGeometry } from './crop-geometry.js';
import { elementGeometry, inverseDelta, mappedDelta } from "./geometry.js";
const cropImage = (el) => el?.matches('[data-crop-frame="1"]') ? el.querySelector(":scope > img[data-crop-image]") : el?.matches("img") ? el : null;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
function cropModel(w, h, nw, nh, zoom = 1, x = 0.5, y = 0.5) {
  if (![w, h, nw, nh, zoom, x, y].every(Number.isFinite) || Math.min(w, h, nw, nh) <= 0) throw new Error("图片或裁切尺寸无效");
  zoom = clamp(zoom, 1, 20);
  x = clamp(x, 0, 1);
  y = clamp(y, 0, 1);
  const k = Math.max(w / nw, h / nh) * zoom, pw = nw * k, ph = nh * k;
  return { w, h, nw, nh, zoom, x, y, pw, ph, left: -x * (pw - w), top: -y * (ph - h) };
}
function cropPan(m, dx, dy) {
  return cropModel(m.w, m.h, m.nw, m.nh, m.zoom, m.pw > m.w + 1e-3 ? -(m.left + dx) / (m.pw - m.w) : 0.5, m.ph > m.h + 1e-3 ? -(m.top + dy) / (m.ph - m.h) : 0.5);
}
// Keep the painted source fixed until a larger frame requires additional cover.
function cropResize(m, w, h, dx, dy) {
  const k = Math.max(m.pw / m.nw, w / m.nw, h / m.nh), pw = k * m.nw, ph = k * m.nh;
  return cropModel(w, h, m.nw, m.nh, k / Math.max(w / m.nw, h / m.nh), pw > w + 1e-3 ? -(m.left - dx) / (pw - w) : 0.5, ph > h + 1e-3 ? -(m.top - dy) / (ph - h) : 0.5);
}
const attrs = (n) => [...n.attributes].filter((a) => !/^(data-editor-current|contenteditable)$/.test(a.name)).map((a) => [a.name, a.value]);
const restoreAttrs = (n, list) => {
  for (const a of [...n.attributes]) n.removeAttribute(a.name);
  for (const [k, v] of list) n.setAttribute(k, v);
};
const props = `display position inset top right bottom left width height min-width min-height max-width max-height box-sizing margin-top margin-right margin-bottom margin-left padding-top padding-right padding-bottom padding-left border-top border-right border-bottom border-left border-top-left-radius border-top-right-radius border-bottom-left-radius border-bottom-right-radius background-color box-shadow opacity transform transform-origin translate rotate scale zoom z-index order flex-grow flex-shrink flex-basis align-self justify-self grid-column-start grid-column-end grid-row-start grid-row-end vertical-align float clear aspect-ratio`.split(" ");
function createCrop({ S, ui, select, draw, sync, push, toast, getPos, setPos, canEdit }) {
  const $ = (s) => ui.querySelector(s), panel = $(".crop-panel"), outline = $(".crop-source");
  let session = null;
  const target = () => session?.frame || session?.img;
  function snapshot() {
    return { frame: session.frame, ia: attrs(session.img), fa: session.frame && attrs(session.frame) };
  }
  function restore(s) {
    const img = session.img, current = session.frame;
    if (!s.frame) {
      if (current) {
        current.before(img);
        current.remove();
      }
      restoreAttrs(img, s.ia);
    } else {
      if (!s.frame.isConnected) img.before(s.frame);
      s.frame.replaceChildren(img);
      restoreAttrs(img, s.ia);
      restoreAttrs(s.frame, s.fa);
    }
    session.frame = s.frame;
    select(target(), true);
    refresh();
  }
  const same = (a, b) => JSON.stringify([a.ia, a.fa]) === JSON.stringify([b.ia, b.fa]);
  function measure() {
    const n = target(), img = session.img, c = getComputedStyle(n), g = elementGeometry(n);
    const inset = ["Left", "Top", "Right", "Bottom"].map((s) => (parseFloat(c[`border${s}Width`]) || 0) + (parseFloat(c[`padding${s}`]) || 0));
    const w = g.w - inset[0] - inset[2], h = g.h - inset[1] - inset[3], cs = getComputedStyle(img);
    const p = cs.objectPosition.split(/\s+/).map((v) => parseFloat(v) / 100);
    return { g, inset, m: cropModel(w, h, img.naturalWidth, img.naturalHeight, session.frame ? parseFloat(cs.scale) || 1 : 1, session.frame ? p[0] : 0.5, session.frame ? p[1] : 0.5) };
  }
  function write(m) {
    const img = session.img;
    img.style.setProperty("--crop-zoom", String(m.zoom));
    img.style.setProperty("--crop-x", `${m.x * 100}%`);
    img.style.setProperty("--crop-y", `${m.y * 100}%`);
  }
  function migrate() {
    if (session.frame) return;
    const img = session.img, g = elementGeometry(img), c = getComputedStyle(img), map = img.computedStyleMap?.();
    if (!map || !g.supported || map.get("width")?.toString() === "auto" && c.position === "absolute" && c.left !== "auto" && c.right !== "auto" || !CSS.supports("overflow-clip-margin", "content-box") || img.closest("picture") || c.filter !== "none" || c.clipPath !== "none" || c.maskImage !== "none" || c.content !== "normal") throw new Error("此图片的 CSS 暂不支持安全裁切，已保留原样");
    // Probe the existing marked layout synchronously, then restore on incompatibility.
    const peers = [...img.closest("[data-artboard]").querySelectorAll("[data-el]")], boxes = peers.map((n) => n.getBoundingClientRect());
    const before = attrs(img), frame = document.createElement("span");
    for (const k of props) frame.style.setProperty(k, map.get(k)?.toString() || c.getPropertyValue(k), "important");
    if (c.display === "inline") frame.style.setProperty("display", "inline-block", "important");
    if (map.get("width")?.toString() === "auto") frame.style.setProperty("width", `${g.w - (c.boxSizing === "border-box" ? 0 : parseFloat(c.paddingLeft) + parseFloat(c.paddingRight) + parseFloat(c.borderLeftWidth) + parseFloat(c.borderRightWidth))}px`, "important");
    frame.dataset.cropFrame = "1";
    frame.dataset.el = img.dataset.el;
    frame.style.setProperty("overflow", "clip", "important");
    frame.style.setProperty("overflow-clip-margin", "content-box", "important");
    const autoHeight = map.get("height")?.toString() === "auto";
    img.before(frame);
    frame.append(img);
    session.frame = frame;
    img.removeAttribute("data-el");
    img.setAttribute("data-crop-image", "");
    const resets = { display: "block", position: "static", width: "100%", height: autoHeight ? "auto" : "100%", minWidth: "0", minHeight: "0", maxWidth: "none", maxHeight: "none", margin: "0", padding: "0", border: "0", borderRadius: "0", boxShadow: "none", background: "none", opacity: "1", transform: "none", transformOrigin: "0 0", rotate: "none", zoom: "1", aspectRatio: "auto", objectFit: "cover", objectPosition: "var(--crop-x) var(--crop-y)", scale: "var(--crop-zoom)", translate: "calc(var(--crop-x) * (1 - var(--crop-zoom))) calc(var(--crop-y) * (1 - var(--crop-zoom)))" };
    for (const [key, value] of Object.entries(resets)) img.style.setProperty(key.replace(/[A-Z]/g, (x) => "-" + x.toLowerCase()), value, "important");
    img.style.setProperty("--crop-zoom", "1");
    img.style.setProperty("--crop-x", "50%");
    img.style.setProperty("--crop-y", "50%");
    const after = peers.map((n) => n === img ? frame.getBoundingClientRect() : n.getBoundingClientRect());
    const valid = after.every((r, i) => ["x", "y", "width", "height"].every((k) => Math.abs(r[k] - boxes[i][k]) < 0.6)) && cropGeometry(frame, elementGeometry).supported;
    if (!valid) {
      frame.before(img);
      frame.remove();
      restoreAttrs(img, before);
      session.frame = null;
      throw new Error("此图片布局无法无损转换，已保留原样");
    }
    session.frame = frame;
    select(frame, true);
  }
  function add(before) {
    const after = snapshot();
    if (same(before, after)) return;
    session.undo.push({ before, after });
    session.redo = [];
    sync();
  }
  function start(el) {
    if (!canEdit() || session) return;
    const img = cropImage(el);
    if (!img || !img.complete || !img.naturalWidth) return toast("图片尚未加载，暂不能裁切");
    const g = elementGeometry(el);
    if (el !== img && !cropGeometry(el, elementGeometry).supported) return toast("现有裁切 CSS 不可靠，请先检查图片框样式");
    if (!g.supported) return toast("此图片变换暂不支持安全裁切");
    session = { img, frame: el === img ? null : el, undo: [], redo: [], board: el.closest("[data-artboard]") };
    S.crop = true;
    session.entry = snapshot();
    try { measure(); } catch { session = null; S.crop = false; return toast("图片的裁切尺寸无效，已保留原样"); }
    select(el, true);
    refresh();
    sync();
  }
  function finish(cancel = false) {
    if (!session) return;
    if (!cancel && ui.activeElement === $(".crop-zoom-value")) ui.activeElement.blur();
    if (zoomBefore) {
      add(zoomBefore);
      zoomBefore = null;
    }
    if (S.drag?.kind === "crop") {
      const d = S.drag;
      S.drag = null;
      cancel ? d.cancel() : d.up();
    }
    if (cancel) restore(session.entry);
    // Pending previews do not enter main history or autosave until the session ends.
    const old = session;
    session = null;
    S.crop = false;
    panel.hidden = outline.hidden = true;
    if (!cancel) for (const cmd of old.undo) {
      const replay = (value) => {
        session = { ...old, frame: old.img.closest('[data-crop-frame="1"]') };
        restore(value);
        session = null;
        panel.hidden = outline.hidden = true;
      };
      push({ undo: () => replay(cmd.before), redo: () => replay(cmd.after), board: old.board });
    }
    draw();
    sync();
  }
  function refresh() {
    if (!session) return;
    panel.hidden = false;
    const { m, g, inset } = measure();
    $(".crop-zoom").value = String(Math.round(m.zoom * 100));
    $(".crop-zoom-value").value = String(Math.round(m.zoom * 100));
    const at = target().getBoundingClientRect();
    panel.style.left = `${clamp(at.left, 8, Math.max(8, innerWidth - panel.offsetWidth - 8))}px`;
    panel.style.top = `${clamp(at.bottom + 12, 8, innerHeight - panel.offsetHeight - 12)}px`;
    const d = mappedDelta(g.matrix, inset[0] - g.w / 2 + m.left + m.pw / 2, inset[1] - g.h / 2 + m.top + m.ph / 2);
    Object.assign(outline.style, { left: `${g.cx + d.x - m.pw * g.scale / 2}px`, top: `${g.cy + d.y - m.ph * g.scale / 2}px`, width: `${m.pw * g.scale}px`, height: `${m.ph * g.scale}px`, transform: `rotate(${g.angle}deg)` });
    outline.hidden = false;
  }
  function gesture(e, dir) {
    if (!session || !canEdit()) return;
    const before = snapshot(), { m, g, inset } = measure(), pos = getPos(target()), start2 = { x: e.clientX, y: e.clientY };
    let changed = false;
    const operation = { kind: "crop", move(ev) {
      const delta = inverseDelta(g.matrix, ev.clientX - start2.x, ev.clientY - start2.y);
      let m2, dx = 0, dy = 0;
      if (!dir) m2 = cropPan(m, delta.x, delta.y);
      else {
        const w = Math.max(16, m.w + (dir.includes("e") ? delta.x : dir.includes("w") ? -delta.x : 0)), h = Math.max(16, m.h + (dir.includes("s") ? delta.y : dir.includes("n") ? -delta.y : 0));
        dx = dir.includes("w") ? m.w - w : 0;
        dy = dir.includes("n") ? m.h - h : 0;
        m2 = cropResize(m, w, h, dx, dy);
      }
      const effective = Math.max(Math.abs(m2.left - m.left), Math.abs(m2.top - m.top), Math.abs(m2.pw - m.pw), Math.abs(m2.ph - m.ph), Math.abs(m2.w - m.w), Math.abs(m2.h - m.h)) > 0.01;
      if (!effective) {
        if (changed) restore(before);
        changed = false;
        return;
      }
      try {
        migrate();
        if (dir) {
          const frame = target(), cs = getComputedStyle(frame);
          frame.style.setProperty("width", `${m2.w + (cs.boxSizing === "border-box" ? inset[0] + inset[2] : 0)}px`, "important");
          frame.style.setProperty("height", `${m2.h + (cs.boxSizing === "border-box" ? inset[1] + inset[3] : 0)}px`, "important");
          session.img.style.setProperty("height", "100%", "important");
          const world = mappedDelta(g.matrix, dx + (m2.w - m.w) / 2, dy + (m2.h - m.h) / 2);
          setPos(frame, pos, pos.x, pos.y);
          const now = elementGeometry(frame), offset = inverseDelta(g.parent, g.cx + world.x - now.cx, g.cy + world.y - now.cy);
          setPos(frame, pos, pos.x + offset.x, pos.y + offset.y);
        }
        write(m2);
        changed = true;
        draw();
        refresh();
      } catch (error) {
        restore(before);
        toast(error.message, 4e3);
        S.drag = null;
      }
    }, up() {
      if (changed) add(before);
      refresh();
    }, cancel() {
      restore(before);
    } };
    S.drag = operation;
  }
  let zoomBefore = null;
  function zoom(value, commit = true) {
    if (!session || !canEdit()) return;
    if (!zoomBefore) zoomBefore = snapshot();
    const { m } = measure(), z = clamp(Number(value) / 100, 1, 20);
    if (!Number.isFinite(z)) return;
    try {
      if (z === 1 && !zoomBefore.frame) {
        restore(zoomBefore);
      } else if (Math.abs(z - m.zoom) > 1e-5) {
        migrate();
        write(cropModel(m.w, m.h, m.nw, m.nh, z, m.x, m.y));
        draw();
        refresh();
      }
      if (commit) {
        add(zoomBefore);
        zoomBefore = null;
      }
    } catch (error) {
      restore(zoomBefore);
      zoomBefore = null;
      toast(error.message, 4e3);
    }
  }
  $(".crop-zoom").addEventListener("input", (e) => zoom(e.target.value, false));
  $(".crop-zoom").addEventListener("change", (e) => zoom(e.target.value));
  $(".crop-zoom-value").addEventListener("change", (e) => zoom(e.target.value));
  function cleanClone(doc) {
    if (!session) return;
    const n = target(), path = [];
    for (let p = n; p !== document.documentElement; p = p.parentNode) path.unshift([...p.parentNode.childNodes].indexOf(p));
    let dest = doc;
    for (const i of path) dest = dest.childNodes[i];
    const img = session.img.cloneNode(false);
    restoreAttrs(img, session.entry.ia);
    if (session.entry.frame) {
      const frame = session.entry.frame.cloneNode(false);
      restoreAttrs(frame, session.entry.fa);
      frame.append(img);
      dest.replaceWith(frame);
    } else dest.replaceWith(img);
  }
  return { start, finish, refresh, gesture, cleanClone, owns: (el) => !!session && (el === session.img || el === session.frame), get active() {
    return !!session;
  }, get canUndo() {
    return !!session?.undo?.length;
  }, get canRedo() {
    return !!session?.redo?.length;
  }, history(dir) {
    if (!session) return;
    const from = dir < 0 ? session.undo : session.redo, to = dir < 0 ? session.redo : session.undo, c = from.pop();
    if (c) {
      restore(dir < 0 ? c.before : c.after);
      to.push(c);
      sync();
    }
  }, reset(el, fit) {
    const img = cropImage(el);
    if (!img) return;
    const frame = el === img ? null : el;
    const before = { frame, ia: attrs(img), fa: frame && attrs(frame) };
    const temp = { img, frame };
    session = temp;
    if (frame) {
      write(cropModel(1, 1, 1, 1));
      img.style.setProperty("object-fit", fit, "important");
    } else {
      img.style.width = getComputedStyle(img).width;
      img.style.height = getComputedStyle(img).height;
      img.style.objectFit = fit;
    }
    const after = snapshot();
    session = null;
    const replay = (s) => {
      session = { img, frame: img.closest('[data-crop-frame="1"]') };
      restore(s);
      session = null;
      panel.hidden = outline.hidden = true;
    };
    if (!same(before, after)) push({ undo: () => replay(before), redo: () => replay(after), board: el.closest("[data-artboard]") });
    draw();
  } };
}
export {
  createCrop,
  cropImage,
  cropModel,
  cropPan,
  cropResize
};
