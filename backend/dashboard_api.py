
import os
import requests

from datetime import datetime, timezone, timedelta
from flask import Blueprint, jsonify, request
from dotenv import load_dotenv

load_dotenv()

dashboard_api = Blueprint(
    "dashboard_api",
    __name__,
    url_prefix="/api/dashboard"
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

EXAM_MODE = "Examination Mode"


# ============================================================
# SUPABASE
# ============================================================

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
            f"Supabase request failed for {table}: "
            f"{response.status_code} "
            f"{response.text}"
        )

    return response.json()


# ============================================================
# AUTHENTICATION
# ============================================================

def authenticate_request():
    """
    Authenticate the current request using the Supabase
    access token supplied in the Authorization header.

    Returns:
        (public_user, None) on success
        (None, (error_body, status_code)) on failure
    """

    authorization = request.headers.get(
        "Authorization",
        ""
    )

    if not authorization.startswith("Bearer "):
        return None, (
            {
                "success": False,
                "error": "Authentication required."
            },
            401
        )

    access_token = authorization[
        len("Bearer "):
    ].strip()

    if not access_token:
        return None, (
            {
                "success": False,
                "error": "Authentication token is missing."
            },
            401
        )

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None, (
            {
                "success": False,
                "error": "Authentication service is not configured."
            },
            500
        )

    try:
        # Ask Supabase Auth to validate the user's access token.
        response = requests.get(
            f"{SUPABASE_URL.rstrip('/')}/auth/v1/user",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {access_token}",
            },
            timeout=15,
        )

        if response.status_code in (401, 403):
            return None, (
                {
                    "success": False,
                    "error": (
                        "Your session is invalid or has expired. "
                        "Please sign in again."
                    )
                },
                401
            )

        if not response.ok:
            print(
                "SUPABASE AUTH ERROR:",
                response.status_code,
                response.text
            )

            return None, (
                {
                    "success": False,
                    "error": "Unable to verify your session."
                },
                503
            )

        auth_user = response.json()
        auth_user_id = auth_user.get("id")

        if not auth_user_id:
            return None, (
                {
                    "success": False,
                    "error": (
                        "Unable to identify the authenticated user."
                    )
                },
                401
            )

        # Resolve the verified Supabase identity to public.users.
        public_user = get_public_user(auth_user_id)

        if not public_user:
            return None, (
                {
                    "success": False,
                    "error": (
                        "Overmaths user profile was not found."
                    )
                },
                404
            )

        return public_user, None

    except requests.RequestException as error:
        print("AUTHENTICATION REQUEST ERROR:", error)

        return None, (
            {
                "success": False,
                "error": (
                    "Unable to verify your session. "
                    "Please try again."
                )
            },
            503
        )

    except Exception as error:
        print("AUTHENTICATION ERROR:", error)

        return None, (
            {
                "success": False,
                "error": "Unable to authenticate this request."
            },
            500
        )


# ============================================================
# HELPERS
# ============================================================

def percentage(correct, total):
    if not total:
        return 0

    return round(
        (correct / total) * 100
    )


def parse_datetime(value):
    if not value:
        return None

    try:
        value = str(value)

        if value.endswith("Z"):
            value = value[:-1] + "+00:00"

        parsed = datetime.fromisoformat(value)

        if parsed.tzinfo is None:
            parsed = parsed.replace(
                tzinfo=timezone.utc
            )

        return parsed

    except (ValueError, TypeError):
        return None


# ============================================================
# PREMIUM ACCESS
# ============================================================

def get_public_user(auth_user_id):
    users = supabase_get(
        "users",
        {
            "auth_user_id": f"eq.{auth_user_id}",
            "select": "id,role",
            "limit": "1",
        },
    )

    if not users:
        return None

    return users[0]


