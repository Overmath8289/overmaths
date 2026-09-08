from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")

load_dotenv(ENV_PATH, override=True)

app = Flask(__name__)
CORS(app)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

print("SUPABASE URL:", SUPABASE_URL)
print("SERVICE KEY LOADED:", bool(SUPABASE_SERVICE_KEY))


@app.route("/api/questions", methods=["GET"])
def get_questions():

    subject = request.args.get("subject")
    course_id = request.args.get("course_id")
    topic = request.args.get("topic")
    limit = request.args.get("limit", 20)

    # --------------------------------------------------
    # VALIDATE LIMIT
    # --------------------------------------------------

    try:
        limit = int(limit)

        if limit < 1:
            limit = 20

        # Prevent unnecessarily large requests
        limit = min(limit, 100)

    except (ValueError, TypeError):
        limit = 20


    # --------------------------------------------------
    # REQUIRE EITHER SUBJECT OR COURSE
    # --------------------------------------------------

    if not subject and not course_id:
        return jsonify({
            "error": "Subject or course_id is required"
        }), 400


    # --------------------------------------------------
    # SUPABASE REQUEST
    # --------------------------------------------------

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return jsonify({
            "error": "Question server is not configured correctly"
        }), 500


    url = f"{SUPABASE_URL}/rest/v1/questions"

    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }


    # --------------------------------------------------
    # SELECT ONLY THE FIELDS THE QUIZ NEEDS
    # --------------------------------------------------

    params = {
        "select": (
            "id,"
            "subject,"
            "course_id,"
            "topic,"
            "question_text,"
            "option_a,"
            "option_b,"
            "option_c,"
            "option_d,"
            "correction_answer,"
            "explanation,"
            "image_url"
        ),
        "is_active": "eq.true",
        "limit": limit,
    }


    # --------------------------------------------------
    # SECONDARY / O-LEVEL
    #
    # Example:
    # /api/questions?subject=Physics&limit=20
    # --------------------------------------------------

    if subject:
        params["subject"] = f"eq.{subject}"


    # --------------------------------------------------
    # UNIVERSITY
    #
    # Example:
    # /api/questions?course_id=1&limit=20
    # --------------------------------------------------

    if course_id:

        try:
            course_id = int(course_id)

        except (ValueError, TypeError):
            return jsonify({
                "error": "Invalid course_id"
            }), 400

        params["course_id"] = f"eq.{course_id}"


    # --------------------------------------------------
    # TOPIC FILTER
    #
    # Works for BOTH university and secondary.
    # --------------------------------------------------

    if topic and topic != "mixed":
        params["topic"] = f"eq.{topic}"


    # --------------------------------------------------
    # GET QUESTIONS
    # --------------------------------------------------

    try:

        response = requests.get(
            url,
            headers=headers,
            params=params,
            timeout=15
        )

    except requests.RequestException as error:

        print(
            "SUPABASE CONNECTION ERROR:",
            error
        )

        return jsonify({
            "error": (
                "Unable to connect to the "
                "question database."
            )
        }), 503


    # --------------------------------------------------
    # SUPABASE ERROR
    # --------------------------------------------------

    if response.status_code != 200:

        print(
            "SUPABASE API ERROR:",
            response.status_code,
            response.text
        )

        return jsonify({
            "error": "Unable to retrieve questions",
            "details": response.text
        }), response.status_code


    # --------------------------------------------------
    # PARSE QUESTIONS
    # --------------------------------------------------

    try:
        questions = response.json()

    except ValueError:

        return jsonify({
            "error": "Invalid response from question database"
        }), 502


    # --------------------------------------------------
    # RESPONSE
    # --------------------------------------------------

    return jsonify({
        "questions": questions,
        "count": len(questions)
    })


@app.route("/")
def home():

    return jsonify({
        "message": "Overmaths Python API is running"
    })


if __name__ == "__main__":

    port = int(
        os.environ.get(
            "PORT",
            5050
        )
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=True
    )