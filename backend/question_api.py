
import os
import requests

from flask import Blueprint, jsonify, request
from dotenv import load_dotenv

from admin_api import require_admin


load_dotenv()


question_api = Blueprint(
    "question_api",
    __name__,
    url_prefix="/api/admin/questions"
)


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


def supabase_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }


def supabase_get(table, params=None):
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
            f"Supabase request failed for {table}: "
            f"{response.text}"
        )

    return response.json()


def supabase_patch(table, params, payload):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "Supabase server configuration is missing."
        )

    url = (
        f"{SUPABASE_URL.rstrip('/')}"
        f"/rest/v1/{table}"
    )

    headers = supabase_headers()

    # Ask Supabase to return the updated record.
    headers["Prefer"] = "return=representation"

    response = requests.patch(
        url,
        headers=headers,
        params=params,
        json=payload,
        timeout=20,
    )

    if not response.ok:
        print(
            f"SUPABASE PATCH ERROR [{table}]:",
            response.status_code,
            response.text
        )

        raise RuntimeError(
            f"Supabase update failed for {table}: "
            f"{response.text}"
        )

    return response.json()


# ==========================================================
# GET QUESTIONS
# ==========================================================

@question_api.route("", methods=["GET"])
def get_questions():

    try:
        # --------------------------------------------------
        # ADMIN AUTHENTICATION
        # --------------------------------------------------

        auth_user, error_response = require_admin()

        if error_response:
            return error_response

        # --------------------------------------------------
        # QUERY PARAMETERS
        # --------------------------------------------------

        search = request.args.get(
            "search",
            ""
        ).strip()

        subject = request.args.get(
            "subject",
            ""
        ).strip()

        course_id = request.args.get(
            "course_id",
            ""
        ).strip()

        topic = request.args.get(
            "topic",
            ""
        ).strip()

        is_active = request.args.get(
            "is_active",
            ""
        ).strip()

        # --------------------------------------------------
        # GET QUESTIONS
        # --------------------------------------------------

        question_params = {
            "select": (
                "id,"
                "created_at,"
                "course_id,"
                "topic,"
                "question_text,"
                "option_a,"
                "option_b,"
                "option_c,"
                "option_d,"
                "correction_answer,"
                "explanation,"
                "image_url,"
                "is_active,"
                "subject"
            ),
            "order": "id.desc",
        }

        if subject:
            question_params["subject"] = (
                f"eq.{subject}"
            )

        if course_id:
            question_params["course_id"] = (
                f"eq.{course_id}"
            )

        if topic:
            question_params["topic"] = (
                f"eq.{topic}"
            )

        if is_active in ["true", "false"]:
            question_params["is_active"] = (
                f"eq.{is_active}"
            )

        questions = supabase_get(
            "questions",
            question_params
        )

        # --------------------------------------------------
        # SEARCH
        # --------------------------------------------------

        if search:

            search_lower = search.lower()

            questions = [
                question
                for question in questions
                if (
                    search_lower
                    in str(
                        question.get(
                            "question_text",
                            ""
                        )
                    ).lower()
                    or
                    search_lower
                    in str(
                        question.get(
                            "topic",
                            ""
                        )
                    ).lower()
                )
            ]

        # --------------------------------------------------
        # GET COURSES
        # --------------------------------------------------

        courses = supabase_get(
            "courses",
            {
                "select": (
                    "id,"
                    "name,"
                    "code,"
                    "description,"
                    "is_active"
                ),
                "order": "id.asc",
            }
        )

        # --------------------------------------------------
        # GET EXAM TYPES
        # --------------------------------------------------

        exam_types = supabase_get(
            "exam_types",
            {
                "select": (
                    "id,"
                    "name,"
                    "category,"
                    "description"
                ),
                "order": "id.asc",
            }
        )

        # --------------------------------------------------
        # GET QUESTION-EXAM RELATIONSHIPS
        # --------------------------------------------------

        question_exams = supabase_get(
            "question_exams",
            {
                "select": (
                    "id,"
                    "question_id,"
                    "exam_type_id"
                ),
            }
        )

        # --------------------------------------------------
        # MAP COURSES
        # --------------------------------------------------

        course_map = {
            str(course["id"]): course
            for course in courses
        }

        # --------------------------------------------------
        # MAP EXAMS
        # --------------------------------------------------

        exam_map = {
            str(exam["id"]): exam
            for exam in exam_types
        }

        # --------------------------------------------------
        # MAP QUESTION EXAMS
        # --------------------------------------------------

        question_exam_map = {}

        for relation in question_exams:

            question_id = str(
                relation.get("question_id")
            )

            exam_id = str(
                relation.get("exam_type_id")
            )

            exam = exam_map.get(exam_id)

            if not exam:
                continue

            if question_id not in question_exam_map:
                question_exam_map[question_id] = []

            question_exam_map[question_id].append(
                exam
            )

        # --------------------------------------------------
        # ATTACH RELATED DATA
        # --------------------------------------------------

        for question in questions:

            course = course_map.get(
                str(question.get("course_id"))
            )

            question["course"] = course

            question["exam_types"] = (
                question_exam_map.get(
                    str(question.get("id")),
                    []
                )
            )

        return jsonify({
            "success": True,
            "questions": questions,
            "total": len(questions),
            "courses": courses,
            "exam_types": exam_types,
        })

    except Exception as error:

        print(
            "QUESTION BANK API ERROR:",
            error
        )

        return jsonify({
            "success": False,
            "error": str(error)
        }), 500


