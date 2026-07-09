from io import BytesIO
from urllib.parse import quote

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

from convert import convert_bytes

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


@app.get("/health")
def health():
    return jsonify({"ok": True})


@app.post("/convert")
def convert():
    upload = request.files.get("file")
    if upload is None:
        return jsonify({"error": "Файл не передан."}), 400

    filename = upload.filename or "stocks.xlsx"
    if not filename.lower().endswith(".xlsx"):
        return jsonify({"error": "Нужен файл Excel в формате .xlsx."}), 400

    try:
        output, meta = convert_bytes(upload.read())
    except Exception as error:  # noqa: BLE001
        return jsonify({"error": str(error)}), 400

    base = filename.rsplit(".", 1)[0]
    if "инвент" in base.lower():
        download_name = f"{base}.xlsx"
    else:
        download_name = f"инвентаризация-{base}.xlsx"

    response = send_file(
        BytesIO(output),
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=download_name,
    )
    response.headers["X-Inventa-Rows"] = str(meta["rows"])
    response.headers["X-Inventa-Organization"] = quote(meta["organization"], safe="")
    response.headers["X-Inventa-Sheet"] = quote(meta["sheetName"], safe="")
    return response


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8767, debug=False)
