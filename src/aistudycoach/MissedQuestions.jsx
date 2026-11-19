
import { useEffect, useState } from "react";
import {
  getMissedQuestions,
  updateMissedQuestionStatus,
} from "./missedQuestionsService";
import "./MissedQuestions.css";

export default function MissedQuestions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(null);

  async function loadQuestions() {
    try {
      setLoading(true);
      setError("");

      const data = await getMissedQuestions();
      setQuestions(data);
    } catch {
      setError("We couldn't load your missed questions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuestions();
  }, []);

  async function changeStatus(id, status) {
    try {
      setUpdating(id);

      const updated = await updateMissedQuestionStatus(id, status);

      setQuestions((previous) =>
        previous.map((question) =>
          question.id === id ? updated : question
        )
      );
    } catch {
      setError("Unable to update this question. Please try again.");
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
      <div className="mq-page">
        <p>Loading your missed questions...</p>
      </div>
    );
  }

  return (
    <main className="mq-page">
      <header className="mq-header">
        <span className="mq-eyebrow">AI STUDY COACH</span>
        <h1>My Missed Questions</h1>
        <p>
          Learn from your mistakes and turn your weak areas
          into strengths.
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

      {error && <div className="mq-error">{error}</div>}

      {questions.length === 0 ? (
        <section className="mq-empty">
          <div className="mq-empty-icon">🎯</div>
          <h2>No missed questions yet!</h2>
          <p>
            When you answer a quiz question incorrectly,
            it will automatically appear here.
          </p>
        </section>
      ) : (
        <section className="mq-question-list">
          {questions.map((question) => (
            <article className="mq-question-card" key={question.id}>
              <div className="mq-card-top">
                <div>
                  <span className="mq-subject">
                    {question.subject || "General"}
                  </span>
                  <span className="mq-topic">
                    {question.topic || "Uncategorised"}
                  </span>
                </div>

                <span className={`mq-status ${question.status}`}>
                  {question.status}
                </span>
              </div>

              <h2>{question.question_text}</h2>

              <div className="mq-answer wrong">
                <strong>Your answer</strong>
                <p>{question.selected_answer || "Not recorded"}</p>
              </div>

              <div className="mq-answer correct">
                <strong>Correct answer</strong>
                <p>{question.correct_answer || "Not available"}</p>
              </div>

              {question.explanation && (
                <div className="mq-explanation">
                  <strong>Explanation</strong>
                  <p>{question.explanation}</p>
                </div>
              )}

              <div className="mq-card-footer">
                <span>
                  Missed {question.times_missed}{" "}
                  {question.times_missed === 1 ? "time" : "times"}
                </span>

                <div className="mq-actions">
                  <button
                    disabled={updating === question.id}
                    onClick={() =>
                      changeStatus(question.id, "learning")
                    }
                  >
                    Learning
                  </button>

                  <button
                    disabled={updating === question.id}
                    onClick={() =>
                      changeStatus(question.id, "mastered")
                    }
                  >
                    Mark mastered
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
