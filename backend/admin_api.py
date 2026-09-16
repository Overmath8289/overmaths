
import os
import requests
from datetime import datetime, timezone
from flask import Blueprint, jsonify
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# ADMIN BLUEPRINT
# ============================================================

admin_api = Blueprint(
    "admin_api",
    __name__,
    url_prefix="/api/admin"
)

# ============================================================
# SUPABASE
# ============================================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


# ============================================================
# SUPABASE HEADERS
# ============================================================

def supabase_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }


# ============================================================
# SUPABASE GET
# ============================================================

def supabase_get(table, params=None):
    """
    Read data from Supabase using the server-side service key.
    """

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "Supabase server configuration is missing."
        )

    url = (
        f"{SUPABASE_URL.rstrip('/')}"
        f"/rest/v1/{table}"
    )

    response = requests.get(
        url,
        headers=supabase_headers(),
        params=params or {},
        timeout=20,
    )

    if not response.ok:
        print(
            f"SUPABASE ERROR [{table}]:",
            response.status_code,
            response.text
        )

        raise RuntimeError(
            f"Supabase request failed for {table}."
        )

    return response.json()


# ============================================================
# ADMIN OVERVIEW
# ============================================================

@admin_api.route(
    "/overview",
    methods=["GET"]
)
def admin_overview():

    try:

        # ====================================================
        # TOTAL ACTIVE QUESTIONS
        # ====================================================

        questions = supabase_get(
            "questions",
            {
                "select": "id",
                "is_active": "eq.true",
            }
        )

        total_questions = len(
            questions
        )

        # ====================================================
        # REGISTERED STUDENTS
        # ====================================================

        students = supabase_get(
            "users",
            {
                "select": "id",
                "role": "eq.student",
            }
        )

        total_students = len(
            students
        )

        # ====================================================
        # TOTAL QUIZ ATTEMPTS
        # ====================================================

        attempts = supabase_get(
            "quiz_attempts",
            {
                "select": "id",
            }
        )

        total_attempts = len(
            attempts
        )

        # ====================================================
        # ACTIVE SUBSCRIPTIONS
        # ====================================================
        #
        # IMPORTANT:
        # Your actual database column is:
        #
        # expires_at
        #
        # NOT:
        # expire_at
        # ====================================================

        subscriptions = supabase_get(
            "subscriptions",
            {
                "select": "id,expires_at",
            }
        )

        now = datetime.now(
            timezone.utc
        )

        active_subscriptions = 0

        for subscription in subscriptions:

            expires_at = subscription.get(
                "expires_at"
            )

            if not expires_at:
                continue

            try:

                expiry = datetime.fromisoformat(
                    str(expires_at).replace(
                        "Z",
                        "+00:00"
                    )
                )

                if expiry.tzinfo is None:
                    expiry = expiry.replace(
                        tzinfo=timezone.utc
                    )

                if expiry > now:
                    active_subscriptions += 1

            except (ValueError, TypeError) as error:

                print(
                    "INVALID SUBSCRIPTION DATE:",
                    expires_at,
                    error
                )

        # ====================================================
        # RESPONSE
        # ====================================================

        return jsonify({
            "success": True,
            "overview": {
                "total_questions":
                    total_questions,

                "students":
                    total_students,

                "quiz_attempts":
                    total_attempts,

                "active_subscriptions":
                    active_subscriptions,
            }
        })

    except Exception as error:

        print(
            "ADMIN OVERVIEW API ERROR:",
            error
        )

        # Do NOT expose the internal Supabase
        # error details to the administrator.

        return jsonify({
            "success": False,
            "error": "Unable to load admin overview."
        }), 500

