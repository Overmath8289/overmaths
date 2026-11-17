
import os
import random
import re
import unicodedata
from datetime import datetime, timezone

import requests
from flask import Blueprint, jsonify, request
from itsdangerous import (
    URLSafeTimedSerializer,
    BadSignature,
    SignatureExpired,
)


# ============================================================
# PREMIUM QUIZ BLUEPRINT
# ============================================================

premium_quiz_api = Blueprint(
    "premium_quiz_api",
    __name__,
    url_prefix="/api/premium-quiz",
)


# ============================================================
# ENVIRONMENT CONFIGURATION
# ============================================================

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

PREMIUM_SECRET = (
    os.getenv("PREMIUM_QUIZ_SECRET")
    or os.getenv("SECRET_KEY")
)

serializer = (
    URLSafeTimedSerializer(
        PREMIUM_SECRET,
        salt="premium-quiz-session",
    )
    if PREMIUM_SECRET
    else None
)

MAX_QUESTIONS = 100
MAX_DURATION_MINUTES = 180
SESSION_MAX_AGE = 6 * 60 * 60


# ============================================================
# DATABASE HEADERS
# ============================================================

def db_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }


# ============================================================
# DATABASE GET
# ============================================================

def db_get(table, params):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None, 500

    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers=db_headers(),
            params=params,
            timeout=30,
        )

    except requests.Timeout:
        print(f"Premium Quiz GET {table}: timeout")
        return None, 504

    except requests.RequestException as exc:
        print(f"Premium Quiz GET {table}: {exc}")
        return None, 503

    if response.status_code != 200:
        print(
            f"Premium Quiz GET {table}:",
            response.status_code,
            response.text,
        )
        return None, 502

    try:
        return response.json(), 200
    except ValueError:
        return None, 502


# ============================================================
# DATABASE INSERT
# ============================================================

def db_insert(table, payload):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None, 500

    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers={
                **db_headers(),
                "Prefer": "return=representation",
            },
            json=payload,
            timeout=30,
        )

    except requests.Timeout:
        print(f"Premium Quiz INSERT {table}: timeout")
        return None, 504

    except requests.RequestException as exc:
        print(f"Premium Quiz INSERT {table}: {exc}")
        return None, 503

    if response.status_code not in (200, 201):
        print(
            f"Premium Quiz INSERT {table}:",
            response.status_code,
            response.text,
        )
        return None, 502

    try:
        rows = response.json()
    except ValueError:
        return None, 502

    if not isinstance(rows, list):
        return None, 502

    return (rows[0] if rows else None), 200


# ============================================================
# DATABASE RPC
# ============================================================

def db_rpc(function_name, payload):
    """
    Calls a PostgreSQL RPC function through Supabase.

    The complete_quiz_attempt function saves all quiz answers
    and completes the attempt in one database transaction.
    """

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None, 500

    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/{function_name}",
            headers={
                **db_headers(),
                "Prefer": "return=representation",
            },
            json=payload,
            timeout=60,
        )

    except requests.Timeout:
        print(f"Premium Quiz RPC {function_name}: timeout")
        return None, 504

    except requests.RequestException as exc:
        print(f"Premium Quiz RPC {function_name}: {exc}")
        return None, 503

    if response.status_code not in (200, 201):
        print(
            f"Premium Quiz RPC {function_name}:",
            response.status_code,
            response.text,
        )

        error_text = response.text.lower()

        if any(
            message in error_text
            for message in (
                "already completed",
                "attempt not found",
                "unauthorized",
                "not found",
            )
        ):
            return None, 409

        return None, 502

    try:
        result = response.json()
    except ValueError:
        return None, 502

    # Supabase JSONB functions normally return an object.
    # This also handles a one-item list defensively.
    if isinstance(result, list):
        result = result[0] if result else None

    if not isinstance(result, dict):
        return None, 502

    return result, 200


# ============================================================
# AUTHENTICATION
# ============================================================

