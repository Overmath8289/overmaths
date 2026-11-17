
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Trophy,
  Target,
  Sparkles,
  Clock3,
  Pencil,
  Trash2,
  Star,
  ArrowLeft,
  CheckCircle2,
  Flag,
} from 'lucide-react';

import { supabase } from '../supabaseClient';
import './ExamDates.css';

const PRESET_EXAMS = [
  'WAEC',
  'NECO',
  'JAMB',
  'Post-UTME',
  'School Examination',
  'Custom Exam',
];

const EMPTY_FORM = {
  examName: 'WAEC',
  customName: '',
  examDate: '',
  targetScore: '85',
  goalNote: '',
};

function getCountdown(date) {
  if (!date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const examDay = new Date(`${date}T00:00:00`);
  const difference = Math.ceil(
    (examDay.getTime() - today.getTime()) / 86400000
  );

  return difference;
}

function formatExamDate(date) {
  if (!date) return 'Date not set';

  return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ExamDates() {
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function showMessage(text, type = 'success') {
    setMessage(text);
    setMessageType(type);
  }

  async function getUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      navigate('/login');
      return null;
    }

    return data.user;
  }

  async function loadExams() {
    setLoading(true);

    try {
      const user = await getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('student_exam_dates')
        .select(
          'id, exam_name, exam_date, is_primary, target_score, goal_note, created_at'
        )
        .eq('auth_user_id', user.id)
        .order('exam_date', { ascending: true });

      if (error) throw error;

      setExams(data || []);
    } catch (error) {
      console.error('Exam loading error:', error);
      showMessage(error.message || 'Could not load your exams.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExams();
  }, []);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    const name =
      form.examName === 'Custom Exam'
        ? form.customName.trim()
        : form.examName;

    const score = Number(form.targetScore);

    if (!name || !form.examDate) {
      showMessage('Please enter your examination name and date.', 'error');
      return;
    }

    if (!Number.isInteger(score) || score < 1 || score > 100) {
      showMessage('Your target score must be between 1 and 100.', 'error');
      return;
    }

    setSaving(true);

    try {
      const user = await getUser();
      if (!user) return;

      const examDetails = {
        exam_name: name,
        exam_date: form.examDate,
        target_score: score,
        goal_note: form.goalNote.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('student_exam_dates')
          .update(examDetails)
          .eq('id', editingId)
          .eq('auth_user_id', user.id);

        if (error) throw error;

        showMessage('Your examination goal has been updated!');
      } else {
        const { error } = await supabase
          .from('student_exam_dates')
          .insert({
            ...examDetails,
            auth_user_id: user.id,
            is_primary: exams.length === 0,
          });

        if (error) throw error;

        showMessage('Your new examination goal has been created!');
      }

      resetForm();
      await loadExams();
    } catch (error) {
      console.error('Exam saving error:', error);
      showMessage(error.message || 'Could not save your examination.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function startEditing(exam) {
    setEditingId(exam.id);

    const isPreset = PRESET_EXAMS.includes(exam.exam_name);

    setForm({
      examName: isPreset ? exam.exam_name : 'Custom Exam',
      customName: isPreset ? '' : exam.exam_name,
      examDate: exam.exam_date || '',
      targetScore: String(exam.target_score ?? 85),
      goalNote: exam.goal_note || '',
    });

    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function makePrimary(exam) {
    setMessage('');

    try {
      const user = await getUser();
      if (!user) return;

      const { error: clearError } = await supabase
        .from('student_exam_dates')
        .update({ is_primary: false })
        .eq('auth_user_id', user.id)
        .eq('is_primary', true);

      if (clearError) throw clearError;

      const { error } = await supabase
        .from('student_exam_dates')
        .update({ is_primary: true })
        .eq('id', exam.id)
        .eq('auth_user_id', user.id);

      if (error) throw error;

      showMessage(`${exam.exam_name} is now your main exam goal!`);
      await loadExams();
    } catch (error) {
      console.error('Primary exam error:', error);
      showMessage(error.message || 'Could not change your primary exam.', 'error');
      await loadExams();
    }
  }

  async function deleteExam(exam) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${exam.exam_name}?`
    );

    if (!confirmed) return;

    try {
      const user = await getUser();
      if (!user) return;

      const { error } = await supabase
        .from('student_exam_dates')
        .delete()
        .eq('id', exam.id)
        .eq('auth_user_id', user.id);

      if (error) throw error;

      if (editingId === exam.id) resetForm();

      showMessage('Examination removed successfully.');
      await loadExams();
    } catch (error) {
      console.error('Exam deletion error:', error);
      showMessage(error.message || 'Could not delete this examination.', 'error');
    }
  }

  const primaryExam = exams.find((exam) => exam.is_primary);
  const countdown = primaryExam
    ? getCountdown(primaryExam.exam_date)
    : null;

  const completedGoals = exams.filter(
    (exam) => getCountdown(exam.exam_date) < 0
  ).length;

  return (
    <main className="exam-planner">
      <div className="exam-planner-top">
        <button
          type="button"
          className="exam-back-button"
          onClick={() => navigate('/premium')}
        >
          <ArrowLeft size={17} />
          Back to Command Center
        </button>

        <span className="exam-top-label">
          <Sparkles size={15} />
          YOUR PERSONAL EXAM PLANNER
        </span>
      </div>

      <section className="exam-hero">
        <div className="exam-hero-content">
          <span className="exam-hero-kicker">
            <Target size={15} />
            DREAM IT. PLAN IT. ACHIEVE IT.
          </span>

          <h1>
            Your goal.
            <br />
            <span>Your future.</span>
          </h1>

          <p>
            Every great result starts with a clear target.
            Choose your exam, set your dream score and give yourself
            something meaningful to work towards.
          </p>

          <button
            type="button"
            className="exam-hero-button"
            onClick={() => {
              document.getElementById('exam-goal-form')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              });
            }}
          >
            Set my exam goal
            <Target size={17} />
          </button>
        </div>

        <div className="exam-hero-art" aria-hidden="true">
          <div className="exam-art-circle exam-art-circle-one" />
          <div className="exam-art-circle exam-art-circle-two" />

          <div className="exam-trophy-card">
            <Trophy size={54} strokeWidth={1.5} />
            <span>YOUR NEXT BIG WIN</span>
            <strong>{primaryExam?.target_score ?? 85}%</strong>
            <small>Target score</small>
          </div>

          <span className="exam-art-star exam-art-star-one">✦</span>
          <span className="exam-art-star exam-art-star-two">✧</span>
        </div>
      </section>

      <section className="exam-overview">
        <article className="exam-overview-card">
          <span className="overview-icon purple">
            <CalendarDays size={21} />
          </span>
          <div>
            <p>My examinations</p>
            <strong>{exams.length}</strong>
            <small>Goals on your calendar</small>
          </div>
        </article>

        <article className="exam-overview-card">
          <span className="overview-icon orange">
            <Clock3 size={21} />
          </span>
          <div>
            <p>Days to main exam</p>
            <strong>
              {countdown === null
                ? '—'
                : countdown < 0
                  ? 'Passed'
                  : countdown}
            </strong>
            <small>
              {countdown === null
                ? 'Choose your primary exam'
                : countdown < 0
                  ? 'Update your next exam'
                  : 'Your countdown is on'}
            </small>
          </div>
        </article>

        <article className="exam-overview-card">
          <span className="overview-icon green">
            <Trophy size={21} />
          </span>
          <div>
            <p>My target score</p>
            <strong>
              {primaryExam?.target_score
                ? `${primaryExam.target_score}%`
                : '—'}
            </strong>
            <small>What you're working towards</small>
          </div>
        </article>
      </section>

      <section className="exam-planner-grid">
        <form
          id="exam-goal-form"
          className="exam-form-card"
          onSubmit={handleSubmit}
        >
          <div className="exam-section-heading">
            <span className="exam-heading-icon">
              <Flag size={20} />
            </span>
            <div>
              <span>MAKE IT PERSONAL</span>
              <h2>{editingId ? 'Update your goal' : 'Create your exam goal'}</h2>
            </div>
          </div>

          <p className="exam-form-intro">
            Tell Overmaths what you're preparing for and the result you want.
          </p>

          <label htmlFor="examName">Which examination are you preparing for?</label>

          <select
            id="examName"
            value={form.examName}
            onChange={(event) => updateForm('examName', event.target.value)}
          >
            {PRESET_EXAMS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          {form.examName === 'Custom Exam' && (
            <>
              <label htmlFor="customName">Your examination name</label>
              <input
                id="customName"
                type="text"
                value={form.customName}
                onChange={(event) => updateForm('customName', event.target.value)}
                placeholder="e.g. University Entrance Examination"
                maxLength={100}
                required
              />
            </>
          )}

          <label htmlFor="examDate">When is your examination?</label>
          <input
            id="examDate"
            type="date"
            value={form.examDate}
            onChange={(event) => updateForm('examDate', event.target.value)}
            required
          />

          <div className="target-score-heading">
            <label htmlFor="targetScore">What score are you aiming for?</label>
            <strong>{form.targetScore}%</strong>
          </div>

          <input
            id="targetScore"
            className="target-score-slider"
            type="range"
            min="1"
            max="100"
            value={form.targetScore}
            onChange={(event) => updateForm('targetScore', event.target.value)}
          />

          <div className="score-slider-labels">
            <span>1% · Starting point</span>
            <span>100% · Perfect score</span>
          </div>

          <label htmlFor="goalNote">
            Your personal motivation <span>(optional)</span>
          </label>

          <textarea
            id="goalNote"
            value={form.goalNote}
            onChange={(event) => updateForm('goalNote', event.target.value)}
            placeholder="e.g. I want to score 90% so I can study Medicine..."
            rows={3}
            maxLength={300}
          />

          <button
            type="submit"
            className="exam-submit-button"
            disabled={saving}
          >
            {saving
              ? 'Saving your goal...'
              : editingId
                ? 'Save changes'
                : 'Create my exam goal'}
            <ArrowLeft className="exam-submit-arrow" size={17} />
          </button>

          {editingId && (
            <button
              type="button"
              className="exam-cancel-button"
              onClick={resetForm}
            >
              Cancel editing
            </button>
          )}
        </form>

        <div className="exam-side-column">
          <article className="exam-countdown-card">
            <span className="countdown-label">
              <Sparkles size={15} />
              THE BIG DAY
            </span>

            {primaryExam ? (
              <>
                <h2>{primaryExam.exam_name}</h2>
                <p>{formatExamDate(primaryExam.exam_date)}</p>

                <div className="countdown-number">
                  {countdown === null
                    ? '—'
                    : countdown < 0
                      ? 'Done!'
                      : countdown}
                </div>

                <strong>
                  {countdown === null
                    ? 'Set your exam date'
                    : countdown < 0
                      ? 'Your exam date has passed'
                      : countdown === 1
                        ? 'DAY LEFT'
                        : 'DAYS LEFT'}
                </strong>

                <div className="countdown-target">
                  <Trophy size={17} />
                  Your target: {primaryExam.target_score ?? '—'}%
                </div>
              </>
            ) : (
              <div className="countdown-empty">
                <CalendarDays size={35} />
                <h2>Your countdown starts here</h2>
                <p>Add an examination and make it your primary goal.</p>
              </div>
            )}
          </article>

          <article className="exam-tip-card">
            <span><Sparkles size={18} /></span>
            <div>
              <h3>A little reminder</h3>
              <p>
                Your target score is your destination. Every practice session
                is another step towards reaching it.
              </p>
            </div>
          </article>
        </div>
      </section>

      {message && (
        <div
          className={`exam-message ${messageType}`}
          role="status"
        >
          {messageType === 'success'
            ? <CheckCircle2 size={18} />
            : <Flag size={18} />}
          {message}
        </div>
      )}

      <section className="exam-list-section">
        <div className="exam-list-heading">
          <div>
            <span>YOUR PLAN</span>
            <h2>My examinations</h2>
            <p>Keep every important examination and target in one place.</p>
          </div>
          <span className="exam-count-pill">
            {exams.length} {exams.length === 1 ? 'exam' : 'exams'}
          </span>
        </div>

        {loading ? (
          <div className="exam-empty-state">
            <CalendarDays size={30} />
            <p>Loading your examination goals...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="exam-empty-state">
            <Target size={34} />
            <h3>Your goals start with one decision.</h3>
            <p>Add your first examination and choose the score you want to achieve.</p>
          </div>
        ) : (
          <div className="exam-cards-grid">
            {exams.map((exam) => {
              const days = getCountdown(exam.exam_date);

              return (
                <article
                  className={`exam-goal-card ${exam.is_primary ? 'is-primary' : ''}`}
                  key={exam.id}
                >
                  <div className="goal-card-top">
                    <span className="goal-card-icon">
                      <Trophy size={21} />
                    </span>

                    {exam.is_primary ? (
                      <span className="primary-exam-badge">
                        <Star size={13} fill="currentColor" />
                        MAIN GOAL
                      </span>
                    ) : (
                      <span className="secondary-exam-badge">EXAM GOAL</span>
                    )}
                  </div>

                  <h3>{exam.exam_name}</h3>
                  <p className="goal-card-date">
                    <CalendarDays size={15} />
                    {formatExamDate(exam.exam_date)}
                  </p>

                  <div className="goal-score-display">
                    <div>
                      <span>TARGET SCORE</span>
                      <strong>{exam.target_score ?? '—'}%</strong>
                    </div>
                    <Target size={27} />
                  </div>

                  <div className="goal-card-countdown">
                    <Clock3 size={15} />
                    {days === null
                      ? 'Date not set'
                      : days < 0
                        ? 'Exam date has passed'
                        : days === 0
                          ? 'Your exam is today!'
                          : `${days} days remaining`}
                  </div>

                  {exam.goal_note && (
                    <p className="goal-personal-note">
                      “{exam.goal_note}”
                    </p>
                  )}

                  <div className="goal-card-actions">
                    {!exam.is_primary && (
                      <button
                        type="button"
                        onClick={() => makePrimary(exam)}
                        className="make-primary-button"
                      >
                        <Star size={14} />
                        Make main goal
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => startEditing(exam)}
                      aria-label={`Edit ${exam.exam_name}`}
                      title="Edit exam"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteExam(exam)}
                      className="goal-delete-button"
                      aria-label={`Delete ${exam.exam_name}`}
                      title="Delete exam"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
