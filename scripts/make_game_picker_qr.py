"""Create the game selector's printable QR. Requires qrcode, Pillow and PyMuPDF."""

from pathlib import Path

import fitz
import qrcode


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "qr-codes"
URL = "https://cmargalejo.github.io/iaxo-event-hunter/juegos.html"
MM = 72 / 25.4
WIDTH, HEIGHT = 210 * MM, 297 * MM
INK = (0.094, 0.169, 0.251)


def centered(page, text, baseline_mm, size, bold=False, color=INK):
    font = "hebo" if bold else "helv"
    width = fitz.get_text_length(text, fontname=font, fontsize=size)
    if width > WIDTH - 30 * MM:
        raise ValueError(f"Text exceeds poster margins: {text}")
    page.insert_text(
        ((WIDTH - width) / 2, baseline_mm * MM),
        text,
        fontsize=size,
        fontname=font,
        color=color,
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    qr = qrcode.QRCode(
        error_correction=qrcode.constants.ERROR_CORRECT_Q, box_size=48, border=4
    )
    qr.add_data(URL)
    qr.make(fit=True)
    png = qr.make_image(fill_color="black", back_color="white").get_image()
    png.save(OUT / "todos-los-juegos.png", dpi=(300, 300), optimize=True)

    doc = fitz.open()
    page = doc.new_page(width=WIDTH, height=HEIGHT)
    page.insert_image(
        fitz.Rect(42.5 * MM, 15 * MM, 167.5 * MM, 35.6 * MM),
        filename=str(ROOT / "assets" / "capa-logo.jpg"),
    )
    centered(page, "JUEGOS DE CIENCIA PARA TODOS", 48, 11)
    centered(page, "Juega a buscar", 64, 32, bold=True)
    centered(page, "lo invisible.", 78, 32, bold=True)
    centered(page, "Escanea y elige tu misión.", 92, 17)

    # Draw the QR as vector shapes, retaining its four-module white quiet zone.
    matrix = qr.get_matrix()
    side = 136 * MM
    module = side / len(matrix)
    left, top = (WIDTH - side) / 2, 99 * MM
    shape = page.new_shape()
    for row, cells in enumerate(matrix):
        col = 0
        while col < len(cells):
            if not cells[col]:
                col += 1
                continue
            start = col
            while col < len(cells) and cells[col]:
                col += 1
            shape.draw_rect(
                fitz.Rect(
                    left + start * module,
                    top + row * module,
                    left + col * module,
                    top + (row + 1) * module,
                )
            )
    shape.finish(color=None, fill=(0, 0, 0), width=0)
    shape.commit()
    page.insert_link(
        {"kind": fitz.LINK_URI, "from": fitz.Rect(left, top, left + side, top + side), "uri": URL}
    )

    centered(page, "Gravedad · Axiones · Materia oscura · Junior", 247, 13, bold=True)
    centered(page, "En español. Sin instalar nada ni crear una cuenta.", 257, 11)
    centered(page, "También puedes entrar desde este enlace:", 272, 9)
    centered(page, URL, 280, 9)
    page.insert_link(
        {"kind": fitz.LINK_URI, "from": fitz.Rect(15 * MM, 275 * MM, 195 * MM, 284 * MM), "uri": URL}
    )
    doc.set_metadata(
        {
            "title": "Elige tu misión · Un QR para todos los juegos",
            "subject": "Cartel A4 para acceder a Sondas y gravedad, IAXO, TREX-DM y Detectives de partículas",
            "creator": "IAXO Event Hunter & TREX-DM",
        }
    )
    doc.save(OUT / "todos-los-juegos-a4.pdf", garbage=4, deflate=True)
    doc.close()
    print(f"QR destination: {URL}")
    print(f"PNG: {png.width} × {png.height} px, 300 dpi")
    print("PDF: one A4 page, with a vector QR")


if __name__ == "__main__":
    main()
