# CLAUDE.md

Guidance for working in this repo.

## What this is

**Foil Trim, Stance & Track Fit** — an interactive, single-page side-view
*statics* tool for wing-foiling. It computes the balanced fore–aft stance for a
rider + board over a foil, checks whether that stance lands on the board's
footpad, and works out the mast-track position that would centre it. Live site:
https://trgardos.github.io/foil-board-fit/

## Golden rule: no build step, no dependencies

This is deliberately a **zero-dependency static site** — three files you can open
directly in a browser. There is no `package.json`, no bundler, no framework, no
`node_modules`. **Keep it that way** unless the user explicitly asks to add
tooling. Don't introduce npm packages, a build step, or a framework casually.

## Files

- `index.html` — page markup; the site root for GitHub Pages. Holds the control
  inputs (sliders/text) and the readout elements that `app.js` writes into.
- `styles.css` — all styling (CSS custom properties drive the SVG colours).
- `app.js` — the physics model, SVG scene rendering, and interaction. This is
  the brain; everything below lives here.
- `.github/workflows/deploy-pages.yml` — deploys the repo root as-is to GitHub
  Pages on every push to `main`.

## How `app.js` is organized

- `S` — the single mutable state object (geometry, weights, speeds, positions).
  All units are **metres** internally; the UI shows centimetres.
- `derive()` — the core model. Computes net centre of lift `u_CL = a_eff + f·L`,
  the balanced stance `u_r_star`, its position from the tail `X_r_star`, and the
  mast position needed to centre the stance on the pad. Pure-ish (reads `S`).
- `effA()` — speed correction: front-wing centre of pressure drifts aft as speed
  rises (`a_eff = a − copTravel·(1 − (Vref/V)²)`). Set `copTravel = 0` for pure
  statics.
- `render()` — recomputes, builds the SVG string, writes it into `#scene`, and
  updates all the text readouts. Called on every input/drag.
- `computeMap()`/`px`/`inv` — map the physical "u-frame" (metres forward of the
  mast base) to/from pixel X.
- Event wiring at the bottom: `fmtSlider(...)` for each slider, the rider drag
  handle, track-length handlers, name fields, and the snap/reset/calibrate
  buttons. `recomputeTrack`, `updateMastBounds`, `updateNames`, and `render` run
  once at load.

When you change a control, make sure the matching `id` exists in `index.html`,
the readout `id` (usually `v-<id>` or `ro-<name>`) exists, and `render()`/the
handler updates it. The model math and the README's equations must stay in sync.

## Running / previewing

Just open `index.html` in a browser. In a headless/cloud session, serve it:

```
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Checks

There is no test suite or linter (by design — no dependencies). The one cheap,
dependency-free sanity check is a JS syntax check using the Node that's already
present:

```
node --check app.js
```

The SessionStart hook (`.claude/hooks/session-start.sh`) runs this automatically.

## Conventions

- Match the existing terse, dependency-free style in `app.js` (template-literal
  SVG, short helpers, compact handlers).
- Keep internal units in metres; convert at the UI boundary.
- If you touch the model, update the corresponding equations/prose in
  `README.md`.
