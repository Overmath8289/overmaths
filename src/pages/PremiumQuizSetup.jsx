
import { useState } from "react";
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

export default function PremiumQuizSetup() {
  const navigate = useNavigate();

  const [learningRoute, setLearningRoute] = useState("secondary");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("mixed");
  const [mode, setMode] = useState("practice");
  const [questionCount, setQuestionCount] = useState(10);
  const [timePerQuestion, setTimePerQuestion] = useState(30);

  function handleStartQuiz() {
    if (!subject.trim()) {
      alert("Please enter or select a subject or course.");
      return;
    }

    // The next step will connect this button to the
    // Premium Quiz backend before navigating.
    alert("Your setup is ready. Backend connection is next.");
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
                onClick={() => {
                  setLearningRoute("secondary");
                  setSubject("");
                  setTopic("mixed");
                }}
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
                onClick={() => {
                  setLearningRoute("university");
                  setSubject("");
                  setTopic("mixed");
                }}
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

            <input
              id="premium-subject"
              className="setup-input"
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value);
                setTopic("mixed");
              }}
              placeholder={
                learningRoute === "secondary"
                  ? "e.g. Mathematics"
                  : "Enter your course name or code"
              }
            />

            <p className="setup-help">
              We’ll connect this field to your available subjects and courses.
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
            >
              <option value="mixed">Mixed topics</option>
              <option value="specific">Specific topic (coming next)</option>
            </select>
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

          <button
            className="setup-start-button"
            onClick={handleStartQuiz}
            type="button"
          >
            <Play size={18} />
            Start Quiz
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
