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

    url = (
        f"{SUPABASE_URL.rstrip('/')}"
        f"/rest/v1/{table}"
    )

    try:

        response = requests.get(
            url,
            headers=supabase_headers(),
            params=params,
            timeout=15
        )

    except requests.RequestException as error:

        print(
            "SUPABASE CONNECTION ERROR:",
            error
        )

        return None, {
            "error": (
                "Unable to connect to "
                "the question database."
            )
        }, 503

    if response.status_code != 200:

        print(
            "SUPABASE API ERROR:",
            response.status_code,
            response.text
        )

        return None, {
            "error": (
                "Unable to retrieve data "
                "from Supabase"
            ),
            "details": response.text
        }, response.status_code

    try:

        return response.json(), None, 200

    except ValueError:

        return None, {
            "error": "Invalid response from Supabase"
        }, 502


# ============================================================
# AUTHENTICATION
# ============================================================

def get_authenticated_user(access_token):
    """
    Verify a Supabase access token.

    The access token comes from the React/Supabase frontend.
    The Supabase service key remains safely on the Python server.
    """

    if not access_token:

        return None, {
            "error": "Authentication token is required"
        }, 401

    if not SUPABASE_URL:

        return None, {
            "error": "Supabase server is not configured"
        }, 500

    try:

        response = requests.get(
            f"{SUPABASE_URL.rstrip('/')}/auth/v1/user",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": (
                    f"Bearer {access_token}"
                ),
            },
            timeout=15
        )

    except requests.RequestException as error:

        print(
            "AUTH CONNECTION ERROR:",
            error
        )

        return None, {
            "error": (
                "Unable to verify authentication."
            )
        }, 503

    if response.status_code != 200:

        print(
            "AUTH ERROR:",
            response.status_code,
            response.text
        )

        return None, {
            "error": (
                "Your session is invalid "
                "or has expired."
            )
        }, 401

    try:

        return response.json(), None, 200

    except ValueError:

        return None, {
            "error": (
                "Invalid authentication response."
            )
        }, 502


# ============================================================
# USER PROFILE
# ============================================================

def get_user_profile(email):
    """
    Retrieve the user's profile from public.users.
    """

    if not email:

        return None, {
            "error": "Authenticated user has no email."
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
            "email": f"eq.{email}",
            "limit": 1,
        }
    )

    if error:
        return None, error, status

    if not rows:

        return None, None, 200

    return rows[0], None, 200


# ============================================================
# USER SUBSCRIPTIONS
# ============================================================

def get_user_subscription(user_id):
    """
    Retrieve subscriptions belonging to public.users.id.

    IMPORTANT:

    subscriptions.user_id
        ↓
    public.users.id

    It does NOT use auth.users.id.
    """

    if not user_id:

        return None, {
            "error": "User profile ID is required"
        }, 400

    print(
        "LOOKING UP SUBSCRIPTIONS FOR "
        "PUBLIC USERS ID:",
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
            "SUBSCRIPTION QUERY ERROR:",
            error
        )

        return None, error, status

    print(
        "SUBSCRIPTION ROWS FOUND:",
        len(rows or [])
    )

    print(
        "SUBSCRIPTION DATA:",
        rows or []
    )

    return rows or [], None, 200


# ============================================================
# DETERMINE USER ACCESS
# ============================================================

