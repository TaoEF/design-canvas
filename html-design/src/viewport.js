const STEPS = [
  0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 3, 4,
];
export function createViewport({
  S,
  root,
  stage,
  host,
  ui,
  style,
  draw,
  pageStep,
  finishEditing,
  currentPage,
  flush,
  save,
  toast,
}) {
  let pan = { x: 0, y: 0 },
    space = false,
    panning,
    restore,
    playTimer;
  const clamp = (z) => Math.max(0.1, Math.min(4, Math.round(z * 1000) / 1000));
  function bounds() {
    if (S.playing) return { x: 0, y: 0, w: innerWidth, h: innerHeight };
    const nav = root.hasAttribute("data-editor-nav")
      ? parseFloat(getComputedStyle(ui.host).getPropertyValue("--nav")) || 0
      : 0;
    return { x: nav, y: 52, w: innerWidth - nav, h: innerHeight - 92 };
  }
  function size() {
    return {
      w: S.current?.offsetWidth || 1280,
      h: S.current?.offsetHeight || 720,
    };
  }
  function drawViewport() {
    if (S.playing && S.playMode === "scroll") {
      const z = S.zoom,
        b = size();
      style.textContent = `@media screen{html[data-editor-scrolling] [data-stage]{position:fixed!important;inset:0!important;display:flex!important;flex-direction:column!important;align-items:center!important;width:100%!important;height:100vh!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;margin:0!important;padding:max(32px,calc((100vh - ${b.h * z}px)/2)) 24px!important;gap:40px!important;box-sizing:border-box!important;transform:none!important;overflow:auto!important;overscroll-behavior:contain;scrollbar-gutter:stable both-edges}html[data-editor-scrolling] [data-artboard]{display:block!important;flex-shrink:0!important;margin:0!important;zoom:${z}!important;box-shadow:none!important}}`;
      draw();
      return;
    }
    const v = bounds(),
      b = size(),
      z = S.zoom;
    const x = v.x + (v.w - b.w * z) / 2 + pan.x,
      y = v.y + (v.h - b.h * z) / 2 + pan.y;
    style.textContent = `@media screen{html[data-editor-on] [data-stage]{position:fixed!important;inset:auto!important;left:${x}px!important;top:${y}px!important;display:block!important;width:${b.w}px!important;height:${b.h}px!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;gap:0!important;transform-origin:0 0!important;transform:scale(${z})!important;overflow:visible!important}html[data-editor-on] [data-artboard]{margin:0!important;box-shadow:none!important}}`;
    ui.querySelector("[data-act=zoom-fit]").setAttribute("aria-pressed", S.fit);
    ui.querySelector(".zv").textContent = `${Math.round(z * 100)}%`;
    draw();
  }
  function zoom(value, at = null) {
    const old = S.zoom,
      z = clamp(value),
      v = bounds();
    if (at) {
      const cx = v.x + v.w / 2,
        cy = v.y + v.h / 2,
        k = z / old;
      pan = {
        x: (pan.x - (at.x - cx)) * k + (at.x - cx),
        y: (pan.y - (at.y - cy)) * k + (at.y - cy),
      };
    }
    S.zoom = z;
    drawViewport();
  }
  function fit() {
    if (S.playing && S.playMode === "scroll") {
      const width = Math.max(
        ...[...stage.querySelectorAll("[data-artboard]")].map(
          (b) => b.offsetWidth,
        ),
        1,
      );
      S.fit = true;
      S.zoom = Math.max(0.1, Math.min((innerWidth - 64) / width, 1));
      drawViewport();
      return;
    }
    const v = bounds(),
      b = size(),
      padding = S.playing ? 0 : 112;
    pan = { x: 0, y: 0 };
    S.fit = true;
    const z = Math.max(
      0.1,
      Math.min((v.w - padding) / b.w, (v.h - padding) / b.h, 4),
    );
    S.zoom = clamp(z);
    drawViewport();
  }
  function step(dir) {
    S.fit = false;
    const z =
      dir > 0
        ? STEPS.find((v) => v > S.zoom + 0.001)
        : [...STEPS].reverse().find((v) => v < S.zoom - 0.001);
    zoom(z ?? S.zoom);
  }
  function refresh(center = false) {
    if (S.fit) fit();
    else {
      if (center) pan = { x: 0, y: 0 };
      drawViewport();
    }
    if (S.playing && S.playMode === "scroll" && center) scrollCurrent();
  }
  function scrollCurrent() {
    if (!S.current) return;
    const r = S.current.getBoundingClientRect();
    stage.scrollTop += r.top - (innerHeight - r.height) / 2;
  }
  let scrollFrame;
  stage.addEventListener("scroll", () => {
    if (!S.playing || S.playMode !== "scroll" || scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null;
      const center = innerHeight / 2;
      const nearest = [...stage.querySelectorAll("[data-artboard]")].reduce(
        (best, b) => {
          const r = b.getBoundingClientRect(),
            distance = Math.abs(r.top + r.height / 2 - center);
          return !best || distance < best.distance ? { b, distance } : best;
        },
        null,
      );
      if (nearest && nearest.b !== S.current) currentPage(nearest.b);
    });
  });
  function showControls() {
    ui.querySelector(".play-controls").classList.add("visible");
    ui.querySelector(".play-exit").style.opacity = "1";
    clearTimeout(playTimer);
    playTimer = setTimeout(() => {
      ui.querySelector(".play-controls").classList.remove("visible");
      if (!ui.querySelector(".play-exit").matches(":focus-visible"))
        ui.querySelector(".play-exit").style.opacity = "0";
    }, 2400);
  }
  function preview(fullscreen = false) {
    if (!S.current) return;
    if (!S.playing) {
      restore = { zoom: S.zoom, fit: S.fit, pan: { ...pan } };
      finishEditing();
      flush().catch(() => {});
      S.playing = true;
      S.reviewContext++;
      S.playMode = fullscreen ? "fullscreen" : "scroll";
      root.setAttribute("data-editor-playing", "");
      root.toggleAttribute("data-editor-scrolling", !fullscreen);
      root.toggleAttribute("data-editor-single", fullscreen);
      host.setAttribute("data-playing", "");
      ui.querySelectorAll("[data-menu]").forEach((n) => {
        n.hidden = true;
      });
      fit();
      if (!fullscreen) scrollCurrent();
      showControls();
    }
    if (fullscreen && !document.fullscreenElement) {
      try {
        const request = root.requestFullscreen?.({ navigationUI: "hide" });
        if (request)
          request.catch(() =>
            toast("当前窗口不支持系统全屏，已进入播放视图。", 4000),
          );
        else toast("当前窗口不支持系统全屏，已进入播放视图。", 4000);
      } catch {
        toast("当前窗口不支持系统全屏，已进入播放视图。", 4000);
      }
    }
  }
  function stop() {
    if (!S.playing) return;
    S.playing = false;
    S.reviewContext++;
    S.playMode = null;
    root.removeAttribute("data-editor-playing");
    root.removeAttribute("data-editor-scrolling");
    root.setAttribute("data-editor-single", "");
    host.removeAttribute("data-playing");
    clearTimeout(playTimer);
    ui.querySelector(".play-exit").style.opacity = "";
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    if (restore) {
      S.zoom = restore.zoom;
      S.fit = restore.fit;
      pan = restore.pan;
    }
    refresh();
    finishEditing();
  }
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && S.playing) stop();
    else if (S.playing) fit();
  });
  addEventListener(
    "pointermove",
    (e) => {
      if (S.playing) showControls();
      if (panning) {
        pan = {
          x: panning.pan.x + e.clientX - panning.x,
          y: panning.pan.y + e.clientY - panning.y,
        };
        drawViewport();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  addEventListener(
    "pointerup",
    () => {
      if (panning) {
        panning = null;
        root.removeAttribute("data-editor-panning");
      }
    },
    true,
  );
  addEventListener(
    "pointercancel",
    () => {
      panning = null;
      root.removeAttribute("data-editor-panning");
    },
    true,
  );
  addEventListener(
    "pointerdown",
    (e) => {
      if (
        S.playing ||
        !S.editing ||
        e.composedPath().includes(host) ||
        (!space && e.button !== 1)
      )
        return;
      finishEditing("pan");
      S.fit = false;
      panning = { x: e.clientX, y: e.clientY, pan: { ...pan } };
      root.setAttribute("data-editor-panning", "");
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true,
  );
  addEventListener(
    "keydown",
    (e) => {
      if (S.playing) {
        const key = e.key.toLowerCase(),
          mod = e.ctrlKey || e.metaKey;
        if (mod && key === "s") {
          save();
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        if (mod && ["+", "=", "-", "_", "0", "1"].includes(key)) {
          if (key === "0") {
            S.fit = false;
            zoom(1);
          } else if (key === "1") fit();
          else step(["+", "="].includes(key) ? 1 : -1);
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        if (key === "escape") stop();
        else if (["arrowright", "arrowdown", "pagedown", " "].includes(key))
          pageStep(1);
        else if (["arrowleft", "arrowup", "pageup"].includes(key)) pageStep(-1);
        else return;
        showControls();
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      if (
        e.code === "Space" &&
        S.editing &&
        !S.text &&
        !e
          .composedPath()
          .some(
            (n) =>
              n instanceof Element &&
              n.matches("input,textarea,button,[contenteditable=true]"),
          )
      ) {
        space = true;
        root.setAttribute("data-editor-panning", "");
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  addEventListener(
    "keyup",
    (e) => {
      if (e.code === "Space") {
        space = false;
        if (!panning) root.removeAttribute("data-editor-panning");
      }
    },
    true,
  );
  addEventListener("blur", () => {
    space = false;
    panning = null;
    root.removeAttribute("data-editor-panning");
  });
  addEventListener(
    "wheel",
    (e) => {
      if (e.composedPath().includes(host)) return;
      if (S.playing || !S.editing) {
        if (!(e.ctrlKey || e.metaKey)) return;
      }
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        S.fit = false;
        zoom(S.zoom * Math.exp(-e.deltaY * 0.01), {
          x: e.clientX,
          y: e.clientY,
        });
      } else if (!S.fit) {
        pan.x -= e.deltaX;
        pan.y -= e.deltaY;
        drawViewport();
      }
    },
    { passive: false, capture: true },
  );
  return { zoom, fit, step, refresh, bounds, preview, stop };
}
