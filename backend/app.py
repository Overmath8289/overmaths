from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import requests
import random
import re
from dotenv import load_dotenv
from dashboard_api import dashboard_api

# ============================================================
# ENVIRONMENT
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")

load_dotenv(ENV_PATH, override=True)


# ============================================================
# FLASK
# ============================================================

app = Flask(__name__)

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": "*"
        }
    }
)


# ============================================================
# SUPABASE
# ============================================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

print("SUPABASE URL:", SUPABASE_URL)
print("SERVICE KEY LOADED:", bool(SUPABASE_SERVICE_KEY))


# ============================================================
# SUPABASE HELPERS
# ============================================================

def supabase_headers():
    """
    Headers used for server-side Supabase REST requests.

    The service key stays on the Python server.
    """

    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }


def supabase_get(table, params):
    """
    Generic GET helper for Supabase REST API.
    """

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None, {
            "error": "Supabase server is not configured correctly"
        }, 500

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table}"

    try:

        response = requests.get(
            url,
            headers=supabase_headers(),
            params=params,
            timeout=15
        )

    except requests.RequestException as error:

        print("SUPABASE CONNECTION ERROR:", error)

        return None, {
            "error": "Unable to connect to the question database."
        }, 503

    if response.status_code != 200:

        print(
            "SUPABASE API ERROR:",
            response.status_code,
            response.text
        )

        return None, {
            "error": "Unable to retrieve data from Supabase",
            "details": response.text
        }, response.status_code

    try:

        return response.json(), None, 200

    except ValueError:

        return None, {
            "error": "Invalid response from Supabase"
        }, 502


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_basic_text(value):
    """
    General cleanup that is safe for normal English text.

    This does NOT change the meaning of the question.
    """

    if value is None:
        return ""

    text = str(value)

    # --------------------------------------------------------
    # Remove invisible / problematic characters
    # --------------------------------------------------------

    text = text.replace("\ufeff", "")
    text = text.replace("\u200b", "")
    text = text.replace("\u200c", "")
    text = text.replace("\u200d", "")
    text = text.replace("\u00a0", " ")

    # --------------------------------------------------------
    # Normalize line endings
    # --------------------------------------------------------

    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    # --------------------------------------------------------
    # Clean accidental repeated whitespace
    # --------------------------------------------------------

    text = re.sub(r"[ \t]+", " ", text)

    # Too many blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


# ============================================================
# LATEX NORMALIZATION
# ============================================================

