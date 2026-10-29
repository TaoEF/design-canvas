# Local text measurement

Read-only commands for choosing text-box widths and checking saved HTML. They use
the installed local browser and bundled Pretext. No API key, remote conversion
service, HTTP endpoint, or editor interaction is required. Use the project's
[runtime setup](runtime.md) for dependencies and the browser. Run commands from
the complete source root, not the installed skill directory. Reuse current DOM
measurements when they already answer the question; use candidate prediction
for text not yet rendered, rather than measuring the same facts twice.

## Stable contract (v1)

The documented arguments, units, nullable values, and exit codes are stable.
Consumers may ignore additional result fields. Existing fields will not change
meaning or type within this contract. No remote API or editor integration is needed.

Successful execution always returns `status` (`ok` or `issues`), `units: css-px`,
`box` (`content-box` for measure, `border-box` for check), and `resourceErrors`
(an array, empty when no CSS/font request failed). Measure returns `layouts` in
input width order; check returns `pageCount`, `textCount`, `checkedCount`,
`truncated`, and `issues`. A measurable overflow item counts as checked; hidden,
unmarked, unsupported, invalid-ID, and failed items do not. Files include the
saved-byte SHA-256 `source.revision`. Execution errors return `status: error`
with `error.code` and `error.message`, without fabricated layout metrics.

`engine: pretext` means its metrics passed browser validation; `browser` is an
actual-layout fallback, not a failure. Unsupported or failed measurements are
explicit issues. Browser layout remains authoritative for Flex/Grid and rich
text; resizing retains the document's existing layout rules. Adaptation is
explicit, never an automatic resize or rewrite during measurement.

## Measure candidate widths

Save a JSON request, then run:

```sh
node html-design/text.mjs measure request.json
```

```json
{
  "text": "人与 AI 共用同一份设计文件。",
  "font": "32px Arial, \"PingFang SC\", sans-serif",
  "lineHeight": 42,
  "widths": [240, 360, 480],
  "maxHeight": 100
}
```

Required fields: `text` (plain text, at most 20000 UTF-16 units), `font` (Canvas
font shorthand with a px size), `lineHeight` (0–1024 CSS px, excluding zero),
`widths` (1–32 candidate content widths, each >0 and ≤16384 CSS px).

Optional fields: `maxHeight` (0–16384 content px; omitted means no height budget),
`letterSpacing` (-100–100 px, default 0), `whiteSpace` (`normal`, default, or
`pre-wrap`), and `wordBreak` (`normal`, default, or `keep-all`). Unknown fields
and wrong types are errors.

Output includes unwrapped `naturalWidth`, plus `lineCount`, `maxLineWidth`,
`requiredHeight`, and overflow per candidate. All widths/heights are **content
box CSS pixels**, independent of canvas zoom. `verticalOverflow` is null without
a height budget. `engine: browser` means some metrics used actual browser layout;
`lineCount` is null if no validated line count is available. Font fallback is
the local browser's; results are not a cross-machine font guarantee.

For a document's web fonts, add `--document design.html`. Relative CSS/font
resources resolve from its local preview URL. When measuring an AI work copy,
provide its original resource base explicitly:

```sh
node html-design/text.mjs measure request.json --document /absolute/work/document.html --base-url http://127.0.0.1:8878/demos/pretext-experiment.html
```

## Check generated HTML

```sh
node html-design/text.mjs check demos/design.html
```

All artboards are checked, including pages hidden by single-page presentation.
Unmarked text is reported as `unmarked`; direct text mixed with nested editable
elements is reported as unsupported (`NESTED_TEXT_CONTAINER`). Neither counts
as checked. Text hidden by ancestors is reported as hidden; a text box crossing
an ancestor's clipping boundary is reported as `clipped`, with `clippedBy`
identifying that boundary. Clipping may be intentional and needs interpretation.
Output contains stable `pageId`/`elementId` targets, overflow/out-of-bounds boxes,
required/current **border-box** heights, and counts. Hidden text, unsupported
layouts, invalid IDs, failed measurements, failed CSS/fonts, and truncation are
reported as issues, never as a clean pass. Limits: 100 pages, 500 text blocks,
32 MiB HTML, and 30 seconds of measurement. This is text-fit checking, not a full
visual, overlap, image, or aesthetic audit.

The command reads saved bytes only; `source.path` and `source.revision` identify
that snapshot. It does not flush, lock, or save an open browser document. For an
existing edited file, use the normal AI handoff to obtain its latest work copy,
then check that copy with `--base-url` set to the original preview URL.

Default resource origin is `HTML_DESIGN_ORIGIN` or `http://127.0.0.1:8876`.
`--base-url` overrides it and must be a local HTTP(S) URL. A running preview
server is needed only for resources served there; inline HTML and system-font
measurement work without it. Content scripts are disabled, and document
navigation is rejected so results remain tied to the input snapshot. No HTML is modified.

Both commands print one JSON result. Exit codes: **0** = no reported issues,
**2** = layout/resource issues with usable measurements, **1** = invalid request
or execution failure. Measurements describe constraints; they do not prescribe
whether to resize, change type, or rewrite content.
