import datetime as dt
from io import BytesIO
import json
import os
import re
import shutil
import sqlite3
import uuid
from pathlib import Path
from typing import Any

import bcrypt
import pandas as pd
try:
    import plotly.express as px
except Exception:  # pragma: no cover - optional at runtime
    px = None
import streamlit as st
from dotenv import load_dotenv
from PIL import Image, ImageFilter, ImageOps

try:
    import cv2
except Exception:  # pragma: no cover - optional at runtime
    cv2 = None

try:
    import numpy as np
except Exception:  # pragma: no cover - optional at runtime
    np = None

try:
    import pytesseract
except Exception:  # pragma: no cover - optional at runtime
    pytesseract = None

try:
    import google.generativeai as genai
except Exception:  # pragma: no cover - optional dependency at runtime
    genai = None


BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR / "backend"
DB_PATH = BACKEND_DIR / "database.sqlite"

load_dotenv(BASE_DIR / ".env")
load_dotenv(BACKEND_DIR / ".env")

CATEGORIES = [
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Entertainment",
    "Health",
    "Education",
    "Travel",
    "Investments",
    "Other",
]

PAYMENT_METHODS = [
    "Cash",
    "Credit Card",
    "Debit Card",
    "Bank Transfer",
    "Mobile Wallet",
    "Auto-Pay",
]

CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "INR", "JPY", "CAD"]


