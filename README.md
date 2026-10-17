# Visual maths tutor

A buildless, accessible GCSE maths prototype with three predefined lessons. Use the large lesson buttons, then Next to advance one step. Back restores the preceding state; Replay returns to the start. There is no autoplay.

## Run locally

Serve the src directory with any static HTTP server (ES modules require HTTP). From the repository root, with Node installed:

```sh
npx --yes http-server src -p 8080
```

Open http://localhost:8080. No installation or build is required for hosting. Run lightweight automated checks with `npm test` (Node 24+).

## GitHub Pages

Push the files to GitHub. In repository Settings â†’ Pages, select **Deploy from a branch**, choose your branch and **/ (root)**, and save. All asset paths are relative, so repository subpaths work. Open the published site at /src/. To serve the app at the site root instead, use a Pages Actions workflow that uploads src as its Pages artifact. No backend is required.

## Structure

- `src/js/lessons.js`: declarative mathematical states, stable term IDs, explanations and cancellation pairs. Add new examples here.
- `src/js/balance.js`: SVG plates above the beam; terms never overlap support lines. Tilt is conceptual and does not assume a value for x.
- `src/js/animations.js`: calm term transitions, cancellation and beam movement. Adjust `timing` to change durations. Reduced motion skips animations.
- `src/js/app.js`: guarded navigation and accessible status updates.

## Manual acceptance checks

For each lesson, advance through all five steps, go Back, and Replay. Confirm a single Next click never advances more than one step; rapidly clicking during animation must not advance again. Equation beams tilt only at step 2, where â‰  is shown, and level at step 3. Cancellation highlights both opposite terms before fading. The second equation explains why the answer is negative. Brackets use no balance and evaluate before multiplication.

Check keyboard focus, all controls on an iPad viewport, and screen-reader announcements. Enable your operating system's reduced-motion preference and repeat: states should update without movement. Automated tests cover lesson data and mathematical states; browser and assistive-technology checks should also be performed before classroom use.

