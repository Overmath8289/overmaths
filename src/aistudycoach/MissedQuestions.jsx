
import { useEffect, useState } from "react";

import {
  getMissedQuestions,
  getOriginalQuestion,
  updateMissedQuestionStatus,
} from "./missedQuestionsService";

import AITutor from "./tutor/AITutor";
import MathText from "../components/MathText";

import "./MissedQuestions.css";

const LETTERS = ["A", "B", "C", "D"];

function getAnswerLetter(answer) {
  const value = String(answer || "").trim();
  const match = value.match(/\b([A-D])\b/i);

  return match ? match[1].toUpperCase() : value;
}

function getOptionText(question, answer) {
  const letter = getAnswerLetter(answer);

  if (!LETTERS.includes(letter)) {
    return answer || "Not recorded";
  }

  const option = question?.[`option_${letter.toLowerCase()}`];

  return option
    ? `${letter}. ${option}`
    : letter;
}

export default function MissedQuestions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(null);

  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [originalQuestions, setOriginalQuestions] = useState({});
  const [questionLoading, setQuestionLoading] = useState({});
  const [questionErrors, setQuestionErrors] = useState({});

  const [selectedQuestion, setSelectedQuestion] = useState(null);

  async function loadQuestions() {
    try {
      setLoading(true);
      setError("");

      const data = await getMissedQuestions();
      setQuestions(data);
    } catch (err) {
      console.error("Missed questions loading error:", err);
      setError(
        "We couldn't load your missed questions. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuestions();
  }, []);




  async function retryOriginalQuestion(question) {
    try {
      setQuestionLoading((previous) => ({
        ...previous,
        [question.id]: true,
      }));

      setQuestionErrors((previous) => ({
        ...previous,
        [question.id]: "",
      }));

      const original = await getOriginalQuestion(
        question.question_id
      );

      setOriginalQuestions((previous) => ({
        ...previous,
        [question.id]: original,
      }));
    } catch (err) {
      setQuestionErrors((previous) => ({
        ...previous,
        [question.id]:
          err.message || "Unable to load the original question.",
      }));
    } finally {
      setQuestionLoading((previous) => ({
        ...previous,
        [question.id]: false,
      }));
    }
  }



  async function toggleQuestion(question) {
    if (expandedQuestion === question.id) {
      setExpandedQuestion(null);
      return;
    }

    setExpandedQuestion(question.id);

    if (originalQuestions[question.id]) {
      return;
    }

    try {
      setQuestionLoading((previous) => ({
        ...previous,
        [question.id]: true,
      }));

      setQuestionErrors((previous) => ({
        ...previous,
        [question.id]: "",
      }));

      const original = await getOriginalQuestion(
        question.question_id
      );

      setOriginalQuestions((previous) => ({
        ...previous,
        [question.id]: original,
      }));
    } catch (err) {
      console.error("Original question loading error:", err);

      setQuestionErrors((previous) => ({
        ...previous,
        [question.id]:
          err.message ||
          "Unable to load the original question.",
      }));
    } finally {
      setQuestionLoading((previous) => ({
        ...previous,
        [question.id]: false,
      }));
    }
  }

  async function changeStatus(id, status) {
    try {
      setUpdating(id);
      setError("");

      const updated = await updateMissedQuestionStatus(
        id,
        status
      );

      setQuestions((previous) =>
        previous.map((question) =>
          question.id === id ? updated : question
        )
      );
    } catch (err) {
      console.error("Status update error:", err);

      setError(
        "We couldn't update this question. Please try again."
      );
    } finally {
      setUpdating(null);
    }
  }

  const pendingCount = questions.filter(
    (q) => q.status === "pending"
  ).length;

  const learningCount = questions.filter(
    (q) => q.status === "learning"
  ).length;

  const masteredCount = questions.filter(
    (q) => q.status === "mastered"
  ).length;

  if (loading) {
    return (
      <main className="mq-page">
        <div className="mq-loading">
          <div className="mq-spinner" />
          <h2>Preparing your study space</h2>
          <p>Loading your missed questions...</p>
        </div>
      </main>
    );
  }

  if (selectedQuestion) {
    return (
      <AITutor
        missedQuestion={selectedQuestion}
        onBack={() => setSelectedQuestion(null)}
      />
    );
  }

  return (
    <main className="mq-page">
      <header className="mq-header">
        <span className="mq-eyebrow">
          AI STUDY COACH
        </span>

        <h1>My Missed Questions</h1>

        <p>
          Every mistake is an opportunity to learn.
          Review your answers, understand your mistakes
          and improve your performance.
        </p>
      </header>

      <section className="mq-stats">
        <div className="mq-stat-card">
          <span>Total Missed</span>
          <strong>{questions.length}</strong>
        </div>

        <div className="mq-stat-card">
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </div>

        <div className="mq-stat-card">
          <span>Learning</span>
          <strong>{learningCount}</strong>
        </div>

        <div className="mq-stat-card">
          <span>Mastered</span>
          <strong>{masteredCount}</strong>
        </div>
      </section>

      {error && (
        <div className="mq-error">
          <span>{error}</span>

          <button
            type="button"
            onClick={loadQuestions}
          >
            Retry
          </button>
        </div>
      )}

      {questions.length === 0 ? (
        <section className="mq-empty">
          <div className="mq-empty-icon">🎯</div>

          <h2>No missed questions yet!</h2>

          <p>
            Questions you answer incorrectly will appear
            here so you can review and master them.
          </p>
        </section>
      ) : (
        <section className="mq-question-list">
          {questions.map((question) => {
            const original = originalQuestions[question.id];

            const isExpanded =
              expandedQuestion === question.id;

            const selectedLetter = getAnswerLetter(
              question.selected_answer
            );

            const correctLetter = getAnswerLetter(
              original?.correction_answer ||
              original?.correct_answer ||
              question.correct_answer
            );

            return (
              <article
                className="mq-question-card"
                key={question.id}
              >
                <div className="mq-card-top">
                  <div className="mq-card-tags">
                    <span className="mq-subject">
                      {question.subject || "General"}
                    </span>

                    <span className="mq-topic">
                      {question.topic || "Uncategorised"}
                    </span>
                  </div>

                  <span
                    className={`mq-status ${question.status}`}
                  >
                    {question.status || "pending"}
                  </span>
                </div>

                <div className="mq-question-heading">
                  <span className="mq-question-label">
                    QUESTION
                  </span>

                  <h2>
                    <MathText
                      text={question.question_text || ""}
                    />
                  </h2>
                </div>

                <div className="mq-answer-summary">
                  <div className="mq-answer wrong">
                    <span>Your answer</span>
                    <strong>
                      {getOptionText(
                        original,
                        question.selected_answer
                      )}
                    </strong>
                  </div>

                  <div className="mq-answer correct">
                    <span>Correct answer</span>
                    <strong>
                      {getOptionText(
                        original,
                        original?.correction_answer ||
                        original?.correct_answer ||
                        question.correct_answer
                      )}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="mq-expand-btn"
                  onClick={() => toggleQuestion(question)}
                >
                  {isExpanded
                    ? "Hide full question"
                    : "View full question and options"}

                  <span>
                    {isExpanded ? "−" : "+"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="mq-full-review">
                    {questionLoading[question.id] ? (
                      <div className="mq-review-loading">
                        <div className="mq-spinner" />
                        <p>
                          Retrieving original question...
                        </p>
                      </div>
                    ) : questionErrors[question.id] ? (
                      <div className="mq-review-error">
                        <p>
                          {questionErrors[question.id]}
                        </p>

                        <button
  type="button"
  onClick={() => retryOriginalQuestion(question)}
>
  Please try again
</button>
                      </div>
                    ) : original ? (
                      <>
                        <div className="mq-original-question">
                          <span className="mq-section-label">
                            ORIGINAL QUESTION
                          </span>

                          <h3>
                            <MathText
                              text={
                                original.question_text ||
                                question.question_text ||
                                ""
                              }
                            />
                          </h3>

                          {original.image_url && (
                            <div className="mq-image-wrap">
                              <img
                                src={original.image_url}
                                alt="Original question illustration"
                                className="mq-question-image"
                                loading="lazy"
                              />
                            </div>
                          )}
                        </div>

                        <div className="mq-options-section">
                          <span className="mq-section-label">
                            ANSWER OPTIONS
                          </span>

                          <div className="mq-options-list">
                            {LETTERS.map((letter) => {
                              const option =
                                original[
                                  `option_${letter.toLowerCase()}`
                                ];

                              if (!option) return null;

                              const isSelected =
                                letter === selectedLetter;

                              const isCorrect =
                                letter === correctLetter;

                              return (
                                <div
                                  key={letter}
                                  className={[
                                    "mq-option",
                                    isSelected
                                      ? "selected-option"
                                      : "",
                                    isCorrect
                                      ? "correct-option"
                                      : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                >
                                  <span className="mq-option-letter">
                                    {letter}
                                  </span>

                                  <div className="mq-option-text">
                                    <MathText text={option} />
                                  </div>

                                  {isSelected && (
                                    <span className="mq-option-badge">
                                      Your answer
                                    </span>
                                  )}

                                  {isCorrect && (
                                    <span className="mq-option-badge">
                                      Correct
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {(original.explanation ||
                          question.explanation) && (
                          <div className="mq-explanation">
                            <span className="mq-section-label">
                              EXPLANATION
                            </span>

                            <MathText
                              text={
                                original.explanation ||
                                question.explanation
                              }
                            />
                          </div>
                        )}

                        <button
                          type="button"
                          className="mq-ai-tutor-btn"
                          onClick={() =>
                            setSelectedQuestion({
                              ...question,
                              ...original,
                              question_text:
                                original.question_text ||
                                question.question_text,
                              selected_answer:
                                question.selected_answer,
                              correct_answer:
                                correctLetter,
                              explanation:
                                original.explanation ||
                                question.explanation,
                            })
                          }
                        >
                          ✨ Study this question with AI Tutor
                        </button>
                      </>
                    ) : null}
                  </div>
                )}

                <div className="mq-card-footer">
                  <span>
                    Missed {question.times_missed || 1}{" "}
                    {(question.times_missed || 1) === 1
                      ? "time"
                      : "times"}
                  </span>

                  <div className="mq-actions">
                    <button
                      type="button"
                      disabled={updating === question.id}
                      onClick={() =>
                        changeStatus(
                          question.id,
                          "learning"
                        )
                      }
                    >
                      Learning
                    </button>

                    <button
                      type="button"
                      disabled={updating === question.id}
                      onClick={() =>
                        changeStatus(
                          question.id,
                          "mastered"
                        )
                      }
                    >
                      Mark mastered
                    </button>

                    {question.status !== "pending" && (
                      <button
                        type="button"
                        disabled={updating === question.id}
                        onClick={() =>
                          changeStatus(
                            question.id,
                            "pending"
                          )
                        }
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
