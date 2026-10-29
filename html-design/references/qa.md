# Saved-file layout QA (v1)

Run from the complete [source runtime](runtime.md), with dependencies and a local
browser installed:

```sh
node html-design/qa.mjs check input.html
node html-design/qa.mjs check work-copy.html --base-url http://127.0.0.1:8876/designs/input.html
```

The command checks **saved bytes**, not unsaved browser DOM. Obtain the latest
work copy through the normal [AI handoff](collaboration.md) when editing an
active document. QA does not flush, take ownership, rewrite, repair or commit.
The default temporary read-only server serves resources inside the input's
folder; outside-root symlinks are denied. Use an existing loopback file URL for
resources outside that folder or an AI work copy's original resource base.
Document scripts and navigation are blocked; all artboards are checked after
removing editor stage zoom. No persistent service or API key is required.

## Result and interpretation

One JSON result on stdout contains `schemaVersion: 1`, `status: ok|issues`,
`source: {kind: saved-file, path, revision}`, `units: css-px`, `pageCount`,
`textCount`, `checkedCount`, `truncated`, `coverage`, and `issues`.
`path` is an absolute real path; `revision` is the saved-byte SHA-256.
`checkedCount` retains the existing text-check meaning: measurable text blocks,
including overflowing ones. `coverage.text.linesChecked` counts blocks whose
actual rendered lines were reliable enough for punctuation/orphan checks.
Coverage separately reports seen/checked elements, hidden/unsupported text and
elements, scanned graphemes, suppressions, admitted issue bytes and omitted issues/evidence. Seen counts are
lower bounds when truncated. Never interpret missing issues as a clean result
without checking `status`, `truncated` and coverage.

Each issue has a stable `code`, `severity: warning|error`, nullable `pageId` and
`elementId`, and bounded `evidence`. IDs are null when missing, non-unique or longer than 256 UTF-16 units; overlong IDs report `ID_INVALID` with their length rather than a shortened locator. This also bounds clipping-ancestor identifiers.
Line evidence includes a 1-based rendered line number, at most 80 characters,
and a rectangle relative to its artboard. Boxes and height budgets are CSS
pixels. Resource evidence contains a bounded URL; embedded image data is omitted.
Errors print `status: error` and `error.code/message` on stderr without invented
metrics. Exit **0** means checked without reported issues, **2** means issues or
incomplete coverage, **1** means input/execution failure. No next-action command
is embedded in feedback.

## Checks and intentional exceptions

- `TEXT_OVERFLOW`, `ANCESTOR_CLIP`: reuse existing text inspection once, including
  font readiness. Required/available heights and clipping ancestors are facts;
  intentional clipping is possible.
- `ELEMENT_OUT_OF_BOUNDS`: visible marked objects crossing their artboard.
- `IMAGE_LOAD_FAILED`, `RESOURCE_FAILED`: failed image decoding or CSS/font
  requests. Failed fonts do not become successful fallback measurements.
- `LINE_ORPHAN_CJK`: a soft-wrapped final line with one Han grapheme, optionally
  followed by closing punctuation (for example `定。`).
- `LINE_ORPHAN_PUNCTUATION`: a soft-wrapped line containing one punctuation mark.
- `LINE_START_PROHIBITED`, `LINE_END_PROHIBITED`: common Chinese closing marks
  at a soft line start or opening marks at a soft line end.

Line checks use actual DOM Range/grapheme geometry, not Pretext predictions.
Explicit `<br>` and preserved newlines divide author-controlled segments; a
single-character explicit line is not an accidental soft-wrap orphan. Mixed
font sizes/baselines, vertical writing, columns (either `column-count` or `column-width` on applicable text/descendants), complex transforms, generated
text, nested text containers or unreliable Range order are reported as
`LINE_UNSUPPORTED`, `TEXT_UNSUPPORTED` or `GEOMETRY_UNSUPPORTED`, with incomplete
coverage. They are not guessed or treated as checked. Ordinary inline weight
changes, Flex/Grid positioning and translations can remain measurable.

For deliberate typography, set space-separated rule codes **only on that
object**, for example:

```html
<p data-el="p1-poem" data-qa-ignore="LINE_ORPHAN_CJK LINE_START_PROHIBITED">…</p>
```

Only the text-overflow, ancestor-clip, element-bounds and four line-warning codes
above can be suppressed; suppressions are counted. Identity errors, hidden or
unsupported coverage, resource/measurement failures and limits cannot be
suppressed into a clean pass. Unaffected content needs no new attributes.

Limits: 32 MiB input, 100 artboards, 500 text candidates, 2,000 elements/images,
20,000 UTF-16 units before inspecting one text block, 20,000 graphemes per block,
100,000 total graphemes, 500 issues, 128 KiB of JSON issue bytes and a 30-second browser scan. Issues are admitted one at a time against both count and byte limits, including resource diagnostics. Clipping evidence includes at most 32 ancestors; omitted evidence also marks truncation. QA source paths are at most 4,096 UTF-16 units and execution-error messages at most 512; with metadata the CLI JSON remains below 160 KiB. Image decoding
has a five-second per-image bound. Truncation returns incomplete coverage.

This is a first set of layout diagnostics, not a complete visual/aesthetic or
arbitrary-overlap audit. Rotation and advanced crop coverage are not yet
implemented. Automated AI-commit feedback and editor QA UI remain
[Issue #7](https://github.com/TaoEF/dom-slides/issues/7); the command adds no gate.
The existing [text measure/check interface](text-measurement.md) remains stable.
