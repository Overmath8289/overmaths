
import os
import requests

from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

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

DEFAULT_TIMEZONE = "Africa/Lagos"


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
            f"{response.status_code} {response.text}"
        )

    return response.json()


def supabase_rpc(function_name, payload):
    """
    Call a PostgreSQL function through Supabase RPC.
    """

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "Supabase environment variables are missing."
        )

    url = (
        f"{SUPABASE_URL.rstrip('/')}"
        f"/rest/v1/rpc/{function_name}"
    )

    response = requests.post(
        url,
        headers=supabase_headers(),
        json=payload,
        timeout=45,
    )

    if not response.ok:
        raise RuntimeError(
            f"Supabase RPC failed for {function_name}: "
            f"{response.status_code} {response.text}"
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

    return round((correct / total) * 100)


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


def format_attempt_subjects(value):
    if isinstance(value, list):
        return ", ".join(
            str(item) for item in value if item
        ) or None

    if isinstance(value, str):
        return value.strip() or None

    return None


def get_timezone():
    """
    Use the requested timezone if valid.
    Otherwise use Africa/Lagos.
    """

    requested_timezone = (
        request.args.get("timezone")
        or DEFAULT_TIMEZONE
    )

    try:
        ZoneInfo(requested_timezone)
        return requested_timezone

    except (ZoneInfoNotFoundError, ValueError):
        return DEFAULT_TIMEZONE


def calculate_streak_from_daily(daily, timezone_name):
    """
    Calculate a study streak from completed daily activity.

    The SQL analytics function provides the daily buckets,
    so Flask does not need to download every quiz attempt.
    """

    if not daily:
        return 0

    try:
        local_timezone = ZoneInfo(timezone_name)
    except (ZoneInfoNotFoundError, ValueError):
        local_timezone = timezone.utc

    today = datetime.now(local_timezone).date()

    active_dates = set()

    for item in daily:
        if not isinstance(item, dict):
            continue

        if not item.get("attempts"):
            continue

        date_value = item.get("date")

        if not date_value:
            continue

        try:
            date_text = str(date_value)[:10]

            activity_date = datetime.strptime(
                date_text,
                "%Y-%m-%d"
            ).date()

            active_dates.add(activity_date)

        except (ValueError, TypeError):
            continue

    if today in active_dates:
        current_date = today

    elif today - timedelta(days=1) in active_dates:
        current_date = today - timedelta(days=1)

    else:
        return 0

    streak = 0

    while current_date in active_dates:
        streak += 1
        current_date -= timedelta(days=1)

    return streak


def get_encouragement(score, attempts):
    if attempts == 0:
        return {
            "title": "Your journey starts here.",
            "message": (
                "Complete your first quiz and Overmaths "
                "will start learning about your performance."
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
# ANALYTICS RESPONSE HELPERS
# ============================================================

def build_performance_history(recent_activity):
    """
    Convert recent SQL analytics activity into the
    performance-history format used by the dashboard.
    """

    history = []

    for attempt in reversed(recent_activity or []):
        score = attempt.get("score") or 0

        try:
            score = round(float(score))
        except (TypeError, ValueError):
            score = 0

        history.append({
            "id": attempt.get("id"),
            "score": score,
            "subject": format_attempt_subjects(
                attempt.get("subjects")
            ),
            "topic": attempt.get("selected_topic"),
            "mode": attempt.get("mode"),
            "exam_purpose": attempt.get("purpose"),
            "created_at": attempt.get("completed_at"),
            "completed_at": attempt.get("completed_at"),
        })

    current_score = (
        history[-1]["score"]
        if history
        else 0
    )

    previous_score = (
        history[-2]["score"]
        if len(history) > 1
        else current_score
    )

    return {
        "current": current_score,
        "previous": previous_score,
        "trend": current_score - previous_score,
        "history": history[-10:],
    }


def build_subject_insights(subjects):
    """
    Build the existing dashboard weakness and strength
    fields from SQL subject analytics.
    """

    weaknesses = []
    strengths = []

    for subject in subjects or []:
        answered = subject.get("answered", 0) or 0
        accuracy = subject.get("accuracy", 0) or 0
        subject_name = subject.get("subject") or "General"

        if answered >= 2 and accuracy < 70:
            weaknesses.append({
                "topic": subject_name,
                "subject": subject_name,
                "accuracy": accuracy,
                "questions": answered,
            })

        if answered >= 2 and accuracy >= 80:
            strengths.append({
                "topic": subject_name,
                "subject": subject_name,
                "accuracy": accuracy,
                "questions": answered,
            })

    weaknesses.sort(
        key=lambda item: item["accuracy"]
    )

    strengths.sort(
        key=lambda item: item["accuracy"],
        reverse=True
    )

    return weaknesses[:5], strengths[:5]


def build_purpose_summary(purposes):
    """
    Make the practice and My Exam statistics easy for
    the frontend to access separately.
    """

    result = {
        "practice": None,
        "my_exam": None,
    }

    for item in purposes or []:
        purpose = (
            item.get("exam_purpose")
            or item.get("purpose")
            or ""
        ).strip().lower()

        if purpose in result:
            result[purpose] = item

    return result


# ============================================================
# DASHBOARD ACCESS
# ============================================================

@dashboard_api.route("/access", methods=["GET"])
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

@dashboard_api.route("/summary", methods=["GET"])
def dashboard_summary():
    public_user, auth_error = authenticate_request()

    if auth_error:
        body, status_code = auth_error
        return jsonify(body), status_code

    try:
        public_user_id = public_user.get("id")

        if not public_user_id:
            return jsonify({
                "success": False,
                "error": "User profile has no public ID.",
            }), 404

        premium = get_premium_access(public_user)

        timezone_name = get_timezone()

        # ----------------------------------------------------
        # GET ALL STUDENT ANALYTICS FROM THE SQL FUNCTION
        # ----------------------------------------------------

        analytics = supabase_rpc(
            "get_student_learning_analytics",
            {
                "p_user_id": public_user_id,
                "p_timezone": timezone_name,
            },
        )

        if not isinstance(analytics, dict):
            raise RuntimeError(
                "The analytics function returned an invalid response."
            )

        overview_data = analytics.get("overview") or {}
        recent_activity = analytics.get("recent_activity") or []
        subjects = analytics.get("subjects") or []
        topics = analytics.get("topics") or []
        purposes = analytics.get("purposes") or []
        daily = analytics.get("daily") or []
        weekly = analytics.get("weekly") or []
        monthly = analytics.get("monthly") or []

        # ----------------------------------------------------
        # OVERVIEW
        # ----------------------------------------------------

        total_attempts = overview_data.get(
            "total_attempts", 0
        ) or 0

        total_questions = overview_data.get(
            "total_questions", 0
        ) or 0

        questions_answered = overview_data.get(
            "questions_answered", 0
        ) or 0

        correct_answers = overview_data.get(
            "correct_answers", 0
        ) or 0

        incorrect_answers = overview_data.get(
            "incorrect_answers", 0
        ) or 0

        unanswered_questions = overview_data.get(
            "unanswered_questions", 0
        ) or 0

        accuracy = overview_data.get(
            "accuracy", 0
        ) or 0

        overall_score = overview_data.get(
            "overall_score", 0
        ) or 0

        study_streak = calculate_streak_from_daily(
            daily,
            timezone_name
        )

        # ----------------------------------------------------
        # PERFORMANCE HISTORY
        # ----------------------------------------------------

        performance = build_performance_history(
            recent_activity
        )

        # ----------------------------------------------------
        # SUBJECT WEAKNESSES AND STRENGTHS
        # ----------------------------------------------------

        weaknesses, strengths = build_subject_insights(
            subjects
        )

        # ----------------------------------------------------
        # PRACTICE AND MY EXAM STATISTICS
        # ----------------------------------------------------

        purpose_summary = build_purpose_summary(
            purposes
        )

        # ----------------------------------------------------
        # RECENT ACTIVITY
        # ----------------------------------------------------

        formatted_recent_activity = []

        for attempt in recent_activity:
            formatted_recent_activity.append({
                "id": attempt.get("id"),
                "score": attempt.get("score") or 0,
                "total_questions": (
                    attempt.get("total_questions") or 0
                ),
                "subject": format_attempt_subjects(
                    attempt.get("subjects")
                ),
                "topic": attempt.get("selected_topic"),
                "mode": attempt.get("mode"),
                "exam_purpose": attempt.get("purpose"),
                "exam_title": attempt.get("exam_title"),
                "created_at": attempt.get("completed_at"),
                "completed_at": attempt.get("completed_at"),
            })

        # ----------------------------------------------------
        # ENCOURAGEMENT
        # ----------------------------------------------------

        encouragement = get_encouragement(
            accuracy,
            total_attempts
        )

        # ----------------------------------------------------
        # FINAL RESPONSE
        # ----------------------------------------------------

        return jsonify({
            "success": True,

            "access": build_access_response(premium),

            # Existing dashboard fields.
            "overview": {
                "questions_answered": questions_answered,
                "correct_answers": correct_answers,
                "incorrect_answers": incorrect_answers,
                "unanswered_questions": unanswered_questions,
                "total_questions": total_questions,
                "accuracy": accuracy,
                "overall_score": overall_score,
                "study_streak": study_streak,

                # No artificial readiness percentage.
                "exam_readiness": None,

                "attempts": total_attempts,
                "total_attempts": total_attempts,
            },

            "performance": performance,

            "weaknesses": weaknesses,
            "strengths": strengths,

            "subjects": subjects,
            "topics": topics,

            "recent_activity": formatted_recent_activity,

            "encouragement": encouragement,

            # New analytics data.
            "analytics": {
                "timezone": timezone_name,
                "overview": overview_data,
                "purposes": purposes,
                "practice": purpose_summary["practice"],
                "my_exam": purpose_summary["my_exam"],
                "daily": daily,
                "weekly": weekly,
                "monthly": monthly,
                "subjects": subjects,
                "topics": topics,
                "recent_activity": formatted_recent_activity,
            },
        })

    except Exception as error:
        print("DASHBOARD API ERROR:", error)

        return jsonify({
            "success": False,
            "error": "Unable to load your dashboard summary.",
        }), 500