def authenticate():

    authorization = request.headers.get(
        "Authorization",
        "",
    )

    if not authorization.startswith("Bearer "):
        return None, (
            jsonify({
                "error": "Please sign in first."
            }),
            401,
        )

    token = authorization[len("Bearer "):].strip()

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None, (
            jsonify({
                "error": "Authentication is not configured."
            }),
            500,
        )

    try:
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {token}",
            },
            timeout=20,
        )

    except requests.Timeout:
        return None, (
            jsonify({
                "error": "Authentication service timed out."
            }),
            504,
        )

    except requests.RequestException:
        return None, (
            jsonify({
                "error": "Authentication service unavailable."
            }),
            503,
        )

    if response.status_code != 200:
        return None, (
            jsonify({
                "error": "Your session is invalid or expired."
            }),
            401,
        )

    try:
        auth_user = response.json()
    except ValueError:
        return None, (
            jsonify({
                "error": "Invalid authentication response."
            }),
            502,
        )

    auth_user_id = auth_user.get("id")

    if not auth_user_id:
        return None, (
            jsonify({
                "error": "Unable to identify your account."
            }),
            401,
        )

    profiles, status = db_get(
        "users",
        {
            "select": "id,auth_user_id,learning_route,exam_type",
            "auth_user_id": f"eq.{auth_user_id}",
            "limit": 1,
        },
    )

    if status != 200:
        return None, (
            jsonify({
                "error": "Unable to load your student profile."
            }),
            status,
        )

    if not profiles:
        return None, (
            jsonify({
                "error": "Student profile not found."
            }),
            404,
        )

    return profiles[0], None


# ============================================================
# GENERAL HELPERS
# ============================================================

def parse_positive_int(value, default, maximum):
    try:
        number = int(value)

        if number < 1:
            return default

        return min(number, maximum)

    except (TypeError, ValueError):
        return default


def utc_datetime(value):

    if not value:
        return None

    try:
        if isinstance(value, datetime):
            parsed = value
        else:
            parsed = datetime.fromisoformat(
                str(value).replace("Z", "+00:00")
            )

        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)

        return parsed.astimezone(timezone.utc)

    except (
        ValueError,
        TypeError,
        AttributeError,
    ):
        return None


TOPIC_ALIASES = {
    "factorization": "factorisation",
    "number base": "number bases",
    "vector": "vectors",
    "ratio and proportion": "ratio and proportion",
    "angles and shapes": "angles and shapes",
    "set theory": "set theory",
}


def normalize_topic(topic):

    value = unicodedata.normalize(
        "NFKC",
        str(topic or ""),
    )

    value = value.casefold().strip()
    value = re.sub(r"\s+", " ", value)

    return TOPIC_ALIASES.get(value, value)


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
        result["correction_answer"] = question.get(
            "correction_answer"
        )
        result["explanation"] = question.get("explanation")

    return result


# ============================================================
# PREMIUM SUBSCRIPTION CHECK
# ============================================================

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

    if status != 200 or not isinstance(rows, list):
        return None

    now = datetime.now(timezone.utc)

    premium_plans = {
        "premium",
        "premium monthly",
        "premium annual",
        "premium yearly",
        "pro",
        "paid",
    }

    for subscription in rows:

        plan = str(
            subscription.get("plan") or ""
        ).strip().lower()

        state = str(
            subscription.get("status") or ""
        ).strip().lower()

        if plan not in premium_plans or state != "active":
            continue

        start = utc_datetime(
            subscription.get("started_at")
        )

        expiry = utc_datetime(
            subscription.get("expires_at")
        )

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
            jsonify({
                "error": (
                    "Unable to verify your Premium subscription."
                )
            }),
            503,
        )

    if not access:
        return None, (
            jsonify({
                "error": (
                    "An active Premium subscription is required."
                )
            }),
            403,
        )

    if not serializer:
        return None, (
            jsonify({
                "error": (
                    "Premium Quiz signing secret is not configured."
                )
            }),
            500,
        )

    return profile, None


# ============================================================
# START QUIZ
# ============================================================

