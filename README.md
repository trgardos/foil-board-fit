# Foil Trim, Stance & Track Fit

An interactive, single-page tool for working out where you should stand on a
wing-foil board — and whether a candidate board's mast track is long enough and
positioned right to let you stand there.

It's a side-view **statics** model. Drag a slider or the "you" handle and every
force, guide line, and readout updates live. No build step, no dependencies —
just open the HTML file.

**Live site:** https://trgardos.github.io/foil-board-fit/

## The idea

For a foil to fly level, your combined centre of gravity (you + board) has to
sit over the foil's **net centre of lift**. If it doesn't, the board pitches
nose-up or nose-down. Your feet live on the deck pad, but the foil slides in the
mast track, which moves the lift point around under you. So the board-shopping
question becomes:

> With the mast somewhere in this board's track, does my balanced stance land on
> the footpad?

The tool answers that. It computes the balanced stance, checks whether it falls
on the pad, and works out the mast position that would centre your stance on the
pad — then flags whether that position is actually reachable within the track.

## The model

Working forward of the mast base (forward = `+`), the **net centre of lift** is

```
u_CL = a + f·L
```

where `a` is the front wing's lift point ahead of the mast, `L` is the fuselage
length (front wing → stabilizer), and `f` is the stabilizer download as a
fraction of total weight. Placing the combined CG there and solving for your
stance centre:

```
r* = ( W·(a + f·L) − W_board·b ) / W_you
```

with `b` the board's CG distance ahead of the mast and `W = W_you + W_board`.
`r*` is nearly a constant of your foil — the board term is small.

**Track fit.** Your feet are fixed on the pad; the mast slides in the track. The
mast position that would centre your stance on the pad is

```
mast = padCentre − r*
```

and the tool flags whether that falls inside the track's range.

### Does speed matter?

For fore–aft balance, barely. In steady flight the foil always makes lift equal
to your weight — going faster just lowers the angle of attack, it doesn't add
lift, so the force magnitudes don't change. The one real trim effect is that a
lower angle of attack lets the front wing's **centre of pressure drift aft**, so
the effective offset shrinks a little at speed and the balance point creeps back.
That's modelled as

```
a_eff = a − copTravel·(1 − (Vref/V)²)
```

where `(Vref/V)²` tracks the lift-coefficient ratio. It's ratio-based, so any
consistent speed unit works. Set **CoP travel** to `0` for pure statics.

## Inputs

Lengths can be shown in **cm** or **ft / in**, speed in **km/h**, **mph**, or
**knots**, and weight in **kg** or **lb**, via the Units selector at the top.
It's a display choice only — the model works in metres and kilograms internally
and the numbers are unaffected. The choice is remembered between visits.

- **Board & track** — board name, board length, board CG, footpad centre and
  length, mast track length, and the setback from the tail to the aft end of the
  track. Slide the mast base along the track.
- **Forces & foil geometry** — foil name, front-wing lift point ahead of the
  mast, stabilizer download, fuselage length, rider + gear weight, board weight.
- **Speed & angle of attack** — board speed, reference (trim) speed, and CoP
  travel.
- **Calibrate to reality** — measure, on your current board, from the mast base
  to the centre of your normal stance, and match the model's stabilizer download
  to it.

## Readouts

- **Trim result** — balanced stance forward of the mast, your current stance,
  pitch tendency (nose up / level / nose down), CG offset from the lift line, and
  net pitch moment.
- **Board fit** — balanced stance from the tail, the footpad zone, whether the
  balanced stance lands on the pad, the mast position needed to centre it, and
  whether that's reachable within the track.

## Running it

Open [`index.html`](index.html) in any modern browser, or visit the
[live site](https://trgardos.github.io/foil-board-fit/). That's it.

## Files

- [`index.html`](index.html) — page markup (the site root for GitHub Pages)
- [`styles.css`](styles.css) — styling
- [`app.js`](app.js) — the model, SVG rendering, and interaction
- [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) — GitHub Pages deploy workflow

## Caveats

This is a static free-body model for intuition and board shopping, not a
simulator. It ignores dynamic pitch stability, ride height, downwash between the
wings, and wing-specific aerodynamics. The drawn tilt is capped at 13° for
legibility — the honest number is the CG-offset readout. Numbers are only as good
as the geometry you measure and the calibration you feed it.
