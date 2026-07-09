"""Qreattore — test suite."""
import io
import os
import sys
import unittest

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from server import app


class QreattoreTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config["TESTING"] = True
        cls.client = app.test_client()

    # ── Page loads ────────────────────────────────────────

    def test_index_loads(self):
        resp = self.client.get("/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b"<!DOCTYPE html>", resp.data)

    def test_robots_txt(self):
        resp = self.client.get("/robots.txt")
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b"Sitemap:", resp.data)

    def test_sitemap_xml(self):
        resp = self.client.get("/sitemap.xml")
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b"<urlset", resp.data)

    def test_css_loads(self):
        resp = self.client.get("/style.css")
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b"Qreattore", resp.data)

    def test_js_loads(self):
        resp = self.client.get("/script.js")
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b"Qreattore", resp.data)

    # ── SVGs ──────────────────────────────────────────────

    def test_qr_svg_url(self):
        resp = self.client.get("/api/generate?data=https://example.com&format=svg")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("image/svg+xml", resp.content_type)
        self.assertIn(b"<svg", resp.data)
        self.assertIn(b"</svg>", resp.data)

    def test_qr_svg_text(self):
        resp = self.client.get("/api/generate?data=Ciao%20mondo&format=svg")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("image/svg+xml", resp.content_type)
        self.assertIn(b"<svg", resp.data)

    def test_qr_svg_phone(self):
        resp = self.client.get("/api/generate?data=tel:+391234567890&format=svg")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("image/svg+xml", resp.content_type)
        self.assertIn(b"<svg", resp.data)

    def test_qr_svg_special_chars(self):
        resp = self.client.get("/api/generate?data=Ciao%20%26%20benvenuto%21&format=svg")
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b"<svg", resp.data)

    # ── PNGs ──────────────────────────────────────────────

    def test_qr_png_url(self):
        resp = self.client.get("/api/generate?data=https://example.com&format=png")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.content_type, "image/png")
        # PNG magic bytes
        self.assertEqual(resp.data[:8], b"\x89PNG\r\n\x1a\n")

    def test_qr_png_text(self):
        resp = self.client.get("/api/generate?data=Hello&format=png")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.content_type, "image/png")
        self.assertEqual(resp.data[:8], b"\x89PNG\r\n\x1a\n")

    # ── Error handling ────────────────────────────────────

    def test_qr_empty_data(self):
        resp = self.client.get("/api/generate?data=&format=svg")
        self.assertEqual(resp.status_code, 400)
        json_data = resp.get_json()
        self.assertIn("error", json_data)

    def test_qr_missing_data(self):
        resp = self.client.get("/api/generate?format=svg")
        self.assertEqual(resp.status_code, 400)
        json_data = resp.get_json()
        self.assertIn("error", json_data)

    def test_qr_too_long(self):
        long_text = "A" * 3000
        resp = self.client.get(
            "/api/generate?data=" + long_text + "&format=svg"
        )
        self.assertEqual(resp.status_code, 400)

    # ── Default format ────────────────────────────────────

    def test_qr_default_format_is_svg(self):
        resp = self.client.get("/api/generate?data=test")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("image/svg+xml", resp.content_type)

    # ── Encoding ──────────────────────────────────────────

    def test_qr_unicode(self):
        resp = self.client.get("/api/generate?data=caff%C3%A8%20%C3%A8%20buono&format=svg")
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b"<svg", resp.data)


if __name__ == "__main__":
    unittest.main(verbosity=2)
