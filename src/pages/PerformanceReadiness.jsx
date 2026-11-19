
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import "./PerformanceReadiness.css";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5050"
).replace(/\/$/, "");

const number = (value, digits = 1) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : "0";
};

const getValue = (item, keys, fallback = 0) => {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null) {
      return item[key];
    }
  }
  return fallback;
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (seconds) => {
  const value = Number(seconds) || 0;
  if (value < 60) return `${value}s`;
  const minutes = Math.floor(value / 60);
  const remaining = value % 60;
  return remaining ? `${minutes}m ${remaining}s` : `${minutes}m`;
};

function MetricCard({ label, value, detail, icon, tone = "" }) {
  return (
    <div className={`pr-metric-card ${tone}`}>
      <div className="pr-metric-top">
        <span className="pr-metric-label">{label}</span>
        <span className="pr-metric-icon">{icon}</span>
      </div>
      <div className="pr-metric-value">{value}</div>
      <div className="pr-metric-detail">{detail}</div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="pr-section-heading">
      <div>
        {eyebrow && <div className="pr-eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function PerformanceReadiness() {
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePeriod, setActivePeriod] = useState("recent");
  const [chartPage, setChartPage] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPerformance() {
      try {
        setLoading(true);
        setError("");

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session?.access_token) {
          throw new Error("Your login session could not be found. Please log in again.");
        }

        const response = await fetch(
          `${API_BASE}/api/performance-readiness/summary`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to retrieve your performance data."
          );
        }

        if (!cancelled) setPerformance(result.data);
      } catch (err) {
        console.error("Performance Readiness Error:", err);
        if (!cancelled) {
          setError(err.message || "Something went wrong while loading your data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPerformance();

    return () => {
      cancelled = true;
    };
  }, []);

  const attempts = performance?.attempt_history || [];
  const overview = performance?.overview || {};
  const readiness = performance?.readiness || {};
  const consistency = performance?.learning_consistency || {};
  const trend = performance?.performance_trend || {};
  const achievements = performance?.achievements || [];
  const mistakes = performance?.repeated_mistakes || [];
  const subjects = performance?.subjects || [];
  const difficulty = performance?.difficulty || [];
  const notes = performance?.data_notes || [];

  const chartAttempts = useMemo(() => {
    const list = [...attempts].reverse();
    return activePeriod === "recent" ? list.slice(-10) : list;
  }, [attempts, activePeriod]);


  // Show seven quiz attempts per chart page.
const CHART_PAGE_SIZE = 7;

const chartPageCount = Math.ceil(
  chartAttempts.length / CHART_PAGE_SIZE
);

const visibleChartAttempts = chartAttempts.slice(
  chartPage * CHART_PAGE_SIZE,
  (chartPage + 1) * CHART_PAGE_SIZE
);

useEffect(() => {
  setChartPage(0);
}, [activePeriod]);

  const maxAccuracy = Math.max(
    100,
    ...chartAttempts.map((item) => Number(item.accuracy) || 0)
  );

  const readinessScore = Math.max(
    0,
    Math.min(100, Number(readiness.score) || 0)
  );

  const readinessStatus = readiness.status || "not_available";

  const readinessLabel = {
    needs_attention: "Needs attention",
    developing: "Developing",
    good: "Good progress",
    excellent: "Excellent",
  }[readinessStatus] || "Building your profile";

  const activeDays = Number(consistency.active_days_last_30) || 0;
  const streak = Number(consistency.current_streak) || 0;

  if (loading) {
    return (
      <div className="pr-page">
        <div className="pr-loading">
          <div className="pr-spinner" />
          <h2>Preparing your learning dashboard</h2>
          <p>Gathering your recorded quiz and learning data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pr-page">
        <div className="pr-error">
          <div className="pr-error-icon">!</div>
          <h2>We couldn't load your performance data</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="pr-page">
      <header className="pr-hero">
        <div className="pr-hero-content">
          <div className="pr-hero-kicker">
            <span className="pr-live-dot" />
            YOUR LEARNING JOURNEY
          </div>
          <h1>Performance &amp; Readiness</h1>
          <p>
            Understand your progress, discover what needs attention, and
            prepare more intelligently for your examinations.
          </p>
          <div className="pr-hero-meta">
            <span>✦ Personal academic dashboard</span>
            <span>•</span>
            <span>{Number(overview.total_attempts) || 0} recorded quizzes</span>
          </div>
        </div>
        <div className="pr-hero-decoration" aria-hidden="true">
          <div className="pr-orbit pr-orbit-one" />
          <div className="pr-orbit pr-orbit-two" />
          <div className="pr-hero-star">✦</div>
        </div>
      </header>

      <section className="pr-metrics-grid">
        <MetricCard
          label="Overall accuracy"
          value={`${number(overview.accuracy)}%`}
          detail="Across your recorded answers"
          icon="◎"
          tone="pr-metric-purple"
        />
        <MetricCard
          label="Questions attempted"
          value={Number(overview.total_questions) || 0}
          detail={`${Number(overview.answered_questions) || 0} answered`}
          icon="▤"
          tone="pr-metric-blue"
        />
        <MetricCard
          label="Correct answers"
          value={Number(overview.correct_answers) || 0}
          detail={`${Number(overview.incorrect_answers) || 0} incorrect answers`}
          icon="✓"
          tone="pr-metric-green"
        />
        <MetricCard
          label="Unanswered"
          value={Number(overview.unanswered_questions) || 0}
          detail={`${number(overview.completion_rate)}% completion rate`}
          icon="◷"
          tone="pr-metric-orange"
        />
      </section>

      <section className="pr-main-grid">
        <div className="pr-panel pr-readiness-panel">
          <SectionHeading
            eyebrow="YOUR CURRENT POSITION"
            title="Examination readiness"
            description="An estimate based on your recent performance and learning consistency."
          />
          <div className="pr-readiness-content">
            <div
              className="pr-readiness-ring"
              style={{ "--readiness": `${readinessScore}%` }}
            >
              <div className="pr-readiness-ring-inner">
                <strong>{number(readinessScore)}%</strong>
                <span>Readiness</span>
              </div>
            </div>
            <div className="pr-readiness-copy">
              <span className={`pr-status pr-status-${readinessStatus}`}>
                {readinessLabel}
              </span>
              <h3>Your preparation is developing.</h3>
              <p>
                Use your topic weaknesses and revision priorities to decide
                what to study next. This score is an estimate, not a guarantee
                of examination success.
              </p>
            </div>
          </div>
          {Array.isArray(readiness.based_on) && readiness.based_on.length > 0 && (
            <div className="pr-based-on">
              <strong>What contributes to this estimate</strong>
              {readiness.based_on.map((item, index) => (
                <div key={index}>• {item}</div>
              ))}
            </div>
          )}
        </div>

        <div className="pr-panel pr-consistency-panel">
          <SectionHeading
            eyebrow="BUILD YOUR ROUTINE"
            title="Learning consistency"
            description="Your recorded learning activity."
          />
          <div className="pr-consistency-stats">
            <div>
              <strong>{activeDays}</strong>
              <span>Active days in last 30 days</span>
            </div>
            <div>
              <strong>{streak}</strong>
              <span>Current learning streak</span>
            </div>
          </div>
          <div className="pr-calendar-label">
            <span>Recent activity</span>
            <span>Last 14 recorded days</span>
          </div>
          <div className="pr-activity-calendar">
            {(consistency.daily_activity || []).slice(-14).map((day) => (
              <div className="pr-activity-day" key={day.date}>
                <div
                  className={`pr-activity-cell ${day.active ? "active" : ""}`}
                  title={`${day.date}: ${day.attempts} quiz attempts`}
                >
                  {day.active ? day.attempts : ""}
                </div>
                <span>
                  {new Date(`${day.date}T00:00:00`).toLocaleDateString("en", {
                    weekday: "short",
                  }).slice(0, 1)}
                </span>
              </div>
            ))}
          </div>
          <p className="pr-small-note">
            Each active day represents at least one recorded quiz attempt.
          </p>
        </div>
      </section>

      <section className="pr-panel pr-trend-panel">
        <SectionHeading
          eyebrow="YOUR PROGRESS OVER TIME"
          title="Performance trend"
          description="Accuracy recorded in your completed quizzes."
          action={
            <div className="pr-period-switch">
              <button
                className={activePeriod === "recent" ? "selected" : ""}
                onClick={() => setActivePeriod("recent")}
              >
                Recent 10
              </button>
              <button
                className={activePeriod === "all" ? "selected" : ""}
                onClick={() => setActivePeriod("all")}
              >
                All attempts
              </button>
            </div>
          }
        />
        <div className="pr-trend-summary">
          <div>
            <strong>
              {trend.change > 0 ? "+" : ""}
              {number(trend.change)}%
            </strong>
            <span>
              {trend.status === "improving"
                ? "Improving compared with your previous average"
                : trend.status === "declining"
                ? "Below your previous average"
                : "Recent performance comparison"}
            </span>
          </div>
          <div className="pr-trend-averages">
            <span>Recent average: <strong>{number(trend.recent_average)}%</strong></span>
            <span>Previous average: <strong>{number(trend.previous_average)}%</strong></span>
          </div>
        </div>
        
{chartAttempts.length > 0 ? (
  <>
    <div className="pr-chart-navigation">
      <button
        type="button"
        disabled={chartPage === 0}
        onClick={() => setChartPage((page) => Math.max(0, page - 1))}
      >
        ← Previous
      </button>

      <span>
        {chartPage + 1} of {Math.max(1, chartPageCount)}
        <small>
          Showing {chartPage * CHART_PAGE_SIZE + 1}–
          {Math.min(
            (chartPage + 1) * CHART_PAGE_SIZE,
            chartAttempts.length
          )} of {chartAttempts.length} quizzes
        </small>
      </span>

      <button
        type="button"
        disabled={chartPage >= chartPageCount - 1}
        onClick={() =>
          setChartPage((page) =>
            Math.min(chartPageCount - 1, page + 1)
          )
        }
      >
        Next →
      </button>
    </div>

    <div className="pr-chart" key={`${activePeriod}-${chartPage}`}>
      <div className="pr-chart-grid">
        {[100, 75, 50, 25, 0].map((value) => (
          <div className="pr-chart-line" key={value}>
            <span>{value}%</span>
            <div />
          </div>
        ))}
      </div>

      <div className="pr-chart-bars">
        {visibleChartAttempts.map((attempt, index) => {
          const accuracy = Math.max(
            0,
            Math.min(100, Number(attempt.accuracy) || 0)
          );

          const date = attempt.date
            ? new Date(attempt.date)
            : null;

          const validDate =
            date && !Number.isNaN(date.getTime());

          return (
            <div
              className="pr-chart-column"
              key={attempt.attempt_id || index}
            >
              <div className="pr-chart-bar-wrap">
                <div
                  className="pr-chart-bar"
                  style={{ height: `${accuracy}%` }}
                  title={`${number(accuracy)}% accuracy`}
                />
              </div>

              <span
                className="pr-chart-date visible"
                title={formatDate(attempt.date)}
              >
                {validDate
                  ? date.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "Date unavailable"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  </>
) : (
  <div className="pr-empty">
    Your performance chart will appear after completed quizzes.
  </div>
)}

      </section>

      <section className="pr-two-column">
        <div className="pr-panel">
          <SectionHeading
            eyebrow="SUBJECT INSIGHT"
            title="Subject performance"
            description="See how you are performing across your subjects."
          />
          {subjects.length > 0 ? (
            <div className="pr-subject-list">
              {subjects.slice(0, 8).map((subject, index) => {
                const name = getValue(subject, ["subject", "name", "subject_name"], "Subject");
                const accuracy = Math.max(0, Math.min(100, Number(getValue(subject, ["accuracy", "percentage"], 0))));
                return (
                  <div className="pr-subject-row" key={`${name}-${index}`}>
                    <div className="pr-subject-info">
                      <strong>{name}</strong>
                      <span>{getValue(subject, ["correct"], 0)} correct · {getValue(subject, ["total_questions", "total"], 0)} questions</span>
                    </div>
                    <div className="pr-subject-progress">
                      <div className="pr-progress-track">
                        <div style={{ width: `${accuracy}%` }} />
                      </div>
                      <strong>{number(accuracy)}%</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="pr-empty">
              Subject breakdown is not available yet. Complete quizzes with
              matching question-bank records to build this section.
            </div>
          )}
        </div>

        <div className="pr-panel">
          <SectionHeading
            eyebrow="REVISION INTELLIGENCE"
            title="Priority areas"
            description="Questions you have answered incorrectly more than once."
          />
          {mistakes.length > 0 ? (
            <div className="pr-mistake-list">
              {mistakes.slice(0, 6).map((mistake) => (
                <div className="pr-mistake-item" key={mistake.question_id}>
                  <div className="pr-mistake-icon">!</div>
                  <div className="pr-mistake-copy">
                    <strong>{mistake.topic || "Topic not recorded"}</strong>
                    <span>{mistake.subject || "Subject not recorded"}</span>
                    <small>
                      Incorrect {mistake.incorrect_attempts} times out of {mistake.total_attempts} attempts
                    </small>
                  </div>
                  <span className="pr-mistake-count">
                    {mistake.incorrect_attempts}×
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="pr-empty">
              No repeated mistakes have been identified in the available records.
            </div>
          )}
        </div>
      </section>

      <section className="pr-two-column">
        <div className="pr-panel">
          <SectionHeading
            eyebrow="RECOGNISING YOUR EFFORT"
            title="Achievements"
            description="Milestones unlocked through your learning activity."
          />
          {achievements.length > 0 ? (
            <div className="pr-achievement-list">
              {achievements.map((achievement) => (
                <div className="pr-achievement" key={achievement.id}>
                  <div className="pr-achievement-icon">🏆</div>
                  <div>
                    <strong>{achievement.title}</strong>
                    <span>{achievement.description}</span>
                  </div>
                  <span className="pr-unlocked">Unlocked</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="pr-empty">
              Your achievements will appear here as you reach milestones.
            </div>
          )}
        </div>

        <div className="pr-panel">
          <SectionHeading
            eyebrow="QUESTION CHALLENGE"
            title="Difficulty analysis"
            description="Accuracy by question difficulty, where difficulty data is available."
          />
          {difficulty.length > 0 ? (
            <div className="pr-difficulty-list">
              {difficulty.map((item, index) => (
                <div className="pr-difficulty-item" key={`${item.difficulty}-${index}`}>
                  <div className="pr-difficulty-top">
                    <strong>{item.difficulty || "Unspecified"}</strong>
                    <span>{number(item.accuracy)}% accuracy</span>
                  </div>
                  <div className="pr-progress-track">
                    <div style={{ width: `${Math.max(0, Math.min(100, Number(item.accuracy) || 0))}%` }} />
                  </div>
                  <small>{item.total_questions || 0} questions · {item.correct || 0} correct</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="pr-empty">
              Difficulty analysis will appear when difficulty information is available.
            </div>
          )}
        </div>
      </section>

      <section className="pr-panel">
        <SectionHeading
          eyebrow="YOUR RECENT ACTIVITY"
          title="Quiz history"
          description="A record of your latest completed practice and examination sessions."
        />
        {attempts.length > 0 ? (
          <div className="pr-table-wrap">
            <table className="pr-history-table">
              <thead>
                <tr>
                  <th>Quiz</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Score</th>
                  <th>Correct</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {attempts.slice(0, 8).map((attempt) => (
                  <tr key={attempt.attempt_id}>
                    <td>
                      <strong>
                        {attempt.exam_title ||
                          (attempt.exam_purpose === "my_exam"
                            ? "My Examination"
                            : "Practice Quiz")}
                      </strong>
                      <small>{attempt.total_questions} questions</small>
                    </td>
                    <td>{formatDate(attempt.date)}</td>
                    <td>
                      <span className={`pr-mode ${attempt.exam_purpose === "my_exam" ? "exam" : ""}`}>
                        {attempt.exam_purpose === "my_exam" ? "My Exam" : "Practice"}
                      </span>
                    </td>
                    <td><strong>{number(attempt.accuracy)}%</strong></td>
                    <td>{attempt.correct}/{attempt.total_questions}</td>
                    <td>{attempt.duration_display || formatTime(attempt.duration_seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="pr-empty">Your completed quizzes will appear here.</div>
        )}
      </section>

      <section className="pr-data-note">
        <div className="pr-data-note-icon">i</div>
        <div>
          <strong>About your academic data</strong>
          <p>
            This dashboard uses your completed quiz attempts and matching
            question-bank records. It does not invent missing information.
          </p>
          {notes.length > 0 && (
            <ul>
              {notes.map((note, index) => <li key={index}>{note}</li>)}
            </ul>
          )}
        </div>
      </section>

      <footer className="pr-footer">
        <span>OVERMATHS · YOUR LEARNING JOURNEY</span>
        <span>Keep learning. Keep improving.</span>
      </footer>
    </main>
  );
}

export default PerformanceReadiness;