def get_premium_access(public_user):
    """
    Determine whether the Overmaths user currently has
    Premium access.

    A recognized Premium plan, an accepted active status,
    a reached start date, and a valid expiry date are required.
    """

    if not public_user:
        return {
            "is_premium": False,
            "plan": "free",
            "status": "inactive",
            "expires_at": None,
            "source": "none",
        }

    public_user_id = public_user.get("id")

    subscriptions = supabase_get(
        "subscriptions",
        {
            "user_id": f"eq.{public_user_id}",
            "select": (
                "id,"
                "plan,"
                "started_at,"
                "expires_at,"
                "status,"
                "created_at"
            ),
            "order": "created_at.desc",
            "limit": "1",
        },
    )

    if not subscriptions:
        return {
            "is_premium": False,
            "plan": "free",
            "status": "inactive",
            "expires_at": None,
            "source": "none",
        }

    subscription = subscriptions[0]

    plan = str(
        subscription.get("plan") or ""
    ).strip().lower()

    status = str(
        subscription.get("status") or ""
    ).strip().lower()

    started_at = parse_datetime(
        subscription.get("started_at")
    )

    expires_at = parse_datetime(
        subscription.get("expires_at")
    )

    now = datetime.now(timezone.utc)

    premium_plans = {
        "premium",
        "premium monthly",
        "premium yearly",
        "premium annual",
    }

    premium_plan = plan in premium_plans

    active_status = status in {
        "active",
        "paid",
        "current",
    }

    started = (
        started_at is None
        or started_at <= now
    )

    not_expired = (
        expires_at is None
        or expires_at > now
    )

    is_premium = (
        premium_plan
        and active_status
        and started
        and not_expired
    )

    return {
        "is_premium": is_premium,
        "plan": plan if plan else "free",
        "status": status if status else "inactive",
        "expires_at": subscription.get("expires_at"),
        "started_at": subscription.get("started_at"),
        "subscription_id": subscription.get("id"),
        "source": "subscription",
    }


# ============================================================
# ENCOURAGEMENT
# ============================================================

def get_encouragement(score, attempts):
    if attempts == 0:
        return {
            "title": "Your journey starts here.",
            "message": (
                "Complete your first examination session "
                "and Overmaths will start learning "
                "your performance."
            )
        }

    if score >= 90:
        return {
            "title": "Excellent work.",
            "message": (
                "You're performing at a very high level. "
                "Keep challenging yourself."
            )
        }

    if score >= 80:
        return {
            "title": "You're doing very well.",
            "message": (
                "Your understanding is becoming strong. "
                "Keep practising consistently."
            )
        }

    if score >= 70:
        return {
            "title": "Good progress.",
            "message": (
                "You're building a solid foundation. "
                "Focus on the areas where you lose marks."
            )
        }

    if score >= 50:
        return {
            "title": "You're making progress.",
            "message": (
                "Don't be discouraged by mistakes. "
                "Every wrong answer shows you what to improve."
            )
        }

    return {
        "title": "Every attempt is progress.",
        "message": (
            "Use your mistakes as a study guide. "
            "Keep going and focus on understanding."
        )
    }


# ============================================================
# STREAK
# ============================================================

def calculate_streak(attempts):
    if not attempts:
        return 0

    dates = set()

    for attempt in attempts:
        created_at = attempt.get("created_at")

        if not created_at:
            continue

        try:
            date_text = str(created_at)[:10]

            dates.add(
                datetime.strptime(
                    date_text,
                    "%Y-%m-%d"
                ).date()
            )

        except (ValueError, TypeError):
            continue

    if not dates:
        return 0

    today = datetime.now(
        timezone.utc
    ).date()

    if today in dates:
        current = today

    elif today - timedelta(days=1) in dates:
        current = today - timedelta(days=1)

    else:
        return 0

    streak = 0

    while current in dates:
        streak += 1
        current -= timedelta(days=1)

    return streak


# ============================================================
# SHARED ACCESS RESPONSE
# ============================================================

def build_access_response(premium):
    return {
        "is_premium": premium["is_premium"],
        "mode": (
            "premium"
            if premium["is_premium"]
            else "free"
        ),
        "plan": premium["plan"],
        "status": premium["status"],
        "expires_at": premium.get("expires_at"),
        "started_at": premium.get("started_at"),
        "subscription_id": premium.get("subscription_id"),
        "source": premium.get("source"),
    }


# ============================================================
# DASHBOARD ACCESS
# ============================================================

