# Maths Lab — Foundation GCSE

A static visual maths tutor for a student who needs a calm pace, large controls and explicit mathematical reasoning. Each Next tap performs one step, then stops. The original balance lessons and highlighted new terms are preserved. KaTeX and its fonts are bundled locally; there are no accounts, CDN dependencies or build steps.

## Run locally

Requires Node 24+ for the development server and tests:

```sh
npm start
```

Open **http://localhost:5500/**. The existing VS Code **Start local server** task runs the same root `server.js`. This file is development tooling, so it stays outside `src`; it now uses ES modules and serves only `src`. Set `PORT` to use a different port. Any HTTP static server serving `src` also works.

Use HTTP rather than `file://`: the app fetches JSON and imports ES modules. Once served locally, core functionality needs no internet connection; the curriculum reference links need internet access. There is no service worker or offline installation feature.

## Development checks

Install development tools with `npm ci`, then run `npm run check` for ESLint, formatting checks and all tests. Use `npm run format` to apply formatting. ESLint checks our JavaScript, including tests and scripts; intentionally unused callback parameters start with `_`.

Prettier formats source, tests, configuration and documentation. Bundled vendor files, lesson datasets and generated files are excluded. EditorConfig defines UTF-8, two-space indentation and LF line endings. These tools are development dependencies; serving the site still requires no build or installation.

SVG helpers live in `src/js/svg.js`. Diagram surfaces and neutral strokes use the CSS theme variables in `styles.css`; mathematical colour meanings remain consistent. Recoverable load/navigation/fullscreen failures keep their friendly UI behaviour and log the underlying error to the developer console.

## Implemented and planned lessons

| Subject                               | Fully implemented                                                                                                                                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Algebra                               | `x − 3 = 2`; `x + 3 = 2`; `3x = 12`; `x / 4 = 3`; `2x + 3 = 11`; `3x + 2x = 15`; `3(x + 2)`; substitution into `3x + 2`                                                                                               |
| Number                                | `6 × (2 + 3)`; `2 − 5`; `4 + (−3)`; `4 + 3 × 2`; `1/2 = 2/4`; three quarters of 20; 25% of 80; adding sixths; `3²`; `2³`; `√25`; `5⁰`; same-base power multiplication; prime factorisation of 18; `3.4 × 10`          |
| Ratio, Proportion and Rates of Change | Equivalent ratios `2:3 = 4:6`; simplifying `6:9`; sharing 20 in `2:3`; unitary cost (3 items cost £12, find 1 then 5)                                                                                                 |
| Geometry and Measures                 | Adjacent angles on a straight line; angles around a point; rectangle perimeter; rectangle area; right-triangle area by completing a rectangle; Pythagorean square areas; finding a hypotenuse; finding a shorter side |
| Probability                           | Equally likely outcomes; complementary events; the probability scale; coin-and-spinner sample space                                                                                                                   |
| Statistics                            | Mean by redistribution; odd-sized median; mode; range; reading a bar chart                                                                                                                                            |

The algebra lessons use balances, equal groups and moving x/unit tiles. Distribution is an expression lesson with no balance; it is deliberately distinct from evaluating numeric brackets. Number-line lessons move one unit per tap. Fraction bars introduce partitions without changing the shaded area.

There are **44 implemented lessons** across the six official areas. Fractions and percentages stay in Number: no duplicated navigation area is needed. All earlier lessons remain available. The sidebar is a teaching selection, not a claim of full GCSE coverage. See the [Foundation curriculum audit](docs/foundation-curriculum-audit.md) for coverage, gaps, Foundation/Higher distinctions, references and prerequisite dependencies.

Suggested new sequence: **Square numbers → Cube numbers / Square roots → Zero powers / Multiply powers**. Before Pythagoras, teach squares and square roots, then the square-area relationship. The area demonstration preserves 25 unit-tile identities as nine plus sixteen tiles move into the hypotenuse square. The two calculation lessons separately teach addition for an unknown hypotenuse and subtraction for an unknown shorter side. Only positive lengths are returned; checking one 3–4–5 example is not presented as a general proof.

