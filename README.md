# Physics games · IAXO, TREX-DM & gravity

Educational games in Spanish about searching for axions and dark matter.

## One QR to choose a game

**[Open the game selection page](https://cmargalejo.github.io/iaxo-event-hunter/juegos.html)** — short Spanish descriptions help visitors choose between the invisible-mass puzzle, IAXO, TREX-DM and the simpler Junior activity for ages 7–11.

[<img src="docs/qr-codes/todos-los-juegos.png" alt="QR code to choose a game" width="200" height="200">](https://cmargalejo.github.io/iaxo-event-hunter/juegos.html)

**[Download the main A4 poster](docs/qr-codes/todos-los-juegos-a4.pdf)** · [Download the high-resolution QR image](docs/qr-codes/todos-los-juegos.png)

Use this single QR on general activity posters or at the entrance. Use the individual game QRs below at stations dedicated to a particular game. Print the PDF in **A4, portrait, actual size (100%)** and keep the white margin around the QR.

## Play the games

**Click a link or scan a QR code with your phone to play directly in your browser. No download, installation or account is needed.**

| Game | Play online | QR code | What you will do |
| --- | --- | --- | --- |
| **Sondas y gravedad** | **[Play Sondas y gravedad](https://cmargalejo.github.io/iaxo-event-hunter/gravedad-oculta.html)** | [Use the main QR](docs/qr-codes/todos-los-juegos.png) | Launch probes, locate hidden masses and estimate their strength. Compare with known masses of 1, 2 and 4 game units, then test your hypothesis against the observed trails. |
| **IAXO Event Hunter** | **[Play IAXO Event Hunter](https://cmargalejo.github.io/iaxo-event-hunter/)** | [<img src="docs/qr-codes/iaxo-event-hunter.png" alt="QR code for IAXO Event Hunter" width="160" height="160">](https://cmargalejo.github.io/iaxo-event-hunter/) | Identify events that look like X-rays, select candidates by position and explore whether they could be explained by background. |
| **TREX-DM · Cazadores de WIMPs** | **[Play TREX-DM](https://cmargalejo.github.io/iaxo-event-hunter/trex-dm.html)** | [<img src="docs/qr-codes/trex-dm.png" alt="QR code for TREX-DM" width="160" height="160">](https://cmargalejo.github.io/iaxo-event-hunter/trex-dm.html) | Learn how a gas detector works, classify event traces and interpret possible dark-matter candidates. |
| **Detectives de partículas · TREX-DM Junior** | **[Play Detectives de partículas](https://cmargalejo.github.io/iaxo-event-hunter/trex-dm-junior.html)** | [<img src="docs/qr-codes/trex-dm-junior.png" alt="QR code for TREX-DM Junior" width="160" height="160">](https://cmargalejo.github.io/iaxo-event-hunter/trex-dm-junior.html) | A short activity for ages 7–11: put the detector under a mountain, classify particle traces and compare counts. |

Bookmark these links to return straight to the games. They are hosted on GitHub Pages; this repository contains their source code.

The main QR includes new games automatically through the selection page. Renaming the games does not change their links, so existing posters still work.

## Print or download the QR codes

For a general poster, use the **[single QR that opens the game selection page](docs/qr-codes/todos-los-juegos-a4.pdf)**.

**[Download the three individual game sheets in one PDF](docs/qr-codes/all-games-a4.pdf)** — one page per game, ready to print for dedicated stations.

Each sheet includes the game's name, a large QR code and its web address. The PDFs use vector QR codes, so they stay sharp when printed. Choose **A4, portrait, actual size (100%)** in the print dialog.

| Game | Printable A4 sheet | High-resolution QR image |
| --- | --- | --- |
| IAXO Event Hunter | [Download PDF](docs/qr-codes/iaxo-event-hunter-a4.pdf) | [Download PNG · 2160 × 2160](docs/qr-codes/iaxo-event-hunter.png) |
| TREX-DM | [Download PDF](docs/qr-codes/trex-dm-a4.pdf) | [Download PNG · 2160 × 2160](docs/qr-codes/trex-dm.png) |
| TREX-DM Junior | [Download PDF](docs/qr-codes/trex-dm-junior-a4.pdf) | [Download PNG · 2352 × 2352](docs/qr-codes/trex-dm-junior.png) |

On GitHub, use **Download raw file** if a link opens a file preview. The PNGs are saved at 300 dpi and can also be placed in posters or slides; keep the white margin around each code.

## Open a local copy

If you have downloaded or cloned the repository, open one of these files in your browser:

- [`juegos.html`](juegos.html) — choose a game, with short descriptions.
- [`gravedad-oculta.html`](gravedad-oculta.html) — Sondas y gravedad.
- [`index.html`](index.html) — IAXO Event Hunter.
- [`trex-dm.html`](trex-dm.html) — TREX-DM.
- [`trex-dm-junior.html`](trex-dm-junior.html) — Detectives de partículas (TREX-DM Junior).

No build step is required. The three detector games are self-contained HTML files; the gravity puzzle also needs the two `assets/gravity-*.js` files from this repository.

## Development notes

- [Technical review and checks](REVISION_TECNICA.md).
- [TREX-DM Junior activity and checks](JUNIOR.md).
- [Invisible-mass puzzle, controls and checks](GRAVEDAD.md).
