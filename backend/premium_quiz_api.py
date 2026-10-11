
import os
import random
from datetime import datetime, timezone

import requests
from flask import Blueprint, jsonify, request
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired


premium_quiz_api = Blueprint(
    "premium_quiz_api",
    __name__,
    url_prefix="/api/premium-quiz",
)

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
PREMIUM_SECRET = os.getenv("PREMIUM_QUIZ_SECRET") or os.getenv("SECRET_KEY")

serializer = (
    URLSafeTimedSerializer(PREMIUM_SECRET, salt="premium-quiz-session")
    if PREMIUM_SECRET
    else None
)


def db_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }


def db_get(table, params):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None, 500

    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers=db_headers(),
            params=params,
            timeout=20,
        )
    except requests.RequestException:
        return None, 503

    if response.status_code != 200:
        print(f"Premium Quiz GET {table}:", response.status_code, response.text)
        return None, 502

    return response.json(), 200


def db_insert(table, payload):
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers={
                **db_headers(),
                "Prefer": "return=representation",
            },
            json=payload,
            timeout=20,
        )
    except requests.RequestException:
        return None, 503

    if response.status_code not in (200, 201):
        print(f"Premium Quiz INSERT {table}:", response.status_code, response.text)
        return None, 502

    try:
        rows = response.json()
    except ValueError:
        return None, 502

    return (rows[0] if rows else None), 200


def db_patch(table, params, payload):
    try:
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers={
                **db_headers(),
                "Prefer": "return=representation",
            },
            params=params,
            json=payload,
            timeout=20,
        )
    except requests.RequestException:
        return None, 503

    if response.status_code not in (200, 204):
        print(f"Premium Quiz PATCH {table}:", response.status_code, response.text)
        return None, 502

    try:
        rows = response.json() if response.content else []
    except ValueError:
        return None, 502

    return rows, 200


def authenticate():
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return None, (jsonify({"error": "Please sign in first."}), 401)

    token = authorization[len("Bearer "):].strip()

    try:
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {token}",
            },
            timeout=15,
        )
    except requests.RequestException:
        return None, (jsonify({"error": "Authentication service unavailable."}), 503)

    if response.status_code != 200:
        return None, (jsonify({"error": "Your session is invalid or expired."}), 401)

    auth_user = response.json()
    profiles, status = db_get(
        "users",
        {
            "select": "id,auth_user_id,learning_route,exam_type",
            "auth_user_id": f"eq.{auth_user.get('id')}",
            "limit": 1,
        },
    )

    if status != 200:
        return None, (jsonify({"error": "Unable to load your student profile."}), status)

    if not profiles:
        return None, (jsonify({"error": "Student profile not found."}), 404)

    return profiles[0], None


def has_premium_access(user_id):
    rows, status = db_get(
        "subscriptions",
        {
            "select": "plan,status,started_at,expires_at",
            "user_id": f"eq.{user_id}",
            "order": "created_at.desc",
            "limit": 100,
        },
    )

    if status != 200:
        return None

    now = datetime.now(timezone.utc)

    for subscription in rows:
        plan = str(subscription.get("plan") or "").strip().lower()
        state = str(subscription.get("status") or "").strip().lower()

        if plan not in {
            "premium", "premium monthly", "premium annual",
            "premium yearly", "pro", "paid",
        }:
            continue

        if state != "active":
            continue

        try:
            start_text = subscription.get("started_at")
            expiry_text = subscription.get("expires_at")

            start = datetime.fromisoformat(
                start_text.replace("Z", "+00:00")
            ) if start_text else None

            expiry = datetime.fromisoformat(
                expiry_text.replace("Z", "+00:00")
            ) if expiry_text else None
        except (ValueError, TypeError, AttributeError):
            continue

        if start and start > now:
            continue

        if not expiry or expiry <= now:
            continue

        return True

    return False


def premium_student():
    profile, auth_error = authenticate()
    if auth_error:
        return None, auth_error

    access = has_premium_access(profile["id"])

    if access is None:
        return None, (
            jsonify({"error": "Unable to verify your Premium subscription."}),
            503,
        )

    if not access:
        return None, (
            jsonify({"error": "An active Premium subscription is required."}),
            403,
        )

    if not serializer:
        return None, (
            jsonify({"error": "Premium Quiz signing secret is not configured."}),
            500,
        )

    return profile, None


def parse_positive_int(value, default, maximum):
    try:
        number = int(value)
        return max(1, min(number, maximum))
    except (TypeError, ValueError):
        return default