def normalize_latex(text):
    """
    Cleans common LaTeX problems caused by Word/Tally/imports.

    Examples:

        \\\\frac{1}{2}
        ->
        \\frac{1}{2}

        10^-4
        ->
        10^{-4}

        R_1
        ->
        R_{1}

        2 \\, \\\\Omega
        ->
        2\\,\\Omega
    """

    if not text:
        return text

    text = str(text)

    # --------------------------------------------------------
    # Normalize Unicode punctuation
    # --------------------------------------------------------

    text = text.replace("−", "-")
    text = text.replace("–", "-")
    text = text.replace("—", "-")
    text = text.replace("×", r"\times")

    # --------------------------------------------------------
    # Fix escaped backslashes
    # --------------------------------------------------------

    text = text.replace("\\\\", "\\")

    # --------------------------------------------------------
    # Clean common malformed spacing commands
    # --------------------------------------------------------

    text = re.sub(r"\\+\s*,\s*", r"\,", text)

    # --------------------------------------------------------
    # \text{ cm}, \text { cm}, etc.
    # --------------------------------------------------------

    text = re.sub(
        r"\\text\s*\{\s*([^{}]+?)\s*\}",
        lambda m: r"\text{" + m.group(1).strip() + "}",
        text
    )

    # --------------------------------------------------------
    # \mathrm
    # --------------------------------------------------------

    text = re.sub(
        r"\\mathrm\s*\{\s*([^{}]+?)\s*\}",
        lambda m: r"\mathrm{" + m.group(1).strip() + "}",
        text
    )

    # --------------------------------------------------------
    # Remove unnecessary spaces after LaTeX commands
    # --------------------------------------------------------

    text = re.sub(
        r"\\,\s+",
        r"\,",
        text
    )

    # --------------------------------------------------------
    # Subscripts
    #
    # R_1 -> R_{1}
    # P_2 -> P_{2}
    #
    # Leave already-braced subscripts alone.
    # --------------------------------------------------------

    text = re.sub(
        r"([A-Za-z])_([A-Za-z0-9+-]+)(?!\})",
        r"\1_{\2}",
        text
    )

    # --------------------------------------------------------
    # Powers
    #
    # 10^-4 -> 10^{-4}
    # x^2   -> x^{2}
    #
    # Don't touch already-braced powers.
    # --------------------------------------------------------

    text = re.sub(
        r"([A-Za-z0-9)\]])\^(-?[A-Za-z0-9]+)(?!\})",
        r"\1^{\2}",
        text
    )

    # --------------------------------------------------------
    # Common malformed fraction spacing
    # --------------------------------------------------------

    text = re.sub(
        r"\\frac\s*\{\s*([^{}]+?)\s*\}\s*\{\s*([^{}]+?)\s*\}",
        lambda m: (
            r"\frac{"
            + m.group(1).strip()
            + "}{"
            + m.group(2).strip()
            + "}"
        ),
        text
    )

    # --------------------------------------------------------
    # Common sqrt cleanup
    # --------------------------------------------------------

    text = re.sub(
        r"\\sqrt\s*\{\s*([^{}]+?)\s*\}",
        lambda m: r"\sqrt{" + m.group(1).strip() + "}",
        text
    )

    # --------------------------------------------------------
    # Remove unnecessary spaces around math commands
    # --------------------------------------------------------

    text = re.sub(
        r"\\(times|cdot|pm|mp|div|leq|geq|neq|approx)\s+",
        r"\\\1",
        text
    )

    # --------------------------------------------------------
    # Common multiplication symbol
    # --------------------------------------------------------

    text = text.replace("*", r" \times ")

    # Avoid excessive spaces created above
    text = re.sub(r"[ \t]{2,}", " ", text)

    return text.strip()


# ============================================================
# MATH DELIMITER HELPERS
# ============================================================

def has_math_delimiters(text):
    """
    Checks whether a string already contains our supported
    math delimiters.

    Supported:

        $...$
        $$...$$
        \(...\)
        \[...\]
    """

    if not text:
        return False

    return bool(
        re.search(r"\$\$[\s\S]*?\$\$", text)
        or re.search(r"\$[^$]+\$", text)
        or re.search(r"\\\([\s\S]*?\\\)", text)
        or re.search(r"\\\[[\s\S]*?\\\]", text)
    )


def looks_like_math(text):
    """
    Detects obvious mathematical expressions without turning
    ordinary English sentences into mathematics.
    """

    if not text:
        return False

    value = text.strip()

    # Existing LaTeX commands
    if re.search(
        r"\\(frac|sqrt|text|mathrm|log|ln|sin|cos|tan|cot|sec|csc|"
        r"theta|alpha|beta|gamma|delta|lambda|mu|pi|omega|Omega|"
        r"sum|int|pm|times|cdot)",
        value
    ):
        return True

    # Equations
    if re.search(
        r"[A-Za-z0-9)\]}]\s*=\s*[A-Za-z0-9(\[{\\]",
        value
    ):
        return True

    # Powers
    if re.search(
        r"[A-Za-z0-9)]\s*\^\s*\{?[-+]?\d",
        value
    ):
        return True

    # Subscripts
    if re.search(
        r"[A-Za-z]_?\{?\d+\}?",
        value
    ):
        return True

    # Fractions written with /
    if re.search(
        r"\d+\s*/\s*\d+",
        value
    ):
        return True

    return False


def wrap_obvious_math(text):
    """
    Adds $...$ around obvious standalone mathematical fragments
    when they are not already delimited.

    We deliberately keep this conservative.
    """

    if not text:
        return text

    if has_math_delimiters(text):
        return text

    # Entire short mathematical line
    if len(text) <= 180 and looks_like_math(text):

        # Don't wrap obvious prose sentences containing an equals
        # sign such as "Correct answer = option A."
        if re.match(
            r"^(correct answer|answer|option|therefore|hence)\b",
            text,
            flags=re.IGNORECASE
        ):
            return text

        return f"${text}$"

    return text


