# TREX-DM Junior: Detectives de lo invisible

Open `trex-dm-junior.html` in a browser. It is a separate, self-contained Spanish activity for ages 7–11, designed for roughly five minutes with an optional adult helper. It works offline and needs no build, account, external assets or server.

The original `index.html` (IAXO) and `trex-dm.html` (TREX-DM) remain unchanged. The junior page links to both originals. Its direct URL on the same hosting would be `/trex-dm-junior.html`. No deployment or GitHub push is included in this local change.

## Mission

1. Move the detector beneath the mountain with a slider, arrow keys, or a button. The mountain reduces many cosmic-ray tracks; other backgrounds remain.
2. Compare a compact signal with a long track.
3. Review six randomized, simplified illustrations. Each round changes the drawings, order and number of compact signals (two to four). Compact signals introduce neutron backgrounds without assigning a known particle identity to a single trace. Drawings remain identical when revisited in the notebook.
4. Review separate accepted/rejected notebook groups, each with its own count and empty state. Children can move clues between groups. Before comparing samples, the game helps them correct selections so both samples use the same compact-shape rule.
5. Compare the accepted count with a fictitious background-only sample representing equal observation time. Dot counters support counting. The control count can be lower, equal or higher, and stays fixed when revisiting the notebook. The game explains that this small count comparison cannot establish a discovery or rule out WIMPs.
6. Complete the investigation by choosing to collect more evidence. Restart clears the notebook and mountain state, generates new drawings and changes both the compact-signal count and comparison outcome from the previous round within the session.

This is an educational shape and counting exercise, not a simulation of detector performance or an analysis of real events. Background counts and outcomes are invented teaching cases, not samples from a physical model or significance calculations. The illustrations do not encode real event rates, efficiencies, energies, or discovery statistics. The full activities remain available for deeper exploration. A junior IAXO mission is not yet included.

## Verification

With the project's Playwright dependency and browser installed:

```sh
node tests/junior.cjs
```

To use an installed Google Chrome instead of Playwright's bundled Chromium, set `JUNIOR_BROWSER_CHANNEL=chrome`. Optionally set `JUNIOR_SCREENSHOTS` to an existing directory to save preview images.

The junior checks cover nine seeded rounds at 1280px, 390px and 320px, keyboard mountain control, all six clues, repeated-input protection, separated notebook groups, zero/all accepted clues, moving clues, stable drawings, selection review, all three comparison outcomes, wrong-answer feedback, stable control samples, replay variation, original links, layout overflow and JavaScript errors. Existing adult-game checks remain in `tests/game.cjs` and `tests/trex.cjs`.
