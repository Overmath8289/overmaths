import os
import requests

from flask import Blueprint, jsonify, request
from datetime import datetime, timezone
from dotenv import load_dotenv


load_dotenv()


premium_workspace_api = Blueprint(
    "premium_workspace_api",
    __name__,
    url_prefix="/api/premium-workspace"
)


SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
def supabase_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }


def supabase_get(table, params=None):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "Supabase environment variables are missing."
        )

    url = f"{SUPABASE_URL}/rest/v1/{table}"

    response = requests.get(
        url,
        headers=supabase_headers(),
        params=params or {},
        timeout=20,
    )

    if not response.ok:
        raise RuntimeError(
            f"Supabase request failed for {table}: "
            f"{response.status_code} {response.text}"
        )

    return response.json()
def authenticate_request():
    authorization = request.headers.get("Authorization", "")

    if not authorization.startswith("Bearer "):
        return None, (
            {"success": False, "error": "Please sign in first."},
            401,
        )

    access_token = authorization[len("Bearer "):].strip()

    if not access_token:
        return None, (
            {"success": False, "error": "Access token is missing."},
            401,
        )

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None, (
            {"success": False, "error": "Server configuration error."},
            500,
        )
   
    try:
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {access_token}",
            },
            timeout=15,
        )

        if response.status_code in (401, 403):
            return None, (
                {"success": False, "error": "Your session has expired. Please sign in again."},
                401,
            )

        if not response.ok:
            return None, (
                {"success": False, "error": "Unable to verify your session."},
                503,
            )

        auth_user = response.json()
        auth_user_id = auth_user.get("id")

        if not auth_user_id:
            return None, (
                {"success": False, "error": "Unable to identify your account."},
                401,
            )

        users = supabase_get(
            "users",
            {
                "auth_user_id": f"eq.{auth_user_id}",
                "select": "id,role",
                "limit": "1",
            },
        )

        if not users:
            return None, (
                {"success": False, "error": "Your Overmaths profile was not found."},
                404,
            )

        return users[0], None

    except requests.RequestException as error:
        print("PREMIUM WORKSPACE AUTH ERROR:", error)

        return None, (
            {"success": False, "error": "Authentication service is temporarily unavailable."},
            503,
        )

    except Exception as error:
        print("PREMIUM WORKSPACE ERROR:", error)

        return None, (
            {"success": False, "error": "Unable to authenticate this request."},
            500,
        )


@premium_workspace_api.route("/status", methods=["GET"])
def premium_workspace_status():
    user, auth_error = authenticate_request()

    if auth_error:
        body, status_code = auth_error
        return jsonify(body), status_code

    try:
        return jsonify({
            "success": True,
            "message": "Premium workspace API is connected.",
            "user": {
                "id": user.get("id"),
                "role": user.get("role"),
            },
        }), 200

    except Exception as error:
        print("PREMIUM WORKSPACE STATUS ERROR:", error)

        return jsonify({
            "success": False,
            "error": "Unable to load workspace status.",
        }), 500
