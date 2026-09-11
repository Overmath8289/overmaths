import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./Practice.css";

const API_URL = "https://overmaths.onrender.com";

const QUESTION_COUNTS = [5, 10, 20, 30];

const SPEED_OPTIONS = [
  { value: 10, label: "10 sec", description: "Very Fast" },
  { value: 20, label: "20 sec", description: "Fast" },
  { value: 30, label: "30 sec", description: "Balanced" },
  { value: 45, label: "45 sec", description: "Relaxed" },
  { value: 60, label: "60 sec", description: "No Rush" },
];

function Practice() {
  const navigate = useNavigate();
  const location = useLocation();

  const incomingState = location.state || {};

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const [profile, setProfile] = useState(null);

  // In-page notification
  const [notice, setNotice] = useState("");

  // secondary | university
  const [learningRoute, setLearningRoute] = useState(
    incomingState.learningRoute || "secondary"
  );

  const [examType, setExamType] = useState(
    incomingState.examType || ""
  );

  // Secondary subjects
  const [subjects, setSubjects] = useState([]);

  // University courses
  const [courses, setCourses] = useState([]);

  // Topics belonging to current subject/course
  const [topics, setTopics] = useState([]);

  const [selectedSubject, setSelectedSubject] = useState(
    incomingState.subject || ""
  );

  const [selectedCourseId, setSelectedCourseId] = useState(
    incomingState.courseId || ""
  );

  const [selectedTopic, setSelectedTopic] = useState("mixed");

  const [mode, setMode] = useState("practice");

  const [questionCount, setQuestionCount] = useState(10);

  const [timePerQuestion, setTimePerQuestion] = useState(30);

  /*
   * ---------------------------------------------------------
   * IN-PAGE NOTICE
   * ---------------------------------------------------------
   */

  function showNotice(message) {
    setNotice(message);
  }

  useEffect(() => {
    if (!notice) return;

    const timeout = setTimeout(() => {
      setNotice("");
    }, 3200);

    return () => clearTimeout(timeout);
  }, [notice]);

  /*
   * ---------------------------------------------------------
   * LOAD USER + PROFILE
   * ---------------------------------------------------------
   */

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setLoading(true);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          navigate("/login");
          return;
        }

        const { data, error } = await supabase
          .from("users")
          .select("full_name, learning_route, exam_type")
          .eq("auth_user_id", user.id)
          .single();

        if (error) {
          throw error;
        }

        if (!mounted) return;

        setProfile(data);

        /*
         * Navigation state has priority because Dashboard
         * may intentionally send the student here for a
         * particular subject/course.
         */

        if (!incomingState.learningRoute && data?.learning_route) {
          setLearningRoute(data.learning_route);
        }

        if (!incomingState.examType && data?.exam_type) {
          setExamType(data.exam_type);
        }

        if (
          !incomingState.subject &&
          data?.learning_route !== "university"
        ) {
          setSelectedSubject("");
        }
      } catch (error) {
        console.error("Practice profile error:", error);

        if (mounted) {
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  /*
   * ---------------------------------------------------------
   * LOAD SECONDARY SUBJECTS FROM PYTHON API
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (learningRoute !== "secondary") {
      setSubjects([]);
      return;
    }

    let mounted = true;

    async function loadSubjects() {
      try {
        const response = await fetch(
          `${API_URL}/api/practice/subjects`
        );

        if (!response.ok) {
          throw new Error(
            `Subjects API returned ${response.status}`
          );
        }

        const result = await response.json();

        if (!mounted) return;

        const uniqueSubjects = [
          ...new Set(
            (result.subjects || [])
              .map((subject) =>
                String(subject || "").trim()
              )
              .filter(Boolean)
          ),
        ].sort((a, b) => a.localeCompare(b));

        setSubjects(uniqueSubjects);

        /*
         * Keep Dashboard-selected subject if it exists.
         */

        if (
          selectedSubject &&
          uniqueSubjects.includes(selectedSubject)
        ) {
          return;
        }

        /*
         * Otherwise choose the first available subject.
         */

        if (uniqueSubjects.length > 0) {
          setSelectedSubject(uniqueSubjects[0]);
        } else {
          setSelectedSubject("");
        }
      } catch (error) {
        console.error(
          "Unable to load subjects from Python API:",
          error
        );

        if (mounted) {
          setSubjects([]);
        }
      }
    }

    loadSubjects();

    return () => {
      mounted = false;
    };
  }, [learningRoute]);

  /*
   * ---------------------------------------------------------
   * LOAD UNIVERSITY COURSES FROM PYTHON API
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (learningRoute !== "university") {
      setCourses([]);
      return;
    }

    let mounted = true;

    async function loadCourses() {
      try {
        const response = await fetch(
          `${API_URL}/api/practice/courses`
        );

        if (!response.ok) {
          throw new Error(
            `Courses API returned ${response.status}`
          );
        }

        const result = await response.json();

        if (!mounted) return;

        const loadedCourses = result.courses || [];

        setCourses(loadedCourses);

        /*
         * Keep Dashboard-selected course where possible.
         */

        const incomingCourseExists = loadedCourses.some(
          (course) =>
            String(course.id) ===
            String(selectedCourseId)
        );

        if (incomingCourseExists) {
          return;
        }

        if (loadedCourses.length > 0) {
          setSelectedCourseId(loadedCourses[0].id);
        } else {
          setSelectedCourseId("");
        }
      } catch (error) {
        console.error(
          "Unable to load university courses from Python API:",
          error
        );

        if (mounted) {
          setCourses([]);
        }
      }
    }

    loadCourses();

    return () => {
      mounted = false;
    };
  }, [learningRoute]);

  /*
   * ---------------------------------------------------------
   * LOAD TOPICS FROM PYTHON API
   * ---------------------------------------------------------
   *
   * Secondary:
   *   /api/practice/topics?subject=Physics
   *
   * University:
   *   /api/practice/topics?course_id=1
   *
   * Mixed Topics is handled by the question API and is not
   * sent as an actual database topic.
   * ---------------------------------------------------------
   */

  useEffect(() => {
    let mounted = true;

    async function loadTopics() {
      setTopics([]);
      setSelectedTopic("mixed");

      try {
        let url = "";

        if (learningRoute === "secondary") {
          if (!selectedSubject) return;

          url =
            `${API_URL}/api/practice/topics?subject=` +
            encodeURIComponent(selectedSubject);
        }

        if (learningRoute === "university") {
          if (!selectedCourseId) return;

          url =
            `${API_URL}/api/practice/topics?course_id=` +
            encodeURIComponent(selectedCourseId);
        }

        if (!url) return;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Topics API returned ${response.status}`
          );
        }

        const result = await response.json();

        if (!mounted) return;

        const uniqueTopics = [
          ...new Set(
            (result.topics || [])
              .map((topic) =>
                String(topic || "").trim()
              )
              .filter(Boolean)
          ),
        ].sort((a, b) => a.localeCompare(b));

        setTopics(uniqueTopics);
      } catch (error) {
        console.error(
          "Unable to load topics from Python API:",
          error
        );

        if (mounted) {
          setTopics([]);
        }
      }
    }

    loadTopics();

    return () => {
      mounted = false;
    };
  }, [
    learningRoute,
    selectedSubject,
    selectedCourseId,
  ]);

  /*
   * ---------------------------------------------------------
   * SELECTED COURSE
   * ---------------------------------------------------------
   */

  const selectedCourse = useMemo(() => {
    return courses.find(
      (course) =>
        String(course.id) ===
        String(selectedCourseId)
    );
  }, [courses, selectedCourseId]);

  /*
   * ---------------------------------------------------------
   * SESSION PREVIEW
   * ---------------------------------------------------------
   */

  const previewName =
    learningRoute === "university"
      ? selectedCourse?.code ||
        selectedCourse?.name ||
        "Choose Course"
      : selectedSubject || "Choose Subject";

  const previewTopic =
    selectedTopic === "mixed"
      ? "Mixed Topics"
      : selectedTopic || "Choose Topic";

  const previewMode =
    mode === "practice"
      ? "Practice Mode"
      : "Examination Mode";

  const previewSpeed =
    SPEED_OPTIONS.find(
      (option) =>
        option.value === timePerQuestion
    )?.label ||
    `${timePerQuestion} sec`;

  /*
   * ---------------------------------------------------------
   * START SESSION
   * ---------------------------------------------------------
   */

  async function handleStart() {
    if (starting) return;

    if (
      learningRoute === "secondary" &&
      !selectedSubject
    ) {
      showNotice("Please choose a subject before starting.");
      return;
    }

    if (
      learningRoute === "university" &&
      !selectedCourseId
    ) {
      showNotice("Please choose a course before starting.");
      return;
    }

    setStarting(true);

    try {
      const quizState = {
        learningRoute,

        subject:
          learningRoute === "secondary"
            ? selectedSubject
            : "",

        courseId:
          learningRoute === "university"
            ? selectedCourseId
            : "",

        courseCode:
          learningRoute === "university"
            ? selectedCourse?.code || ""
            : "",

        courseName:
          learningRoute === "university"
            ? selectedCourse?.name || ""
            : "",

        topic: selectedTopic,

        questionCount,

        mode,

        timePerQuestion,

        examType:
          learningRoute === "secondary"
            ? examType
            : "",
      };

      navigate("/quiz", {
        state: quizState,
      });
    } finally {
      setStarting(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * LOGOUT
   * ---------------------------------------------------------
   */

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="practice-page">
        <div className="practice-loading">
          <div className="practice-loader"></div>
          <p>
            Preparing your practice studio...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * PAGE
   * ---------------------------------------------------------
   */

  return (
    <div className="practice-page">

      {/* Ambient background */}
      <div className="practice-glow practice-glow-one"></div>
      <div className="practice-glow practice-glow-two"></div>

      {/* In-page notice */}
      {notice && (
        <div
          className="practice-notice"
          role="status"
          aria-live="polite"
        >
          <span className="practice-notice-icon">!</span>

          <span>{notice}</span>

          <button
            type="button"
            className="practice-notice-close"
            onClick={() => setNotice("")}
            aria-label="Close message"
          >
            ×
          </button>
        </div>
      )}

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="practice-header">

        <button
          className="practice-logo"
          onClick={() => navigate("/dashboard")}
          type="button"
        >
          <span className="practice-logo-mark">
            O
          </span>

          <span className="practice-logo-text">
            Over<span>maths</span>
          </span>
        </button>

        <nav className="practice-nav">

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="practice-nav-link"
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() => navigate("/practice")}
            className="practice-nav-link active"
          >
            Practice
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/student-profile")
            }
            className="practice-nav-link"
          >
            Profile
          </button>

        </nav>

        <button
          type="button"
          className="practice-logout"
          onClick={handleLogout}
        >
          Logout
        </button>

      </header>

      {/* =====================================================
          MAIN
          ===================================================== */}

      <main className="practice-main">

        {/* Hero */}

        <section className="practice-hero">

          <div className="practice-eyebrow">
            <span className="practice-eyebrow-dot"></span>
            PERSONALIZED LEARNING
          </div>

          <h1>
            Build your
            <span> practice session.</span>
          </h1>

          <p>
            Choose what you want to study, how you want to
            study it, and how fast you want to be challenged.
          </p>

        </section>

        {/* =================================================
            LEARNING AREA
            ================================================= */}

        <section className="practice-panel">

          <div className="practice-section-heading">

            <div>

              <span className="section-number">
                01
              </span>

              <div>

                <h2>
                  What are you studying?
                </h2>

                <p>
                  Select from the subjects and courses
                  available in your question bank.
                </p>

              </div>

            </div>

          </div>

          <div className="practice-selection-grid">

            {/* Secondary */}

            {learningRoute === "secondary" && (

              <div className="practice-field">

                <label htmlFor="subject">
                  Subject
                </label>

                <div className="practice-select-wrap">

                  <select
                    id="subject"
                    value={selectedSubject}
                    onChange={(event) => {
                      setSelectedSubject(
                        event.target.value
                      );

                      setSelectedTopic("mixed");
                    }}
                    className="practice-select"
                  >

                    <option value="">
                      Choose subject
                    </option>

                    {subjects.map((subject) => (
                      <option
                        value={subject}
                        key={subject}
                      >
                        {subject}
                      </option>
                    ))}

                  </select>

                  <span className="practice-select-arrow">
                    ↓
                  </span>

                </div>

                <small>
                  Subjects are loaded from the
                  Overmaths question API.
                </small>

              </div>

            )}

            {/* University */}

            {learningRoute === "university" && (

              <div className="practice-field">

                <label htmlFor="course">
                  Course
                </label>

                <div className="practice-select-wrap">

                  <select
                    id="course"
                    value={selectedCourseId}
                    onChange={(event) => {
                      setSelectedCourseId(
                        event.target.value
                      );

                      setSelectedTopic("mixed");
                    }}
                    className="practice-select"
                  >

                    <option value="">
                      Choose course
                    </option>

                    {courses.map((course) => (
                      <option
                        value={course.id}
                        key={course.id}
                      >
                        {course.code
                          ? `${course.code} — ${course.name}`
                          : course.name}
                      </option>
                    ))}

                  </select>

                  <span className="practice-select-arrow">
                    ↓
                  </span>

                </div>

                <small>
                  Courses are loaded from the
                  Overmaths question API.
                </small>

              </div>

            )}

            {/* Topic */}

            <div className="practice-field">

              <label htmlFor="topic">
                Topic
              </label>

              <div className="practice-select-wrap">

                <select
                  id="topic"
                  value={selectedTopic}
                  onChange={(event) =>
                    setSelectedTopic(
                      event.target.value
                    )
                  }
                  className="practice-select"
                  disabled={
                    learningRoute === "secondary"
                      ? !selectedSubject
                      : !selectedCourseId
                  }
                >

                  <option value="mixed">
                    Mixed Topics
                  </option>

                  {topics.map((topic) => (
                    <option
                      value={topic}
                      key={topic}
                    >
                      {topic}
                    </option>
                  ))}

                </select>

                <span className="practice-select-arrow">
                  ↓
                </span>

              </div>

              <small>
                Mixed Topics pulls questions from all
                available topics in your selection.
              </small>

            </div>

          </div>

        </section>

        {/* =================================================
            MODE
            ================================================= */}

        <section className="practice-panel">

          <div className="practice-section-heading">

            <div>

              <span className="section-number">
                02
              </span>

              <div>

                <h2>
                  Choose your mode
                </h2>

                <p>
                  Decide whether you want instant learning
                  feedback or a real examination experience.
                </p>

              </div>

            </div>

          </div>

          <div className="practice-mode-grid">

            {/* Practice */}

            <button
              type="button"
              className={`practice-mode-card ${
                mode === "practice"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setMode("practice")
              }
            >

              <div className="mode-icon">
                🧠
              </div>

              <div className="mode-content">

                <div className="mode-title-row">

                  <h3>
                    Practice Mode
                  </h3>

                  {mode === "practice" && (
                    <span className="selected-badge">
                      Selected
                    </span>
                  )}

                </div>

                <p>
                  Learn as you go. Get immediate feedback
                  after answering each question and see the
                  explanation.
                </p>

                <div className="mode-feature">
                  <span>✓</span>
                  Instant answer feedback
                </div>

                <div className="mode-feature">
                  <span>✓</span>
                  Detailed explanations
                </div>

              </div>

            </button>

            {/* Examination */}

            <button
              type="button"
              className={`practice-mode-card examination ${
                mode === "examination"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setMode("examination")
              }
            >

              <div className="mode-icon">
                🎯
              </div>

              <div className="mode-content">

                <div className="mode-title-row">

                  <h3>
                    Examination Mode
                  </h3>

                  {mode === "examination" && (
                    <span className="selected-badge">
                      Selected
                    </span>
                  )}

                </div>

                <p>
                  Simulate a real examination. Your answers
                  stay private until you submit the session.
                </p>

                <div className="mode-feature">
                  <span>✓</span>
                  No answers revealed during exam
                </div>

                <div className="mode-feature">
                  <span>✓</span>
                  Performance analysis after submission
                </div>

              </div>

            </button>

          </div>

        </section>

        {/* =================================================
            QUESTIONS
            ================================================= */}

        <section className="practice-panel">

          <div className="practice-section-heading">

            <div>

              <span className="section-number">
                03
              </span>

              <div>

                <h2>
                  How many questions?
                </h2>

                <p>
                  Set the size of your session.
                </p>

              </div>

            </div>

          </div>

          <div className="practice-choice-grid">

            {QUESTION_COUNTS.map((count) => (
              <button
                type="button"
                key={count}
                className={`practice-choice ${
                  questionCount === count
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setQuestionCount(count)
                }
              >

                <strong>
                  {count}
                </strong>

                <span>
                  Questions
                </span>

              </button>
            ))}

          </div>

        </section>

        {/* =================================================
            SPEED
            ================================================= */}

        <section className="practice-panel">

          <div className="practice-section-heading">

            <div>

              <span className="section-number">
                04
              </span>

              <div>

                <h2>
                  Set your speed
                </h2>

                <p>
                  Choose how much time you get for each
                  question.
                </p>

              </div>

            </div>

          </div>

          <div className="practice-speed-grid">

            {SPEED_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                className={`practice-speed-card ${
                  timePerQuestion === option.value
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setTimePerQuestion(
                    option.value
                  )
                }
              >

                <strong>
                  {option.label}
                </strong>

                <span>
                  {option.description}
                </span>

              </button>
            ))}

          </div>

        </section>

        {/* =================================================
            SESSION PREVIEW
            ================================================= */}

        <section className="practice-preview">

          <div className="preview-top">

            <div>

              <span className="preview-label">
                SESSION PREVIEW
              </span>

              <h2>
                Ready when you are.
              </h2>

              <p>
                Your session will be created using the
                selections below.
              </p>

            </div>

            <div className="preview-icon">
              →
            </div>

          </div>

          <div className="preview-details">

            <div className="preview-detail">
              <span>Study</span>
              <strong>
                {previewName}
              </strong>
            </div>

            <div className="preview-detail">
              <span>Topic</span>
              <strong>
                {previewTopic}
              </strong>
            </div>

            <div className="preview-detail">
              <span>Mode</span>
              <strong>
                {previewMode}
              </strong>
            </div>

            <div className="preview-detail">
              <span>Questions</span>
              <strong>
                {questionCount}
              </strong>
            </div>

            <div className="preview-detail">
              <span>Speed</span>
              <strong>
                {previewSpeed}/question
              </strong>
            </div>

          </div>

          {mode === "examination" && (
            <div className="examination-note">

              <span>🎯</span>

              <div>

                <strong>
                  Examination mode is active
                </strong>

                <p>
                  Answers and explanations will remain
                  hidden until you submit the examination.
                  Your result will then be analyzed.
                </p>

              </div>

            </div>
          )}

          <button
            type="button"
            className="start-practice-btn"
            onClick={handleStart}
            disabled={starting}
          >

            {starting ? (
              <>
                <span className="button-spinner"></span>
                Preparing session...
              </>
            ) : (
              <>
                Start Session
                <span>→</span>
              </>
            )}

          </button>

        </section>

      </main>

      {/* =====================================================
          FOOTER
          ===================================================== */}

      <footer className="practice-footer">

        <span>
          © {new Date().getFullYear()} Overmaths
        </span>

        <span>
          Learn smarter. Perform better.
        </span>

      </footer>

    </div>
  );
}

export default Practice;