def utc_datetime(value):
    if not value:
        return None

    try:
        return datetime.fromisoformat(
            value.replace("Z", "+00:00")
        ).astimezone(timezone.utc)
    except (ValueError, TypeError, AttributeError):
        return None

import re
import unicodedata


TOPIC_ALIASES = {
    "factorization": "factorisation",
    "number base": "number bases",
    "vector": "vectors",
    "ratio and proportion": "ratio and proportion",
    "angles and shapes": "angles and shapes",
    "set theory": "set theory",
}


def normalize_topic(topic):
    """Return a consistent key for equivalent topic names."""
    value = unicodedata.normalize("NFKC", str(topic or ""))
    value = value.casefold().strip()
    value = re.sub(r"\s+", " ", value)

    # Normalize common spelling and plural variations.
    value = TOPIC_ALIASES.get(value, value)

    return value


def public_question(question, reveal_answer=False):
    result = {
        "id": question.get("id"),
        "subject": question.get("subject"),
        "course_id": question.get("course_id"),
        "topic": question.get("topic"),
        "question_text": question.get("question_text"),
        "option_a": question.get("option_a"),
        "option_b": question.get("option_b"),
        "option_c": question.get("option_c"),
        "option_d": question.get("option_d"),
        "image_url": question.get("image_url"),
    }

    if reveal_answer:
        result["correction_answer"] = question.get("correction_answer")
        result["explanation"] = question.get("explanation")

    return result



@premium_quiz_api.route("/start", methods=["POST"])
def start_quiz():
    profile, error = premium_student()
    if error:
        return error

    data = request.get_json(silent=True) or {}

    subject = str(data.get("subject") or "").strip()
    course_id = data.get("course_id")
    topic = str(data.get("topic") or "mixed").strip()
    mode = str(data.get("mode") or "practice").strip().lower()

    if mode not in {"practice", "examination"}:
        return jsonify({
            "error": "Choose practice or examination mode."
        }), 400

    # Require exactly one selection: subject or course.
    try:
        course_id = int(course_id) if course_id not in (None, "") else None
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid course selection."}), 400

    if course_id is not None and course_id <= 0:
        return jsonify({"error": "Invalid course selection."}), 400

    if bool(subject) == (course_id is not None):
        return jsonify({
            "error": "Select either a subject or a course."
        }), 400

    count = parse_positive_int(
        data.get("question_count"), 10, 100
    )

    seconds_per_question = parse_positive_int(
        data.get("time_per_question"), 30, 120
    )

    params = {
        "select": (
            "id,subject,course_id,topic,question_text,"
            "option_a,option_b,option_c,option_d,"
            "correction_answer,explanation,image_url"
        ),
        "is_active": "eq.true",
        "limit": "1000",
    }

    if course_id is not None:
        params["course_id"] = f"eq.{course_id}"
    else:
        params["subject"] = f"eq.{subject}"
        params["course_id"] = "is.null"

    questions, status = db_get("questions", params)

    if status != 200:
        return jsonify({
            "error": "Unable to load questions."
        }), status

    # Filter by topic unless the quiz uses mixed topics.
    if topic.casefold() != "mixed":
        selected_topic = normalize_topic(topic)

        questions = [
            question
            for question in questions
            if normalize_topic(question.get("topic")) == selected_topic
        ]

    if len(questions) < count:
        return jsonify({
            "error": (
                f"Only {len(questions)} questions are available "
                "for this selection."
            ),
            "available": len(questions),
        }), 400

    random.shuffle(questions)
    questions = questions[:count]

    now = datetime.now(timezone.utc)

    attempt, status = db_insert(
        "quiz_attempts",
        {
            "user_id": profile["id"],
            "course_id": course_id,
            "score": 0,
            "total_questions": count,
            "mode": (
                "Examination Mode"
                if mode == "examination"
                else "Practice Mode"
            ),
            "started_at": now.isoformat(),
        },
    )

    if status != 200 or not attempt or not attempt.get("id"):
        return jsonify({
            "error": (
                "Could not create the quiz attempt. "
                "Check that quiz_attempts.id is generated by the database."
            )
        }), 502

    duration_seconds = count * seconds_per_question

    session_payload = {
        "attempt_id": attempt["id"],
        "user_id": profile["id"],
        "question_ids": [question["id"] for question in questions],
        "mode": mode,
        "duration_seconds": duration_seconds,
    }

    session_token = serializer.dumps(session_payload)

    return jsonify({
        "attempt_id": attempt["id"],
        "session_token": session_token,
        "mode": mode,
        "subject": subject or None,
        "course_id": course_id,
        "topic": topic,
        "question_count": count,
        "time_per_question": seconds_per_question,
        "duration_seconds": duration_seconds,
        "questions": [
            public_question(
                question,
                reveal_answer=(mode == "practice")
            )
            for question in questions
        ],
    }), 201


