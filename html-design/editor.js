/*! html-design editor v7 · 自动生成，请修改 src/ 后运行 npm run build */
/*! Lucide icons: ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

The following Lucide icons are derived from the Feather project:

airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */
(() => {
  // html-design/src/editor.css
  var editor_default = ':host {\n  all: initial;\n  --paper: #fff;\n  --workspace: #f2f2f2;\n  --hover: #ededed;\n  --active: #e4e4e4;\n  --ink: #202020;\n  --muted: #646464;\n  --line: #e7e7e7;\n  --selection: #258bff;\n  --guide: #10b981;\n  --radius: 8px;\n  --nav: 208px;\n  --head: 52px;\n  --foot: 40px;\n  font:\n    13px/1.35 -apple-system,\n    BlinkMacSystemFont,\n    "Segoe UI",\n    "PingFang SC",\n    sans-serif;\n  color: var(--ink);\n  color-scheme: light;\n}\n* {\n  box-sizing: border-box;\n}\n[hidden] {\n  display: none !important;\n}\n::selection {\n  background: #d5d5d5;\n  color: #171717;\n}\nbutton,\ninput,\nselect,\ntextarea {\n  font: inherit;\n  color: inherit;\n}\nbutton {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 7px;\n  min-width: 32px;\n  height: 32px;\n  padding: 0 9px;\n  border: 0;\n  border-radius: var(--radius);\n  background: transparent;\n  cursor: pointer;\n  white-space: nowrap;\n  line-height: 1.2;\n}\nbutton:hover:not(:disabled) {\n  background: var(--hover);\n}\nbutton[aria-pressed="true"] {\n  background: var(--active);\n}\nbutton:disabled {\n  opacity: 0.35;\n  cursor: default;\n}\nbutton:focus-visible,\ninput:focus-visible,\nselect:focus-visible,\n[role="button"]:focus-visible {\n  outline: 2px solid var(--selection);\n  outline-offset: 2px;\n}\nbutton.primary {\n  background: #202020;\n  color: #fff;\n}\nbutton.primary:hover:not(:disabled) {\n  background: #3c3c3c;\n}\n.icon {\n  display: block;\n  flex-shrink: 0;\n  pointer-events: none;\n}\n.icon-only {\n  width: 32px;\n  padding: 0;\n}\n.head {\n  position: fixed;\n  inset: 0 0 auto;\n  height: var(--head);\n  z-index: 2147483647;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 20px;\n  padding: 0 16px;\n  background: var(--paper);\n}\n.grp {\n  display: flex;\n  align-items: center;\n  gap: 3px;\n  min-width: 0;\n}\n.document {\n  flex: 1;\n  gap: 9px;\n}\n.document-title {\n  min-width: 0;\n  max-width: 260px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-weight: 550;\n}\n.save-state {\n  min-width: 0;\n  max-width: 155px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  justify-content: flex-start;\n  white-space: nowrap;\n  color: var(--muted);\n  font-size: 11px;\n  padding: 0 5px;\n}\n.save-state .state-text {\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.save-state .icon {\n  width: 14px;\n  height: 14px;\n}\n.tools {\n  flex-shrink: 0;\n}\n.layout-toggle {\n  margin: 0 7px;\n}\n.layout-toggle button {\n  gap: 5px;\n}\n.done-button {\n  background: var(--hover);\n}\n:host(:not([data-editing])) .nav-head [data-act="page-add"],\n:host(:not([data-editing])) .thumb-more {\n  display: none;\n}\n.actions {\n  flex: 1;\n  justify-content: flex-end;\n}\n.group-gap {\n  margin-left: 13px;\n}\n.view-seg {\n  display: flex;\n  align-items: center;\n  gap: 0;\n}\n.view-seg button {\n  border-radius: 7px;\n}\n.view-seg .fullscreen {\n  padding-inline: 6px;\n  min-width: 26px;\n}\n.view-seg .fullscreen .icon {\n  width: 16px;\n  height: 16px;\n}\n.nav {\n  position: fixed;\n  left: 0;\n  top: var(--head);\n  bottom: 0;\n  width: var(--nav);\n  z-index: 2147483645;\n  display: flex;\n  flex-direction: column;\n  background: #f8f8f8;\n}\n.nav-head {\n  height: 47px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0 13px 0 20px;\n  flex-shrink: 0;\n}\n.nav-head strong {\n  font-size: 12px;\n  font-weight: 550;\n  color: var(--muted);\n}\n.thumb-list {\n  flex: 1;\n  min-height: 0;\n  overflow: auto;\n  padding: 0 14px 24px;\n  scrollbar-width: thin;\n  scrollbar-color: #cecece transparent;\n  overscroll-behavior: contain;\n}\n.thumb {\n  position: relative;\n  margin-bottom: 18px;\n  border-radius: 7px;\n}\n.thumb-main {\n  outline: 0;\n  cursor: pointer;\n  position: relative;\n}\n.frame {\n  position: relative;\n  width: 176px;\n  overflow: hidden;\n  background: white;\n  border-radius: 3px;\n  box-shadow: 0 0 0 1px #dedede;\n}\n.frame iframe {\n  position: absolute;\n  left: 0;\n  top: 0;\n  border: 0;\n  transform-origin: 0 0;\n  pointer-events: none;\n  background: #fff;\n}\n.thumb.active .frame {\n  box-shadow: 0 0 0 1.5px var(--selection);\n}\n.thumb.active .label {\n  color: #171717;\n}\n.thumb-main:hover .frame {\n  box-shadow: 0 0 0 1.5px #8a8a8a;\n}\n.thumb-main:focus-visible .frame {\n  outline: 2px solid var(--selection);\n  outline-offset: 3px;\n}\n.label {\n  padding: 8px 28px 0 2px;\n  color: #666;\n  font-size: 11px;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  line-height: 16px;\n}\n.thumb-more {\n  position: absolute;\n  right: 0;\n  bottom: -4px;\n  width: 26px;\n  height: 26px;\n  padding: 0;\n  opacity: 0;\n  background: #f8f8f8;\n}\n.thumb:hover .thumb-more,\n.thumb:focus-within .thumb-more,\n.thumb.active .thumb-more {\n  opacity: 1;\n}\n.thumb-more .icon {\n  width: 15px;\n  height: 15px;\n}\n.thumb.dragging {\n  opacity: 0.35;\n}\n.thumb.drop-before::before,\n.thumb.drop-after::after {\n  content: "";\n  position: absolute;\n  left: 0;\n  right: 0;\n  height: 2px;\n  background: #333;\n  pointer-events: none;\n}\n.thumb.drop-before::before {\n  top: -10px;\n}\n.thumb.drop-after::after {\n  bottom: -10px;\n}\n.rename-input {\n  width: 100%;\n  height: 25px;\n  padding: 2px 4px;\n  border: 1px solid #999;\n  border-radius: 4px;\n  background: #fff;\n  font-size: 12px;\n}\n.empty-list {\n  font-size: 12px;\n  color: var(--muted);\n  padding: 10px 5px;\n  line-height: 1.7;\n}\n.footer {\n  position: fixed;\n  bottom: 0;\n  left: var(--nav);\n  right: 0;\n  height: var(--foot);\n  z-index: 2147483645;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0 12px;\n  background: #fff;\n  gap: 14px;\n}\n.footer button {\n  height: 28px;\n  min-width: 28px;\n  padding: 0 5px;\n}\n.page-controls {\n  display: flex;\n  align-items: center;\n  gap: 2px;\n  min-width: 0;\n}\n.pageno {\n  font-size: 12px;\n  color: #555;\n  font-variant-numeric: tabular-nums;\n  white-space: nowrap;\n  text-align: center;\n  min-width: 46px;\n}\n.page-title {\n  max-width: 260px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-size: 12px;\n  color: #666;\n  margin-left: 9px;\n  justify-content: flex-start;\n}\n.page-title:disabled {\n  opacity: 1;\n}\n.zoom {\n  display: flex;\n  align-items: center;\n  gap: 2px;\n}\n.zoom .zv {\n  min-width: 49px;\n  font-size: 12px;\n  font-variant-numeric: tabular-nums;\n}\n.zoom .fit {\n  margin-left: 7px;\n}\n.footer .icon {\n  width: 16px;\n  height: 16px;\n}\n.tbar {\n  position: fixed;\n  left: calc(var(--nav) + (100vw - var(--nav)) / 2);\n  top: calc(var(--head) + 10px);\n  transform: translateX(-50%);\n  z-index: 2147483646;\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  padding: 5px 6px;\n  background: #fff;\n  border-radius: 10px;\n  box-shadow: 0 3px 16px #00000014;\n  max-width: calc(100vw - var(--nav) - 24px);\n}\n.text-tools,\n.image-tools,\n.object-tools {\n  display: flex;\n  align-items: center;\n  gap: 3px;\n}\n.tbar .fs {\n  width: 52px;\n  height: 29px;\n  background: #f4f4f4;\n  border: 0;\n  border-radius: 5px;\n  padding: 0 4px;\n  text-align: center;\n  font-variant-numeric: tabular-nums;\n  appearance: textfield;\n}\n.fs::-webkit-inner-spin-button {\n  appearance: none;\n}\n.color-control {\n  position: relative;\n  width: 32px;\n  height: 32px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  border-radius: 7px;\n}\n.color-control:hover {\n  background: var(--hover);\n}\n.color-control input {\n  position: absolute;\n  inset: 0;\n  opacity: 0;\n  width: 100%;\n  height: 100%;\n  cursor: pointer;\n}\n.color-control .color-swatch {\n  height: 3px;\n  width: 17px;\n  background: currentColor;\n  position: absolute;\n  bottom: 4px;\n  left: 8px;\n  border-radius: 1px;\n}\n.seg {\n  display: flex;\n  padding: 2px;\n  border-radius: 7px;\n  background: #f3f3f3;\n}\n.seg button {\n  height: 27px;\n  font-size: 12px;\n  padding: 0 10px;\n}\n.seg button[aria-pressed="true"] {\n  background: #fff;\n  box-shadow: 0 1px 3px #0001;\n}\n.compact-select {\n  border: 0;\n  background: #f4f4f4;\n  height: 29px;\n  padding: 0 7px;\n  border-radius: 5px;\n  font-size: 12px;\n}\n.tbar .icon {\n  width: 17px;\n  height: 17px;\n}\n.sel {\n  position: fixed;\n  display: none;\n  border: 1px solid var(--selection);\n  box-shadow: 0 0 0 1px #ffffffb3;\n  pointer-events: none;\n  z-index: 2147483644;\n}\n.sel.typing {\n  border-style: dashed;\n}\n.sel i {\n  position: absolute;\n  width: 8px;\n  height: 8px;\n  margin: -4px 0 0 -4px;\n  background: #fff;\n  border: 1px solid var(--selection);\n  border-radius: 1px;\n  pointer-events: auto;\n  box-shadow: 0 0 0 1px #ffffff80;\n}\n.sel.typing i {\n  display: none;\n}\n.sel.multiple i {\n  display: none;\n}\n.selection-member {\n  position: fixed;\n  border: 1px dashed var(--selection);\n  box-shadow: 0 0 0 1px #ffffffb3;\n  pointer-events: none;\n  z-index: 2147483644;\n}\n.marquee {\n  position: fixed;\n  border: 1px solid var(--selection);\n  background: #258bff18;\n  pointer-events: none;\n  z-index: 2147483644;\n}\n.selection-count {\n  padding: 0 7px;\n  color: var(--muted);\n  font-size: 12px;\n  white-space: nowrap;\n}\n.guides {\n  position: fixed;\n  left: var(--nav);\n  top: var(--head);\n  width: calc(100vw - var(--nav));\n  height: calc(100vh - var(--head) - var(--foot));\n  overflow: hidden;\n  pointer-events: none;\n  z-index: 2147483643;\n  fill: none;\n}\n.guide-halo {\n  stroke: #ffffffb3;\n  stroke-width: 3px;\n}\n.guide-line {\n  stroke: var(--guide);\n  stroke-width: 1px;\n}\n:host([data-nav-hidden]) .guides {\n  left: 0;\n  width: 100vw;\n}\n.sel i::before {\n  content: "";\n  position: absolute;\n  inset: -5px;\n}\n[data-h="nw"] {\n  left: 0;\n  top: 0;\n  cursor: nwse-resize;\n}\n[data-h="n"] {\n  left: 50%;\n  top: 0;\n  cursor: ns-resize;\n}\n[data-h="ne"] {\n  left: 100%;\n  top: 0;\n  cursor: nesw-resize;\n}\n[data-h="e"] {\n  left: 100%;\n  top: 50%;\n  cursor: ew-resize;\n}\n[data-h="se"] {\n  left: 100%;\n  top: 100%;\n  cursor: nwse-resize;\n}\n[data-h="s"] {\n  left: 50%;\n  top: 100%;\n  cursor: ns-resize;\n}\n[data-h="sw"] {\n  left: 0;\n  top: 100%;\n  cursor: nesw-resize;\n}\n[data-h="w"] {\n  left: 0;\n  top: 50%;\n  cursor: ew-resize;\n}\n.menu-panel {\n  position: fixed;\n  z-index: 2147483647;\n  min-width: 180px;\n  max-width: min(330px, calc(100vw - 20px));\n  max-height: 70vh;\n  overflow: auto;\n  padding: 6px;\n  border-radius: 10px;\n  background: white;\n  box-shadow: 0 6px 28px #00000024;\n  font-size: 12px;\n}\n.menu-panel button {\n  width: 100%;\n  justify-content: flex-start;\n  height: 34px;\n  padding: 0 9px;\n  border-radius: 6px;\n  font-size: 12px;\n}\n.menu-panel .icon {\n  width: 16px;\n  height: 16px;\n}\n.menu-caption {\n  font-size: 11px;\n  color: #6a6a6a;\n  padding: 8px 9px 4px;\n}\n.menu-separator {\n  height: 1px;\n  background: #eee;\n  margin: 5px 7px;\n}\n.status-detail {\n  font-size: 12px;\n  line-height: 1.65;\n  white-space: normal;\n  margin: 6px 8px;\n  color: #555;\n  max-width: 265px;\n}\n.status-panel button {\n  height: auto;\n  min-height: 34px;\n  white-space: normal;\n  text-align: left;\n}\n.modal {\n  position: fixed;\n  inset: 0;\n  z-index: 2147483647;\n  background: #0005;\n  display: flex;\n  padding: 36px;\n  font:\n    13px/1.4 -apple-system,\n    BlinkMacSystemFont,\n    "Segoe UI",\n    sans-serif;\n  color: #222;\n}\n.box {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  background: #fff;\n  border-radius: 12px;\n  overflow: hidden;\n  min-width: 0;\n}\n.mh {\n  display: flex;\n  align-items: center;\n  gap: 7px;\n  padding: 11px 16px;\n  background: #f6f6f6;\n  flex-wrap: wrap;\n}\n.mh .hint {\n  color: #666;\n  font-size: 11px;\n}\n.mh .sp {\n  flex: 1;\n}\ntextarea {\n  flex: 1;\n  min-height: 0;\n  border: 0;\n  outline: none;\n  resize: none;\n  padding: 18px;\n  font:\n    12px/1.6 ui-monospace,\n    Menlo,\n    Consolas,\n    monospace;\n  white-space: pre;\n  tab-size: 2;\n  caret-color: #222;\n}\n.toast {\n  position: fixed;\n  left: 50%;\n  bottom: 65px;\n  transform: translateX(-50%);\n  max-width: calc(100vw - 40px);\n  padding: 10px 16px;\n  border-radius: 9px;\n  background: #222;\n  color: #fff;\n  font:\n    12px/1.5 -apple-system,\n    BlinkMacSystemFont,\n    "Segoe UI",\n    sans-serif;\n  opacity: 0;\n  transition: opacity 0.15s;\n  pointer-events: none;\n  z-index: 2147483647;\n}\n.toast.show {\n  opacity: 1;\n}\n.empty-canvas {\n  position: fixed;\n  left: var(--nav);\n  right: 0;\n  top: var(--head);\n  bottom: var(--foot);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  flex-direction: column;\n  gap: 14px;\n  color: #666;\n  font-size: 13px;\n}\n.empty-canvas p {\n  margin: 0;\n}\n.empty-canvas > .icon {\n  width: 30px;\n  height: 30px;\n  color: #aaa;\n}\n.play-controls {\n  position: fixed;\n  bottom: 22px;\n  left: 50%;\n  transform: translateX(-50%);\n  z-index: 2147483647;\n  display: flex;\n  align-items: center;\n  gap: 5px;\n  padding: 5px 8px;\n  background: #ffffffed;\n  border-radius: 10px;\n  box-shadow: 0 4px 18px #0002;\n  opacity: 0;\n  transition: opacity 0.15s;\n}\n.play-controls button {\n  height: 31px;\n  min-width: 31px;\n}\n.play-controls.visible,\n.play-controls:hover,\n.play-controls:focus-within {\n  opacity: 1;\n}\n.play-controls .play-title {\n  max-width: 190px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-size: 12px;\n  color: #555;\n  margin: 0 7px;\n}\n.play-controls .pageno {\n  font-size: 12px;\n}\n.play-exit {\n  position: fixed;\n  top: 16px;\n  right: 16px;\n  z-index: 2147483647;\n  background: #fffffff0;\n  color: #222;\n}\n:host([data-playing]) .head,\n:host([data-playing]) .nav,\n:host([data-playing]) .footer,\n:host([data-playing]) .tbar,\n:host([data-playing]) .sel,\n:host([data-playing]) .guides,\n:host([data-playing]) .selection-members,\n:host([data-playing]) .marquee,\n:host([data-playing]) .empty-canvas {\n  display: none !important;\n}\n:host(:not([data-playing])) .play-controls,\n:host(:not([data-playing])) .play-exit {\n  display: none !important;\n}\n:host([data-nav-hidden]) .nav {\n  display: none;\n}\n:host([data-nav-hidden]) .footer {\n  left: 0;\n}\n:host([data-nav-hidden]) .tbar {\n  left: 50%;\n  max-width: calc(100vw - 24px);\n}\n:host([data-nav-hidden]) .empty-canvas {\n  left: 0;\n}\n@media (max-width: 1050px) {\n  .head {\n    gap: 9px;\n    padding: 0 10px;\n  }\n  .document-title {\n    max-width: 140px;\n  }\n  .save-state {\n    max-width: 95px;\n    font-size: 10px;\n  }\n  .group-gap {\n    margin-left: 6px;\n  }\n  .actions {\n    flex: initial;\n  }\n  .document {\n    flex: 1;\n  }\n  .head button {\n    padding-inline: 7px;\n  }\n  .actions .button-label {\n    display: none;\n  }\n}\n@media (max-width: 760px) {\n  :host {\n    --nav: 160px;\n  }\n  .frame {\n    width: 132px;\n  }\n  .head {\n    gap: 4px;\n  }\n  .document-title {\n    max-width: 100px;\n    font-size: 12px;\n  }\n  .save-state {\n    max-width: 27px;\n  }\n  .save-state .state-text {\n    display: none;\n  }\n  .head .preview-button span,\n  .head .export-label {\n    display: none;\n  }\n  .head .group-gap {\n    margin-left: 2px;\n  }\n  .head .layout-toggle {\n    margin-inline: 3px;\n  }\n  .head .layout-toggle span {\n    display: none;\n  }\n  .page-title {\n    max-width: 110px;\n  }\n  .footer {\n    padding: 0 7px;\n  }\n  .tbar {\n    gap: 1px;\n    padding: 4px;\n  }\n  .tbar button {\n    padding-inline: 5px;\n    min-width: 28px;\n  }\n  .nav-head {\n    padding-inline: 12px;\n  }\n}\n@media (max-width: 540px) {\n  :host {\n    --nav: 0px;\n  }\n  .nav {\n    display: none !important;\n  }\n  .footer {\n    left: 0;\n  }\n  .tbar {\n    left: 50%;\n    max-width: calc(100vw - 16px);\n  }\n  .document-title {\n    max-width: 80px;\n  }\n  .head {\n    padding-inline: 6px;\n  }\n  .head button {\n    padding-inline: 5px;\n    min-width: 28px;\n  }\n  .head .document {\n    gap: 2px;\n  }\n  .head .nav-toggle {\n    display: inline-flex;\n  }\n  .head .selection-tool {\n    display: none;\n  }\n  .head .done-button span,\n  .head .preview-button > .icon:last-child {\n    display: none;\n  }\n  :host([data-editing]) .head .preview-button {\n    display: none;\n  }\n  .head .document-title {\n    display: none;\n  }\n  .head [data-act="export"] > .icon:last-child {\n    display: none;\n  }\n  :host([data-mobile-nav]) .nav {\n    display: flex !important;\n    width: 160px;\n    bottom: 40px;\n    box-shadow: 5px 0 20px #0001;\n  }\n  .head .actions {\n    gap: 1px;\n  }\n  .page-title {\n    max-width: 90px;\n  }\n  .footer .fit span {\n    display: none;\n  }\n  .modal {\n    padding: 10px;\n  }\n  .mh .hint {\n    display: none;\n  }\n}\n@media (prefers-reduced-motion: reduce) {\n  * {\n    transition: none !important;\n    scroll-behavior: auto !important;\n  }\n}\n@media print {\n  :host {\n    display: none !important;\n  }\n}\n\n.more-text-formats {\n  display: flex;\n  gap: 4px;\n  padding: 3px 6px;\n}\n.more-text-formats button {\n  width: 32px;\n  padding: 0;\n  justify-content: center;\n}\n:host([data-readonly]) .tools {\n  display: none;\n}\n\n.play-exit:focus-visible {\n  opacity: 1 !important;\n}\n';

  // node_modules/lucide/dist/esm/icons/arrow-down.mjs
  var ArrowDown = [
    ["path", { d: "M12 5v14" }],
    ["path", { d: "m19 12-7 7-7-7" }]
  ];

  // node_modules/lucide/dist/esm/icons/arrow-up.mjs
  var ArrowUp = [
    ["path", { d: "m5 12 7-7 7 7" }],
    ["path", { d: "M12 19V5" }]
  ];

  // node_modules/lucide/dist/esm/icons/bold.mjs
  var Bold = [
    ["path", { d: "M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" }]
  ];

  // node_modules/lucide/dist/esm/icons/bring-to-front.mjs
  var BringToFront = [
    ["rect", { x: "8", y: "8", width: "8", height: "8", rx: "2" }],
    ["path", { d: "M4 10a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2" }],
    ["path", { d: "M14 20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2" }]
  ];

  // node_modules/lucide/dist/esm/icons/check-check.mjs
  var CheckCheck = [
    ["path", { d: "M18 6 7 17l-5-5" }],
    ["path", { d: "m22 10-7.5 7.5L13 16" }]
  ];

  // node_modules/lucide/dist/esm/icons/check.mjs
  var Check = [["path", { d: "M20 6 9 17l-5-5" }]];

  // node_modules/lucide/dist/esm/icons/chevron-down.mjs
  var ChevronDown = [["path", { d: "m6 9 6 6 6-6" }]];

  // node_modules/lucide/dist/esm/icons/chevron-left.mjs
  var ChevronLeft = [["path", { d: "m15 18-6-6 6-6" }]];

  // node_modules/lucide/dist/esm/icons/chevron-right.mjs
  var ChevronRight = [["path", { d: "m9 18 6-6-6-6" }]];

  // node_modules/lucide/dist/esm/icons/circle-alert.mjs
  var CircleAlert = [
    ["circle", { cx: "12", cy: "12", r: "10" }],
    ["line", { x1: "12", x2: "12", y1: "8", y2: "12" }],
    ["line", { x1: "12", x2: "12.01", y1: "16", y2: "16" }]
  ];

  // node_modules/lucide/dist/esm/icons/code.mjs
  var Code = [
    ["path", { d: "m16 18 6-6-6-6" }],
    ["path", { d: "m8 6-6 6 6 6" }]
  ];

  // node_modules/lucide/dist/esm/icons/copy.mjs
  var Copy = [
    ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }],
    ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }]
  ];

  // node_modules/lucide/dist/esm/icons/download.mjs
  var Download = [
    ["path", { d: "M12 15V3" }],
    ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
    ["path", { d: "m7 10 5 5 5-5" }]
  ];

  // node_modules/lucide/dist/esm/icons/ellipsis.mjs
  var Ellipsis = [
    ["circle", { cx: "12", cy: "12", r: "1" }],
    ["circle", { cx: "19", cy: "12", r: "1" }],
    ["circle", { cx: "5", cy: "12", r: "1" }]
  ];

  // node_modules/lucide/dist/esm/icons/file-text.mjs
  var FileText = [
    [
      "path",
      {
        d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"
      }
    ],
    ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5" }],
    ["path", { d: "M10 9H8" }],
    ["path", { d: "M16 13H8" }],
    ["path", { d: "M16 17H8" }]
  ];

  // node_modules/lucide/dist/esm/icons/grip-vertical.mjs
  var GripVertical = [
    ["circle", { cx: "9", cy: "12", r: "1" }],
    ["circle", { cx: "9", cy: "5", r: "1" }],
    ["circle", { cx: "9", cy: "19", r: "1" }],
    ["circle", { cx: "15", cy: "12", r: "1" }],
    ["circle", { cx: "15", cy: "5", r: "1" }],
    ["circle", { cx: "15", cy: "19", r: "1" }]
  ];

  // node_modules/lucide/dist/esm/icons/image.mjs
  var Image2 = [
    ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }],
    ["circle", { cx: "9", cy: "9", r: "2" }],
    ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }]
  ];

  // node_modules/lucide/dist/esm/icons/italic.mjs
  var Italic = [
    ["line", { x1: "19", x2: "10", y1: "4", y2: "4" }],
    ["line", { x1: "14", x2: "5", y1: "20", y2: "20" }],
    ["line", { x1: "15", x2: "9", y1: "4", y2: "20" }]
  ];

  // node_modules/lucide/dist/esm/icons/layout-template.mjs
  var LayoutTemplate = [
    ["rect", { width: "18", height: "7", x: "3", y: "3", rx: "1" }],
    ["rect", { width: "9", height: "7", x: "3", y: "14", rx: "1" }],
    ["rect", { width: "5", height: "7", x: "16", y: "14", rx: "1" }]
  ];

  // node_modules/lucide/dist/esm/icons/lock.mjs
  var Lock = [
    ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2" }],
    ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4" }]
  ];

  // node_modules/lucide/dist/esm/icons/maximize.mjs
  var Maximize = [
    ["path", { d: "M8 3H5a2 2 0 0 0-2 2v3" }],
    ["path", { d: "M21 8V5a2 2 0 0 0-2-2h-3" }],
    ["path", { d: "M3 16v3a2 2 0 0 0 2 2h3" }],
    ["path", { d: "M16 21h3a2 2 0 0 0 2-2v-3" }]
  ];

  // node_modules/lucide/dist/esm/icons/minimize.mjs
  var Minimize = [
    ["path", { d: "M8 3v3a2 2 0 0 1-2 2H3" }],
    ["path", { d: "M21 8h-3a2 2 0 0 1-2-2V3" }],
    ["path", { d: "M3 16h3a2 2 0 0 1 2 2v3" }],
    ["path", { d: "M16 21v-3a2 2 0 0 1 2-2h3" }]
  ];

  // node_modules/lucide/dist/esm/icons/minus.mjs
  var Minus = [["path", { d: "M5 12h14" }]];

  // node_modules/lucide/dist/esm/icons/mouse-pointer-2.mjs
  var MousePointer2 = [
    [
      "path",
      {
        d: "M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"
      }
    ]
  ];

  // node_modules/lucide/dist/esm/icons/panel-left.mjs
  var PanelLeft = [
    ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
    ["path", { d: "M9 3v18" }]
  ];

  // node_modules/lucide/dist/esm/icons/pencil.mjs
  var Pencil = [
    [
      "path",
      {
        d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
      }
    ],
    ["path", { d: "m15 5 4 4" }]
  ];

  // node_modules/lucide/dist/esm/icons/play.mjs
  var Play = [
    [
      "path",
      { d: "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" }
    ]
  ];

  // node_modules/lucide/dist/esm/icons/plus.mjs
  var Plus = [
    ["path", { d: "M5 12h14" }],
    ["path", { d: "M12 5v14" }]
  ];

  // node_modules/lucide/dist/esm/icons/presentation.mjs
  var Presentation = [
    ["path", { d: "M2 3h20" }],
    ["path", { d: "M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" }],
    ["path", { d: "m7 21 5-5 5 5" }]
  ];

  // node_modules/lucide/dist/esm/icons/printer.mjs
  var Printer = [
    ["path", { d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }],
    ["path", { d: "M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" }],
    ["rect", { x: "6", y: "14", width: "12", height: "8", rx: "1" }]
  ];

  // node_modules/lucide/dist/esm/icons/redo-2.mjs
  var Redo2 = [
    ["path", { d: "m15 14 5-5-5-5" }],
    ["path", { d: "M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13" }]
  ];

  // node_modules/lucide/dist/esm/icons/refresh-cw.mjs
  var RefreshCw = [
    ["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }],
    ["path", { d: "M21 3v5h-5" }],
    ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }],
    ["path", { d: "M8 16H3v5" }]
  ];

  // node_modules/lucide/dist/esm/icons/replace.mjs
  var Replace = [
    ["path", { d: "M14 4a1 1 0 0 1 1-1" }],
    ["path", { d: "M15 10a1 1 0 0 1-1-1" }],
    ["path", { d: "M21 4a1 1 0 0 0-1-1" }],
    ["path", { d: "M21 9a1 1 0 0 1-1 1" }],
    ["path", { d: "m3 7 3 3 3-3" }],
    ["path", { d: "M6 10V5a2 2 0 0 1 2-2h2" }],
    ["rect", { x: "3", y: "14", width: "7", height: "7", rx: "1" }]
  ];

  // node_modules/lucide/dist/esm/icons/rows-3.mjs
  var Rows3 = [
    ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
    ["path", { d: "M21 9H3" }],
    ["path", { d: "M21 15H3" }]
  ];

  // node_modules/lucide/dist/esm/icons/save.mjs
  var Save = [
    [
      "path",
      {
        d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
      }
    ],
    ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" }],
    ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7" }]
  ];

  // node_modules/lucide/dist/esm/icons/scan.mjs
  var Scan = [
    ["path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }],
    ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }],
    ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }],
    ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }]
  ];

  // node_modules/lucide/dist/esm/icons/send-to-back.mjs
  var SendToBack = [
    ["rect", { x: "14", y: "14", width: "8", height: "8", rx: "2" }],
    ["rect", { x: "2", y: "2", width: "8", height: "8", rx: "2" }],
    ["path", { d: "M7 14v1a2 2 0 0 0 2 2h1" }],
    ["path", { d: "M14 7h1a2 2 0 0 1 2 2v1" }]
  ];

  // node_modules/lucide/dist/esm/icons/square.mjs
  var Square = [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }]];

  // node_modules/lucide/dist/esm/icons/strikethrough.mjs
  var Strikethrough = [
    ["path", { d: "M16 4H9a3 3 0 0 0-2.83 4" }],
    ["path", { d: "M14 12a4 4 0 0 1 0 8H6" }],
    ["line", { x1: "4", x2: "20", y1: "12", y2: "12" }]
  ];

  // node_modules/lucide/dist/esm/icons/text-align-center.mjs
  var TextAlignCenter = [
    ["path", { d: "M21 5H3" }],
    ["path", { d: "M17 12H7" }],
    ["path", { d: "M19 19H5" }]
  ];

  // node_modules/lucide/dist/esm/icons/text-align-end.mjs
  var TextAlignEnd = [
    ["path", { d: "M21 5H3" }],
    ["path", { d: "M21 12H9" }],
    ["path", { d: "M21 19H7" }]
  ];

  // node_modules/lucide/dist/esm/icons/text-align-justify.mjs
  var TextAlignJustify = [
    ["path", { d: "M3 5h18" }],
    ["path", { d: "M3 12h18" }],
    ["path", { d: "M3 19h18" }]
  ];

  // node_modules/lucide/dist/esm/icons/text-align-start.mjs
  var TextAlignStart = [
    ["path", { d: "M21 5H3" }],
    ["path", { d: "M15 12H3" }],
    ["path", { d: "M17 19H3" }]
  ];

  // node_modules/lucide/dist/esm/icons/text-cursor-input.mjs
  var TextCursorInput = [
    ["path", { d: "M12 20h-1a2 2 0 0 1-2-2 2 2 0 0 1-2 2H6" }],
    ["path", { d: "M13 8h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-7" }],
    ["path", { d: "M5 16H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1" }],
    ["path", { d: "M6 4h1a2 2 0 0 1 2 2 2 2 0 0 1 2-2h1" }],
    ["path", { d: "M9 6v12" }]
  ];

  // node_modules/lucide/dist/esm/icons/trash.mjs
  var Trash = [
    ["path", { d: "M10 11v6" }],
    ["path", { d: "M14 11v6" }],
    ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }],
    ["path", { d: "M3 6h18" }],
    ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }]
  ];

  // node_modules/lucide/dist/esm/icons/undo-2.mjs
  var Undo2 = [
    ["path", { d: "M9 14 4 9l5-5" }],
    ["path", { d: "M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" }]
  ];

  // node_modules/lucide/dist/esm/icons/underline.mjs
  var Underline = [
    ["path", { d: "M6 4v6a6 6 0 0 0 12 0V4" }],
    ["line", { x1: "4", x2: "20", y1: "20", y2: "20" }]
  ];

  // node_modules/lucide/dist/esm/icons/type.mjs
  var Type = [
    ["path", { d: "M12 4v16" }],
    ["path", { d: "M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" }],
    ["path", { d: "M9 20h6" }]
  ];

  // node_modules/lucide/dist/esm/icons/x.mjs
  var X = [
    ["path", { d: "M18 6 6 18" }],
    ["path", { d: "m6 6 12 12" }]
  ];

  // html-design/src/icons.js
  var icons = {
    Undo2,
    Redo2,
    MousePointer2,
    Pencil,
    Type,
    Image: Image2,
    PanelLeft,
    PanelsTopBottom: Rows3,
    Play,
    Maximize,
    Minimize,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Plus,
    Minus,
    Ellipsis,
    X,
    Code,
    Download,
    Copy,
    Printer,
    FileText,
    Presentation,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    AlignLeft: TextAlignStart,
    AlignCenter: TextAlignCenter,
    AlignRight: TextAlignEnd,
    AlignJustify: TextAlignJustify,
    Replace,
    Trash2: Trash,
    ArrowUp,
    ArrowDown,
    BringToFront,
    SendToBack,
    Check,
    CircleAlert,
    Lock,
    RefreshCw,
    Save,
    Scan,
    Square,
    LayoutTemplate,
    GripVertical,
    TextCursorInput,
    CheckCheck
  };
  var escape = (text) => String(text).replace(
    /[&"<>]/g,
    (c) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[c]
  );
  function icon(name) {
    const nodes = icons[name];
    if (!nodes) throw new Error(`Unknown icon: ${name}`);
    return `<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${nodes.map(
      ([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${escape(v)}"`).join(" ")}/>`
    ).join("")}</svg>`;
  }
  function button(action, name, label, { text = "", cls = "", attrs = "" } = {}) {
    return `<button type="button" data-act="${action}" class="${cls}" title="${escape(label)}" aria-label="${escape(label)}" ${attrs}>${icon(name)}${text ? `<span>${escape(text)}</span>` : ""}</button>`;
  }

  // html-design/src/ui.js
  function toolbarHTML({ HANDLES }) {
    const fmt = (cmd, name, label) => `<button type="button" data-fmt="${cmd}" title="${label}" aria-label="${label}" class="icon-only">${icon(name)}</button>`;
    return `<style>${editor_default}</style>
  <header class="head" aria-label="编辑器工具栏">
    <div class="grp document">${button("nav", "PanelLeft", "显示或隐藏页面栏", { cls: "icon-only nav-toggle", attrs: 'aria-pressed="true"' })}<span class="document-title title"></span>
      <button class="save-state" data-act="status" title="保存状态"><span class="state-icon">${icon("Check")}</span><span class="state-text">正在连接</span></button></div>
    <div class="grp tools" hidden>${button("undo", "Undo2", "撤销 (Ctrl/⌘ Z)", { cls: "icon-only" })}${button("redo", "Redo2", "重做 (Ctrl/⌘ Shift Z)", { cls: "icon-only" })}
      <div class="seg layout-toggle" role="group" aria-label="编辑模式">${button("flow", "LayoutTemplate", "排版模式：保留自动布局", { text: "排版", attrs: 'aria-pressed="true"' })}${button("artboard", "Square", "画板模式：自由定位", { text: "画板", attrs: 'aria-pressed="false"' })}</div>
      ${button("add-text", "Type", "插入文字", { cls: "icon-only" })}${button("add-image", "Image", "插入图片", { cls: "icon-only" })}</div>
    <div class="grp actions">
      ${button("edit", "Pencil", "编辑画布", { text: "编辑", cls: "edit-button", attrs: 'aria-pressed="false"' })}${button("done", "Check", "完成编辑，返回画布预览", { text: "完成", cls: "done-button", attrs: "hidden" })}
      <button data-act="preview" class="preview-button" title="播放" aria-label="播放" aria-expanded="false" aria-haspopup="menu">${icon("Play")}<span>播放</span>${icon("ChevronDown")}</button>
      <button data-act="export" class="primary" aria-expanded="false" aria-haspopup="menu">${icon("Download")}<span class="export-label">导出</span>${icon("ChevronDown")}</button>
      ${button("more", "Ellipsis", "更多选项", { cls: "icon-only", attrs: 'aria-expanded="false" aria-haspopup="menu"' })}</div>
  </header>
  <aside class="nav" aria-label="页面管理"><div class="nav-head"><strong>页面</strong>${button("page-add", "Plus", "新增页面", { cls: "icon-only" })}</div><div class="thumb-list" role="list" aria-label="页面缩略图"></div></aside>
  <footer class="footer"><div class="page-controls">${button("prev", "ChevronLeft", "上一页 (PageUp / ←)", { cls: "icon-only" })}<span class="pageno"></span>${button("next", "ChevronRight", "下一页 (PageDown / →)", { cls: "icon-only" })}<button class="page-title" data-act="page-rename" title="重命名当前页面"></button></div>
    <div class="zoom">${button("zoom-out", "Minus", "缩小 (Ctrl/⌘ −)", { cls: "icon-only" })}<button data-act="zoom-reset" class="zv" title="恢复 100% (Ctrl/⌘ 0)">100%</button>${button("zoom-in", "Plus", "放大 (Ctrl/⌘ +)", { cls: "icon-only" })}${button("zoom-fit", "Scan", "适应窗口 (Ctrl/⌘ 1)", { cls: "fit", text: "适应" })}</div></footer>
  <div class="tbar" role="toolbar" aria-label="元素工具" hidden>
    <span class="selection-count" role="status" aria-live="polite" hidden></span>
    <div class="text-tools"><input class="fs" type="number" min="6" max="999" aria-label="字号" title="字号，单位 px">${fmt("bold", "Bold", "加粗 (Ctrl/⌘ B)")}
      <label class="color-control" title="文字颜色" aria-label="文字颜色">${icon("Type")}<span class="color-swatch"></span><input type="color" class="cpick" aria-label="文字颜色"></label>
      <select class="compact-select text-align" aria-label="文字对齐"><option value="left">左对齐</option><option value="center">居中</option><option value="right">右对齐</option><option value="justify">两端对齐</option></select>
      </div>
    <div class="image-tools" hidden>${button("image-replace", "Replace", "替换图片", { text: "替换" })}<div class="seg" role="group" aria-label="图片填充模式"><button data-act="image-fit" title="完整显示，保持比例">Fit</button><button data-act="image-cover" title="裁切铺满，保持比例">Cover</button></div></div>
    <div class="object-tools">${button("element-more", "Ellipsis", "元素操作", { cls: "icon-only", attrs: 'aria-expanded="false" aria-haspopup="menu"' })}</div>
  </div>
  <div class="sel">${HANDLES.map((h) => `<i data-h="${h}" title="${h.length === 2 ? "拖动缩放（文字角点同步缩放字号）" : "调整边界，不改变字号"}"></i>`).join("")}</div>
  <div class="menu-panel" data-menu="play" role="menu" hidden>${button("scroll-play", "PanelsTopBottom", "滚动播放：上下滚动浏览全部页面", { text: "滚动播放" })}${button("fullscreen", "Maximize", "全屏播放", { text: "全屏播放" })}</div>
  <div class="menu-panel pop" data-menu="export" role="menu" hidden>
    ${button("pdf", "FileText", "下载 PDF", { text: "PDF 文档" })}${button("pptx", "Presentation", "下载 PPTX（文字和图片可编辑）", { text: "PowerPoint · 可编辑" })}<div class="menu-separator"></div>
    ${button("download", "Download", "下载 HTML", { text: "下载 HTML" })}${button("copy", "Copy", "复制 HTML", { text: "复制 HTML" })}${button("print", "Printer", "浏览器打印 / PDF", { text: "打印" })}
  </div>
  <div class="menu-panel" data-menu="more" role="menu" hidden>${button("source", "Code", "查看或修改源码", { text: "源码" })}${button("save", "Save", "立即保存 (Ctrl/⌘ S)", { text: "立即保存" })}<div class="menu-separator"></div>${button("help", "TextCursorInput", "快捷键与使用帮助", { text: "快捷键与帮助" })}</div>
  <div class="menu-panel" data-menu="element" role="menu" hidden><div class="more-text-section" hidden><div class="more-text-formats" role="group" aria-label="更多文字格式">${fmt("italic", "Italic", "斜体")}${fmt("underline", "Underline", "下划线")}${fmt("strikeThrough", "Strikethrough", "删除线")}</div><button data-fmt="removeFormat">${icon("Type")}清除文字格式</button><div class="menu-separator"></div></div>${button("element-duplicate", "Copy", "复制元素 (Ctrl/⌘ D)", { text: "复制元素" })}${button("element-front", "BringToFront", "置于顶层", { text: "置于顶层" })}${button("element-back", "SendToBack", "置于底层", { text: "置于底层" })}${button("element-delete", "Trash2", "删除元素 (Delete)", { text: "删除元素" })}</div>
  <div class="menu-panel" data-menu="page" role="menu" hidden>${button("page-add", "Plus", "在此后新增页面", { text: "新增页面" })}${button("page-copy", "Copy", "复制页面", { text: "复制页面" })}${button("page-rename", "TextCursorInput", "重命名页面", { text: "重命名" })}<div class="menu-separator"></div>${button("page-up", "ArrowUp", "上移页面", { text: "上移" })}${button("page-down", "ArrowDown", "下移页面", { text: "下移" })}<div class="menu-separator"></div>${button("page-delete", "Trash2", "删除页面", { text: "删除页面" })}</div>
  <div class="menu-panel status-panel" data-menu="status" role="menu" hidden><p class="status-detail"></p>${button("retry", "RefreshCw", "重试保存", { text: "重试", attrs: "hidden" })}${button("recover", "RefreshCw", "恢复未保存草稿", { text: "恢复草稿", attrs: "hidden" })}${button("conflict", "Download", "下载当前副本并同步最新文件", { text: "下载副本并同步", attrs: "hidden" })}</div>
  <div class="empty-canvas" hidden>${icon("Presentation")}<p>从第一页开始</p>${button("page-add", "Plus", "新增页面", { text: "新增页面", cls: "primary" })}</div>
  <div class="play-controls"><button data-act="prev" aria-label="上一页">${icon("ChevronLeft")}</button><span class="pageno"></span><button data-act="next" aria-label="下一页">${icon("ChevronRight")}</button><span class="play-title"></span>${button("stop", "X", "退出播放 (Esc)", { cls: "icon-only" })}</div>${button("stop", "X", "退出播放 (Esc)", { cls: "icon-only play-exit" })}
  <div class="modal" role="dialog" aria-label="HTML 源码" aria-modal="true" hidden><div class="box"><div class="mh"><b>源码</b><span class="hint">Ctrl/⌘ Enter 应用；新脚本保存后重新打开运行。</span><span class="sp"></span>${button("src-copy", "Copy", "复制源码", { text: "复制" })}${button("src-download", "Download", "下载源码", { text: "下载" })}<button data-act="src-apply" class="primary">应用</button>${button("src-close", "X", "关闭源码", { cls: "icon-only" })}</div><textarea spellcheck="false" aria-label="HTML 源码"></textarea></div></div>
  <input type="file" accept="image/*" multiple hidden class="file"><div class="toast" role="status" aria-live="polite"></div>`;
  }

  // html-design/src/export.js
  function createExporter({ ui, serialize, toast, download, fileName }) {
    let exporting = false;
    async function exportFile(format) {
      if (exporting) return;
      if (!/^https?:$/.test(location.protocol)) return toast("请通过项目的本地预览打开后导出；离线时可以使用浏览器打印 PDF。", 6e3);
      exporting = true;
      const buttons = [...ui.querySelectorAll('[data-act="pdf"],[data-act="pptx"]')];
      buttons.forEach((b) => {
        b.disabled = true;
      });
      const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 18e4);
      try {
        const snapshot = serialize();
        toast(`正在生成 ${format.toUpperCase()}，请稍候…`, 18e4);
        const response = await fetch(`/__html-design/export/${format}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ html: snapshot, baseUrl: location.href, title: document.title, filename: fileName().replace(/\.html?$/i, "") })
        });
        if (!response.ok) {
          const problem = await response.json().catch(() => null);
          throw new Error(problem?.error || "本地预览未启用文件导出，请启动新版预览服务后再试。");
        }
        const type = response.headers.get("content-type") || "";
        if (!type.includes(format === "pdf" ? "application/pdf" : "presentationml.presentation")) throw new Error("本地预览未启用文件导出，请启动新版预览服务后再试。");
        download(await response.blob(), `${fileName().replace(/\.html?$/i, "")}.${format}`);
        toast(`${format.toUpperCase()} 已生成，已开始下载。`, 4e3);
      } catch (error) {
        toast(error.name === "AbortError" ? "导出超时，请减少页面或图片体积后重试。" : error.message === "Failed to fetch" ? "无法连接本地导出服务，请确认预览服务正在运行。" : error.message, 7e3);
      } finally {
        clearTimeout(timeout);
        exporting = false;
        buttons.forEach((b) => {
          b.disabled = false;
        });
      }
    }
    return exportFile;
  }

  // html-design/src/drafts.js
  function createDrafts(path) {
    let dbPromise;
    const id = crypto.randomUUID();
    function db() {
      return dbPromise ||= new Promise((resolve, reject) => {
        const r = indexedDB.open("html-design-drafts", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("drafts", { keyPath: "id" });
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    }
    async function run(mode, fn) {
      const database = await db();
      return new Promise((resolve, reject) => {
        const tx = database.transaction("drafts", mode), r = fn(tx.objectStore("drafts"));
        tx.oncomplete = () => resolve(r.result);
        tx.onerror = tx.onabort = () => reject(tx.error || new Error("草稿备份失败"));
      });
    }
    return {
      put: (html, revision) => run("readwrite", (s) => s.put({ id, path, html, revision, updated: Date.now() })),
      remove: (draftId = id) => run("readwrite", (s) => s.delete(draftId)),
      async latest() {
        return (await run("readonly", (s) => s.getAll())).filter((d) => d.path === path).sort((a, b) => b.updated - a.updated)[0];
      }
    };
  }

  // html-design/src/persistence.js
  function createPersistence({ config, serialize, pause, isBusy, hasPendingSource, applyHTML, changed, render, reload, download }) {
    let token, revision = config?.revision, role = "viewer", blocked = false, frozen = false, connected = false;
    let dirty = false, generation = 0, timer, saving, polling = false, lastContact = 0, leaseMs = 15e3, recovery;
    let draftQueue = Promise.resolve(), refreshing = false, opening = false;
    const managed = !!config, drafts = managed && createDrafts(config.path);
    const canEdit = () => !managed || connected && role === "owner" && !frozen && !blocked;
    function show(message, options = {}) {
      render({ message, canEdit: canEdit(), managed, dirty, ...options });
    }
    function markDirty() {
      dirty = true;
      generation++;
      changed(true);
      show(managed ? "尚未保存" : "离线 · 尚未下载");
      clearTimeout(timer);
      timer = setTimeout(() => flush().catch(() => {
      }), 800);
    }
    async function request(action, body = {}) {
      const response = await fetch(`/__html-design/document/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: config.path, token, ...body }),
        signal: AbortSignal.timeout(12e3)
      });
      const result = await response.json();
      if (!response.ok) throw Object.assign(new Error(result.error || "保存失败"), { status: response.status });
      lastContact = Date.now();
      return result;
    }
    function backup(html = serialize(false), base = revision) {
      const job = draftQueue.catch(() => {
      }).then(() => drafts.put(html, base));
      draftQueue = job;
      return job;
    }
    async function flush() {
      if (!managed) return;
      if (saving) {
        await saving;
        if (dirty && !blocked) return flush();
        return;
      }
      if (!dirty) return;
      if (isBusy()) {
        clearTimeout(timer);
        timer = setTimeout(() => flush().catch(() => {
        }), 300);
        return;
      }
      saving = (async () => {
        const html = serialize(false), version = generation;
        let backedUp = true;
        try {
          await backup(html);
        } catch {
          backedUp = false;
        }
        if (!connected || role !== "owner" || blocked) {
          show(backedUp ? "修改已保留 · 等待连接或接管" : "尚未保存 · 请下载 HTML 备份", { retry: true });
          return;
        }
        show("正在保存…");
        try {
          const result = await request("save", { revision, html });
          revision = result.revision;
          if (version === generation) {
            dirty = false;
            changed(false);
            await draftQueue.catch(() => {
            });
            await drafts.remove().catch(() => {
            });
          }
          show(dirty ? "尚未保存" : "已自动保存");
        } catch (error) {
          if (error.status === 409) {
            blocked = true;
            pause();
          }
          if (error.status === 401) {
            connected = false;
            pause();
          }
          if (!error.status) {
            connected = false;
            pause();
          }
          show(error.status ? error.message : "保存失败 · 修改已保留，将重试", { retry: true, conflict: blocked });
          throw error;
        }
      })();
      try {
        await saving;
      } finally {
        saving = null;
      }
      if (dirty && canEdit()) {
        clearTimeout(timer);
        timer = setTimeout(() => flush().catch(() => {
        }), 800);
      }
    }
    function adopt(result) {
      role = result.role;
      leaseMs = result.leaseMs || leaseMs;
      connected = true;
    }
    async function refresh() {
      if (refreshing) return;
      refreshing = true;
      if (token) await request("release").catch(() => {
      });
      token = null;
      reload();
    }
    async function sync() {
      if (polling || saving || !token || refreshing) return;
      polling = true;
      try {
        const result = await request("sync");
        if (saving) return;
        adopt(result);
        if (result.revision !== revision) {
          if (hasPendingSource()) {
            frozen = true;
            show("源码有未应用修改，请先下载源码备份");
            return;
          }
          if (dirty) {
            blocked = true;
            pause();
            await backup().catch(() => {
            });
            show("版本冲突 · 修改已保留，请下载 HTML", { retry: true, conflict: true });
            return;
          }
          await refresh();
          return;
        }
        if (role !== "owner" && dirty && !blocked && !result.ownerPresent && !result.locked && !result.pending) {
          adopt(await request("takeover", { revision }));
          if (role === "owner") frozen = false;
        }
        if (role !== "owner") {
          frozen = true;
          pause();
        }
        if (role === "owner" && result.pending && !result.pending.mine) {
          frozen = true;
          if (pause() === false) {
            frozen = false;
            show("请先应用或关闭源码，再交接编辑");
            return;
          }
          show("正在保存并交接…");
          await flush();
          if (dirty) return;
          adopt(await request("yield", { requestId: result.pending.id, revision }));
        } else if (role === "owner" && !result.locked && !result.pending && !blocked) frozen = false;
        if (dirty && canEdit()) await flush();
        if (blocked) show("版本冲突 · 修改已保留，请下载 HTML", { retry: true, conflict: true });
        else if (dirty) show("尚未保存 · 修改已保留", { retry: true, conflict: role !== "owner" });
        else if (recovery) show("发现未保存草稿", { recover: true, takeover: role !== "owner" && !result.locked });
        else if (result.locked) show("AI 正在修改 · 只读同步");
        else if (result.pending) show("正在交接编辑权限…");
        else show(role === "owner" ? "已自动保存" : "其他窗口编辑中 · 只读", { takeover: role !== "owner" });
      } catch (error) {
        if (error.status === 401) {
          connected = false;
          frozen = true;
          pause();
          if (dirty) await backup().catch(() => {
          });
          try {
            const result = await request("open", { revision });
            token = result.token;
            adopt(result);
            if (result.revision !== revision && dirty) blocked = true;
          } catch {
          }
        }
        if (Date.now() - lastContact > leaseMs / 2) {
          connected = false;
          frozen = true;
          pause();
        }
        show("连接中断 · 修改已保留，将重试", { retry: true });
      } finally {
        polling = false;
      }
    }
    async function start() {
      if (!managed) {
        show("离线 · 保存将下载 HTML");
        return;
      }
      if (opening || refreshing) return;
      opening = true;
      show("正在连接自动保存…");
      try {
        recovery = await drafts.latest().catch(() => null);
        const result = await request("open", { revision });
        token = result.token;
        adopt(result);
        frozen = role !== "owner";
        if (result.revision !== revision) {
          await refresh();
          return;
        }
        await sync();
      } catch {
        show("无法连接 · 自动保存未启用", { retry: true });
      } finally {
        opening = false;
      }
    }
    const heartbeat = managed && setInterval(() => token ? sync() : start(), 2e3);
    if (managed) {
      addEventListener("pagehide", () => {
        if (dirty) backup().catch(() => {
        });
        if (token && !dirty) navigator.sendBeacon("/__html-design/document/release", new Blob([JSON.stringify({ path: config.path, token })], { type: "application/json" }));
      });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && dirty) flush().catch(() => {
        });
      });
    }
    return {
      start,
      canEdit,
      markDirty,
      flush,
      async save() {
        if (!managed) {
          download(serialize());
          dirty = false;
          changed(false);
          show("已下载 HTML");
          return;
        }
        try {
          await flush();
          if (!dirty) show("已保存到原文件");
        } catch {
        }
      },
      async conflict() {
        await backup().catch(() => {
        });
        download(serialize(), "unsaved-copy.html");
        dirty = false;
        changed(false);
        await refresh();
      },
      async takeover() {
        try {
          if (dirty || blocked) {
            show("当前有未保存修改，请先下载 HTML 备份");
            return false;
          }
          adopt(await request("takeover", { revision }));
          await sync();
          return true;
        } catch (error) {
          show(error.message, { retry: true });
          return false;
        }
      },
      async retry() {
        if (!token) await start();
        else {
          await sync();
          if (dirty && canEdit()) await flush().catch(() => {
          });
        }
      },
      async restore() {
        if (!recovery) return;
        if (!canEdit()) return show("请先点击「编辑」，再恢复草稿", { takeover: true, recover: true });
        if (recovery.revision !== revision) {
          download(recovery.html, "recovered-draft.html");
          show("草稿基于旧版本，已下载；原文件保持最新版本");
          return;
        }
        const draft = recovery;
        recovery = null;
        applyHTML(draft.html);
        markDirty();
        await flush().catch(() => {
        });
        if (!dirty) await drafts.remove(draft.id).catch(() => {
        });
      }
    };
  }

  // html-design/src/viewport.js
  var STEPS = [
    0.1,
    0.25,
    0.33,
    0.5,
    0.67,
    0.75,
    0.9,
    1,
    1.1,
    1.25,
    1.5,
    1.75,
    2,
    3,
    4
  ];
  function createViewport({
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
    toast
  }) {
    let pan = { x: 0, y: 0 }, space = false, panning, restore, playTimer;
    const clamp = (z) => Math.max(0.1, Math.min(4, Math.round(z * 1e3) / 1e3));
    function bounds() {
      if (S.playing) return { x: 0, y: 0, w: innerWidth, h: innerHeight };
      const nav = root.hasAttribute("data-editor-nav") ? innerWidth <= 540 ? 0 : innerWidth <= 760 ? 160 : 208 : 0;
      return { x: nav, y: 52, w: innerWidth - nav, h: innerHeight - 92 };
    }
    function size() {
      return {
        w: S.current?.offsetWidth || 1280,
        h: S.current?.offsetHeight || 720
      };
    }
    function drawViewport() {
      if (S.playing && S.playMode === "scroll") {
        const z2 = S.zoom, b2 = size();
        style.textContent = `@media screen{html[data-editor-scrolling] [data-stage]{position:fixed!important;inset:0!important;display:flex!important;flex-direction:column!important;align-items:center!important;width:100%!important;height:100vh!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;margin:0!important;padding:max(32px,calc((100vh - ${b2.h * z2}px)/2)) 24px!important;gap:40px!important;box-sizing:border-box!important;transform:none!important;overflow:auto!important;overscroll-behavior:contain;scrollbar-gutter:stable both-edges}html[data-editor-scrolling] [data-artboard]{display:block!important;flex-shrink:0!important;margin:0!important;zoom:${z2}!important;box-shadow:none!important}}`;
        draw();
        return;
      }
      const v = bounds(), b = size(), z = S.zoom;
      const x = v.x + (v.w - b.w * z) / 2 + pan.x, y = v.y + (v.h - b.h * z) / 2 + pan.y;
      style.textContent = `@media screen{html[data-editor-on] [data-stage]{position:fixed!important;inset:auto!important;left:${x}px!important;top:${y}px!important;display:block!important;width:${b.w}px!important;height:${b.h}px!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;gap:0!important;transform-origin:0 0!important;transform:scale(${z})!important;overflow:visible!important}html[data-editor-on] [data-artboard]{margin:0!important;box-shadow:none!important}}`;
      ui.querySelector("[data-act=zoom-fit]").setAttribute("aria-pressed", S.fit);
      ui.querySelector(".zv").textContent = `${Math.round(z * 100)}%`;
      draw();
    }
    function zoom(value, at = null) {
      const old = S.zoom, z = clamp(value), v = bounds();
      if (at) {
        const cx = v.x + v.w / 2, cy = v.y + v.h / 2, k = z / old;
        pan = {
          x: (pan.x - (at.x - cx)) * k + (at.x - cx),
          y: (pan.y - (at.y - cy)) * k + (at.y - cy)
        };
      }
      S.zoom = z;
      drawViewport();
    }
    function fit() {
      if (S.playing && S.playMode === "scroll") {
        const width = Math.max(
          ...[...stage.querySelectorAll("[data-artboard]")].map(
            (b2) => b2.offsetWidth
          ),
          1
        );
        S.fit = true;
        S.zoom = Math.max(0.1, Math.min((innerWidth - 64) / width, 1));
        drawViewport();
        return;
      }
      const v = bounds(), b = size(), padding = S.playing ? 0 : 112;
      pan = { x: 0, y: 0 };
      S.fit = true;
      const z = Math.max(
        0.1,
        Math.min((v.w - padding) / b.w, (v.h - padding) / b.h, 4)
      );
      S.zoom = z;
      drawViewport();
    }
    function step(dir) {
      S.fit = false;
      const z = dir > 0 ? STEPS.find((v) => v > S.zoom + 1e-3) : [...STEPS].reverse().find((v) => v < S.zoom - 1e-3);
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
            const r = b.getBoundingClientRect(), distance = Math.abs(r.top + r.height / 2 - center);
            return !best || distance < best.distance ? { b, distance } : best;
          },
          null
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
        flush().catch(() => {
        });
        S.playing = true;
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
            request.catch(
              () => toast("当前窗口不支持系统全屏，已进入播放视图。", 4e3)
            );
          else toast("当前窗口不支持系统全屏，已进入播放视图。", 4e3);
        } catch {
          toast("当前窗口不支持系统全屏，已进入播放视图。", 4e3);
        }
      }
    }
    function stop() {
      if (!S.playing) return;
      S.playing = false;
      S.playMode = null;
      root.removeAttribute("data-editor-playing");
      root.removeAttribute("data-editor-scrolling");
      root.setAttribute("data-editor-single", "");
      host.removeAttribute("data-playing");
      clearTimeout(playTimer);
      ui.querySelector(".play-exit").style.opacity = "";
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {
      });
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
            y: panning.pan.y + e.clientY - panning.y
          };
          drawViewport();
          e.stopImmediatePropagation();
        }
      },
      true
    );
    addEventListener(
      "pointerup",
      () => {
        if (panning) {
          panning = null;
          root.removeAttribute("data-editor-panning");
        }
      },
      true
    );
    addEventListener(
      "pointercancel",
      () => {
        panning = null;
        root.removeAttribute("data-editor-panning");
      },
      true
    );
    addEventListener(
      "pointerdown",
      (e) => {
        if (S.playing || !S.editing || e.composedPath().includes(host) || !space && e.button !== 1)
          return;
        finishEditing("pan");
        S.fit = false;
        panning = { x: e.clientX, y: e.clientY, pan: { ...pan } };
        root.setAttribute("data-editor-panning", "");
        e.preventDefault();
        e.stopImmediatePropagation();
      },
      true
    );
    addEventListener(
      "keydown",
      (e) => {
        if (S.playing) {
          const key = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
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
        if (e.code === "Space" && S.editing && !S.text && !e.composedPath().some(
          (n) => n instanceof Element && n.matches("input,textarea,button,[contenteditable=true]")
        )) {
          space = true;
          root.setAttribute("data-editor-panning", "");
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true
    );
    addEventListener(
      "keyup",
      (e) => {
        if (e.code === "Space") {
          space = false;
          if (!panning) root.removeAttribute("data-editor-panning");
        }
      },
      true
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
            y: e.clientY
          });
        } else if (!S.fit) {
          pan.x -= e.deltaX;
          pan.y -= e.deltaY;
          drawViewport();
        }
      },
      { passive: false, capture: true }
    );
    return { zoom, fit, step, refresh, bounds, preview, stop };
  }

  // html-design/src/identifiers.js
  function rekeyDOMIds(tree, prefix) {
    const all = [tree, ...tree.querySelectorAll("*")], ids = /* @__PURE__ */ new Map();
    for (const node of all)
      if (node.id) {
        const old = node.id;
        node.id = `${prefix}-${old}`;
        ids.set(old, node.id);
      }
    const ordered = [...ids].sort((a, b) => b[0].length - a[0].length);
    for (const node of all) {
      for (const attr of [...node.attributes]) {
        if (["id", "src", "srcset"].includes(attr.name)) continue;
        let value = attr.value;
        if (["for", "aria-labelledby", "aria-describedby"].includes(attr.name))
          value = value.split(" ").map((id) => ids.get(id) || id).join(" ");
        for (const [before, after] of ordered) {
          value = value.replaceAll(`url(#${before})`, `url(#${after})`).replaceAll(`url("#${before}")`, `url("#${after}")`).replaceAll(`url('#${before}')`, `url('#${after}')`);
          if (value === `#${before}`) value = `#${after}`;
        }
        if (value !== attr.value) node.setAttribute(attr.name, value);
      }
      if (node.matches("style")) {
        let css = node.textContent;
        for (const [before, after] of ordered)
          css = css.replaceAll(`#${before}`, `#${after}`);
        node.textContent = css;
      }
    }
  }

  // html-design/src/pages.js
  function createPages({
    S,
    root,
    stage,
    ui,
    boards,
    withAll,
    visible,
    esc,
    push,
    goTo,
    select,
    endText,
    writable,
    openMenu,
    closeMenus
  }) {
    const listUI = ui.querySelector(".thumb-list"), thumbs = /* @__PURE__ */ new Map(), sizes = /* @__PURE__ */ new WeakMap();
    let menuBoard, suppressClick = false, lastSize = { w: 1280, h: 720 }, nextPage = Math.max(
      Number(stage.dataset.pageSeq) || 0,
      ...boards().map(
        (b) => Number(b.dataset.artboard?.match(/^p(\d+)$/)?.[1]) || 0
      )
    );
    const thumbWidth = () => innerWidth <= 760 ? 132 : 176;
    function sizeOf(b) {
      return withAll(() => {
        if (visible(b)) {
          const v = {
            w: b.offsetWidth || 1280,
            h: b.offsetHeight || 720,
            display: getComputedStyle(b).display
          };
          sizes.set(b, v);
          lastSize = v;
          return v;
        }
        return sizes.get(b) || { ...lastSize, display: "block" };
      });
    }
    const fixCSS = ({ w, h, display }) => `html,body{margin:0!important;padding:0!important;overflow:hidden!important;width:${w}px!important;height:${h}px!important;min-height:0!important}[data-thumb-chain]{display:block!important;position:static!important;transform:none!important;translate:none!important;scale:none!important;margin:0!important;padding:0!important;border:0!important;width:${w}px!important;height:${h}px!important;min-height:0!important;overflow:hidden!important}[data-thumb-target]{display:${display}!important;position:relative!important;inset:auto!important;margin:0!important;transform:none!important;translate:none!important;scale:none!important;opacity:1!important;visibility:visible!important;flex:none!important;width:${w}px!important;height:${h}px!important;box-sizing:border-box!important}*,*::before,*::after{animation:none!important;transition:none!important}`;
    function snapshot(b) {
      const c = b.cloneNode(true);
      c.querySelectorAll("script").forEach((n) => n.remove());
      c.querySelectorAll("[contenteditable]").forEach(
        (n) => n.removeAttribute("contenteditable")
      );
      c.querySelectorAll("video[autoplay],audio[autoplay]").forEach(
        (n) => n.removeAttribute("autoplay")
      );
      c.removeAttribute("data-editor-current");
      c.setAttribute("data-thumb-target", "");
      return c;
    }
    const contentCSS = () => [...document.querySelectorAll('style,link[rel~="stylesheet"]')].filter(
      (n) => !n.matches("[data-editor-style]") && !n.closest("[data-artboard]")
    ).map((n) => n.outerHTML).join("");
    function shellHTML(b) {
      let inner = snapshot(b).outerHTML;
      for (let p = b.parentElement; p && p !== document.body; p = p.parentElement) {
        const c = p.cloneNode(false);
        c.setAttribute("data-thumb-chain", "");
        c.innerHTML = inner;
        inner = c.outerHTML;
      }
      const body = document.body.cloneNode(false);
      body.innerHTML = inner;
      const attrs = [...root.attributes].filter((a) => !/^data-edit/.test(a.name)).map((a) => `${a.name}="${esc(a.value)}"`).join(" ");
      return `<!DOCTYPE html><html ${attrs}><head><meta charset="utf-8"><base href="${esc(location.href)}">${contentCSS()}<style id="thumb-fix">${fixCSS(sizeOf(b))}</style></head>${body.outerHTML}</html>`;
    }
    function layout(b) {
      const t = thumbs.get(b), sz = sizeOf(b), w = thumbWidth();
      if (!t) return;
      t.frame.style.width = `${w}px`;
      t.frame.style.height = `${Math.round(sz.h * w / sz.w)}px`;
      Object.assign(t.ifr.style, {
        width: `${sz.w}px`,
        height: `${sz.h}px`,
        transform: `scale(${w / sz.w})`
      });
      return sz;
    }
    function paint(b) {
      const t = thumbs.get(b);
      if (!t) return;
      if (!t.ready) {
        t.pending = true;
        return;
      }
      const sz = layout(b);
      let d;
      try {
        d = t.ifr.contentDocument;
      } catch {
      }
      const old = d?.querySelector("[data-thumb-target]");
      if (!old) {
        t.ready = false;
        t.ifr.srcdoc = shellHTML(b);
        return;
      }
      d.getElementById("thumb-fix").textContent = fixCSS(sz);
      old.replaceWith(d.importNode(snapshot(b), true));
      t.label.textContent = `${boards().indexOf(b) + 1}. ${b.dataset.title || b.dataset.artboard}`;
    }
    function build() {
      const all = boards();
      for (const [b, t] of thumbs)
        if (!all.includes(b)) {
          t.remove();
          thumbs.delete(b);
        }
      listUI.querySelector(".empty-list")?.remove();
      if (!all.length) {
        const e = document.createElement("p");
        e.className = "empty-list";
        e.textContent = "还没有页面，点击上方 ＋ 开始。";
        listUI.append(e);
      }
      all.forEach((b, i) => {
        let t = thumbs.get(b);
        if (!t) {
          t = document.createElement("div");
          t.className = "thumb";
          t.setAttribute("role", "listitem");
          t.dataset.pageId = b.dataset.artboard;
          t.innerHTML = `<div class="thumb-main" role="button" tabindex="0"><div class="frame"><iframe sandbox="allow-same-origin" tabindex="-1" aria-hidden="true" title="页面缩略图"></iframe></div><div class="label"></div></div><button class="thumb-more" title="页面操作" aria-label="页面操作" aria-haspopup="menu">${icon("Ellipsis")}</button>`;
          t.frame = t.querySelector(".frame");
          t.ifr = t.querySelector("iframe");
          t.label = t.querySelector(".label");
          t.ifr.onload = () => {
            t.ready = true;
            if (t.pending) {
              t.pending = false;
              paint(b);
            }
          };
          t.querySelector(".thumb-main").onclick = () => {
            if (suppressClick) {
              suppressClick = false;
              return;
            }
            closeMenus();
            select(null);
            goTo(b);
          };
          t.querySelector(".thumb-more").onclick = (e) => {
            e.stopPropagation();
            menuBoard = b;
            select(null);
            goTo(b);
            showPageMenu(e.currentTarget);
          };
          t.oncontextmenu = (e) => {
            e.preventDefault();
            menuBoard = b;
            select(null);
            goTo(b);
            showPageMenu(null, { x: e.clientX, y: e.clientY });
          };
          t.label.ondblclick = (e) => {
            e.stopPropagation();
            rename(b);
          };
          t.querySelector(".thumb-main").addEventListener(
            "pointerdown",
            (e) => startReorder(e, b)
          );
          thumbs.set(b, t);
          layout(b);
          t.ifr.srcdoc = shellHTML(b);
        }
        t.label.textContent = `${i + 1}. ${b.dataset.title || b.dataset.artboard}`;
        t.querySelector(".thumb-main").setAttribute(
          "aria-label",
          `第 ${i + 1} 页：${b.dataset.title || b.dataset.artboard}`
        );
        if (listUI.children[i] !== t)
          listUI.insertBefore(t, listUI.children[i] || null);
        layout(b);
      });
      markActive();
    }
    function markActive() {
      thumbs.forEach((t, b) => {
        const on = b === S.current;
        t.classList.toggle("active", on);
        t.querySelector(".thumb-main").setAttribute(
          "aria-current",
          on ? "page" : "false"
        );
        if (on && (t.offsetTop < listUI.scrollTop || t.offsetTop + t.offsetHeight > listUI.scrollTop + listUI.clientHeight))
          t.scrollIntoView({ block: "nearest", behavior: "instant" });
      });
    }
    function showPageMenu(anchor, point) {
      const index = boards().indexOf(target());
      ui.querySelector("[data-act=page-up]").disabled = !writable() || index <= 0;
      ui.querySelector("[data-act=page-down]").disabled = !writable() || index >= boards().length - 1;
      openMenu("page", anchor, point);
    }
    function refresh(preferred) {
      build();
      goTo(preferred?.isConnected ? preferred : boards()[0]);
    }
    function transaction(redo, undo, preferred) {
      endText();
      select(null);
      const previous = S.current;
      redo();
      refresh(preferred);
      push({
        undo() {
          undo();
          refresh(previous);
        },
        redo() {
          redo();
          refresh(preferred);
        }
      });
    }
    function allocatePage() {
      nextPage = Math.max(nextPage, Number(stage.dataset.pageSeq) || 0) + 1;
      stage.dataset.pageSeq = nextPage;
      return `p${nextPage}`;
    }
    function target() {
      return menuBoard?.isConnected ? menuBoard : S.current;
    }
    function add() {
      if (!writable()) return;
      const ref = target(), sz = ref ? sizeOf(ref) : lastSize, b = document.createElement("section");
      b.dataset.artboard = allocatePage();
      b.dataset.title = "未命名页面";
      b.dataset.mode = "flow";
      b.className = "page";
      Object.assign(b.style, {
        width: `${sz.w}px`,
        height: `${sz.h}px`,
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        padding: "64px",
        background: "var(--bg, #fff)",
        flexShrink: "0"
      });
      transaction(
        () => ref?.isConnected ? ref.after(b) : stage.append(b),
        () => b.remove(),
        b
      );
      menuBoard = null;
    }
    function copy() {
      const b = target();
      if (!b || !writable()) return;
      const c = b.cloneNode(true), id = allocatePage(), old = b.dataset.artboard;
      c.dataset.artboard = id;
      c.dataset.title = `${b.dataset.title || old} 副本`;
      c.removeAttribute("data-editor-current");
      [c, ...c.querySelectorAll("[contenteditable]")].forEach(
        (n) => n.removeAttribute("contenteditable")
      );
      const used = /* @__PURE__ */ new Set();
      c.querySelectorAll("[data-el]").forEach((el, i) => {
        let name = `${id}-${el.dataset.el?.startsWith(old + "-") ? el.dataset.el.slice(old.length + 1) : `element-${i + 1}`}`;
        if (used.has(name)) name = `${id}-element-${i + 1}`;
        used.add(name);
        el.dataset.el = name;
        el.removeAttribute("data-bbox");
      });
      rekeyDOMIds(c, id);
      transaction(
        () => b.after(c),
        () => c.remove(),
        c
      );
      menuBoard = null;
    }
    function remove() {
      const b = target();
      if (!b || !writable()) return;
      lastSize = sizeOf(b);
      const parent = b.parentNode, next = b.nextSibling, all = boards(), i = all.indexOf(b), preferred = all[i + 1] || all[i - 1];
      transaction(
        () => b.remove(),
        () => parent.insertBefore(b, next?.parentNode === parent ? next : null),
        preferred
      );
      menuBoard = null;
    }
    function move(b, before) {
      if (!b || !writable() || b === before || b.nextElementSibling === before)
        return;
      const parent = b.parentNode, next = b.nextSibling;
      transaction(
        () => stage.insertBefore(b, before || null),
        () => parent.insertBefore(b, next?.parentNode === parent ? next : null),
        b
      );
      menuBoard = null;
    }
    function moveStep(dir) {
      const b = target(), a = boards(), i = a.indexOf(b), j = i + dir;
      if (i < 0 || j < 0 || j >= a.length) return;
      move(b, dir < 0 ? a[j] : a[j + 1] || null);
    }
    function rename(b = target()) {
      if (!b || !writable()) return;
      closeMenus();
      goTo(b);
      const t = thumbs.get(b);
      if (!t) return;
      const input = document.createElement("input");
      input.className = "rename-input";
      input.value = b.dataset.title || "";
      input.setAttribute("aria-label", "页面名称");
      const before = b.dataset.title || "", label = t.label;
      label.hidden = true;
      t.append(input);
      input.focus();
      input.select();
      let done = false;
      function finish(apply) {
        if (done) return;
        done = true;
        const after = input.value.trim() || "未命名页面";
        input.remove();
        label.hidden = false;
        if (apply && after !== before)
          transaction(
            () => {
              b.dataset.title = after;
            },
            () => {
              b.dataset.title = before;
            },
            b
          );
        else build();
        t.querySelector(".thumb-main").focus();
      }
      input.onblur = () => finish(true);
      input.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          finish(true);
        }
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          finish(false);
        }
      };
    }
    function startReorder(e, b) {
      if (e.button !== 0 || !writable() || e.detail > 1) return;
      menuBoard = null;
      const x = e.clientX, y = e.clientY;
      let moved = false, before = null, lastY = y, raf;
      const clear = () => thumbs.forEach((t) => t.classList.remove("drop-before", "drop-after"));
      function indicator() {
        clear();
        const others = boards().filter((n) => n !== b);
        before = others.find((n) => {
          const r = thumbs.get(n).getBoundingClientRect();
          return lastY < r.top + r.height / 2;
        }) || null;
        if (before) thumbs.get(before).classList.add("drop-before");
        else if (others.length)
          thumbs.get(others.at(-1)).classList.add("drop-after");
      }
      function scroll() {
        if (!moved) return;
        const r = listUI.getBoundingClientRect(), delta = lastY < r.top + 32 ? -9 : lastY > r.bottom - 32 ? 9 : 0;
        if (delta) {
          listUI.scrollTop += delta;
          indicator();
        }
        raf = requestAnimationFrame(scroll);
      }
      S.drag = {
        move(ev) {
          lastY = ev.clientY;
          if (!moved && Math.hypot(ev.clientX - x, ev.clientY - y) < 6) return;
          if (!moved) {
            moved = true;
            thumbs.get(b).classList.add("dragging");
            scroll();
          }
          indicator();
        },
        up(ev) {
          cancelAnimationFrame(raf);
          clear();
          thumbs.get(b)?.classList.remove("dragging");
          if (moved) {
            suppressClick = true;
            setTimeout(() => {
              suppressClick = false;
            }, 0);
            if (ev?.type !== "pointercancel") move(b, before);
          }
        },
        cancel() {
          cancelAnimationFrame(raf);
          moved = false;
          clear();
          thumbs.get(b)?.classList.remove("dragging");
        }
      };
    }
    function key(e) {
      const active = ui.activeElement?.closest(".thumb");
      if (!active || ui.activeElement.matches("input")) return false;
      const b = boards().find(
        (b2) => b2.dataset.artboard === active.dataset.pageId
      ), index = boards().indexOf(b), mod = e.ctrlKey || e.metaKey;
      menuBoard = b;
      if (mod && e.key.toLowerCase() === "d") copy();
      else if (["Delete", "Backspace"].includes(e.key)) remove();
      else if (e.altKey && e.key === "ArrowUp") moveStep(-1);
      else if (e.altKey && e.key === "ArrowDown") moveStep(1);
      else if (["ArrowUp", "ArrowDown"].includes(e.key)) {
        const next = boards()[Math.max(
          0,
          Math.min(
            boards().length - 1,
            index + (e.key === "ArrowUp" ? -1 : 1)
          )
        )];
        select(null);
        goTo(next);
        thumbs.get(next)?.querySelector(".thumb-main").focus();
      } else if (e.key === "Enter" || e.key === " ") {
        select(null);
        goTo(b);
      } else return false;
      e.preventDefault();
      e.stopImmediatePropagation();
      return true;
    }
    return {
      sizeOf,
      paint,
      build,
      markActive,
      add,
      copy,
      remove,
      moveStep,
      rename,
      key,
      clearTarget() {
        menuBoard = null;
      }
    };
  }

  // html-design/src/typography.js
  function textMetrics(el) {
    return [el, ...el.querySelectorAll("*")].filter((n) => !n.matches("br")).map((node) => {
      const cs = getComputedStyle(node);
      return {
        node,
        font: parseFloat(cs.fontSize),
        line: cs.lineHeight,
        letter: cs.letterSpacing,
        word: cs.wordSpacing
      };
    });
  }
  function scaleText(metrics, k) {
    for (const m of metrics) {
      m.node.style.fontSize = `${Math.round(m.font * k * 1e3) / 1e3}px`;
      for (const [prop, value] of [
        ["lineHeight", m.line],
        ["letterSpacing", m.letter],
        ["wordSpacing", m.word]
      ]) {
        m.node.style[prop] = value === "normal" ? "normal" : `${Math.round(parseFloat(value) * k * 1e3) / 1e3}px`;
      }
    }
  }

  // html-design/src/guides.js
  var anchors = (r, axis) => axis === "x" ? [r.x, r.x + r.w / 2, r.x + r.w] : [r.y, r.y + r.h / 2, r.y + r.h];
  function snapMove(rect, targets, delta, threshold) {
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
            const rank = sourceIndex === targetIndex ? 0 : 1;
            if (distance <= threshold && (!best || distance < best.distance - 1e-6 || Math.abs(distance - best.distance) < 1e-6 && rank < best.rank))
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
  function createGuides({ ui, origin }) {
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
        h: r.height / o.s
      };
    };
    function begin(elements, board) {
      const nodes = Array.isArray(elements) ? elements : [elements];
      const groupRect = (o2) => {
        const rects = nodes.map((n) => localRect(n, o2));
        const x = Math.min(...rects.map((r) => r.x)), y = Math.min(...rects.map((r) => r.y));
        return {
          x,
          y,
          w: Math.max(...rects.map((r) => r.x + r.w)) - x,
          h: Math.max(...rects.map((r) => r.y + r.h)) - y
        };
      };
      clear();
      const o = origin(board);
      const rect = groupRect(o);
      const targets = [
        { x: 0, y: 0, w: board.clientWidth, h: board.clientHeight }
      ];
      for (const node of board.querySelectorAll("[data-el]")) {
        if (nodes.some(
          (el) => node === el || node.contains(el) || el.contains(node)
        ) || node.closest("[data-artboard]") !== board)
          continue;
        const style = getComputedStyle(node);
        if (style.visibility !== "visible" || style.opacity === "0") continue;
        const r = localRect(node, o);
        if (r.w > 0 && r.h > 0) targets.push(r);
      }
      return {
        move(delta, bypass) {
          clear();
          return bypass ? { ...delta, matches: [] } : snapMove(rect, targets, delta, 6 / origin(board).s);
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
            const now = origin(board), frame = svg.getBoundingClientRect();
            const moving = groupRect(now), pad = 8 / now.s;
            const segments = matches.map(({ axis, at, target }) => {
              const vertical = axis === "x";
              const start = Math.min(
                vertical ? moving.y : moving.x,
                vertical ? target.y : target.x
              ) - pad;
              const end = Math.max(
                vertical ? moving.y + moving.h : moving.x + moving.w,
                vertical ? target.y + target.h : target.x + target.w
              ) + pad;
              const x = (v) => now.x + v * now.s - frame.left;
              const y = (v) => now.y + v * now.s - frame.top;
              return vertical ? `M${x(at)},${y(start)}V${y(end)}` : `M${x(start)},${y(at)}H${x(end)}`;
            }).join("");
            paths.forEach((path) => path.setAttribute("d", segments));
          };
          redraw();
        }
      };
    }
    return { begin, clear, refresh: () => redraw?.() };
  }

  // html-design/src/layers.js
  var flexOrGridItem = (el) => /^(inline-)?(flex|grid)$/.test(getComputedStyle(el.parentElement).display);
  function stackingContext(el) {
    const s = getComputedStyle(el);
    return s.position === "fixed" || s.position === "sticky" || s.zIndex !== "auto" && (s.position !== "static" || flexOrGridItem(el)) || Number(s.opacity) < 1 || s.isolation === "isolate" || s.mixBlendMode !== "normal" || [
      s.transform,
      s.translate,
      s.rotate,
      s.scale,
      s.filter,
      s.backdropFilter,
      s.perspective
    ].some((v) => v && v !== "none") || /paint|layout|strict|content/.test(s.contain) || /transform|opacity|filter|perspective/.test(s.willChange);
  }
  function layerChanges(el, board, front, selection = []) {
    const contextOf = (node) => {
      let parent = node.parentElement;
      while (parent && parent !== board && !stackingContext(parent))
        parent = parent.parentElement;
      return parent;
    };
    const changes = /* @__PURE__ */ new Map();
    for (let unit = el; unit && unit !== board; ) {
      const context = contextOf(unit);
      if (!context || !board.contains(context)) break;
      const peers = [...context.querySelectorAll("*")].filter(
        (n) => n !== unit && !n.contains(unit) && !unit.contains(n) && !selection.some((s) => s === n || s.contains(n) || n.contains(s)) && n.getClientRects().length && (n.hasAttribute("data-el") || stackingContext(n)) && contextOf(n) === context
      );
      const z = (n) => Number.parseInt(getComputedStyle(n).zIndex) || 0;
      changes.set(unit, front ? Math.max(0, ...peers.map(z)) + 1 : 0);
      if (!front) {
        for (const peer of peers) if (z(peer) <= 0) changes.set(peer, 1);
      }
      unit = context;
    }
    return {
      nodes: [...changes.keys()],
      apply() {
        for (const [node, z] of changes) {
          if (getComputedStyle(node).position === "static" && !flexOrGridItem(node))
            node.style.position = "relative";
          node.style.zIndex = String(z);
        }
      }
    };
  }

  // html-design/src/selection.js
  function selectionRoots(nodes) {
    const unique = [...new Set(nodes)].filter((n) => n?.isConnected);
    return unique.filter(
      (n) => !unique.some((other) => other !== n && other.contains(n))
    );
  }
  function unionRect(nodes) {
    const rects = nodes.map((n) => n.getBoundingClientRect());
    const left = Math.min(...rects.map((r) => r.left)), top = Math.min(...rects.map((r) => r.top));
    const right = Math.max(...rects.map((r) => r.right)), bottom = Math.max(...rects.map((r) => r.bottom));
    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top
    };
  }
  function selectable(board) {
    return [...board.querySelectorAll("[data-el]")].filter((n) => {
      const r = n.getBoundingClientRect(), s = getComputedStyle(n);
      return n.closest("[data-artboard]") === board && r.width > 0 && r.height > 0 && s.visibility === "visible" && s.opacity !== "0";
    });
  }
  function directionTarget(nodes, board, key) {
    const selected = selectionRoots(nodes);
    if (!selected.length) return null;
    const from = selected.at(-1).getBoundingClientRect();
    const x = from.left + from.width / 2, y = from.top + from.height / 2;
    const horizontal = ["ArrowLeft", "ArrowRight"].includes(key), sign = ["ArrowLeft", "ArrowUp"].includes(key) ? -1 : 1;
    let best = null;
    for (const node of selectable(board)) {
      if (selected.some((n) => n === node || n.contains(node) || node.contains(n)))
        continue;
      const r = node.getBoundingClientRect(), dx = r.left + r.width / 2 - x, dy = r.top + r.height / 2 - y;
      const forward = (horizontal ? dx : dy) * sign, cross = Math.abs(horizontal ? dy : dx);
      if (forward <= 1) continue;
      const score = forward + cross * 2;
      if (!best || score < best.score) best = { node, score };
    }
    return best?.node || null;
  }
  function createSelectionOverlay(ui) {
    const members = document.createElement("div"), marquee = document.createElement("div");
    members.className = "selection-members";
    marquee.className = "marquee";
    marquee.hidden = true;
    ui.append(members, marquee);
    return {
      draw(nodes) {
        members.replaceChildren();
        if (nodes.length < 2) return;
        for (const node of nodes) {
          const r = node.getBoundingClientRect(), frame = document.createElement("div");
          frame.className = "selection-member";
          Object.assign(frame.style, {
            left: r.left + "px",
            top: r.top + "px",
            width: r.width + "px",
            height: r.height + "px"
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
            height: rect.height + "px"
          });
      }
    };
  }

  // html-design/src/editor.js
  (() => {
    if (window.__htmlDesignEditor) return;
    window.__htmlDesignEditor = true;
    const MEDIA = "img,video,canvas,svg,iframe,picture";
    const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
    const SKIP_ATTR = /^(contenteditable|data-editor-current)$/;
    function main() {
      const root = document.documentElement;
      const stage = document.querySelector("[data-stage]") || document.body;
      const boards = () => [...stage.querySelectorAll("[data-artboard]")];
      const S = {
        editing: false,
        playing: false,
        current: null,
        sel: null,
        selection: [],
        drag: null,
        text: null,
        range: null,
        undo: [],
        redo: [],
        changed: false,
        zoom: 1,
        fit: true,
        replace: null
      };
      let persistence = null;
      let canRequestEdit = false, editRequested = false, requestingEdit = false;
      const mkStyle = (v, css = "") => {
        const s = document.createElement("style");
        s.setAttribute("data-editor-style", v);
        s.textContent = css;
        return s;
      };
      const pageStyle = mkStyle(
        "",
        `
      @media screen{
        html[data-editor-on],html[data-editor-on] body{margin:0!important;padding:0!important;width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;overflow:hidden!important;background:#f2f2f2!important}
        html[data-editor-playing],html[data-editor-playing] body{background:#151515!important}
        html[data-editor-on] body > :not([data-stage]):not(script):not(style){display:none!important}
        html[data-editor-single] [data-artboard]:not([data-editor-current]){display:none!important}
        html[data-editor-panning] [data-stage],html[data-editor-panning] [data-stage] *{cursor:grab!important}
      }
      @media print{html[data-editor-on],html[data-editor-on] body{padding:0!important;overflow:visible!important}[data-artboard]{break-after:page;break-inside:avoid}}
      html[data-editing] [data-artboard],html[data-editing] [data-artboard] *{user-select:none;-webkit-user-select:none}
      html[data-editing] [data-artboard] *{animation-play-state:paused!important}
      html[data-editing] [data-artboard] [data-el]{cursor:move}
      html[data-editing] [data-artboard] [contenteditable],html[data-editing] [data-artboard] [contenteditable] *{cursor:text;user-select:text;-webkit-user-select:text}
      html[data-editing] [data-artboard] [contenteditable]{outline:none}`
      );
      const zoomStyle = mkStyle("zoom"), printStyle = mkStyle("print");
      document.head.append(pageStyle, zoomStyle, printStyle);
      root.setAttribute("data-editor-on", "");
      root.setAttribute("data-editor-nav", "");
      const host = document.createElement("html-design-editor");
      host.setAttribute("data-editor-ui", "");
      host.style.cssText = "all:initial!important;position:static!important";
      root.append(host);
      new MutationObserver(() => {
        if (!host.isConnected) root.append(host);
      }).observe(root, { childList: true });
      const ui = host.attachShadow({ mode: "open" });
      ui.innerHTML = toolbarHTML({ HANDLES });
      const $ = (s) => ui.querySelector(s);
      const side = $(".nav"), head = $(".head"), selBox = $(".sel"), tbar = $(".tbar");
      const modal = $(".modal"), ta = $("textarea"), fileIn = $(".file"), toastEl = $(".toast");
      const fileName = () => decodeURIComponent(location.pathname.split("/").pop() || "") || "design.html";
      $(".title").textContent = document.title || fileName();
      const guides = createGuides({ ui, origin });
      const selectionOverlay = createSelectionOverlay(ui);
      let focusedBeforeModal = null;
      const fromUI = (e) => e.composedPath().includes(host);
      const inStage = (n) => n instanceof Element && !!n.closest("[data-artboard]");
      const visible = (n) => n.getClientRects().length > 0;
      const scaleOf = (b) => b.getBoundingClientRect().width / b.offsetWidth || 1;
      const isArtboard = (b) => b?.dataset.mode === "artboard";
      const activeBoard = () => S.sel?.closest("[data-artboard]") || S.current || boards()[0];
      const esc = (s) => String(s).replace(
        /[&<>"]/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
      );
      const px = (v) => /px$/.test(v || "") ? parseFloat(v) : 0;
      function origin(b) {
        const s = scaleOf(b), r = b.getBoundingClientRect(), cs = getComputedStyle(b);
        return {
          s,
          x: r.left + parseFloat(cs.borderLeftWidth) * s,
          y: r.top + parseFloat(cs.borderTopWidth) * s
        };
      }
      function withAll(fn) {
        const on = root.hasAttribute("data-editor-single");
        if (on) root.removeAttribute("data-editor-single");
        try {
          return fn();
        } finally {
          if (on) root.setAttribute("data-editor-single", "");
        }
      }
      let toastT = 0;
      function toast(msg, duration = 1800) {
        toastEl.textContent = msg;
        toastEl.classList.add("show");
        clearTimeout(toastT);
        toastT = setTimeout(() => toastEl.classList.remove("show"), duration);
      }
      const readFile = (f, cb) => {
        const r = new FileReader();
        r.onload = () => cb(r.result);
        r.readAsDataURL(f);
      };
      const snap = (els, html) => els.map((el) => ({
        el,
        a: [...el.attributes].filter((x) => !SKIP_ATTR.test(x.name)).map((x) => [x.name, x.value]),
        h: html ? el.innerHTML : null
      }));
      const key = (list) => JSON.stringify(list.map((x) => [x.a, x.h]));
      function apply(list) {
        list.forEach(({ el, a, h }) => {
          if (h != null) el.innerHTML = h;
          [...el.attributes].forEach(
            (x) => SKIP_ATTR.test(x.name) || el.removeAttribute(x.name)
          );
          a.forEach(([n, v]) => el.setAttribute(n, v));
        });
      }
      function push(cmd) {
        S.undo.push(cmd);
        if (S.undo.length > 200) S.undo.shift();
        S.redo = [];
        S.changed = true;
        persistence?.markDirty();
        syncBar();
      }
      function commit(before, board) {
        const after = snap(
          before.map((x) => x.el),
          before[0]?.h != null
        );
        if (key(before) !== key(after))
          push({ undo: () => apply(before), redo: () => apply(after), board });
      }
      function record(els, fn, board) {
        const b = snap(els);
        fn();
        commit(b, board);
      }
      function history(dir) {
        endText();
        const from = dir < 0 ? S.undo : S.redo, to = dir < 0 ? S.redo : S.undo, c = from.pop();
        if (!c) return;
        if (c.board?.isConnected && c.board !== S.current) goTo(c.board);
        dir < 0 ? c.undo() : c.redo();
        to.push(c);
        S.changed = true;
        persistence?.markDirty();
        S.selection = selectionRoots(S.selection);
        S.sel = S.selection.at(-1) || null;
        drawSel();
        syncBar();
      }
      function insertEl(el, b, ref) {
        ref ? ref.after(el) : b.append(el);
        const p = el.parentNode, n = el.nextSibling;
        push({
          undo: () => el.remove(),
          redo: () => p.insertBefore(el, n?.parentNode === p ? n : null),
          board: b
        });
      }
      function removeEl(el) {
        const nodes = S.selection.includes(el) ? selectionRoots(S.selection) : [el];
        const b = el.closest("[data-artboard]");
        const places = [...nodes].sort((a, b2) => a.compareDocumentPosition(b2) & 4 ? -1 : 1).map((node) => ({
          node,
          parent: node.parentNode,
          next: node.nextSibling
        }));
        select(null);
        nodes.forEach((node) => node.remove());
        push({
          undo: () => [...places].reverse().forEach(
            ({ node, parent, next }) => parent.insertBefore(
              node,
              next?.parentNode === parent ? next : null
            )
          ),
          redo: () => nodes.forEach((node) => node.remove()),
          board: b
        });
      }
      const viewport = createViewport({
        S,
        root,
        stage,
        host,
        ui,
        style: zoomStyle,
        draw: drawSel,
        pageStep,
        finishEditing(resume) {
          endText();
          select(null);
          if (resume !== "pan") setEditing(false);
        },
        currentPage(b) {
          setCurrent(b);
          markActive();
          syncBar();
        },
        flush: () => persistence?.flush() || Promise.resolve(),
        save: () => save(),
        toast
      });
      const applyZoom = (z, at = null) => viewport.zoom(z, at);
      const zoomStep = (dir) => viewport.step(dir);
      const zoomFit = () => viewport.fit();
      function finishEditRequest() {
        if (!editRequested || !persistence?.canEdit() || S.playing) return;
        editRequested = false;
        endText();
        select(null);
        ui.activeElement?.blur();
        setEditing(true);
      }
      async function requestEditPermission() {
        if (!editRequested || requestingEdit || !canRequestEdit) return;
        requestingEdit = true;
        syncBar();
        try {
          if (await persistence.takeover() === false) editRequested = false;
        } finally {
          requestingEdit = false;
          finishEditRequest();
          syncBar();
        }
      }
      function setEditing(on) {
        if (on && persistence && !persistence.canEdit()) return;
        S.editing = on;
        root.toggleAttribute("data-editing", on);
        host.toggleAttribute("data-editing", on);
        if (!on) {
          endText();
          select(null);
        }
        syncBar();
      }
      function syncBar() {
        const b = activeBoard(), permitted = !!persistence?.canEdit() && !S.playing, writable = permitted && S.editing;
        head.classList.toggle("on", S.editing);
        $(".tools").hidden = !S.editing;
        $("[data-act=edit]").hidden = S.editing;
        const editButton = $("[data-act=edit]");
        editButton.disabled = S.playing || editRequested || !(permitted || canRequestEdit);
        editButton.setAttribute("aria-busy", editRequested);
        editButton.querySelector("span").textContent = editRequested ? "正在进入…" : "编辑";
        $("[data-act=done]").hidden = !S.editing;
        ta.readOnly = !writable;
        $("[data-act=flow]").setAttribute("aria-pressed", !isArtboard(b));
        $("[data-act=artboard]").setAttribute("aria-pressed", isArtboard(b));
        $("[data-act=undo]").disabled = !writable || !S.undo.length;
        $("[data-act=redo]").disabled = !writable || !S.redo.length;
        [
          "flow",
          "artboard",
          "add-text",
          "add-image",
          "src-apply",
          "page-copy",
          "page-delete",
          "page-rename",
          "image-replace",
          "image-fit",
          "image-cover"
        ].forEach(
          (act) => ui.querySelectorAll(`[data-act=${act}]`).forEach((n) => {
            n.disabled = !writable || !b;
          })
        );
        ui.querySelectorAll("[data-act=page-add]").forEach((n) => {
          n.disabled = !writable;
        });
        ["page-up", "page-down"].forEach((act, i) => {
          $(`[data-act=${act}]`).disabled = !writable || !b || (i === 0 ? boards().indexOf(b) <= 0 : boards().indexOf(b) >= boards().length - 1);
        });
        ["preview", "scroll-play", "fullscreen", "pdf", "pptx", "print"].forEach(
          (act) => ui.querySelectorAll(`[data-act=${act}]`).forEach((n) => {
            n.disabled = !boards().length;
          })
        );
        $(".empty-canvas").hidden = !!boards().length;
      }
      function setMode(b, mode) {
        if (!b || mode === "artboard" === isArtboard(b)) return;
        endText();
        mode === "artboard" ? absolutize(b) : restoreFlow(b);
        drawSel();
        syncBar();
      }
      function absolutize(b) {
        if (!visible(b)) return alert("这一页当前不可见，请先切换到这一页。");
        const cs = getComputedStyle(b), bw = cs.width, bh = cs.height, pos = cs.position, o = origin(b);
        const tops = [...b.querySelectorAll("[data-el]")].filter(
          (el) => el.parentElement.closest("[data-el],[data-artboard]") === b && visible(el)
        );
        const m = tops.map((el) => {
          const style = getComputedStyle(el);
          const dimension = (axis, sides) => (parseFloat(style[axis]) || (axis === "width" ? el.offsetWidth : el.offsetHeight)) + (style.boxSizing === "border-box" ? 0 : sides.reduce(
            (sum, side2) => sum + parseFloat(style[`padding${side2}`]) + parseFloat(style[`border${side2}Width`]),
            0
          ));
          return {
            el,
            r: el.getBoundingClientRect(),
            media: el.matches(MEDIA),
            w: dimension("width", ["Left", "Right"]),
            h: dimension("height", ["Top", "Bottom"])
          };
        });
        const els = [b, ...tops];
        record(
          els,
          () => {
            els.forEach((el) => {
              el.dataset.flowStyle = el.getAttribute("style") || "";
            });
            if (pos === "static") b.style.position = "relative";
            b.style.width = bw;
            b.style.height = bh;
            const v = (n) => Math.round(n * 1e3) / 1e3 + "px";
            m.forEach(({ el, w, h, media }) => {
              Object.assign(el.style, {
                position: "absolute",
                margin: "0",
                translate: "none",
                boxSizing: "border-box",
                left: "0px",
                top: "0px",
                width: v(w)
              });
              el.style[media ? "height" : "minHeight"] = v(h);
            });
            m.forEach(({ el, r }) => {
              const zero = el.getBoundingClientRect();
              el.style.left = v((r.left - zero.left) / o.s);
              el.style.top = v((r.top - zero.top) / o.s);
            });
            b.dataset.mode = "artboard";
          },
          b
        );
      }
      function restoreFlow(b) {
        if (b.dataset.flowStyle == null)
          return alert("这一页没有排版快照，无法切回排版模式。");
        if (!confirm(
          "切回排版模式会恢复自动排版，画板模式下的拖动会丢失（可以撤销）。继续吗？"
        ))
          return;
        const els = [b, ...b.querySelectorAll("[data-flow-style]")];
        record(
          els,
          () => {
            els.forEach((el) => {
              const v = el.dataset.flowStyle;
              v ? el.setAttribute("style", v) : el.removeAttribute("style");
              delete el.dataset.flowStyle;
            });
            b.dataset.mode = "flow";
          },
          b
        );
      }
      function getPos(el) {
        const abs = el.style.position === "absolute" && isArtboard(el.closest("[data-artboard]"));
        if (abs)
          return {
            abs,
            x: parseFloat(el.style.left) || 0,
            y: parseFloat(el.style.top) || 0
          };
        const t = (el.style.translate || "").split(/\s+/);
        return { abs, x: parseFloat(t[0]) || 0, y: parseFloat(t[1]) || 0 };
      }
      function setPos(el, p, x, y) {
        x = Math.round(x * 1e3) / 1e3;
        y = Math.round(y * 1e3) / 1e3;
        if (p.abs) {
          el.style.left = x + "px";
          el.style.top = y + "px";
        } else el.style.translate = x || y ? `${x}px ${y}px` : "";
      }
      function select(el, keepDrag = false) {
        const nodes = selectionRoots(Array.isArray(el) ? el : el ? [el] : []);
        if (nodes.length !== S.selection.length || nodes.some((n, i) => n !== S.selection[i])) {
          if (!keepDrag && S.drag?.cancel) {
            S.drag.cancel();
            S.drag = null;
          }
          guides.clear();
        }
        S.selection = nodes;
        S.sel = nodes.at(-1) || null;
        drawSel();
        syncBar();
      }
      function drawSel() {
        guides.refresh();
        S.selection = selectionRoots(S.selection).filter((n) => visible(n));
        S.sel = S.selection.at(-1) || null;
        selectionOverlay.draw(S.selection);
        const el = S.sel;
        if (!el || !el.isConnected || !visible(el)) selBox.style.display = "none";
        else {
          const r = unionRect(S.selection);
          Object.assign(selBox.style, {
            display: "block",
            left: r.left + "px",
            top: r.top + "px",
            width: r.width + "px",
            height: r.height + "px"
          });
          selBox.classList.toggle("typing", !!S.text);
          selBox.classList.toggle("multiple", S.selection.length > 1);
        }
        placeTbar();
      }
      addEventListener("scroll", drawSel, true);
      function toggleSelection(el) {
        const next = S.selection.includes(el) ? S.selection.filter((n) => n !== el) : [
          ...S.selection.filter((n) => !n.contains(el) && !el.contains(n)),
          el
        ];
        select(next);
      }
      function startMarquee(e) {
        const board = S.current;
        if (!board || e.button !== 0) return;
        const before = [...S.selection], additive = e.shiftKey || e.ctrlKey || e.metaKey;
        const x = e.clientX, y = e.clientY;
        let moved = false;
        if (!additive) select(null);
        S.drag = {
          move(ev) {
            const v = viewport.bounds(), cx = Math.max(v.x, Math.min(v.x + v.w, ev.clientX)), cy = Math.max(v.y, Math.min(v.y + v.h, ev.clientY));
            if (!moved && Math.hypot(cx - x, cy - y) < 3) return;
            moved = true;
            const rect = {
              left: Math.min(x, cx),
              top: Math.min(y, cy),
              right: Math.max(x, cx),
              bottom: Math.max(y, cy),
              width: Math.abs(cx - x),
              height: Math.abs(cy - y)
            };
            const hits = selectable(board).filter((n) => {
              const r = n.getBoundingClientRect();
              return r.left < rect.right && r.right > rect.left && r.top < rect.bottom && r.bottom > rect.top;
            });
            select(additive ? [...before, ...hits] : hits, true);
            selectionOverlay.marquee(rect);
          },
          up() {
            selectionOverlay.marquee(null);
          },
          cancel() {
            selectionOverlay.marquee(null);
            select(before, true);
          }
        };
      }
      function startDrag(e, el) {
        const b = el.closest("[data-artboard]"), s = scaleOf(b), nodes = selectionRoots(S.selection), positions = nodes.map((node) => ({ node, p: getPos(node) })), before = snap(nodes);
        const alignment = guides.begin(nodes, b);
        const x0 = e.clientX, y0 = e.clientY;
        let moved = false;
        S.drag = {
          move(ev) {
            if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 3)
              return;
            moved = true;
            const delta = alignment.move(
              {
                x: (ev.clientX - x0) / s,
                y: (ev.clientY - y0) / s
              },
              ev.altKey
            );
            positions.forEach(
              ({ node, p }) => setPos(node, p, p.x + delta.x, p.y + delta.y)
            );
            drawSel();
            alignment.draw(delta.matches);
          },
          up() {
            guides.clear();
            if (moved) commit(before, b);
          },
          cancel() {
            guides.clear();
            apply(before);
            drawSel();
          }
        };
      }
      function startResize(e, dir) {
        if (S.selection.length !== 1) return;
        endText();
        const el = S.sel, b = el.closest("[data-artboard]"), s = scaleOf(b), r = el.getBoundingClientRect();
        const w0 = r.width / s, h0 = r.height / s, p = getPos(el), media = el.matches(MEDIA);
        const text = !media && !el.querySelector("[data-el],img,svg,canvas,video,iframe") && !!el.textContent.trim();
        const metrics = text && dir.length === 2 ? textMetrics(el) : null;
        const before = snap(metrics ? metrics.map((m) => m.node) : [el]);
        const hp = media || el.style.height ? "height" : "minHeight";
        if (getComputedStyle(el).display === "inline")
          el.style.display = "inline-block";
        const x0 = e.clientX, y0 = e.clientY;
        S.drag = {
          move(ev) {
            const dx = (ev.clientX - x0) / s, dy = (ev.clientY - y0) / s;
            let w = w0, h = h0;
            if (dir.includes("e")) w = w0 + dx;
            if (dir.includes("w")) w = w0 - dx;
            if (dir.includes("s")) h = h0 + dy;
            if (dir.includes("n")) h = h0 - dy;
            if (metrics) {
              const sx = dir.includes("w") ? -1 : 1, sy = dir.includes("n") ? -1 : 1;
              const k = Math.max(
                6 / Math.min(...metrics.map((m) => m.font)),
                8 / w0,
                8 / h0,
                1 + (sx * dx * w0 + sy * dy * h0) / (w0 * w0 + h0 * h0)
              );
              w = w0 * k;
              h = h0 * k;
              scaleText(metrics, k);
            } else if (dir.length === 2 && media !== ev.shiftKey) {
              const k = Math.abs(dx) > Math.abs(dy) ? w / w0 : h / h0;
              w = w0 * k;
              h = h0 * k;
            }
            w = Math.max(8, w);
            h = Math.max(8, h);
            el.style.boxSizing = "border-box";
            el.style.maxWidth = "none";
            if (dir !== "n" && dir !== "s")
              el.style.width = Math.round(w * 1e3) / 1e3 + "px";
            if (dir !== "e" && dir !== "w")
              el.style[hp] = Math.round(h * 1e3) / 1e3 + "px";
            setPos(
              el,
              p,
              p.x + (dir.includes("w") ? w0 - w : 0),
              p.y + (dir.includes("n") ? h0 - h : 0)
            );
            drawSel();
          },
          up() {
            commit(before, b);
          }
        };
      }
      function nudge(el, k, n) {
        const nodes = S.selection.includes(el) ? selectionRoots(S.selection) : [el];
        const dx = k === "arrowleft" ? -n : k === "arrowright" ? n : 0, dy = k === "arrowup" ? -n : k === "arrowdown" ? n : 0;
        record(
          nodes,
          () => nodes.forEach((node) => {
            const p = getPos(node);
            setPos(node, p, p.x + dx, p.y + dy);
          }),
          el.closest("[data-artboard]")
        );
        drawSel();
      }
      function duplicate(el) {
        const b = el.closest("[data-artboard]");
        const nodes = S.selection.includes(el) ? selectionRoots(S.selection) : [el];
        const tree = document.createElement("div");
        const copies = nodes.map((node) => ({
          node,
          copy: node.cloneNode(true),
          p: getPos(node)
        }));
        copies.forEach(({ copy }) => tree.append(copy));
        [...tree.querySelectorAll("[data-el]")].forEach((n) => {
          if (n.hasAttribute("data-el")) n.dataset.el = elementId(b, "element");
        });
        rekeyDOMIds(tree, elementId(b, "copy"));
        [...tree.querySelectorAll("[data-bbox]")].forEach(
          (n) => n.removeAttribute("data-bbox")
        );
        copies.forEach(({ node, copy, p }) => {
          if (p.abs) setPos(copy, p, p.x + 16, p.y + 16);
          node.after(copy);
        });
        const places = copies.map(({ copy }) => ({
          node: copy,
          parent: copy.parentNode,
          next: copy.nextSibling
        }));
        push({
          undo: () => copies.forEach(({ copy }) => copy.remove()),
          redo: () => [...places].reverse().forEach(
            ({ node, parent, next }) => parent.insertBefore(
              node,
              next?.parentNode === parent ? next : null
            )
          ),
          board: b
        });
        select(copies.map((c) => c.copy));
      }
      function placeNew(el, b, w, h) {
        const ref = S.sel && S.sel !== b && b.contains(S.sel) ? S.sel : null;
        if (isArtboard(b)) {
          let x = (b.clientWidth - w) / 2, y = (b.clientHeight - h) / 2;
          if (ref) {
            const p = getPos(ref);
            if (p.abs) {
              x = p.x + 24;
              y = p.y + 24;
            }
          }
          Object.assign(el.style, {
            position: "absolute",
            margin: "0",
            boxSizing: "border-box",
            left: Math.round(x) + "px",
            top: Math.round(y) + "px",
            width: w + "px"
          });
          if (el.matches(MEDIA)) el.style.height = h + "px";
          el.dataset.flowStyle = "";
          insertEl(el, b, null);
        } else {
          if (el.matches(MEDIA)) el.style.maxWidth = "100%";
          insertEl(el, b, ref);
        }
      }
      function elementId(b, kind) {
        let n = Number(stage.dataset.elementSeq) || 0, id;
        do {
          id = `${b.dataset.artboard}-${kind}-${++n}`;
        } while (stage.querySelector(`[data-el="${id}"]`));
        stage.dataset.elementSeq = n;
        return id;
      }
      function addText() {
        const b = activeBoard();
        if (!b || !visible(b) || !persistence?.canEdit()) return;
        endText();
        const el = document.createElement("div");
        el.setAttribute("data-el", elementId(b, "text"));
        el.textContent = "双击编辑文字";
        placeNew(el, b, 320, 60);
        startText(el);
        const r = document.createRange(), s = getSelection();
        r.selectNodeContents(el);
        s.removeAllRanges();
        s.addRange(r);
      }
      function addImage(src) {
        const b = activeBoard();
        if (!b || !visible(b) || !persistence?.canEdit()) return;
        const probe = new Image();
        probe.onload = () => {
          if (!persistence?.canEdit()) return;
          const nw = probe.naturalWidth || 400, nh = probe.naturalHeight || 300;
          const w = Math.max(
            16,
            Math.min(nw, Math.round(b.clientWidth * 0.5) || 400)
          ), h = Math.round(w * nh / nw);
          const el = document.createElement("img");
          el.setAttribute("data-el", elementId(b, "image"));
          el.alt = "";
          el.src = src;
          el.style.width = w + "px";
          el.style.height = h + "px";
          el.style.objectFit = "contain";
          placeNew(el, b, w, h);
          select(el);
        };
        probe.onerror = () => toast("图片无法读取");
        probe.src = src;
      }
      function pickReplace(img) {
        S.replace = img;
        fileIn.click();
      }
      fileIn.addEventListener("change", () => {
        const files = [...fileIn.files].filter(
          (f) => f.type.startsWith("image/")
        ), target = S.replace;
        fileIn.value = "";
        S.replace = null;
        if (target)
          files[0] && readFile(
            files[0],
            (src) => persistence?.canEdit() && record(
              [target],
              () => {
                target.src = src;
                target.removeAttribute("srcset");
              },
              target.closest("[data-artboard]")
            )
          );
        else files.forEach((f) => readFile(f, addImage));
      });
      function startText(el, x, y) {
        if (!el || S.text?.el === el || el.matches(MEDIA) || el.querySelector("[data-el]"))
          return;
        endText();
        S.text = {
          el,
          before: snap([el], true),
          board: el.closest("[data-artboard]")
        };
        el.contentEditable = "true";
        try {
          document.execCommand("styleWithCSS", false, true);
        } catch {
        }
        el.focus({ preventScroll: true });
        const s = getSelection();
        let r = x != null && document.caretRangeFromPoint?.(x, y);
        if (!r && x != null && document.caretPositionFromPoint) {
          const p = document.caretPositionFromPoint(x, y);
          if (p) {
            r = document.createRange();
            r.setStart(p.offsetNode, p.offset);
          }
        }
        if (!r || !el.contains(r.startContainer)) {
          r = document.createRange();
          r.selectNodeContents(el);
          r.collapse(false);
        }
        s.removeAllRanges();
        s.addRange(r);
        select(el);
        syncTbar();
      }
      function endText() {
        const t = S.text;
        if (!t) return;
        S.text = null;
        S.range = null;
        t.el.removeAttribute("contenteditable");
        if (document.activeElement === t.el) t.el.blur();
        getSelection().removeAllRanges();
        commit(t.before, t.board);
        drawSel();
      }
      document.addEventListener("selectionchange", () => {
        if (!S.text) return;
        const s = getSelection();
        if (s.rangeCount && S.text.el.contains(s.anchorNode)) {
          S.range = s.getRangeAt(0).cloneRange();
          syncTbar();
        }
      });
      function fmt(cmd, v) {
        if (!S.text && S.sel && !S.sel.matches(MEDIA)) startText(S.sel);
        const t = S.text;
        if (!t) return;
        const el = t.el, s = getSelection();
        el.focus({ preventScroll: true });
        if (S.range) {
          s.removeAllRanges();
          s.addRange(S.range);
        }
        if (cmd === "align") el.style.textAlign = v;
        else if (cmd === "size") fontSize(el, Math.max(6, Number(v)), true);
        else if (cmd === "size+" || cmd === "size-")
          fontSize(el, cmd === "size+" ? 2 : -2);
        else {
          if (!s.rangeCount || s.getRangeAt(0).collapsed) {
            const r = document.createRange();
            r.selectNodeContents(el);
            s.removeAllRanges();
            s.addRange(r);
          }
          document.execCommand(
            cmd === "color" ? "foreColor" : cmd,
            false,
            v ?? null
          );
        }
        if (s.rangeCount && el.contains(s.anchorNode))
          S.range = s.getRangeAt(0).cloneRange();
        persistence?.markDirty();
        syncTbar();
        drawSel();
      }
      function fontSize(el, d, absolute = false) {
        const s = getSelection(), r = s.rangeCount ? s.getRangeAt(0) : null;
        const size = (n2) => Math.max(
          6,
          absolute ? d : Math.round(parseFloat(getComputedStyle(n2).fontSize)) + d
        ) + "px";
        if (!r || r.collapsed || r.toString() === el.textContent) {
          const value = size(el);
          el.style.fontSize = value;
          if (absolute)
            el.querySelectorAll("[style]").forEach((n2) => {
              if (n2.style.fontSize) n2.style.fontSize = value;
            });
          return;
        }
        let n = r.commonAncestorContainer;
        if (n.nodeType !== 1) n = n.parentElement;
        if (n !== el && n.tagName === "SPAN" && r.toString() === n.textContent) {
          n.style.fontSize = size(n);
          return;
        }
        const span = document.createElement("span");
        span.style.fontSize = size(n);
        span.append(r.extractContents());
        span.querySelectorAll("[style]").forEach((x) => {
          x.style.fontSize = "";
          if (!x.getAttribute("style")) x.removeAttribute("style");
        });
        r.insertNode(span);
        r.selectNodeContents(span);
        s.removeAllRanges();
        s.addRange(r);
      }
      function syncTbar() {
        const el = S.text?.el || S.sel;
        if (!el) return;
        ["bold", "italic", "underline", "strikeThrough"].forEach((c) => {
          let on = false;
          try {
            on = S.text ? document.queryCommandState(c) : c === "bold" ? Number(getComputedStyle(el).fontWeight) >= 600 : false;
          } catch {
          }
          $(`[data-fmt=${c}]`).setAttribute("aria-pressed", on);
        });
        const n = getSelection().anchorNode, at = n ? n.nodeType === 1 ? n : n.parentElement : el;
        if (ui.activeElement !== $(".fs"))
          $(".fs").value = Math.round(
            parseFloat(getComputedStyle(el.contains(at) ? at : el).fontSize)
          );
        const cs = getComputedStyle(el), align = cs.textAlign;
        $(".text-align").value = align === "start" ? "left" : align === "end" ? "right" : align;
        $(".color-swatch").style.background = cs.color;
        const rgb = cs.color.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
        if (rgb && ui.activeElement !== $(".cpick"))
          $(".cpick").value = "#" + rgb.slice(1).map((n2) => Number(n2).toString(16).padStart(2, "0")).join("");
      }
      function placeTbar() {
        const el = S.sel, show = S.editing && !S.playing && el?.isConnected && visible(el);
        tbar.hidden = !show;
        if (!show) return;
        const multi = S.selection.length > 1;
        $(".selection-count").hidden = !multi;
        $(".selection-count").textContent = multi ? `已选 ${S.selection.length} 个元素` : "";
        const image = !multi && el.matches("img"), text = !multi && !el.matches(MEDIA) && !el.querySelector("[data-el]") && !!el.textContent.trim();
        $(".text-tools").hidden = !text;
        $(".more-text-section").hidden = !text;
        $(".image-tools").hidden = !image;
        if (image) {
          const fit = getComputedStyle(el).objectFit;
          $("[data-act=image-fit]").setAttribute(
            "aria-pressed",
            fit === "contain" || fit === "scale-down"
          );
          $("[data-act=image-cover]").setAttribute(
            "aria-pressed",
            fit === "cover"
          );
        }
        if (text) syncTbar();
      }
      $(".cpick").addEventListener("input", (e) => fmt("color", e.target.value));
      $(".text-align").addEventListener(
        "change",
        (e) => fmt("align", e.target.value)
      );
      $(".fs").addEventListener("change", (e) => {
        if (Number.isFinite(e.target.valueAsNumber))
          fmt("size", e.target.valueAsNumber);
      });
      $(".fs").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.target.blur();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          syncTbar();
          e.target.blur();
        }
      });
      addEventListener(
        "keydown",
        (e) => {
          if (S.playing) return;
          if (fromUI(e) && pages.key(e)) return;
          if (fromUI(e) && ["Enter", " "].includes(e.key) && !e.ctrlKey && !e.metaKey)
            return;
          if (fromUI(e) && ["ArrowDown", "ArrowUp", "Escape"].includes(e.key) && (ui.activeElement?.closest("[data-menu]") || ui.activeElement?.matches("[aria-expanded=true]")))
            return;
          if (e.key === "Escape" && S.drag?.cancel) {
            S.drag.cancel();
            S.drag = null;
            e.preventDefault();
            return;
          }
          const controlKey = e.ctrlKey || e.metaKey, zoomKey = controlKey && ["=", "+", "-", "_", "0", "1"].includes(e.key);
          if (fromUI(e) && e.composedPath().some(
            (n) => n instanceof Element && n.matches("input,textarea,[contenteditable=true]")
          ) && !zoomKey && !(controlKey && e.key.toLowerCase() === "s"))
            return;
          const typing = !!S.text, mod = e.metaKey || e.ctrlKey, k = (e.key || "").toLowerCase(), c = e.code, el = S.sel;
          if (!S.editing && !fromUI(e) && !(mod && (zoomKey || k === "s")) && !(k === "escape" && (!modal.hidden || ui.querySelector("[data-menu]:not([hidden])"))))
            return;
          const can = S.editing && !typing && el;
          if (k === "escape") {
            if (ui.querySelector("[data-menu]:not([hidden])")) closeMenus();
            else if (!modal.hidden) {
              modal.hidden = true;
              focusedBeforeModal?.focus();
            } else if (typing) endText();
            else if (el) select(null);
            else if (S.editing) {
              setEditing(false);
              persistence?.flush().catch(() => {
              });
            } else closeMenus();
          } else if (mod && k === "z" && S.editing && !typing)
            history(e.shiftKey ? 1 : -1);
          else if (mod && k === "y" && S.editing && !typing) history(1);
          else if (mod && k === "s") {
            if (sourcePending()) applySource();
            save();
          } else if (mod && (k === "=" || k === "+" || c === "Equal" || c === "NumpadAdd"))
            zoomStep(1);
          else if (mod && (k === "-" || k === "_" || c === "Minus" || c === "NumpadSubtract"))
            zoomStep(-1);
          else if (mod && (k === "0" || c === "Digit0" || c === "Numpad0")) {
            S.fit = false;
            applyZoom(1);
          } else if (mod && (k === "1" || c === "Digit1" || c === "Numpad1"))
            zoomFit();
          else if (mod && e.shiftKey && k.startsWith("arrow") && can) {
            const next = directionTarget(S.selection, S.current, e.key);
            if (next) select([...S.selection, next]);
          } else if (mod && k === "d" && can) duplicate(el);
          else if ((k === "delete" || k === "backspace") && can) removeEl(el);
          else if (k === "enter" && can && S.selection.length === 1)
            el.matches("img") ? pickReplace(el) : startText(el);
          else if (k.startsWith("arrow") && can && !mod)
            nudge(el, k, e.shiftKey ? 10 : 1);
          else if (!typing && !mod && (k === "pagedown" || !el && k === "arrowright"))
            pageStep(1);
          else if (!typing && !mod && (k === "pageup" || !el && k === "arrowleft"))
            pageStep(-1);
          else return;
          e.preventDefault();
          e.stopImmediatePropagation();
        },
        true
      );
      const guard = (e) => S.editing && !fromUI(e) && inStage(e.target);
      addEventListener(
        "pointermove",
        (e) => {
          if (S.drag) {
            S.drag.move(e);
            e.stopImmediatePropagation();
          } else if (guard(e)) e.stopImmediatePropagation();
        },
        true
      );
      ["pointerup", "pointercancel"].forEach(
        (type) => addEventListener(
          type,
          (e) => {
            if (S.drag) {
              if (type === "pointercancel" && S.drag.cancel) S.drag.cancel();
              else S.drag.up(e);
              S.drag = null;
              e.stopImmediatePropagation();
            } else if (guard(e)) e.stopImmediatePropagation();
          },
          true
        )
      );
      addEventListener("blur", () => {
        if (S.drag) {
          if (S.drag.cancel) S.drag.cancel();
          else S.drag.up();
          S.drag = null;
        }
        guides.clear();
      });
      addEventListener(
        "pointerdown",
        (e) => {
          if (fromUI(e)) return;
          closeMenus();
          host.removeAttribute("data-mobile-nav");
          if (!S.editing) return;
          if (!inStage(e.target)) {
            endText();
            const v = viewport.bounds();
            if (e.clientX >= v.x && e.clientX <= v.x + v.w && e.clientY >= v.y && e.clientY <= v.y + v.h) {
              e.preventDefault();
              ui.activeElement?.blur();
              startMarquee(e);
            } else select(null);
            return;
          }
          e.stopImmediatePropagation();
          if (e.target.isContentEditable) return;
          e.preventDefault();
          ui.activeElement?.blur();
          endText();
          const el = e.target.closest("[data-el]");
          if (!el) {
            startMarquee(e);
            return;
          }
          if (e.shiftKey || e.ctrlKey || e.metaKey) {
            toggleSelection(el);
            return;
          }
          if (!S.selection.includes(el)) select(el);
          if (e.button === 0) startDrag(e, el);
        },
        true
      );
      [
        "click",
        "dblclick",
        "auxclick",
        "contextmenu",
        "mousedown",
        "mouseup",
        "submit",
        "keydown",
        "keyup",
        "keypress",
        "input",
        "change"
      ].forEach(
        (type) => addEventListener(
          type,
          (e) => {
            const key2 = type.startsWith("key");
            if (!(key2 ? S.editing && !fromUI(e) : guard(e))) return;
            e.stopImmediatePropagation();
            const editable = e.target.isContentEditable;
            if (!editable && !key2) e.preventDefault();
            if (type === "input") {
              persistence?.markDirty();
              drawSel();
            }
            if (type === "contextmenu" && !editable) {
              if (e.ctrlKey || e.metaKey || e.shiftKey) return;
              const el = e.target.closest("[data-el]");
              if (el) {
                if (!S.selection.includes(el)) select(el);
                openMenu("element", null, { x: e.clientX, y: e.clientY });
              }
            }
            if (type === "dblclick" && !editable) {
              if (e.shiftKey || e.ctrlKey || e.metaKey) return;
              const el = e.target.closest("[data-el]");
              if (el) select(el);
              el?.matches("img") ? pickReplace(el) : startText(el, e.clientX, e.clientY);
            }
          },
          true
        )
      );
      addEventListener(
        "paste",
        (e) => {
          if (!S.editing || fromUI(e)) return;
          const dt = e.clipboardData;
          if (!dt) return;
          if (S.text) {
            e.preventDefault();
            e.stopImmediatePropagation();
            document.execCommand("insertText", false, dt.getData("text/plain"));
            return;
          }
          const f = [...dt.files].find((f2) => f2.type.startsWith("image/"));
          if (f) {
            e.preventDefault();
            e.stopImmediatePropagation();
            readFile(f, addImage);
          }
        },
        true
      );
      addEventListener(
        "dragover",
        (e) => {
          if (S.editing && [...e.dataTransfer?.types || []].includes("Files"))
            e.preventDefault();
        },
        true
      );
      addEventListener(
        "drop",
        (e) => {
          if (!S.editing) return;
          const fs = [...e.dataTransfer?.files || []].filter(
            (f) => f.type.startsWith("image/")
          );
          if (!fs.length) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          fs.forEach((f) => readFile(f, addImage));
        },
        true
      );
      ui.addEventListener("mousedown", (e) => {
        if (e.target.closest("button")) e.preventDefault();
      });
      ui.addEventListener("pointerdown", (e) => {
        const h = e.target.closest?.("[data-h]");
        if (h && S.sel && S.editing) {
          e.preventDefault();
          startResize(e, h.dataset.h);
        }
      });
      function closeMenus() {
        ui.querySelectorAll("[data-menu]").forEach((n) => {
          n.hidden = true;
        });
        ui.querySelectorAll("[aria-expanded]").forEach(
          (n) => n.setAttribute("aria-expanded", "false")
        );
      }
      function openMenu(name, anchor, point) {
        const panel = $(`[data-menu=${name}]`), wasOpen = !panel.hidden;
        closeMenus();
        if (wasOpen && anchor) return;
        panel.hidden = false;
        anchor?.setAttribute("aria-expanded", "true");
        const r = anchor?.getBoundingClientRect(), x = point?.x ?? r?.right ?? innerWidth - 12, y = point?.y ?? r?.bottom + 7 ?? 60;
        panel.style.left = Math.max(
          8,
          Math.min(
            innerWidth - panel.offsetWidth - 8,
            point ? x : x - panel.offsetWidth
          )
        ) + "px";
        panel.style.top = Math.max(8, Math.min(innerHeight - panel.offsetHeight - 8, y)) + "px";
      }
      function imageFit(value) {
        const el = S.sel;
        if (!el?.matches("img")) return;
        record(
          [el],
          () => {
            const cs = getComputedStyle(el);
            el.style.width = cs.width;
            el.style.height = cs.height;
            el.style.objectFit = value;
          },
          el.closest("[data-artboard]")
        );
        drawSel();
      }
      function layer(front) {
        const el = S.sel;
        if (!el) return;
        const board = el.closest("[data-artboard]");
        const plans = S.selection.map(
          (n) => layerChanges(n, board, front, S.selection)
        );
        record(
          [...new Set(plans.flatMap((p) => p.nodes))],
          () => plans.forEach((p) => p.apply()),
          board
        );
        drawSel();
      }
      const ACTS = {
        nav(btn) {
          if (innerWidth <= 540) {
            const on2 = !host.hasAttribute("data-mobile-nav");
            host.toggleAttribute("data-mobile-nav", on2);
            btn.setAttribute("aria-pressed", on2);
            return;
          }
          const on = !root.hasAttribute("data-editor-nav");
          root.toggleAttribute("data-editor-nav", on);
          host.toggleAttribute("data-nav-hidden", !on);
          btn.setAttribute("aria-pressed", on);
          viewport.refresh(true);
        },
        prev: () => pageStep(-1),
        next: () => pageStep(1),
        edit: () => {
          editRequested = true;
          finishEditRequest();
          requestEditPermission();
        },
        done: () => {
          editRequested = false;
          setEditing(false);
          persistence?.flush().catch(() => {
          });
          ui.activeElement?.blur();
        },
        preview: (btn) => openMenu("play", btn),
        "scroll-play": () => {
          editRequested = false;
          viewport.preview(false);
        },
        fullscreen: () => {
          editRequested = false;
          viewport.preview(true);
        },
        stop: () => viewport.stop(),
        flow: () => setMode(activeBoard(), "flow"),
        artboard: () => setMode(activeBoard(), "artboard"),
        "add-text": addText,
        "add-image": () => {
          S.replace = null;
          fileIn.click();
        },
        undo: () => history(-1),
        redo: () => history(1),
        "page-add": () => pages.add(),
        "page-copy": () => pages.copy(),
        "page-delete": () => pages.remove(),
        "page-rename": () => pages.rename(),
        "page-up": () => pages.moveStep(-1),
        "page-down": () => pages.moveStep(1),
        "image-replace": () => pickReplace(S.sel),
        "image-fit": () => imageFit("contain"),
        "image-cover": () => imageFit("cover"),
        "element-duplicate": () => S.sel && duplicate(S.sel),
        "element-delete": () => S.sel && removeEl(S.sel),
        "element-front": () => layer(true),
        "element-back": () => layer(false),
        source: openSource,
        export: (btn) => openMenu("export", btn),
        more: (btn) => openMenu("more", btn),
        status: (btn) => openMenu("status", btn),
        "element-more": (btn) => openMenu("element", btn),
        save: () => save(),
        download: () => download(serialize()),
        copy: () => copyText(serialize()),
        print: doPrint,
        conflict: () => persistence.conflict(),
        retry: () => persistence.retry(),
        recover: () => persistence.restore(),
        pdf: () => exportFile("pdf"),
        pptx: () => exportFile("pptx"),
        "zoom-in": () => zoomStep(1),
        "zoom-out": () => zoomStep(-1),
        "zoom-reset": () => {
          S.fit = false;
          applyZoom(1);
        },
        "zoom-fit": zoomFit,
        "src-copy": () => copyText(ta.value),
        "src-download": () => download(ta.value),
        "src-apply": applySource,
        "src-close": () => {
          modal.hidden = true;
          focusedBeforeModal?.focus();
        },
        help: () => toast(
          "空白处拖动框选；Shift 或 Ctrl/⌘＋点击增减选择，Shift＋框选追加，Ctrl/⌘＋Shift＋方向键按方向扩选。多选后可一起拖动、微调、复制和删除；Ctrl/⌘ A 保留原行为。Alt/Option 暂停吸附，Esc 逐级取消。文字角点缩放字号，边点调整文本框；空格＋拖动平移，Ctrl/⌘ ＋ − 0 1 缩放；Ctrl/⌘ Z 撤销，Ctrl/⌘ Shift Z 重做，Ctrl/⌘ D 复制。",
          1e4
        )
      };
      const mutations = /* @__PURE__ */ new Set([
        "flow",
        "artboard",
        "add-text",
        "add-image",
        "undo",
        "redo",
        "src-apply",
        "page-add",
        "page-copy",
        "page-delete",
        "page-rename",
        "page-up",
        "page-down",
        "image-replace",
        "image-fit",
        "image-cover",
        "element-duplicate",
        "element-delete",
        "element-front",
        "element-back"
      ]);
      ui.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn || btn.disabled) return;
        if (btn.dataset.fmt) {
          if (persistence?.canEdit() && S.editing)
            fmt(btn.dataset.fmt, btn.dataset.v);
          return;
        }
        const act = btn.dataset.act;
        if (!act) return;
        if (!["preview", "export", "more", "status", "element-more"].includes(act))
          closeMenus();
        if (mutations.has(act) && (!persistence?.canEdit() || !S.editing || S.playing))
          return;
        ACTS[act]?.(btn);
      });
      ui.addEventListener("keydown", (e) => {
        if (!modal.hidden && e.key === "Tab") {
          const controls = [
            ...modal.querySelectorAll("button:not(:disabled),textarea")
          ], first = controls[0], last = controls.at(-1);
          if (e.shiftKey && ui.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && ui.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
          return;
        }
        if (e.target.matches("[aria-expanded=true]") && ["ArrowDown", "ArrowUp"].includes(e.key)) {
          const menu = ui.querySelector("[data-menu]:not([hidden])"), items = [
            ...menu?.querySelectorAll("button:not(:disabled):not([hidden])") || []
          ];
          e.preventDefault();
          (e.key === "ArrowDown" ? items[0] : items.at(-1))?.focus();
          return;
        }
        if (e.key === "Escape" && e.target.closest("[data-menu]")) {
          e.preventDefault();
          e.stopPropagation();
          const expanded = $("[aria-expanded=true]");
          closeMenus();
          expanded?.focus();
        }
        if (e.target.closest("[data-menu]") && ["ArrowUp", "ArrowDown"].includes(e.key)) {
          const items = [
            ...e.target.closest("[data-menu]").querySelectorAll("button:not(:disabled):not([hidden])")
          ], i = items.indexOf(ui.activeElement);
          e.preventDefault();
          items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
        }
      });
      const headCSS = () => [
        ...document.head.querySelectorAll('style, link[rel~="stylesheet"]')
      ].filter((n) => !n.matches("[data-editor-style]"));
      const grab = () => ({
        html: stage.innerHTML,
        css: headCSS().map((n) => n.outerHTML),
        idx: boards().indexOf(S.current)
      });
      function setContent(c) {
        endText();
        select(null);
        headCSS().forEach((n) => n.remove());
        const t = document.createElement("template");
        t.innerHTML = c.css.join("");
        document.head.insertBefore(t.content, pageStyle);
        stage.innerHTML = c.html;
        const list = boards();
        setCurrent(list[Math.min(Math.max(c.idx, 0), list.length - 1)] || null);
        buildNav();
        goTo(S.current);
      }
      let sourceOriginal = "";
      const sourcePending = () => !modal.hidden && ta.value !== sourceOriginal;
      function openSource() {
        focusedBeforeModal = $("[data-act=more]");
        endText();
        select(null);
        ta.value = serialize();
        sourceOriginal = ta.value;
        modal.hidden = false;
        ta.focus();
        ta.setSelectionRange(0, 0);
        ta.scrollTop = 0;
      }
      function applySource() {
        if (!persistence?.canEdit()) return;
        const d = new DOMParser().parseFromString(ta.value, "text/html");
        const ns = d.querySelector("[data-stage]") || d.body;
        ns.querySelectorAll("[data-editor-current],[contenteditable]").forEach(
          (n) => {
            n.removeAttribute("data-editor-current");
            n.removeAttribute("contenteditable");
          }
        );
        const before = grab();
        setContent({
          html: ns.innerHTML,
          css: [...d.head.querySelectorAll('style, link[rel~="stylesheet"]')].map(
            (n) => n.outerHTML
          ),
          idx: before.idx
        });
        const after = grab();
        push({ undo: () => setContent(before), redo: () => setContent(after) });
        modal.hidden = true;
        toast("已应用");
      }
      ta.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          modal.hidden = true;
          focusedBeforeModal?.focus();
        } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          applySource();
        }
      });
      async function copyText(text) {
        try {
          await navigator.clipboard.writeText(text);
          toast("已复制 HTML");
        } catch {
          toast("复制失败，请打开“源码”手动复制");
        }
      }
      function doPrint() {
        endText();
        select(null);
        print();
      }
      addEventListener("beforeprint", () => {
        endText();
        const b = S.current || boards()[0], sz = b && sizeOf(b);
        printStyle.textContent = sz ? `@page{size:${sz.w}px ${sz.h}px;margin:0}` : "";
      });
      function setCurrent(b) {
        S.current = b || null;
        boards().forEach(
          (x) => x.toggleAttribute("data-editor-current", x === b)
        );
      }
      function goTo(b) {
        const list = boards(), i = list.indexOf(b);
        endText();
        if (S.sel && (!b || !b.contains(S.sel))) select(null);
        setCurrent(i >= 0 ? b : list[0] || null);
        if (S.current)
          document.dispatchEvent(
            new CustomEvent("editor:goto", {
              detail: {
                index: list.indexOf(S.current),
                id: S.current.dataset.artboard
              }
            })
          );
        pages.clearTarget();
        host.removeAttribute("data-mobile-nav");
        viewport.refresh(true);
        markActive();
        syncBar();
      }
      function pageStep(d) {
        const list = boards(), i = Math.min(list.length - 1, Math.max(0, list.indexOf(S.current) + d));
        if (list[i] !== S.current) goTo(list[i]);
      }
      function markActive() {
        const list = boards(), i = list.indexOf(S.current);
        ui.querySelectorAll(".pageno").forEach(
          (n) => n.textContent = list.length ? `${i + 1} / ${list.length}` : "0 / 0"
        );
        ui.querySelectorAll("[data-act=prev]").forEach(
          (n) => n.disabled = i <= 0
        );
        ui.querySelectorAll("[data-act=next]").forEach(
          (n) => n.disabled = i < 0 || i >= list.length - 1
        );
        $(".page-title").textContent = S.current?.dataset.title || "";
        $(".page-title").title = (S.current?.dataset.title || "") + " · 点击重命名";
        $(".play-title").textContent = S.current?.dataset.title || "";
        pages.markActive();
      }
      const pages = createPages({
        S,
        root,
        stage,
        ui,
        boards,
        withAll,
        visible,
        esc,
        push,
        goTo,
        select,
        endText,
        writable: () => !!persistence?.canEdit() && S.editing && !S.playing,
        openMenu,
        closeMenus
      });
      const sizeOf = (b) => pages.sizeOf(b), paint = (b) => pages.paint(b), buildNav = () => pages.build();
      const dirty = /* @__PURE__ */ new Set();
      let timer = 0, rebuild = false;
      function schedule() {
        timer ||= setTimeout(() => {
          timer = 0;
          if (rebuild) {
            rebuild = false;
            dirty.clear();
            buildNav();
          } else {
            dirty.forEach(paint);
            dirty.clear();
          }
          if (S.zoom !== 1) applyZoom(S.zoom, null);
          drawSel();
        }, 250);
      }
      const mo = new MutationObserver((ms) => {
        let hit = false;
        for (const m of ms) {
          if (m.type === "attributes" && SKIP_ATTR.test(m.attributeName))
            continue;
          const n = m.target.nodeType === 1 ? m.target : m.target.parentElement;
          if (!n || n.closest("[data-editor-style]")) continue;
          if (m.type === "childList" && [...m.addedNodes, ...m.removedNodes].every(
            (x) => x.nodeType === 1 && x.matches("[data-editor-style]")
          ))
            continue;
          hit = true;
          if (document.head.contains(n) || n.closest("style")) {
            rebuild = true;
            continue;
          }
          if (m.type === "childList" && [...m.addedNodes, ...m.removedNodes].some(
            (x) => x.nodeType === 1 && (x.matches("[data-artboard]") || x.querySelector("[data-artboard]"))
          ))
            rebuild = true;
          const b = n.closest("[data-artboard]");
          if (b) dirty.add(b);
        }
        if (hit) schedule();
      });
      mo.observe(stage, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true
      });
      mo.observe(document.head, {
        subtree: true,
        childList: true,
        characterData: true
      });
      addEventListener("resize", () => {
        rebuild = true;
        schedule();
        viewport.refresh();
        drawSel();
      });
      function measure() {
        withAll(
          () => boards().forEach((b) => {
            if (!visible(b)) return;
            const o = origin(b);
            b.querySelectorAll("[data-el]").forEach((el) => {
              if (!visible(el)) return el.removeAttribute("data-bbox");
              const r = el.getBoundingClientRect();
              const v = [r.left - o.x, r.top - o.y, r.width, r.height].map((n) => Math.round(n / o.s)).join(",");
              if (el.dataset.bbox !== v) el.dataset.bbox = v;
            });
          })
        );
      }
      function serialize(finish = true) {
        if (finish) endText();
        measure();
        const doc = root.cloneNode(true);
        doc.querySelectorAll(
          "[data-editor-ui], [data-editor-connection], style[data-editor-style], #codex-browser-sidebar-comments-root"
        ).forEach((n) => n.remove());
        [...doc.attributes].filter((a) => /^data-edit/.test(a.name)).forEach((a) => doc.removeAttribute(a.name));
        doc.querySelectorAll("[contenteditable],[data-editor-current]").forEach((n) => {
          n.removeAttribute("contenteditable");
          n.removeAttribute("data-editor-current");
        });
        return "<!DOCTYPE html>\n" + doc.outerHTML;
      }
      function download(text, name = fileName()) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(
          text instanceof Blob ? text : new Blob([text], { type: "text/html;charset=utf-8" })
        );
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1e3);
      }
      function save() {
        endText();
        persistence.save();
      }
      const exportFile = createExporter({
        ui,
        serialize,
        toast,
        download,
        fileName
      });
      addEventListener("beforeunload", (e) => {
        if (S.changed || sourcePending()) {
          e.preventDefault();
          e.returnValue = "";
        }
      });
      let config = null;
      try {
        config = JSON.parse(
          document.querySelector("[data-editor-connection]")?.textContent || "null"
        );
      } catch {
      }
      const viewKey = "html-design-view:" + location.pathname;
      function reloadLatest() {
        try {
          sessionStorage.setItem(
            viewKey,
            JSON.stringify({
              page: S.current?.dataset.artboard,
              zoom: S.zoom,
              fit: S.fit,
              editRequested
            })
          );
        } catch {
        }
        location.reload();
      }
      persistence = createPersistence({
        config,
        serialize,
        download,
        changed: (value) => {
          S.changed = value;
        },
        isBusy: () => !!S.drag || sourcePending(),
        hasPendingSource: sourcePending,
        pause() {
          if (sourcePending()) return false;
          if (S.drag) {
            S.drag.up();
            S.drag = null;
          }
          setEditing(false);
          return true;
        },
        reload: reloadLatest,
        applyHTML(html) {
          const d = new DOMParser().parseFromString(html, "text/html");
          setContent({
            html: d.querySelector("[data-stage]").innerHTML,
            css: [
              ...d.head.querySelectorAll('style,link[rel~="stylesheet"]')
            ].map((n) => n.outerHTML),
            idx: boards().indexOf(S.current)
          });
        },
        render(state) {
          canRequestEdit = !!state.takeover;
          if (state.retry || state.conflict) editRequested = false;
          host.toggleAttribute("data-readonly", !state.canEdit);
          const message = state.message === "已自动保存" ? "已保存" : state.message;
          $(".state-text").textContent = message;
          $(".save-state").title = state.message;
          $(".status-detail").textContent = state.message;
          $(".state-icon").innerHTML = icon(
            state.retry || state.conflict ? "CircleAlert" : state.message.includes("只读") ? "Lock" : state.message.includes("保存…") ? "RefreshCw" : "Check"
          );
          ["retry", "recover", "conflict"].forEach(
            (act) => $(`[data-act=${act}]`).hidden = !state[act]
          );
          $("[data-act=save]").disabled = state.managed && !state.canEdit && !state.dirty;
          if (!state.canEdit && S.editing) setEditing(false);
          finishEditRequest();
          if (editRequested && !state.canEdit) requestEditPermission();
          syncBar();
          if (state.retry || state.recover || state.conflict) {
            $(".save-state").setAttribute(
              "aria-label",
              state.message + "，点击处理"
            );
          } else $(".save-state").setAttribute("aria-label", state.message);
        }
      });
      setCurrent(boards()[0]);
      root.setAttribute("data-editor-single", "");
      buildNav();
      markActive();
      setEditing(false);
      zoomFit();
      document.readyState === "complete" ? viewport.refresh() : addEventListener("load", () => {
        buildNav();
        viewport.refresh();
      });
      try {
        const view = JSON.parse(sessionStorage.getItem(viewKey) || "null");
        sessionStorage.removeItem(viewKey);
        if (view) {
          editRequested = !!view.editRequested;
          setCurrent(
            boards().find((b) => b.dataset.artboard === view.page) || boards()[0]
          );
          S.fit = view.fit;
          view.fit ? zoomFit() : applyZoom(view.zoom);
          markActive();
        }
      } catch {
      }
      ui.querySelectorAll("[data-menu] button").forEach(
        (n) => n.setAttribute("role", "menuitem")
      );
      persistence.start();
    }
    document.readyState === "loading" ? addEventListener("DOMContentLoaded", main) : main();
  })();
})();
