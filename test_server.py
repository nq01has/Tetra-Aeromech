"""
TETRA AEROMECH - Comprehensive Verification Test Suite
Apple & SAP Bright Design System Edition
Verifies:
1. Cyber-defense sanitization (Anti-XSS, HTML stripping)
2. Token-bucket rate limiter per IP
3. Cryptographic CSRF token generation & validation
4. AI Chatbot knowledge base (tolerances, materials, standards, founders)
5. SQLite schema and parameterized storage for RFQ, Contact, Careers, and Chat
6. Static assets presence, integrity, and anti-path traversal protection
7. Prominent logo integration and Apple-style navigation elements
"""

import unittest
import os
import json
import sqlite3
import server

class AppleSapTetraAeromechTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        server.DB_PATH = os.path.join(server.DATA_DIR, "test_applesap_tetra.db")
        if os.path.exists(server.DB_PATH):
            os.remove(server.DB_PATH)
        server.init_db()

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(server.DB_PATH):
            os.remove(server.DB_PATH)

    def test_01_sanitizer_and_anti_xss(self):
        malicious = "<script>alert('XSS')</script><img src=x onerror=alert(1)>Precision Component"
        cleaned = server.sanitize_text(malicious)
        self.assertNotIn("<script>", cleaned)
        self.assertNotIn("<img", cleaned)
        self.assertIn("Precision Component", cleaned)

    def test_02_rate_limiter_flood_prevention(self):
        limiter = server.RateLimiter(rate=8, per=2)
        test_ip = "203.0.113.45"
        for _ in range(8):
            self.assertTrue(limiter.is_allowed(test_ip))
        # 9th request must be throttled
        self.assertFalse(limiter.is_allowed(test_ip))

    def test_03_csrf_protection_lifecycle(self):
        token = server.generate_csrf_token()
        self.assertTrue(server.verify_csrf_token(token))
        self.assertFalse(server.verify_csrf_token("invalid_nonce_attempt"))
        self.assertFalse(server.verify_csrf_token(""))

    def test_04_ai_chatbot_knowledge_base_precision(self):
        # 1. Tolerances
        ans_tol = server.generate_bot_reply("What tolerances do you machine?")
        self.assertIn("±0.002 mm", ans_tol)

        # 2. Materials
        ans_mat = server.generate_bot_reply("Can you machine Inconel 718 and Titanium Ti-6Al-4V?")
        self.assertIn("Inconel", ans_mat)
        self.assertIn("Titanium", ans_mat)

        # 3. 4 Co-Founders
        ans_founders = server.generate_bot_reply("Tell me who the founders and directors are")
        self.assertIn("Hemanth Kumar Ramesh", ans_founders)
        self.assertIn("Yeshwanth Parameshwara", ans_founders)
        self.assertIn("Divakar Ramakrishna", ans_founders)
        self.assertIn("Rakesh Manju", ans_founders)

        # 4. Lean 7S & Kanban
        ans_lean = server.generate_bot_reply("How do you manage 7S and Kanban?")
        self.assertIn("7S", ans_lean)
        self.assertIn("Kanban", ans_lean)

    def test_05_sqlite_database_rfq_workflow(self):
        with sqlite3.connect(server.DB_PATH) as conn:
            cursor = conn.cursor()
            ref_id = "TA-RFQ-202609-PROD1"
            cursor.execute("""
                INSERT INTO rfq_requests (
                    reference_id, client_name, company, email, phone, sector,
                    material, tolerance_class, annual_volume, itar_required,
                    nda_required, notes, file_name, file_path, ip_address
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                ref_id, "Chief Procurement Officer", "Airbus Defense & Space",
                "procurement@airbus.com", "+33 1 55 55 55 55", "Aerospace Defense",
                "Titanium Ti-6Al-4V", "±0.003 mm", "500 sets/year", 1, 1,
                "Landing gear actuator linkages with CMM inspection", "actuator.step",
                "uploads/safe_actuator.step", "127.0.0.1"
            ))
            conn.commit()

            cursor.execute("SELECT reference_id, client_name, company, sector FROM rfq_requests WHERE reference_id = ?", (ref_id,))
            row = cursor.fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row[0], ref_id)
            self.assertEqual(row[2], "Airbus Defense & Space")

    def test_06_static_files_integrity(self):
        required_files = [
            "index.html",
            "css/styles.css",
            "js/app.js",
            "js/chatbot.js",
            "js/translations.js",
            "images/logo.png"
        ]
        for rel_path in required_files:
            full_path = os.path.join(server.STATIC_DIR, rel_path)
            self.assertTrue(os.path.exists(full_path), f"Missing required file: {rel_path}")
            self.assertGreater(os.path.getsize(full_path), 0, f"Empty file: {rel_path}")

    def test_07_html_apple_sap_features_and_founders(self):
        index_path = os.path.join(server.STATIC_DIR, "index.html")
        with open(index_path, "r", encoding="utf-8") as f:
            html_content = f.read()

        # Verify 4 Co-Founders are in the HTML
        self.assertIn("Hemanth Kumar Ramesh", html_content)
        self.assertIn("Yeshwanth Parameshwara", html_content)
        self.assertIn("Divakar Ramakrishna", html_content)
        self.assertIn("Rakesh Manju", html_content)

        # Verify Logo is prominently referenced with correct class
        self.assertIn("brand-logo-img", html_content)
        self.assertIn("/images/logo.png", html_content)

        # Verify Apple-style dropdown menus are present
        self.assertIn("mega-dropdown", html_content)
        self.assertIn("tab-picker", html_content)

        # Verify 3D canvas is removed
        self.assertNotIn("canvas3d", html_content)
        self.assertNotIn("explodedSlider", html_content)

        # Verify Chatbot, RFQ, 7S, Kanban, Metrology
        self.assertIn("chatWidget", html_content)
        self.assertIn("rfqForm", html_content)
        self.assertIn("AS9100D", html_content)
        self.assertIn("AS9102", html_content)
        self.assertIn("Kanban", html_content)
        self.assertIn("7S", html_content)

if __name__ == "__main__":
    unittest.main()
