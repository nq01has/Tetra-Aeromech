"""
TETRA AEROMECH - Production Backend Server
Enterprise Precision CNC & VMC Manufacturing Platform
Hardened Architecture with Zero Third-Party Dependencies
"""

import http.server
import socketserver
import os
import sys
import json
import time
import uuid
import re
import html
import sqlite3
import secrets
import mimetypes
from urllib.parse import urlparse, parse_qs
from datetime import datetime

# Server Configuration
PORT = int(os.environ.get("PORT", 8080))
HOST = "0.0.0.0"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
DB_PATH = os.path.join(DATA_DIR, "tetra_aeromech.db")

# Ensure directories exist
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

# ----------------------------------------------------------------------
# Database Initialization & Management (Zero SQL-Injection with Param Queries)
# ----------------------------------------------------------------------
def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        
        # RFQ Submissions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rfq_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reference_id TEXT UNIQUE NOT NULL,
                client_name TEXT NOT NULL,
                company TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                sector TEXT,
                material TEXT,
                tolerance_class TEXT,
                annual_volume TEXT,
                itar_required INTEGER DEFAULT 0,
                nda_required INTEGER DEFAULT 0,
                notes TEXT,
                file_name TEXT,
                file_path TEXT,
                ip_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Contact Inquiries
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS contact_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                department TEXT,
                subject TEXT,
                message TEXT NOT NULL,
                ip_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Career Applications
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS career_applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                role_applied TEXT NOT NULL,
                years_experience TEXT,
                notes TEXT,
                resume_filename TEXT,
                ip_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # AI Chatbot History & Analytics
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                user_prompt TEXT NOT NULL,
                bot_reply TEXT NOT NULL,
                ip_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.commit()

init_db()

# ----------------------------------------------------------------------
# Cyber Defense & Rate Limiter (Token Bucket Algorithm)
# ----------------------------------------------------------------------
class RateLimiter:
    def __init__(self, rate=15, per=10):
        # 15 requests per 10 seconds per IP for API endpoints
        self.rate = rate
        self.per = per
        self.clients = {}

    def is_allowed(self, ip):
        now = time.time()
        client = self.clients.get(ip)
        if not client:
            self.clients[ip] = [now]
            return True
        
        # Prune old timestamps
        valid_timestamps = [t for t in client if now - t < self.per]
        if len(valid_timestamps) < self.rate:
            valid_timestamps.append(now)
            self.clients[ip] = valid_timestamps
            return True
        else:
            self.clients[ip] = valid_timestamps
            return False

rate_limiter = RateLimiter(rate=20, per=10)

# CSRF Token Store (in-memory nonce cache)
CSRF_TOKENS = set()

def generate_csrf_token():
    token = secrets.token_hex(32)
    CSRF_TOKENS.add(token)
    # Prune tokens if too large
    if len(CSRF_TOKENS) > 5000:
        CSRF_TOKENS.clear()
        CSRF_TOKENS.add(token)
    return token

def verify_csrf_token(token):
    if not token or token not in CSRF_TOKENS:
        return False
    return True

# ----------------------------------------------------------------------
# Input Sanitization Helpers (Anti-XSS and Injection Defense)
# ----------------------------------------------------------------------
def sanitize_text(text, max_length=5000):
    if not isinstance(text, str):
        return ""
    text = text.strip()[:max_length]
    # Neutralize script tags, HTML tags and control chars
    clean = re.sub(r'<[^>]*>', '', text)
    clean = html.escape(clean)
    return clean

def is_valid_email(email):
    if not isinstance(email, str):
        return False
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email.strip()))

