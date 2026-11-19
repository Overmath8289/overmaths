"""
Performance & Readiness Engine
--------------------------------
This module contains independent calculations for the
Performance & Readiness section.

It does not access Supabase or modify quiz records.

Expected inputs:
    attempts: completed rows from quiz_attempts
    answers: rows from quiz_answers
    questions: matching rows from questions

Main function:
    build_performance_readiness(attempts, answers, questions)
"""

from collections import defaultdict
from datetime import datetime, date, timedelta, timezone
import json
import math
import re
import unicodedata


# ---------------------------------------------------------
# GENERAL HELPERS
# ---------------------------------------------------------

def _safe_number(value, default=0):
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_int(value, default=0):
    try:
        if value is None:
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _parse_datetime(value):
    if not value:
        return None

    if isinstance(value, datetime):
        result = value
    else:
        try:
            result = datetime.fromisoformat(
                str(value).replace("Z", "+00:00")
            )
        except (TypeError, ValueError):
            return None

    if result.tzinfo is None:
        result = result.replace(tzinfo=timezone.utc)

    return result


def _normalise_text(value):
    if value is None:
        return ""

    value = unicodedata.normalize("NFKC", str(value))
    value = re.sub(r"\s+", " ", value).strip()

    return value


def _normalise_subject(value):
    """
    Normalises subject labels for grouping.

    Physical and Health Education and Physical Health
    Education are treated as the same subject.
    """
    value = _normalise_text(value)
    key = value.casefold()

    if key in {
        "physical and health education",
        "physical health education",
    }:
        return "physical and health education"

    return key


def _display_subject(value):
    key = _normalise_subject(value)

    if key == "physical and health education":
        return "Physical and Health Education"

    return _normalise_text(value)


def _parse_json_value(value):
    if isinstance(value, (dict, list)):
        return value

    if not value:
        return None

    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return None


def _percentage(numerator, denominator):
    if not denominator:
        return 0

    return round((numerator / denominator) * 100, 2)


def _average(values):
    valid = [
        _safe_number(value)
        for value in values
        if value is not None
    ]

    if not valid:
        return 0

    return round(sum(valid) / len(valid), 2)


def _format_duration(seconds):
    seconds = max(0, _safe_int(seconds))

    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    remaining_seconds = seconds % 60

    if hours:
        return f"{hours}h {minutes}m"

    if minutes:
        return f"{minutes}m {remaining_seconds}s"

    return f"{remaining_seconds}s"


# ---------------------------------------------------------
# PREPARE DATABASE RECORDS
# ---------------------------------------------------------

def _prepare_questions(questions):
    question_map = {}

    for question in questions or []:
        question_id = _safe_int(question.get("id"), -1)

        if question_id < 0:
            continue

        question_map[question_id] = {
            "id": question_id,
            "subject": _display_subject(question.get("subject")),
            "subject_key": _normalise_subject(
                question.get("subject")
            ),
            "topic": _normalise_text(question.get("topic"))
                or "Unspecified topic",
            "difficulty": _normalise_text(
                question.get("difficulty")
            ) or "Unspecified",
        }

    return question_map


def _prepare_attempts(attempts):
    prepared = []

    for attempt in attempts or []:
        if attempt.get("completed_at") is None:
            continue

        attempt_id = _safe_int(attempt.get("id"), -1)

        if attempt_id < 0:
            continue

        started_at = _parse_datetime(attempt.get("started_at"))
        completed_at = _parse_datetime(
            attempt.get("completed_at")
        )

        duration_seconds = None

        if started_at and completed_at:
            duration_seconds = max(
                0,
                int((completed_at - started_at).total_seconds())
            )

        subjects = _parse_json_value(attempt.get("subjects"))

        if not isinstance(subjects, list):
            subjects = []

        prepared.append({
            "id": attempt_id,
            "score": _safe_number(attempt.get("score")),
            "total_questions": _safe_int(
                attempt.get("total_questions")
            ),
            "mode": _normalise_text(attempt.get("mode")),
            "exam_purpose": _normalise_text(
                attempt.get("exam_purpose")
            ),
            "exam_title": _normalise_text(
                attempt.get("exam_title")
            ),
            "selected_topic": _normalise_text(
                attempt.get("selected_topic")
            ),
            "subjects": subjects,
            "target_score": attempt.get("target_score"),
            "exam_date": attempt.get("exam_date"),
            "started_at": started_at,
            "completed_at": completed_at,
            "duration_seconds": duration_seconds,
        })

    prepared.sort(
        key=lambda item: item["completed_at"] or datetime.min.replace(
            tzinfo=timezone.utc
        )
    )

    return prepared


