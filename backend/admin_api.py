
import os
import requests
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
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
# VERIFY SUPABASE AUTH USER
# ============================================================

def get_authenticated_user():
    """
    Verify the Supabase access token sent by the frontend.

    Returns:
        Supabase authenticated user object
        or None when the token is missing/invalid.
    """

    authorization = request.headers.get(
        "Authorization",
        ""
    )

    if not authorization.startswith("Bearer "):
        return None

    access_token = authorization.split(
        " ",
        1
    )[1].strip()

    if not access_token:
        return None

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "Supabase server configuration is missing."
        )

    url = (
        f"{SUPABASE_URL.rstrip('/')}"
        f"/auth/v1/user"
    )

    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {access_token}",
    }

    try:
        response = requests.get(
            url,
            headers=headers,
            timeout=15,
        )
    except requests.RequestException as error:
        print(
            "SUPABASE AUTH ERROR:",
            error
        )
        return None

    if response.status_code != 200:
        print(
            "SUPABASE AUTH VERIFICATION FAILED:",
            response.status_code
        )
        return None

    try:
        return response.json()
    except ValueError:
        return None


# ============================================================
# VERIFY ADMIN ROLE
# ============================================================

def require_admin():
    """
    Verify that the authenticated Supabase user
    has role = admin in the public.users table.

    Returns:
        (user, None) when authorized
        (None, response) when unauthorized
    """

    auth_user = get_authenticated_user()

    if not auth_user:
        return None, (
            jsonify({
                "success": False,
                "error": "Authentication required."
            }),
            401
        )

    auth_user_id = auth_user.get("id")

    if not auth_user_id:
        return None, (
            jsonify({
                "success": False,
                "error": "Invalid authenticated user."
            }),
            401
        )

    users = supabase_get(
        "users",
        {
            "select": "id,auth_user_id,role",
            "auth_user_id": f"eq.{auth_user_id}",
            "limit": "1",
        }
    )

    if not users:
        return None, (
            jsonify({
                "success": False,
                "error": "Admin profile not found."
            }),
            403
        )

    profile = users[0]

    if profile.get("role") != "admin":
        return None, (
            jsonify({
                "success": False,
                "error": "Administrator access required."
            }),
            403
        )

    return auth_user, None


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
        # ADMIN AUTHORIZATION
        # ====================================================

        auth_user, error_response = require_admin()

        if error_response:
            return error_response

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

        return jsonify({
            "success": False,
            "error": "Unable to load admin overview."
        }), 500