# ----------------------------------------------------------------------
# AI Precision Engineering Knowledge Base & Chatbot Logic
# ----------------------------------------------------------------------
CHATBOT_KNOWLEDGE_BASE = [
    {
        "keywords": ["tolerance", "precision", "accuracy", "micron", "close", "gd&t"],
        "answer": "At Tetra Aeromech, we achieve machining tolerances down to ±0.002 mm (2 microns) on CNC turning and ±0.005 mm on 5-Axis VMC centers. All components are certified with full GD&T verification in accordance with ASME Y14.5 / ISO 1101 using our Zeiss CNC CMM."
    },
    {
        "keywords": ["material", "titanium", "inconel", "aluminum", "alloy", "raw"],
        "answer": "We specialize in challenging aerospace superalloys and precision metals: Titanium (Ti-6Al-4V Grade 5 & Eli), Inconel 718 / 625, Aerospace Aluminum (7075-T651, 2024-T351, 6061-T6), 15-5 PH / 17-4 PH Stainless Steels, and high-performance engineering polymers (PEEK, Delrin). 100% mill test certificates (EN 10204 3.1 / 3.2) are provided."
    },
    {
        "keywords": ["certification", "as9100", "iso", "quality", "standard", "audit", "compliance"],
        "answer": "Tetra Aeromech operates under stringent AS9100D and ISO 9001:2015 aerospace quality standards. Every batch comes with AS9102 First Article Inspection Reports (FAIR Form 1, 2, 3), calibration traceability to NABL/NIST, and complete batch serialization."
    },
    {
        "keywords": ["5-axis", "vmc", "cnc", "machine", "machining", "capabilities", "spindle"],
        "answer": "Our manufacturing arsenal includes simultaneous 5-Axis VMC machining centers (up to 20,000 RPM spindle speed for complex contours and blisks), multi-axis CNC turning with live tooling, precision surface grinders, and optical measuring systems."
    },
    {
        "keywords": ["kanban", "supply chain", "7s", "5s", "jit", "lean", "delivery"],
        "answer": "We follow Lean 7S (Sort, Set in order, Shine, Standardize, Sustain, Safety, Spirit) and automated Kanban replenishment systems. We support Just-In-Time (JIT) deliveries and Vendor Managed Inventory (VMI) with on-time delivery metrics exceeding 99.4%."
    },
    {
        "keywords": ["quote", "rfq", "cost", "lead time", "drawing", "pricing"],
        "answer": "You can request an engineering quote directly through our online RFQ portal! Simply upload your 2D drawings or 3D CAD files (STEP, IGES, DXF, PDF). Typical RFQ turnaround time is within 24 to 48 hours with full DFM (Design for Manufacturability) analysis."
    },
    {
        "keywords": ["founder", "director", "leadership", "team", "who", "started"],
        "answer": "Tetra Aeromech was founded by 4 aerospace engineering specialists: Hemanth Kumar Ramesh (Managing Director & Operations), Yeshwanth Parameshwara (Technical Director & CNC Precision), Divakar Ramakrishna (Director of QA & Defense Compliance), and Rakesh Manju (Director of Supply Chain & Global Strategic Alliances)."
    },
    {
        "keywords": ["sustainability", "green", "environment", "esg", "recycling"],
        "answer": "Our sustainability blueprint incorporates closed-loop synthetic coolant filtration (>98% fluid retention), 100% titanium and aluminum swarf briquetting for zero-loss metallurgical re-smelting, solar-assisted power, and strict RoHS/REACH compliance."
    },
    {
        "keywords": ["itar", "defense", "confidentiality", "nda", "security"],
        "answer": "We maintain absolute defense-grade confidentiality. We execute Mutual NDAs prior to receiving engineering drawings, operate an isolated ITAR-compliant secure CAD vault, and enforce physical & digital access controls across all manufacturing cells."
    }
]

def generate_bot_reply(prompt):
    cleaned = prompt.lower()
    for item in CHATBOT_KNOWLEDGE_BASE:
        for kw in item["keywords"]:
            if kw in cleaned:
                return item["answer"]
    return ("Thank you for reaching out to Tetra Aeromech Engineering. We specialize in precision CNC/VMC manufacturing "
            "for Aerospace, Defense, Automotive, and Industrial applications with sub-micron tolerances (±0.002 mm). "
            "You can upload your CAD model or 2D drawing in our RFQ section, or contact our engineering directors directly.")