# ---------------------------------------------------------
# MAIN CALCULATION
# ---------------------------------------------------------

def build_performance_readiness(
    attempts,
    answers,
    questions,
    now=None,
):
    """
    Build the student's Performance & Readiness data.

    This function only calculates from records supplied to it.
    It does not invent missing information.
    """

    if now is None:
        now = datetime.now(timezone.utc)
    elif isinstance(now, date) and not isinstance(now, datetime):
        now = datetime.combine(
            now,
            datetime.min.time(),
            tzinfo=timezone.utc,
        )

    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    question_map = _prepare_questions(questions)
    prepared_attempts = _prepare_attempts(attempts)

    attempt_map = {
        attempt["id"]: attempt
        for attempt in prepared_attempts
    }

    answers_by_attempt = defaultdict(list)
    answers_by_subject = defaultdict(list)
    answers_by_topic = defaultdict(list)
    answers_by_difficulty = defaultdict(list)
    answers_by_question = defaultdict(list)

    # -----------------------------------------------------
    # GROUP ANSWERS
    # -----------------------------------------------------

    for answer in answers or []:
        attempt_id = _safe_int(answer.get("attempt_id"), -1)
        question_id = _safe_int(answer.get("question_id"), -1)

        if attempt_id not in attempt_map:
            continue

        question = question_map.get(question_id)

        if not question:
            continue

        selected_answer = _normalise_text(
            answer.get("selected_answer")
        )

        is_correct = answer.get("is_correct")

        # The database stores unanswered questions as NULL.
        is_unanswered = not selected_answer

        record = {
            "attempt_id": attempt_id,
            "question_id": question_id,
            "selected_answer": selected_answer or None,
            "is_correct": (
                bool(is_correct)
                if not is_unanswered and is_correct is not None
                else False
            ),
            "is_unanswered": is_unanswered,
            "subject": question["subject"],
            "subject_key": question["subject_key"],
            "topic": question["topic"],
            "difficulty": question["difficulty"],
            "created_at": _parse_datetime(
                answer.get("created_at")
            ),
        }

        answers_by_attempt[attempt_id].append(record)
        answers_by_subject[question["subject_key"]].append(record)

        topic_key = (
            question["subject_key"],
            question["topic"].casefold(),
        )

        answers_by_topic[topic_key].append(record)

        answers_by_difficulty[
            question["difficulty"].casefold()
        ].append(record)

        answers_by_question[question_id].append(record)

    # -----------------------------------------------------
    # OVERALL PERFORMANCE
    # -----------------------------------------------------

    all_answers = [
        answer
        for attempt_answers in answers_by_attempt.values()
        for answer in attempt_answers
    ]

    total_questions = len(all_answers)

    correct_answers = sum(
        1 for answer in all_answers
        if answer["is_correct"] and not answer["is_unanswered"]
    )

    unanswered_questions = sum(
        1 for answer in all_answers
        if answer["is_unanswered"]
    )

    answered_questions = total_questions - unanswered_questions
    incorrect_answers = answered_questions - correct_answers

    overall_accuracy = _percentage(
        correct_answers,
        answered_questions,
    )

    completion_rate = _percentage(
        answered_questions,
        total_questions,
    )

    # -----------------------------------------------------
    # SUBJECT PERFORMANCE
    # -----------------------------------------------------

    subjects = []

    for subject_key, records in answers_by_subject.items():
        subject_correct = sum(
            1 for item in records
            if item["is_correct"] and not item["is_unanswered"]
        )

        subject_unanswered = sum(
            1 for item in records if item["is_unanswered"]
        )

        subject_answered = len(records) - subject_unanswered

        subject_incorrect = subject_answered - subject_correct

        subjects.append({
            "subject": records[0]["subject"],
            "total_questions": len(records),
            "answered": subject_answered,
            "correct": subject_correct,
            "incorrect": subject_incorrect,
            "unanswered": subject_unanswered,
            "accuracy": _percentage(
                subject_correct,
                subject_answered,
            ),
            "completion_rate": _percentage(
                subject_answered,
                len(records),
            ),
        })

    subjects.sort(
        key=lambda item: item["accuracy"],
        reverse=True,
    )

    # -----------------------------------------------------
    # TOPIC PERFORMANCE
    # -----------------------------------------------------

    topics = []

    for topic_key, records in answers_by_topic.items():
        topic_correct = sum(
            1 for item in records
            if item["is_correct"] and not item["is_unanswered"]
        )

        topic_unanswered = sum(
            1 for item in records if item["is_unanswered"]
        )

        topic_answered = len(records) - topic_unanswered

        topics.append({
            "subject": records[0]["subject"],
            "topic": records[0]["topic"],
            "total_questions": len(records),
            "answered": topic_answered,
            "correct": topic_correct,
            "incorrect": topic_answered - topic_correct,
            "unanswered": topic_unanswered,
            "accuracy": _percentage(
                topic_correct,
                topic_answered,
            ),
        })

    topics.sort(
        key=lambda item: (
            item["accuracy"],
            -item["total_questions"],
        )
    )

    # -----------------------------------------------------
    # DIFFICULTY PERFORMANCE
    # -----------------------------------------------------

    difficulty = []

    for difficulty_key, records in answers_by_difficulty.items():
        correct = sum(
            1 for item in records
            if item["is_correct"] and not item["is_unanswered"]
        )

        unanswered = sum(
            1 for item in records if item["is_unanswered"]
        )

        answered = len(records) - unanswered

        difficulty.append({
            "difficulty": records[0]["difficulty"],
            "total_questions": len(records),
            "answered": answered,
            "correct": correct,
            "incorrect": answered - correct,
            "unanswered": unanswered,
            "accuracy": _percentage(correct, answered),
        })

    # -----------------------------------------------------
    # ATTEMPT HISTORY
    # -----------------------------------------------------

    attempt_history = []

    for attempt in prepared_attempts:
        records = answers_by_attempt.get(attempt["id"], [])

        attempt_correct = sum(
            1 for item in records
            if item["is_correct"] and not item["is_unanswered"]
        )

        attempt_unanswered = sum(
            1 for item in records if item["is_unanswered"]
        )

        attempt_answered = len(records) - attempt_unanswered

        attempt_date = attempt["completed_at"]

        attempt_history.append({
            "attempt_id": attempt["id"],
            "date": (
                attempt_date.isoformat()
                if attempt_date else None
            ),
            "mode": attempt["mode"],
            "exam_purpose": attempt["exam_purpose"],
            "exam_title": attempt["exam_title"],
            "score": attempt["score"],
            "total_questions": attempt["total_questions"],
            "recorded_answers": len(records),
            "correct": attempt_correct,
            "incorrect": attempt_answered - attempt_correct,
            "unanswered": attempt_unanswered,
            "accuracy": _percentage(
                attempt_correct,
                attempt_answered,
            ),
            "duration_seconds": attempt["duration_seconds"],
            "duration_display": (
                _format_duration(attempt["duration_seconds"])
                if attempt["duration_seconds"] is not None
                else None
            ),
        })

    # -----------------------------------------------------
    # RECENT PERFORMANCE TREND
    # -----------------------------------------------------

    recent_attempts = prepared_attempts[-10:]

    recent_scores = [
        _safe_number(item["score"])
        for item in recent_attempts
    ]

    earlier_attempts = prepared_attempts[-20:-10]

    earlier_scores = [
        _safe_number(item["score"])
        for item in earlier_attempts
    ]

    recent_average = _average(recent_scores)
    earlier_average = _average(earlier_scores)

    if len(recent_attempts) >= 2 and earlier_attempts:
        performance_change = round(
            recent_average - earlier_average,
            2,
        )
    else:
        performance_change = None

    if performance_change is None:
        performance_trend = "not_enough_data"
    elif performance_change > 1:
        performance_trend = "improving"
    elif performance_change < -1:
        performance_trend = "declining"
    else:
        performance_trend = "stable"

    # -----------------------------------------------------
    # LEARNING CONSISTENCY AND STREAK
    # -----------------------------------------------------

    activity_dates = sorted({
        item["completed_at"].date()
        for item in prepared_attempts
        if item["completed_at"]
    })

    active_days_last_30 = sum(
        1 for activity_date in activity_dates
        if (now.date() - activity_date).days < 30
    )

    date_set = set(activity_dates)

    streak = 0
    check_date = now.date()

    # Allow today's activity or yesterday's activity to
    # begin the current streak.
    if check_date not in date_set:
        check_date -= timedelta(days=1)

    while check_date in date_set:
        streak += 1
        check_date -= timedelta(days=1)

    daily_activity = []

    for offset in range(13, -1, -1):
        activity_date = now.date() - timedelta(days=offset)

        count = sum(
            1 for item in prepared_attempts
            if item["completed_at"]
            and item["completed_at"].date() == activity_date
        )

        daily_activity.append({
            "date": activity_date.isoformat(),
            "attempts": count,
            "active": count > 0,
        })

    # -----------------------------------------------------
    # REPEATED MISTAKES
    # -----------------------------------------------------

    repeated_mistakes = []

    for question_id, records in answers_by_question.items():
        incorrect_records = [
            item for item in records
            if not item["is_correct"] and not item["is_unanswered"]
        ]

        if len(incorrect_records) < 2:
            continue

        question = question_map.get(question_id, {})

        repeated_mistakes.append({
            "question_id": question_id,
            "subject": question.get("subject"),
            "topic": question.get("topic"),
            "difficulty": question.get("difficulty"),
            "incorrect_attempts": len(incorrect_records),
            "total_attempts": len(records),
        })

    repeated_mistakes.sort(
        key=lambda item: item["incorrect_attempts"],
        reverse=True,
    )

    # -----------------------------------------------------
    # RETENTION: REPEATED QUESTION PERFORMANCE
    # -----------------------------------------------------

    retention_records = []

    for question_id, records in answers_by_question.items():
        chronological = sorted(
            records,
            key=lambda item: (
                item["created_at"] or datetime.min.replace(
                    tzinfo=timezone.utc
                )
            ),
        )

        if len(chronological) < 2:
            continue

        first = chronological[0]
        latest = chronological[-1]

        retention_records.append({
            "question_id": question_id,
            "subject": first["subject"],
            "topic": first["topic"],
            "attempts": len(chronological),
            "first_correct": (
                first["is_correct"]
                and not first["is_unanswered"]
            ),
            "latest_correct": (
                latest["is_correct"]
                and not latest["is_unanswered"]
            ),
            "improved": (
                not first["is_correct"]
                and latest["is_correct"]
                and not latest["is_unanswered"]
            ),
            "latest_date": (
                latest["created_at"].isoformat()
                if latest["created_at"] else None
            ),
        })

    # -----------------------------------------------------
    # REVISION PRIORITIES
    # -----------------------------------------------------

    revision_priorities = []

    for topic in topics:
        if topic["total_questions"] < 2:
            continue

        if topic["accuracy"] < 70:
            priority = "high"
        elif topic["accuracy"] < 85:
            priority = "medium"
        else:
            continue

        revision_priorities.append({
            "subject": topic["subject"],
            "topic": topic["topic"],
            "accuracy": topic["accuracy"],
            "questions_attempted": topic["total_questions"],
            "priority": priority,
            "reason": (
                "Low accuracy in attempted questions"
                if priority == "high"
                else "Topic could benefit from further practice"
            ),
        })

    priority_order = {
        "high": 0,
        "medium": 1,
    }

    revision_priorities.sort(
        key=lambda item: (
            priority_order[item["priority"]],
            item["accuracy"],
        )
    )

    # -----------------------------------------------------
    # PERSONAL BEST
    # -----------------------------------------------------

    best_attempt = None

    if attempt_history:
        best_attempt = max(
            attempt_history,
            key=lambda item: item["score"],
        )

    # -----------------------------------------------------
    # READINESS ESTIMATE
    # -----------------------------------------------------

    # This is an estimate based on actual recorded performance.
    # It is NOT a guaranteed examination result and does not
    # measure full syllabus coverage.

    readiness = {
        "status": "not_enough_data",
        "score": None,
        "description": (
            "Complete more quizzes to build a meaningful "
            "readiness estimate."
        ),
        "based_on": [
            "Recent quiz performance",
            "Recorded answer accuracy",
            "Learning consistency",
        ],
    }

    if len(prepared_attempts) >= 3 and answered_questions >= 20:
        recent_accuracy_values = []

        for attempt in recent_attempts:
            records = answers_by_attempt.get(attempt["id"], [])

            answered = [
                item for item in records
                if not item["is_unanswered"]
            ]

            if answered:
                correct = sum(
                    1 for item in answered
                    if item["is_correct"]
                )

                recent_accuracy_values.append(
                    _percentage(correct, len(answered))
                )

        recent_accuracy_score = _average(
            recent_accuracy_values
        )

        consistency_score = min(
            100,
            active_days_last_30 / 10 * 100,
        )

        readiness_score = round(
            (recent_accuracy_score * 0.75)
            + (consistency_score * 0.25),
            2,
        )

        if readiness_score >= 85:
            readiness_status = "strong"
        elif readiness_score >= 70:
            readiness_status = "developing_well"
        elif readiness_score >= 50:
            readiness_status = "needs_improvement"
        else:
            readiness_status = "needs_attention"

        readiness = {
            "status": readiness_status,
            "score": readiness_score,
            "description": (
                "An estimate based on recent quiz performance "
                "and learning consistency. It is not a guarantee "
                "of examination success."
            ),
            "based_on": [
                "Recent recorded answer accuracy (75%)",
                "Active learning days in the last 30 days (25%)",
            ],
        }

    # -----------------------------------------------------
    # ACHIEVEMENTS
    # -----------------------------------------------------

    achievements = []

    if len(prepared_attempts) >= 1:
        achievements.append({
            "id": "first_attempt",
            "title": "First Step",
            "description": "Completed your first recorded quiz.",
            "unlocked": True,
        })

    if len(prepared_attempts) >= 10:
        achievements.append({
            "id": "ten_attempts",
            "title": "Consistent Learner",
            "description": "Completed 10 quizzes.",
            "unlocked": True,
        })

    if streak >= 3:
        achievements.append({
            "id": "three_day_streak",
            "title": "Three-Day Streak",
            "description": "Recorded learning activity on three consecutive days.",
            "unlocked": True,
        })

    if overall_accuracy >= 80 and answered_questions >= 20:
        achievements.append({
            "id": "accuracy_80",
            "title": "Accuracy Builder",
            "description": "Reached at least 80% accuracy across recorded answers.",
            "unlocked": True,
        })

    # -----------------------------------------------------
    # FINAL RESPONSE
    # -----------------------------------------------------

    return {
        "overview": {
            "total_attempts": len(prepared_attempts),
            "total_questions": total_questions,
            "answered_questions": answered_questions,
            "correct_answers": correct_answers,
            "incorrect_answers": incorrect_answers,
            "unanswered_questions": unanswered_questions,
            "accuracy": overall_accuracy,
            "completion_rate": completion_rate,
        },

        "performance_trend": {
            "status": performance_trend,
            "recent_average": recent_average,
            "previous_average": earlier_average
                if earlier_attempts else None,
            "change": performance_change,
            "attempts_used": len(recent_attempts),
        },

        "subjects": subjects,
        "topics": topics,
        "difficulty": difficulty,

        "attempt_history": attempt_history[-20:][::-1],

        "learning_consistency": {
            "current_streak": streak,
            "active_days_last_30": active_days_last_30,
            "daily_activity": daily_activity,
        },

        "repeated_mistakes": repeated_mistakes[:20],
        "retention": retention_records[:30],
        "revision_priorities": revision_priorities[:20],

        "personal_best": {
            "best_attempt": best_attempt,
            "highest_accuracy": max(
                [item["accuracy"] for item in attempt_history],
                default=0,
            ),
        },

        "readiness": readiness,
        "achievements": achievements,

        "data_notes": [
            "Only completed quiz attempts are included.",
            "Subject and topic results use the matching question-bank records.",
            "Unanswered questions are counted separately from incorrect answers.",
            "Per-question response time is not available in the current database.",
            "Full syllabus coverage cannot be established from attempted questions alone.",
        ],
    }