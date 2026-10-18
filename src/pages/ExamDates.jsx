
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const PRESET_EXAMS = [
  'WAEC',
  'NECO',
  'JAMB',
  'Post-UTME',
  'School Examination',
  'Custom Exam',
];

export default function ExamDates() {
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [examName, setExamName] = useState('WAEC');
  const [customName, setCustomName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadExams();
  }, []);

  async function loadExams() {
    setLoading(true);
    setMessage('');

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData?.user) {
      navigate('/login');
      return;
    }

    const { data, error } = await supabase
      .from('student_exam_dates')
      .select('id, exam_name, exam_date, is_primary, created_at')
      .eq('auth_user_id', authData.user.id)
      .order('exam_date', { ascending: true });

    if (error) {
      setMessage(`Could not load exams: ${error.message}`);
    } else {
      setExams(data || []);
    }

    setLoading(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    const name =
      examName === 'Custom Exam' ? customName.trim() : examName;

    if (!name || !examDate) {
      setMessage('Please enter an exam name and date.');
      return;
    }

    setSaving(true);

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData?.user) {
      setMessage('Please sign in again.');
      setSaving(false);
      return;
    }

    const userId = authData.user.id;

    if (editingId) {
      const { error } = await supabase
        .from('student_exam_dates')
        .update({
          exam_name: name,
          exam_date: examDate,
        })
        .eq('id', editingId)
        .eq('auth_user_id', userId);

      if (error) {
        setMessage(`Could not update exam: ${error.message}`);
      } else {
        setMessage('Exam updated successfully.');
        resetForm();
        await loadExams();
      }
    } else {
      const { error } = await supabase
        .from('student_exam_dates')
        .insert({
          auth_user_id: userId,
          exam_name: name,
          exam_date: examDate,
          is_primary: exams.length === 0,
        });

      if (error) {
        setMessage(`Could not add exam: ${error.message}`);
      } else {
        setMessage('Exam added successfully.');
        resetForm();
        await loadExams();
      }
    }

    setSaving(false);
  }

  function startEditing(exam) {
    setEditingId(exam.id);
    setExamDate(exam.exam_date);

    if (PRESET_EXAMS.includes(exam.exam_name)) {
      setExamName(exam.exam_name);
      setCustomName('');
    } else {
      setExamName('Custom Exam');
      setCustomName(exam.exam_name);
    }

    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    setExamName('WAEC');
    setCustomName('');
    setExamDate('');
  }

  async function makePrimary(exam) {
    setMessage('');

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData?.user) {
      setMessage('Please sign in again.');
      return;
    }

    const userId = authData.user.id;

    // Remove the current primary selection first.
    const { error: clearError } = await supabase
      .from('student_exam_dates')
      .update({ is_primary: false })
      .eq('auth_user_id', userId)
      .eq('is_primary', true);

    if (clearError) {
      setMessage(`Could not change primary exam: ${clearError.message}`);
      return;
    }

    const { error } = await supabase
      .from('student_exam_dates')
      .update({ is_primary: true })
      .eq('id', exam.id)
      .eq('auth_user_id', userId);

    if (error) {
      setMessage(`Could not select primary exam: ${error.message}`);
      await loadExams();
      return;
    }

    setMessage(`${exam.exam_name} is now your primary exam.`);
    await loadExams();
  }

  async function deleteExam(exam) {
    const confirmed = window.confirm(
      `Delete ${exam.exam_name} and its exam date?`
    );

    if (!confirmed) return;

    setMessage('');

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData?.user) {
      setMessage('Please sign in again.');
      return;
    }

    const { error } = await supabase
      .from('student_exam_dates')
      .delete()
      .eq('id', exam.id)
      .eq('auth_user_id', authData.user.id);

    if (error) {
      setMessage(`Could not delete exam: ${error.message}`);
      return;
    }

    setMessage('Exam deleted successfully.');
    if (editingId === exam.id) resetForm();
    await loadExams();
  }

  return (
    <main style={styles.page}>
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        style={styles.backButton}
      >
        ← Back to Dashboard
      </button>

      <h1 style={styles.heading}>My Exam Dates</h1>
      <p style={styles.subtitle}>
        Manage your examination dates and choose which exam to focus on.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.formHeading}>
          {editingId ? 'Edit Exam' : 'Add an Exam'}
        </h2>

        <label style={styles.label} htmlFor="examName">
          Examination
        </label>

        <select
          id="examName"
          value={examName}
          onChange={(event) => setExamName(event.target.value)}
          style={styles.input}
        >
          {PRESET_EXAMS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {examName === 'Custom Exam' && (
          <>
            <label style={styles.label} htmlFor="customName">
              Custom examination name
            </label>
            <input
              id="customName"
              type="text"
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder="e.g. University Entrance Exam"
              style={styles.input}
              maxLength={100}
            />
          </>
        )}

        <label style={styles.label} htmlFor="examDate">
          Examination date
        </label>

        <input
          id="examDate"
          type="date"
          value={examDate}
          onChange={(event) => setExamDate(event.target.value)}
          style={styles.input}
          required
        />

        <div style={styles.actions}>
          <button type="submit" disabled={saving} style={styles.primaryButton}>
            {saving
              ? 'Saving...'
              : editingId
                ? 'Save Changes'
                : 'Add Exam'}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              style={styles.secondaryButton}
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {message && <p role="status" style={styles.message}>{message}</p>}

      <section style={styles.listSection}>
        <h2 style={styles.listHeading}>Your Examinations</h2>

        {loading ? (
          <p>Loading your exams...</p>
        ) : exams.length === 0 ? (
          <p>You have not added any exams yet.</p>
        ) : (
          exams.map((exam) => (
            <article key={exam.id} style={styles.examCard}>
              <div style={styles.examInfo}>
                <h3 style={styles.examName}>{exam.exam_name}</h3>
                <p style={styles.examDate}>
                  {new Date(`${exam.exam_date}T00:00:00`).toLocaleDateString(
                    'en-GB',
                    {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }
                  )}
                </p>

                {exam.is_primary && (
                  <span style={styles.primaryBadge}>Primary Exam</span>
                )}
              </div>

              <div style={styles.cardActions}>
                {!exam.is_primary && (
                  <button
                    type="button"
                    onClick={() => makePrimary(exam)}
                    style={styles.secondaryButton}
                  >
                    Set as Primary
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => startEditing(exam)}
                  style={styles.secondaryButton}
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => deleteExam(exam)}
                  style={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

const styles = {
  page: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '32px 20px',
    color: '#172033',
    fontFamily: 'Arial, sans-serif',
  },
  backButton: {
    border: 'none',
    background: 'transparent',
    color: '#3457d5',
    cursor: 'pointer',
    fontSize: '15px',
    marginBottom: '20px',
  },
  heading: {
    fontSize: '30px',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#64748b',
    marginBottom: '28px',
    lineHeight: 1.6,
  },
  form: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '24px',
    marginBottom: '24px',
  },
  formHeading: {
    marginTop: 0,
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontWeight: 600,
    marginBottom: '8px',
    marginTop: '16px',
  },
  input: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '15px',
    background: '#ffffff',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '20px',
  },
  primaryButton: {
    background: '#3457d5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '11px 16px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  secondaryButton: {
    background: '#f1f5f9',
    color: '#172033',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '9px 12px',
    cursor: 'pointer',
  },
  deleteButton: {
    background: '#fff1f2',
    color: '#be123c',
    border: '1px solid #fecdd3',
    borderRadius: '8px',
    padding: '9px 12px',
    cursor: 'pointer',
  },
  message: {
    background: '#eff6ff',
    borderRadius: '8px',
    padding: '12px',
    lineHeight: 1.5,
  },
  listSection: {
    marginTop: '28px',
  },
  listHeading: {
    marginBottom: '16px',
  },
  examCard: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '18px',
    marginBottom: '12px',
  },
  examInfo: {
    flex: '1 1 180px',
  },
  examName: {
    margin: '0 0 8px',
  },
  examDate: {
    color: '#64748b',
    margin: '0 0 10px',
  },
  primaryBadge: {
    display: 'inline-block',
    background: '#dcfce7',
    color: '#166534',
    padding: '5px 9px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 700,
  },
  cardActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
};
