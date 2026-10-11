
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import MathText from "../components/MathText";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Calculator,
  Check,
  CheckCircle2,
  Clock3,
  Flag,
  LayoutGrid,
  Lightbulb,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  Maximize2,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  X,
  XCircle,
} from "lucide-react";
import "./PremiumQuiz.css";

const API_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://overmaths.onrender.com"
).replace(/\/$/, "");

const LETTERS = ["A", "B", "C", "D"];

const normalizeAnswer = (answer) => {
  if (answer == null) return "";
  const value = String(answer).trim().toUpperCase();
  const match = value.match(/^(?:OPTION\s*)?([A-D])$/);
  return match ? match[1] : value;
};

const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const formatTime = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainingSeconds = safe % 60;

  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const getCorrectAnswer = (question) =>
  normalizeAnswer(
    question?.correction_answer ??
      question?.correct_answer ??
      question?.correctAnswer
  );

const getOptions = (question) =>
  LETTERS.map((letter) => ({
    letter,
    text:
      question?.[`option_${letter.toLowerCase()}`] ??
      question?.[`option${letter}`] ??
      question?.[`option_${letter}`] ??
      "",
  }));

const getQuestionText = (question) =>
  question?.question_text ??
  question?.question ??
  question?.text ??
  question?.content ??
  "";

async function apiRequest(path, token, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error || data?.message || `Request failed (${response.status})`
    );
  }

  return data;
}

