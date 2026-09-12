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


def supabase_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }


def supabase_get(table, params=None):
    """
    Read data from Supabase using the server-side service key.
    """

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "Supabase environment variables are missing."
        )

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table}"

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


def percentage(correct, total):
    if not total:
        return 0

    return round((correct / total) * 100)


def get_encouragement(score, attempts):

    if attempts == 0:
        return {
            "title": "Your journey starts here.",
            "message": (
                "Complete your first examination session and "
                "Overmaths will start learning your performance."
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


def calculate_streak(attempts):

    if not attempts:
        return 0

    dates = set()

    for attempt in attempts:

        created_at = attempt.get("created_at")

        if not created_at:
            continue

        try:
            date_text = created_at[:10]

            dates.add(
                datetime.strptime(
                    date_text,
                    "%Y-%m-%d"
                ).date()
            )

        except Exception:
            continue

    if not dates:
        return 0

    today = datetime.now(timezone.utc).date()

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


def get_public_user_id(auth_user_id):
    """
    Convert the Supabase Auth UUID into the bigint ID
    used by the public.users and quiz_attempts tables.
    """

    users = supabase_get(
        "users",
        {
            "auth_user_id": f"eq.{auth_user_id}",
            "select": "id",
            "limit": "1",
        },
    )

    if not users:
        return None

    return users[0].get("id")


@dashboard_api.route("/summary", methods=["GET"])
def dashboard_summary():

    auth_user_id = request.args.get("user_id")

    if not auth_user_id:
        return jsonify({
            "error": "user_id is required"
        }), 400

    try:

        # =========================================================
        # 1. RESOLVE AUTH UUID → PUBLIC USER BIGINT
        # =========================================================

        public_user_id = get_public_user_id(
            auth_user_id
        )

        if public_user_id is None:
            return jsonify({
                "success": False,
                "error": (
                    "Overmaths user profile was not found "
                    "for this authenticated user."
                ),
            }), 404

        # =========================================================
        # 2. GET EXAMINATION ATTEMPTS ONLY
        # =========================================================

        attempts = supabase_get(
            "quiz_attempts",
            {
                "user_id": f"eq.{public_user_id}",
                "mode": f"eq.{EXAM_MODE}",
                "order": "created_at.desc",
            },
        )

        # =========================================================
        # 3. NO EXAMINATION ATTEMPTS YET
        # =========================================================

        if not attempts:

            return jsonify({

                "success": True,

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

                "encouragement":
                    get_encouragement(0, 0),
            })

        # =========================================================
        # 4. GET ANSWERS
        # =========================================================

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
                },
            )

        # =========================================================
        # 5. GET QUESTIONS
        # =========================================================

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
            question["id"]: question
            for question in questions
        }

        # =========================================================
        # 6. OVERALL STATISTICS
        # =========================================================

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

        # =========================================================
        # 7. PERFORMANCE HISTORY
        # =========================================================

        performance_history = []

        for attempt in reversed(attempts):

            score = attempt.get("score") or 0

            try:
                score = float(score)
            except Exception:
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

        # =========================================================
        # 8. SUBJECT PERFORMANCE
        # =========================================================

        subject_stats = {}

        for answer in answers:

            if answer.get("selected_answer") is None:
                continue

            question = question_map.get(
                answer.get("question_id")
            )

            if not question:
                continue

            subject = (
                question.get("subject")
                or "General"
            )

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

        # =========================================================
        # 9. AREAS TO IMPROVE
        # =========================================================

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

        # =========================================================
        # 10. STRONG AREAS
        # =========================================================

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

        # =========================================================
        # 11. STUDY STREAK
        # =========================================================

        study_streak = calculate_streak(
            attempts
        )

        # =========================================================
        # 12. EXAM READINESS
        # =========================================================

        attempt_count = len(attempts)

        consistency_score = min(
            attempt_count * 10,
            100
        )

        exam_readiness = round(
            (overall_accuracy * 0.7)
            + (consistency_score * 0.3)
        )

        # =========================================================
        # 13. RECENT ACTIVITY
        # =========================================================

        recent_activity = []

        for attempt in attempts[:5]:

            recent_activity.append({
                "id": attempt.get("id"),
                "score": attempt.get("score") or 0,
                "total_questions": attempt.get(
                    "total_questions"
                ) or 0,
                "subject": attempt.get("subject"),
                "topic": attempt.get("topic"),
                "mode": attempt.get("mode"),
                "created_at": attempt.get("created_at"),
            })

        # =========================================================
        # 14. ENCOURAGEMENT
        # =========================================================

        encouragement = get_encouragement(
            overall_accuracy,
            attempt_count
        )

        # =========================================================
        # 15. FINAL RESPONSE
        # =========================================================

        return jsonify({

            "success": True,

            "overview": {
                "questions_answered":
                    total_questions_answered,

                "correct_answers":
                    total_correct,

                "accuracy":
                    overall_accuracy,

                "study_streak":
                    study_streak,

                "exam_readiness":
                    exam_readiness,

                "attempts":
                    attempt_count,
            },

            "performance": {
                "current":
                    current_score,

                "previous":
                    previous_score,

                "trend":
                    trend,

                "history":
                    performance_history[-10:],
            },

            "weaknesses":
                weaknesses,

            "strengths":
                strengths,

            "subjects":
                subjects,

            "topics":
                [],

            "recent_activity":
                recent_activity,

            "encouragement":
                encouragement,
        })

    except Exception as error:

        print(
            "DASHBOARD API ERROR:",
            error
        )

        return jsonify({
            "success": False,
            "error": str(error),
        }), 500