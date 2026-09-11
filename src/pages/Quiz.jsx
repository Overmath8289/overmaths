import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import { supabase } from "../supabaseClient";
import MathText from "../components/MathText";
import "./Quiz.css";

const API_URL = "https://overmaths.onrender.com";

const TIMEOUT_ANSWER = "__TIMEOUT__";
const SKIPPED_ANSWER = "__SKIPPED__";

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

  return Boolean(
    selected &&
      correct &&
      selected === correct
  );
}

function shuffleArray(array) {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(
      Math.random() * (i + 1)
    );

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
    String(mode)
      .toLowerCase()
      .includes("examination") ||
    String(mode)
      .toLowerCase()
      .includes("exam");

  const parsedQuestionCount = Math.max(
    1,
    Math.min(
      Number(questionCount) || 10,
      100
    )
  );

  const parsedTimePerQuestion = Math.max(
    5,
    Number(timePerQuestion) || 30
  );

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] =
    useState("");

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [answers, setAnswers] = useState({});
  const [answerTimes, setAnswerTimes] =
    useState({});

  const [skippedQuestions, setSkippedQuestions] =
    useState({});

  const answersRef = useRef({});
  const answerTimesRef = useRef({});
  const skippedRef = useRef({});

  const [timeLeft, setTimeLeft] = useState(
    parsedTimePerQuestion
  );

  const [showFeedback, setShowFeedback] =
    useState(false);

  const [feedbackType, setFeedbackType] =
    useState("");

  const [sessionFinished, setSessionFinished] =
    useState(false);

  const [finalScore, setFinalScore] =
    useState(0);

  const [user, setUser] = useState(null);

  const [saving, setSaving] =
    useState(false);

  const [showQuitModal, setShowQuitModal] =
    useState(false);

  const currentQuestion =
    questions[currentIndex];

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    answerTimesRef.current =
      answerTimes;
  }, [answerTimes]);

  useEffect(() => {
    skippedRef.current =
      skippedQuestions;
  }, [skippedQuestions]);

  /*
   * Load authenticated user.
   */
  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (mounted) {
          setUser(authUser || null);
        }
      } catch (error) {
        console.error(
          "QUIZ AUTH ERROR:",
          error
        );
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Load questions.
   */
  useEffect(() => {
    let mounted = true;

    async function loadQuestions() {
      setLoading(true);
      setLoadingError("");

      try {
        const params =
          new URLSearchParams();

        if (courseId) {
          params.set(
            "course_id",
            String(courseId)
          );
        } else if (subject) {
          params.set("subject", subject);
        } else {
          throw new Error(
            "No subject or course was selected."
          );
        }

        if (
          topic &&
          topic !== "mixed"
        ) {
          params.set("topic", topic);
        }

        params.set(
          "limit",
          String(parsedQuestionCount)
        );

        const response = await fetch(
          `${API_URL}/api/questions?${params.toString()}`
        );

        if (!response.ok) {
          let message =
            "Unable to load questions.";

          try {
            const errorData =
              await response.json();

            if (errorData?.error) {
              message =
                errorData.error;
            }
          } catch {
            // Keep default.
          }

          throw new Error(message);
        }

        const data =
          await response.json();

        const loadedQuestions =
          Array.isArray(
            data?.questions
          )
            ? data.questions
            : [];

        if (!loadedQuestions.length) {
          throw new Error(
            "No questions are available for this selection yet."
          );
        }

        const shuffledQuestions =
          shuffleArray(
            loadedQuestions
          ).slice(
            0,
            parsedQuestionCount
          );

        if (mounted) {
          setQuestions(
            shuffledQuestions
          );
          setCurrentIndex(0);
        }
      } catch (error) {
        console.error(
          "QUIZ LOAD ERROR:",
          error
        );

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
  }, [
    courseId,
    subject,
    topic,
    parsedQuestionCount,
  ]);

  /*
   * Reset timer whenever question changes.
   */
  useEffect(() => {
    if (
      !currentQuestion ||
      sessionFinished
    ) {
      return;
    }

    setTimeLeft(
      parsedTimePerQuestion
    );

    setShowFeedback(false);
    setFeedbackType("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [
    currentIndex,
    currentQuestion?.id,
    parsedTimePerQuestion,
    sessionFinished,
  ]);

  /*
   * Timer.
   */
  useEffect(() => {
    if (
      !currentQuestion ||
      sessionFinished ||
      showFeedback
    ) {
      return undefined;
    }

    const timer =
      window.setInterval(() => {
        setTimeLeft(
          (previousTime) => {
            if (
              previousTime <= 1
            ) {
              window.clearInterval(
                timer
              );

              handleTimeout(
                currentQuestion
              );

              return 0;
            }

            return (
              previousTime - 1
            );
          }
        );
      }, 1000);

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    currentQuestion?.id,
    sessionFinished,
    showFeedback,
    parsedTimePerQuestion,
  ]);

  /*
   * Save answer.
   */
  function saveAnswer(
    questionId,
    selectedAnswer,
    secondsUsed
  ) {
    const nextAnswers = {
      ...answersRef.current,
      [questionId]:
        selectedAnswer,
    };

    const nextAnswerTimes = {
      ...answerTimesRef.current,
      [questionId]:
        secondsUsed,
    };

    answersRef.current =
      nextAnswers;

    answerTimesRef.current =
      nextAnswerTimes;

    setAnswers(nextAnswers);
    setAnswerTimes(
      nextAnswerTimes
    );

    /*
     * Once answered, remove skipped
     * status from this question.
     */
    if (
      skippedRef.current[
        questionId
      ]
    ) {
      const nextSkipped = {
        ...skippedRef.current,
      };

      delete nextSkipped[
        questionId
      ];

      skippedRef.current =
        nextSkipped;

      setSkippedQuestions(
        nextSkipped
      );
    }
  }

  /*
   * Mark question as skipped.
   */
  function markSkipped(
    questionId,
    secondsUsed = 0
  ) {
    if (!questionId) return;

    saveAnswer(
      questionId,
      SKIPPED_ANSWER,
      secondsUsed
    );

    const nextSkipped = {
      ...skippedRef.current,
      [questionId]: true,
    };

    skippedRef.current =
      nextSkipped;

    setSkippedQuestions(
      nextSkipped
    );
  }

  /*
   * Handle answer.
   */
  function handleAnswer(
    selectedAnswer
  ) {
    if (
      !currentQuestion ||
      sessionFinished
    ) {
      return;
    }

    /*
     * Practice Mode locks the answer
     * after selection.
     */
    if (
      !isExaminationMode &&
      answersRef.current[
        currentQuestion.id
      ]
    ) {
      return;
    }

    const secondsUsed =
      Math.max(
        0,
        parsedTimePerQuestion -
          timeLeft
      );

    saveAnswer(
      currentQuestion.id,
      selectedAnswer,
      secondsUsed
    );

    if (!isExaminationMode) {
      const correct =
        isAnswerCorrect(
          selectedAnswer,
          currentQuestion.correction_answer
        );

      setFeedbackType(
        correct
          ? "correct"
          : "wrong"
      );

      setShowFeedback(true);
    }
  }

  /*
   * Handle timeout.
   */
  function handleTimeout(
    question
  ) {
    if (
      !question ||
      sessionFinished
    ) {
      return;
    }

    if (
      answersRef.current[
        question.id
      ]
    ) {
      return;
    }

    markSkipped(
      question.id,
      parsedTimePerQuestion
    );

    if (isExaminationMode) {
      if (
        currentIndex >=
        questions.length - 1
      ) {
        finishSession({
          ...answersRef.current,
          [question.id]:
            SKIPPED_ANSWER,
        });
      } else {
        setCurrentIndex(
          (index) =>
            index + 1
        );
      }

      return;
    }

    setFeedbackType(
      "timeout"
    );

    setShowFeedback(true);
  }

  /*
   * Calculate score.
   */
  function calculateScore(
    answerMap
  ) {
    return questions.reduce(
      (score, question) => {
        const selectedAnswer =
          answerMap?.[
            question.id
          ];

        if (
          selectedAnswer &&
          selectedAnswer !==
            TIMEOUT_ANSWER &&
          selectedAnswer !==
            SKIPPED_ANSWER &&
          isAnswerCorrect(
            selectedAnswer,
            question.correction_answer
          )
        ) {
          return score + 1;
        }

        return score;
      },
      0
    );
  }

  /*
   * Finish session.
   *
   * IMPORTANT:
   * Practice sessions are NOT
   * saved as official attempts.
   *
   * Only Examination Mode is saved.
   */
  async function finishSession(
    finalAnswers =
      answersRef.current
  ) {
    if (
      sessionFinished ||
      saving
    ) {
      return;
    }

    setSaving(true);

    const score =
      calculateScore(
        finalAnswers
      );

    setFinalScore(score);
    setSessionFinished(true);
    setShowFeedback(false);

    /*
     * Practice mode is deliberately
     * not written to the official
     * analytics tables.
     */
    if (!isExaminationMode) {
      setSaving(false);
      return;
    }

    try {
      if (user) {
        const attemptPayload = {
          user_id: user.id,
          score,
          total_questions:
            questions.length,
          subject:
            subject || null,
          topic:
            topic || null,
          mode:
            "Examination Mode",
        };

        const {
          data: attempt,
          error: attemptError,
        } =
          await supabase
            .from(
              "quiz_attempts"
            )
            .insert(
              attemptPayload
            )
            .select()
            .single();

        if (attemptError) {
          console.warn(
            "QUIZ ATTEMPT SAVE WARNING:",
            attemptError
          );
        }

        if (
          attempt &&
          !attemptError
        ) {
          const answerRows =
            questions.map(
              (question) => {
                const answer =
                  finalAnswers?.[
                    question.id
                  ];

                return {
                  attempt_id:
                    attempt.id,

                  question_id:
                    question.id,

                  selected_answer:
                    answer ===
                      TIMEOUT_ANSWER ||
                    answer ===
                      SKIPPED_ANSWER
                      ? null
                      : answer ??
                        null,

                  is_correct:
                    isAnswerCorrect(
                      answer,
                      question.correction_answer
                    ),

                  time_taken:
                    answerTimesRef
                      .current?.[
                      question.id
                    ] ?? null,
                };
              }
            );

          const {
            error:
              answersError,
          } =
            await supabase
              .from(
                "quiz_answers"
              )
              .insert(
                answerRows
              );

          if (answersError) {
            console.warn(
              "QUIZ ANSWERS SAVE WARNING:",
              answersError
            );
          }
        }
      }
    } catch (error) {
      console.warn(
        "QUIZ SAVE WARNING:",
        error
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * Skip current question.
   */
  function handleSkip() {
    if (
      !isExaminationMode ||
      !currentQuestion ||
      sessionFinished
    ) {
      return;
    }

    if (
      answersRef.current[
        currentQuestion.id
      ]
    ) {
      return;
    }

    const secondsUsed =
      Math.max(
        0,
        parsedTimePerQuestion -
          timeLeft
      );

    markSkipped(
      currentQuestion.id,
      secondsUsed
    );

    if (
      currentIndex >=
      questions.length - 1
    ) {
      finishSession({
        ...answersRef.current,
        [currentQuestion.id]:
          SKIPPED_ANSWER,
      });
      return;
    }

    setCurrentIndex(
      (index) =>
        index + 1
    );
  }

  /*
   * Next question.
   */
  function handleNext() {
    if (
      !currentQuestion ||
      sessionFinished
    ) {
      return;
    }

    const currentAnswer =
      answersRef.current[
        currentQuestion.id
      ];

    /*
     * Practice requires an answer.
     */
    if (!isExaminationMode) {
      if (!currentAnswer) {
        return;
      }

      if (
        currentIndex >=
        questions.length - 1
      ) {
        finishSession();
        return;
      }

      setCurrentIndex(
        (index) =>
          index + 1
      );

      return;
    }

    /*
     * Examination mode:
     * If the student presses Next
     * without answering, treat it
     * as skipped.
     */
    if (!currentAnswer) {
      markSkipped(
        currentQuestion.id,
        Math.max(
          0,
          parsedTimePerQuestion -
            timeLeft
        )
      );
    }

    if (
      currentIndex >=
      questions.length - 1
    ) {
      finishSession({
        ...answersRef.current,
        [currentQuestion.id]:
          currentAnswer ||
          SKIPPED_ANSWER,
      });

      return;
    }

    setCurrentIndex(
      (index) =>
        index + 1
    );
  }

  /*
   * Previous.
   */
  function handlePrevious() {
    if (
      currentIndex <= 0 ||
      sessionFinished
    ) {
      return;
    }

    setCurrentIndex(
      (index) =>
        index - 1
    );
  }

  /*
   * Jump to question.
   */
  function handleQuestionJump(
    index
  ) {
    if (
      !isExaminationMode ||
      sessionFinished
    ) {
      return;
    }

    setCurrentIndex(index);
  }

  /*
   * Quit without saving.
   */
  function handleQuit() {
    setShowQuitModal(false);

    /*
     * No finishSession call.
     * Therefore nothing is saved.
     */
    navigate("/practice");
  }

  const selectedAnswer =
    currentQuestion
      ? answers[
          currentQuestion.id
        ]
      : null;

  const answeredCount =
    useMemo(() => {
      return questions.filter(
        (question) => {
          const answer =
            answers[
              question.id
            ];

          return (
            Boolean(answer) &&
            answer !==
              TIMEOUT_ANSWER &&
            answer !==
              SKIPPED_ANSWER
          );
        }
      ).length;
    }, [questions, answers]);

  const skippedCount =
    useMemo(() => {
      return questions.filter(
        (question) =>
          skippedQuestions[
            question.id
          ]
      ).length;
    }, [
      questions,
      skippedQuestions,
    ]);

  const unansweredCount =
    Math.max(
      0,
      questions.length -
        answeredCount -
        skippedCount
    );

  const correctCount =
    useMemo(() => {
      return questions.reduce(
        (count, question) => {
          const answer =
            answers[
              question.id
            ];

          if (
            answer &&
            answer !==
              TIMEOUT_ANSWER &&
            answer !==
              SKIPPED_ANSWER &&
            isAnswerCorrect(
              answer,
              question.correction_answer
            )
          ) {
            return count + 1;
          }

          return count;
        },
        0
      );
    }, [questions, answers]);

  const percentage =
    questions.length > 0
      ? Math.round(
          (finalScore /
            questions.length) *
            100
        )
      : 0;

  const progressPercentage =
    questions.length > 0
      ? ((currentIndex + 1) /
          questions.length) *
        100
      : 0;

  /*
   * Loading.
   */
  if (loading) {
    return (
      <main className="quiz-page">
        <div className="quiz-container">
          <div className="quiz-loading">
            <div className="quiz-loading-orb" />

            <h2>
              Preparing your session
            </h2>

            <p>
              Loading your questions
              and building your
              learning experience...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * Error.
   */
  if (loadingError) {
    return (
      <main className="quiz-page">
        <div className="quiz-container">
          <div className="quiz-error">
            <div className="quiz-error-icon">
              !
            </div>

            <h2>
              We couldn't load the
              questions
            </h2>

            <p>
              {loadingError}
            </p>

            <button
              type="button"
              className="quiz-action primary"
              onClick={() =>
                navigate(
                  "/practice"
                )
              }
            >
              Back to Practice
            </button>
          </div>
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
        <div className="quiz-container">
          <div className="quiz-error">
            <h2>
              No questions available
            </h2>

            <p>
              There are currently no
              active questions for
              this selection.
            </p>

            <button
              type="button"
              className="quiz-action primary"
              onClick={() =>
                navigate(
                  "/practice"
                )
              }
            >
              Back to Practice
            </button>
          </div>
        </div>
      </main>
    );
  }

  /*
   * RESULT / REVIEW SCREEN
   */
  if (sessionFinished) {
    return (
      <main className="quiz-page quiz-review-page">
        <div className="quiz-container">

          <header className="quiz-topbar">
            <div className="quiz-topbar-left">
              <div className="quiz-brand-mark">
                O
              </div>

              <div className="quiz-subject-info">
                <div className="quiz-subject-name">
                  {courseName ||
                    subject ||
                    "Overmaths"}
                </div>

                <div className="quiz-topic-name">
                  {isExaminationMode
                    ? "Examination completed"
                    : "Practice completed"}
                </div>
              </div>
            </div>

            <div className="quiz-mode-badge">
              {isExaminationMode
                ? "Examination Mode"
                : "Practice Mode"}
            </div>
          </header>

          <section className="quiz-result-hero">
            <span className="quiz-result-eyebrow">
              SESSION COMPLETE
            </span>

            <h1 className="quiz-result-title">
              {percentage >= 80
                ? "Excellent work."
                : percentage >= 60
                ? "Good progress."
                : percentage >= 40
                ? "Keep pushing."
                : "Every attempt is progress."}
            </h1>

            <p className="quiz-result-subtitle">
              {isExaminationMode
                ? "Your examination has been submitted. Review your performance below."
                : "You've completed this practice session. Use the review to learn from every question."}
            </p>

            <div className="quiz-score">
              <strong className="quiz-score-number">
                {percentage}%
              </strong>

              <span className="quiz-score-label">
                {finalScore} /{" "}
                {questions.length} correct
              </span>
            </div>

            <div className="quiz-result-stats">
              <div className="quiz-stat-card success">
                <strong className="quiz-stat-value">
                  {correctCount}
                </strong>

                <span className="quiz-stat-label">
                  Correct
                </span>
              </div>

              <div className="quiz-stat-card danger">
                <strong className="quiz-stat-value">
                  {questions.length -
                    finalScore}
                </strong>

                <span className="quiz-stat-label">
                  Missed
                </span>
              </div>

              <div className="quiz-stat-card">
                <strong className="quiz-stat-value">
                  {answeredCount}
                </strong>

                <span className="quiz-stat-label">
                  Answered
                </span>
              </div>

              <div className="quiz-stat-card warning">
                <strong className="quiz-stat-value">
                  {skippedCount}
                </strong>

                <span className="quiz-stat-label">
                  Skipped
                </span>
              </div>
            </div>
          </section>

          <section className="quiz-review-section">

            <div className="quiz-section-heading">
              <div>
                <span>
                  REVIEW
                </span>

                <h2>
                  Question by question
                </h2>

                <p>
                  See what you selected,
                  the correct answer and
                  the explanation.
                </p>
              </div>
            </div>

            <div className="quiz-review-list">

              {questions.map(
                (
                  question,
                  index
                ) => {
                  const answer =
                    answers[
                      question.id
                    ];

                  const correctAnswer =
                    normalizeAnswer(
                      question.correction_answer
                    );

                  const selected =
                    normalizeAnswer(
                      answer
                    );

                  const correct =
                    selected &&
                    selected ===
                      correctAnswer;

                  const timedOut =
                    answer ===
                    TIMEOUT_ANSWER;

                  const skipped =
                    answer ===
                      SKIPPED_ANSWER ||
                    skippedQuestions[
                      question.id
                    ];

                  const statusClass =
                    correct
                      ? "correct"
                      : skipped || timedOut
                      ? "unanswered"
                      : "incorrect";

                  const selectedOption =
                    buildOptions(
                      question
                    ).find(
                      (option) =>
                        option.key ===
                        selected
                    );

                  const correctOption =
                    buildOptions(
                      question
                    ).find(
                      (option) =>
                        option.key ===
                        correctAnswer
                    );

                  return (
                    <article
                      key={
                        question.id
                      }
                      className={`quiz-review-card ${statusClass}`}
                    >

                      <div className="quiz-review-header">

                        <div className="quiz-review-number">
                          Q{index + 1}
                        </div>

                        <div className="quiz-review-status">
                          {correct
                            ? "✓ Correct"
                            : skipped ||
                              timedOut
                            ? "• Not answered"
                            : "× Incorrect"}
                        </div>

                      </div>

                      <div className="quiz-review-question">
                        <MathText>
                          {
                            question.question_text
                          }
                        </MathText>
                      </div>

                      {question.image_url && (
                        <div className="quiz-review-image">
                          <img
                            src={
                              question.image_url
                            }
                            alt={`Question ${
                              index + 1
                            }`}
                            onError={(
                              event
                            ) => {
                              event.currentTarget.style.display =
                                "none";
                            }}
                          />
                        </div>
                      )}

                      <div className="quiz-review-answer-grid">

                        <div
                          className={`quiz-review-answer-box ${
                            correct
                              ? "correct-answer"
                              : "student-answer"
                          }`}
                        >
                          <span>
                            YOUR ANSWER
                          </span>

                          <strong>
                            {skipped ||
                            timedOut
                              ? "Not answered"
                              : selected
                              ? `${selected}. ${
                                  selectedOption?.text ||
                                  ""
                                }`
                              : "Not answered"}
                          </strong>
                        </div>

                        <div className="quiz-review-answer-box correct-answer">
                          <span>
                            CORRECT ANSWER
                          </span>

                          <strong>
                            {correctAnswer
                              ? `${correctAnswer}. ${
                                  correctOption?.text ||
                                  ""
                                }`
                              : "Unavailable"}
                          </strong>
                        </div>

                      </div>

                      <div className="quiz-review-options">

                        {buildOptions(
                          question
                        ).map(
                          (option) => {
                            const isCorrectOption =
                              option.key ===
                              correctAnswer;

                            const isSelectedOption =
                              option.key ===
                              selected;

                            return (
                              <div
                                key={
                                  option.key
                                }
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
                                  {
                                    option.key
                                  }
                                </span>

                                <span className="quiz-review-option-text">
                                  <MathText>
                                    {
                                      option.text
                                    }
                                  </MathText>
                                </span>

                                {isCorrectOption && (
                                  <span className="quiz-review-option-mark">
                                    ✓
                                  </span>
                                )}

                                {isSelectedOption &&
                                  !isCorrectOption && (
                                    <span className="quiz-review-option-mark wrong-mark">
                                      ×
                                    </span>
                                  )}
                              </div>
                            );
                          }
                        )}

                      </div>

                      {question.explanation && (
                        <div className="quiz-review-explanation">
                          <div className="quiz-explanation-label">
                            WHY?
                          </div>

                          <MathText>
                            {
                              question.explanation
                            }
                          </MathText>
                        </div>
                      )}

                    </article>
                  );
                }
              )}

            </div>
          </section>

          <div className="quiz-review-footer">

            <button
              type="button"
              className="quiz-action primary"
              onClick={() =>
                navigate(
                  "/practice"
                )
              }
            >
              Take Another Quiz
              <span>→</span>
            </button>

            <button
              type="button"
              className="quiz-action secondary"
              onClick={() =>
                navigate(
                  "/dashboard"
                )
              }
            >
              Back to Dashboard
            </button>

          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="quiz-page">
      <div className="quiz-container">

        {/* TOP BAR */}
        <header className="quiz-topbar">

          <div className="quiz-topbar-left">

            <div className="quiz-brand-mark">
              O
            </div>

            <div className="quiz-subject-info">
              <div className="quiz-subject-name">
                {courseName ||
                  subject ||
                  "Overmaths"}
              </div>

              <div className="quiz-topic-name">
                {topic &&
                topic !== "mixed"
                  ? topic
                  : isExaminationMode
                  ? "Mixed Topics"
                  : "Mixed Practice"}
              </div>
            </div>

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
              {learningRoute ===
              "university"
                ? courseCode ||
                  courseName
                : examType ||
                  "Exam Preparation"}
            </span>

            <h1>
              {courseName ||
                subject ||
                "Quiz Session"}
            </h1>

            <p>
              Question{" "}
              <strong>
                {currentIndex + 1}
              </strong>{" "}
              of{" "}
              <strong>
                {questions.length}
              </strong>
            </p>

          </div>

          <div
            className={`quiz-timer ${
              timeLeft <= 5
                ? "danger"
                : timeLeft <= 10
                ? "warning"
                : ""
            }`}
          >
            <span className="quiz-timer-icon">
              ⏱
            </span>

            <span className="quiz-timer-label">
              TIME
            </span>

            <strong>
              {String(
                Math.floor(
                  timeLeft / 60
                )
              ).padStart(2, "0")}
              :
              {String(
                timeLeft % 60
              ).padStart(2, "0")}
            </strong>
          </div>

        </section>

        {/* PROGRESS */}
        <section className="quiz-progress-section">

          <div className="quiz-progress-header">

            <span className="quiz-question-label">
              SESSION PROGRESS
            </span>

            <span className="quiz-question-number">
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

        {/* QUESTION NAVIGATOR */}
        {isExaminationMode && (
          <section className="quiz-question-navigator">

            <div className="quiz-question-navigator-header">

              <div>
                <span>
                  QUESTION MAP
                </span>

                <strong>
                  {currentIndex + 1} /{" "}
                  {questions.length}
                </strong>
              </div>

              <div className="quiz-question-legend">

                <span>
                  <i className="legend-dot answered" />
                  Answered
                </span>

                <span>
                  <i className="legend-dot unanswered" />
                  Unanswered
                </span>

                <span>
                  <i className="legend-dot skipped" />
                  Skipped
                </span>

              </div>

            </div>

            <div className="quiz-question-numbers">

              {questions.map(
                (
                  question,
                  index
                ) => {
                  const answer =
                    answers[
                      question.id
                    ];

                  const isAnswered =
                    Boolean(
                      answer &&
                        answer !==
                          TIMEOUT_ANSWER &&
                        answer !==
                          SKIPPED_ANSWER
                    );

                  const isSkipped =
                    Boolean(
                      skippedQuestions[
                        question.id
                      ]
                    );

                  return (
                    <button
                      type="button"
                      key={
                        question.id
                      }
                      className={`quiz-question-number ${
                        index ===
                        currentIndex
                          ? "is-current"
                          : ""
                      } ${
                        isAnswered
                          ? "is-answered"
                          : ""
                      } ${
                        isSkipped
                          ? "is-skipped"
                          : ""
                      }`}
                      onClick={() =>
                        handleQuestionJump(
                          index
                        )
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

          <div className="quiz-question-card-top">

            <span className="quiz-question-index">
              {currentIndex + 1}
            </span>

            <span className="quiz-question-label">
              QUESTION
            </span>

          </div>

          <div className="quiz-question-text">
            <MathText>
              {
                currentQuestion.question_text
              }
            </MathText>
          </div>

          {currentQuestion.image_url && (
            <div className="quiz-question-image-wrapper">

              <img
                className="quiz-question-image"
                src={
                  currentQuestion.image_url
                }
                alt={`Question ${
                  currentIndex + 1
                }`}
                onError={(
                  event
                ) => {
                  event.currentTarget.style.display =
                    "none";
                }}
              />

            </div>
          )}

          <div className="quiz-options-section">

            <div className="quiz-options">

              {buildOptions(
                currentQuestion
              ).map(
                (option) => {
                  const isSelected =
                    selectedAnswer ===
                    option.key;

                  const isCorrectOption =
                    normalizeAnswer(
                      currentQuestion.correction_answer
                    ) ===
                    option.key;

                  const showCorrectness =
                    !isExaminationMode &&
                    showFeedback;

                  let optionClass =
                    "quiz-option";

                  if (
                    isSelected
                  ) {
                    optionClass +=
                      " is-selected";
                  }

                  if (
                    showCorrectness &&
                    isCorrectOption
                  ) {
                    optionClass +=
                      " is-correct";
                  }

                  if (
                    showCorrectness &&
                    isSelected &&
                    !isCorrectOption
                  ) {
                    optionClass +=
                      " is-wrong";
                  }

                  return (
                    <button
                      type="button"
                      key={
                        option.key
                      }
                      className={
                        optionClass
                      }
                      onClick={() =>
                        handleAnswer(
                          option.key
                        )
                      }
                      disabled={
                        sessionFinished ||
                        (!isExaminationMode &&
                          Boolean(
                            selectedAnswer
                          ))
                      }
                    >
                      <span className="quiz-option-letter">
                        {option.key}
                      </span>

                      <span className="quiz-option-text">
                        <MathText>
                          {
                            option.text
                          }
                        </MathText>
                      </span>

                      {showCorrectness &&
                        isCorrectOption && (
                          <span className="quiz-option-indicator">
                            ✓
                          </span>
                        )}

                      {showCorrectness &&
                        isSelected &&
                        !isCorrectOption && (
                          <span className="quiz-option-indicator wrong">
                            ×
                          </span>
                        )}

                    </button>
                  );
                }
              )}

            </div>

          </div>

          {/* PRACTICE FEEDBACK */}
          {!isExaminationMode &&
            showFeedback && (
              <div
                className={`quiz-feedback ${
                  feedbackType ===
                  "correct"
                    ? "correct"
                    : feedbackType ===
                      "wrong"
                    ? "wrong"
                    : "timeout"
                }`}
              >
                <div className="quiz-feedback-heading">

                  {feedbackType ===
                  "correct"
                    ? "✓ Correct!"
                    : feedbackType ===
                      "wrong"
                    ? "× Not quite."
                    : "⏱ Time's up."}

                </div>

                {feedbackType ===
                  "correct" && (
                  <p>
                    Excellent. You
                    selected the correct
                    answer.
                  </p>
                )}

                {feedbackType ===
                  "wrong" && (
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

                {feedbackType ===
                  "timeout" && (
                  <p>
                    This question was not
                    answered before the
                    timer expired.
                  </p>
                )}

                {currentQuestion.explanation && (
                  <div className="quiz-feedback-explanation">
                    <span>
                      Explanation
                    </span>

                    <MathText>
                      {
                        currentQuestion.explanation
                      }
                    </MathText>
                  </div>
                )}

              </div>
            )}

        </section>

        {/* NAVIGATION */}
        <footer className="quiz-navigation">

          <div className="quiz-navigation-group">

            <button
              type="button"
              className="quiz-nav-button secondary"
              onClick={
                handlePrevious
              }
              disabled={
                currentIndex ===
                  0 ||
                sessionFinished
              }
            >
              ← Previous
            </button>

            {isExaminationMode &&
              !selectedAnswer && (
                <button
                  type="button"
                  className="quiz-nav-button skip"
                  onClick={
                    handleSkip
                  }
                  disabled={
                    sessionFinished
                  }
                >
                  Skip
                </button>
              )}

          </div>

          <div className="quiz-navigation-counter">
            <strong>
              {answeredCount}
            </strong>{" "}
            answered
            <span>•</span>
            <strong>
              {unansweredCount}
            </strong>{" "}
            unanswered
            {isExaminationMode && (
              <>
                <span>•</span>
                <strong>
                  {skippedCount}
                </strong>{" "}
                skipped
              </>
            )}
          </div>

          <div className="quiz-navigation-group right">

            <button
              type="button"
              className="quiz-nav-button primary"
              onClick={
                handleNext
              }
              disabled={
                sessionFinished ||
                (!isExaminationMode &&
                  !selectedAnswer)
              }
            >
              {currentIndex ===
              questions.length - 1
                ? isExaminationMode
                  ? saving
                    ? "Submitting..."
                    : "Submit Exam"
                  : "View Results"
                : "Next →"}
            </button>

          </div>

        </footer>

        {/* QUIT */}
        <div className="quiz-quit-row">

          <button
            type="button"
            className="quiz-quit-button"
            onClick={() =>
              setShowQuitModal(
                true
              )
            }
          >
            Quit Quiz
          </button>

        </div>

        {isExaminationMode && (
          <div className="quiz-exam-notice">
            <span>●</span>

            <p>
              Examination Mode does not
              reveal correct answers until
              you submit. You can move
              between questions and change
              your answers before submission.
            </p>
          </div>
        )}

        {/* QUIT MODAL */}
        {showQuitModal && (
          <div
            className="quiz-modal-backdrop"
            onClick={() =>
              setShowQuitModal(
                false
              )
            }
          >
            <div
              className="quiz-quit-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="quiz-modal-icon">
                !
              </div>

              <h2>
                Leave this quiz?
              </h2>

              <p>
                Your current progress will
                be lost. This attempt will
                not be submitted or saved.
              </p>

              <div className="quiz-modal-actions">

                <button
                  type="button"
                  className="quiz-nav-button secondary"
                  onClick={() =>
                    setShowQuitModal(
                      false
                    )
                  }
                >
                  Continue Quiz
                </button>

                <button
                  type="button"
                  className="quiz-nav-button danger"
                  onClick={
                    handleQuit
                  }
                >
                  Quit Quiz
                </button>

              </div>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}