@premium_quiz_api.route("/start", methods=["POST"])
def start_quiz():

    profile, error = premium_student()

    if error:
        return error

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "Invalid quiz request."
        }), 400

    subject = str(data.get("subject") or "").strip()

    subjects = data.get("subjects") or []
    allocations = data.get("subject_allocations") or []

    course_id = data.get("course_id")

    topic = str(
        data.get("topic") or "mixed"
    ).strip()

    exam_title = str(
        data.get("exam_title") or ""
    ).strip() or None

    exam_date = data.get("exam_date") or None

    exam_purpose = str(
        data.get("exam_purpose") or "practice"
    ).strip().lower()

    mode = str(
        data.get("mode") or "practice"
    ).strip().lower()

    if exam_purpose not in {"practice", "my_exam"}:
        return jsonify({
            "error": "Invalid exam purpose."
        }), 400

    if mode not in {"practice", "examination"}:
        return jsonify({
            "error": "Choose practice or examination mode."
        }), 400

    if not isinstance(subjects, list):
        return jsonify({
            "error": "Invalid subjects selection."
        }), 400

    if not isinstance(allocations, list):
        return jsonify({
            "error": "Invalid subject allocations."
        }), 400

    # Normalize and deduplicate subjects case-insensitively.
    normalized_subjects = {}

    for item in subjects:
        if isinstance(item, str) and item.strip():
            cleaned = item.strip()
            normalized_subjects.setdefault(
                cleaned.casefold(),
                cleaned,
            )

    subjects = list(normalized_subjects.values())

    # --------------------------------------------------------
    # COURSE VALIDATION
    # --------------------------------------------------------

    try:
        course_id = (
            int(course_id)
            if course_id not in (None, "")
            else None
        )
    except (TypeError, ValueError):
        return jsonify({
            "error": "Invalid course selection."
        }), 400

    if course_id is not None and course_id <= 0:
        return jsonify({
            "error": "Invalid course selection."
        }), 400

    # --------------------------------------------------------
    # EXAM PURPOSE VALIDATION
    # --------------------------------------------------------

    if exam_purpose == "my_exam":

        if course_id is not None:
            return jsonify({
                "error": "Choose subjects or a course, not both."
            }), 400

        if not subjects and subject:
            subjects = [subject]

        if not subjects and not allocations:
            return jsonify({
                "error": "Select at least one subject."
            }), 400

        subject = ""

    else:

        if subjects or allocations:
            return jsonify({
                "error": (
                    "Multiple subjects are available only in My Exam."
                )
            }), 400

        if bool(subject) == (course_id is not None):
            return jsonify({
                "error": "Select either a subject or a course."
            }), 400

    # --------------------------------------------------------
    # SUBJECT ALLOCATIONS
    # --------------------------------------------------------

    validated_allocations = []

    if allocations:

        if exam_purpose != "my_exam":
            return jsonify({
                "error": (
                    "Subject allocations are only for My Exam."
                )
            }), 400

        if not subjects:
            subjects = [
                str(item.get("subject") or "").strip()
                for item in allocations
                if isinstance(item, dict)
                and str(item.get("subject") or "").strip()
            ]

        seen_subjects = set()
        total_allocated = 0

        for item in allocations:

            if not isinstance(item, dict):
                return jsonify({
                    "error": "Invalid subject allocation."
                }), 400

            allocation_subject = str(
                item.get("subject") or ""
            ).strip()

            if not allocation_subject:
                return jsonify({
                    "error": "Every allocation needs a subject."
                }), 400

            subject_key = allocation_subject.casefold()

            if subject_key in seen_subjects:
                return jsonify({
                    "error": (
                        f"Duplicate subject: {allocation_subject}"
                    )
                }), 400

            seen_subjects.add(subject_key)

            try:
                allocation_count = int(
                    item.get("question_count")
                )
            except (TypeError, ValueError):
                return jsonify({
                    "error": (
                        f"Invalid question count for "
                        f"{allocation_subject}."
                    )
                }), 400

            if not 1 <= allocation_count <= MAX_QUESTIONS:
                return jsonify({
                    "error": (
                        "Each subject must have between "
                        "1 and 100 questions."
                    )
                }), 400

            difficulty = str(
                item.get("difficulty") or "mixed"
            ).strip().lower()

            if difficulty not in {
                "easy",
                "medium",
                "hard",
                "mixed",
            }:
                return jsonify({
                    "error": (
                        f"Invalid difficulty for {allocation_subject}."
                    )
                }), 400

            selected_topics = item.get("topics") or []

            if not isinstance(selected_topics, list):
                return jsonify({
                    "error": (
                        f"Invalid topics for {allocation_subject}."
                    )
                }), 400

            selected_topics = list(dict.fromkeys(
                value.strip()
                for value in selected_topics
                if isinstance(value, str) and value.strip()
            ))

            total_allocated += allocation_count

            validated_allocations.append({
                "subject": allocation_subject,
                "question_count": allocation_count,
                "difficulty": difficulty,
                "topics": selected_topics,
            })

        if total_allocated > MAX_QUESTIONS:
            return jsonify({
                "error": (
                    "An examination cannot exceed "
                    "100 questions."
                )
            }), 400

        if seen_subjects != {
            item.casefold() for item in subjects
        }:
            return jsonify({
                "error": (
                    "Selected subjects and allocations do not match."
                )
            }), 400

        count = total_allocated

    else:

        count = parse_positive_int(
            data.get("question_count"),
            10,
            MAX_QUESTIONS,
        )

    # --------------------------------------------------------
    # DURATION VALIDATION
    # --------------------------------------------------------

    duration_minutes = data.get("duration_minutes")

    if duration_minutes not in (None, ""):

        try:
            duration_minutes = int(duration_minutes)

            if not 1 <= duration_minutes <= MAX_DURATION_MINUTES:
                raise ValueError

        except (TypeError, ValueError):
            return jsonify({
                "error": (
                    "Duration must be between "
                    "1 and 180 minutes."
                )
            }), 400

    else:
        duration_minutes = None

    seconds_per_question = parse_positive_int(
        data.get("time_per_question"),
        30,
        120,
    )

    duration_seconds = (
        duration_minutes * 60
        if duration_minutes is not None
        else count * seconds_per_question
    )

    # --------------------------------------------------------
    # TARGET SCORE
    # --------------------------------------------------------

    target_score = data.get("target_score")

    if target_score not in (None, ""):

        try:
            target_score = int(target_score)

            if not 0 <= target_score <= 100:
                raise ValueError

        except (TypeError, ValueError):
            return jsonify({
                "error": "Target score must be between 0 and 100."
            }), 400

    else:
        target_score = None

    # --------------------------------------------------------
    # EXAM DATE
    # --------------------------------------------------------

    if exam_date and exam_purpose == "my_exam":
        if not utc_datetime(exam_date):
            return jsonify({
                "error": "Invalid exam date."
            }), 400

    # --------------------------------------------------------
    # LOAD QUESTION BANK
    # --------------------------------------------------------

    params = {
        "select": (
            "id,subject,course_id,topic,difficulty,"
            "question_text,option_a,option_b,option_c,option_d,"
            "correction_answer,explanation,image_url"
        ),
        "is_active": "eq.true",
        "limit": "1000",
    }

    if course_id is not None:
        params["course_id"] = f"eq.{course_id}"

    elif exam_purpose == "my_exam":
        params["course_id"] = "is.null"

    else:
        params["subject"] = f"eq.{subject}"
        params["course_id"] = "is.null"

    questions, status = db_get("questions", params)

    if status != 200:
        return jsonify({
            "error": "Unable to load questions."
        }), status

    if not isinstance(questions, list):
        return jsonify({
            "error": "Invalid question database response."
        }), 502

    # --------------------------------------------------------
    # SELECT QUESTIONS
    # --------------------------------------------------------

    selected_questions = []

    if validated_allocations:

        for allocation in validated_allocations:

            allocation_subject = (
                allocation["subject"].casefold()
            )

            available = [
                question
                for question in questions
                if str(
                    question.get("subject") or ""
                ).strip().casefold() == allocation_subject
            ]

            if allocation["difficulty"] != "mixed":
                available = [
                    question
                    for question in available
                    if str(
                        question.get("difficulty") or "medium"
                    ).strip().lower()
                    == allocation["difficulty"]
                ]

            if allocation["topics"]:
                topic_keys = {
                    normalize_topic(value)
                    for value in allocation["topics"]
                }

                available = [
                    question
                    for question in available
                    if normalize_topic(
                        question.get("topic")
                    ) in topic_keys
                ]

            requested = allocation["question_count"]

            if len(available) < requested:
                return jsonify({
                    "error": (
                        f"{allocation['subject']} has only "
                        f"{len(available)} matching questions, "
                        f"but {requested} were requested. "
                        "Add more questions or adjust your selection."
                    ),
                    "subject": allocation["subject"],
                    "available": len(available),
                    "requested": requested,
                }), 400

            selected_questions.extend(
                random.sample(available, requested)
            )

    else:

        if exam_purpose == "my_exam":

            selected_subjects = {
                item.casefold()
                for item in subjects
            }

            questions = [
                question
                for question in questions
                if str(
                    question.get("subject") or ""
                ).strip().casefold() in selected_subjects
            ]

        if topic.casefold() != "mixed":

            selected_topic = normalize_topic(topic)

            questions = [
                question
                for question in questions
                if normalize_topic(
                    question.get("topic")
                ) == selected_topic
            ]

        if len(questions) < count:
            return jsonify({
                "error": (
                    f"Only {len(questions)} questions are available "
                    "for this selection."
                ),
                "available": len(questions),
                "requested": count,
            }), 400

        selected_questions = random.sample(
            questions,
            count,
        )

    if not selected_questions:
        return jsonify({
            "error": "No questions could be selected."
        }), 400

    random.shuffle(selected_questions)

    # --------------------------------------------------------
    # VALIDATE SELECTED QUESTION IDS
    # --------------------------------------------------------

    try:
        selected_question_ids = [
            int(question["id"])
            for question in selected_questions
        ]

        if any(value <= 0 for value in selected_question_ids):
            raise ValueError

    except (KeyError, TypeError, ValueError):
        return jsonify({
            "error": "The selected questions have invalid IDs."
        }), 500

    if len(set(selected_question_ids)) != len(selected_question_ids):
        return jsonify({
            "error": "Duplicate questions were selected."
        }), 500

    # --------------------------------------------------------
    # CREATE QUIZ ATTEMPT
    # --------------------------------------------------------

    now = datetime.now(timezone.utc)

    attempt_payload = {
        "user_id": profile["id"],
        "course_id": course_id,
        "score": 0,
        "total_questions": len(selected_questions),
        "mode": (
            "Examination Mode"
            if mode == "examination"
            else "Practice Mode"
        ),
        "exam_purpose": exam_purpose,
        "subjects": (
            subjects
            if exam_purpose == "my_exam"
            else ([subject] if subject else [])
        ),
        "selected_topic": topic,
        "exam_title": (
            exam_title
            if exam_purpose == "my_exam"
            else None
        ),
        "exam_date": (
            exam_date
            if exam_purpose == "my_exam"
            else None
        ),
        "target_score": (
            target_score
            if exam_purpose == "my_exam"
            else None
        ),
        "subject_allocations": validated_allocations,
        "started_at": now.isoformat(),
    }

    attempt, status = db_insert(
        "quiz_attempts",
        attempt_payload,
    )

    if status != 200 or not attempt or not attempt.get("id"):
        return jsonify({
            "error": "Could not create the quiz attempt."
        }), 502

    # --------------------------------------------------------
    # SIGN QUIZ SESSION
    # --------------------------------------------------------

    session_payload = {
        "attempt_id": int(attempt["id"]),
        "user_id": int(profile["id"]),
        "question_ids": selected_question_ids,
        "mode": mode,
        "exam_purpose": exam_purpose,
        "duration_seconds": duration_seconds,
    }

    session_token = serializer.dumps(session_payload)

    # --------------------------------------------------------
    # RETURN QUESTIONS
    # --------------------------------------------------------

    return jsonify({
        "attempt_id": attempt["id"],
        "session_token": session_token,
        "mode": mode,
        "exam_purpose": exam_purpose,
        "subject": subject or None,
        "subjects": (
            subjects
            if exam_purpose == "my_exam"
            else []
        ),
        "subject_allocations": validated_allocations,
        "target_score": target_score,
        "exam_title": (
            exam_title
            if exam_purpose == "my_exam"
            else None
        ),
        "exam_date": (
            exam_date
            if exam_purpose == "my_exam"
            else None
        ),
        "course_id": course_id,
        "topic": topic,
        "question_count": len(selected_questions),
        "time_per_question": seconds_per_question,
        "duration_minutes": (duration_seconds + 59) // 60,
        "duration_seconds": duration_seconds,
        "questions": [
            public_question(
                question,
                reveal_answer=(
                    exam_purpose == "practice"
                    and mode == "practice"
                ),
            )
            for question in selected_questions
        ],
    }), 201


