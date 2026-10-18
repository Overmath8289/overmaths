
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './MyExam.css';
import { supabase } from '../supabaseClient';
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



  React.useEffect(() => {
  let active = true;

  async function loadTimetable() {
    setLoadingTimetable(true);
    setTimetableError('');

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error('Please log in to view your study timetable.');
      }

      const { data, error } = await supabase
        .from('student_study_timetable')
        .select('*')
        .eq('auth_user_id', user.id)
        .order('study_date', { ascending: true });

      if (error) throw error;

      if (active) {
        setTimetable(data || []);
      }
    } catch (error) {
      if (active) {
        setTimetableError(error.message || 'Could not load your timetable.');
      }
    } finally {
      if (active) {
        setLoadingTimetable(false);
      }
    }
  }

  loadTimetable();

  return () => {
    active = false;
  };
}, []);

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

        <div className="my-exam-add-task">
  <h3>Add a Study Task</h3>

  <form
    onSubmit={async (event) => {
      event.preventDefault();

      setTimetableError('');

      const form = event.currentTarget;
      const formData = new FormData(form);

      const subject = formData.get('subject')?.toString().trim();
      const studyDate = formData.get('study_date')?.toString();
      const targetQuestions = Number(formData.get('target_questions'));
      const notes = formData.get('notes')?.toString().trim() || null;

      if (!subject || !studyDate || !Number.isInteger(targetQuestions) || targetQuestions < 1) {
        setTimetableError('Enter a subject, study date, and valid question target.');
        return;
      }

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) throw new Error('Please log in before adding a study task.');

        const { data, error } = await supabase
          .from('student_study_timetable')
          .insert({
            auth_user_id: user.id,
            subject,
            study_date: studyDate,
            target_questions: targetQuestions,
            notes,
          })
          .select()
          .single();

        if (error) throw error;

        setTimetable((previous) =>
          [...previous, data].sort((a, b) =>
            a.study_date.localeCompare(b.study_date)
          )
        );

        form.reset();
      } catch (error) {
        setTimetableError(
          error.code === '23505'
            ? 'You already have a task for this subject on that date.'
            : error.message || 'Could not save your study task.'
        );
      }
    }}
  >
    <label htmlFor="study-subject">Subject</label>
    <input
      id="study-subject"
      name="subject"
      type="text"
      placeholder="e.g. Physics"
      required
    />

    <label htmlFor="study-date">Study date</label>
    <input
      id="study-date"
      name="study_date"
      type="date"
      required
    />

    <label htmlFor="study-target">Question target</label>
    <input
      id="study-target"
      name="target_questions"
      type="number"
      min="1"
      defaultValue="30"
      required
    />

    <label htmlFor="study-notes">Notes (optional)</label>
    <textarea
      id="study-notes"
      name="notes"
      placeholder="Topics to practise or reminders"
      rows="3"
    />

    <button type="submit">
      <Plus size={16} /> Save study task
    </button>
  </form>
</div>



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

        {loadingTimetable ? (
  <div className="my-exam-empty-state">
    <p>Loading your study timetable...</p>
  </div>
) : timetableError ? (
  <div className="my-exam-empty-state">
    <p>{timetableError}</p>
  </div>
) : timetable.length === 0 ? (
  <div className="my-exam-empty-state">
    <div className="my-exam-empty-icon">
      <CalendarDays size={34} />
    </div>

    <h3>Your timetable starts here</h3>

    <p>
      Your scheduled subjects and daily targets will
      appear here. Add your first study task next.
    </p>

    <span className="my-exam-coming-soon">
      <Plus size={15} /> No study tasks yet
    </span>
  </div>
) : (
  <div className="my-exam-grid">
    {timetable.map((task) => (
      <article className="my-exam-card" key={task.id}>
        <div className="my-exam-card-icon timetable-icon">
          <CalendarDays size={24} />
        </div>

        <h3>{task.subject}</h3>
        <p>Study date: {task.study_date}</p>
        <p>Target: {task.target_questions} questions</p>
        <p>Completed: {task.completed_questions} questions</p>

        {task.notes && <p>{task.notes}</p>}
      </article>
    ))}
  </div>
)}
      </section>
    </main>
  );
};



const [timetable, setTimetable] = React.useState([]);
const [loadingTimetable, setLoadingTimetable] = React.useState(true);
const [timetableError, setTimetableError] = React.useState('');

export default MyExam;
