# Maths Lab — Foundation GCSE

A static visual maths tutor for a student who needs a calm pace, large controls and explicit mathematical reasoning. Each Next tap performs one step, then stops. The original balance lessons and highlighted new terms are preserved. KaTeX and its fonts are bundled locally; there are no accounts, CDN dependencies or build steps.

## Run locally

Requires Node 24+ for the development server and tests:

```sh
npm start
```

Open **http://localhost:5500/**. The existing VS Code **Start local server** task runs the same root `server.js`. This file is development tooling, so it stays outside `src`; it now uses ES modules and serves only `src`. Set `PORT` to use a different port. Any HTTP static server serving `src` also works.

Use HTTP rather than `file://`: the app fetches JSON and imports ES modules. Once served locally, core functionality needs no internet connection; the curriculum reference links need internet access. There is no service worker or offline installation feature.

## Implemented and planned lessons

| Subject | Fully implemented |
| --- | --- |
| Algebra | `x − 3 = 2`; `x + 3 = 2`; `3x = 12`; `x / 4 = 3`; `2x + 3 = 11`; `3x + 2x = 15`; `3(x + 2)` |
| Number | `6 × (2 + 3)`; `2 − 5`; `4 + (−3)`; `4 + 3 × 2`; `1/2 = 2/4` |

The algebra lessons use balances, equal groups and moving x/unit tiles. Distribution is an expression lesson with no balance; it is deliberately distinct from evaluating numeric brackets. Number-line lessons move one unit per tap. Fraction bars introduce partitions without changing the shaded area.

These are **non-clickable Coming later entries**, with no claim of an implemented renderer:

- Number: three quarters of 20; 25% of 80.
- Ratio, Proportion and Rates of Change: sharing 20 in 1:3; equivalent ratios 2:3 and 4:6.
- Geometry and Measures: angles on a straight line; rectangle area.
- Probability: equally likely outcomes.
- Statistics: mean as equal sharing.

## Architecture

```text
src/
  index.html
  css/styles.css
  data/manifest.json
  data/{number,algebra,ratio,geometry,probability,statistics}.json
  js/app.js                 UI, accessible status, sidebar and navigation
  js/lesson-loader.js       relative fetches, cache, isolated file/lesson errors
  js/lesson-engine.js       validation and guarded deterministic transitions
  js/mathematics.js         non-executable linear-expression parser
  js/balance.js             original SVG balance/expression rendering, group tiles
  js/renderers.js           renderer dispatch, number lines and fraction bars
  js/animations.js          term identity transitions, cancellation, beam movement
  js/presentation.js        native fullscreen and in-page fallback
  js/notation.js            shared KaTeX renderer, spoken labels and term sizing
  vendor/katex/             pinned KaTeX 0.16.22, CSS, fonts and MIT license
tests/                     dependency-free Node tests
server.js                  local development tooling
scripts/browser-check.mjs   optional dependency-free browser checks via DevTools
```

The six-area manifest defines order, titles and JSON paths. Subject files load independently and are cached in memory. A missing/malformed subject produces a friendly error in that area; a malformed lesson is omitted without hiding valid lessons. Manifest failure produces a page-level reload/server message. Reloading retries downloads. No lesson content is injected as HTML and no executable code is accepted from JSON.

### Lesson data

Each subject contains `id`, `title`, and `lessons`. Available lessons contain:

- `id` (globally unique), `title`, `label`, `tier: "Foundation"`, `subjectArea`, `available: true`.
- `kind`: `balance`, `expression`, `number-line`, or `fractions`.
- `initialExpression`, `objective`, `prerequisites` array, and `curriculum` array of `{provider, reference?, title, url}`.
- `tutorNotes`: `observe`, `misconception`, `checkQuestion`.
- `steps`: complete deterministic states, not executable transformations.

Every step has `title`, `explanation`, optional `detail`, `operation: {type, value?}`, `left` and `right` term arrays, and `balance`. Terms have stable `id`, `text`, `latex`, `spoken`, and `tone` (`original`, `negative`, `operation`). `highlight` contains term IDs; `cancel` identifies opposite terms in the preceding frame. Reuse IDs for the same objects so they move smoothly.

### Mathematical notation

KaTeX renders every mathematical display, including lesson headings/buttons, individual balance terms, equation signs, worked expressions, group tiles, and number-line labels. Each term remains a separate SVG `foreignObject` carrying its original `data-term` identity. Existing animations move and fade those containers; the entire equation is never flattened. New terms retain their purple colour and cancellation pairs retain their shared highlight.