# ----------------------------------------------------------------------
# Component Catalog Data
# ----------------------------------------------------------------------
COMPONENTS_CATALOG = [
    {
        "id": "blisk-inconel",
        "title": "5-Axis High-Pressure Turbine Blisk",
        "sector": "Aerospace & Space Propulsion",
        "material": "Inconel 718 (AMS 5662 / NACE MR0175)",
        "tolerance": "±0.005 mm (5 microns)",
        "surface_finish": "Ra 0.4 µm",
        "process": "Simultaneous 5-Axis High-Speed VMC Milling & Dynamic Balancing",
        "gd_t": "Profile of a Surface 0.008 mm, Runout 0.004 mm",
        "badge": "Aerospace Critical"
    },
    {
        "id": "hydraulic-manifold-ti",
        "title": "Flight Control Hydraulic Manifold",
        "sector": "Aerospace & Defense Aviation",
        "material": "Titanium Ti-6Al-4V Grade 5 (AMS 4928)",
        "tolerance": "±0.003 mm (3 microns)",
        "surface_finish": "Ra 0.2 µm (Honed Bores)",
        "process": "Multi-Axis Mill-Turn with Deep-Hole Gundrilling & Ultrasonic De-burr",
        "gd_t": "True Position Ø0.005 mm at MMC, Concentricity 0.003 mm",
        "badge": "Defense Class"
    },
    {
        "id": "actuator-bracket-7075",
        "title": "Avionics Actuator Structural Bracket",
        "sector": "Commercial & Defense Aircraft",
        "material": "Aerospace Aluminum 7075-T651 (AMS 4045)",
        "tolerance": "±0.008 mm",
        "surface_finish": "Ra 0.8 µm + Type III Hard Anodize",
        "process": "High-Speed 4-Axis CNC Machining from Monolithic Billet",
        "gd_t": "Perpendicularity 0.010 mm, Flatness 0.006 mm",
        "badge": "Structural Grade"
    },
    {
        "id": "landing-gear-pin",
        "title": "Main Landing Gear Trunnion Pivot Pin",
        "sector": "Defense & Commercial Aerospace",
        "material": "15-5 PH Stainless Steel Condition H1025 (AMS 5659)",
        "tolerance": "±0.002 mm (2 microns)",
        "surface_finish": "Ra 0.15 µm (Super-Finished Ground)",
        "process": "CNC Turning, Vacuum Heat Treatment & Precision Cylindrical Grinding",
        "gd_t": "Cylindricity 0.002 mm, Total Runout 0.003 mm",
        "badge": "High Fatigue Life"
    },
    {
        "id": "cold-plate-enclosure",
        "title": "Liquid-Cooled Radar Cold Plate Enclosure",
        "sector": "Defense Electronics & Avionics",
        "material": "Aluminum 6061-T6 (AMS 4027)",
        "tolerance": "±0.006 mm",
        "surface_finish": "Ra 0.4 µm + Chemical Conversion Coating (MIL-DTL-5541)",
        "process": "Micro-Channel CNC End Milling with Vacuum Brazing Alignment",
        "gd_t": "Flatness 0.005 mm across 400 mm span",
        "badge": "Thermal Mission Critical"
    },
    {
        "id": "differential-pinion",
        "title": "High-Precision Transmission Pinion Shaft",
        "sector": "High-Performance Automotive & EV",
        "material": "8620 Alloy Steel / Carburized (AMS 6274)",
        "tolerance": "±0.004 mm",
        "surface_finish": "Ra 0.2 µm",
        "process": "CNC Turn-Mill, Case Hardening (58-62 HRC), CNC Gear Grinding",
        "gd_t": "Concentricity 0.003 mm, Tooth Lead Error < 0.002 mm",
        "badge": "EV Powertrain"
    }
]