# ==========================================================
# UPDATE QUESTION
# ==========================================================

@question_api.route(
    "/<int:question_id>",
    methods=["PATCH"]
)
def update_question(question_id):

    try:
        # --------------------------------------------------
        # ADMIN AUTHENTICATION
        # --------------------------------------------------

        auth_user, error_response = require_admin()

        if error_response:
            return error_response

        # --------------------------------------------------
        # READ REQUEST BODY
        # --------------------------------------------------

        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return jsonify({
                "success": False,
                "error": "Invalid request data."
            }), 400

        # --------------------------------------------------
        # ALLOWED FIELDS
        # --------------------------------------------------

        allowed_fields = {
            "topic",
            "question_text",
            "option_a",
            "option_b",
            "option_c",
            "option_d",
            "correction_answer",
            "explanation",
            "image_url",
            "is_active",
            "subject",
            "course_id",
        }

        update_data = {
            key: value
            for key, value in data.items()
            if key in allowed_fields
        }

        if not update_data:
            return jsonify({
                "success": False,
                "error": (
                    "No valid question fields were supplied."
                )
            }), 400

        # --------------------------------------------------
        # VALIDATE REQUIRED TEXT FIELDS
        # --------------------------------------------------

        required_fields = [
            "topic",
            "question_text",
            "option_a",
            "option_b",
            "option_c",
            "option_d",
            "correction_answer",
        ]

        for field in required_fields:

            if field in update_data:

                value = update_data[field]

                if value is None or not str(value).strip():

                    return jsonify({
                        "success": False,
                        "error": (
                            f"{field} cannot be empty."
                        )
                    }), 400

        # --------------------------------------------------
        # VALIDATE CORRECT ANSWER
        # --------------------------------------------------

        if "correction_answer" in update_data:

            answer = str(
                update_data["correction_answer"]
            ).strip().upper()

            if answer not in ["A", "B", "C", "D"]:

                return jsonify({
                    "success": False,
                    "error": (
                        "Correct answer must be A, B, C or D."
                    )
                }), 400

            update_data["correction_answer"] = answer

        # --------------------------------------------------
        # NORMALIZE COURSE ID
        # --------------------------------------------------

        if "course_id" in update_data:

            course_value = update_data["course_id"]

            # Empty select value means O-Level/no course.
            if (
                course_value is None
                or str(course_value).strip() == ""
            ):
                update_data["course_id"] = None

            else:

                try:
                    update_data["course_id"] = int(
                        course_value
                    )

                except (TypeError, ValueError):

                    return jsonify({
                        "success": False,
                        "error": (
                            "Course ID must be a valid course."
                        )
                    }), 400

        # --------------------------------------------------
        # NORMALIZE OPTIONAL TEXT FIELDS
        # --------------------------------------------------

        if "explanation" in update_data:

            if update_data["explanation"] is not None:
                update_data["explanation"] = str(
                    update_data["explanation"]
                ).strip()

        if "image_url" in update_data:

            if update_data["image_url"] is not None:
                update_data["image_url"] = str(
                    update_data["image_url"]
                ).strip()

        if "subject" in update_data:

            if update_data["subject"] is not None:
                update_data["subject"] = str(
                    update_data["subject"]
                ).strip()

        if "topic" in update_data:

            update_data["topic"] = str(
                update_data["topic"]
            ).strip()

        if "question_text" in update_data:

            update_data["question_text"] = str(
                update_data["question_text"]
            ).strip()

        for option in [
            "option_a",
            "option_b",
            "option_c",
            "option_d",
        ]:

            if option in update_data:

                update_data[option] = str(
                    update_data[option]
                ).strip()

        # --------------------------------------------------
        # UPDATE QUESTION IN SUPABASE
        # --------------------------------------------------

        print(
            f"UPDATING QUESTION {question_id}:",
            update_data
        )

        updated_questions = supabase_patch(
            "questions",
            {
                "id": f"eq.{question_id}"
            },
            update_data
        )

        # --------------------------------------------------
        # QUESTION NOT FOUND
        # --------------------------------------------------

        if not updated_questions:

            return jsonify({
                "success": False,
                "error": (
                    "Question was not found."
                )
            }), 404

        # --------------------------------------------------
        # SUCCESS
        # --------------------------------------------------

        return jsonify({
            "success": True,
            "message": (
                "Question updated successfully."
            ),
            "question": updated_questions[0]
        })

    except Exception as error:

        print(
            "QUESTION UPDATE API ERROR:",
            error
        )

        return jsonify({
            "success": False,
            "error": str(error)
        }), 500

