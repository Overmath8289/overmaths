from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import requests
import random
import re
from datetime import datetime, timezone
from dotenv import load_dotenv

from dashboard_api import dashboard_api
from admin_api import admin_api
from question_api import question_api


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
# SUPABASE HEADERS
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


# ============================================================
# SUPABASE GET
# ============================================================

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
            "error": "Unable to connect to Supabase."
        }, 503

    if response.status_code != 200:

        print(
            "SUPABASE API ERROR:",
            response.status_code,
            response.text
        )

        return None, {
            "error": "Unable to retrieve data from Supabase.",
            "details": response.text
        }, response.status_code

    try:

        return response.json(), None, 200

    except ValueError:

        return None, {
            "error": "Invalid response from Supabase."
        }, 502


# ============================================================
# AUTHENTICATION
# ============================================================

def get_authenticated_user(access_token):
    """
    Verify the Supabase access token.
    """

    if not access_token:

        return None, {
            "error": "Authentication token is required"
        }, 401

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:

        return None, {
            "error": "Supabase server is not configured"
        }, 500

    try:

        response = requests.get(
            f"{SUPABASE_URL.rstrip('/')}/auth/v1/user",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {access_token}",
            },
            timeout=15
        )

    except requests.RequestException as error:

        print("AUTH CONNECTION ERROR:", error)

        return None, {
            "error": "Unable to verify authentication."
        }, 503

    if response.status_code != 200:

        print(
            "AUTH ERROR:",
            response.status_code,
            response.text
        )

        return None, {
            "error": "Your session is invalid or has expired."
        }, 401

    try:

        return response.json(), None, 200

    except ValueError:

        return None, {
            "error": "Invalid authentication response."
        }, 502


# ============================================================
# USER PROFILE
# ============================================================

def get_user_profile(auth_user_id):
    """
    Retrieve public.users using auth_user_id.

    IMPORTANT:

    auth.users.id
            ↓
    public.users.auth_user_id
            ↓
    public.users.id
            ↓
    subscriptions.user_id
    """

    if not auth_user_id:

        return None, {
            "error": "Authentication user ID is required"
        }, 400

    rows, error, status = supabase_get(
        "users",
        {
            "select": (
                "id,"
                "auth_user_id,"
                "email,"
                "full_name,"
                "learning_route,"
                "exam_type"
            ),

            "auth_user_id": f"eq.{auth_user_id}",

            "limit": 1,
        }
    )

    if error:

        return None, error, status

    if not rows:

        return None, None, 200

    return rows[0], None, 200


# ============================================================
# SUBSCRIPTIONS
# ============================================================

def get_user_subscription(user_id):
    """
    Retrieve subscriptions using public.users.id.

    IMPORTANT:

    subscriptions.user_id references:

        public.users.id

    NOT:

        auth.users.id
    """

    if not user_id:

        return None, {
            "error": "Public user ID is required"
        }, 400

    print(
        "LOOKING FOR SUBSCRIPTIONS WHERE user_id =",
        user_id
    )

    rows, error, status = supabase_get(
        "subscriptions",
        {
            "select": "*",

            "user_id": f"eq.{user_id}",

            "order": "created_at.desc",

            "limit": 100,
        }
    )

    if error:

        print(
            "SUBSCRIPTION LOOKUP ERROR:",
            error
        )

        return None, error, status

    print(
        "SUBSCRIPTION ROWS FOUND:",
        rows
    )

    if not rows:

        return [], None, 200

    return rows, None, 200


# ============================================================
# DATETIME HELPER
# ============================================================

def parse_datetime(value):
    """
    Convert Supabase timestamp into timezone-aware datetime.
    """

    if not value:
        return None

    try:

        text = str(value).strip()

        if text.endswith("Z"):
            text = text[:-1] + "+00:00"

        parsed = datetime.fromisoformat(text)

        if parsed.tzinfo is None:

            parsed = parsed.replace(
                tzinfo=timezone.utc
            )

        return parsed

    except (ValueError, TypeError):

        print(
            "INVALID SUBSCRIPTION DATE:",
            value
        )

        return None


# ============================================================
# PREMIUM CHECK
# ============================================================