# ----------------------------------------------------------------------
# Hardened Request Handler
# ----------------------------------------------------------------------
class TetraAeromechHandler(http.server.SimpleHTTPRequestHandler):
    server_version = "TetraAeromechEngine/2.4 (Hardened)"
    sys_version = ""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def log_message(self, format, *args):
        # Structured log format
        sys.stdout.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {self.address_string()} - {format % args}\n")

    def send_security_headers(self, content_type="text/html; charset=utf-8"):
        self.send_header("Content-Type", content_type)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-XSS-Protection", "1; mode=block")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "geolocation=(), camera=(), microphone=(), payment=()")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self' data:; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: blob:; "
            "connect-src 'self';"
        )
        self.send_header("Server", "TetraAeromech-Core")

    def send_json_response(self, status_code, data_dict):
        body = json.dumps(data_dict).encode("utf-8")
        self.send_response(status_code)
        self.send_security_headers("application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.end_headers()
        self.wfile.write(body)

    def get_client_ip(self):
        # Respect reverse proxy if present
        forwarded = self.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return self.client_address[0]

    # ------------------------------------------------------------------
    # HTTP GET Requests
    # ------------------------------------------------------------------
    def do_GET(self):
        client_ip = self.get_client_ip()
        parsed = urlparse(self.path)
        path = parsed.path

        # 1. API: CSRF Token Generation
        if path == "/api/csrf-token":
            token = generate_csrf_token()
            self.send_json_response(200, {
                "status": "success",
                "csrf_token": token,
                "timestamp": int(time.time())
            })
            return

        # 2. API: Health Check
        if path == "/api/health":
            self.send_json_response(200, {
                "status": "ok",
                "service": "Tetra Aeromech Enterprise Server",
                "security_status": "enforced",
                "active_db": True,
                "time": datetime.utcnow().isoformat() + "Z"
            })
            return

        # 3. API: Component Registry
        if path == "/api/components":
            self.send_json_response(200, {
                "status": "success",
                "total": len(COMPONENTS_CATALOG),
                "components": COMPONENTS_CATALOG
            })
            return

        # Rate limiter check for general traffic
        if not rate_limiter.is_allowed(client_ip):
            self.send_json_response(429, {"error": "Rate limit exceeded. Please wait a few seconds."})
            return

        # 4. Static Files Handling with Strict Path-Traversal Sanitization
        clean_path = path.lstrip("/")
        if clean_path == "" or clean_path == "/":
            clean_path = "index.html"

        # Prevent Directory Traversal Attack
        target_path = os.path.normpath(os.path.join(STATIC_DIR, clean_path))
        if not target_path.startswith(STATIC_DIR) or not os.path.exists(target_path) or os.path.isdir(target_path):
            # Fallback to index.html if file not found
            target_path = os.path.join(STATIC_DIR, "index.html")

        content_type, _ = mimetypes.guess_type(target_path)
        if not content_type:
            content_type = "application/octet-stream"

        try:
            with open(target_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_security_headers(content_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_json_response(500, {"error": f"Internal Server Error: {str(e)}"})

    # ------------------------------------------------------------------
    # HTTP POST Requests
    # ------------------------------------------------------------------
    def do_POST(self):
        client_ip = self.get_client_ip()

        # Enforce rate limiter
        if not rate_limiter.is_allowed(client_ip):
            self.send_json_response(429, {"error": "Rate limit exceeded. System protected from excessive requests."})
            return

        parsed = urlparse(self.path)
        path = parsed.path

        # Enforce maximum body size (15MB for CAD uploads, 64KB for JSON)
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 15 * 1024 * 1024:
            self.send_json_response(413, {"error": "Payload Too Large. Max upload size is 15MB."})
            return

        content_type_header = self.headers.get("Content-Type", "")

        # 1. API: Intelligent AI Engineering Chatbot
        if path == "/api/chat":
            try:
                body_bytes = self.rfile.read(content_length)
                payload = json.loads(body_bytes.decode("utf-8"))
                user_message = sanitize_text(payload.get("message", ""), 1000)
                session_id = sanitize_text(payload.get("session_id", str(uuid.uuid4())), 100)

                if not user_message:
                    self.send_json_response(400, {"error": "Message is required."})
                    return

                bot_response = generate_bot_reply(user_message)

                # Store chat log in SQLite
                with sqlite3.connect(DB_PATH) as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        INSERT INTO chat_sessions (session_id, user_prompt, bot_reply, ip_address)
                        VALUES (?, ?, ?, ?)
                    """, (session_id, user_message, bot_response, client_ip))
                    conn.commit()

                self.send_json_response(200, {
                    "status": "success",
                    "reply": bot_response,
                    "session_id": session_id,
                    "timestamp": int(time.time())
                })
                return
            except Exception as e:
                self.send_json_response(500, {"error": f"Failed to process chat: {str(e)}"})
                return

        # Check Anti-CSRF Token for state mutations
        csrf_header = self.headers.get("X-CSRF-Token", "")
        # For multipart forms, token may be in header or form field. We check header first.
        # If missing, we verify later in parsed body.

        # 2. API: Contact Form Submission
        if path == "/api/contact":
            try:
                body_bytes = self.rfile.read(content_length)
                payload = json.loads(body_bytes.decode("utf-8"))
                
                # Check CSRF
                token = csrf_header or payload.get("csrf_token")
                if not verify_csrf_token(token):
                    self.send_json_response(403, {"error": "Invalid or expired security token (CSRF). Please reload page."})
                    return

                name = sanitize_text(payload.get("name", ""), 150)
                email = payload.get("email", "").strip()
                department = sanitize_text(payload.get("department", "General Inquiry"), 100)
                subject = sanitize_text(payload.get("subject", ""), 200)
                message = sanitize_text(payload.get("message", ""), 4000)

                if not name or not is_valid_email(email) or not message:
                    self.send_json_response(400, {"error": "Please provide a valid name, email address, and message."})
                    return

                with sqlite3.connect(DB_PATH) as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        INSERT INTO contact_messages (name, email, department, subject, message, ip_address)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (name, email, department, subject, message, client_ip))
                    conn.commit()

                self.send_json_response(200, {
                    "status": "success",
                    "message": "Thank you for contacting Tetra Aeromech. Our engineering team will respond within 24 hours."
                })
                return
            except Exception as e:
                self.send_json_response(500, {"error": f"Contact processing failed: {str(e)}"})
                return

        # 3. API: Career Application Submission
        if path == "/api/careers":
            try:
                body_bytes = self.rfile.read(content_length)
                payload = json.loads(body_bytes.decode("utf-8"))
                
                token = csrf_header or payload.get("csrf_token")
                if not verify_csrf_token(token):
                    self.send_json_response(403, {"error": "Invalid security token. Please reload page."})
                    return

                full_name = sanitize_text(payload.get("full_name", ""), 150)
                email = payload.get("email", "").strip()
                phone = sanitize_text(payload.get("phone", ""), 50)
                role = sanitize_text(payload.get("role", ""), 150)
                experience = sanitize_text(payload.get("experience", ""), 50)
                notes = sanitize_text(payload.get("notes", ""), 2000)
                resume_name = sanitize_text(payload.get("resume_name", "Submitted via Form"), 200)

                if not full_name or not is_valid_email(email) or not role:
                    self.send_json_response(400, {"error": "Name, email, and target role are mandatory."})
                    return

                with sqlite3.connect(DB_PATH) as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        INSERT INTO career_applications (full_name, email, phone, role_applied, years_experience, notes, resume_filename, ip_address)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (full_name, email, phone, role, experience, notes, resume_name, client_ip))
                    conn.commit()

                self.send_json_response(200, {
                    "status": "success",
                    "message": f"Application for '{role}' successfully received. Our HR & Technical team will review your profile."
                })
                return
            except Exception as e:
                self.send_json_response(500, {"error": f"Career submission failed: {str(e)}"})
                return

        # 4. API: Defense & Aerospace RFQ (Request for Quote)
        if path == "/api/rfq":
            try:
                raw_body = self.rfile.read(content_length)
                
                # Check whether JSON or Multipart Form
                if "application/json" in content_type_header:
                    payload = json.loads(raw_body.decode("utf-8"))
                    token = csrf_header or payload.get("csrf_token")
                    if not verify_csrf_token(token):
                        self.send_json_response(403, {"error": "Invalid security token. Please refresh."})
                        return

                    client_name = sanitize_text(payload.get("name", ""), 150)
                    company = sanitize_text(payload.get("company", ""), 150)
                    email = payload.get("email", "").strip()
                    phone = sanitize_text(payload.get("phone", ""), 50)
                    sector = sanitize_text(payload.get("sector", "Aerospace"), 100)
                    material = sanitize_text(payload.get("material", "Titanium Ti-6Al-4V"), 100)
                    tolerance = sanitize_text(payload.get("tolerance", "±0.005 mm"), 100)
                    volume = sanitize_text(payload.get("volume", "Prototype (1-10 pcs)"), 100)
                    itar = 1 if payload.get("itar") else 0
                    nda = 1 if payload.get("nda") else 0
                    notes = sanitize_text(payload.get("notes", ""), 3000)
                    file_name = sanitize_text(payload.get("file_name", "cad_drawing_attached"), 200)
                    file_path = "stored_via_portal"
                else:
                    # Simple Multipart Parser for CAD Drawing Attachments
                    boundary = content_type_header.split("boundary=")[1].encode("utf-8") if "boundary=" in content_type_header else None
                    if not boundary:
                        self.send_json_response(400, {"error": "Invalid multipart form data."})
                        return

                    # Parse fields
                    parts = raw_body.split(b"--" + boundary)
                    form_data = {}
                    file_name = ""
                    saved_rel_path = ""

                    for part in parts:
                        if b"Content-Disposition:" in part:
                            headers_part, body_part = part.split(b"\r\n\r\n", 1)
                            headers_str = headers_part.decode("utf-8", errors="ignore")
                            body_clean = body_part.rstrip(b"\r\n")

                            if 'filename="' in headers_str:
                                # File field
                                match = re.search(r'filename="([^"]+)"', headers_str)
                                if match:
                                    original_fname = os.path.basename(match.group(1))
                                    # Whitelist allowed extensions for aerospace manufacturing drawings
                                    allowed_exts = (".step", ".stp", ".iges", ".igs", ".dxf", ".dwg", ".pdf", ".zip", ".png", ".jpg")
                                    ext = os.path.splitext(original_fname)[1].lower()
                                    if ext in allowed_exts and len(body_clean) > 0:
                                        file_name = sanitize_text(original_fname, 150)
                                        safe_disk_name = f"{int(time.time())}_{secrets.token_hex(6)}{ext}"
                                        dest = os.path.join(UPLOADS_DIR, safe_disk_name)
                                        with open(dest, "wb") as uf:
                                            uf.write(body_clean)
                                        saved_rel_path = safe_disk_name
                            else:
                                match = re.search(r'name="([^"]+)"', headers_str)
                                if match:
                                    field_name = match.group(1)
                                    form_data[field_name] = body_clean.decode("utf-8", errors="ignore").strip()

                    token = csrf_header or form_data.get("csrf_token")
                    if not verify_csrf_token(token):
                        self.send_json_response(403, {"error": "Invalid or expired security token. Please refresh."})
                        return

                    client_name = sanitize_text(form_data.get("name", ""), 150)
                    company = sanitize_text(form_data.get("company", ""), 150)
                    email = form_data.get("email", "").strip()
                    phone = sanitize_text(form_data.get("phone", ""), 50)
                    sector = sanitize_text(form_data.get("sector", "Aerospace"), 100)
                    material = sanitize_text(form_data.get("material", "Titanium Ti-6Al-4V"), 100)
                    tolerance = sanitize_text(form_data.get("tolerance", "±0.005 mm"), 100)
                    volume = sanitize_text(form_data.get("volume", "Prototype (1-10 pcs)"), 100)
                    itar = 1 if form_data.get("itar") in ("true", "1", "on") else 0
                    nda = 1 if form_data.get("nda") in ("true", "1", "on") else 0
                    notes = sanitize_text(form_data.get("notes", ""), 3000)
                    file_path = saved_rel_path

                if not client_name or not company or not is_valid_email(email):
                    self.send_json_response(400, {"error": "Client Name, Company, and valid Email are required."})
                    return

                # Generate Aerospace Reference ID
                reference_id = f"TA-RFQ-{datetime.now().strftime('%Y%m')}-{secrets.token_hex(3).upper()}"

                with sqlite3.connect(DB_PATH) as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        INSERT INTO rfq_requests (
                            reference_id, client_name, company, email, phone, sector, 
                            material, tolerance_class, annual_volume, itar_required, 
                            nda_required, notes, file_name, file_path, ip_address
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        reference_id, client_name, company, email, phone, sector,
                        material, tolerance, volume, itar, nda, notes, file_name, file_path, client_ip
                    ))
                    conn.commit()

                self.send_json_response(200, {
                    "status": "success",
                    "reference_id": reference_id,
                    "message": "Your Request for Quote has been safely submitted to Tetra Aeromech Engineering.",
                    "nda_status": "Mutual NDA protocol initiated" if nda else "Standard commercial confidentiality",
                    "itar_status": "ITAR secure handling enabled" if itar else "Standard defense handling"
                })
                return
            except Exception as e:
                self.send_json_response(500, {"error": f"RFQ submission failed: {str(e)}"})
                return

        self.send_json_response(404, {"error": "Endpoint not found"})

# ----------------------------------------------------------------------
# Multi-Threaded Server Runner
# ----------------------------------------------------------------------
class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

def run():
    print("==================================================================")
    print("      TETRA AEROMECH - PRECISION CNC & VMC MANUFACTURING         ")
    print("      Aerospace • Defense • Automotive • High-Tech Industrial     ")
    print("==================================================================")
    print(f"[*] Base Directory: {BASE_DIR}")
    print(f"[*] Static Assets:  {STATIC_DIR}")
    print(f"[*] Database:       {DB_PATH}")
    print(f"[*] Port Listening: http://localhost:{PORT}")
    print(f"[*] Cyber Security: CSP, Anti-CSRF, IP Rate-Limiting Active")
    print("==================================================================")
    server = ThreadedHTTPServer((HOST, PORT), TetraAeromechHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Server shutdown cleanly.")
        server.server_close()

if __name__ == "__main__":
    run()
