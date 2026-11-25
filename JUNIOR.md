# TREX-DM Junior: Detectives de lo invisible

Open `trex-dm-junior.html` in a browser. It is a separate, self-contained Spanish activity for ages 7–11, designed for roughly five minutes with an optional adult helper. It works offline and needs no build, account, external assets or server.

The junior page links to the original `index.html` (IAXO) and `trex-dm.html` (TREX-DM). [Play TREX-DM Junior online](https://cmargalejo.github.io/iaxo-event-hunter/trex-dm-junior.html).

## Mission

1. Move the detector beneath the mountain with a slider, arrow keys, or a button. The mountain reduces many cosmic-ray tracks; other backgrounds remain.
2. Compare a compact signal with a long track.
3. Sort six randomized, simplified illustrations by dragging each trace to **Guardar** or **Apartar** with a mouse or finger. The same buttons work by tap or keyboard. Dropping elsewhere or cancelling a drag leaves the clue undecided. Each round changes the drawings, order and number of compact signals (two to four). Feedback explains that other particles can leave similar traces, without assigning a known particle identity to a single trace. Drawings remain identical when revisited in the notebook.
4. Review saved and set-aside clues in separate green and blue panels, with distinct headings, borders, spacing, counts and empty states. Panels sit side by side on desktop and stack on mobile. Children can move clues between groups. Before comparing counts, the game helps them correct selections so the saved count and expectation use the same compact-shape rule.
5. Compare the saved count with a fixed illustrative expectation of **3 compact traces on average without a dark-matter signal**, for the same observation time and selection. This expectation is set independently of the player's observations and decisions; it is not a second simulated sample. Counts and circles appear immediately, without extra clicks. Each round contains two, three or four compact traces, giving fewer, equal or more than expected. Child-facing text avoids the technical term **fondo** and explains that other particles can leave similar traces, that counts can fluctuate around the expectation, and that these few clues cannot establish or exclude a dark-matter signal. An expandable explanation identifies the expected value as an invented teaching example, not TREX-DM data.
6. Complete the investigation by choosing to collect more evidence. Restart clears the notebook and mountain state, generates new drawings and changes both the compact-signal count and comparison outcome from the previous round within the session.

This is an educational shape and counting exercise, not a simulation of detector performance or an analysis of real events. The expected value and the two-to-four observed counts are invented teaching cases, not a Poisson simulation, a prediction for TREX-DM or a significance calculation. The illustrations do not encode real event rates, efficiencies, energies, or discovery statistics. The full activities remain available for deeper exploration. A junior IAXO mission is not yet included.

## Verification

With the project's Playwright dependency and browser installed:

```sh
node tests/junior.cjs
```

To use an installed Google Chrome instead of Playwright's bundled Chromium, set `JUNIOR_BROWSER_CHANNEL=chrome`. Optionally set `JUNIOR_SCREENSHOTS` to an existing directory to save preview images.

The junior checks cover nine seeded rounds at 1280px, 390px and 320px, real mouse/touch dragging, cancelled and missed drops, keyboard/tap alternatives, immediate totals and non-interactive circles, direct comparison, a fixed expectation across rounds and decisions, stable counts on return, keyboard mountain control, all six clues, separated notebook groups, zero/all accepted clues, moving clues, stable drawings, selection review, all three comparison outcomes, wrong-answer feedback, replay resets, original links, layout overflow and JavaScript errors. Existing adult-game checks remain in `tests/game.cjs` and `tests/trex.cjs`.