def get_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                currency_preference TEXT DEFAULT 'USD',
                monthly_budget REAL DEFAULT 0.0,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS expenses (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                merchant TEXT,
                payment_method TEXT,
                transaction_date TEXT NOT NULL,
                receipt_image_url TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS budgets (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                category TEXT NOT NULL,
                limit_amount REAL NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                UNIQUE(user_id, category),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS ai_insights (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                type TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS chat_history (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )
        seed_demo_data(conn)


def seed_demo_data(conn: sqlite3.Connection) -> None:
    user_count = conn.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"]
    if user_count > 0:
        return

    demo_user_id = "demo-user-uuid-12345"
    hashed_password = bcrypt.hashpw("demo123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    conn.execute(
        """
        INSERT INTO users (id, name, email, password, currency_preference, monthly_budget)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (demo_user_id, "Demo User", "demo@example.com", hashed_password, "USD", 2000.0),
    )

    category_budgets = [
        ("Food", 400),
        ("Transport", 200),
        ("Shopping", 300),
        ("Bills", 600),
        ("Entertainment", 200),
        ("Health", 100),
        ("Travel", 500),
    ]

    for category, limit in category_budgets:
        conn.execute(
            "INSERT INTO budgets (id, user_id, category, limit_amount) VALUES (?, ?, ?, ?)",
            (f"budget-{category.lower()}", demo_user_id, category, float(limit)),
        )

    today = dt.date.today()

    def ago(days: int) -> str:
        return (today - dt.timedelta(days=days)).isoformat()

    demo_expenses = [
        ("exp-1", 45.50, "Food", "Weekly groceries", "Whole Foods", "Credit Card", ago(2)),
        ("exp-2", 12.80, "Food", "Coffee and snack", "Starbucks", "Mobile Wallet", ago(1)),
        ("exp-3", 85.00, "Bills", "Electricity bill", "Power Grid Corp", "Bank Transfer", ago(10)),
        ("exp-4", 15.00, "Transport", "Ride home", "Uber", "Credit Card", ago(3)),
        ("exp-5", 120.00, "Shopping", "Office chair", "Amazon", "Credit Card", ago(7)),
        ("exp-6", 45.00, "Entertainment", "Concert ticket", "Ticketmaster", "Debit Card", ago(5)),
        ("exp-7", 200.00, "Investments", "Index fund purchase", "Vanguard", "Bank Transfer", ago(12)),
        ("exp-8", 35.00, "Health", "Prescription", "CVS Pharmacy", "Debit Card", ago(8)),
        ("exp-9", 49.00, "Education", "Programming course", "Coursera", "Credit Card", ago(15)),
        ("exp-10", 320.00, "Travel", "Weekend stay", "Airbnb", "Credit Card", ago(14)),
    ]

    for expense in demo_expenses:
        conn.execute(
            """
            INSERT INTO expenses (id, user_id, amount, category, description, merchant, payment_method, transaction_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (expense[0], demo_user_id, expense[1], expense[2], expense[3], expense[4], expense[5], expense[6]),
        )


def register_user(name: str, email: str, password: str, currency: str, monthly_budget: float) -> tuple[bool, str]:
    email = email.strip().lower()
    if not name.strip() or not email or not password:
        return False, "Name, email, and password are required."

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    try:
        with get_db() as conn:
            conn.execute(
                """
                INSERT INTO users (id, name, email, password, currency_preference, monthly_budget)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (str(uuid.uuid4()), name.strip(), email, password_hash, currency, float(monthly_budget)),
            )
        return True, "Account created successfully."
    except sqlite3.IntegrityError:
        return False, "A user with this email already exists."


def login_user(email: str, password: str) -> tuple[bool, dict[str, Any] | None, str]:
    email = email.strip().lower()
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    if not user:
        return False, None, "Invalid email or password."

    if not bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8")):
        return False, None, "Invalid email or password."

    return True, dict(user), "Logged in successfully."


def get_user(user_id: str) -> dict[str, Any] | None:
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(user) if user else None


def update_user_profile(user_id: str, name: str, currency: str, monthly_budget: float) -> None:
    with get_db() as conn:
        conn.execute(
            "UPDATE users SET name = ?, currency_preference = ?, monthly_budget = ? WHERE id = ?",
            (name.strip(), currency, float(monthly_budget), user_id),
        )


def categorize_expense(merchant: str, description: str, amount: float) -> dict[str, Any]:
    combined = f"{merchant} {description}".lower()
    if any(x in combined for x in ["coffee", "food", "restaurant", "starbucks", "grocery"]):
        return {"category": "Food", "tags": ["dining", "groceries"]}
    if any(x in combined for x in ["uber", "train", "taxi", "fuel", "gas"]):
        return {"category": "Transport", "tags": ["commute"]}
    if any(x in combined for x in ["amazon", "zara", "shopping", "retail"]):
        return {"category": "Shopping", "tags": ["retail"]}
    if any(x in combined for x in ["bill", "electric", "internet", "subscription"]):
        return {"category": "Bills", "tags": ["utility"]}
    if any(x in combined for x in ["doctor", "pharmacy", "health", "clinic"]):
        return {"category": "Health", "tags": ["medical"]}
    if any(x in combined for x in ["course", "education", "udemy", "coursera"]):
        return {"category": "Education", "tags": ["learning"]}
    if any(x in combined for x in ["travel", "hotel", "flight", "airbnb"]):
        return {"category": "Travel", "tags": ["trip"]}
    if any(x in combined for x in ["stock", "investment", "vanguard", "fund"]):
        return {"category": "Investments", "tags": ["wealth"]}
    if amount < 0:
        return {"category": "Income", "tags": ["income"]}
    return {"category": "Other", "tags": ["general"]}


def add_transaction(
    user_id: str,
    amount: float,
    category: str,
    description: str,
    merchant: str,
    payment_method: str,
    transaction_date: str,
    receipt_image_url: str = "",
) -> dict[str, Any]:
    with get_db() as conn:
        duplicate = conn.execute(
            """
            SELECT id FROM expenses
            WHERE user_id = ? AND amount = ? AND merchant = ? AND transaction_date = ?
            LIMIT 1
            """,
            (user_id, float(amount), merchant or "", transaction_date),
        ).fetchone()

        expense_id = str(uuid.uuid4())
        conn.execute(
            """
            INSERT INTO expenses (id, user_id, amount, category, description, merchant, payment_method, transaction_date, receipt_image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                expense_id,
                user_id,
                float(amount),
                category,
                description or "",
                merchant or "Unknown",
                payment_method or "Cash",
                transaction_date,
                receipt_image_url,
            ),
        )

    return {
        "id": expense_id,
        "detected_duplicate": bool(duplicate),
    }


def get_transactions(
    user_id: str,
    category: str | None = None,
    payment_method: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    search: str | None = None,
) -> list[dict[str, Any]]:
    query = "SELECT * FROM expenses WHERE user_id = ?"
    params: list[Any] = [user_id]

    if category and category != "All":
        query += " AND category = ?"
        params.append(category)

    if payment_method and payment_method != "All":
        query += " AND payment_method = ?"
        params.append(payment_method)

    if start_date:
        query += " AND transaction_date >= ?"
        params.append(start_date)

    if end_date:
        query += " AND transaction_date <= ?"
        params.append(end_date)

    if search:
        query += " AND (description LIKE ? OR merchant LIKE ?)"
        like = f"%{search}%"
        params.extend([like, like])

    query += " ORDER BY transaction_date DESC, created_at DESC"

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


def delete_transaction(user_id: str, transaction_id: str) -> bool:
    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM expenses WHERE id = ? AND user_id = ?", (transaction_id, user_id)
        ).fetchone()
        if not row:
            return False
        conn.execute("DELETE FROM expenses WHERE id = ?", (transaction_id,))
    return True


def get_dashboard_stats(user_id: str) -> dict[str, Any]:
    user = get_user(user_id)
    if not user:
        return {}

    now = dt.date.today()
    start_of_month = now.replace(day=1).isoformat()

    with get_db() as conn:
        spent_row = conn.execute(
            "SELECT SUM(amount) AS total FROM expenses WHERE user_id = ? AND transaction_date >= ? AND amount > 0",
            (user_id, start_of_month),
        ).fetchone()

        income_row = conn.execute(
            "SELECT SUM(amount) AS total FROM expenses WHERE user_id = ? AND transaction_date >= ? AND amount < 0",
            (user_id, start_of_month),
        ).fetchone()

        category_totals = conn.execute(
            """
            SELECT category, SUM(amount) AS amount
            FROM expenses
            WHERE user_id = ? AND transaction_date >= ? AND amount > 0
            GROUP BY category
            ORDER BY amount DESC
            """,
            (user_id, start_of_month),
        ).fetchall()

        budgets = conn.execute(
            "SELECT category, limit_amount AS limitAmount FROM budgets WHERE user_id = ?",
            (user_id,),
        ).fetchall()

        date_limit = (now - dt.timedelta(days=30)).isoformat()
        trends = conn.execute(
            """
            SELECT transaction_date AS date, SUM(amount) AS amount
            FROM expenses
            WHERE user_id = ? AND transaction_date >= ?
            GROUP BY transaction_date
            ORDER BY transaction_date ASC
            """,
            (user_id, date_limit),
        ).fetchall()

        recent = conn.execute(
            """
            SELECT id, amount, category, description, merchant, payment_method, transaction_date, created_at
            FROM expenses
            WHERE user_id = ?
            ORDER BY transaction_date DESC, created_at DESC
            LIMIT 10
            """,
            (user_id,),
        ).fetchall()

    total_spent = float(spent_row["total"] or 0)
    total_income = abs(float(income_row["total"] or 0))

    return {
        "monthlyBudget": float(user["monthly_budget"] or 0),
        "currency": user["currency_preference"] or "USD",
        "totalSpent": total_spent,
        "totalIncome": total_income,
        "net": total_income - total_spent,
        "categoryTotals": [dict(r) for r in category_totals],
        "budgets": [dict(r) for r in budgets],
        "trends": [dict(r) for r in trends],
        "recent": [dict(r) for r in recent],
    }


def set_category_budget(user_id: str, category: str, limit_amount: float) -> None:
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO budgets (id, user_id, category, limit_amount)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, category) DO UPDATE SET limit_amount = excluded.limit_amount
            """,
            (str(uuid.uuid4()), user_id, category, float(limit_amount)),
        )


def get_chat_history(user_id: str) -> list[dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, role, content, created_at FROM chat_history WHERE user_id = ? ORDER BY created_at ASC",
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def add_chat_message(user_id: str, role: str, content: str) -> None:
    with get_db() as conn:
        conn.execute(
            "INSERT INTO chat_history (id, user_id, role, content) VALUES (?, ?, ?, ?)",
            (str(uuid.uuid4()), user_id, role, content),
        )


def clear_chat_history(user_id: str) -> None:
    with get_db() as conn:
        conn.execute("DELETE FROM chat_history WHERE user_id = ?", (user_id,))


def get_gemini_model() -> Any:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("AMBIENT_GEMINI_API_KEY")
    if not api_key or genai is None:
        return None
    try:
        genai.configure(api_key=api_key)
        return genai.GenerativeModel("gemini-1.5-flash")
    except Exception:
        return None


def strip_code_fences(text: str) -> str:
    text = re.sub(r"^```json", "", text.strip(), flags=re.IGNORECASE)
    text = re.sub(r"^```", "", text.strip())
    text = re.sub(r"```$", "", text.strip())
    return text.strip()


def detect_tesseract_binary() -> str | None:
    configured_path = os.getenv("TESSERACT_CMD") or os.getenv("TESSERACT_PATH")
    if configured_path and Path(configured_path).exists():
        return configured_path

    detected_path = shutil.which("tesseract")
    if detected_path:
        return detected_path

    if os.name == "nt":
        possible_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            str(Path.home() / r"AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
        ]
        for path in possible_paths:
            if Path(path).exists():
                return path
    else:
        for path in ("/usr/bin/tesseract", "/usr/local/bin/tesseract"):
            if Path(path).exists():
                return path

    return None


def configure_tesseract_binary() -> str | None:
    if pytesseract is None:
        return None

    binary_path = detect_tesseract_binary()
    if binary_path:
        pytesseract.pytesseract.tesseract_cmd = binary_path
    return binary_path


TOTAL_LABEL_PATTERNS = [
    r"grand\s*total",
    r"net\s*payable",
    r"amount\s*due",
    r"balance\s*due",
    r"amount\s*payable",
    r"\btotal\b",
]

TAX_LABEL_PATTERNS = [r"sales\s*tax", r"tax", r"gst", r"vat", r"service\s*tax"]

DATE_PATTERNS = [
    r"\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b",
    r"\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b",
    r"\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}\b",
    r"\b[A-Za-z]{3,9}\s+\d{1,2},\s*\d{2,4}\b",
]

IGNORE_LINE_PATTERNS = [
    r"thank\s*you",
    r"receipt",
    r"invoice",
    r"subtotal",
    r"sub\s*total",
    r"change",
    r"cash\s*tender",
    r"payment",
    r"card\s*ending",
    r"auth",
    r"phone",
    r"address",
]

ITEM_IGNORE_PATTERNS = [
    r"\bdate\b",
    r"\btime\b",
    r"\bgstin\b",
    r"\bcustomer\b",
    r"\bpayment\b",
    r"\bmode\b",
    r"\btable\b",
    r"\breceipt\b",
    r"\btax\b",
    r"\bsubtotal\b",
    r"\btotal\b",
]

ADDRESS_HINT_PATTERNS = [
    r"\broad\b",
    r"\brd\b",
    r"\bstreet\b",
    r"\bst\b",
    r"\bavenue\b",
    r"\bave\b",
    r"\blane\b",
    r"\bln\b",
    r"\bsector\b",
    r"\bblock\b",
    r"\bcolony\b",
    r"\blocality\b",
    r"\bdistrict\b",
    r"\bvillage\b",
    r"\bcity\b",
    r"\bstate\b",
    r"\bpin\b",
    r"\bpincode\b",
    r"\bpostal\b",
    r"\bopp(?:osite)?\b",
    r"\bnear\b",
    r"\bshop\s*no\b",
    r"\bplot\b",
    r"\btower\b",
    r"\bbuilding\b",
    r"\bmall\b",
    r"\bfloor\b",
]


def preprocess_receipt_image(image: Image.Image) -> Image.Image:
    if cv2 is None or np is None:
        resized = image.convert("RGB").resize(
            (max(image.width * 2, 1), max(image.height * 2, 1))
        )
        grayscale = ImageOps.grayscale(resized)
        sharpened = grayscale.filter(ImageFilter.SHARPEN)
        thresholded = sharpened.point(lambda pixel: 255 if pixel > 160 else 0)
        return thresholded

    rgb_image = np.array(image.convert("RGB"))
    resized = cv2.resize(rgb_image, None, fx=2.2, fy=2.2, interpolation=cv2.INTER_CUBIC)
    grayscale = cv2.cvtColor(resized, cv2.COLOR_RGB2GRAY)
    sharpen_kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    sharpened = cv2.filter2D(grayscale, -1, sharpen_kernel)
    thresholded = cv2.threshold(sharpened, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    return Image.fromarray(thresholded)


def normalize_amount_text(value: str) -> float | None:
    cleaned = re.sub(r"[^\d.,]", "", value or "")
    cleaned = cleaned.replace(",", "")
    if not cleaned:
        return None
    try:
        parsed = float(cleaned)
        return parsed if parsed >= 0 else None
    except ValueError:
        return None


def extract_currency_amounts(text: str) -> list[float]:
    matches = re.findall(r"(?:[$€£₹]\s*)?(\d[\d,]*(?:\.\d{1,2})?)", text or "")
    amounts: list[float] = []
    for match in matches:
        amount = normalize_amount_text(match)
        if amount is not None:
            amounts.append(amount)
    return amounts


def parse_date_value(raw_date: str | None) -> str | None:
    if not raw_date:
        return None

    cleaned = raw_date.strip().replace(",", "")
    date_formats = [
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%d-%m-%Y",
        "%m-%d-%Y",
        "%d %b %Y",
        "%d %B %Y",
        "%b %d %Y",
        "%B %d %Y",
        "%d %b %y",
        "%d %B %y",
    ]

    for date_format in date_formats:
        try:
            return dt.datetime.strptime(cleaned, date_format).date().isoformat()
        except ValueError:
            continue
    return None


def extract_merchant_name(lines: list[str]) -> str:
    candidates: list[tuple[int, str]] = []
    for index, line in enumerate(lines[:8]):
        cleaned = line.strip(" ,:-|\t")
        if not cleaned:
            continue
        lower = cleaned.lower()
        if any(re.search(pattern, lower) for pattern in IGNORE_LINE_PATTERNS):
            continue
        if any(re.search(pattern, lower) for pattern in DATE_PATTERNS):
            continue
        if extract_currency_amounts(cleaned):
            continue
        letters = sum(1 for char in cleaned if char.isalpha())
        if letters < 3:
            continue
        score = 0
        if index == 0:
            score += 3
        if cleaned.isupper():
            score += 2
        if len(cleaned.split()) <= 6:
            score += 1
        if letters / max(len(cleaned), 1) > 0.55:
            score += 1
        if any(char.isdigit() for char in cleaned):
            score -= 1
        candidates.append((score, cleaned))

    if not candidates:
        return "Unknown Merchant"

    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]


def extract_label_amount(lines: list[str], label_patterns: list[str]) -> float | None:
    for line in reversed(lines):
        lower = line.lower()
        if "subtotal" in lower or "sub total" in lower:
            continue
        if not any(re.search(pattern, lower) for pattern in label_patterns):
            continue
        amounts = extract_currency_amounts(line)
        if amounts:
            return amounts[-1]
    return None


def parse_item_lines(lines: list[str], total_amount: float | None = None) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    seen: set[tuple[str, float]] = set()

    item_patterns = [
        re.compile(
            r"^\s*(?P<qty>\d+(?:\.\d+)?)\s*[xX]\s*(?P<name>[A-Za-z][A-Za-z0-9&'\-/(),.\s]{1,}?)\s+(?P<amount>[€£₹$]?\s*\d[\d,]*(?:\.\d{1,2})?|\d{4,6})\s*$"
        ),
        re.compile(
            r"^\s*(?P<name>[A-Za-z][A-Za-z0-9&'\-/(),.\s]{1,}?)\s+(?P<amount>[€£₹$]?\s*\d[\d,]*(?:\.\d{1,2})?|\d{4,6})\s*$"
        ),
    ]

    def clean_item_name(value: str) -> str:
        cleaned_value = re.sub(r"^\s*\d+(?:\.\d+)?\s*[xX]\s*", "", value or "")
        cleaned_value = re.sub(r"^[^A-Za-z]+", "", cleaned_value)
        cleaned_value = re.sub(r"[^A-Za-z0-9&'\-/(),.\s]+", " ", cleaned_value)
        cleaned_value = re.sub(r"\s{2,}", " ", cleaned_value).strip(" -:.,")
        return cleaned_value

    def normalize_item_price(value: str, line_text: str) -> float | None:
        cleaned_price = re.sub(r"[^\d.,]", "", value or "")
        if not cleaned_price:
            return None

        if "." in cleaned_price or "," in cleaned_price:
            parsed = normalize_amount_text(cleaned_price)
            return parsed

        digits_only = re.sub(r"\D", "", cleaned_price)
        if not digits_only:
            return None

        if len(digits_only) >= 4:
            parsed_value = float(f"{digits_only[:-2]}.{digits_only[-2:]}")
        else:
            parsed_value = float(digits_only)

        if parsed_value <= 0:
            return None

        if total_amount is not None and parsed_value > (total_amount * 10):
            return None

        return parsed_value

    def confidence_score(line_text: str, item_name: str, amount_value: float | None, has_qty: bool) -> float:
        if amount_value is None:
            return 0.0

        score = 0.45
        lower_line = line_text.lower()
        alphabetic_count = sum(1 for char in item_name if char.isalpha())
        digit_count = sum(1 for char in line_text if char.isdigit())
        symbol_count = sum(1 for char in line_text if not char.isalnum() and not char.isspace())

        if alphabetic_count >= 3:
            score += 0.2
        if alphabetic_count >= 5:
            score += 0.1
        if has_qty:
            score += 0.1
        if len(item_name.split()) >= 1:
            score += 0.05
        if 4 <= len(line_text) <= 60:
            score += 0.05
        if any(re.search(pattern, lower_line) for pattern in ADDRESS_HINT_PATTERNS):
            score -= 0.35
        if digit_count > 8:
            score -= 0.15
        if symbol_count > 5:
            score -= 0.1
        if any(re.search(pattern, lower_line) for pattern in ITEM_IGNORE_PATTERNS):
            score -= 0.5

        return max(0.0, min(score, 1.0))

    item_records: list[tuple[int, dict[str, Any]]] = []

    for line_index, line in enumerate(lines):
        cleaned = line.strip(" ,:-|\t")
        if not cleaned:
            continue
        lower = cleaned.lower()
        if any(re.search(pattern, lower) for pattern in IGNORE_LINE_PATTERNS + TOTAL_LABEL_PATTERNS + TAX_LABEL_PATTERNS + ITEM_IGNORE_PATTERNS):
            continue
        if any(re.search(pattern, lower) for pattern in DATE_PATTERNS):
            continue
        if any(re.search(pattern, lower) for pattern in ADDRESS_HINT_PATTERNS):
            continue

        if not extract_currency_amounts(cleaned) and not re.search(r"\d{4,6}$", cleaned):
            continue

        match = None
        for pattern in item_patterns:
            match = pattern.match(cleaned)
            if match:
                break

        if not match:
            continue

        item_name = clean_item_name(match.group("name"))
        amount = normalize_item_price(match.group("amount"), cleaned)
        if not item_name or amount is None:
            continue
        if total_amount is not None and abs(amount - total_amount) < 0.01:
            continue
        if amount <= 0:
            continue

        qty_raw = match.groupdict().get("qty")
        has_qty = bool(qty_raw)
        if qty_raw:
            try:
                qty_value = float(qty_raw)
            except ValueError:
                qty_value = None
            if qty_value and qty_value != 1:
                item_name = item_name

        score = confidence_score(cleaned, item_name, amount, has_qty)
        if score < 0.62:
            continue

        key = (item_name.lower(), round(amount, 2))
        if key in seen:
            continue
        seen.add(key)
        item_records.append(
            (
                line_index,
                {
                    "name": item_name,
                    "price": round(amount, 2),
                },
            )
        )

    item_records.sort(key=lambda record: record[0])
    return [record[1] for record in item_records]


def extract_receipt_from_text(raw_text: str) -> dict[str, Any]:
    lines = [line.strip() for line in (raw_text or "").splitlines() if line.strip()]
    amount_lines = [
        line
        for line in lines
        if not any(re.search(pattern, line, flags=re.IGNORECASE) for pattern in DATE_PATTERNS)
    ]
    all_amounts: list[float] = []
    for line in amount_lines:
        all_amounts.extend(extract_currency_amounts(line))
    total_amount = extract_label_amount(lines, TOTAL_LABEL_PATTERNS)
    tax_amount = extract_label_amount(lines, TAX_LABEL_PATTERNS)
    date_value = None

    for line in lines:
        for pattern in DATE_PATTERNS:
            match = re.search(pattern, line, flags=re.IGNORECASE)
            if match:
                date_value = parse_date_value(match.group(0))
                if date_value:
                    break
        if date_value:
            break

    if total_amount is None and all_amounts:
        total_amount = max(all_amounts)

    items = parse_item_lines(lines, total_amount=total_amount)
    merchant = extract_merchant_name(lines)

    return {
        "merchant": merchant,
        "amount": round(total_amount or 0.0, 2),
        "tax": round(tax_amount or 0.0, 2),
        "date": date_value or dt.date.today().isoformat(),
        "items": items,
    }


def extract_receipt_with_gemini(image: Image.Image, raw_text: str) -> dict[str, Any] | None:
    model = get_gemini_model()
    if not model:
        return None

    try:
        prompt = (
            "You are extracting structured data from a receipt. "
            "Return strict JSON with keys merchant, amount, tax, date, items. "
            "If items are visible, include objects with name and price. "
            "Use the OCR text as supporting context, but correct obvious OCR mistakes.\n\n"
            f"OCR text:\n{raw_text or '[no OCR text]'}"
        )
        response = model.generate_content([prompt, image])
        payload = json.loads(strip_code_fences(response.text or "{}"))

        parsed_items = []
        for item in payload.get("items", []) or []:
            if not isinstance(item, dict):
                continue
            price = normalize_amount_text(str(item.get("price", "")))
            name = str(item.get("name", "")).strip()
            if name and price is not None:
                parsed_items.append({"name": name, "price": round(price, 2)})

        return {
            "merchant": str(payload.get("merchant", "")).strip() or None,
            "amount": normalize_amount_text(str(payload.get("amount", ""))),
            "tax": normalize_amount_text(str(payload.get("tax", ""))),
            "date": parse_date_value(str(payload.get("date", ""))) or None,
            "items": parsed_items,
        }
    except Exception:
        return None


def merge_receipt_data(local_data: dict[str, Any], gemini_data: dict[str, Any] | None) -> dict[str, Any]:
    if not gemini_data:
        result = dict(local_data)
        result["source"] = "pytesseract+regex"
        return result

    merged = dict(local_data)

    if gemini_data.get("merchant") and gemini_data.get("merchant") != "Unknown Merchant":
        merged["merchant"] = gemini_data["merchant"]

    if gemini_data.get("amount") not in (None, 0, 0.0):
        merged["amount"] = float(gemini_data["amount"])

    if gemini_data.get("tax") not in (None, 0, 0.0):
        merged["tax"] = float(gemini_data["tax"])

    if gemini_data.get("date"):
        merged["date"] = gemini_data["date"]

    if gemini_data.get("items"):
        merged["items"] = gemini_data["items"]

    merged["source"] = "pytesseract+regex+gemini"
    return merged


def parse_receipt(uploaded_file: Any) -> dict[str, Any]:
    try:
        if isinstance(uploaded_file, (bytes, bytearray)):
            image_bytes = bytes(uploaded_file)
        elif hasattr(uploaded_file, "getvalue"):
            image_bytes = uploaded_file.getvalue()
        else:
            image_bytes = uploaded_file.read()
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
    except Exception as error:
        return {
            "merchant": "Unknown Merchant",
            "amount": 0.0,
            "tax": 0.0,
            "date": dt.date.today().isoformat(),
            "items": [],
            "raw_text": "",
            "ocr_notes": ["OCR started", f"Unable to open image: {error}"],
            "source": "error",
        }

    notes: list[str] = ["OCR started"]
    raw_text = ""

    try:
        processed_image = preprocess_receipt_image(image)
        tesseract_binary = configure_tesseract_binary()
        tesseract_errors: list[str] = []

        if pytesseract is None:
            tesseract_errors.append("pytesseract is not installed in this environment.")
            notes.append("Tesseract not available")
        elif not tesseract_binary:
            tesseract_errors.append(
                "Tesseract binary was not found. Using regex fallback; install Tesseract locally or add tesseract-ocr packages on Streamlit Cloud."
            )
            notes.append("Tesseract not detected")
        else:
            notes.append(f"Tesseract detected: {tesseract_binary}")
            ocr_configs = ["--psm 6", "--psm 11", "--psm 4"]
            for config in ocr_configs:
                try:
                    candidate_text = pytesseract.image_to_string(processed_image, config=config)
                    if candidate_text and candidate_text.strip():
                        raw_text = candidate_text.strip()
                        notes.append(f"Local OCR succeeded with {config}.")
                        break
                except Exception as error:
                    tesseract_errors.append(f"{config}: {error}")

            if not raw_text:
                notes.append("Local OCR did not produce readable text; trying Gemini fallback.")
                if tesseract_errors:
                    notes.extend(tesseract_errors[:2])

        if tesseract_errors and not raw_text:
            notes.extend(tesseract_errors[:2])

        local_data = extract_receipt_from_text(raw_text)
        gemini_data = extract_receipt_with_gemini(image, raw_text)
        if gemini_data is not None:
            notes.append("Gemini fallback used")
        receipt = merge_receipt_data(local_data, gemini_data)

        if not raw_text:
            notes.append("No raw OCR text was recovered from the uploaded image.")

        receipt["raw_text"] = raw_text
        notes.append("OCR completed")
        receipt["ocr_notes"] = notes
        return receipt
    except Exception as error:
        fallback = extract_receipt_from_text(raw_text)
        fallback.update(
            {
                "raw_text": raw_text,
                "ocr_notes": notes + [f"OCR pipeline failed: {error}"],
                "source": "regex-fallback",
            }
        )
        return fallback


def ai_chat_reply(user_message: str, expenses: list[dict[str, Any]], monthly_budget: float) -> str:
    model = get_gemini_model()
    total_spent = sum(float(e["amount"]) for e in expenses if float(e["amount"]) > 0)

    if not model:
        msg = user_message.lower()
        category_totals: dict[str, float] = {}
        for row in expenses:
            amt = float(row["amount"])
            if amt <= 0:
                continue
            category = row["category"]
            category_totals[category] = category_totals.get(category, 0.0) + amt

        if "food" in msg:
            spent = category_totals.get("Food", 0.0)
            return f"You have spent ${spent:.2f} on Food this month."
        if "reduce" in msg or "save" in msg:
            if category_totals:
                top_category = max(category_totals, key=category_totals.get)
                return (
                    f"Your highest spending category is {top_category} (${category_totals[top_category]:.2f}). "
                    "Reducing this category gives the fastest savings impact."
                )
            return "You have no expenses yet. Add transactions and I can suggest savings actions."
        if "forecast" in msg or "predict" in msg:
            return f"At your current pace, projected spending is about ${total_spent * 1.05:.2f} next month."
        return (
            f"You currently have {len(expenses)} transactions totaling ${total_spent:.2f} in expenses. "
            "Ask me about categories, savings, or forecasts."
        )

    try:
        expenses_summary = "\n".join(
            f"{row['amount']} | {row['category']} | {row['merchant']} | {row['description']} | {row['transaction_date']}"
            for row in expenses[:200]
        )
        prompt = (
            "You are a financial assistant. Keep responses concise and practical.\n"
            f"Monthly Budget: {monthly_budget}\n"
            f"Transactions:\n{expenses_summary}\n"
            f"User question: {user_message}"
        )
        response = model.generate_content(prompt)
        return (response.text or "I could not generate a response.").strip()
    except Exception:
        return "I could not generate a response right now."


def generate_ai_insights(user: dict[str, Any], expenses: list[dict[str, Any]], budgets: list[dict[str, Any]]) -> dict[str, Any]:
    total_spent = sum(float(e["amount"]) for e in expenses if float(e["amount"]) > 0)
    monthly_budget = float(user.get("monthly_budget") or 0)

    category_totals: dict[str, float] = {}
    for e in expenses:
        amount = float(e["amount"])
        if amount <= 0:
            continue
        category_totals[e["category"]] = category_totals.get(e["category"], 0.0) + amount

    insights = [
        f"Total spending this month is ${total_spent:.2f} against a budget of ${monthly_budget:.2f}."
    ]

    if monthly_budget > 0 and total_spent > monthly_budget:
        insights.append(f"You are over budget by ${total_spent - monthly_budget:.2f}.")
    elif monthly_budget > 0:
        insights.append(f"Budget remaining: ${monthly_budget - total_spent:.2f}.")

    if category_totals:
        top_category = max(category_totals, key=category_totals.get)
        insights.append(f"Highest spending category: {top_category} (${category_totals[top_category]:.2f}).")

    anomalies = []
    threshold = monthly_budget * 0.075 if monthly_budget else 150
    for e in expenses:
        amount = float(e["amount"])
        if amount > threshold:
            anomalies.append(
                {
                    "id": e["id"],
                    "merchant": e.get("merchant", "Unknown"),
                    "amount": amount,
                    "category": e["category"],
                    "reason": "Large single transaction compared to budget.",
                }
            )

    for budget in budgets:
        spent = category_totals.get(budget["category"], 0.0)
        limit = float(budget["limitAmount"])
        if spent > limit:
            insights.append(
                f"Category {budget['category']} exceeded budget by ${spent - limit:.2f}."
            )

    return {
        "insights": insights,
        "summary": " ".join(insights[:2]) if insights else "No insights available.",
        "anomalies": anomalies[:10],
    }


def currency_symbol(code: str) -> str:
    return {
        "USD": "$",
        "EUR": "EUR ",
        "GBP": "GBP ",
        "INR": "INR ",
        "JPY": "JPY ",
        "CAD": "CAD ",
    }.get(code, "$")


def show_login_register() -> None:
    st.title("Expense Tracker - Streamlit")
    st.caption("Single-app replacement for the React + Node frontend experience.")

    login_tab, register_tab = st.tabs(["Login", "Register"])

    with login_tab:
        with st.form("login_form"):
            email = st.text_input("Email")
            password = st.text_input("Password", type="password")
            submitted = st.form_submit_button("Login")
            if submitted:
                ok, user, msg = login_user(email, password)
                if ok and user:
                    st.session_state.user_id = user["id"]
                    st.success(msg)
                    st.rerun()
                else:
                    st.error(msg)

    with register_tab:
        with st.form("register_form"):
            name = st.text_input("Full Name")
            email = st.text_input("Email", key="register_email")
            password = st.text_input("Password", type="password", key="register_password")
            currency = st.selectbox("Currency", CURRENCY_OPTIONS)
            monthly_budget = st.number_input("Monthly Budget", min_value=0.0, value=2000.0, step=50.0)
            submitted = st.form_submit_button("Create Account")
            if submitted:
                ok, msg = register_user(name, email, password, currency, monthly_budget)
                if ok:
                    st.success(msg)
                else:
                    st.error(msg)


def show_dashboard(user: dict[str, Any]) -> None:
    st.header("Dashboard")
    stats = get_dashboard_stats(user["id"])
    symbol = currency_symbol(stats.get("currency", "USD"))

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Monthly Budget", f"{symbol}{stats['monthlyBudget']:.2f}")
    c2.metric("Total Expenses", f"{symbol}{stats['totalSpent']:.2f}")
    c3.metric("Total Income", f"{symbol}{stats['totalIncome']:.2f}")
    c4.metric("Net", f"{symbol}{stats['net']:.2f}")

    if stats["categoryTotals"]:
        cat_df = pd.DataFrame(stats["categoryTotals"])
        if px is not None:
            st.plotly_chart(
                px.pie(cat_df, names="category", values="amount", title="Expense by Category"),
                use_container_width=True,
            )
        else:
            st.bar_chart(cat_df.set_index("category")["amount"], use_container_width=True)

    if stats["trends"]:
        trend_df = pd.DataFrame(stats["trends"])
        trend_df["date"] = pd.to_datetime(trend_df["date"])
        if px is not None:
            st.plotly_chart(
                px.line(trend_df, x="date", y="amount", title="30-Day Net Cashflow Trend"),
                use_container_width=True,
            )
        else:
            st.line_chart(trend_df.set_index("date")["amount"], use_container_width=True)

    st.subheader("Recent Transactions")
    recent_df = pd.DataFrame(stats["recent"]) if stats["recent"] else pd.DataFrame()
    if not recent_df.empty:
        recent_df = recent_df.rename(
            columns={
                "payment_method": "paymentMethod",
                "transaction_date": "transactionDate",
                "created_at": "createdAt",
            }
        )
        recent_df["type"] = recent_df["amount"].apply(lambda v: "Income" if float(v) < 0 else "Expense")
        st.dataframe(recent_df[["transactionDate", "type", "amount", "category", "merchant", "description"]], use_container_width=True)
    else:
        st.info("No transactions yet.")

    st.subheader("AI Insights")
    if st.button("Generate Insights"):
        expenses = get_transactions(user["id"])
        budgets = stats["budgets"]
        insights = generate_ai_insights(user, expenses, budgets)
        st.write(insights["summary"])
        for line in insights["insights"]:
            st.write(f"- {line}")
        if insights["anomalies"]:
            st.write("Anomalies:")
            st.dataframe(pd.DataFrame(insights["anomalies"]), use_container_width=True)


def show_add_forms(user: dict[str, Any]) -> None:
    st.header("Add Transactions")
    expense_tab, income_tab = st.tabs(["Expense form", "Income form"])

    with expense_tab:
        with st.form("expense_form"):
            amount = st.number_input("Amount", min_value=0.01, value=10.0, step=1.0, key="expense_amount")
            merchant = st.text_input("Merchant", key="expense_merchant")
            description = st.text_input("Description", key="expense_description")
            category = st.selectbox("Category", CATEGORIES, key="expense_category")
            payment_method = st.selectbox("Payment Method", PAYMENT_METHODS, key="expense_method")
            transaction_date = st.date_input("Transaction Date", value=dt.date.today(), key="expense_date")
            auto_categorize = st.checkbox("Auto categorize with backend logic", value=False)
            submitted = st.form_submit_button("Save Expense")

            if submitted:
                chosen_category = category
                if auto_categorize:
                    chosen_category = categorize_expense(merchant, description, amount)["category"]
                result = add_transaction(
                    user_id=user["id"],
                    amount=float(amount),
                    category=chosen_category,
                    description=description,
                    merchant=merchant,
                    payment_method=payment_method,
                    transaction_date=transaction_date.isoformat(),
                )
                if result["detected_duplicate"]:
                    st.warning("Potential duplicate transaction detected, but saved.")
                st.success("Expense saved.")

    with income_tab:
        with st.form("income_form"):
            amount = st.number_input("Income Amount", min_value=0.01, value=1000.0, step=10.0, key="income_amount")
            source = st.text_input("Source", value="Income", key="income_source")
            description = st.text_input("Description", value="Salary", key="income_description")
            transaction_date = st.date_input("Received Date", value=dt.date.today(), key="income_date")
            submitted = st.form_submit_button("Save Income")
            if submitted:
                add_transaction(
                    user_id=user["id"],
                    amount=-abs(float(amount)),
                    category="Income",
                    description=description,
                    merchant=source,
                    payment_method="Bank Transfer",
                    transaction_date=transaction_date.isoformat(),
                )
                st.success("Income saved.")


def show_transaction_history(user: dict[str, Any]) -> None:
    st.header("Transaction History")

    col1, col2, col3 = st.columns(3)
    with col1:
        category = st.selectbox("Category", ["All"] + CATEGORIES + ["Income"], index=0)
    with col2:
        payment_method = st.selectbox("Payment Method", ["All"] + PAYMENT_METHODS)
    with col3:
        search = st.text_input("Search merchant/description")

    date_col1, date_col2 = st.columns(2)
    with date_col1:
        start_date = st.date_input("From", value=dt.date.today().replace(day=1))
    with date_col2:
        end_date = st.date_input("To", value=dt.date.today())

    rows = get_transactions(
        user["id"],
        category=category,
        payment_method=payment_method,
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        search=search,
    )

    if not rows:
        st.info("No transactions found for the selected filters.")
        return

    df = pd.DataFrame(rows)
    df["type"] = df["amount"].apply(lambda v: "Income" if float(v) < 0 else "Expense")
    df["displayAmount"] = df["amount"].apply(lambda v: abs(float(v)))
    st.dataframe(
        df[["id", "transaction_date", "type", "displayAmount", "category", "merchant", "description", "payment_method"]],
        use_container_width=True,
    )

    st.subheader("Delete Transaction")
    tx_id = st.selectbox("Select transaction ID", df["id"].tolist())
    if st.button("Delete Selected Transaction"):
        if delete_transaction(user["id"], tx_id):
            st.success("Transaction deleted.")
            st.rerun()
        else:
            st.error("Could not delete transaction.")


def show_budgets(user: dict[str, Any]) -> None:
    st.header("Category Budgets")
    stats = get_dashboard_stats(user["id"])
    budgets_df = pd.DataFrame(stats["budgets"]) if stats["budgets"] else pd.DataFrame(columns=["category", "limitAmount"])
    if not budgets_df.empty:
        st.dataframe(budgets_df, use_container_width=True)

    with st.form("budget_form"):
        category = st.selectbox("Category", CATEGORIES)
        limit_amount = st.number_input("Monthly Limit", min_value=0.0, value=100.0, step=10.0)
        submitted = st.form_submit_button("Save Budget")
        if submitted:
            set_category_budget(user["id"], category, limit_amount)
            st.success("Budget saved.")
            st.rerun()


def show_ai_assistant(user: dict[str, Any]) -> None:
    st.header("AI Assistant")
    history = get_chat_history(user["id"])

    for message in history:
        role = "assistant" if message["role"] == "assistant" else "user"
        with st.chat_message(role):
            st.write(message["content"])

    prompt = st.chat_input("Ask about your spending...")
    if prompt:
        add_chat_message(user["id"], "user", prompt)
        expenses = get_transactions(user["id"])
        reply = ai_chat_reply(prompt, expenses, float(user.get("monthly_budget") or 0))
        add_chat_message(user["id"], "assistant", reply)
        st.rerun()

    if st.button("Clear Chat History"):
        clear_chat_history(user["id"])
        st.success("Chat history cleared.")
        st.rerun()


def show_ocr_scanner(user: dict[str, Any]) -> None:
    st.header("OCR Receipt Scanner")
    uploaded = st.file_uploader("Upload receipt image", type=["png", "jpg", "jpeg", "webp"])

    st.session_state.setdefault("parsed_receipt", None)
    st.session_state.setdefault("raw_ocr_text", "")
    st.session_state.setdefault("ocr_debug_logs", [])

    if uploaded is not None:
        st.image(uploaded, caption="Uploaded receipt", use_container_width=True)
        if st.button("Parse Receipt"):
            try:
                with st.spinner("Parsing receipt..."):
                    image_bytes = uploaded.getvalue() if hasattr(uploaded, "getvalue") else uploaded.read()
                    st.session_state.ocr_debug_logs = ["OCR started"]
                    data = parse_receipt(image_bytes)
                    st.session_state.parsed_receipt = data
                    st.session_state.raw_ocr_text = data.get("raw_text", "")
                    st.session_state.receipt_data = data
                    st.session_state.ocr_debug_logs = data.get("ocr_notes", st.session_state.ocr_debug_logs)
                    st.success("Receipt parsed successfully.")
                    st.rerun()
            except Exception as error:
                st.error(f"OCR failed: {error}")
                st.session_state.ocr_debug_logs = st.session_state.get("ocr_debug_logs", []) + [
                    f"OCR pipeline failed: {error}"
                ]

    data = st.session_state.get("parsed_receipt") or st.session_state.get("receipt_data")
    if not data:
        return

    st.subheader("Parsed Receipt")
    st.json(data)

    debug_logs = st.session_state.get("ocr_debug_logs") or data.get("ocr_notes") or []
    if debug_logs:
        for note in debug_logs:
            lower_note = note.lower()
            if "not found" in lower_note or "not installed" in lower_note or "not detected" in lower_note or "failed" in lower_note:
                st.warning(note)
            else:
                st.caption(note)

    with st.expander("Raw OCR text", expanded=False):
        st.text(st.session_state.get("raw_ocr_text") or data.get("raw_text") or "No OCR text recovered.")

    default_description = "Parsed receipt"
    if data.get("items"):
        items_text = ", ".join(
            f"{item.get('name', 'item')} ({item.get('price', 0)})" for item in data["items"]
        )
        default_description = f"Parsed items: {items_text}"

    with st.form("receipt_to_expense"):
        amount = st.number_input("Amount", min_value=0.0, value=float(data.get("amount", 0.0)))
        merchant = st.text_input("Merchant", value=data.get("merchant", ""))
        description = st.text_input("Description", value=default_description)
        category = st.selectbox("Category", CATEGORIES)
        payment_method = st.selectbox("Payment Method", PAYMENT_METHODS, key="receipt_payment_method")
        transaction_date = st.date_input(
            "Transaction Date",
            value=dt.date.fromisoformat(data.get("date", dt.date.today().isoformat())),
        )
        submitted = st.form_submit_button("Save as Expense")

        if submitted:
            add_transaction(
                user_id=user["id"],
                amount=float(amount),
                category=category,
                description=description,
                merchant=merchant,
                payment_method=payment_method,
                transaction_date=transaction_date.isoformat(),
            )
            st.success("Receipt saved as expense.")


def show_settings(user: dict[str, Any]) -> None:
    st.header("Settings")
    with st.form("profile_form"):
        name = st.text_input("Name", value=user.get("name", ""))
        currency = st.selectbox(
            "Currency",
            CURRENCY_OPTIONS,
            index=max(CURRENCY_OPTIONS.index(user.get("currency_preference", "USD")), 0)
            if user.get("currency_preference", "USD") in CURRENCY_OPTIONS
            else 0,
        )
        monthly_budget = st.number_input(
            "Monthly Budget",
            min_value=0.0,
            value=float(user.get("monthly_budget") or 0),
            step=50.0,
        )
        submitted = st.form_submit_button("Update Profile")
        if submitted:
            update_user_profile(user["id"], name, currency, monthly_budget)
            st.success("Profile updated.")
            st.rerun()


def main() -> None:
    st.set_page_config(page_title="Expense Tracker Streamlit", page_icon="ST", layout="wide")
    init_db()

    if "user_id" not in st.session_state:
        st.session_state.user_id = None

    user_id = st.session_state.user_id
    if not user_id:
        show_login_register()
        st.info("Demo account: demo@example.com / demo123")
        return

    user = get_user(user_id)
    if not user:
        st.session_state.user_id = None
        st.rerun()

    st.sidebar.title("Expense Tracker")
    st.sidebar.write(f"Signed in as: {user['name']}")
    if st.sidebar.button("Logout"):
        st.session_state.user_id = None
        st.rerun()

    page = st.sidebar.radio(
        "Navigate",
        [
            "Dashboard",
            "Add Forms",
            "Transaction History",
            "Budgets",
            "AI Assistant",
            "OCR Scanner",
            "Settings",
        ],
    )

    if page == "Dashboard":
        show_dashboard(user)
    elif page == "Add Forms":
        show_add_forms(user)
    elif page == "Transaction History":
        show_transaction_history(user)
    elif page == "Budgets":
        show_budgets(user)
    elif page == "AI Assistant":
        show_ai_assistant(user)
    elif page == "OCR Scanner":
        show_ocr_scanner(user)
    elif page == "Settings":
        show_settings(user)


if __name__ == "__main__":
    main()
