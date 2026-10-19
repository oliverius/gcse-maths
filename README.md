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

The lesson library has six curriculum areas plus **Combined skills** for multi-step problems. Jessica's earnings, tax and savings problem is in Combined skills, with the skills it uses and shortcuts to introductory lessons.

## Curriculum source policy

Each available lesson carries an official Pearson Edexcel GCSE Mathematics **1MA1** reference, displayed alongside collapsed tutor notes. All 44 original lessons retain their worked examples. Additions bring coverage to 65 lessons, including coordinates, graph plotting and arithmetic sequences. Links open the relevant Foundation subject section in the [official specification](https://qualifications.pearson.com/content/dam/pdf/GCSE/mathematics/2015/specification-and-sample-assesment/gcse-maths-2015-specification.pdf): Number (PDF page 17), Algebra (18), Ratio, proportion and rates of change (20), Geometry and measures (21), and Probability and Statistics (23). PDF page numbers include the cover pages; a viewer that ignores page anchors will open the full specification.

The existing lesson codes (such as A17 for linear equations and G20 for Pythagoras) were checked against Pearson's Foundation section on 19 October 2026. These references describe the bounded concept taught, rather than claiming complete coverage of each code. Rectangle area retains a general subject reference. The [Foundation curriculum audit](docs/foundation-curriculum-audit.md) records remaining gaps and cross-checks the national DfE framework.

Verify any new topic mapping before adding a granular code. If only a high-level official source is verified, omit the code; do not invent one. Planned entries have no fabricated references.