@premium_quiz_api.route("/submit", methods=["POST"])
def submit_quiz():
    profile, error = premium_student()
    if error:
        return error

    data = request.get_json(silent=True) or {}
    session_token = data.get("session_token")
    answers = data.get("answers")

    if not session_token or not isinstance(answers, list):
        return jsonify({"error": "Quiz session and answers are required."}), 400

    try:
        session = serializer.loads(session_token, max_age=12 * 60 * 60)
    except SignatureExpired:
        return jsonify({"error": "This quiz session has expired."}), 401
    except BadSignature:
        return jsonify({"error": "Invalid quiz session."}), 401

    if session.get("user_id") != profile["id"]:
        return jsonify({"error": "This quiz belongs to another user."}), 403

    attempt_id = session.get("attempt_id")
    attempts, status = db_get(
        "quiz_attempts",
        {
            "select": "id,user_id,started_at,completed_at,total_questions",
            "id": f"eq.{attempt_id}",
            "user_id": f"eq.{profile['id']}",
            "limit": 1,
        },
    )

    if status != 200:
        return jsonify({"error": "Unable to verify quiz attempt."}), status

    if not attempts:
        return jsonify({"error": "Quiz attempt not found."}), 404

    attempt = attempts[0]

    if attempt.get("completed_at"):
        return jsonify({"error": "This quiz has already been submitted."}), 409

    started = utc_datetime(attempt.get("started_at"))
    if not started:
        return jsonify({"error": "Quiz start time is invalid."}), 400

    deadline = started.timestamp() + int(session["duration_seconds"])
    now = datetime.now(timezone.utc).timestamp()

    if now > deadline + 15:
        return jsonify({"error": "The examination time has expired. Submit before the deadline."}), 408

    question_ids = session.get("question_ids") or []
    answer_map = {}

    for item in answers:
        if not isinstance(item, dict):
            continue

        question_id = item.get("question_id")
        selected = item.get("selected_answer")

        try:
            question_id = int(question_id)
        except (TypeError, ValueError):
            continue

        if question_id in question_ids:
            answer_map[question_id] = (
                str(selected).strip().upper()
                if selected is not None else ""
            )

    questions, status = db_get(
        "questions",
        {
            "select": "id,correction_answer,explanation,question_text,option_a,option_b,option_c,option_d,subject,course_id,topic,image_url",
            "id": f"in.({','.join(str(int(qid)) for qid in question_ids)})",
            "limit": str(len(question_ids)),
        },
    )

    if status != 200:
        return jsonify({"error": "Unable to grade this quiz."}), status

    question_by_id = {int(q["id"]): q for q in questions}
    if len(question_by_id) != len(question_ids):
        return jsonify({"error": "Some quiz questions are no longer available."}), 409

    answer_rows = []
    correct_count = 0
    review = []

    for question_id in question_ids:
        q = question_by_id[int(question_id)]
        selected = answer_map.get(int(question_id), "")
        correct = str(q.get("correction_answer") or "").strip().upper()
        is_correct = bool(selected) and selected == correct

        if is_correct:
            correct_count += 1

        answer_rows.append({
            "attempt_id": attempt_id,
            "question_id": question_id,
            "selected_answer": selected or None,
            "is_correct": is_correct,
        })

        review.append({
            **public_question(q, reveal_answer=True),
            "selected_answer": selected or None,
            "is_correct": is_correct,
        })

    # Save answer details first; then mark the attempt completed.
    # A database RPC/transaction is recommended for strict atomicity.
    for row in answer_rows:
        saved, status = db_insert("quiz_answers", row)
        if status != 200:
            return jsonify({
                "error": "Could not save all answers. Please contact support before retrying this attempt."
            }), status

    total = len(question_ids)
    score = round((correct_count / total) * 100, 2) if total else 0

    completed_at = datetime.now(timezone.utc).isoformat()
    updated, status = db_patch(
        "quiz_attempts",
        {
            "id": f"eq.{attempt_id}",
            "user_id": f"eq.{profile['id']}",
            "completed_at": "is.null",
        },
        {
            "score": score,
            "completed_at": completed_at,
        },
    )

    if status != 200 or not updated:
        return jsonify({
            "error": "The answers were saved but the attempt could not be finalized. Contact support before retrying."
        }), 502

    return jsonify({
        "attempt_id": attempt_id,
        "score": score,
        "correct": correct_count,
        "total": total,
        "review": review,
        "completed_at": completed_at,
    })
