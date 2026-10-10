
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import MathText from "../components/MathText";
import "./Quiz.css";

const API_URL = "https://overmaths.onrender.com";

const LETTERS = ["A", "B", "C", "D"];

const normalizeAnswer = (answer) => {
  if (answer == null) return "";
  const value = String(answer).trim().toUpperCase();
  const match = value.match(/^[A-D]$/);
  if (match) return value;

  const optionMatch = value.match(/^OPTION\s+([A-D])$/);
  if (optionMatch) return optionMatch[1];

  return value;
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
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
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
    text: question?.[`option_${letter.toLowerCase()}`] ?? "",
  }));

export default function Quiz() {
  const location = useLocation();
  const navigate = useNavigate();

  const navigationState = location.state || {};

  const {
    subject = "",
    courseId = null,
    courseCode = "",
    courseName = "",
    topic = "mixed",
    questionCount = 10,
    mode = "Practice Mode",
    timePerQuestion = 30,
    learningRoute = "",
    examType = "",
  } = navigationState;

  const isExamMode = /exam|examination|test/i.test(mode);

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(Number(timePerQuestion) || 30);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState("");
  const [calculatorResult, setCalculatorResult] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [userId, setUserId] = useState(null);

  const timerRef = useRef(null);
  const sessionTimerRef = useRef(null);
  const savedRef = useRef(false);

  const currentQuestion = questions[currentIndex];

  const answeredCount = Object.keys(answers).length;
  const reviewCount = markedForReview.length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);
  const progress = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  const correctCount = useMemo(
    () =>
      questions.reduce((count, question, index) => {
        const selected = answers[index];
        return selected && selected === getCorrectAnswer(question)
          ? count + 1
          : count;
      }, 0),
    [questions, answers]
  );

  const incorrectCount = Math.max(0, answeredCount - correctCount);
  const percentage = questions.length
    ? Math.round((correctCount / questions.length) * 100)
    : 0;

  const stopTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    timerRef.current = null;
    sessionTimerRef.current = null;
  }, []);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError("");
    setSubmitted(false);
    setAnswers({});
    setMarkedForReview([]);
    setCurrentIndex(0);
    setSessionSeconds(0);
    setSaveMessage("");
    savedRef.current = false;

    try {
      const params = new URLSearchParams();
      if (courseId) params.set("course_id", String(courseId));
      else if (subject) params.set("subject", subject);

      if (topic && topic.toLowerCase() !== "mixed") {
        params.set("topic", topic);
      }

      params.set("limit", String(Number(questionCount) || 10));

      const response = await fetch(
        `${API_URL}/api/questions?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("We couldn't load the questions. Please try again.");
      }

      const data = await response.json();
      const list = Array.isArray(data)
        ? data
        : data.questions || data.data || [];

      if (!list.length) {
        throw new Error(
          "No questions were found for this selection. Try another topic or subject."
        );
      }

      setQuestions(shuffle(list));
      setTimeLeft(Number(timePerQuestion) || 30);
    } catch (err) {
      setError(err.message || "Something went wrong while loading questions.");
    } finally {
      setLoading(false);
    }
  }, [courseId, subject, topic, questionCount, timePerQuestion]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (active) setUserId(data?.user?.id || null);
      } catch {
        if (active) setUserId(null);
      }
    };

    loadUser();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading || submitted || !questions.length) return undefined;

    sessionTimerRef.current = setInterval(() => {
      setSessionSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [loading, submitted, questions.length]);

  useEffect(() => {
    if (loading || submitted || !questions.length || !isExamMode) {
      return undefined;
    }

    setTimeLeft(Number(timePerQuestion) || 30);

    timerRef.current = setInterval(() => {
      setTimeLeft((remaining) => {
        if (remaining <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;

          setCurrentIndex((index) => {
            if (index < questions.length - 1) return index + 1;

            setSubmitted(true);
            return index;
          });

          return 0;
        }

        return remaining - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, loading, submitted, questions.length, isExamMode, timePerQuestion]);

  useEffect(() => {
    if (submitted) stopTimers();
  }, [submitted, stopTimers]);

  const chooseAnswer = (letter) => {
    if (submitted) return;

    setAnswers((previous) => ({ ...previous, [currentIndex]: letter }));
  };

  const goToQuestion = (index) => {
    if (index < 0 || index >= questions.length || submitted) return;
    setCurrentIndex(index);
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((index) => index + 1);
    } else if (isExamMode) {
      setShowSubmitModal(true);
    } else {
      setSubmitted(true);
    }
  };

  const goPrevious = () => {
    setCurrentIndex((index) => Math.max(0, index - 1));
  };

  const skipQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((index) => index + 1);
    } else {
      setShowSubmitModal(true);
    }
  };

  const toggleReview = () => {
    setMarkedForReview((previous) =>
      previous.includes(currentIndex)
        ? previous.filter((index) => index !== currentIndex)
        : [...previous, currentIndex]
    );
  };

  const submitQuiz = async () => {
    setShowSubmitModal(false);
    setSubmitted(true);
    stopTimers();

    if (savedRef.current) return;
    savedRef.current = true;

    if (!userId || !questions.length) {
      setSaveMessage(
        "Your result is shown below. Sign in to save quiz attempts to your account."
      );
      return;
    }

    setSaving(true);

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

      const answerRows = questions.map((question, index) => {
        const selected = answers[index] || null;
        return {
          attempt_id: attempt.id,
          question_id: question.id,
          selected_answer: selected,
          is_correct: Boolean(
            selected && selected === getCorrectAnswer(question)
          ),
        };
      });

      if (answerRows.length) {
        const { error: answersError } = await supabase
          .from("quiz_answers")
          .insert(answerRows);

        if (answersError) throw answersError;
      }

      setSaveMessage("Your result has been saved successfully.");
    } catch (err) {
      console.error("Unable to save quiz attempt:", err);
      setSaveMessage(
        "Your result is available, but it couldn't be saved. Please check your connection and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const evaluateCalculator = () => {
    const expression = calculatorValue.trim();

    // Only allow basic arithmetic characters. This is not a full math parser.
    if (!expression || !/^[0-9+\-*/().%\s]+$/.test(expression)) {
      setCalculatorResult("Invalid expression");
      return;
    }

    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expression})`)();

      if (!Number.isFinite(result)) throw new Error("Invalid result");
      setCalculatorResult(String(Number(result.toFixed(8))));
    } catch {
      setCalculatorResult("Check expression");
    }
  };

  const calculatorPress = (value) => {
    if (value === "AC") {
      setCalculatorValue("");
      setCalculatorResult("");
    } else if (value === "DEL") {
      setCalculatorValue((previous) => previous.slice(0, -1));
    } else if (value === "=") {
      evaluateCalculator();
    } else {
      setCalculatorValue((previous) => previous + value);
    }
  };

  const backToPractice = () => {
    stopTimers();
    navigate(-1);
  };

  if (loading) {
    return (
      <main className="om-quiz-page om-state-page">
        <div className="om-state-card">
          <div className="om-loader" />
          <p className="om-eyebrow">OVERMATHS QUIZ</p>
          <h1>Preparing your session</h1>
          <p>Loading your questions and getting everything ready.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="om-quiz-page om-state-page">
        <div className="om-state-card">
          <div className="om-state-icon om-error-icon">!</div>
          <p className="om-eyebrow">QUIZ UNAVAILABLE</p>
          <h1>We couldn't load your questions</h1>
          <p>{error}</p>
          <div className="om-state-actions">
            <button className="om-btn om-btn-primary" onClick={fetchQuestions}>
              Try again
            </button>
            <button className="om-btn om-btn-secondary" onClick={backToPractice}>
              Back to practice
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="om-quiz-page om-results-page">
        <header className="om-topbar">
          <button className="om-brand" onClick={backToPractice}>
            <span className="om-brand-mark">O</span>
            <span>Over<span>maths</span></span>
          </button>
          <div className="om-topbar-right">
            <span className="om-session-label">Quiz completed</span>
          </div>
        </header>

        <section className="om-results-wrap">
          <div className="om-results-hero">
            <div>
              <span className="om-status-pill">SESSION COMPLETE</span>
              <h1>{percentage >= 80 ? "Excellent work!" : percentage >= 50 ? "Good effort!" : "Keep practising!"}</h1>
              <p>
                You scored {correctCount} out of {questions.length} questions correctly.
              </p>
            </div>
            <div className="om-score-ring" style={{ "--score": `${percentage}%` }}>
              <div>
                <strong>{percentage}%</strong>
                <span>Your score</span>
              </div>
            </div>
          </div>

          <div className="om-stat-grid">
            <div className="om-stat-card">
              <span className="om-stat-dot om-dot-green" />
              <strong>{correctCount}</strong>
              <span>Correct</span>
            </div>
            <div className="om-stat-card">
              <span className="om-stat-dot om-dot-red" />
              <strong>{incorrectCount}</strong>
              <span>Incorrect</span>
            </div>
            <div className="om-stat-card">
              <span className="om-stat-dot om-dot-blue" />
              <strong>{answeredCount}</strong>
              <span>Answered</span>
            </div>
            <div className="om-stat-card">
              <span className="om-stat-dot om-dot-grey" />
              <strong>{unansweredCount}</strong>
              <span>Skipped</span>
            </div>
          </div>

          {saveMessage && (
            <p className="om-save-message">
              {saving ? "Saving your result..." : saveMessage}
            </p>
          )}

          <section className="om-review-card">
            <div className="om-section-heading">
              <div>
                <h2>Question review</h2>
                <p>Review your answers and explanations.</p>
              </div>
              <span className="om-review-total">{questions.length} questions</span>
            </div>

            <div className="om-review-list">
              {questions.map((question, index) => {
                const selected = answers[index];
                const correct = getCorrectAnswer(question);
                const isCorrect = selected && selected === correct;

                return (
                  <details className="om-review-item" key={question.id ?? index}>
                    <summary>
                      <span className="om-review-number">Q{index + 1}</span>
                      <span className="om-review-question">
                        <MathText text={question.question_text || "Question"} />
                      </span>
                      <span
                        className={`om-review-status ${
                          !selected ? "is-skipped" : isCorrect ? "is-correct" : "is-wrong"
                        }`}
                      >
                        {!selected ? "Skipped" : isCorrect ? "Correct" : "Incorrect"}
                      </span>
                      <span className="om-review-chevron">⌄</span>
                    </summary>
                    <div className="om-review-detail">
                      {getOptions(question).map((option) => (
                        <div
                          key={option.letter}
                          className={[
                            "om-review-option",
                            option.letter === correct ? "is-answer" : "",
                            option.letter === selected && !isCorrect ? "is-user-wrong" : "",
                          ].join(" ")}
                        >
                          <strong>{option.letter}</strong>
                          <span><MathText text={String(option.text)} /></span>
                          {option.letter === correct && <span className="om-option-note">Correct answer</span>}
                          {option.letter === selected && !isCorrect && <span className="om-option-note">Your answer</span>}
                        </div>
                      ))}
                      {question.explanation && (
                        <div className="om-explanation">
                          <strong>Explanation</strong>
                          <p><MathText text={question.explanation} /></p>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </section>

          <div className="om-results-actions">
            <button className="om-btn om-btn-secondary" onClick={backToPractice}>
              Back to practice
            </button>
            <button className="om-btn om-btn-primary" onClick={fetchQuestions}>
              Try another quiz <span>→</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="om-quiz-page">
      <header className="om-topbar">
        <button className="om-brand" onClick={backToPractice} aria-label="Back">
          <span className="om-brand-mark">O</span>
          <span>Over<span>maths</span></span>
        </button>

        <div className="om-breadcrumb">
          <span>{subject || courseName || courseCode || "Practice"}</span>
          {topic && topic.toLowerCase() !== "mixed" && (
            <>
              <span className="om-breadcrumb-dot">•</span>
              <span>{topic}</span>
            </>
          )}
          <span className="om-mode-pill">{mode}</span>
        </div>

        <div className="om-topbar-right">
          {isExamMode && (
            <div className={`om-timer ${timeLeft <= 10 ? "is-urgent" : ""}`}>
              <span className="om-timer-icon">◷</span>
              <strong>{formatTime(timeLeft)}</strong>
            </div>
          )}
          <button className="om-exit-btn" onClick={() => setShowQuitModal(true)}>
            Exit quiz <span>×</span>
          </button>
        </div>
      </header>

      <div className="om-quiz-layout">
        <section className="om-question-column">
          <div className="om-question-card">
            <div className="om-question-meta">
              <div className="om-subject-chip">
                <span className="om-chip-dot" />
                {subject || courseName || "Quiz"}
              </div>
              <span className="om-question-count">
                Question <strong>{currentIndex + 1}</strong> of {questions.length}
              </span>
            </div>

            <div className="om-progress-track">
              <div
                className="om-progress-fill"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            <div className="om-question-body">
              <p className="om-question-kicker">QUESTION {String(currentIndex + 1).padStart(2, "0")}</p>
              <h1 className="om-question-title">
                <MathText text={currentQuestion?.question_text || ""} />
              </h1>

              {currentQuestion?.image_url && (
                <div className="om-question-image-wrap">
                  <img
                    src={currentQuestion.image_url}
                    alt="Question illustration"
                    className="om-question-image"
                  />
                </div>
              )}

              <div className="om-options-list">
                {getOptions(currentQuestion).map((option) => {
                  const selected = answers[currentIndex] === option.letter;
                  const correct = getCorrectAnswer(currentQuestion);
                  const showPracticeFeedback = !isExamMode && Boolean(answers[currentIndex]);
                  const isCorrectOption =
                    showPracticeFeedback && option.letter === correct;
                  const isWrongSelection =
                    showPracticeFeedback && selected && option.letter !== correct;

                  return (
                    <button
                      type="button"
                      key={option.letter}
                      className={[
                        "om-option",
                        selected ? "is-selected" : "",
                        isCorrectOption ? "is-correct" : "",
                        isWrongSelection ? "is-wrong" : "",
                      ].join(" ")}
                      onClick={() => chooseAnswer(option.letter)}
                      disabled={!isExamMode && Boolean(answers[currentIndex])}
                    >
                      <span className="om-option-letter">{option.letter}</span>
                      <span className="om-option-text">
                        <MathText text={String(option.text)} />
                      </span>
                      {selected && <span className="om-option-check">✓</span>}
                    </button>
                  );
                })}
              </div>

              {!isExamMode && answers[currentIndex] && (
                <div
                  className={`om-feedback ${
                    answers[currentIndex] === getCorrectAnswer(currentQuestion)
                      ? "is-success"
                      : "is-error"
                  }`}
                >
                  <span className="om-feedback-icon">
                    {answers[currentIndex] === getCorrectAnswer(currentQuestion) ? "✓" : "!"}
                  </span>
                  <div>
                    <strong>
                      {answers[currentIndex] === getCorrectAnswer(currentQuestion)
                        ? "Correct answer!"
                        : "Not quite. Keep learning!"}
                    </strong>
                    {currentQuestion?.explanation && (
                      <p><MathText text={currentQuestion.explanation} /></p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="om-question-footer">
              <button
                className="om-btn om-btn-secondary"
                onClick={goPrevious}
                disabled={currentIndex === 0}
              >
                <span>←</span> Previous
              </button>

              <div className="om-footer-middle">
                <button
                  className={`om-icon-btn ${markedForReview.includes(currentIndex) ? "is-active" : ""}`}
                  onClick={toggleReview}
                  title="Mark for review"
                >
                  ⚑ <span>{markedForReview.includes(currentIndex) ? "Marked" : "Review later"}</span>
                </button>
                <button
                  className="om-icon-btn"
                  onClick={() => setShowCalculator(true)}
                  title="Open calculator"
                >
                  ▦ <span>Calculator</span>
                </button>
              </div>

              <div className="om-footer-actions">
                {isExamMode && (
                  <button className="om-btn om-btn-quiet" onClick={skipQuestion}>
                    Skip
                  </button>
                )}
                <button className="om-btn om-btn-primary" onClick={goNext}>
                  {currentIndex === questions.length - 1
                    ? isExamMode
                      ? "Submit quiz"
                      : "View results"
                    : "Next question"}
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>

          <div className="om-bottom-note">
            <span className="om-note-icon">✦</span>
            <span>Small steps every day lead to big results.</span>
            <span className="om-note-progress">{progress}% answered</span>
          </div>
        </section>

        <aside className="om-navigator-column">
          <section className="om-navigator-card">
            <div className="om-section-heading">
              <div>
                <h2>Question navigator</h2>
                <p>Move between questions anytime.</p>
              </div>
              <span className="om-navigator-count">
                {currentIndex + 1}/{questions.length}
              </span>
            </div>

            <div className="om-legend">
              <span><i className="legend-current" />Current</span>
              <span><i className="legend-answered" />Answered</span>
              <span><i className="legend-review" />Review</span>
              <span><i className="legend-empty" />Unanswered</span>
            </div>

            <div className="om-question-grid">
              {questions.map((question, index) => {
                const isCurrent = index === currentIndex;
                const isAnswered = Boolean(answers[index]);
                const isReview = markedForReview.includes(index);

                return (
                  <button
                    key={question.id ?? index}
                    className={[
                      "om-question-number",
                      isCurrent ? "is-current" : "",
                      !isCurrent && isAnswered ? "is-answered" : "",
                      isReview ? "is-review" : "",
                    ].join(" ")}
                    onClick={() => goToQuestion(index)}
                    aria-label={`Go to question ${index + 1}`}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {index + 1}
                    {isAnswered && !isCurrent && <span className="om-number-check">✓</span>}
                  </button>
                );
              })}
            </div>

            <div className="om-navigator-divider" />

            <div className="om-section-heading om-summary-heading">
              <h3>Session summary</h3>
              <span>{questions.length} total</span>
            </div>

            <div className="om-summary-list">
              <div>
                <span><i className="legend-answered" />Answered</span>
                <strong>{answeredCount}</strong>
              </div>
              <div>
                <span><i className="legend-review" />Marked for review</span>
                <strong>{reviewCount}</strong>
              </div>
              <div>
                <span><i className="legend-empty" />Unanswered</span>
                <strong>{unansweredCount}</strong>
              </div>
            </div>

            <div className="om-sidebar-progress">
              <div className="om-sidebar-progress-label">
                <span>Completion</span>
                <strong>{progress}%</strong>
              </div>
              <div className="om-progress-track">
                <div className="om-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {isExamMode && (
              <button
                className="om-btn om-btn-submit"
                onClick={() => setShowSubmitModal(true)}
              >
                Finish and submit <span>→</span>
              </button>
            )}
          </section>
        </aside>
      </div>

      {showQuitModal && (
        <div className="om-modal-backdrop" role="presentation">
          <section className="om-modal" role="dialog" aria-modal="true" aria-labelledby="om-quit-title">
            <button className="om-modal-close" onClick={() => setShowQuitModal(false)} aria-label="Close">×</button>
            <div className="om-modal-icon">↩</div>
            <h2 id="om-quit-title">Leave this quiz?</h2>
            <p>Your current progress may be lost if you leave before finishing.</p>
            <div className="om-modal-actions">
              <button className="om-btn om-btn-secondary" onClick={() => setShowQuitModal(false)}>
                Stay here
              </button>
              <button className="om-btn om-btn-primary" onClick={backToPractice}>
                Leave quiz
              </button>
            </div>
          </section>
        </div>
      )}

      {showSubmitModal && (
        <div className="om-modal-backdrop" role="presentation">
          <section className="om-modal" role="dialog" aria-modal="true" aria-labelledby="om-submit-title">
            <button className="om-modal-close" onClick={() => setShowSubmitModal(false)} aria-label="Close">×</button>
            <div className="om-modal-icon">✓</div>
            <h2 id="om-submit-title">Submit your quiz?</h2>
            <p>
              You've answered {answeredCount} of {questions.length} questions.
              {unansweredCount > 0 ? ` ${unansweredCount} question(s) remain unanswered.` : ""}
            </p>
            <div className="om-modal-actions">
              <button className="om-btn om-btn-secondary" onClick={() => setShowSubmitModal(false)}>
                Keep checking
              </button>
              <button className="om-btn om-btn-primary" onClick={submitQuiz}>
                Submit quiz
              </button>
            </div>
          </section>
        </div>
      )}

      {showCalculator && (
        <div className="om-modal-backdrop om-calculator-backdrop" role="presentation" onClick={() => setShowCalculator(false)}>
          <section className="om-calculator" role="dialog" aria-modal="true" aria-label="Calculator" onClick={(event) => event.stopPropagation()}>
            <div className="om-calculator-header">
              <div>
                <span className="om-calculator-symbol">▦</span>
                <h2>Calculator</h2>
              </div>
              <button onClick={() => setShowCalculator(false)} aria-label="Close calculator">×</button>
            </div>

            <div className="om-calculator-screen">
              <div className="om-calculator-expression">{calculatorValue || "Enter a calculation"}</div>
              <strong>{calculatorResult || " "}</strong>
            </div>

            <div className="om-calculator-keys">
              {["AC", "DEL", "%", "/", "7", "8", "9", "*", "4", "5", "6", "-", "1", "2", "3", "+", "(", "0", ")", ".", "="].map((key) => (
                <button
                  key={key}
                  className={["/", "*", "-", "+", "="].includes(key) ? "is-operator" : key === "AC" ? "is-clear" : ""}
                  onClick={() => calculatorPress(key === "DEL" ? "DEL" : key)}
                >
                  {key === "DEL" ? "⌫" : key === "*" ? "×" : key === "/" ? "÷" : key}
                </button>
              ))}
            </div>
            <p className="om-calculator-footnote">Use the calculator to check your working.</p>
          </section>
        </div>
      )}
    </main>
  );
}