def is_valid_premium_subscription(subscription):
    """
    Determine whether ONE subscription grants premium access.
    """

    if not subscription:

        return False

    # --------------------------------------------------------
    # PLAN
    # --------------------------------------------------------

    plan = str(
        subscription.get("plan") or ""
    ).strip().lower()

    premium_plans = {
        "premium",
        "premium monthly",
        "premium annual",
        "premium yearly",
        "pro",
        "paid",
    }

    if plan not in premium_plans:

        print(
            "SUBSCRIPTION NOT PREMIUM PLAN:",
            plan
        )

        return False

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    status = str(
        subscription.get("status") or ""
    ).strip().lower()

    # If status exists, it must be active.
    if status and status != "active":

        print(
            "SUBSCRIPTION NOT ACTIVE:",
            status
        )

        return False

    # --------------------------------------------------------
    # CURRENT TIME
    # --------------------------------------------------------

    now = datetime.now(timezone.utc)

    # --------------------------------------------------------
    # START DATE
    # --------------------------------------------------------

    started_at = subscription.get("started_at")

    if started_at:

        start = parse_datetime(started_at)

        if start and start > now:

            print(
                "SUBSCRIPTION HAS NOT STARTED:",
                started_at
            )

            return False

    # --------------------------------------------------------
    # EXPIRATION
    # --------------------------------------------------------

    expires_at = subscription.get("expires_at")

    if expires_at:

        expiry = parse_datetime(expires_at)

        if expiry and expiry <= now:

            print(
                "SUBSCRIPTION HAS EXPIRED:",
                expires_at
            )

            return False

    # --------------------------------------------------------
    # PREMIUM VALID
    # --------------------------------------------------------

    print(
        "VALID PREMIUM SUBSCRIPTION:",
        subscription
    )

    return True


# ============================================================
# DETERMINE USER ACCESS
# ============================================================

def determine_user_access(
    user,
    profile,
    subscriptions
):
    """
    Determine the authenticated user's access level.
    """

    metadata = user.get(
        "user_metadata"
    ) or {}

    nickname = (
        metadata.get("nickname")
        or ""
    ).strip()

    learning_route = (
        profile.get("learning_route")
        if profile
        else None
    )

    exam_type = (
        profile.get("exam_type")
        if profile
        else None
    )

    # --------------------------------------------------------
    # PROFILE COMPLETION
    # --------------------------------------------------------

    profile_complete = bool(
        nickname
        and learning_route
        and exam_type
    )

    # --------------------------------------------------------
    # DEFAULT
    # --------------------------------------------------------

    access_level = "normal"

    # --------------------------------------------------------
    # PREMIUM
    # --------------------------------------------------------

    valid_subscription = None

    for subscription in subscriptions or []:

        if is_valid_premium_subscription(
            subscription
        ):

            valid_subscription = subscription

            access_level = "premium"

            break

    # --------------------------------------------------------
    # ROUTE
    # --------------------------------------------------------

    if not profile_complete:

        next_route = "/student-profile"

    elif access_level == "premium":

        next_route = "/premium-dashboard"

    else:

        next_route = "/dashboard"

    # --------------------------------------------------------
    # RESULT
    # --------------------------------------------------------

    return {

        "profile_complete": profile_complete,

        "access_level": access_level,

        "is_premium": (
            access_level == "premium"
        ),

        "next_route": next_route,

        "nickname": nickname,

        "learning_route": learning_route,

        "exam_type": exam_type,

        "premium_subscription": (
            valid_subscription
        ),
    }


# ============================================================
# AUTH — CURRENT USER
# ============================================================

