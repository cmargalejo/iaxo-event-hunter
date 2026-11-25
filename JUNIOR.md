# TREX-DM Junior: Detectives de lo invisible

Open `trex-dm-junior.html` in a browser. It is a separate, self-contained Spanish activity for ages 7–11, designed for roughly five minutes with an optional adult helper. It works offline and needs no build, account, external assets or server.

The junior page links to the original `index.html` (IAXO) and `trex-dm.html` (TREX-DM). [Play TREX-DM Junior online](https://cmargalejo.github.io/iaxo-event-hunter/trex-dm-junior.html).

## Mission

1. Move the detector beneath the mountain with a slider, arrow keys, or a button. The mountain reduces many cosmic-ray tracks; other backgrounds remain.
2. Compare a compact signal with a long track.
3. Sort six randomized, simplified illustrations by dragging each trace to **Guardar** or **Apartar** with a mouse or finger. The same buttons work by tap or keyboard. Dropping elsewhere or cancelling a drag leaves the clue undecided. Each round changes the drawings, order and number of compact signals (two to four). Feedback explains that other particles can leave similar traces, without assigning a known particle identity to a single trace. Drawings remain identical when revisited in the notebook.
4. Review separate accepted/rejected notebook groups, each with its own count and empty state. Children can move clues between groups. Before comparing samples, the game helps them correct selections so both samples use the same compact-shape rule.
5. Tap or keyboard-activate each clue token to count it, then compare with an invented example round containing only other particles and representing equal observation time. Tokens show their counting order; repeated taps cannot count a clue twice. Comparison choices unlock once both groups are counted, including a possible empty example group. Counts and counted tokens stay fixed when revisiting the notebook. The example count can be lower, equal or higher. Child-facing text uses **otras partículas**, without the technical term **fondo**, and explains that these few clues cannot establish whether dark matter is present.
6. Complete the investigation by choosing to collect more evidence. Restart clears the notebook and mountain state, generates new drawings and changes both the compact-signal count and comparison outcome from the previous round within the session.

This is an educational shape and counting exercise, not a simulation of detector performance or an analysis of real events. Background counts and outcomes are invented teaching cases, not samples from a physical model or significance calculations. The illustrations do not encode real event rates, efficiencies, energies, or discovery statistics. The full activities remain available for deeper exploration. A junior IAXO mission is not yet included.

## Verification

With the project's Playwright dependency and browser installed:

```sh
node tests/junior.cjs
```

To use an installed Google Chrome instead of Playwright's bundled Chromium, set `JUNIOR_BROWSER_CHANNEL=chrome`. Optionally set `JUNIOR_SCREENSHOTS` to an existing directory to save preview images.

The junior checks cover nine seeded rounds at 1280px, 390px and 320px, real mouse/touch dragging, cancelled and missed drops, keyboard/tap alternatives, interactive counting, double-count protection, comparison gating, stable counters on return, keyboard mountain control, all six clues, separated notebook groups, zero/all accepted clues, moving clues, stable drawings, selection review, all three comparison outcomes, wrong-answer feedback, replay resets, original links, layout overflow and JavaScript errors. Existing adult-game checks remain in `tests/game.cjs` and `tests/trex.cjs`.
