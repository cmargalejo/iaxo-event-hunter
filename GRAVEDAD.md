# Gravedad oculta

[Play online](https://cmargalejo.github.io/iaxo-event-hunter/gravedad-oculta.html) · [Choose a game](https://cmargalejo.github.io/iaxo-event-hunter/juegos.html)

A Spanish gravity puzzle: launch probes, infer the location of invisible masses from their trajectories, place markers, then reveal the answer. Three sectors introduce one hidden mass, a wider search area and finally two masses. Each new map randomizes positions and strengths. No timer, lives or shot limit.

## Controls

- Drag anywhere on the map to aim from the selected launch point, then release to launch. A tap adjusts the aim without launching. The dashed line shows only the initial direction.
- Use the left, bottom or right launch point to view the same mass from different directions. Direction and power sliders and a launch button provide an alternative to dragging.
- After launching a probe, choose **Marcar masa** (or **Marcar masas**), tap to place markers, and drag to adjust them. **Comprobar** reveals the masses after all probes have finished.
- Keyboard: focus the map; arrows adjust direction/power in launch mode and Space launches. In marker mode, arrows move a crosshair and Enter places a marker; Shift makes smaller movements.
- **Limpiar rastros** removes trails without resetting the launch count. Up to 12 trails remain visible and three probes can fly together. Retry creates a fresh map so the revealed answer cannot be reused.
- Sound is off by default. Reduced-motion mode draws complete trails immediately. The best completed expedition is stored on the device when local storage is available.

## Model and scoring

`assets/gravity-core.js` contains deterministic mechanics; `assets/gravity-game.js` handles the interface. Probes move in a plane under softened inverse-square gravity, integrated with velocity Verlet at 1/120 simulated second. The softening radius is 65 map units and trajectories run for up to eight simulated seconds or until leaving the board. This is a qualitative puzzle, not a model of a real spacecraft mission or a particle detection experiment. No hidden positions influence visual elements before the reveal, apart from the probes' paths.

Markers within 65 map units of each mass earn three stars with at most four launches, or two stars with more launches. Maximum error up to 130 earns two stars, up to 200 earns one, otherwise zero. Two-mass answers are matched without depending on marker order. Stars are game rewards, not measurement uncertainties or scientific significance.

## Checks

Install development dependencies with `npm install`, then run `npm run test:gravity`. The physics checks run in Node; browser checks need Playwright's Chromium (`npx playwright install chromium`).

The checks cover gravitational deflection, energy stability, random-map constraints, matching and scoring; mouse, touch and keyboard controls; all three sectors, retries, storage, reduced motion and animated probes; mobile layouts and the shared game chooser. Browser screenshots are written to `/tmp/gravity-puzzle-preview/`.