@app.route(
    "/api/auth/me",
    methods=["GET"]
)
def auth_me():

    print("\n========================================")
    print("AUTH /api/auth/me")
    print("========================================")

    # --------------------------------------------------------
    # READ TOKEN
    # --------------------------------------------------------

    authorization = request.headers.get(
        "Authorization",
        ""
    )

    if not authorization.startswith(
        "Bearer "
    ):

        print(
            "AUTH ERROR: No Bearer token"
        )

        return jsonify({

            "authenticated": False,

            "error": "Authentication required"

        }), 401

    access_token = authorization.replace(
        "Bearer ",
        "",
        1
    ).strip()

    # --------------------------------------------------------
    # VERIFY AUTH USER
    # --------------------------------------------------------

    user, error, status = (
        get_authenticated_user(
            access_token
        )
    )

    if error:

        return jsonify({

            "authenticated": False,

            **error

        }), status

    auth_user_id = user.get("id")

    email = user.get("email")

    print(
        "CURRENT AUTH USER:",
        auth_user_id
    )

    print(
        "AUTH EMAIL:",
        email
    )

    # --------------------------------------------------------
    # PUBLIC USERS PROFILE
    # --------------------------------------------------------

    profile, profile_error, profile_status = (
        get_user_profile(
            auth_user_id
        )
    )

    if profile_error:

        return jsonify({

            "authenticated": True,

            "error": profile_error

        }), profile_status

    if not profile:

        print(
            "PUBLIC USERS PROFILE NOT FOUND"
        )

        return jsonify({

            "authenticated": True,

            "error": (
                "Student profile was not found."
            )

        }), 404

    # --------------------------------------------------------
    # PUBLIC USER ID
    # --------------------------------------------------------

    profile_user_id = profile.get("id")

    print(
        "PUBLIC USERS ID:",
        profile_user_id
    )

    # --------------------------------------------------------
    # GET SUBSCRIPTIONS
    # --------------------------------------------------------

    subscriptions, subscription_error, subscription_status = (
        get_user_subscription(
            profile_user_id
        )
    )

    if subscription_error:

        return jsonify({

            "authenticated": True,

            "error": subscription_error

        }), subscription_status

    # --------------------------------------------------------
    # DETERMINE ACCESS
    # --------------------------------------------------------

    access = determine_user_access(

        user,

        profile,

        subscriptions

    )

    # --------------------------------------------------------
    # DEBUG
    # --------------------------------------------------------

    print(
        "SUBSCRIPTIONS:",
        subscriptions
    )

    print(
        "PREMIUM SUBSCRIPTION:",
        access[
            "premium_subscription"
        ]
    )

    print(
        "IS PREMIUM:",
        access[
            "is_premium"
        ]
    )

    print(
        "ACCESS LEVEL:",
        access[
            "access_level"
        ]
    )

    print(
        "NEXT ROUTE:",
        access[
            "next_route"
        ]
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return jsonify({

        "authenticated": True,

        # ----------------------------------------------------
        # AUTH USER
        # ----------------------------------------------------

        "user": {

            "id": user.get("id"),

            "email": user.get("email"),

            "metadata": (
                user.get(
                    "user_metadata"
                ) or {}
            ),
        },

        # ----------------------------------------------------
        # PUBLIC PROFILE
        # ----------------------------------------------------

        "profile": profile,

        # ----------------------------------------------------
        # SUBSCRIPTIONS
        # ----------------------------------------------------

        "subscriptions": (
            subscriptions or []
        ),

        # Latest subscription
        "subscription": (
            subscriptions[0]
            if subscriptions
            else None
        ),

        # Actual premium subscription
        "premium_subscription": (
            access[
                "premium_subscription"
            ]
        ),

        # ----------------------------------------------------
        # ACCESS
        # ----------------------------------------------------

        "profile_complete": (
            access[
                "profile_complete"
            ]
        ),

        "access_level": (
            access[
                "access_level"
            ]
        ),

        "is_premium": (
            access[
                "is_premium"
            ]
        ),

        # ----------------------------------------------------
        # USER DATA
        # ----------------------------------------------------

        "nickname": (
            access[
                "nickname"
            ]
        ),

        "learning_route": (
            access[
                "learning_route"
            ]
        ),

        "exam_type": (
            access[
                "exam_type"
            ]
        ),

        "next_route": (
            access[
                "next_route"
            ]
        ),
    })


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_basic_text(value):

    if value is None:
        return ""

    text = str(value)

    text = text.replace(
        "\ufeff",
        ""
    )

    text = text.replace(
        "\u200b",
        ""
    )

    text = text.replace(
        "\u200c",
        ""
    )

    text = text.replace(
        "\u200d",
        ""
    )

    text = text.replace(
        "\u00a0",
        " "
    )

    text = text.replace(
        "\r\n",
        "\n"
    )

    text = text.replace(
        "\r",
        "\n"
    )

    text = re.sub(
        r"[ \t]+",
        " ",
        text
    )

    text = re.sub(
        r"\n{3,}",
        "\n\n",
        text
    )

    return text.strip()


# ============================================================
# LATEX NORMALIZATION
# ============================================================

def normalize_latex(text):

    if not text:
        return text

    text = str(text)

    text = text.replace(
        "−",
        "-"
    )

    text = text.replace(
        "–",
        "-"
    )

    text = text.replace(
        "—",
        "-"
    )

    text = text.replace(
        "×",
        r"\times"
    )

    text = text.replace(
        "\\\\",
        "\\"
    )

    text = re.sub(
        r"\\+\s*,\s*",
        r"\,",
        text
    )

    text = re.sub(
        r"\\text\s*\{\s*([^{}]+?)\s*\}",
        lambda m:
            r"\text{" +
            m.group(1).strip() +
            "}",
        text
    )

    text = re.sub(
        r"\\mathrm\s*\{\s*([^{}]+?)\s*\}",
        lambda m:
            r"\mathrm{" +
            m.group(1).strip() +
            "}",
        text
    )

    text = re.sub(
        r"\\,\s+",
        r"\,",
        text
    )

    text = re.sub(
        r"([A-Za-z])_([A-Za-z0-9+-]+)(?!\})",
        r"\1_{\2}",
        text
    )

    text = re.sub(
        r"([A-Za-z0-9)\]])\^(-?[A-Za-z0-9]+)(?!\})",
        r"\1^{\2}",
        text
    )

    text = re.sub(
        r"\\frac\s*\{\s*([^{}]+?)\s*\}"
        r"\s*\{\s*([^{}]+?)\s*\}",
        lambda m:
            r"\frac{" +
            m.group(1).strip() +
            "}{" +
            m.group(2).strip() +
            "}",
        text
    )

    text = re.sub(
        r"\\sqrt\s*\{\s*([^{}]+?)\s*\}",
        lambda m:
            r"\sqrt{" +
            m.group(1).strip() +
            "}",
        text
    )

    text = re.sub(
        r"\\(times|cdot|pm|mp|div|leq|geq|neq|approx)\s+",
        r"\\\1",
        text
    )

    text = re.sub(
        r"[ \t]{2,}",
        " ",
        text
    )

    return text.strip()


# ============================================================
# MATH HELPERS
# ============================================================

def has_math_delimiters(text):

    if not text:
        return False

    return bool(

        re.search(
            r"\$\$[\s\S]*?\$\$",
            text
        )

        or

        re.search(
            r"\$[^$]+\$",
            text
        )

        or

        re.search(
            r"\\\([\s\S]*?\\\)",
            text
        )

        or

        re.search(
            r"\\\[[\s\S]*?\\\]",
            text
        )
    )


def looks_like_math(text):

    if not text:
        return False

    value = text.strip()

    if re.search(
        r"\\(frac|sqrt|text|mathrm|log|ln|sin|cos|tan|cot|sec|csc|"
        r"theta|alpha|beta|gamma|delta|lambda|mu|pi|omega|Omega|"
        r"sum|int|pm|times|cdot)",
        value
    ):
        return True

    if re.search(
        r"[A-Za-z0-9)\]}]\s*=\s*[A-Za-z0-9(\[{\\]",
        value
    ):
        return True

    if re.search(
        r"[A-Za-z0-9)]\s*\^\s*\{?[-+]?\d",
        value
    ):
        return True

    if re.search(
        r"[A-Za-z]_?\{?\d+\}?",
        value
    ):
        return True

    if re.search(
        r"\d+\s*/\s*\d+",
        value
    ):
        return True

    return False


def wrap_obvious_math(text):

    if not text:
        return text

    if has_math_delimiters(text):
        return text

    if len(text) <= 180 and looks_like_math(text):

        if re.match(
            r"^(correct answer|answer|option|therefore|hence)\b",
            text,
            flags=re.IGNORECASE
        ):
            return text

        return f"${text}$"

    return text


# ============================================================
# CONTENT NORMALIZER
# ============================================================

def normalize_content(value):

    text = clean_basic_text(value)

    if not text:
        return ""

    text = normalize_latex(text)

    text = re.sub(
        r"(\d)(Step\s+\d+)",
        r"\1 \2",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"\b([A-Z])(?=\d+(?:\.\d+)?)",
        r"\1 ",
        text
    )

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
# NORMALIZE QUESTION
# ============================================================

def normalize_question(question):

    return {

        "id": question.get("id"),

        "subject": clean_basic_text(
            question.get("subject")
        ),

        "course_id": question.get(
            "course_id"
        ),

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

        "image_url": question.get(
            "image_url"
        ),
    }


# ============================================================
# PRACTICE SUBJECTS
# ============================================================

@app.route(
    "/api/practice/subjects",
    methods=["GET"]
)
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
            clean_basic_text(
                row.get("subject")
            )

            for row in rows

            if row.get("subject")
        },

        key=lambda value:
            value.lower()
    )

    return jsonify({

        "subjects": subjects,

        "count": len(subjects)

    })