@dashboard_api.route(
    "/access",
    methods=["GET"]
)
def dashboard_access():
    public_user, auth_error = authenticate_request()

    if auth_error:
        body, status_code = auth_error
        return jsonify(body), status_code

    try:
        premium = get_premium_access(public_user)

        return jsonify({
            "success": True,

            "user": {
                "id": public_user.get("id"),
                "role": public_user.get("role"),
            },

            "access": build_access_response(premium),
        })

    except Exception as error:
        print("DASHBOARD ACCESS ERROR:", error)

        return jsonify({
            "success": False,
            "error": "Unable to load dashboard access.",
        }), 500


# ============================================================
# DASHBOARD SUMMARY
# ============================================================

@dashboard_api.route(
    "/summary",
    methods=["GET"]
)
def dashboard_summary():
    public_user, auth_error = authenticate_request()

    if auth_error:
        body, status_code = auth_error
        return jsonify(body), status_code

    try:
        # ====================================================
        # 1. FIND AUTHENTICATED PUBLIC USER
        # ====================================================

        public_user_id = public_user.get("id")

        if not public_user_id:
            return jsonify({
                "success": False,
                "error": "User profile has no public ID.",
            }), 404

        # ====================================================
        # 2. PREMIUM ACCESS
        # ====================================================

        premium = get_premium_access(public_user)

        # ====================================================
        # 3. GET EXAMINATION ATTEMPTS
        # ====================================================

        attempts = supabase_get(
            "quiz_attempts",
            {
                "user_id": f"eq.{public_user_id}",
                "mode": f"eq.{EXAM_MODE}",
                "select": (
                    "id,user_id,course_id,score,"
                    "total_questions,mode,subject,topic,created_at"
                ),
                "order": "created_at.desc",
            },
        )

        # ====================================================
        # 4. NO ATTEMPTS
        # ====================================================

        if not attempts:
            return jsonify({
                "success": True,

                "access": build_access_response(premium),

                "overview": {
                    "questions_answered": 0,
                    "correct_answers": 0,
                    "accuracy": 0,
                    "study_streak": 0,
                    "exam_readiness": 0,
                    "attempts": 0,
                },

                "performance": {
                    "current": 0,
                    "previous": 0,
                    "trend": 0,
                    "history": [],
                },

                "weaknesses": [],
                "strengths": [],
                "subjects": [],
                "topics": [],
                "recent_activity": [],

                "encouragement": get_encouragement(0, 0),
            })

        # ====================================================
        # 5. GET ANSWERS
        # ====================================================

        attempt_ids = [
            attempt.get("id")
            for attempt in attempts
            if attempt.get("id") is not None
        ]

        answers = []

        if attempt_ids:
            ids_string = ",".join(
                str(value)
                for value in attempt_ids
            )

            answers = supabase_get(
                "quiz_answers",
                {
                    "attempt_id": f"in.({ids_string})",
                    "select": (
                        "id,attempt_id,question_id,"
                        "selected_answer,is_correct"
                    ),
                },
            )

        # ====================================================
        # 6. GET QUESTIONS
        # ====================================================

        question_ids = list({
            answer.get("question_id")
            for answer in answers
            if answer.get("question_id") is not None
        })

        questions = []

        if question_ids:
            ids_string = ",".join(
                str(value)
                for value in question_ids
            )

            questions = supabase_get(
                "questions",
                {
                    "id": f"in.({ids_string})",
                    "select": "id,subject,topic,course_id",
                },
            )

        question_map = {
            str(question["id"]): question
            for question in questions
            if question.get("id") is not None
        }

        # ====================================================
        # 7. OVERALL STATISTICS
        # ====================================================

        total_questions_answered = 0
        total_correct = 0

        for answer in answers:
            if answer.get("selected_answer") is None:
                continue

            total_questions_answered += 1

            if answer.get("is_correct") is True:
                total_correct += 1

        overall_accuracy = percentage(
            total_correct,
            total_questions_answered
        )

        # ====================================================
        # 8. PERFORMANCE HISTORY
        # ====================================================

        performance_history = []

        for attempt in reversed(attempts):
            score = attempt.get("score") or 0

            try:
                score = float(score)
            except (TypeError, ValueError):
                score = 0

            performance_history.append({
                "id": attempt.get("id"),
                "score": round(score),
                "subject": attempt.get("subject"),
                "topic": attempt.get("topic"),
                "mode": attempt.get("mode"),
                "created_at": attempt.get("created_at"),
            })

        current_score = (
            performance_history[-1]["score"]
            if performance_history
            else 0
        )

        previous_score = (
            performance_history[-2]["score"]
            if len(performance_history) > 1
            else current_score
        )

        trend = current_score - previous_score

        # ====================================================
        # 9. SUBJECT PERFORMANCE
        # ====================================================

        subject_stats = {}

        for answer in answers:
            if answer.get("selected_answer") is None:
                continue

            question_id = answer.get("question_id")

            question = question_map.get(
                str(question_id)
            )

            if not question:
                continue

            subject = question.get("subject") or "General"

            if subject not in subject_stats:
                subject_stats[subject] = {
                    "subject": subject,
                    "answered": 0,
                    "correct": 0,
                }

            subject_stats[subject]["answered"] += 1

            if answer.get("is_correct") is True:
                subject_stats[subject]["correct"] += 1

        subjects = []

        for subject_data in subject_stats.values():
            answered = subject_data["answered"]
            correct = subject_data["correct"]

            subject_data["accuracy"] = percentage(
                correct,
                answered
            )

            subjects.append(subject_data)

        subjects.sort(
            key=lambda item: item["accuracy"]
        )

        # ====================================================
        # 10. WEAKNESSES
        # ====================================================

        weaknesses = []

        for subject in subjects:
            if (
                subject["answered"] >= 2
                and subject["accuracy"] < 70
            ):
                weaknesses.append({
                    "topic": subject["subject"],
                    "subject": subject["subject"],
                    "accuracy": subject["accuracy"],
                    "questions": subject["answered"],
                })

        weaknesses = weaknesses[:5]

        # ====================================================
        # 11. STRENGTHS
        # ====================================================

        strengths = []

        for subject in sorted(
            subjects,
            key=lambda item: item["accuracy"],
            reverse=True
        ):
            if (
                subject["answered"] >= 2
                and subject["accuracy"] >= 80
            ):
                strengths.append({
                    "topic": subject["subject"],
                    "subject": subject["subject"],
                    "accuracy": subject["accuracy"],
                    "questions": subject["answered"],
                })

        strengths = strengths[:5]

        # ====================================================
        # 12. STUDY STREAK
        # ====================================================

        study_streak = calculate_streak(attempts)

        # ====================================================
        # 13. EXAM READINESS
        # ====================================================

        attempt_count = len(attempts)

        consistency_score = min(
            attempt_count * 10,
            100
        )

        exam_readiness = round(
            (overall_accuracy * 0.7)
            + (consistency_score * 0.3)
        )

        # ====================================================
        # 14. RECENT ACTIVITY
        # ====================================================

        recent_activity = []

        for attempt in attempts[:5]:
            recent_activity.append({
                "id": attempt.get("id"),
                "score": attempt.get("score") or 0,
                "total_questions": (
                    attempt.get("total_questions") or 0
                ),
                "subject": attempt.get("subject"),
                "topic": attempt.get("topic"),
                "mode": attempt.get("mode"),
                "created_at": attempt.get("created_at"),
            })

        # ====================================================
        # 15. ENCOURAGEMENT
        # ====================================================

        encouragement = get_encouragement(
            overall_accuracy,
            attempt_count
        )

        # ====================================================
        # 16. FINAL RESPONSE
        # ====================================================

        return jsonify({
            "success": True,

            "access": build_access_response(premium),

            "overview": {
                "questions_answered": total_questions_answered,
                "correct_answers": total_correct,
                "accuracy": overall_accuracy,
                "study_streak": study_streak,
                "exam_readiness": exam_readiness,
                "attempts": attempt_count,
            },

            "performance": {
                "current": current_score,
                "previous": previous_score,
                "trend": trend,
                "history": performance_history[-10:],
            },

            "weaknesses": weaknesses,
            "strengths": strengths,
            "subjects": subjects,
            "topics": [],
            "recent_activity": recent_activity,
            "encouragement": encouragement,
        })

    except Exception as error:
        # Log the technical error on the server, without
        # exposing database details to the browser.
        print("DASHBOARD API ERROR:", error)

        return jsonify({
            "success": False,
            "error": "Unable to load your dashboard summary.",
        }), 500