Notation is authored explicitly rather than converted from arbitrary input at runtime:

```json
{
  "id": "quarter",
  "text": "x / 4",
  "latex": "\\frac{x}{4}",
  "spoken": "x divided by four",
  "tone": "original"
}
```

`text` remains the independent arithmetic-validation representation. `latex` is conventional textbook notation; use `\frac{3x}{3}` for division, `\times` for explicit multiplication, `3x` for implicit multiplication, `x^2` for powers, and `\sqrt{x}` for roots. In JSON each literal backslash is escaped as `\\`. Powers and roots are supported in presentation; this refactor does not extend the existing linear-equation engine or add lessons.

Each available lesson supplies `notation: {latex, spoken}` for its title. A step's `working` display has a matching `workingNotation`. Optional `titleContent`, `explanationContent`, and `detailContent` arrays combine `{text: "plain prose"}` and `{latex, spoken}` segments, keeping maths in explanations consistent without interpreting prose as executable markup. Keep the original plain text fields for fallback and editing.

The validator checks LaTeX and requires spoken equivalents before a lesson becomes available. KaTeX uses `trust: false`, fresh macros and bounded expansion. Only KaTeX-generated markup is inserted; no author HTML is accepted. The visual canvas retains its single spoken description for screen readers so nested MathML is not announced repeatedly; mathematical headings and inline explanations include KaTeX MathML and meaningful labels.

Math fonts load before measuring term widths. Rows reserve vertical space for stacked fractions and scale only when needed to fit a plate. Fraction bars and denominators stay above the plate, even during tilt. The bundled renderer, stylesheet and font files work under GitHub Pages project paths with no runtime network request to a third party. Retain `src/vendor/katex/LICENSE` when distributing the site.

Balance steps declare `balance: -1 | 0 | 1`, explicit `unbalanced`, and `math: {left: {coefficient, constant}, right: {coefficient, constant}}`. Each balance lesson also declares `solution`. The engine parses visible expressions and compares them with the declared linear states, then checks equivalence against that solution. A deliberately unequal step must use a nonzero tilt and `unbalanced: true`; the renderer displays **≠**, never a false equality. Tilt is a conceptual direction, not a weight calculation that assumes x in advance.

Other renderers use `balance: null`. Number-line steps declare `position` from −5 to 5. Fraction steps declare `bars: [{id, parts, shaded}]`. Optional `groups: [{id, label, items: [{id, text, tone}]}]` render equal groups or tiles below a balance/expression. Keep groups small enough to remain readable.

Supported operation types describe intent; each includes a complete destination state:

| Types | Presentation |
| --- | --- |
| `show`, `highlight` | Show a state or emphasize existing terms |
| `apply-left`, `apply-right`, `apply-both` | Introduce matching inverse-operation terms; tilt or restore the balance |
| `cancel` | Highlight the declared pair together, then fade it away |
| `simplify`, `replace` | Replace terms with their equivalent simplified form |
| `group`, `split`, `distribute` | Reorganize stable tile identities or introduce equal copies |
| `move` | Move the number-line marker to its next declared position |
| `partition` | Fade in new fraction dividing lines while preserving shaded area |

The engine controls the index and locks transitions. The renderer reads the state; the animation layer decides how terms appear and move. Back restores the previous state immediately; Restart restores the initial state. Neither auto-plays the lesson. Adjust durations in `js/animations.js`.

### Add a lesson

1. Copy a similar available entry into its subject JSON; choose a globally unique ID.
2. Fill in metadata, a verified curriculum reference, and one short tutor question.
3. Define a complete initial state and one conceptual operation per subsequent step. Reuse stable term/object IDs. For equations, supply matching affine state and a solution.
4. Run `npm test`, then step through the example in the browser with normal and reduced motion.
5. For unsupported visual concepts, add `{id, title, tier: "Foundation", subjectArea, available: false}` instead. Do not add a button until a renderer and meaningful transitions exist.

### Curriculum source policy

Each available lesson carries its own official reference and the UI displays that link and collapsed tutor notes. The current entries reference the verified AQA 8300 [Algebra](https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/specification/subject-content/3.2-algebra) and [Number](https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/specification/subject-content/3.1-number) sections: A17 for equations, A4 for manipulation, N1/N2 for signed arithmetic, N3 for operation order, and the Number section for fraction arithmetic. These topics are included in the specification's Foundation content, and are not exclusive to Foundation. URLs and mappings checked on 17 October 2026.

