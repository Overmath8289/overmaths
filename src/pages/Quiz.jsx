import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import MathText from "../components/MathText";
import "./Quiz.css";

const API_URL = "https://overmaths.onrender.com";

const TIMEOUT_ANSWER = "__TIMEOUT__";

function normalizeAnswer(answer) {
  if (!answer) return null;

  const value = String(answer).trim().toLowerCase();

  if (
    value === "a" ||
    value === "option a" ||
    value === "option_a" ||
    value === "option-a"
  ) {
    return "A";
  }

  if (
    value === "b" ||
    value === "option b" ||
    value === "option_b" ||
    value === "option-b"
  ) {
    return "B";
  }

  if (
    value === "c" ||
    value === "option c" ||
    value === "option_c" ||
    value === "option-c"
  ) {
    return "C";
  }

  if (
    value === "d" ||
    value === "option d" ||
    value === "option_d" ||
    value === "option-d"
  ) {
    return "D";
  }

  return null;
}

function isAnswerCorrect(selectedAnswer, correctAnswer) {
  const selected = normalizeAnswer(selectedAnswer);
  const correct = normalizeAnswer(correctAnswer);

  return Boolean(selected && correct && selected === correct);
}

function shuffleArray(array) {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[i],
    ];
  }

  return shuffled;
}