Prioritised future work (not interactive placeholders):

1. Number: HCF/LCM, wider decimal/fraction operations, further place-value shifts, a hundred grid and percentage changes.
2. Algebra: sequences, inequalities, coordinates/graphs and gradient/intercept.
3. Geometry: triangle angle rearrangement, unit conversions, coordinate transformations, map scales and right-triangle trigonometry.
4. Probability: relative frequency, more sample spaces and probability trees.
5. Statistics: even-sized median, frequency tables to charts and pie charts.
6. Ratio: linked direct-proportion bars, rates and scale diagrams.

## Architecture

```text
src/
  index.html
  css/styles.css
  data/manifest.json
  data/lessons/{number,algebra,ratio,geometry,probability,statistics}.json
  data/examples/{number,algebra,ratio,geometry,probability,statistics}.json
  js/lesson-templates.js    shared data-only template expansion and validation
  js/algebra-templates.js   compatibility API for selecting an algebra example
  js/app.js                 UI, accessible status, sidebar and navigation
  js/lesson-loader.js       relative fetches, cache, isolated file/lesson errors
  js/lesson-engine.js       guarded deterministic navigation and rollback
  js/lesson-validation.js   manifest/lesson schema and mathematical invariants
  js/svg.js                 shared SVG elements, labels, maths and entity wrappers
  js/mathematics.js         non-executable linear-expression parser
  js/balance.js             original SVG balance/expression rendering, group tiles
  js/renderers.js           renderer dispatch, number lines and fraction bars
  js/diagrams.js            counters, angles, shapes, data cards, charts, probability
  js/diagram-state.js       schema and mathematical invariants for diagram scenes
  js/learning-diagrams.js   arrays, power patterns, Pythagoras, factors, places, grids
  js/learning-state.js      validation for those reusable learning scenes
  js/learning-geometry.js   exact outward-square geometry and prime checking
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

All six subjects use templates plus curated examples. Each subject has matching filenames in `data/lessons/` and `data/examples/`, for example `lessons/algebra.json` and `examples/algebra.json`. The manifest records both paths. Each file pair is cached by its full URL, so matching filenames remain separate. The generated lessons all have the same runtime format described below.

Each subject contains `id`, `title`, and `lessons`. Available lessons contain:

- `id` (globally unique), `title`, `label`, `tier: "Foundation"`, `subjectArea`, `available: true`.
- `kind`: `balance`, `expression`, `number-line`, `fractions`, or one of the diagram kinds below.
- `initialExpression`, `objective`, `prerequisites` array, and `curriculum` array of `{provider, reference?, title, url}`.
- `tutorNotes`: `observe`, `misconception`, `checkQuestion`.
- `steps`: complete deterministic states at runtime; the template can contain bounded repetition recipes.

New lessons also include optional `prerequisiteLessonIds`: stable available lesson IDs, checked for valid references and cycles by tests. Friendly `prerequisites` text remains in the collapsed tutor notes, alongside a **Can you explain why?** question. Dependencies guide the tutor; they do not lock lessons or track progress.

Every step has `title`, `explanation`, optional `detail`, `operation: {type, value?}`, `left` and `right` term arrays, and `balance`. Terms have stable `id`, `text`, `latex`, `spoken`, and `tone` (`original`, `negative`, `operation`). `highlight` contains term IDs; `cancel` identifies opposite terms in the preceding frame. Reuse IDs for the same objects so they move smoothly.

### Algebra templates and curated examples

`data/lessons/algebra.json` contains the eight algebra templates, retaining the existing lesson IDs and fixed teaching sequences. `data/examples/algebra.json` contains exactly one current example per template, named `<lesson-id>-1`. Every other subject follows the same naming convention. Lesson IDs still identify navigation and prerequisites; `exampleId` identifies the chosen set of numbers.

| Template ID        | Fixed form          | Current values   |
| ------------------ | ------------------- | ---------------- |
| `add-both`         | `x − a = b`         | `a=3, b=2`       |
| `subtract-both`    | `x + a = b`         | `a=3, b=2`       |
| `divide-three`     | `ax = b`            | `a=3, b=12`      |
| `multiply-four`    | `x / a = b`         | `a=4, b=3`       |
| `two-step`         | `ax + b = c`        | `a=2, b=3, c=11` |
| `like-terms`       | `ax + bx = c`       | `a=3, b=2, c=15` |
| `distribute-three` | `a(x + b)`          | `a=3, b=2`       |
| `substitution`     | `ax + b`, given `x` | `a=3, b=2, x=4`  |

To add a future curated example, append an entry to the matching template's `examples` array. For example, this would be `add-both-2`:

```json
{ "id": "add-both-2", "values": { "a": 5, "b": 7 } }
```

All parameters are bounded positive integers. Grouping examples must divide exactly and fit the visual space; invalid examples are rejected rather than rendered with misleading tiles. The first example remains the default. There is no random selection or example picker yet. A future “Try yourself” area can choose a curated example and call `instantiateAlgebraLesson(template, example)` to get the same ordinary lesson structure used by the existing engine.

Templates use `{{a}}` for numeric text, `{{a|words}}` / `{{a|Words}}` for number words, and explicit formats for signed answers and spoken equivalents. Numeric fields use `{ "$value": "answer" }`. Ordered `derived` values use only `add`, `subtract`, `multiply`, `divide`, `power`, and `gcd` with two operands; no JavaScript or arbitrary expression strings are evaluated. `$repeat` recipes generate groups, tiles and repeated teaching steps with stable IDs, including counts, offsets and scoped indices. `$if` selects wording and `$test` produces highlights using only `less`, `equal`, or `atMost` comparisons. `$join` combines text fragments, including singular/plural fraction names, and placeholders in object keys keep sample-space column labels and names aligned. Parameter limits, optional allowed choices, required whole-number results and mathematical constraints are declared in each template.

The shared generator creates fresh states, notation, explanations and spoken descriptions, then runs the existing lesson validator. The loader caches each template/example file pair and validates every curated example, while keeping one navigation entry per lesson. Regression tests compare all 44 current generated lessons across all six subjects against fingerprints of the complete original lesson states; further tests exercise alternative values and invalid data.

### Number and Ratio templates

`lessons/number.json` and `lessons/ratio.json` retain their existing lesson IDs. `examples/number.json` contains the 15 original Number examples, and `examples/ratio.json` contains the four original Ratio examples. Each uses `<lesson-id>-1`, just like Algebra. Add future curated values to the matching `examples` array and call `instantiateLesson(template, example)` when selecting one. The first curated example is still the default; no example picker or randomisation is enabled.

| Number template                              | Parameters and fixed teaching structure                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `brackets`                                   | `a × (b + c)`; addition inside brackets before multiplication                                             |
| `subtract-five`, `add-negative`              | `a − b` and `a + (−b)`; one leftward move per unit of `b`                                                 |
| `multiply-before-add`                        | `a + b × c`; multiplication before addition                                                               |
| `equivalent-halves`                          | `scale`; split each half equally, keeping the shaded amount at one half                                   |
| `fraction-amount`                            | `numerator`, `denominator`, `total`; proper fractions and whole-number equal groups                       |
| `percentage-amount`                          | `total`; 25% always means one quarter, with weighted cards representing each quarter                      |
| `add-sixths`                                 | `b`; add one fractional unit to `b` more, with a common denominator of `2 × (1 + b)`, then recognise half |
| `square-three`, `cube-two`, `square-root-25` | `base`; square/cube arrays and reversing a square array; squares/roots support 2–5, cubes 2–3             |
| `zero-power`                                 | `base`; divide down through powers 3, 2, 1, 0                                                             |
| `multiply-powers`                            | `base`; join three factors and two factors of the same base                                               |
| `prime-factors`                              | prime choices `p`, `q`; the fixed factor-tree structure is `p × q²`                                       |
| `place-value-ten`                            | positive digits `a`, `b` in ones and tenths; multiply by ten while the decimal point stays fixed          |

| Ratio template     | Parameters and fixed teaching structure                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `share-ratio`      | `a`, `b`, `total`; simplest `a:b`, at most five equal parts and whole-number shares            |
| `equivalent-ratio` | `a`, `b`; double both groups together                                                          |
| `simplify-ratio`   | `a`, `b`; use their greatest common divisor to make equal bundles and reach the simplest ratio |
| `unitary-cost`     | `items`, `cost`, `wanted`; divide to a whole-pound unit cost, then make equal copies           |

The permitted ranges in the JSON are deliberately small enough for readable diagrams. Number-line answers must stay between −5 and 5; fractional shares, excessive counters and invalid factor choices are rejected. Repetition generates the required move, row or layer count instead of reusing a sequence with the wrong number of steps. The default two-layer cube is unchanged, and the renderer/validator also support a curated three-layer cube.

### Geometry, Probability and Statistics templates

These subjects use `lessons/geometry.json`, `lessons/probability.json` and `lessons/statistics.json`, with matching files under `examples/`. They currently contain eight, four and five original examples respectively.

| Templates                                                | Parameters and fixed teaching structure                                                                                                                                |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `straight-line`, `angles-point`                          | Vary the first known `angle`; totals stay 180° or 360°, and the point lesson retains a known 90° angle.                                                                |
| `rectangle-area`, `rectangle-perimeter`, `triangle-area` | Small integer dimensions; area fills one complete row per step, perimeter follows all four sides, and triangle area halves a congruent rectangle.                      |
| `pythagoras-areas`                                       | Vary the two legs within the supported five-unit hypotenuse, including swapping 3 and 4; retain exact rigid unit-tile transfer.                                        |
| `pythagoras-hypotenuse`, `pythagoras-shorter`            | Curated whole-number right triangles; unknown lengths stay hidden until the positive square-root step.                                                                 |
| `equally-likely`, `complement`                           | Positive `blue` and `gold` counts; rebuild the bag, favourable outcomes, highlights and complementary fractions together.                                              |
| `probability-scale`                                      | Vary `blue` and `gold`, with blue more numerous; impossible/even/certain stay fixed, and the other two markers remain unlikely/likely.                                 |
| `coin-spinner-space`                                     | Three consecutive spinner labels beginning at `first`, and a selected `target` among them; retain a fair coin, three equal spinner sections and six combined outcomes. |
| `mean`                                                   | Three piles `mean − distance`, `mean`, `mean + distance`; move one stable counter at a time until all three match.                                                     |
| `median`                                                 | Five strictly ordered ranks `a < b < c < d < e`, shown initially in the same fixed unsorted pattern; sort and pair outside cards.                                      |
| `mode`                                                   | `low < mode < high`, with three copies of `mode`; keep one unambiguous most frequent value.                                                                            |
| `range`                                                  | Five strictly ordered ranks `min < b < c < d < max`, shown in a fixed mixed order; subtract minimum from maximum.                                                      |
| `read-bar-chart`                                         | Positive `cats`, `dogs` and `fish` counts up to six; retain the numbered axis, categories and Dogs reading sequence.                                                   |

These are fixed teaching templates rather than arbitrary datasets or expressions. Constraints reject non-integer triangle sides, tied ranks, out-of-range chart values and probability examples that contradict their classifications. Adding another simple curated example changes its values and required repeated steps, while preserving the lesson's structure.

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

### Diagram scenes

The existing manifest still registers exactly six subject files. New lessons reuse the same step engine, operation types, KaTeX terms and controls. They add `scene`, always with a meaningful `description` for the canvas's spoken equivalent and an optional `caption`.

| Kind                | Scene fields and visual behaviour                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `counter-groups`    | `groups: [{id, label, items, category?, summary?}]`. Items contain stable `id`, positive numeric `value`, `latex`, `spoken`, optional `tone`, `highlight`, `shape`, `category`. Counters move between groups, new copies fade in and selected quantities change fill/outline calmly. Maximum five groups; validation checks readable capacity. Blue/gold probability outcomes also carry B/G labels. |
| `angle-diagram`     | `total: 180 or 360`, `sectors: [{id, start, end, known, tone?}]`. Endpoints are angles in degrees; sectors must be contiguous and non-overlapping. SVG arcs use the actual angle, not an illustrative approximation. Final angles must fill the declared turn.                                                                                                                                       |
| `shape-grid`        | `shape: "rectangle" or "triangle"`, integer `width`, `height`, optional `grid`, `rows`, `sides`, `copy`. Rectangle cells are equal squares; complete rows shade in sequence. Perimeter highlights actual boundary edges. A congruent right triangle fills the other half of a rectangle without distortion.                                                                                          |
| `data-cards`        | `items: [{id, value}]`, `selected` and `muted` ID arrays. Sorting moves original cards without changing their values. Paired-off median cards are crossed out as well as dimmed. Selected values get a contrasting border and background.                                                                                                                                                            |
| `bar-chart`         | Three `categories: [{id, label, value}]`, `active` (null or a category ID), and boolean `guide`. Equally spaced, labelled axis ticks run from zero to six. A dashed guide connects the selected bar's height to its frequency.                                                                                                                                                                       |
| `probability-scale` | `probability` between zero and one. A stable marker moves along a proportionally spaced scale with impossible/likely/certain labels and stacked quarter/half fractions.                                                                                                                                                                                                                              |
| `tile-array`        | Integer `rows`, `columns`, `layers`, `visibleRows`, `visibleLayers`, boolean `edges`, nullable `highlightRow`. Equal tiles build rows/layers; the `model` checks the array matches `base`, `exponent`, `result`. The default cube example shows two separated 2D layers of unit cubes; the template also supports three layers.                                                                      |
| `power-pattern`     | Nonzero positive `base`, ordered `exponents`, `visible`. Reveal one more quotient at a time in the decreasing-exponent pattern; the final exponent is zero.                                                                                                                                                                                                                                          |
| `pythagoras`        | Exact integer `a`, `b`, `c`; `squares`, `knownSides`, `knownAreas` ID lists; boolean `unitTiles`, `transfer`. Outward square polygons are computed from the actual side vectors. Unit tiles retain IDs and move/rotate rigidly; unknown numeric labels remain hidden until calculated.                                                                                                               |
| `factor-tree`       | Factor `nodes: [{id, value, children}]`, `visible`, `selected`. Each split must multiply back to its parent; cycles, shared children and premature reveals are rejected. Final leaves must be prime.                                                                                                                                                                                                 |
| `place-value`       | `digits: [{id, digit, place}]`, `shift` zero or one. Digits move columns, while the decimal boundary remains fixed. Validation checks digit identities and the resulting numeric value.                                                                                                                                                                                                              |
| `outcome-grid`      | Two `rows`, three `columns`, `rowNames`/`columnNames` for spoken labels, integer `revealed`, `selected` pair IDs. Each reveal adds one distinct combined outcome. The fair, independent coin/spinner assumptions are stated.                                                                                                                                                                         |

New lessons may declare a `model` used for invariants and tests: `total` preserves counter value, `ratio` verifies the A/B relationship, and `values` preserves the data-card multiset. Additional numeric dimensions/results document worked examples and are checked in the tests. A counter card may represent one unit, one pound, or a labelled group of twenty: explanations and captions explicitly state its meaning. IDs describe mathematical objects, not their screen positions.

The animation layer extends its existing term transitions with `data-entity` wrappers for whole diagram objects. This moves a counter and its label together, preserves selected/crossed-out states, and animates fill/stroke changes. No functions, coordinates to execute, or arbitrary HTML are stored in JSON. The original balance and fraction renderers remain in use.

Supported operation types describe intent; each includes a complete destination state:

| Types                                     | Presentation                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| `show`, `highlight`                       | Show a state or emphasize existing terms                                |
| `apply-left`, `apply-right`, `apply-both` | Introduce matching inverse-operation terms; tilt or restore the balance |
| `cancel`                                  | Highlight the declared pair together, then fade it away                 |
| `simplify`, `replace`                     | Replace terms with their equivalent simplified form                     |
| `group`, `split`, `distribute`            | Reorganize stable tile identities or introduce equal copies             |
| `move`                                    | Move the number-line marker to its next declared position               |
| `partition`                               | Fade in new fraction dividing lines while preserving shaded area        |

The engine controls the index and locks transitions. The renderer reads the state; the animation layer decides how terms appear and move. Back restores the previous state immediately; Restart restores the initial state. Neither auto-plays the lesson. Adjust durations in `js/animations.js`.

### Add a lesson

1. Copy a similar available entry into its subject JSON; choose a globally unique ID.
   For any subject, copy a template under `data/lessons/` and add its curated values to the matching subject file under `data/examples/` instead of hard-coding a second complete lesson. Keep the lesson ID and example ID prefix aligned.
2. Fill in metadata, a verified curriculum reference, and one short tutor question.
3. Define a complete initial state and one conceptual operation per subsequent step. Reuse stable term/object IDs. For equations, supply matching affine state and a solution.
4. Run `npm test`, then step through the example in the browser with normal and reduced motion.
5. For unsupported visual concepts, add `{id, title, tier: "Foundation", subjectArea, available: false}` instead. Do not add a button until a renderer and meaningful transitions exist.

### Curriculum source policy

Each available lesson carries its own official reference and the UI displays that link and collapsed tutor notes. The current entries reference the verified AQA 8300 [Algebra](https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/specification/subject-content/3.2-algebra) and [Number](https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/specification/subject-content/3.1-number) sections: A17 for equations, A4 for manipulation, N1/N2 for signed arithmetic, N3 for operation order, and the Number section for fraction arithmetic. These topics are included in the specification's Foundation content, and are not exclusive to Foundation. URLs and mappings checked on 17 October 2026.

The new lessons also reference verified AQA subject pages: [Ratio, proportion and rates of change](https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/specification/subject-content/3.3-ratio-proportion-and-rates-of-change) (R4, R5, R11); [Geometry and measures](https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/specification/subject-content/3.4-geometry-and-measures) (G3, G16, G17); [Probability](https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/specification/subject-content/3.5-probability) (P2, P3, P4, P7); [Statistics](https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/specification/subject-content/3.6-statistics) (S2, S4). Fraction operators use N12 and adding sixths uses N2. Rectangle area intentionally carries a general Geometry subject reference rather than an inferred granular code. The tutor can check this general mapping; the other listed codes were checked against the official pages on 17 October 2026. AQA codes are not presented as universal exam-board codes.

The gap-analysis batch adds N6/N7 for powers and roots, A4 for same-base index products, G6/G20 for Pythagoras, N4 for prime decomposition, N2 for place value, A2 for substitution, and P6/P7 for sample spaces. Both AQA Foundation columns are included: integer indices and 2D right-triangle Pythagoras/trigonometry are not Higher-only. The audit cross-checks the [DfE subject-content publication](https://www.gov.uk/government/publications/gcse-mathematics-subject-content-and-assessment-objectives) and records excluded Higher extensions separately.

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

Baseline for the gap-analysis batch: **25 tests passed**. Current suite: **60 tests passed**, adding array/exponent arithmetic, prerequisites, exact attached-square geometry, unit-tile conservation, unrevealed unknowns, prime leaves, digit identities and combined-outcome enumeration. Template tests additionally preserve all 44 original example states across the six subjects and cover alternative values, grouping, invalid parameters, example identities, file caching and loading isolation. The earlier ratio, angle, area, probability, statistics, notation and balance checks remain. The UI navigation test visits all 44 available lessons, including Back/Restart, step bounds and rapid taps.

Headless Edge checks use 768×1024, 1024×768, 1180×820 and 390×844: no horizontal overflow and controls at least 56px. All **44 lesson sequences (145 forward transitions)** run at each main iPad orientation, including Back/Restart, rapid taps, fixed control positions within each lesson, notation bounds and plate clearance. Normal-motion tests exercise the original balance/cancellation and new diagram primitives; reduced-motion tests keep state changes instant. The Pythagoras transfer additionally checks 25 stable IDs and final rotation anchors. Fallback fullscreen and runtime-error checks are included. All 36 alternate non-Algebra templates are additionally rendered at both iPad orientations and checked for diagram-label bounds and page overflow. Representative diagrams have screenshots under ignored `temp`. These desktop browser checks do not replace iPad Safari and VoiceOver testing.

To repeat browser checks, start `npm start`, then launch a separate headless Edge/Chromium instance with `--remote-debugging-port=9223` and a dedicated `--user-data-dir` (for example, under ignored `temp`). Run `node scripts/browser-check.mjs`. It uses Node's built-in WebSocket, saves viewport screenshots under `temp`, and closes that dedicated browser when finished. No browser package is installed. Set `MATHS_TEST_URL` if your server uses another port. The checks also measure KaTeX bounds and plate clearance at iPad sizes. Native OS fullscreen can stall in headless Windows, so supported-API behaviour is unit tested and native browser entry/exit remains a physical-device check; the browser suite checks both fallback paths.

On an iPad:

1. In portrait, open the menu, expand each area and select a lesson. Check the drawer closes and equations are legible. Rotate to landscape and check the sidebar and navigation controls.
2. Run both original equations through all five steps. Check ≠ and tilt only during one-sided operations, matched purple terms, cancellation and the explanation of −1.
3. Try square/cube arrays, square roots, the zero-power pattern, all three Pythagoras lessons, decimal place value and the sample-space grid. Check that the 25 area tiles settle into the correct square, the decimal point stays fixed, and each step pauses. Tap Next rapidly, then Back and Restart. Recheck a ratio and a statistics lesson too.
4. Enter and exit full screen; try the in-page fallback if native full screen is unavailable. The exit button must stay obvious.
5. Enable Reduce Motion; check instant state changes. Use a keyboard and VoiceOver to check focus and announcements. Open tutor notes and the official reference.

Known limits: this is a focused 44-lesson selection, not complete GCSE coverage; see the audit for the remaining gaps. Pythagoras calculations currently use integer-root examples; the theorem is not restricted to integer lengths. The 3–4–5 picture is an illustration, not a general proof. The triangle-area example uses a right triangle; it does not establish all triangle formulas visually. Median uses an odd-sized data set; mode has a single unambiguous answer. Charts/grids are bounded to small worked examples. New renderer types require code. Phone layouts are less spacious than the primary iPad target. Native fullscreen, touch behaviour and VoiceOver still need physical iPad verification. The local server binds to loopback.

## GitHub Pages

No backend or build is required. All source and fetch paths are relative and support repository subpaths.

- For simple branch hosting, choose your branch and `/ (root)` in Settings → Pages, then open `https://<user>.github.io/<repository>/src/`.
- To publish at the project root, use GitHub Pages Actions and upload **`src`** as the Pages artifact. Pages branch hosting cannot select an arbitrary `src` directory.

The development server, tests and ignored `temp` directory do not belong in the Pages artifact. This change does not deploy the site.
