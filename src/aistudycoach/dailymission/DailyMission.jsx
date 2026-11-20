
import React, { useState } from "react";
import "./DailyMission.css";

const SAMPLE_MISSIONS = [
  {
    id: 1,
    subject: "Biology",
    topic: "The Mammalian Ear",
    difficulty: "Needs improvement",
    questions: 5,
    duration: 10,
    progress: 0,
    icon: "🧬",
    color: "purple",
  },
  {
    id: 2,
    subject: "Physics",
    topic: "Waves and Sound",
    difficulty: "Developing",
    questions: 5,
    duration: 10,
    progress: 0,
    icon: "⚛️",
    color: "blue",
  },
];

export default function DailyMission() {
  const [missions, setMissions] = useState(SAMPLE_MISSIONS);
  const [activeMission, setActiveMission] = useState(null);

  const completedCount = missions.filter(
    (mission) => mission.progress === 100
  ).length;

  const totalQuestions = missions.reduce(
    (total, mission) => total + mission.questions,
    0
  );

  const startMission = (mission) => {
    setActiveMission(mission);
  };

  const completeMission = (missionId) => {
    setMissions((previous) =>
      previous.map((mission) =>
        mission.id === missionId
          ? { ...mission, progress: 100 }
          : mission
      )
    );

    setActiveMission(null);
  };

  return (
    <main className="daily-mission">
      <section className="dm-hero">
        <div className="dm-hero-content">
          <span className="dm-eyebrow">YOUR PERSONAL AI PLAN</span>

          <h1>Daily Mission</h1>

          <p>
            Small daily steps. Stronger knowledge. Better results.
            Your personalised learning journey starts here.
          </p>

          <div className="dm-hero-meta">
            <span>🎯 Today's learning goals</span>
            <span>⏱️ About 20 minutes</span>
          </div>
        </div>

        <div className="dm-hero-art">🚀</div>
      </section>

      <section className="dm-stats">
        <article className="dm-stat-card">
          <span className="dm-stat-icon">📚</span>
          <strong>{missions.length}</strong>
          <span>Daily missions</span>
        </article>

        <article className="dm-stat-card">
          <span className="dm-stat-icon">📝</span>
          <strong>{totalQuestions}</strong>
          <span>Practice questions</span>
        </article>

        <article className="dm-stat-card">
          <span className="dm-stat-icon">🏆</span>
          <strong>{completedCount}/{missions.length}</strong>
          <span>Completed</span>
        </article>
      </section>

      <section className="dm-section">
        <div className="dm-section-heading">
          <div>
            <span className="dm-eyebrow">PERSONALISED PRACTICE</span>
            <h2>Your learning missions</h2>
            <p>Focus on the topics that need your attention.</p>
          </div>

          <span className="dm-date">TODAY</span>
        </div>

        <div className="dm-mission-list">
          {missions.map((mission) => (
            <article
              className="dm-mission-card"
              key={mission.id}
            >
              <div className={`dm-mission-icon ${mission.color}`}>
                {mission.icon}
              </div>

              <div className="dm-mission-content">
                <div className="dm-mission-top">
                  <span>{mission.subject}</span>
                  <span className="dm-difficulty">
                    {mission.difficulty}
                  </span>
                </div>

                <h3>{mission.topic}</h3>

                <div className="dm-mission-meta">
                  <span>📝 {mission.questions} questions</span>
                  <span>⏱️ {mission.duration} minutes</span>
                </div>

                <div className="dm-progress-track">
                  <div
                    className="dm-progress-fill"
                    style={{ width: `${mission.progress}%` }}
                  />
                </div>

                <span className="dm-progress-label">
                  {mission.progress}% completed
                </span>
              </div>

              <button
                className="dm-start-button"
                disabled={mission.progress === 100}
                onClick={() => startMission(mission)}
              >
                {mission.progress === 100 ? "Completed" : "Start mission"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="dm-insight">
        <span className="dm-insight-icon">💡</span>
        <div>
          <h3>Your AI learning insight</h3>
          <p>
            Revisiting difficult topics regularly helps strengthen
            your understanding and improve long-term retention.
          </p>
        </div>
      </section>

      {activeMission && (
        <div className="dm-modal-backdrop">
          <div className="dm-modal">
            <button
              className="dm-modal-close"
              onClick={() => setActiveMission(null)}
              aria-label="Close"
            >
              ×
            </button>

            <span className="dm-eyebrow">MISSION STARTED</span>

            <h2>{activeMission.topic}</h2>

            <p>
              Your {activeMission.subject} mission is ready.
              Complete your practice session to mark this mission
              as completed.
            </p>

            <div className="dm-modal-details">
              <span>📝 {activeMission.questions} questions</span>
              <span>⏱️ {activeMission.duration} minutes</span>
            </div>

            <button
              className="dm-complete-button"
              onClick={() => completeMission(activeMission.id)}
            >
              Mark mission as completed
            </button>

            <p className="dm-demo-note">
              Demo mode: question sessions will be connected later.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
