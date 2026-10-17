# Maths Lab — Foundation GCSE

[![Open live demo](https://img.shields.io/badge/Open-Live_Demo-4f7c82?style=for-the-badge)](https://oliverius.github.io/gcse-maths/)

A static visual maths tutor for a student who needs a calm pace, large controls and explicit mathematical reasoning. Each Next tap performs one step, then stops. The original balance lessons and highlighted new terms are preserved. KaTeX and its fonts are bundled locally; there are no accounts, CDN dependencies or build steps.

## Run locally

Requires Node 24+ for the development server and tests:

```sh
npm start
```

Open **http://localhost:5500/**. The existing VS Code **Start local server** task runs the same root `server.js`. This file is development tooling, so it stays outside `src`; it now uses ES modules and serves only `src`. Set `PORT` to use a different port. Any HTTP static server serving `src` also works.

Use HTTP rather than `file://`: the app fetches JSON and imports ES modules. Once served locally, core functionality needs no internet connection; the curriculum reference links need internet access. There is no service worker or offline installation feature.

See the [technical guide](docs/technical-guide.md) for development, architecture, lesson authoring, testing and deployment. The [Foundation curriculum audit](docs/foundation-curriculum-audit.md) covers curriculum coverage, gaps and prerequisites.

## Curriculum source policy

Each available lesson carries its own official reference and the UI displays that link and collapsed tutor notes. The current entries reference the verified AQA 8300 [Algebra](https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/specification/subject-content/3.2-algebra) and [Number](https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/specification/subject-content/3.1-number) sections: A17 for equations, A4 for manipulation, N1/N2 for signed arithmetic, N3 for operation order, and the Number section for fraction arithmetic. These topics are included in the specification's Foundation content, and are not exclusive to Foundation. URLs and mappings checked on 17 October 2026.

The new lessons also reference verified AQA subject pages: [Ratio, proportion and rates of change](https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/specification/subject-content/3.3-ratio-proportion-and-rates-of-change) (R4, R5, R11); [Geometry and measures](https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/specification/subject-content/3.4-geometry-and-measures) (G3, G16, G17); [Probability](https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/specification/subject-content/3.5-probability) (P2, P3, P4, P7); [Statistics](https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/specification/subject-content/3.6-statistics) (S2, S4). Fraction operators use N12 and adding sixths uses N2. Rectangle area intentionally carries a general Geometry subject reference rather than an inferred granular code. The tutor can check this general mapping; the other listed codes were checked against the official pages on 17 October 2026. AQA codes are not presented as universal exam-board codes.

The gap-analysis batch adds N6/N7 for powers and roots, A4 for same-base index products, G6/G20 for Pythagoras, N4 for prime decomposition, N2 for place value, A2 for substitution, and P6/P7 for sample spaces. Both AQA Foundation columns are included: integer indices and 2D right-triangle Pythagoras/trigonometry are not Higher-only. The audit cross-checks the [DfE subject-content publication](https://www.gov.uk/government/publications/gcse-mathematics-subject-content-and-assessment-objectives) and records excluded Higher extensions separately.

Verify any new topic mapping before adding a granular code. If only a high-level official source is verified, omit the code; do not invent one. Planned entries have no fabricated references.
