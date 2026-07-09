"""Qreattore — QR code generator server."""
import io
import os
import qrcode
import qrcode.image.svg
from flask import Flask, request, send_file, jsonify

app = Flask(__name__, static_folder="static", static_url_path="")


@app.route("/")
def index():
    return send_file("static/index.html")


@app.route("/api/generate")
def generate():
    data = request.args.get("data", "").strip()

    if not data:
        return jsonify({"error": "Inserisci un testo, URL o numero di telefono."}), 400

    # Smart prefix detection happens on the client; server just encodes.
    # Check length: QR code max capacity ~2953 bytes / ~4296 alphanumeric.
    if len(data.encode("utf-8")) > 2900:
        return jsonify({"error": "Il testo è troppo lungo per un codice QR (massimo ~2900 byte)."}), 400

    fmt = request.args.get("format", "svg")

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(data)

    try:
        qr.make(fit=True)
    except qrcode.exceptions.DataOverflowError:
        return jsonify({"error": "Il testo è troppo lungo per un codice QR."}), 400

    buf = io.BytesIO()

    if fmt == "png":
        img = qr.make_image(fill_color="black", back_color="white")
        img.save(buf, format="PNG")
        buf.seek(0)
        return send_file(buf, mimetype="image/png")
    else:
        img = qr.make_image(image_factory=qrcode.image.svg.SvgImage)
        img.save(buf)
        buf.seek(0)
        return send_file(buf, mimetype="image/svg+xml")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 4599))
    app.run(host="0.0.0.0", port=port, debug=False)
