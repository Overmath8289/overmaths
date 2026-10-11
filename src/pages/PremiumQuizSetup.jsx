
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Clock,
  ListChecks,
  Target,
  Sparkles,
  Play,
} from "lucide-react";
import "./PremiumQuizSetup.css";

const API_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "https://overmaths.onrender.com"
).replace(/\/$/, "");

function normalizeTopic(value) {
  const topic = String(value || "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*([/&])\s*/g, " $1 ");

  const aliases = {
    factorization: "factorisation",
    vector: "vectors",
    "number base": "number bases",
  };

  return aliases[topic] || topic;
}

async function fetchJson(path) {
  const response = await fetch(`${API_URL}${path}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Unable to load data.");
  }

  return data;
}

export default function PremiumQuizSetup() {
  const navigate = useNavigate();

  const [learningRoute, setLearningRoute] = useState("secondary");
  const [subject, setSubject] = useState("");
  const [courseId, setCourseId] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [topics, setTopics] = useState([]);
  const [topic, setTopic] = useState("mixed");
  const [mode, setMode] = useState("practice");
  const [questionCount, setQuestionCount] = useState(10);
  const [timePerQuestion, setTimePerQuestion] = useState(30);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  // Load subjects and university courses from the backend.
  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setLoadingOptions(true);
      setError("");

      try {
        const [subjectData, courseData] = await Promise.all([
          fetchJson("/api/practice/subjects"),
          fetchJson("/api/practice/courses"),
        ]);

        if (cancelled) return;

        setSubjects(subjectData.subjects || []);
        setCourses(
          (courseData.courses || []).filter(
            (course) => course.is_active !== false
          )
        );
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load subjects and courses.");
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    }

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load topics whenever the selected subject or course changes.
  useEffect(() => {
    let cancelled = false;

    async function loadTopics() {
      setTopics([]);
      setTopic("mixed");
      setError("");

      const query =
        learningRoute === "secondary"
          ? subject
            ? `?subject=${encodeURIComponent(subject)}`
            : ""
          : courseId
            ? `?course_id=${encodeURIComponent(courseId)}`
            : "";

      if (!query) {
        setLoadingTopics(false);
        return;
      }

      setLoadingTopics(true);

      try {
        const data = await fetchJson(`/api/practice/topics${query}`);

        if (cancelled) return;

        // Deduplicate topic names even if the API returns variants.
        const uniqueTopics = new Map();

        for (const item of data.topics || []) {
          const displayName = String(item || "").trim();
          if (!displayName) continue;

          const key = normalizeTopic(displayName);

          if (!uniqueTopics.has(key)) {
            uniqueTopics.set(key, displayName);
          }
        }

        setTopics(
          [...uniqueTopics.values()].sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: "base" })
          )
        );
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load topics.");
        }
      } finally {
        if (!cancelled) {
          setLoadingTopics(false);
        }
      }
    }

    loadTopics();

    return () => {
      cancelled = true;
    };
  }, [learningRoute, subject, courseId]);

  function handleRouteChange(route) {
    setLearningRoute(route);
    setSubject("");
    setCourseId("");
    setTopic("mixed");
    setTopics([]);
    setError("");
  }

  function handleStartQuiz() {
    if (starting) return;

    if (learningRoute === "secondary" && !subject) {
      alert("Please select a subject.");
      return;
    }

    if (learningRoute === "university" && !courseId) {
      alert("Please select a university course.");
      return;
    }

    setStarting(true);

    const selectedCourse = courses.find(
      (course) => String(course.id) === String(courseId)
    );

    navigate("/premium-quiz", {
      state: {
        subject: learningRoute === "secondary" ? subject : "All Subjects",
        courseId: learningRoute === "university" ? Number(courseId) : null,
        courseCode: selectedCourse?.code || "",
        courseName: selectedCourse?.name || "",
        topic,
        questionCount,
        mode:
          mode === "examination"
            ? "Examination Mode"
            : "Practice Mode",
        timePerQuestion,
        learningRoute,
      },
    });
  }

  return (
    <main className="premium-setup">
      <header className="premium-setup-header">
        <button
          className="setup-back"
          onClick={() => navigate("/premium")}
          type="button"
        >
          <ArrowLeft size={18} />
          Dashboard
        </button>

        <div className="setup-brand">
          <span>Over</span>
          <strong>maths</strong>
          <span className="premium-label">PREMIUM</span>
        </div>
      </header>

      <section className="setup-container">
        <div className="setup-heading">
          <span className="setup-eyebrow">
            <Sparkles size={15} />
            YOUR LEARNING SPACE
          </span>

          <h1>Set up your quiz</h1>
          <p>
            Personalise your session and get ready to practise smarter.
          </p>
        </div>

        <div className="setup-card">
          <section className="setup-section">
            <h2>
              <GraduationCap size={20} />
              Learning route
            </h2>

            <div className="setup-choice-grid">
              <button
                type="button"
                className={`setup-choice ${
                  learningRoute === "secondary" ? "selected" : ""
                }`}
                onClick={() => handleRouteChange("secondary")}
              >
                <GraduationCap size={22} />
                <span>Secondary School</span>
                <small>WAEC, NECO and related exams</small>
              </button>

              <button
                type="button"
                className={`setup-choice ${
                  learningRoute === "university" ? "selected" : ""
                }`}
                onClick={() => handleRouteChange("university")}
              >
                <BookOpen size={22} />
                <span>University</span>
                <small>Courses and university topics</small>
              </button>
            </div>
          </section>

          <section className="setup-section">
            <h2>
              <BookOpen size={20} />
              Subject or course
            </h2>

            <label htmlFor="premium-subject">
              {learningRoute === "secondary" ? "Subject" : "Course"}
            </label>

            {learningRoute === "secondary" ? (
              <select
                id="premium-subject"
                className="setup-input"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                disabled={loadingOptions}
              >
                <option value="">
                  {loadingOptions ? "Loading subjects..." : "Select a subject"}
                </option>

                {subjects.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            ) : (
              <select
                id="premium-subject"
                className="setup-input"
                value={courseId}
                onChange={(event) => setCourseId(event.target.value)}
                disabled={loadingOptions}
              >
                <option value="">
                  {loadingOptions ? "Loading courses..." : "Select a course"}
                </option>

                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code
                      ? `${course.code} — ${course.name}`
                      : course.name}
                  </option>
                ))}
              </select>
            )}

            <p className="setup-help">
              {learningRoute === "secondary"
                ? "Subjects are loaded from your available question bank."
                : "Choose a course to load its available topics."}
            </p>
          </section>

          <section className="setup-section">
            <h2>
              <ListChecks size={20} />
              Topic
            </h2>

            <label htmlFor="premium-topic">Choose your topic</label>

            <select
              id="premium-topic"
              className="setup-input"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              disabled={
                loadingTopics ||
                (learningRoute === "secondary" ? !subject : !courseId)
              }
            >
              <option value="mixed">Mixed topics</option>

              {loadingTopics && (
                <option value="" disabled>
                  Loading topics...
                </option>
              )}

              {topics.map((item) => (
                <option key={normalizeTopic(item)} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <p className="setup-help">
              {loadingTopics
                ? "Loading available topics..."
                : topics.length
                  ? `${topics.length} topics available.`
                  : "Select a subject or course to load its topics."}
            </p>
          </section>

          <section className="setup-section">
            <h2>
              <Target size={20} />
              Quiz mode
            </h2>

            <div className="setup-choice-grid">
              <button
                type="button"
                className={`setup-choice ${
                  mode === "practice" ? "selected" : ""
                }`}
                onClick={() => setMode("practice")}
              >
                <BookOpen size={22} />
                <span>Practice Mode</span>
                <small>Learn as you answer</small>
              </button>

              <button
                type="button"
                className={`setup-choice ${
                  mode === "examination" ? "selected" : ""
                }`}
                onClick={() => setMode("examination")}
              >
                <Target size={22} />
                <span>Examination Mode</span>
                <small>Review results after submission</small>
              </button>
            </div>
          </section>

          <section className="setup-section">
            <h2>
              <ListChecks size={20} />
              Number of questions
            </h2>

            <div className="setup-count-options">
              {[5, 10, 20, 30, 50, 100].map((count) => (
                <button
                  key={count}
                  type="button"
                  className={`setup-count ${
                    questionCount === count ? "selected" : ""
                  }`}
                  onClick={() => setQuestionCount(count)}
                >
                  {count}
                </button>
              ))}
            </div>
          </section>

          <section className="setup-section">
            <h2>
              <Clock size={20} />
              Time per question
            </h2>

            <label htmlFor="premium-time">
              Seconds allowed for each question
            </label>

            <select
              id="premium-time"
              className="setup-input"
              value={timePerQuestion}
              onChange={(event) =>
                setTimePerQuestion(Number(event.target.value))
              }
            >
              <option value={10}>10 seconds</option>
              <option value={20}>20 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={45}>45 seconds</option>
              <option value={60}>60 seconds</option>
            </select>

            <p className="setup-help">
              Total planned time:{" "}
              {Math.floor((questionCount * timePerQuestion) / 60)} min{" "}
              {(questionCount * timePerQuestion) % 60} sec
            </p>
          </section>

          {error && (
            <p role="alert" className="setup-help">
              {error}
            </p>
          )}

          <button
            className="setup-start-button"
            onClick={handleStartQuiz}
            type="button"
            disabled={
              starting ||
              loadingOptions ||
              loadingTopics ||
              (learningRoute === "secondary" ? !subject : !courseId)
            }
          >
            <Play size={18} />
            {starting ? "Opening quiz..." : "Start Quiz"}
          </button>
        </div>
      </section>

      <div className="setup-benefits">
        <div className="setup-benefit">
          <Sparkles size={21} />
          <span>Personalised learning experience</span>
        </div>

        <div className="setup-benefit">
          <BookOpen size={21} />
          <span>Focused practice sessions</span>
        </div>

        <div className="setup-benefit">
          <Target size={21} />
          <span>Track your progress</span>
        </div>

        <div className="setup-benefit">
          <GraduationCap size={21} />
          <span>Achieve your goals</span>
        </div>
      </div>
    </main>
  );
}