# ============================================================
# PRACTICE COURSES
# ============================================================

@app.route(
    "/api/practice/courses",
    methods=["GET"]
)
def get_practice_courses():

    params = {

        "select":
            "id,name,code,description,is_active",

        "is_active":
            "eq.true",

        "order":
            "code.asc",

        "limit":
            500,
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

            "id":
                row.get("id"),

            "name":
                clean_basic_text(
                    row.get("name")
                ),

            "code":
                clean_basic_text(
                    row.get("code")
                ),

            "description":
                clean_basic_text(
                    row.get("description")
                ),

            "is_active":
                row.get("is_active"),

        })

    return jsonify({

        "courses":
            courses,

        "count":
            len(courses)

    })


# ============================================================
# PRACTICE TOPICS
# ============================================================

@app.route(
    "/api/practice/topics",
    methods=["GET"]
)
def get_practice_topics():

    subject = request.args.get(
        "subject"
    )

    course_id = request.args.get(
        "course_id"
    )

    if not subject and not course_id:

        return jsonify({

            "error":
                "Subject or course_id is required"

        }), 400

    params = {

        "select":
            "topic",

        "is_active":
            "eq.true",

        "topic":
            "not.is.null",

        "limit":
            1000,
    }

    if subject:

        if course_id:

            return jsonify({

                "error":
                    "Use either subject or course_id, not both"

            }), 400

        subject = clean_basic_text(
            subject
        )

        params["subject"] = (
            f"eq.{subject}"
        )

        params["course_id"] = (
            "is.null"
        )

    if course_id:

        try:

            course_id = int(
                course_id
            )

        except (
            ValueError,
            TypeError
        ):

            return jsonify({

                "error":
                    "Invalid course_id"

            }), 400

        params["course_id"] = (
            f"eq.{course_id}"
        )

    rows, error, status = supabase_get(
        "questions",
        params
    )

    if error:

        return jsonify(error), status

    topics = sorted(

        {
            clean_basic_text(
                row.get("topic")
            )

            for row in rows

            if row.get("topic")
        },

        key=lambda value:
            value.lower()
    )

    return jsonify({

        "topics":
            topics,

        "count":
            len(topics)

    })


