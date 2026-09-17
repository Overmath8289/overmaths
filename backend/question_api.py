
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
            f"Supabase request failed for {table}."
        )

    return response.json()


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


        # --------------------------------------------------
        # FILTER: SUBJECT
        # --------------------------------------------------

        if subject:
            question_params["subject"] = (
                f"eq.{subject}"
            )


        # --------------------------------------------------
        # FILTER: COURSE
        # --------------------------------------------------

        if course_id:
            question_params["course_id"] = (
                f"eq.{course_id}"
            )


        # --------------------------------------------------
        # FILTER: TOPIC
        # --------------------------------------------------

        if topic:
            question_params["topic"] = (
                f"eq.{topic}"
            )


        # --------------------------------------------------
        # FILTER: ACTIVE STATUS
        # --------------------------------------------------

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
        #
        # We perform this in Python so the search can cover
        # both question text and topic without changing the
        # database.
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
        # ATTACH COURSE INFORMATION
        # --------------------------------------------------

        course_map = {
            str(course["id"]): course
            for course in courses
        }


        exam_map = {
            str(exam["id"]): exam
            for exam in exam_types
        }


        # --------------------------------------------------
        # ATTACH EXAM INFORMATION TO QUESTIONS
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
        # BUILD FINAL QUESTION RESPONSE
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
            "error": "Unable to load question bank."
        }), 500