export default function PremiumQuiz() {
  const location = useLocation();
  const navigate = useNavigate();
  const config = location.state || {};

  const {
    subject = "All Subjects",
    courseId = null,
    courseCode = "",
    courseName = "",
    topic = "mixed",
    questionCount = 10,
    mode = "Practice Mode",
    examType = "",
  } = config;

  const isExamMode = /exam|examination|test/i.test(mode);
  const requestedCount = Math.max(1, Number(questionCount) || 10);
  const durationMinutes = Math.max(
    1,
    Number(config.durationMinutes ?? config.duration ?? 30) || 30
  );

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(
    isExamMode ? durationMinutes * 60 : 0
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showPalette, setShowPalette] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState("");
  const [calculatorResult, setCalculatorResult] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [userId, setUserId] = useState(null);
  const [accessToken, setAccessToken] = useState("");
  const [questionOrder, setQuestionOrder] = useState("sequential");

  const timerRef = useRef(null);
  const elapsedRef = useRef(null);
  const savedRef = useRef(false);
  const submitRef = useRef(null);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id] ?? ""
    : "";

  const answeredCount = useMemo(
    () => questions.filter((question) => answers[question.id] != null && answers[question.id] !== "").length,
    [questions, answers]
  );

  const unansweredCount = Math.max(0, questions.length - answeredCount);
  const markedCount = marked.length;
  const progress = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  const correctCount = useMemo(
    () =>
      questions.reduce((total, question) => {
        const correct = getCorrectAnswer(question);
        return total + (correct && normalizeAnswer(answers[question.id]) === correct ? 1 : 0);
      }, 0),
    [questions, answers]
  );

  const incorrectCount = Math.max(0, answeredCount - correctCount);
  const scorePercent = questions.length
    ? Math.round((correctCount / questions.length) * 100)
    : 0;

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.access_token) {
        throw new Error("Please sign in before starting your premium quiz.");
      }

      setAccessToken(session.access_token);
      setUserId(session.user?.id ?? null);

      const params = new URLSearchParams();
      if (courseId != null && courseId !== "") {
        params.set("course_id", String(courseId));
      } else if (subject && subject !== "All Subjects") {
        params.set("subject", subject);
      }

      if (topic && topic !== "mixed") params.set("topic", topic);
      params.set("limit", String(requestedCount));

      const result = await apiRequest(
        `/api/questions?${params.toString()}`,
        session.access_token
      );

      const received =
        Array.isArray(result)
          ? result
          : result?.questions ?? result?.data?.questions ?? result?.data ?? [];

      if (!Array.isArray(received) || received.length === 0) {
        throw new Error("No questions were found for this quiz. Try another topic or course.");
      }

      const selected = shuffle(received).slice(0, requestedCount);

      setQuestions(selected);
      setAnswers({});
      setMarked([]);
      setCurrentIndex(0);
      setTimeLeft(isExamMode ? durationMinutes * 60 : 0);
      setElapsedSeconds(0);
      savedRef.current = false;
      setSubmitted(false);
      setSaveMessage("");
    } catch (loadError) {
      setError(loadError?.message || "We could not load your questions.");
    } finally {
      setLoading(false);
    }
  }, [courseId, subject, topic, requestedCount, isExamMode, durationMinutes]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    if (loading || submitted || questions.length === 0) return undefined;

    elapsedRef.current = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(elapsedRef.current);
  }, [loading, submitted, questions.length]);

  useEffect(() => {
    if (!isExamMode || loading || submitted || questions.length === 0) {
      return undefined;
    }

    timerRef.current = window.setInterval(() => {
      setTimeLeft((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timerRef.current);
          window.setTimeout(() => submitRef.current?.("timeout"), 0);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerRef.current);
  }, [isExamMode, loading, submitted, questions.length]);

  useEffect(
    () => () => {
      window.clearInterval(timerRef.current);
      window.clearInterval(elapsedRef.current);
    },
    []
  );

  const chooseAnswer = (letter) => {
    if (!currentQuestion || submitted) return;

    if (!isExamMode && answers[currentQuestion.id] != null) return;

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: letter,
    }));
  };

  const goToQuestion = (index) => {
    if (index < 0 || index >= questions.length) return;
    setCurrentIndex(index);
  };

  const toggleMark = () => {
    if (!currentQuestion) return;

    setMarked((previous) =>
      previous.includes(currentQuestion.id)
        ? previous.filter((id) => id !== currentQuestion.id)
        : [...previous, currentQuestion.id]
    );
  };

  const evaluateCalculator = () => {
    const expression = calculatorValue.trim();

    if (!expression || !/^[0-9+\-*/().%\s]+$/.test(expression)) {
      setCalculatorResult("Enter a valid arithmetic expression.");
      return;
    }

    try {
      // Only arithmetic characters are accepted above.
      const value = Function(`"use strict"; return (${expression})`)();
      setCalculatorResult(
        Number.isFinite(value) ? String(value) : "Invalid calculation."
      );
    } catch {
      setCalculatorResult("Check the expression and try again.");
    }
  };

  const submitQuiz = useCallback(
    async (reason = "manual") => {
      if (savedRef.current || submitting || submitted || questions.length === 0) {
        return;
      }

      savedRef.current = true;
      setSubmitting(true);
      setSubmitted(true);
      setShowSubmitModal(false);
      setShowQuitModal(false);

      window.clearInterval(timerRef.current);
      window.clearInterval(elapsedRef.current);

      if (!userId) {
        setSaveMessage("Your result is shown below, but we could not identify your account to save it.");
        setSubmitting(false);
        return;
      }

      try {
        const attemptPayload = {
          user_id: userId,
          course_id: courseId ? Number(courseId) : null,
          score: correctCount,
          total_questions: questions.length,
          mode: mode || "Practice Mode",
        };

        const { data: attempt, error: attemptError } = await supabase
          .from("quiz_attempts")
          .insert(attemptPayload)
          .select("id")
          .single();

        if (attemptError) throw attemptError;

        const answerRows = questions.map((question) => {
          const selected = normalizeAnswer(answers[question.id]);
          const correct = getCorrectAnswer(question);

          return {
            attempt_id: attempt.id,
            question_id: question.id,
            selected_answer: selected || null,
            is_correct: Boolean(selected && correct && selected === correct),
          };
        });

        const { error: answersError } = await supabase
          .from("quiz_answers")
          .insert(answerRows);

        if (answersError) throw answersError;

        setSaveMessage(
          reason === "timeout"
            ? "Time is up. Your examination has been submitted and your result was saved."
            : "Your result has been saved successfully."
        );
      } catch (saveError) {
        savedRef.current = false;
        setSaveMessage(
          saveError?.message
            ? `Your result is displayed, but saving failed: ${saveError.message}`
            : "Your result is displayed, but we could not save it."
        );
      } finally {
        setSubmitting(false);
      }
    },
    [
      submitting,
      submitted,
      questions,
      userId,
      courseId,
      correctCount,
      mode,
      answers,
    ]
  );

  useEffect(() => {
    submitRef.current = submitQuiz;
  }, [submitQuiz]);

  const goNext = () => goToQuestion(Math.min(currentIndex + 1, questions.length - 1));
  const goPrevious = () => goToQuestion(Math.max(currentIndex - 1, 0));

  const quitQuiz = () => {
    window.clearInterval(timerRef.current);
    window.clearInterval(elapsedRef.current);
    navigate(-1);
  };

  const restartQuiz = () => {
    setAnswers({});
    setMarked([]);
    setCurrentIndex(0);
    setSubmitted(false);
    setSubmitting(false);
    setShowSubmitModal(false);
    setShowQuitModal(false);
    setSaveMessage("");
    setTimeLeft(isExamMode ? durationMinutes * 60 : 0);
    setElapsedSeconds(0);
    savedRef.current = false;
    loadQuestions();
  };

  if (loading) {
    return (
      <main className="pq-screen pq-centered">
        <div className="pq-loading-card">
          <div className="pq-logo-mark"><Sparkles size={22} /></div>
          <LoaderCircle className="pq-spinner" size={30} />
          <h2>Preparing your premium quiz</h2>
          <p>Getting your questions ready. This should only take a moment.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="pq-screen pq-centered">
        <div className="pq-error-card">
          <div className="pq-error-icon"><XCircle size={28} /></div>
          <h2>We couldn't start your quiz</h2>
          <p>{error}</p>
          <div className="pq-button-row">
            <button className="pq-btn pq-btn-primary" onClick={loadQuestions}>
              <RotateCcw size={16} /> Try again
            </button>
            <button className="pq-btn pq-btn-light" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} /> Go back
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="pq-screen pq-results-screen">
        <header className="pq-topbar">
          <button className="pq-brand" onClick={() => navigate(-1)}>
            <span className="pq-brand-icon"><Sparkles size={19} /></span>
            <span>Overmaths<span className="pq-brand-premium"> PREMIUM</span></span>
          </button>
          <span className="pq-topbar-status"><ShieldCheck size={15} /> Quiz completed</span>
        </header>

        <section className="pq-results-wrap">
          <div className="pq-results-heading">
            <span className="pq-eyebrow"><Award size={15} /> PERFORMANCE REPORT</span>
            <h1>{scorePercent >= 80 ? "Excellent work!" : scorePercent >= 50 ? "Good effort. Keep going!" : "Keep practising. You can improve!"}</h1>
            <p>Your quiz is complete. Review your performance and use the feedback to plan your next study session.</p>
          </div>

          <div className="pq-score-card">
            <div className="pq-score-ring" style={{ "--pq-score": `${scorePercent}%` }}>
              <div className="pq-score-ring-inner">
                <strong>{scorePercent}%</strong>
                <span>Score</span>
              </div>
            </div>
            <div className="pq-score-copy">
              <span className="pq-eyebrow">YOUR RESULT</span>
              <h2>{correctCount} out of {questions.length} correct</h2>
              <p>{subject}{topic && topic !== "mixed" ? ` · ${topic}` : ""}</p>
              <div className="pq-result-badges">
                <span><CheckCircle2 size={15} /> {correctCount} correct</span>
                <span><XCircle size={15} /> {incorrectCount} incorrect</span>
                <span><Clock3 size={15} /> {formatTime(elapsedSeconds)}</span>
              </div>
            </div>
          </div>

          <div className="pq-stats-grid">
            <div className="pq-stat-card"><span>Questions answered</span><strong>{answeredCount}/{questions.length}</strong><small>{progress}% completion</small></div>
            <div className="pq-stat-card"><span>Unanswered</span><strong>{unansweredCount}</strong><small>Questions left blank</small></div>
            <div className="pq-stat-card"><span>Marked for review</span><strong>{markedCount}</strong><small>Flagged questions</small></div>
            <div className="pq-stat-card"><span>Time spent</span><strong>{formatTime(elapsedSeconds)}</strong><small>Time in this session</small></div>
          </div>

          {saveMessage && (
            <div className="pq-save-message">
              {saveMessage.startsWith("Your result has been saved") || saveMessage.startsWith("Time is up")
                ? <CheckCircle2 size={18} />
                : <Lightbulb size={18} />}
              <span>{saveMessage}</span>
            </div>
          )}

          <div className="pq-review-heading">
            <div>
              <span className="pq-eyebrow">ANSWER REVIEW</span>
              <h2>Review your questions</h2>
            </div>
            <span className="pq-review-count">{questions.length} questions</span>
          </div>

          <div className="pq-review-list">
            {questions.map((question, index) => {
              const selected = normalizeAnswer(answers[question.id]);
              const correct = getCorrectAnswer(question);
              const isCorrect = Boolean(selected && correct && selected === correct);

              return (
                <article className="pq-review-item" key={question.id ?? index}>
                  <div className={`pq-review-number ${isCorrect ? "is-correct" : selected ? "is-wrong" : "is-empty"}`}>
                    {index + 1}
                  </div>
                  <div className="pq-review-body">
                    <div className="pq-review-meta">
                      <span>QUESTION {index + 1}</span>
                      <span className={isCorrect ? "pq-text-success" : selected ? "pq-text-danger" : ""}>
                        {isCorrect ? "Correct" : selected ? "Incorrect" : "Not answered"}
                      </span>
                    </div>
                    <div className="pq-review-question"><MathText text={getQuestionText(question)} /></div>
                    <div className="pq-review-answers">
                      <p>Your answer: <strong>{selected ? `${selected}. ${getOptions(question).find((option) => option.letter === selected)?.text || ""}` : "Not answered"}</strong></p>
                      {correct && (
                        <p>Correct answer: <strong>{correct}. {getOptions(question).find((option) => option.letter === correct)?.text || ""}</strong></p>
                      )}
                    </div>
                    {question.explanation && (
                      <div className="pq-explanation">
                        <Lightbulb size={16} />
                        <div><strong>Explanation</strong><p><MathText text={question.explanation} /></p></div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="pq-results-actions">
            <button className="pq-btn pq-btn-primary" onClick={() => navigate(-1)}>
              <ArrowLeft size={17} /> Back to dashboard
            </button>
            <button className="pq-btn pq-btn-light" onClick={restartQuiz}>
              <RotateCcw size={17} /> Try another quiz
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="pq-screen">
      <header className="pq-topbar">
        <button className="pq-brand" onClick={() => setShowQuitModal(true)}>
          <span className="pq-brand-icon"><Sparkles size={19} /></span>
          <span>Overmaths<span className="pq-brand-premium"> PREMIUM</span></span>
        </button>

        <div className="pq-session-title">
          <span>{courseCode || subject}</span>
          <strong>{courseName || topic || "Quiz session"}</strong>
        </div>

        <div className="pq-topbar-actions">
          <span className={`pq-mode-pill ${isExamMode ? "pq-mode-exam" : "pq-mode-practice"}`}>
            {isExamMode ? <LockKeyhole size={14} /> : <Lightbulb size={14} />}
            {isExamMode ? "Examination Mode" : "Practice Mode"}
          </span>
          {isExamMode && (
            <div className={`pq-timer ${timeLeft <= 300 ? "pq-timer-warning" : ""}`}>
              <Clock3 size={17} />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}
          <button className="pq-icon-btn" title="Toggle question palette" onClick={() => setShowPalette((value) => !value)}>
            <LayoutGrid size={18} />
          </button>
          <button className="pq-exit-btn" onClick={() => setShowQuitModal(true)}>
            <X size={16} /><span>Exit</span>
          </button>
        </div>
      </header>

      <div className="pq-progress-strip">
        <div className="pq-progress-info">
          <span>QUIZ PROGRESS</span>
          <strong>{answeredCount} of {questions.length} answered</strong>
        </div>
        <div className="pq-progress-track"><div style={{ width: `${progress}%` }} /></div>
        <strong className="pq-progress-percent">{progress}%</strong>
      </div>

      <div className={`pq-workspace ${showPalette ? "" : "pq-workspace-wide"}`}>
        <section className="pq-main-column">
          <div className="pq-question-card">
            <div className="pq-question-card-top">
              <div className="pq-question-tags">
                <span className="pq-question-number">QUESTION {currentIndex + 1} <span>OF {questions.length}</span></span>
                {currentQuestion?.difficulty && <span className="pq-difficulty">{currentQuestion.difficulty}</span>}
              </div>
              <button className={`pq-mark-btn ${currentQuestion && marked.includes(currentQuestion.id) ? "is-marked" : ""}`} onClick={toggleMark}>
                <Flag size={16} />
                {currentQuestion && marked.includes(currentQuestion.id) ? "Marked for review" : "Mark for review"}
              </button>
            </div>

            <div className="pq-question-content">
              <h1><MathText text={getQuestionText(currentQuestion)} /></h1>
              {currentQuestion?.image_url && (
                <img className="pq-question-image" src={currentQuestion.image_url} alt="Question illustration" />
              )}
            </div>

            <div className="pq-options">
              {getOptions(currentQuestion).map((option) => {
                const selected = currentAnswer === option.letter;
                const practiceAnswered = !isExamMode && currentAnswer !== "";
                const correct = getCorrectAnswer(currentQuestion);
                const showCorrect = practiceAnswered && correct === option.letter;
                const showWrong = practiceAnswered && selected && correct !== option.letter;

                return (
                  <button
                    key={option.letter}
                    className={`pq-option ${selected ? "is-selected" : ""} ${showCorrect ? "is-correct" : ""} ${showWrong ? "is-wrong" : ""}`}
                    onClick={() => chooseAnswer(option.letter)}
                    disabled={!isExamMode && currentAnswer !== ""}
                  >
                    <span className="pq-option-letter">{option.letter}</span>
                    <span className="pq-option-text"><MathText text={String(option.text ?? "")} /></span>
                    {showCorrect && <CheckCircle2 className="pq-option-status" size={19} />}
                    {showWrong && <XCircle className="pq-option-status" size={19} />}
                    {selected && !showCorrect && !showWrong && <Check className="pq-option-status" size={19} />}
                  </button>
                );
              })}
            </div>

            {!isExamMode && currentAnswer && (
              <div className={`pq-feedback ${normalizeAnswer(currentAnswer) === getCorrectAnswer(currentQuestion) ? "pq-feedback-success" : "pq-feedback-error"}`}>
                {normalizeAnswer(currentAnswer) === getCorrectAnswer(currentQuestion)
                  ? <CheckCircle2 size={19} />
                  : <XCircle size={19} />}
                <div>
                  <strong>{normalizeAnswer(currentAnswer) === getCorrectAnswer(currentQuestion) ? "Correct answer" : "Not quite. Review the correct answer."}</strong>
                  {currentQuestion?.explanation && <p><MathText text={currentQuestion.explanation} /></p>}
                </div>
              </div>
            )}

            <div className="pq-question-footer">
              <button className="pq-btn pq-btn-light" onClick={goPrevious} disabled={currentIndex === 0}>
                <ArrowLeft size={17} /> Previous
              </button>
              <div className="pq-footer-middle">
                <span>{currentIndex + 1} / {questions.length}</span>
                <button className="pq-icon-btn" title="Calculator" onClick={() => setShowCalculator((value) => !value)}>
                  <Calculator size={18} />
                </button>
              </div>
              {currentIndex < questions.length - 1 ? (
                <button className="pq-btn pq-btn-primary" onClick={goNext}>
                  Next question <ArrowRight size={17} />
                </button>
              ) : (
                <button className="pq-btn pq-btn-primary" onClick={() => setShowSubmitModal(true)}>
                  <Send size={16} /> Submit quiz
                </button>
              )}
            </div>
          </div>

          <div className="pq-bottom-note">
            <ShieldCheck size={16} />
            {isExamMode
              ? "Your answers are kept in this session until you submit your examination."
              : "Practice mode gives you feedback after you select an answer."}
          </div>
        </section>

        {showPalette && (
          <aside className="pq-sidebar">
            <div className="pq-sidebar-card">
              <div className="pq-sidebar-heading">
                <div><LayoutGrid size={18} /><h2>Question palette</h2></div>
                <span>{questions.length}</span>
              </div>
              <p className="pq-sidebar-hint">Select a question to move directly to it.</p>
              <div className="pq-question-grid">
                {questions.map((question, index) => {
                  const isAnswered = answers[question.id] != null && answers[question.id] !== "";
                  const isMarked = marked.includes(question.id);

                  return (
                    <button
                      key={question.id ?? index}
                      onClick={() => goToQuestion(index)}
                      className={`pq-palette-number ${index === currentIndex ? "is-current" : ""} ${isAnswered ? "is-answered" : ""} ${isMarked ? "is-marked" : ""}`}
                      title={`Question ${index + 1}${isAnswered ? ", answered" : ", unanswered"}${isMarked ? ", marked for review" : ""}`}
                    >
                      {index + 1}
                      {isMarked && <span className="pq-palette-flag" />}
                    </button>
                  );
                })}
              </div>
              <div className="pq-palette-legend">
                <span><i className="legend-current" /> Current</span>
                <span><i className="legend-answered" /> Answered</span>
                <span><i className="legend-marked" /> Review</span>
                <span><i className="legend-empty" /> Unanswered</span>
              </div>
            </div>

            <div className="pq-sidebar-card pq-summary-card">
              <div className="pq-sidebar-heading">
                <div><ListChecks size={18} /><h2>Session summary</h2></div>
              </div>
              <div className="pq-summary-row"><span>Answered</span><strong>{answeredCount}</strong></div>
              <div className="pq-summary-row"><span>Unanswered</span><strong>{unansweredCount}</strong></div>
              <div className="pq-summary-row"><span>Marked for review</span><strong>{markedCount}</strong></div>
              <div className="pq-summary-mini-track"><div style={{ width: `${progress}%` }} /></div>
              <p className="pq-summary-caption">{progress}% of questions answered</p>
              <button className="pq-btn pq-btn-primary pq-submit-wide" onClick={() => setShowSubmitModal(true)}>
                <Send size={16} /> Final submission
              </button>
            </div>

            <div className="pq-security-note">
              <ShieldCheck size={18} />
              <div><strong>{isExamMode ? "Examination in progress" : "Practice session"}</strong><p>{isExamMode ? "Answers are not revealed before final submission." : "Feedback appears after you answer a question."}</p></div>
            </div>
          </aside>
        )}
      </div>

      {showCalculator && (
        <div className="pq-calculator">
          <div className="pq-calculator-heading"><span><Calculator size={17} /> Calculator</span><button onClick={() => setShowCalculator(false)}><X size={17} /></button></div>
          <input
            value={calculatorValue}
            onChange={(event) => setCalculatorValue(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && evaluateCalculator()}
            placeholder="e.g. (25 + 5) / 2"
            aria-label="Calculator expression"
          />
          <div className="pq-calculator-actions">
            <button className="pq-btn pq-btn-light" onClick={() => { setCalculatorValue(""); setCalculatorResult(""); }}>Clear</button>
            <button className="pq-btn pq-btn-primary" onClick={evaluateCalculator}>= Calculate</button>
          </div>
          {calculatorResult && <div className="pq-calculator-result">{calculatorResult}</div>}
        </div>
      )}

      {showSubmitModal && (
        <div className="pq-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowSubmitModal(false)}>
          <div className="pq-modal" role="dialog" aria-modal="true" aria-labelledby="pq-submit-title">
            <div className="pq-modal-icon"><Send size={22} /></div>
            <button className="pq-modal-close" onClick={() => setShowSubmitModal(false)} aria-label="Close"><X size={19} /></button>
            <h2 id="pq-submit-title">Submit your quiz?</h2>
            <p>{isExamMode ? "Once you submit, your examination will end and the results will be shown." : "Finish this quiz and view your performance report."}</p>
            <div className="pq-confirm-stats">
              <div><span>Answered</span><strong>{answeredCount}</strong></div>
              <div><span>Unanswered</span><strong>{unansweredCount}</strong></div>
              <div><span>Marked</span><strong>{markedCount}</strong></div>
            </div>
            {unansweredCount > 0 && (
              <p className="pq-modal-warning"><Lightbulb size={16} /> You still have {unansweredCount} unanswered question{unansweredCount === 1 ? "" : "s"}.</p>
            )}
            <div className="pq-modal-actions">
              <button className="pq-btn pq-btn-light" onClick={() => setShowSubmitModal(false)}>Keep working</button>
              <button className="pq-btn pq-btn-primary" onClick={() => submitQuiz("manual")} disabled={submitting}>
                {submitting ? <LoaderCircle className="pq-spinner" size={16} /> : <Send size={16} />}
                Confirm submission
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuitModal && (
        <div className="pq-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowQuitModal(false)}>
          <div className="pq-modal" role="dialog" aria-modal="true" aria-labelledby="pq-quit-title">
            <div className="pq-modal-icon pq-modal-icon-warning"><X size={22} /></div>
            <button className="pq-modal-close" onClick={() => setShowQuitModal(false)} aria-label="Close"><X size={19} /></button>
            <h2 id="pq-quit-title">Leave this quiz?</h2>
            <p>Your current answers may not be saved if you leave before submitting.</p>
            <div className="pq-modal-actions">
              <button className="pq-btn pq-btn-light" onClick={() => setShowQuitModal(false)}>Stay here</button>
              <button className="pq-btn pq-btn-danger" onClick={quitQuiz}>Exit quiz</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
