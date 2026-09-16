import os
import requests
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
SUPABASE_SERVICE_KEY = os.getenv(
    "SUPABASE_SERVICE_KEY"
)


# ============================================================
# SUPABASE HELPERS
# ============================================================

def supabase_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }


def supabase_get(table, params=None):
    """
    Read data from Supabase using the
    server-side service key.
    """

    if (
        not SUPABASE_URL
        or not SUPABASE_SERVICE_KEY
    ):
        raise RuntimeError(
            "Supabase environment variables are missing."
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

        raise RuntimeError(
            f"Supabase request failed for "
            f"{table}: "
            f"{response.status_code} "
            f"{response.text}"
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

        # ----------------------------------------------------
        # TOTAL QUESTIONS
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # REGISTERED STUDENTS
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # TOTAL QUIZ ATTEMPTS
        # ----------------------------------------------------

        attempts = supabase_get(
            "quiz_attempts",
            {
                "select": "id",
            }
        )

        total_attempts = len(
            attempts
        )

        # ----------------------------------------------------
        # ACTIVE SUBSCRIPTIONS
        # ----------------------------------------------------

        subscriptions = supabase_get(
            "subscriptions",
            {
                "select": "id,expire_at",
            }
        )

        # ----------------------------------------------------
        # Count subscriptions whose expiry
        # date has not passed.
        #
        # We initially keep this simple.
        # We will improve subscription handling
        # in subscription_api.py later.
        # ----------------------------------------------------

        from datetime import datetime, timezone

        now = datetime.now(
            timezone.utc
        )

        active_subscriptions = 0

        for subscription in subscriptions:

            expire_at = subscription.get(
                "expire_at"
            )

            if not expire_at:
                continue

            try:

                expiry = datetime.fromisoformat(
                    expire_at.replace(
                        "Z",
                        "+00:00"
                    )
                )

                if expiry > now:
                    active_subscriptions += 1

            except Exception:

                continue

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

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

        return jsonify({

            "success": False,

            "error": str(error),

        }), 500import os
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
SUPABASE_SERVICE_KEY = os.getenv(
    "SUPABASE_SERVICE_KEY"
)

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
    Read data from Supabase using the
    server-side service key.
    """

    if (
        not SUPABASE_URL
        or not SUPABASE_SERVICE_KEY
    ):
        raise RuntimeError(
            "Supabase environment variables are missing."
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
        raise RuntimeError(
            f"Supabase request failed for "
            f"{table}: "
            f"{response.status_code} "
            f"{response.text}"
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
        # The actual Supabase column is:
        #
        # subscriptions.expires_at
        #
        # NOT expire_at.
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
                    expires_at.replace(
                        "Z",
                        "+00:00"
                    )
                )

                # Make sure timezone information exists
                if expiry.tzinfo is None:
                    expiry = expiry.replace(
                        tzinfo=timezone.utc
                    )

                if expiry > now:
                    active_subscriptions += 1

            except Exception as error:

                print(
                    "SUBSCRIPTION DATE ERROR:",
                    expires_at,
                    error
                )

                continue

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

        return jsonify({
            "success": False,
            "error": str(error),
        }), 500