Verify any new topic mapping before adding a granular code. If only a high-level official source is verified, omit the code; do not invent one. Planned entries have no fabricated references.

## Accessibility and presentation

- Six subject headings expand/collapse with native keyboard-operable disclosure controls. The active subject is underlined and the active lesson has a border/inset marker plus `aria-pressed`.
- Sidebar stays available in landscape widths of at least 1000px. Narrower screens use a non-modal drawer with an always-visible toggle. Choosing a lesson closes it and focuses the lesson title; Escape closes it and returns focus to the toggle. The drawer is intentionally non-modal and does not trap keyboard users.
- Buttons have at least 60px height and generous gaps. Controls occupy a consistent row; that row remains accessible while scrolling. Layouts have no required dragging or precise gestures.
- Full screen requests the native API; unsupported/rejected requests enter an in-page mode that hides navigation. **Exit full screen** stays visible; Escape also exits fallback mode. Native browser exit events update the button.
- Plates sit above the beam. Expressions remain horizontal. Signs and text accompany colour; new matching operation terms share purple. Screen-reader descriptions include equations, groups and marker positions. Step explanations use a polite live region.
- Reduced motion skips animated movement and fading but preserves final highlighting and explanations. No automatic advancement or time limit.

## Test and manual verification

```sh
npm test
```

Tests cover the original three lesson regressions; all available lesson navigation; reduced motion and enabled term animations; manifest/subject loading and caching; repository subpaths; unique IDs; invalid-file/lesson isolation; schema and operation validation; visible equation consistency and balanced equivalence; signed arithmetic/fraction states; rapid clicks; Back/Restart; rollback; supported, unsupported and rejected fullscreen APIs.

Notation tests also cover KaTeX fraction/power/root output, MathML, valid notation and spoken labels for all lesson terms, malformed LaTeX, stable cancellation IDs, and agreement between the new LaTeX and every existing balance state's numerical model.

Headless Edge checks were also run at 768×1024, 1024×768, 1180×820 and 390×844: no horizontal overflow, controls at least 56px, all 12 lesson sequences, Back/Restart, rapid taps, fixed control positions within each lesson, fallback fullscreen and absence of runtime errors. These desktop browser checks do not replace iPad Safari and VoiceOver testing.

To repeat browser checks, start `npm start`, then launch a separate headless Edge/Chromium instance with `--remote-debugging-port=9223` and a dedicated `--user-data-dir` (for example, under ignored `temp`). Run `node scripts/browser-check.mjs`. It uses Node's built-in WebSocket, saves viewport screenshots under `temp`, and closes that dedicated browser when finished. No browser package is installed. Set `MATHS_TEST_URL` if your server uses another port. The checks also measure KaTeX bounds and plate clearance at iPad sizes. Native OS fullscreen can stall in headless Windows, so supported-API behaviour is unit tested and native browser entry/exit remains a physical-device check; the browser suite checks both fallback paths.

On an iPad:

1. In portrait, open the menu, expand each area and select a lesson. Check the drawer closes and equations are legible. Rotate to landscape and check the sidebar and navigation controls.
2. Run both original equations through all five steps. Check ≠ and tilt only during one-sided operations, matched purple terms, cancellation and the explanation of −1.
3. Try the group/tile, bracket, number-line and fraction lessons. Tap Next rapidly, then Back and Restart. Confirm each completed transformation pauses.
4. Enter and exit full screen; try the in-page fallback if native full screen is unavailable. The exit button must stay obvious.
5. Enable Reduce Motion; check instant state changes. Use a keyboard and VoiceOver to check focus and announcements. Open tutor notes and the official reference.

Known limits: only the twelve listed lessons are available; new renderer types require code. Phone-sized equations and five-group diagrams are less spacious than on the primary iPad target. Native fullscreen, touch behaviour and VoiceOver still need verification on a physical iPad. The static server is for local development and binds to loopback.

## GitHub Pages

No backend or build is required. All source and fetch paths are relative and support repository subpaths.

- For simple branch hosting, choose your branch and `/ (root)` in Settings → Pages, then open `https://<user>.github.io/<repository>/src/`.
- To publish at the project root, use GitHub Pages Actions and upload **`src`** as the Pages artifact. Pages branch hosting cannot select an arbitrary `src` directory.

The development server, tests and ignored `temp` directory do not belong in the Pages artifact. This change does not deploy the site.
