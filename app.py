import datetime as dt
import json
import os
import re
import sqlite3
import uuid
from pathlib import Path
from typing import Any

import bcrypt
import pandas as pd
import plotly.express as px
import streamlit as st
from dotenv import load_dotenv
from PIL import Image

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


def parse_receipt(uploaded_file: Any) -> dict[str, Any]:
    model = get_gemini_model()
    if not model:
        return {
            "merchant": "Unknown Merchant",
            "amount": 0.0,
            "tax": 0.0,
            "date": dt.date.today().isoformat(),
            "items": [],
        }

    try:
        image = Image.open(uploaded_file)
        prompt = (
            "Extract merchant, total amount, tax, date (YYYY-MM-DD), and items from this receipt. "
            "Return strict JSON with keys: merchant, amount, tax, date, items."
        )
        response = model.generate_content([prompt, image])
        payload = json.loads(strip_code_fences(response.text or "{}"))
        return {
            "merchant": payload.get("merchant", "Unknown Merchant"),
            "amount": float(payload.get("amount", 0.0) or 0.0),
            "tax": float(payload.get("tax", 0.0) or 0.0),
            "date": payload.get("date") or dt.date.today().isoformat(),
            "items": payload.get("items", []) or [],
        }
    except Exception:
        return {
            "merchant": "Unknown Merchant",
            "amount": 0.0,
            "tax": 0.0,
            "date": dt.date.today().isoformat(),
            "items": [],
        }


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
        st.plotly_chart(px.pie(cat_df, names="category", values="amount", title="Expense by Category"), use_container_width=True)

    if stats["trends"]:
        trend_df = pd.DataFrame(stats["trends"])
        trend_df["date"] = pd.to_datetime(trend_df["date"])
        st.plotly_chart(px.line(trend_df, x="date", y="amount", title="30-Day Net Cashflow Trend"), use_container_width=True)

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

    if uploaded is not None:
        st.image(uploaded, caption="Uploaded receipt", use_container_width=True)
        if st.button("Parse Receipt"):
            data = parse_receipt(uploaded)
            st.session_state.receipt_data = data

    data = st.session_state.get("receipt_data")
    if not data:
        return

    st.subheader("Parsed Receipt")
    st.json(data)

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
