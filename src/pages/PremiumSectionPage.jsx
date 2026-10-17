
import React from "react";
import PremiumWorkspaceLayout from "./PremiumWorkspaceLayout";
import "./PremiumSectionPage.css";

function PremiumSectionPage({ section }) {
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

          <p>
            Your {section.toLowerCase()} workspace will appear here.
          </p>

          <p>
            We will connect this section to your existing Overmaths
            data in the next steps.
          </p>
        </section>
      </main>
    </PremiumWorkspaceLayout>
  );
}

export default PremiumSectionPage;
