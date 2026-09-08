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
    topic = request.args.get("topic")
    limit = request.args.get("limit", 20)

    if not subject:
        return jsonify({
            "error": "Subject is required"
        }), 400

    try:
        limit = int(limit)
    except ValueError:
        limit = 20

    url = f"{SUPABASE_URL}/rest/v1/questions"

    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }

    params = {
        "select": "id,subject,course_id,topic,question_text,option_a,option_b,option_c,option_d,correction_answer,explanation,image_url",
        "subject": f"eq.{subject}",
        "is_active": "eq.true",
        "limit": limit,
    }

    if topic and topic != "mixed":
        params["topic"] = f"eq.{topic}"

    response = requests.get(
        url,
        headers=headers,
        params=params,
        timeout=15
    )

    if response.status_code != 200:
        return jsonify({
            "error": "Unable to retrieve questions",
            "details": response.text
        }), response.status_code

    questions = response.json()

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
    port = int(os.environ.get("PORT", 5050))
    app.run(host="0.0.0.0", port=port, debug=True)