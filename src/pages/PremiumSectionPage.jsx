
import React, { useEffect, useState } from "react";
import PremiumWorkspaceLayout from "./PremiumWorkspaceLayout";
import "./PremiumSectionPage.css";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");

function PremiumSectionPage({ section }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sectionDescriptions = {
    "My Exam":
      "Prepare for your examination and track your completed exam sessions.",

    Practice:
      "Practise questions to improve your understanding and confidence.",

    "Smart Revision":
      "Review topics and focus on areas that need improvement.",

    Challenges:
      "Take on learning challenges and test your knowledge.",

    Performance:
      "Review your scores and monitor your learning progress.",

    Achievements:
      "View the milestones you earn as you learn.",
  };

  const description =
    sectionDescriptions[section] ||
    "Explore your Premium learning tools.";

  useEffect(() => {
    if (section !== "My Exam") {
      return;
    }

    let cancelled = false;

    async function loadExams() {
      setLoading(true);
      setError("");

      try {
        const { data: { session }, error: sessionError } =
          await (
            await import("../supabaseClient")
          ).supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.access_token) {
          throw new Error("Please sign in to view your exams.");
        }

        const response = await fetch(
          `${API_BASE}/api/premium-workspace/my-exams`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "Unable to load your exams."
          );
        }

        if (!cancelled) {
          setExams(data.exams || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message || "Unable to load your exams."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadExams();

    return () => {
      cancelled = true;
    };
  }, [section]);

  return (
    <PremiumWorkspaceLayout activeSection={section}>
      <main className="premium-section-page">
        <div className="premium-section-heading">
          <p className="premium-section-label">
            OVERMATHS PREMIUM
          </p>

          <h1>{section}</h1>

          <p className="premium-section-description">
            {description}
          </p>
        </div>

        <section className="premium-section-content">
          <h2>{section}</h2>

          {section === "My Exam" ? (
            <>
              {loading && <p>Loading your exams...</p>}

              {error && (
                <p role="alert">{error}</p>
              )}

              {!loading && !error && exams.length === 0 && (
                <p>
                  You haven't created any My Exam sessions yet.
                  Your exams will appear here when you create them.
                </p>
              )}

              {!loading && !error && exams.length > 0 && (
                <div>
                  {exams.map((exam) => (
                    <article key={exam.id}>
                      <h3>
                        {exam.exam_title || "Untitled Exam"}
                      </h3>

                      <p>
                        Subjects:{" "}
                        {Array.isArray(exam.subjects)
                          ? exam.subjects.join(", ")
                          : "Not specified"}
                      </p>

                      <p>
                        Topic: {exam.selected_topic || "All topics"}
                      </p>

                      <p>
                        Score: {exam.score ?? 0} /{" "}
                        {exam.total_questions ?? 0}
                      </p>

                      <p>
                        Date:{" "}
                        {exam.exam_date
                          ? new Date(
                              exam.exam_date
                            ).toLocaleDateString()
                          : "Not scheduled"}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <p>
                Your {section.toLowerCase()} workspace will appear here.
              </p>

              <p>
                We will connect this section to your existing Overmaths
                data in the next steps.
              </p>
            </>
          )}
        </section>
      </main>
    </PremiumWorkspaceLayout>
  );
}

export default PremiumSectionPage;