function buildOptions(question) {
  return [
    {
      key: "A",
      text: question.option_a ?? "",
    },
    {
      key: "B",
      text: question.option_b ?? "",
    },
    {
      key: "C",
      text: question.option_c ?? "",
    },
    {
      key: "D",
      text: question.option_d ?? "",
    },
  ];
}

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

  const isExaminationMode =
    String(mode).toLowerCase().includes("examination") ||
    String(mode).toLowerCase().includes("exam");

  const parsedQuestionCount = Math.max(
    1,
    Math.min(Number(questionCount) || 10, 100)
  );

  const parsedTimePerQuestion = Math.max(
    5,
    Number(timePerQuestion) || 30
  );

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);

  /*
   * answers:
   *
   * {
   *   [questionId]: "A" | "B" | "C" | "D" | null | "__TIMEOUT__"
   * }
   */
  const [answers, setAnswers] = useState({});

  const [answerTimes, setAnswerTimes] = useState({});

  const answersRef = useRef({});
  const answerTimesRef = useRef({});

  const [timeLeft, setTimeLeft] = useState(parsedTimePerQuestion);

  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState("");
  const [sessionFinished, setSessionFinished] = useState(false);

  const [finalScore, setFinalScore] = useState(0);

  const [user, setUser] = useState(null);

  const [saving, setSaving] = useState(false);

  const currentQuestion = questions[currentIndex];

  /*
   * Keep React state and refs synchronized.
   * The refs are important because timer callbacks can otherwise
   * read stale React state.
   */
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    answerTimesRef.current = answerTimes;
  }, [answerTimes]);

  /*
   * Load authenticated user.
   */
  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (mounted) {
        setUser(authUser || null);
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Load questions from the production Flask API.
   */
  useEffect(() => {
    let mounted = true;

    async function loadQuestions() {
      setLoading(true);
      setLoadingError("");

      try {
        const params = new URLSearchParams();

        if (courseId) {
          params.set("course_id", String(courseId));
        } else if (subject) {
          params.set("subject", subject);
        } else {
          throw new Error("No subject or course was selected.");
        }

        if (topic && topic !== "mixed") {
          params.set("topic", topic);
        }

        params.set("limit", String(parsedQuestionCount));

        const response = await fetch(
          `${API_URL}/api/questions?${params.toString()}`
        );

        if (!response.ok) {
          let message = "Unable to load questions.";

          try {
            const errorData = await response.json();

            if (errorData?.error) {
              message = errorData.error;
            }
          } catch {
            // Keep default message.
          }

          throw new Error(message);
        }

        const data = await response.json();

        const loadedQuestions = Array.isArray(data?.questions)
          ? data.questions
          : [];

        if (!loadedQuestions.length) {
          throw new Error(
            "No questions are available for this selection yet."
          );
        }

        /*
         * Shuffle only after receiving the questions.
         * This keeps the backend simple while giving the student
         * a fresh question order.
         */
        const shuffledQuestions = shuffleArray(loadedQuestions).slice(
          0,
          parsedQuestionCount
        );

        if (mounted) {
          setQuestions(shuffledQuestions);
          setCurrentIndex(0);
        }
      } catch (error) {
        console.error("QUIZ LOAD ERROR:", error);

        if (mounted) {
          setLoadingError(
            error?.message ||
              "Something went wrong while loading the questions."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadQuestions();

    return () => {
      mounted = false;
    };
  }, [courseId, subject, topic, parsedQuestionCount]);

  /*
   * Reset timer whenever the question changes.
   */
  useEffect(() => {
    if (!currentQuestion || sessionFinished) return;

    setTimeLeft(parsedTimePerQuestion);
    setShowFeedback(false);
    setFeedbackType("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [currentIndex, currentQuestion?.id, parsedTimePerQuestion, sessionFinished]);

  /*
   * Timer.
   *
   * When time reaches zero:
   * - record the question as unanswered
   * - award zero
   * - Practice Mode shows timeout feedback
   * - Examination Mode automatically moves to the next question
   */
  useEffect(() => {
    if (
      !currentQuestion ||
      sessionFinished ||
      showFeedback
    ) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((previousTime) => {
        if (previousTime <= 1) {
          window.clearInterval(timer);

          handleTimeout(currentQuestion);

          return 0;
        }

        return previousTime - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    currentQuestion?.id,
    sessionFinished,
    showFeedback,
    parsedTimePerQuestion,
  ]);

  /*
   * Record an answer in both state and refs.
   */
  function saveAnswer(questionId, selectedAnswer, secondsUsed) {
    const nextAnswers = {
      ...answersRef.current,
      [questionId]: selectedAnswer,
    };

    const nextAnswerTimes = {
      ...answerTimesRef.current,
      [questionId]: secondsUsed,
    };

    answersRef.current = nextAnswers;
    answerTimesRef.current = nextAnswerTimes;

    setAnswers(nextAnswers);
    setAnswerTimes(nextAnswerTimes);
  }

  /*
   * Handle normal student answer.
   */
  function handleAnswer(selectedAnswer) {
    if (!currentQuestion || sessionFinished) return;

    /*
     * In Practice Mode, once an answer has been selected,
     * don't allow another selection for the same question.
     */
    if (!isExaminationMode && answersRef.current[currentQuestion.id]) {
      return;
    }

    const secondsUsed = Math.max(
      0,
      parsedTimePerQuestion - timeLeft
    );

    saveAnswer(
      currentQuestion.id,
      selectedAnswer,
      secondsUsed
    );

    if (!isExaminationMode) {
      const correct = isAnswerCorrect(
        selectedAnswer,
        currentQuestion.correction_answer
      );

      setFeedbackType(correct ? "correct" : "wrong");
      setShowFeedback(true);
    }
  }

  /*
   * Handle timeout.
   */
  function handleTimeout(question) {
    if (!question || sessionFinished) return;

    /*
     * If an answer already exists, don't overwrite it.
     */
    if (answersRef.current[question.id]) {
      return;
    }

    saveAnswer(
      question.id,
      TIMEOUT_ANSWER,
      parsedTimePerQuestion
    );

    if (isExaminationMode) {
      /*
       * Examination Mode should continue automatically.
       */
      if (currentIndex >= questions.length - 1) {
        finishSession({
          ...answersRef.current,
          [question.id]: TIMEOUT_ANSWER,
        });
      } else {
        setCurrentIndex((index) => index + 1);
      }

      return;
    }

    /*
     * Practice Mode gives feedback before moving on.
     */
    setFeedbackType("timeout");
    setShowFeedback(true);
  }

  /*
   * Calculate score from the latest answer object.
   *
   * Correct = 1
   * Wrong = 0
   * Unanswered/timeout = 0
   */
  function calculateScore(answerMap) {
    return questions.reduce((score, question) => {
      const selectedAnswer = answerMap?.[question.id];

      if (
        selectedAnswer &&
        selectedAnswer !== TIMEOUT_ANSWER &&
        isAnswerCorrect(
          selectedAnswer,
          question.correction_answer
        )
      ) {
        return score + 1;
      }

      return score;
    }, 0);
  }

  /*
   * Finish the session.
   *
   * Accepting finalAnswers prevents the last answer from being lost
   * because of React's asynchronous state update.
   */
  async function finishSession(finalAnswers = answersRef.current) {
    if (sessionFinished || saving) return;

    setSaving(true);

    const score = calculateScore(finalAnswers);

    setFinalScore(score);
    setSessionFinished(true);
    setShowFeedback(false);

    /*
     * Save attempt to Supabase if the relevant tables are available.
     *
     * We deliberately don't block the result screen if saving fails.
     */
    try {
      if (user) {
        const attemptPayload = {
          user_id: user.id,
          score,
          total_questions: questions.length,
          subject: subject || null,
          topic: topic || null,
          mode: isExaminationMode
            ? "Examination Mode"
            : "Practice Mode",
        };

        const { data: attempt, error: attemptError } =
          await supabase
            .from("quiz_attempts")
            .insert(attemptPayload)
            .select()
            .single();

        if (attemptError) {
          console.warn(
            "QUIZ ATTEMPT SAVE WARNING:",
            attemptError
          );
        }

        /*
         * Only save individual answers when an attempt was
         * successfully created and the table supports it.
         */
        if (attempt && !attemptError) {
          const answerRows = questions.map((question) => ({
            attempt_id: attempt.id,
            question_id: question.id,
            selected_answer:
              finalAnswers?.[question.id] === TIMEOUT_ANSWER
                ? null
                : finalAnswers?.[question.id] ?? null,
            is_correct: isAnswerCorrect(
              finalAnswers?.[question.id],
              question.correction_answer
            ),
            time_taken:
              answerTimesRef.current?.[question.id] ?? null,
          }));

          const { error: answersError } = await supabase
            .from("quiz_answers")
            .insert(answerRows);

          if (answersError) {
            console.warn(
              "QUIZ ANSWERS SAVE WARNING:",
              answersError
            );
          }
        }
      }
    } catch (error) {
      console.warn("QUIZ SAVE WARNING:", error);
    } finally {
      setSaving(false);
    }
  }

  /*
   * Move to the next question.
   */
  function handleNext() {
    if (!currentQuestion || sessionFinished) return;

    /*
     * Practice Mode requires an answer before proceeding.
     * Timeout is considered an answered/missed question.
     */
    const currentAnswer =
      answersRef.current[currentQuestion.id];

    if (!isExaminationMode) {
      if (!currentAnswer) {
        return;
      }
    }

    if (currentIndex >= questions.length - 1) {
      finishSession();
      return;
    }

    setCurrentIndex((index) => index + 1);
  }

  /*
   * Move to a previous question in Examination Mode.
   *
   * This is intentionally allowed in examination mode so the
   * student can review/change answers before submission.
   */
  function handlePrevious() {
    if (currentIndex <= 0 || sessionFinished) return;

    setCurrentIndex((index) => index - 1);
  }

  /*
   * Direct question navigation.
   *
   * Examination Mode allows revisiting questions.
   */
  function handleQuestionJump(index) {
    if (!isExaminationMode || sessionFinished) return;

    setCurrentIndex(index);
  }

  /*
   * Current answer.
   */
  const selectedAnswer = currentQuestion
    ? answers[currentQuestion.id]
    : null;

  /*
   * Progress.
   */
  const answeredCount = useMemo(() => {
    return questions.filter((question) => {
      const answer = answers[question.id];

      return Boolean(answer);
    }).length;
  }, [questions, answers]);

  const correctCount = useMemo(() => {
    return questions.reduce((count, question) => {
      const answer = answers[question.id];

      if (
        answer &&
        answer !== TIMEOUT_ANSWER &&
        isAnswerCorrect(
          answer,
          question.correction_answer
        )
      ) {
        return count + 1;
      }

      return count;
    }, 0);
  }, [questions, answers]);

  const unansweredCount = Math.max(
    0,
    questions.length - answeredCount
  );

  /*
   * Review percentage.
   */
  const percentage =
    questions.length > 0
      ? Math.round((finalScore / questions.length) * 100)
      : 0;

  /*
   * Loading state.
   */
  if (loading) {
    return (
      <main className="quiz-page">
        <div className="quiz-loading">
          <div className="quiz-loading-orb" />

          <h2>Preparing your session</h2>

          <p>
            Loading your questions and building your
            practice experience...
          </p>
        </div>
      </main>
    );
  }

  /*
   * Error state.
   */
  if (loadingError) {
    return (
      <main className="quiz-page">
        <div className="quiz-error-card">
          <div className="quiz-error-icon">!</div>

          <h2>We couldn't load the questions</h2>

          <p>{loadingError}</p>

          <button
            type="button"
            className="quiz-primary-button"
            onClick={() => navigate("/practice")}
          >
            Back to Practice
          </button>
        </div>
      </main>
    );
  }

  /*
   * No questions.
   */
  if (!questions.length) {
    return (
      <main className="quiz-page">
        <div className="quiz-error-card">
          <h2>No questions available</h2>

          <p>
            There are currently no active questions for
            this selection.
          </p>

          <button
            type="button"
            className="quiz-primary-button"
            onClick={() => navigate("/practice")}
          >
            Back to Practice
          </button>
        </div>
      </main>
    );
  }

  /*
   * Final review/results screen.
   */
  if (sessionFinished) {
    return (
      <main className="quiz-page quiz-review-page">
        <div className="quiz-shell">
          <header className="quiz-topbar">
            <button
              type="button"
              className="quiz-back-button"
              onClick={() => navigate("/practice")}
            >
              ← Practice
            </button>

            <div className="quiz-brand">
              <span className="quiz-brand-mark">O</span>
              <span>Overmaths</span>
            </div>

            <div className="quiz-mode-badge">
              {isExaminationMode
                ? "Examination Mode"
                : "Practice Mode"}
            </div>
          </header>

          <section className="quiz-result-hero">
            <div className="quiz-result-eyebrow">
              SESSION COMPLETE
            </div>

            <h1>
              Your performance
            </h1>

            <p>
              {isExaminationMode
                ? "Your examination has been submitted and analysed."
                : "You've completed this practice session."}
            </p>

            <div className="quiz-score-card">
              <div className="quiz-score-number">
                {finalScore}
                <span>/{questions.length}</span>
              </div>

              <div className="quiz-score-label">
                {percentage}% Score
              </div>
            </div>

            <div className="quiz-result-stats">
              <div className="quiz-result-stat">
                <strong>{finalScore}</strong>
                <span>Correct</span>
              </div>

              <div className="quiz-result-stat">
                <strong>
                  {questions.length - finalScore}
                </strong>
                <span>Missed</span>
              </div>

              <div className="quiz-result-stat">
                <strong>{answeredCount}</strong>
                <span>Attempted</span>
              </div>

              <div className="quiz-result-stat">
                <strong>{unansweredCount}</strong>
                <span>Unanswered</span>
              </div>
            </div>
          </section>

          <section className="quiz-review-section">
            <div className="quiz-section-heading">
              <div>
                <span>ANALYSIS</span>
                <h2>Question review</h2>
              </div>
            </div>

            <div className="quiz-review-list">
              {questions.map((question, index) => {
                const answer =
                  answers[question.id];

                const correctAnswer =
                  normalizeAnswer(
                    question.correction_answer
                  );

                const selected =
                  normalizeAnswer(answer);

                const correct =
                  selected &&
                  selected === correctAnswer;

                const timedOut =
                  answer === TIMEOUT_ANSWER;

                return (
                  <article
                    key={question.id}
                    className={`quiz-review-card ${
                      correct
                        ? "is-correct"
                        : "is-wrong"
                    }`}
                  >
                    <div className="quiz-review-header">
                      <div className="quiz-review-number">
                        Q{index + 1}
                      </div>

                      <div className="quiz-review-status">
                        {correct
                          ? "Correct"
                          : timedOut
                          ? "Time expired"
                          : "Not correct"}
                      </div>
                    </div>

                    <div className="quiz-review-question">
                      <MathText>
                        {question.question_text}
                      </MathText>
                    </div>

                    {question.image_url && (
                      <div className="quiz-review-image">
                        <img
                          src={question.image_url}
                          alt={`Question ${index + 1}`}
                          onError={(event) => {
                            event.currentTarget.style.display =
                              "none";
                          }}
                        />
                      </div>
                    )}

                    <div className="quiz-review-answers">
                      <div>
                        <span>Your answer</span>

                        <strong>
                          {timedOut
                            ? "Not answered"
                            : selected || "Not answered"}
                        </strong>
                      </div>

                      <div>
                        <span>Correct answer</span>

                        <strong>
                          {correctAnswer || "Unavailable"}
                        </strong>
                      </div>
                    </div>

                    <div className="quiz-review-options">
                      {buildOptions(question).map(
                        (option) => {
                          const isCorrectOption =
                            option.key === correctAnswer;

                          const isSelectedOption =
                            option.key === selected;

                          return (
                            <div
                              key={option.key}
                              className={`quiz-review-option ${
                                isCorrectOption
                                  ? "is-correct-option"
                                  : ""
                              } ${
                                isSelectedOption &&
                                !isCorrectOption
                                  ? "is-selected-wrong"
                                  : ""
                              }`}
                            >
                              <span className="quiz-option-letter">
                                {option.key}
                              </span>

                              <MathText>
                                {option.text}
                              </MathText>
                            </div>
                          );
                        }
                      )}
                    </div>

                    {question.explanation && (
                      <div className="quiz-review-explanation">
                        <div className="quiz-explanation-label">
                          Explanation
                        </div>

                        <MathText>
                          {question.explanation}
                        </MathText>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <div className="quiz-review-footer">
            <button
              type="button"
              className="quiz-primary-button"
              onClick={() => navigate("/practice")}
            >
              Start another session
            </button>

            <button
              type="button"
              className="quiz-secondary-button"
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  const progressPercentage =
    ((currentIndex + 1) / questions.length) * 100;

  const isCurrentCorrect =
    selectedAnswer &&
    selectedAnswer !== TIMEOUT_ANSWER &&
    isAnswerCorrect(
      selectedAnswer,
      currentQuestion.correction_answer
    );

  return (
    <main className="quiz-page">
      <div className="quiz-shell">

        {/* TOP BAR */}
        <header className="quiz-topbar">
          <button
            type="button"
            className="quiz-back-button"
            onClick={() => navigate("/practice")}
          >
            ← Exit
          </button>

          <div className="quiz-brand">
            <span className="quiz-brand-mark">O</span>
            <span>Overmaths</span>
          </div>

          <div className="quiz-mode-badge">
            {isExaminationMode
              ? "Examination Mode"
              : "Practice Mode"}
          </div>
        </header>

        {/* SESSION HEADER */}
        <section className="quiz-session-header">
          <div className="quiz-session-title">
            <span>
              {learningRoute === "university"
                ? courseCode || courseName
                : examType || "Exam Practice"}
            </span>

            <h1>
              {courseName ||
                subject ||
                "Practice Session"}
            </h1>

            {topic && topic !== "mixed" && (
              <p>
                Topic: {topic}
              </p>
            )}
          </div>

          <div
            className={`quiz-timer ${
              timeLeft <= 5
                ? "is-danger"
                : timeLeft <= 10
                ? "is-warning"
                : ""
            }`}
          >
            <span>TIME</span>

            <strong>
              {String(
                Math.floor(timeLeft / 60)
              ).padStart(2, "0")}
              :
              {String(timeLeft % 60).padStart(
                2,
                "0"
              )}
            </strong>
          </div>
        </section>

        {/* PROGRESS */}
        <section className="quiz-progress-section">
          <div className="quiz-progress-info">
            <span>
              Question{" "}
              <strong>{currentIndex + 1}</strong>{" "}
              of{" "}
              <strong>{questions.length}</strong>
            </span>

            <span>
              {answeredCount} answered
            </span>
          </div>

          <div className="quiz-progress-track">
            <div
              className="quiz-progress-fill"
              style={{
                width: `${progressPercentage}%`,
              }}
            />
          </div>
        </section>

        {/* EXAM NAVIGATION */}
        {isExaminationMode && (
          <section className="quiz-question-navigator">
            <div className="quiz-question-navigator-title">
              Question navigator
            </div>

            <div className="quiz-question-numbers">
              {questions.map(
                (question, index) => {
                  const answer =
                    answers[question.id];

                  return (
                    <button
                      type="button"
                      key={question.id}
                      className={`quiz-question-number ${
                        index === currentIndex
                          ? "is-current"
                          : ""
                      } ${
                        answer
                          ? "is-answered"
                          : ""
                      }`}
                      onClick={() =>
                        handleQuestionJump(index)
                      }
                    >
                      {index + 1}
                    </button>
                  );
                }
              )}
            </div>
          </section>
        )}

        {/* QUESTION CARD */}
        <section className="quiz-question-card">

          <div className="quiz-question-label">
            QUESTION {currentIndex + 1}
          </div>

          <div className="quiz-question-text">
            <MathText>
              {currentQuestion.question_text}
            </MathText>
          </div>

          {/* QUESTION IMAGE */}
          {currentQuestion.image_url && (
            <div className="quiz-question-image">
              <img
                src={currentQuestion.image_url}
                alt={`Question ${currentIndex + 1}`}
                onError={(event) => {
                  console.warn(
                    "QUESTION IMAGE FAILED:",
                    currentQuestion.image_url
                  );

                  event.currentTarget.style.display =
                    "none";
                }}
              />
            </div>
          )}

          {/* OPTIONS */}
          <div className="quiz-options">
            {buildOptions(currentQuestion).map(
              (option) => {
                const isSelected =
                  selectedAnswer === option.key;

                const isCorrectOption =
                  normalizeAnswer(
                    currentQuestion.correction_answer
                  ) === option.key;

                const showCorrectness =
                  !isExaminationMode &&
                  showFeedback;

                let optionClass =
                  "quiz-option";

                if (isSelected) {
                  optionClass += " is-selected";
                }

                if (
                  showCorrectness &&
                  isCorrectOption
                ) {
                  optionClass += " is-correct";
                }

                if (
                  showCorrectness &&
                  isSelected &&
                  !isCorrectOption
                ) {
                  optionClass += " is-wrong";
                }

                return (
                  <button
                    type="button"
                    key={option.key}
                    className={optionClass}
                    onClick={() =>
                      handleAnswer(option.key)
                    }
                    disabled={
                      sessionFinished ||
                      (!isExaminationMode &&
                        Boolean(selectedAnswer))
                    }
                  >
                    <span className="quiz-option-letter">
                      {option.key}
                    </span>

                    <span className="quiz-option-text">
                      <MathText>
                        {option.text}
                      </MathText>
                    </span>

                    {showCorrectness &&
                      isCorrectOption && (
                        <span className="quiz-option-indicator">
                          ✓
                        </span>
                      )}
                  </button>
                );
              }
            )}
          </div>

          {/* PRACTICE FEEDBACK */}
          {!isExaminationMode &&
            showFeedback && (
              <div
                className={`quiz-feedback ${
                  feedbackType === "correct"
                    ? "is-correct"
                    : feedbackType === "wrong"
                    ? "is-wrong"
                    : "is-timeout"
                }`}
              >
                <div className="quiz-feedback-heading">
                  {feedbackType === "correct"
                    ? "Correct!"
                    : feedbackType === "wrong"
                    ? "Not quite."
                    : "Time's up."}
                </div>

                {feedbackType === "correct" && (
                  <p>
                    Excellent. You selected the
                    correct answer.
                  </p>
                )}

                {feedbackType === "wrong" && (
                  <p>
                    The correct answer is{" "}
                    <strong>
                      {normalizeAnswer(
                        currentQuestion.correction_answer
                      )}
                    </strong>
                    .
                  </p>
                )}

                {feedbackType === "timeout" && (
                  <p>
                    This question was not answered
                    before the timer expired.
                  </p>
                )}

                {currentQuestion.explanation && (
                  <div className="quiz-feedback-explanation">
                    <span>
                      Explanation
                    </span>

                    <MathText>
                      {currentQuestion.explanation}
                    </MathText>
                  </div>
                )}
              </div>
            )}
        </section>

        {/* NAVIGATION */}
        <footer className="quiz-navigation">

          <button
            type="button"
            className="quiz-secondary-button"
            onClick={handlePrevious}
            disabled={
              currentIndex === 0 ||
              sessionFinished
            }
          >
            ← Previous
          </button>

          <div className="quiz-navigation-center">
            <span>
              {isExaminationMode
                ? `${answeredCount}/${questions.length} answered`
                : `Question ${currentIndex + 1} of ${questions.length}`}
            </span>
          </div>

          <button
            type="button"
            className="quiz-primary-button"
            onClick={handleNext}
            disabled={
              sessionFinished ||
              (!isExaminationMode &&
                !selectedAnswer)
            }
          >
            {currentIndex === questions.length - 1
              ? isExaminationMode
                ? saving
                  ? "Submitting..."
                  : "Submit Exam"
                : "View Results"
              : "Next Question →"}
          </button>
        </footer>

        {/* EXAM SUBMISSION NOTICE */}
        {isExaminationMode && (
          <div className="quiz-exam-notice">
            <span>●</span>

            <p>
              Examination Mode hides correctness and
              explanations until you submit your exam.
              You can move between questions and change
              your answers before submission.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}