# ============================================================
# QUESTIONS
# ============================================================

@app.route(
    "/api/questions",
    methods=["GET"]
)
def get_questions():

    subject = request.args.get(
        "subject"
    )

    course_id = request.args.get(
        "course_id"
    )

    topic = request.args.get(
        "topic"
    )

    mode = request.args.get(
        "mode",
        "practice"
    ).lower()

    limit = request.args.get(
        "limit",
        20
    )

    try:

        limit = int(limit)

        if limit < 1:
            limit = 20

        limit = min(
            limit,
            100
        )

    except (
        ValueError,
        TypeError
    ):

        limit = 20

    if not subject and not course_id:

        return jsonify({

            "error":
                "Subject or course_id is required"

        }), 400

    clean_subject = (

        clean_basic_text(
            subject
        )

        if subject

        else None
    )

    clean_topic = (

        clean_basic_text(
            topic
        )

        if topic

        else None
    )

    params = {

        "select":
            "id,subject,course_id,topic,"
            "question_text,option_a,option_b,"
            "option_c,option_d,correction_answer,"
            "explanation,image_url",

        "is_active":
            "eq.true",

        "limit":
            1000,
    }

    if clean_subject:

        params["subject"] = (
            f"eq.{clean_subject}"
        )

        params["course_id"] = (
            "is.null"
        )

    if course_id:

        try:

            course_id = int(
                course_id
            )

        except (
            ValueError,
            TypeError
        ):

            return jsonify({

                "error":
                    "Invalid course_id"

            }), 400

        params["course_id"] = (
            f"eq.{course_id}"
        )

    rows, error, status = supabase_get(
        "questions",
        params
    )

    if error:

        return jsonify(error), status

    if (
        clean_topic
        and clean_topic.casefold() != "mixed"
    ):

        normalized_topic = (
            clean_topic.casefold()
        )

        rows = [

            row

            for row in rows

            if clean_basic_text(
                row.get("topic")
            ).casefold()
            == normalized_topic
        ]

    questions = [

        normalize_question(
            question
        )

        for question in rows
    ]

    random.shuffle(
        questions
    )

    questions = questions[
        :limit
    ]

    return jsonify({

        "questions":
            questions,

        "count":
            len(questions),

        "mode":
            mode,

        "subject":
            clean_subject,

        "course_id":
            course_id,

        "topic":
            clean_topic or "mixed"

    })


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/")
def home():

    return jsonify({

        "message":
            "Overmaths Python API is running",

        "status":
            "ok"

    })


# ============================================================
# BLUEPRINTS
# ============================================================

app.register_blueprint(
    dashboard_api
)

app.register_blueprint(
    admin_api
)

app.register_blueprint(
    question_api
)


# ============================================================
# START SERVER
# ============================================================

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