# ============================================================
# SUBMIT QUIZ
# ============================================================

@premium_quiz_api.route("/submit", methods=["POST"])
def submit_quiz():

    profile, error = premium_student()

    if error:
        return error

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "Invalid submission request."
        }), 400

    session_token = str(
        data.get("session_token") or ""
    ).strip()

    answers = data.get("answers")

    if not session_token:
        return jsonify({
            "error": "Your quiz session is missing."
        }), 400

    if not isinstance(answers, list):
        return jsonify({
            "error": "Invalid answers submission."
        }), 400

    # --------------------------------------------------------
    # VERIFY SESSION
    # --------------------------------------------------------

    try:
        session = serializer.loads(
            session_token,
            max_age=SESSION_MAX_AGE,
        )

    except SignatureExpired:
        return jsonify({
            "error": (
                "Your quiz session has expired. "
                "Please start another quiz."
            )
        }), 401

    except BadSignature:
        return jsonify({
            "error": "Invalid quiz session."
        }), 401

    if not isinstance(session, dict):
        return jsonify({
            "error": "Invalid quiz session data."
        }), 400

    try:
        session_user_id = int(session.get("user_id"))
        current_user_id = int(profile["id"])
    except (TypeError, ValueError):
        return jsonify({
            "error": "Invalid quiz session ownership."
        }), 400

    if session_user_id != current_user_id:
        return jsonify({
            "error": (
                "You cannot submit another student's quiz."
            )
        }), 403

    # --------------------------------------------------------
    # VALIDATE ATTEMPT AND QUESTION IDS
    # --------------------------------------------------------

    try:
        attempt_id = int(session.get("attempt_id"))

        if attempt_id <= 0:
            raise ValueError

    except (TypeError, ValueError):
        return jsonify({
            "error": "Invalid quiz attempt ID."
        }), 400

    question_ids = session.get("question_ids")

    if not isinstance(question_ids, list) or not question_ids:
        return jsonify({
            "error": "No questions were found in this session."
        }), 400

    total_questions = len(question_ids)

    if total_questions > MAX_QUESTIONS:
        return jsonify({
            "error": "A quiz cannot contain more than 100 questions."
        }), 400

    try:
        numeric_question_ids = [
            int(value)
            for value in question_ids
        ]

        if any(value <= 0 for value in numeric_question_ids):
            raise ValueError

    except (TypeError, ValueError):
        return jsonify({
            "error": "Invalid question IDs in the quiz session."
        }), 400

    allowed_question_ids = {
        str(value)
        for value in numeric_question_ids
    }

    if len(allowed_question_ids) != total_questions:
        return jsonify({
            "error": "Duplicate question IDs were found."
        }), 400

    # --------------------------------------------------------
    # VERIFY ATTEMPT OWNERSHIP
    # --------------------------------------------------------

    attempts, status = db_get(
        "quiz_attempts",
        {
            "select": (
                "id,user_id,total_questions,completed_at,"
                "started_at,mode,exam_purpose"
            ),
            "id": f"eq.{attempt_id}",
            "user_id": f"eq.{current_user_id}",
            "limit": 1,
        },
    )

    if status != 200:
        return jsonify({
            "error": "Unable to verify your quiz attempt."
        }), status

    if not attempts:
        return jsonify({
            "error": "Quiz attempt not found."
        }), 404

    attempt = attempts[0]

    if attempt.get("completed_at"):
        return jsonify({
            "error": "This quiz has already been submitted."
        }), 409

    try:
        saved_question_count = int(
            attempt.get("total_questions") or 0
        )
    except (TypeError, ValueError):
        saved_question_count = 0

    if saved_question_count != total_questions:
        return jsonify({
            "error": "Quiz question count does not match your session."
        }), 400

    # --------------------------------------------------------
    # VALIDATE ANSWER DATA
    # --------------------------------------------------------

    if len(answers) > total_questions:
        return jsonify({
            "error": "Too many answers were submitted."
        }), 400

    answer_map = {}

    for item in answers:

        if not isinstance(item, dict):
            return jsonify({
                "error": "Invalid answer format."
            }), 400

        question_id = item.get("question_id")

        if question_id is None:
            return jsonify({
                "error": "An answer is missing its question ID."
            }), 400

        try:
            numeric_id = int(question_id)

            if numeric_id <= 0:
                raise ValueError

            question_key = str(numeric_id)

        except (TypeError, ValueError):
            return jsonify({
                "error": "Invalid question ID in answer."
            }), 400

        if question_key not in allowed_question_ids:
            return jsonify({
                "error": (
                    "An answer belongs to an unknown question."
                )
            }), 400

        if question_key in answer_map:
            return jsonify({
                "error": "Duplicate answers were submitted."
            }), 400

        selected_answer = str(
            item.get("selected_answer") or ""
        ).strip().upper()

        if selected_answer not in {"", "A", "B", "C", "D"}:
            return jsonify({
                "error": "Invalid answer option."
            }), 400

        answer_map[question_key] = selected_answer

    # --------------------------------------------------------
    # VERIFY EXAMINATION TIME
    # --------------------------------------------------------

    try:
        duration_seconds = int(
            session.get("duration_seconds") or 0
        )

        if duration_seconds < 0:
            raise ValueError

    except (TypeError, ValueError):
        return jsonify({
            "error": "Invalid quiz duration."
        }), 400

    started_at = utc_datetime(
        attempt.get("started_at")
    )

    if not started_at:
        return jsonify({
            "error": "The quiz start time could not be verified."
        }), 400

    now = datetime.now(timezone.utc)

    elapsed_seconds = max(
        0,
        int((now - started_at).total_seconds()),
    )

    # Allow 60 seconds for frontend and network delays.
    if (
        duration_seconds > 0
        and elapsed_seconds > duration_seconds + 60
    ):
        return jsonify({
            "error": (
                "The examination time has expired. "
                "Please start another quiz."
            )
        }), 408

    # --------------------------------------------------------
    # LOAD QUESTIONS FOR GRADING
    # --------------------------------------------------------

    question_filter = (
        "in.("
        + ",".join(str(value) for value in numeric_question_ids)
        + ")"
    )

    question_rows, status = db_get(
        "questions",
        {
            "select": (
                "id,subject,topic,question_text,"
                "option_a,option_b,option_c,option_d,"
                "correction_answer,explanation,image_url"
            ),
            "id": question_filter,
            "limit": str(MAX_QUESTIONS),
        },
    )

    if status != 200:
        return jsonify({
            "error": "Unable to load questions for grading."
        }), status

    if not isinstance(question_rows, list):
        return jsonify({
            "error": "Invalid question database response."
        }), 502

    question_lookup = {
        str(question.get("id")): question
        for question in question_rows
    }

    if len(question_lookup) != total_questions:
        return jsonify({
            "error": (
                "Some quiz questions could not be found. "
                "Please contact support."
            )
        }), 500

    # --------------------------------------------------------
    # GRADE QUESTIONS
    # --------------------------------------------------------

    correct_count = 0
    unanswered_count = 0

    review = []
    answer_records = []
    subject_results = {}

    for question_id in numeric_question_ids:

        question_key = str(question_id)
        question = question_lookup.get(question_key)

        if not question:
            return jsonify({
                "error": "A quiz question could not be loaded."
            }), 500

        selected_answer = answer_map.get(
            question_key,
            "",
        )

        correct_answer = str(
            question.get("correction_answer") or ""
        ).strip().upper()

        if correct_answer not in {"A", "B", "C", "D"}:
            return jsonify({
                "error": (
                    "A question has an invalid correct answer. "
                    "Please contact support."
                )
            }), 500

        is_unanswered = not selected_answer

        is_correct = (
            not is_unanswered
            and selected_answer == correct_answer
        )

        if is_unanswered:
            unanswered_count += 1

        if is_correct:
            correct_count += 1

        subject_name = str(
            question.get("subject") or "General"
        ).strip() or "General"

        if subject_name not in subject_results:
            subject_results[subject_name] = {
                "subject": subject_name,
                "total": 0,
                "correct": 0,
                "incorrect": 0,
                "unanswered": 0,
            }

        subject_results[subject_name]["total"] += 1

        if is_correct:
            subject_results[subject_name]["correct"] += 1

        elif is_unanswered:
            subject_results[subject_name]["unanswered"] += 1

        else:
            subject_results[subject_name]["incorrect"] += 1

        # Prepare the record expected by the PostgreSQL RPC.
        answer_records.append({
            "question_id": question_id,
            "selected_answer": selected_answer or None,
            "is_correct": bool(is_correct),
        })

        # Prepare frontend review.
        review.append({
            "question_id": question_id,
            "subject": subject_name,
            "topic": question.get("topic"),
            "question_text": question.get("question_text"),
            "option_a": question.get("option_a"),
            "option_b": question.get("option_b"),
            "option_c": question.get("option_c"),
            "option_d": question.get("option_d"),
            "selected_answer": selected_answer or None,
            "correct_answer": correct_answer,
            "is_correct": bool(is_correct),
            "is_unanswered": bool(is_unanswered),
            "explanation": question.get("explanation"),
            "image_url": question.get("image_url"),
        })

    # --------------------------------------------------------
    # CALCULATE FINAL SCORE
    # --------------------------------------------------------

    incorrect_count = (
        total_questions
        - correct_count
        - unanswered_count
    )

    score = round(
        (correct_count / total_questions) * 100,
        2,
    )

    # --------------------------------------------------------
    # ATOMICALLY SAVE ANSWERS AND COMPLETE ATTEMPT
    # --------------------------------------------------------

    saved_result, status = db_rpc(
        "complete_quiz_attempt",
        {
            "p_attempt_id": attempt_id,
            "p_user_id": current_user_id,
            "p_score": score,
            "p_answers": answer_records,
        },
    )

    if status == 409:
        return jsonify({
            "error": (
                "This quiz has already been submitted, "
                "or the attempt is no longer available."
            )
        }), 409

    if status != 200 or not saved_result:
        return jsonify({
            "error": (
                "Your quiz could not be saved completely. "
                "Please try again. If the problem continues, "
                "contact support."
            )
        }), status

    if not saved_result.get("success"):
        return jsonify({
            "error": "The database could not complete your quiz."
        }), 502

    completed_at = saved_result.get("completed_at")

    if not completed_at:
        completed_at = datetime.now(
            timezone.utc
        ).isoformat()

    # --------------------------------------------------------
    # RETURN RESULTS
    # --------------------------------------------------------

    return jsonify({
        "success": True,
        "message": "Quiz submitted successfully.",
        "attempt_id": attempt_id,
        "exam_purpose": session.get("exam_purpose"),
        "mode": session.get("mode"),
        "score": score,
        "correct": correct_count,
        "incorrect": incorrect_count,
        "unanswered": unanswered_count,
        "total": total_questions,
        "elapsed_seconds": elapsed_seconds,
        "subject_results": list(
            subject_results.values()
        ),
        "review": review,
        "completed_at": completed_at,
    }), 200
