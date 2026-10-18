
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './MyExam.css';
import {
  CalendarDays,
  BookOpen,
  Brain,
  ChartNoAxesCombined,
  Target,
  Clock,
  Plus,
  ArrowRight,
} from 'lucide-react';

const MyExam = () => {
  const navigate = useNavigate();

  return (
    <main className="my-exam-page">
      <header className="my-exam-header">
        <div>
          <p className="my-exam-label">YOUR EXAM JOURNEY</p>
          <h1>My Exam 🎯</h1>
          <p>
            Plan your study sessions, practise questions,
            and track your progress towards exam success.
          </p>
        </div>

        <div className="my-exam-header-icon">
          <Target size={38} />
        </div>
      </header>

      <section className="my-exam-welcome">
        <div>
          <span className="my-exam-label">YOUR NEXT STEP</span>
          <h2>Small steps. Big results.</h2>
          <p>
            Build a study routine and stay consistent.
            Every question you practise brings you closer
            to your goal.
          </p>
        </div>
        <BookOpen size={38} />
      </section>

      <section className="my-exam-section">
        <div className="my-exam-section-heading">
          <div>
            <h2>Your Study Centre</h2>
            <p>Everything you need to prepare for your exam.</p>
          </div>
        </div>

        <div className="my-exam-grid">
          <article className="my-exam-card">
            <div className="my-exam-card-icon timetable-icon">
              <CalendarDays size={24} />
            </div>
            <h3>Study Timetable</h3>
            <p>
              Organise your subjects by day and set your
              daily question targets.
            </p>
            <button
              type="button"
              onClick={() =>
                document.getElementById('study-timetable')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              View timetable <ArrowRight size={16} />
            </button>
          </article>

          <article className="my-exam-card">
            <div className="my-exam-card-icon revision-icon">
              <Brain size={24} />
            </div>
            <h3>Quick Revision</h3>
            <p>
              Revisit questions you missed and strengthen
              the topics you find difficult.
            </p>
            <button
              type="button"
              onClick={() => navigate('/smart-revision')}
            >
              Open revision <ArrowRight size={16} />
            </button>
          </article>

          <article className="my-exam-card">
            <div className="my-exam-card-icon performance-icon">
              <ChartNoAxesCombined size={24} />
            </div>
            <h3>My Performance</h3>
            <p>
              Review your results and see how your
              preparation is progressing.
            </p>
            <button
              type="button"
              onClick={() => navigate('/performance')}
            >
              View performance <ArrowRight size={16} />
            </button>
          </article>
        </div>
      </section>

      <section
        className="my-exam-section my-exam-timetable"
        id="study-timetable"
      >
        <div className="my-exam-section-heading">
          <div>
            <h2>My Study Timetable</h2>
            <p>
              Create a plan that works for you. Aim for at
              least 30 questions per subject, or set your
              own target.
            </p>
          </div>
          <Clock size={25} />
        </div>

        <div className="my-exam-empty-state">
          <div className="my-exam-empty-icon">
            <CalendarDays size={34} />
          </div>
          <h3>Your timetable starts here</h3>
          <p>
            Your scheduled subjects and daily targets will
            appear here. Next, we’ll connect this section
            to your database so your timetable can be saved.
          </p>
          <span className="my-exam-coming-soon">
            <Plus size={15} /> Timetable setup is next
          </span>
        </div>
      </section>
    </main>
  );
};

export default MyExam;