# ============================================================
# FINAL CONTENT NORMALIZER
# ============================================================

def normalize_content(value):
    """
    Main function used before returning question content
    to React.
    """

    text = clean_basic_text(value)

    if not text:
        return ""

    text = normalize_latex(text)

    # --------------------------------------------------------
    # Fix common accidental concatenation from imported data.
    #
    # Example:
    #
    # 21Step 2
    #
    # becomes:
    #
    # 21 Step 2
    # --------------------------------------------------------

    text = re.sub(
        r"(\d)(Step\s+\d+)",
        r"\1 \2",
        text,
        flags=re.IGNORECASE
    )

    # --------------------------------------------------------
    # Make common "N10.50" style values readable.
    # --------------------------------------------------------

    text = re.sub(
        r"\b([A-Z])(?=\d+(?:\.\d+)?)",
        r"\1 ",
        text
    )

    # --------------------------------------------------------
    # Normalize common answer formatting
    # --------------------------------------------------------

    text = re.sub(
        r"\bCORRECT\s+ANSWER\s*:",
        "Correct answer:",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"\bCORRECT\s+ANSWER\b",
        "Correct answer",
        text,
        flags=re.IGNORECASE
    )

    return text.strip()


# ============================================================
# NORMALIZE QUESTION OBJECT
# ============================================================

def normalize_question(question):
    """
    Converts a raw Supabase question into a clean API object.

    IMPORTANT:
    This function only cleans formatting.
    It does NOT change the actual answer/content.
    """

    return {
        "id": question.get("id"),
        "subject": clean_basic_text(
            question.get("subject")
        ),
        "course_id": question.get("course_id"),
        "topic": clean_basic_text(
            question.get("topic")
        ),

        "question_text": normalize_content(
            question.get("question_text")
        ),

        "option_a": normalize_content(
            question.get("option_a")
        ),

        "option_b": normalize_content(
            question.get("option_b")
        ),

        "option_c": normalize_content(
            question.get("option_c")
        ),

        "option_d": normalize_content(
            question.get("option_d")
        ),

        "correction_answer": clean_basic_text(
            question.get("correction_answer")
        ),

        "explanation": normalize_content(
            question.get("explanation")
        ),

        # IMPORTANT:
        # Image URLs are passed through untouched.
        "image_url": question.get("image_url"),
    }


# ============================================================
# PRACTICE SUBJECTS
# ============================================================

@app.route("/api/practice/subjects", methods=["GET"])
def get_practice_subjects():

    params = {
        "select": "subject",
        "is_active": "eq.true",
        "course_id": "is.null",
        "subject": "not.is.null",
        "limit": 1000,
    }

    rows, error, status = supabase_get(
        "questions",
        params
    )

    if error:
        return jsonify(error), status

    subjects = sorted(
        {
            clean_basic_text(row.get("subject"))
            for row in rows
            if row.get("subject")
        },
        key=lambda value: value.lower()
    )

    return jsonify({
        "subjects": subjects,
        "count": len(subjects)
    })


# ============================================================
# PRACTICE COURSES
# ============================================================

@app.route("/api/practice/courses", methods=["GET"])
def get_practice_courses():

    params = {
        "select": "id,name,code,description,is_active",
        "is_active": "eq.true",
        "order": "code.asc",
        "limit": 500,
    }

    rows, error, status = supabase_get(
        "courses",
        params
    )

    if error:
        return jsonify(error), status

    courses = []

    for row in rows:

        courses.append({
            "id": row.get("id"),
            "name": clean_basic_text(
                row.get("name")
            ),
            "code": clean_basic_text(
                row.get("code")
            ),
            "description": clean_basic_text(
                row.get("description")
            ),
            "is_active": row.get("is_active"),
        })

    return jsonify({
        "courses": courses,
        "count": len(courses)
    })


# ============================================================
# PRACTICE TOPICS
# ============================================================