def determine_user_access(
    user,
    profile,
    subscriptions
):
    """
    Determine whether the authenticated student
    should receive normal or premium access.
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

    # ========================================================
    # PROFILE COMPLETION
    # ========================================================

    profile_complete = bool(
        nickname
        and learning_route
        and exam_type
    )

    # ========================================================
    # DEFAULT ACCESS
    # ========================================================

    access_level = "normal"

    now = datetime.now(
        timezone.utc
    )

    # ========================================================
    # PREMIUM SUBSCRIPTION CHECK
    # ========================================================

    for subscription in subscriptions or []:

        print(
            "CHECKING SUBSCRIPTION:",
            subscription
        )

        # ----------------------------------------------------
        # PLAN
        # ----------------------------------------------------

        plan = str(
            subscription.get("plan")
            or ""
        ).strip().lower()

        # ----------------------------------------------------
        # STATUS
        # ----------------------------------------------------

        status = str(
            subscription.get("status")
            or ""
        ).strip().lower()

        print(
            "PLAN:",
            plan,
            "| STATUS:",
            status
        )

        # ----------------------------------------------------
        # ACCEPTED PREMIUM PLANS
        # ----------------------------------------------------

        premium_plan = plan in (
            "premium",
            "premium monthly",
            "premium annual",
            "premium yearly",
            "pro",
            "paid",
        )

        if not premium_plan:

            print(
                "NOT A PREMIUM PLAN"
            )

            continue

        # ----------------------------------------------------
        # ACTIVE STATUS
        # ----------------------------------------------------

        if status != "active":

            print(
                "SUBSCRIPTION IS NOT ACTIVE"
            )

            continue

        # ----------------------------------------------------
        # START DATE
        # ----------------------------------------------------

        started_at = (
            subscription.get(
                "started_at"
            )
        )

        if started_at:

            try:

                start = datetime.fromisoformat(
                    str(started_at).replace(
                        "Z",
                        "+00:00"
                    )
                )

                if start > now:

                    print(
                        "SUBSCRIPTION HAS "
                        "NOT STARTED YET"
                    )

                    continue

            except (
                ValueError,
                TypeError
            ):

                print(
                    "INVALID started_at:",
                    started_at
                )

        # ----------------------------------------------------
        # EXPIRATION DATE
        # ----------------------------------------------------

        expires_at = (
            subscription.get(
                "expires_at"
            )
        )

        if expires_at:

            try:

                expiry = datetime.fromisoformat(
                    str(expires_at).replace(
                        "Z",
                        "+00:00"
                    )
                )

                if expiry <= now:

                    print(
                        "SUBSCRIPTION HAS EXPIRED"
                    )

                    continue

            except (
                ValueError,
                TypeError
            ):

                print(
                    "INVALID expires_at:",
                    expires_at
                )

        # ----------------------------------------------------
        # VALID PREMIUM SUBSCRIPTION
        # ----------------------------------------------------

        print(
            "VALID PREMIUM SUBSCRIPTION FOUND"
        )

        access_level = "premium"

        break

    # ========================================================
    # ROUTE
    # ========================================================

    if not profile_complete:

        next_route = "/student-profile"

    elif access_level == "premium":

        next_route = "/premium-dashboard"

    else:

        next_route = "/dashboard"

    # ========================================================
    # RESULT
    # ========================================================

    return {
        "profile_complete": profile_complete,

        "access_level": access_level,

        "next_route": next_route,

        "nickname": nickname,

        "learning_route": learning_route,

        "exam_type": exam_type,
    }


# ============================================================
# AUTH — CURRENT USER
# ============================================================

@app.route(
    "/api/auth/me",
    methods=["GET"]
)
def auth_me():

    # ========================================================
    # READ ACCESS TOKEN
    # ========================================================

    authorization = request.headers.get(
        "Authorization",
        ""
    )

    if not authorization.startswith(
        "Bearer "
    ):

        return jsonify({
            "authenticated": False,
            "error": "Authentication required"
        }), 401

    access_token = authorization.replace(
        "Bearer ",
        "",
        1
    ).strip()

    # ========================================================
    # VERIFY SUPABASE USER
    # ========================================================

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

    # ========================================================
    # AUTH USER INFORMATION
    # ========================================================

    auth_user_id = user.get(
        "id"
    )

    email = user.get(
        "email"
    )

    print(
        "AUTH USER ID:",
        auth_user_id
    )

    print(
        "AUTH EMAIL:",
        email
    )

    # ========================================================
    # GET PUBLIC USERS PROFILE
    # ========================================================

    profile, profile_error, profile_status = (
        get_user_profile(email)
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
                "Student profile "
                "was not found."
            )
        }), 404

    # ========================================================
    # IMPORTANT ID MAPPING
    #
    # auth.users.id
    #       ↓
    # public.users.auth_user_id
    #
    # subscriptions.user_id
    #       ↓
    # public.users.id
    # ========================================================

    profile_user_id = profile.get(
        "id"
    )

    print(
        "PUBLIC USERS ID:",
        profile_user_id
    )

    print(
        "SUBSCRIPTIONS USER ID WILL BE:",
        profile_user_id
    )

    # ========================================================
    # GET SUBSCRIPTIONS
    # ========================================================

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

    # ========================================================
    # DETERMINE ACCESS
    # ========================================================

    access = determine_user_access(
        user,
        profile,
        subscriptions
    )

    # ========================================================
    # DEBUG
    # ========================================================

    print(
        "SUBSCRIPTIONS:",
        subscriptions
    )

    print(
        "FINAL ACCESS LEVEL:",
        access[
            "access_level"
        ]
    )

    print(
        "IS PREMIUM:",
        access[
            "access_level"
        ] == "premium"
    )

    print(
        "NEXT ROUTE:",
        access[
            "next_route"
        ]
    )

    # ========================================================
    # RESPONSE
    # ========================================================

    return jsonify({

        "authenticated": True,

        # ----------------------------------------------------
        # AUTH USER
        # ----------------------------------------------------

        "user": {

            "id": auth_user_id,

            "email": email,

            "metadata": (
                user.get(
                    "user_metadata"
                ) or {}
            ),
        },

        # ----------------------------------------------------
        # PUBLIC USER PROFILE
        # ----------------------------------------------------

        "profile": profile,

        # ----------------------------------------------------
        # SUBSCRIPTIONS
        # ----------------------------------------------------

        "subscriptions": (
            subscriptions or []
        ),

        # ----------------------------------------------------
        # LATEST SUBSCRIPTION
        # ----------------------------------------------------

        "subscription": (
            subscriptions[0]
            if subscriptions
            else None
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
                "access_level"
            ] == "premium"
        ),

        # ----------------------------------------------------
        # USER INFORMATION
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

        # ----------------------------------------------------
        # ROUTING
        # ----------------------------------------------------

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
    """
    General cleanup safe for normal English text.
    """

    if value is None:
        return ""

    text = str(value)

    # --------------------------------------------------------
    # REMOVE INVISIBLE CHARACTERS
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # NORMALIZE LINE ENDINGS
    # --------------------------------------------------------

    text = text.replace(
        "\r\n",
        "\n"
    )

    text = text.replace(
        "\r",
        "\n"
    )

    # --------------------------------------------------------
    # CLEAN WHITESPACE
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # UNICODE PUNCTUATION
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # FIX ESCAPED BACKSLASHES
    # --------------------------------------------------------

    text = text.replace(
        "\\\\",
        "\\"
    )

    # --------------------------------------------------------
    # SPACING COMMANDS
    # --------------------------------------------------------

    text = re.sub(
        r"\\+\s*,\s*",
        r"\,",
        text
    )

    # --------------------------------------------------------
    # TEXT
    # --------------------------------------------------------

    text = re.sub(
        r"\\text\s*\{\s*([^{}]+?)\s*\}",
        lambda m:
            r"\text{" +
            m.group(1).strip() +
            "}",
        text
    )

    # --------------------------------------------------------
    # MATHRM
    # --------------------------------------------------------

    text = re.sub(
        r"\\mathrm\s*\{\s*([^{}]+?)\s*\}",
        lambda m:
            r"\mathrm{" +
            m.group(1).strip() +
            "}",
        text
    )

    # --------------------------------------------------------
    # REMOVE SPACES AFTER COMMANDS
    # --------------------------------------------------------

    text = re.sub(
        r"\\,\s+",
        r"\,",
        text
    )

    # --------------------------------------------------------
    # SUBSCRIPTS
    # --------------------------------------------------------

    text = re.sub(
        r"([A-Za-z])_([A-Za-z0-9+-]+)(?!\})",
        r"\1_{\2}",
        text
    )

    # --------------------------------------------------------
    # POWERS
    # --------------------------------------------------------

    text = re.sub(
        r"([A-Za-z0-9)\]])\^(-?[A-Za-z0-9]+)(?!\})",
        r"\1^{\2}",
        text
    )

    # --------------------------------------------------------
    # FRACTIONS
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # SQRT
    # --------------------------------------------------------

    text = re.sub(
        r"\\sqrt\s*\{\s*([^{}]+?)\s*\}",
        lambda m:
            r"\sqrt{" +
            m.group(1).strip() +
            "}",
        text
    )

    # --------------------------------------------------------
    # MATH COMMAND SPACING
    # --------------------------------------------------------

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
# MATH DELIMITERS
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

    # --------------------------------------------------------
    # LATEX
    # --------------------------------------------------------

    if re.search(
        r"\\(frac|sqrt|text|mathrm|log|ln|sin|cos|tan|cot|sec|csc|"
        r"theta|alpha|beta|gamma|delta|lambda|mu|pi|omega|Omega|"
        r"sum|int|pm|times|cdot)",
        value
    ):
        return True

    # --------------------------------------------------------
    # EQUATIONS
    # --------------------------------------------------------

    if re.search(
        r"[A-Za-z0-9)\]}]\s*=\s*[A-Za-z0-9(\[{\\]",
        value
    ):
        return True

    # --------------------------------------------------------
    # POWERS
    # --------------------------------------------------------

    if re.search(
        r"[A-Za-z0-9)]\s*\^\s*\{?[-+]?\d",
        value
    ):
        return True

    # --------------------------------------------------------
    # SUBSCRIPTS
    # --------------------------------------------------------

    if re.search(
        r"[A-Za-z]_?\{?\d+\}?",
        value
    ):
        return True

    # --------------------------------------------------------
    # FRACTIONS
    # --------------------------------------------------------

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
# FINAL CONTENT NORMALIZER
# ============================================================

def normalize_content(value):

    text = clean_basic_text(value)

    if not text:
        return ""

    text = normalize_latex(text)

    # --------------------------------------------------------
    # FIX CONCATENATION
    # --------------------------------------------------------

    text = re.sub(
        r"(\d)(Step\s+\d+)",
        r"\1 \2",
        text,
        flags=re.IGNORECASE
    )

    # --------------------------------------------------------
    # FIX N10.50 STYLE VALUES
    # --------------------------------------------------------

    text = re.sub(
        r"\b([A-Z])(?=\d+(?:\.\d+)?)",
        r"\1 ",
        text
    )

    # --------------------------------------------------------
    # ANSWER FORMATTING
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
# NORMALIZE QUESTION
# ============================================================

def normalize_question(question):

    return {

        "id": question.get(
            "id"
        ),

        "subject": clean_basic_text(
            question.get(
                "subject"
            )
        ),

        "course_id": question.get(
            "course_id"
        ),

        "topic": clean_basic_text(
            question.get(
                "topic"
            )
        ),

        "question_text": normalize_content(
            question.get(
                "question_text"
            )
        ),

        "option_a": normalize_content(
            question.get(
                "option_a"
            )
        ),

        "option_b": normalize_content(
            question.get(
                "option_b"
            )
        ),

        "option_c": normalize_content(
            question.get(
                "option_c"
            )
        ),

        "option_d": normalize_content(
            question.get(
                "option_d"
            )
        ),

        "correction_answer": clean_basic_text(
            question.get(
                "correction_answer"
            )
        ),

        "explanation": normalize_content(
            question.get(
                "explanation"
            )
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

        "select": (
            "id,"
            "name,"
            "code,"
            "description,"
            "is_active"
        ),

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

            "id": row.get(
                "id"
            ),

            "name": clean_basic_text(
                row.get(
                    "name"
                )
            ),

            "code": clean_basic_text(
                row.get(
                    "code"
                )
            ),

            "description": clean_basic_text(
                row.get(
                    "description"
                )
            ),

            "is_active": row.get(
                "is_active"
            ),

        })

    return jsonify({

        "courses": courses,

        "count": len(courses)

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
            "error": (
                "Subject or course_id "
                "is required"
            )
        }), 400

    params = {

        "select": "topic",

        "is_active": "eq.true",

        "topic": "not.is.null",

        "limit": 1000,
    }

    # --------------------------------------------------------
    # O-LEVEL
    # --------------------------------------------------------

    if subject:

        if course_id:

            return jsonify({
                "error": (
                    "Use either subject "
                    "or course_id, not both"
                )
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

    # --------------------------------------------------------
    # UNIVERSITY
    # --------------------------------------------------------

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
                "error": "Invalid course_id"
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

        "topics": topics,

        "count": len(topics)

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

    # --------------------------------------------------------
    # VALIDATE LIMIT
    # --------------------------------------------------------

    try:

        limit = int(
            limit
        )

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

    # --------------------------------------------------------
    # REQUIRE SUBJECT OR COURSE
    # --------------------------------------------------------

    if not subject and not course_id:

        return jsonify({
            "error": (
                "Subject or course_id "
                "is required"
            )
        }), 400

    # --------------------------------------------------------
    # CLEAN VALUES
    # --------------------------------------------------------

    clean_subject = (
        clean_basic_text(subject)
        if subject
        else None
    )

    clean_topic = (
        clean_basic_text(topic)
        if topic
        else None
    )

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

        "limit": 1000,
    }

    # --------------------------------------------------------
    # O-LEVEL
    # --------------------------------------------------------

    if clean_subject:

        params["subject"] = (
            f"eq.{clean_subject}"
        )

        params["course_id"] = (
            "is.null"
        )

    # --------------------------------------------------------
    # UNIVERSITY
    # --------------------------------------------------------

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
                "error": "Invalid course_id"
            }), 400

        params["course_id"] = (
            f"eq.{course_id}"
        )

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
    # TOPIC FILTER
    # --------------------------------------------------------

    if (
        clean_topic
        and
        clean_topic.casefold() != "mixed"
    ):

        normalized_topic = (
            clean_topic.casefold()
        )

        filtered_rows = []

        for row in rows:

            database_topic = (
                clean_basic_text(
                    row.get("topic")
                )
            )

            if (
                database_topic.casefold()
                ==
                normalized_topic
            ):

                filtered_rows.append(
                    row
                )

        rows = filtered_rows

    # --------------------------------------------------------
    # NORMALIZE
    # --------------------------------------------------------

    questions = [
        normalize_question(
            question
        )
        for question in rows
    ]

    # --------------------------------------------------------
    # RANDOMIZE
    # --------------------------------------------------------

    random.shuffle(
        questions
    )

    # --------------------------------------------------------
    # LIMIT
    # --------------------------------------------------------

    questions = questions[
        :limit
    ]

    return jsonify({

        "questions": questions,

        "count": len(
            questions
        ),

        "mode": mode,

        "subject": clean_subject,

        "course_id": course_id,

        "topic": (
            clean_topic
            or
            "mixed"
        )

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