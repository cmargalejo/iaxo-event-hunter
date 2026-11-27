# Gravedad oculta

[Play online](https://cmargalejo.github.io/iaxo-event-hunter/gravedad-oculta.html) · [Choose a game](https://cmargalejo.github.io/iaxo-event-hunter/juegos.html)

A Spanish gravity puzzle: launch probes, infer the location and amount of invisible masses from their trajectories, place markers, then reveal the answer. Three sectors introduce one hidden mass, a wider search area and finally two masses of different strengths. Each new map randomizes positions and strengths. No timer, lives or shot limit.

## Controls

- Drag anywhere on the map to aim from the selected launch point, then release to launch. A tap adjusts the aim without launching. The dashed line shows only the initial direction.
- Tap a map arrow to select the left, bottom or right launch point without firing or changing power. Drag from an arrow to select it, aim and launch in one gesture. The buttons below the map remain available for keyboard access. Selecting an arrow in marker mode returns to launch mode while preserving all guesses.
- After launching a probe, choose **Marcar masa** (or **Marcar masas**), tap to place markers, and drag to adjust them. Choose **Poca**, **Media** or **Mucha** mass independently for each numbered marker. Moving a marker preserves its estimate. **Comprobar** requires every estimate and reveals the masses after all probes have finished.
- **Probar mi idea** overlays dashed orange predictions using the guessed positions and masses with the exact launch points, directions and powers of the retained probes. It never uses the hidden masses or reveals the solution, and does not consume shots. Adjusting a marker or its mass updates the predictions. Clearing marks, clearing trails or returning to launch mode clears the overlay.
- Keyboard: focus the map; arrows adjust direction/power in launch mode and Space launches. In marker mode, arrows move a crosshair and Enter places a marker; Shift makes smaller movements.
- **Limpiar rastros** removes trails without resetting the launch count. Up to 12 trails remain visible and three probes can fly together. Retry creates a fresh map so the revealed answer cannot be reused.
- Sound is off by default. Reduced-motion mode draws complete trails immediately. The best completed expedition is stored on the device when local storage is available, with a separate key for this version that also scores mass estimates.

## Model and scoring

`assets/gravity-core.js` contains deterministic mechanics; `assets/gravity-game.js` handles the interface. Probes move in a plane under softened inverse-square gravity, integrated with velocity Verlet at 1/120 simulated second. The softening radius is 65 map units and trajectories run for up to eight simulated seconds or until leaving the board. This is a qualitative puzzle, not a model of a real spacecraft mission or a particle detection experiment. No hidden positions influence visual elements before the reveal, apart from the probes' paths.

The three mass categories have gravitational parameters of 1.8, 3.6 and 7.2 million map units, in a 1:2:4 ratio, with the same softening radius. At a fixed location, acceleration scales directly with mass. The game explains that distance and probe speed also affect curvature; the hypothesis overlay holds the launch conditions fixed so players can compare like with like. These are game categories, not physical units or measured dark-matter masses. The two-mass sector always uses different categories.

With all mass categories correct, markers within 65 map units of each mass earn three stars with at most four launches, or two stars with more launches. Maximum error up to 130 earns two stars, up to 200 earns one, otherwise zero. Any incorrect mass category subtracts one star, down to zero. Two-mass answers are paired by location without depending on marker order, then each quantity is checked against its paired mass. The reveal reports position and quantity separately for each marker. Stars are game rewards, not measurement uncertainties or scientific significance.

## Checks

Install development dependencies with `npm install`, then run `npm run test:gravity`. The physics checks run in Node; browser checks need Playwright's Chromium (`npx playwright install chromium`).

The checks cover gravitational deflection, energy stability, random-map constraints, mass-dependent attraction, hypothesis predictions, matching and scoring; mouse, touch and keyboard controls, including direct map-arrow selection; all three sectors, retries, storage, reduced motion and animated probes; mobile layouts and the shared game chooser. Browser screenshots are written to `/tmp/gravity-puzzle-preview/`.
