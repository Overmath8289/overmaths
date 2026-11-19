
"""
Performance & Readiness API
---------------------------
Independent API for the Overmaths Performance & Readiness page.

This module:
1. Authenticates the student.
2. Resolves the student's public.users ID.
3. Retrieves the student's completed quiz attempts.
4. Retrieves their saved answers and matching questions.
5. Passes the records to performance_readiness_engine.py.

It does not modify existing quiz or dashboard APIs.
"""

import os
import requests

from flask import Blueprint, jsonify, request

try:
    from .performance_readiness_engine import (
        build_performance_readiness,
    )
except ImportError:
    from performance_readiness_engine import (
        build_performance_readiness,
    )


performance_readiness_api = Blueprint(
    "performance_readiness_api",
    __name__,
    url_prefix="/api/performance-readiness",
)


# ---------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------

SUPABASE_URL = (
    os.getenv("SUPABASE_URL") or ""
).rstrip("/")

SUPABASE_SERVICE_KEY = (
    os.getenv("SUPABASE_SERVICE_KEY")
    or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or ""
)


# ---------------------------------------------------------
# SUPABASE HELPERS
# ---------------------------------------------------------

def _supabase_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }


def _supabase_get(table, params=None):
    """
    Retrieve records from a Supabase table.
    Raises an exception if Supabase returns an error.
    """

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "Supabase environment variables are not configured."
        )

    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=_supabase_headers(),
        params=params or {},
        timeout=30,
    )

    if not response.ok:
        raise RuntimeError(
            f"Supabase query failed for {table}: "
            f"{response.status_code}"
        )

    data = response.json()

    if not isinstance(data, list):
        raise RuntimeError(
            f"Unexpected response received from {table}."
        )

    return data


def _supabase_get_all(table, params=None, page_size=500):
    """
    Retrieve all matching records using pagination.
    """

    results = []
    offset = 0

    while True:
        headers = _supabase_headers()

        headers["Range-Unit"] = "items"
        headers["Range"] = (
            f"{offset}-{offset + page_size - 1}"
        )

        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers=headers,
            params=params or {},
            timeout=30,
        )

        if not response.ok:
            raise RuntimeError(
                f"Supabase query failed for {table}: "
                f"{response.status_code}"
            )

        batch = response.json()

        if not isinstance(batch, list):
            raise RuntimeError(
                f"Unexpected response received from {table}."
            )

        results.extend(batch)

        if len(batch) < page_size:
            break

        offset += page_size

    return results


def _get_records_by_ids(table, column, ids, fields, batch_size=100):
    """
    Retrieve records using PostgREST IN filters.

    IDs are split into batches to avoid excessively long URLs.
    """

    if not ids:
        return []

    unique_ids = list(dict.fromkeys(ids))
    results = []

    for start in range(0, len(unique_ids), batch_size):
        batch_ids = unique_ids[
            start:start + batch_size
        ]

        id_filter = "in.(" + ",".join(
            str(int(value)) for value in batch_ids
        ) + ")"

        records = _supabase_get_all(
            table,
            params={
                "select": fields,
                column: id_filter,
                "order": "id.asc",
            },
        )

        results.extend(records)

    return results


# ---------------------------------------------------------
# AUTHENTICATION
# ---------------------------------------------------------

def _get_authenticated_supabase_user(access_token):
    """
    Verify the student's access token with Supabase Auth.
    """

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "Supabase environment variables are not configured."
        )

    response = requests.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {access_token}",
        },
        timeout=20,
    )

    if response.status_code != 200:
        return None

    user = response.json()

    if not isinstance(user, dict) or not user.get("id"):
        return None

    return user


def _get_public_user(auth_user_id):
    """
    Resolve auth.users.id to public.users.id.
    """

    users = _supabase_get(
        "users",
        {
            "select": "id,auth_user_id",
            "auth_user_id": f"eq.{auth_user_id}",
            "limit": "1",
        },
    )

    if not users:
        return None

    return users[0]


# ---------------------------------------------------------
# STUDENT DATA RETRIEVAL
# ---------------------------------------------------------

def _get_student_attempts(public_user_id):
    """
    Retrieve only completed attempts belonging to this student.
    """

    return _supabase_get_all(
        "quiz_attempts",
        {
            "select": (
                "id,user_id,score,total_questions,mode,"
                "exam_purpose,exam_title,subjects,"
                "selected_topic,exam_date,target_score,"
                "subject_allocations,started_at,completed_at"
            ),
            "user_id": f"eq.{public_user_id}",
            "completed_at": "not.is.null",
            "order": "completed_at.asc",
        },
    )


def _get_student_answers(attempts):
    """
    Retrieve saved answers belonging to the student's attempts.
    """

    attempt_ids = [
        attempt.get("id")
        for attempt in attempts
        if attempt.get("id") is not None
    ]

    return _get_records_by_ids(
        table="quiz_answers",
        column="attempt_id",
        ids=attempt_ids,
        fields=(
            "id,attempt_id,question_id,"
            "selected_answer,is_correct,created_at"
        ),
        batch_size=100,
    )


def _get_related_questions(answers):
    """
    Retrieve the subject, topic and difficulty for
    questions answered by this student.
    """

    question_ids = [
        answer.get("question_id")
        for answer in answers
        if answer.get("question_id") is not None
    ]

    return _get_records_by_ids(
        table="questions",
        column="id",
        ids=question_ids,
        fields="id,subject,topic,difficulty",
        batch_size=200,
    )


# ---------------------------------------------------------
# PERFORMANCE & READINESS ENDPOINT
# ---------------------------------------------------------

@performance_readiness_api.route(
    "/summary",
    methods=["GET"],
)
def performance_readiness_summary():

    # 1. Read the access token.
    auth_header = request.headers.get(
        "Authorization", ""
    ).strip()

    if not auth_header.startswith("Bearer "):
        return jsonify({
            "success": False,
            "message": "Authentication required.",
        }), 401

    access_token = auth_header[7:].strip()

    if not access_token:
        return jsonify({
            "success": False,
            "message": "Invalid authentication token.",
        }), 401

    try:
        # 2. Verify the Supabase user.
        auth_user = _get_authenticated_supabase_user(
            access_token
        )

        if not auth_user:
            return jsonify({
                "success": False,
                "message": "Your session is invalid or has expired.",
            }), 401

        # 3. Resolve the public Overmaths user.
        public_user = _get_public_user(
            auth_user["id"]
        )

        if not public_user:
            return jsonify({
                "success": False,
                "message": "Student profile not found.",
            }), 404

        public_user_id = public_user.get("id")

        if public_user_id is None:
            return jsonify({
                "success": False,
                "message": "Student profile is incomplete.",
            }), 404

        # 4. Retrieve the student's completed attempts.
        attempts = _get_student_attempts(
            public_user_id
        )

        # 5. Retrieve answers from those attempts.
        answers = _get_student_answers(
            attempts
        )

        # 6. Retrieve matching question information.
        questions = _get_related_questions(
            answers
        )

        # 7. Calculate performance independently.
        performance = build_performance_readiness(
            attempts=attempts,
            answers=answers,
            questions=questions,
        )

        return jsonify({
            "success": True,
            "data": performance,
        }), 200

    except requests.RequestException:
        return jsonify({
            "success": False,
            "message": (
                "Unable to connect to the learning database. "
                "Please try again."
            ),
        }), 503

    except Exception:
        # Keep internal database details out of the
        # response sent to the student.
        return jsonify({
            "success": False,
            "message": (
                "Unable to load Performance & Readiness data."
            ),
        }), 500