@app.route("/api/practice/topics", methods=["GET"])
def get_practice_topics():

    subject = request.args.get("subject")
    course_id = request.args.get("course_id")

    if not subject and not course_id:
        return jsonify({
            "error": "Subject or course_id is required"
        }), 400

    params = {
        "select": "topic",
        "is_active": "eq.true",
        "topic": "not.is.null",
        "limit": 1000,
    }

    # --------------------------------------------------------
    # Secondary / O-Level
    # --------------------------------------------------------

    if subject:

        if course_id:
            return jsonify({
                "error": "Use either subject or course_id, not both"
            }), 400

        params["subject"] = f"eq.{subject}"
        params["course_id"] = "is.null"

    # --------------------------------------------------------
    # University
    # --------------------------------------------------------

    if course_id:

        try:
            course_id = int(course_id)

        except (ValueError, TypeError):

            return jsonify({
                "error": "Invalid course_id"
            }), 400

        params["course_id"] = f"eq.{course_id}"

    rows, error, status = supabase_get(
        "questions",
        params
    )

    if error:
        return jsonify(error), status

    topics = sorted(
        {
            clean_basic_text(row.get("topic"))
            for row in rows
            if row.get("topic")
        },
        key=lambda value: value.lower()
    )

    return jsonify({
        "topics": topics,
        "count": len(topics)
    })


# ============================================================
# QUESTIONS
# ============================================================

@app.route("/api/questions", methods=["GET"])
def get_questions():

    subject = request.args.get("subject")
    course_id = request.args.get("course_id")
    topic = request.args.get("topic")
    mode = request.args.get(
        "mode",
        "practice"
    ).lower()

    limit = request.args.get(
        "limit",
        20
    )

    # --------------------------------------------------------
    # VALIDATE LIMIT
    # --------------------------------------------------------

    try:

        limit = int(limit)

        if limit < 1:
            limit = 20

        limit = min(
            limit,
            100
        )

    except (ValueError, TypeError):

        limit = 20

    # --------------------------------------------------------
    # REQUIRE SUBJECT OR COURSE
    # --------------------------------------------------------

    if not subject and not course_id:

        return jsonify({
            "error": "Subject or course_id is required"
        }), 400

    # --------------------------------------------------------
    # SUPABASE QUERY
    # --------------------------------------------------------

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

        # Fetch enough records for proper mixed-topic
        # randomization.
        "limit": max(
            limit,
            100
        ),
    }

    # --------------------------------------------------------
    # SECONDARY / O-LEVEL
    # --------------------------------------------------------

    if subject:

        params["subject"] = f"eq.{subject}"

        # O-Level questions have no course_id
        params["course_id"] = "is.null"

    # --------------------------------------------------------
    # UNIVERSITY
    # --------------------------------------------------------

    if course_id:

        try:

            course_id = int(course_id)

        except (ValueError, TypeError):

            return jsonify({
                "error": "Invalid course_id"
            }), 400

        params["course_id"] = f"eq.{course_id}"

    # --------------------------------------------------------
    # TOPIC
    # --------------------------------------------------------

    if topic and topic.lower() != "mixed":

        params["topic"] = f"eq.{topic}"

    # --------------------------------------------------------
    # GET DATA
    # --------------------------------------------------------

    rows, error, status = supabase_get(
        "questions",
        params
    )

    if error:
        return jsonify(error), status

    # --------------------------------------------------------
    # NORMALIZE
    # --------------------------------------------------------

    questions = [
        normalize_question(question)
        for question in rows
    ]

    # --------------------------------------------------------
    # MIXED TOPICS / RANDOM QUESTIONS
    #
    # Randomize on the server so mixed-topic practice really
    # behaves as mixed practice.
    # --------------------------------------------------------

    random.shuffle(
        questions
    )

    # --------------------------------------------------------
    # RETURN ONLY REQUESTED NUMBER
    # --------------------------------------------------------

    questions = questions[:limit]

    return jsonify({
        "questions": questions,
        "count": len(questions),
        "mode": mode,
        "subject": subject,
        "course_id": course_id,
        "topic": topic or "mixed"
    })


# ============================================================
# API HEALTH CHECK
# ============================================================

@app.route("/")
def home():

    return jsonify({
        "message": "Overmaths Python API is running",
        "status": "ok"
    })


# ============================================================
# START SERVER
# ============================================================

app.register_blueprint(dashboard_api)


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