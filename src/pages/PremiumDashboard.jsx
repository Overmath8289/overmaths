
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  BookOpen,
  Brain,
  Zap,
  ChartNoAxesCombined,
  Trophy,
  Clock3,
  PencilLine,
  Flame,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Menu,
  X,
  GraduationCap,
  Sparkles,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  LogOut,
  CircleUserRound,
} from 'lucide-react';
import './PremiumDashboard.css';
import { supabase } from '../supabaseClient';
import {
  CalendarDays,
  // Keep your other existing icons here
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const NAV_ITEMS = [
  { label: 'Command Center', icon: LayoutDashboard, path: '/premium' },
  { label: 'My Exam', icon: Target, path: '/my-exam' },
  { label: 'Practice', icon: BookOpen, path: '/premium-practice' },
  { label: 'Smart Revision', icon: Brain, path: '/smart-revision' },
  { label: 'Challenges', icon: Zap, path: '/challenges' },
  { label: 'Performance', icon: ChartNoAxesCombined, path: '/performance' },
  { label: 'Achievements', icon: Trophy, path: '/achievements' },
];

function readAccessToken() {
  const directKeys = ['access_token', 'sb-access-token'];

  for (const key of directKeys) {
    const value = localStorage.getItem(key);
    if (value && value !== 'undefined' && value !== 'null') {
      try {
        const parsed = JSON.parse(value);
        if (parsed?.access_token) return parsed.access_token;
      } catch {
        return value;
      }
    }
  }

  // Supabase may store its session under a project-specific key.
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);

    if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
      try {
        const session = JSON.parse(localStorage.getItem(key) || '{}');
        if (session?.access_token) return session.access_token;
      } catch {
        // Ignore unrelated or malformed local-storage entries.
      }
    }
  }

  return null;
}

async function apiRequest(path, token) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      body?.error || body?.message || `Request failed (${response.status})`,
    );
  }

  return body;
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDisplayName(profile) {
  const name =
    profile?.nickname ||
    profile?.full_name ||
    profile?.profile?.full_name ||
    profile?.name ||
    profile?.email?.split('@')[0];

  return name ? String(name).trim().split(/\s+/)[0] : 'Student';
}

function formatNumber(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;

  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : fallback;
}

function formatPercent(value) {
  if (value === null || value === undefined || value === '') return '—';

  const number = Number(value);
  if (!Number.isFinite(number)) return '—';

  return `${Math.round(Math.max(0, Math.min(100, number)))}%`;
}

function getAccuracy(overview) {
  return (
    overview?.accuracy ??
    overview?.overall_accuracy ??
    overview?.average_accuracy ??
    null
  );
}





function getAttempts(overview) {
  return (
    overview?.attempts ??
    overview?.total_attempts ??
    overview?.exams_taken ??
    overview?.total_exams ??
    0
  );
}




function getQuestionsAnswered(overview) {
  return (
    overview?.questions_answered ??
    overview?.total_questions_answered ??
    overview?.answered_questions ??
    0
  );
}

function getStreak(overview, summary) {
  return (
    overview?.study_streak ??
    overview?.streak ??
    overview?.current_streak ??
    summary?.study_streak ??
    summary?.streak ??
    0
  );
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .map((item, index) => {
      const score = Number(
        item?.accuracy ??
          item?.score_percentage ??
          item?.percentage ??
          item?.score ??
          0,
      );

      return {
        id: item?.id ?? `${item?.date ?? item?.created_at ?? 'attempt'}-${index}`,
        label: item?.label || item?.date_label || item?.date || item?.created_at || `Test ${index + 1}`,
        score: Number.isFinite(score)
          ? Math.max(0, Math.min(100, score))
          : 0,
      };
    })
    .slice(-7);
}

function normalizeSubjects(subjects) {
  if (!Array.isArray(subjects)) return [];

  return subjects
    .map((subject, index) => {
      const accuracy = Number(
        subject?.accuracy ??
          subject?.accuracy_percentage ??
          subject?.percentage ??
          0,
      );

      return {
        id: subject?.id ?? `${subject?.subject ?? subject?.name ?? 'subject'}-${index}`,
        name: subject?.subject ?? subject?.name ?? subject?.subject_name ?? 'Subject',
        accuracy: Number.isFinite(accuracy)
          ? Math.max(0, Math.min(100, accuracy))
          : 0,
        answered: subject?.questions_answered ?? subject?.answered ?? null,
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy);
}

function toDisplayText(value, fallback = '') {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (typeof value.message === 'string' && value.message.trim()) {
      return value.message;
    }

    if (typeof value.title === 'string' && value.title.trim()) {
      return value.title;
    }
  }

  return fallback;
}




function formatDate(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}






function normalizeActivities(activities) {
  if (!Array.isArray(activities)) return [];

  return activities.slice(0, 5).map((activity, index) => {
    const subject =
      typeof activity?.subject === 'string'
        ? activity.subject.trim()
        : '';

    const topic =
      typeof activity?.topic === 'string'
        ? activity.topic.trim()
        : '';

    const mode =
      typeof activity?.mode === 'string'
        ? activity.mode.trim()
        : '';

    const score = Number(activity?.score);
    const totalQuestions = Number(activity?.total_questions);

    const hasScore =
      activity?.score !== null &&
      activity?.score !== undefined &&
      activity?.score !== '' &&
      Number.isFinite(score);

    const hasTotalQuestions =
      Number.isFinite(totalQuestions) &&
      totalQuestions > 0;

    const title =
      subject ||
      topic ||
      (mode ? mode : 'Quiz attempt');

    const detailParts = [];

    if (topic && subject && topic !== subject) {
      detailParts.push(topic);
    }

    if (hasScore && hasTotalQuestions) {
      detailParts.push(
        `${score}/${totalQuestions} questions recorded`
      );
    }

    if (mode) {
      detailParts.push(mode);
    }

    return {
      id: activity?.id ?? `activity-${index}`,
      title,
      detail: detailParts.join(' · ') || 'Completed quiz attempt',
      date: activity?.created_at ?? '',
      score:
        hasScore && hasTotalQuestions
          ? Math.round((score / totalQuestions) * 100)
          : null,
    };
  });
}






function StatCard({ icon: Icon, label, value, helper }) {
  return (
    <article className="premium-stat-card">
      <div className="premium-stat-top">
        <span className="stat-icon">
          <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>

      <p className="premium-stat-label">{label}</p>
      <h3 className="premium-stat-value">{value}</h3>
      <p className="premium-stat-helper">{helper}</p>
    </article>
  );
}

function PanelHeading({ eyebrow, title, action, onAction }) {
  return (
    <div className="premium-panel-heading">
      <div>
        {eyebrow && <p className="premium-eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>

      {action && (
        <button
          className="premium-text-button"
          type="button"
          onClick={onAction}
        >
          {action}
          <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function PremiumDashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('Command Center');

 
const loadDashboard = useCallback(async () => {
  setLoading(true);
  setError('');

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!session?.access_token) {
      throw new Error(
        'Your session could not be found. Please sign in again.'
      );
    }

    const token = session.access_token;

    const meResponse = await apiRequest('/api/auth/me', token);

    const currentProfile =
      meResponse?.user ??
      meResponse?.profile ??
      meResponse?.data?.user ??
      meResponse?.data ??
      meResponse;

    setProfile(currentProfile);

    const dashboardResponse = await apiRequest(
      '/api/dashboard/summary',
      token
    );

    setSummary(
      dashboardResponse?.data ??
        dashboardResponse?.summary ??
        dashboardResponse
    );
  } catch (requestError) {
    setError(
      requestError?.message ||
        'We could not load your dashboard. Please try again.'
    );
  } finally {
    setLoading(false);
  }
}, []);


  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const overview = summary?.overview ?? summary?.stats ?? {};
  const history = useMemo(
    () =>
      normalizeHistory(
  summary?.performance_history ??
    summary?.performance?.history ??
    summary?.trend ??
    [],
),
    [summary],
  );

  const subjects = useMemo(
    () =>
      normalizeSubjects(
        summary?.subject_accuracy ??
          summary?.subjects ??
          summary?.subject_performance ??
          [],
      ),
    [summary],
  );

  const activities = useMemo(
    () =>
      normalizeActivities(
        summary?.recent_activity ??
          summary?.recent_activities ??
          summary?.activities ??
          [],
      ),
    [summary],
  );

  const weaknesses = useMemo(() => {
    const values =
      summary?.weaknesses ??
      summary?.weak_areas ??
      summary?.areas_to_improve ??
      [];

    if (!Array.isArray(values)) return [];

    return values.slice(0, 3).map((item, index) => ({
      id: item?.id ?? `${item?.topic ?? item?.subject ?? 'weakness'}-${index}`,
      name:
        typeof item === 'string'
          ? item
          : item?.topic ?? item?.subject ?? item?.name ?? 'Revision topic',
      accuracy:
        typeof item === 'object'
          ? item?.accuracy ?? item?.accuracy_percentage ?? null
          : null,
    }));
  }, [summary]);

  const name = getDisplayName(profile);
  const accuracy = getAccuracy(overview);
  const attempts = getAttempts(overview);
  const questionsAnswered = getQuestionsAnswered(overview);
  const streak = getStreak(overview, summary);


  const encouragementValue =
  summary?.encouragement ?? summary?.message;

  const encouragement =
  typeof encouragementValue === 'string'
    ? encouragementValue
    : typeof encouragementValue?.message === 'string'
      ? encouragementValue.message
      : 'Every question you practise is a step towards exam confidence.';

 

  const examName =
    profile?.exam_type ||
    profile?.exam_name ||
    profile?.learning_route ||
    'Your exam journey';

 const readiness = Number(
  overview?.exam_readiness ??
    overview?.readiness ??
    overview?.readiness_percentage ??
    summary?.exam_readiness ??
    summary?.readiness ??
    0,
);

  const examDate =
    profile?.exam_date ||
    profile?.target_exam_date ||
    profile?.exam?.exam_date ||
    null;

  const daysRemaining = examDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      )
    : null;

  const handleNavigate = (item) => {
    setActiveNav(item.label);
    setSidebarOpen(false);
    navigate(item.path);
  };

  const handleSetExamDate = () => {
    navigate('/student-profile');
  };

  const handleSignOut = () => {
    navigate('/login');
  };

  if (loading) {
    return (
      <main className="premium-page premium-page-state">
        <div className="premium-state-card">
          <span className="premium-loading-icon">
            <RefreshCw size={23} strokeWidth={1.8} />
          </span>
          <h2>Preparing your dashboard</h2>
          <p>Loading your latest learning progress...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="premium-page premium-page-state">
        <div className="premium-state-card">
          <span className="premium-error-icon">
            <AlertCircle size={24} strokeWidth={1.8} />
          </span>
          <h2>We couldn't load your dashboard</h2>
          <p>{error}</p>
          <div className="premium-state-actions">
            <button
              className="premium-primary-button"
              type="button"
              onClick={loadDashboard}
            >
              <RefreshCw size={16} />
              Try again
            </button>
            <button
              className="premium-secondary-button"
              type="button"
              onClick={handleSignOut}
            >
              Back to login
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="premium-page">
      {sidebarOpen && (
        <button
          className="premium-sidebar-overlay"
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`premium-sidebar ${sidebarOpen ? 'premium-sidebar-open' : ''}`}
      >
        <div className="premium-brand">
          <div className="premium-brand-mark">
            <GraduationCap size={23} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div className="premium-brand-copy">
            <span className="premium-brand-name">
              Over<span>maths</span>
            </span>
            <span className="premium-brand-caption">PREMIUM LEARNING</span>
          </div>
          <button
            type="button"
            className="premium-sidebar-close"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={21} />
          </button>
        </div>

        <div className="premium-sidebar-section">
          <p className="premium-sidebar-label">WORKSPACE</p>

          <nav className="premium-navigation" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.label;

              return (
                <button
                  type="button"
                  key={item.label}
                  className={`premium-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavigate(item)}
                >
                  <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="premium-nav-indicator" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="premium-sidebar-bottom">
          <div className="premium-sidebar-support">
            <span className="premium-support-icon">
              <Sparkles size={18} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <strong>Keep going</strong>
              <p>Small steps. Big results.</p>
            </div>
          </div>

          <button
            type="button"
            className="premium-profile-button"
            onClick={() => navigate('/student-profile')}
          >
            <span className="premium-avatar">
              <CircleUserRound size={25} strokeWidth={1.6} />
            </span>
            <span className="premium-profile-copy">
              <strong>{name}</strong>
              <small>Premium student</small>
            </span>
            <ChevronRight size={17} />
          </button>

          <button
            type="button"
            className="premium-logout-button"
            onClick={handleSignOut}
          >
            <LogOut size={17} strokeWidth={1.8} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <section className="premium-main">
        <header className="premium-topbar">
          <button
            type="button"
            className="premium-menu-toggle"
            aria-label="Open navigation menu"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={23} strokeWidth={1.8} />
          </button>

          <div className="premium-breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>Command Center</strong>
          </div>

          <div className="premium-topbar-right">
            <span className="premium-status-dot" />
            <span className="premium-status-text">Learning space active</span>
            <span className="premium-topbar-avatar">
              <CircleUserRound size={23} strokeWidth={1.6} />
            </span>
          </div>
        </header>

        <div className="premium-dashboard-content">
          <section className="premium-welcome">
            <div>
              <p className="premium-eyebrow">
                <Sparkles size={14} strokeWidth={1.8} />
                YOUR LEARNING COMMAND CENTER
              </p>
              <h1>
                {getGreeting()}, {name}
                <span className="premium-title-period">.</span>
              </h1>
              <p className="premium-welcome-description">
                Here's your progress so far. Let's make today count.
              </p>
            </div>

            <button
              type="button"
              className="premium-date-chip"
              onClick={handleSetExamDate}
            >
              <CalendarDays size={17} strokeWidth={1.8} />
              <span>
                {daysRemaining === null
                  ? 'Set your exam date'
                  : `${daysRemaining} days to exam`}
              </span>
              <ChevronRight size={15} />
            </button>
          </section>

          <section className="premium-exam-banner">
            <div className="premium-exam-banner-content">
              <span className="premium-banner-icon">
                <GraduationCap size={23} strokeWidth={1.7} />
              </span>
              <div>
                <p className="premium-banner-label">YOUR CURRENT GOAL</p>
                <h2>{examName}</h2>
                <p>
                  {examDate
                    ? `Exam date: ${formatDate(examDate)}`
                    : 'Set your exam date to personalise your countdown.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="premium-banner-button"
              onClick={handleSetExamDate}
            >
              {examDate ? 'Update goal' : 'Set exam date'}
              <ArrowRight size={16} />
            </button>
          </section>

          <section className="premium-stats-grid" aria-label="Learning overview">
            <StatCard
              icon={Clock3}
              label="Days to exam"
              value={daysRemaining === null ? '—' : daysRemaining}
              helper={daysRemaining === null ? 'Exam date not set' : 'Keep your revision consistent'}
            />
            <StatCard
              icon={PencilLine}
              label="Questions answered"
              value={formatNumber(questionsAnswered, '0')}
              helper="Across your recorded practice"
            />
            <StatCard
              icon={Target}
              label="Exam readiness"
              value={Number.isFinite(readiness) && readiness > 0 ? formatPercent(readiness) : '—'}
              helper="Based on available progress data"
            />
            <StatCard
              icon={Flame}
              label="Practice streak"
              value={`${formatNumber(streak, '0')} ${Number(streak) === 1 ? 'day' : 'days'}`}
              helper="Build a consistent habit"
            />
          </section>

          <section className="premium-content-grid">
            <article className="premium-panel premium-mission-panel">
              <PanelHeading
                eyebrow="YOUR NEXT MOVE"
                title="Today's mission"
              />

              <div className="premium-mission">
                <div className="premium-mission-art" aria-hidden="true">
                  <div className="premium-orbit premium-orbit-one" />
                  <div className="premium-orbit premium-orbit-two" />
                  <div className="premium-mission-core">
                    <Target size={34} strokeWidth={1.5} />
                  </div>
                  <span className="premium-orbit-dot premium-orbit-dot-one" />
                  <span className="premium-orbit-dot premium-orbit-dot-two" />
                </div>

                <div className="premium-mission-copy">
                  <span className="premium-mission-tag">RECOMMENDED</span>
                  <h3>Strengthen your weakest areas</h3>
                  <p>
                    Focus on the topics that need more attention and build
                    confidence one question at a time.
                  </p>

                  <div className="premium-mission-meta">
                    <span>
                      <BookOpen size={15} />
                      Targeted practice
                    </span>
                    <span>
                      <Clock3 size={15} />
                      Self-paced
                    </span>
                  </div>

                  <button
                    type="button"
                    className="premium-primary-button"
                    onClick={() => navigate("/premium-quiz-setup")}
                  >
                    Start practising
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </article>

            <article className="premium-panel premium-accuracy-panel">
              <PanelHeading
                eyebrow="YOUR OVERVIEW"
                title="Performance snapshot"
              />

              <div className="premium-accuracy-display">
                <div className="premium-accuracy-ring">
                  <svg viewBox="0 0 120 120" role="img" aria-label={`Overall accuracy ${formatPercent(accuracy)}`}>
                    <circle
                      className="premium-ring-track"
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      strokeWidth="9"
                    />
                    <circle
                      className="premium-ring-progress"
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={`${(Math.max(0, Math.min(100, Number(accuracy) || 0)) / 100) * 301.59} 301.59`}
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                  <div className="premium-ring-center">
                    <strong>{formatPercent(accuracy)}</strong>
                    <span>Accuracy</span>
                  </div>
                </div>

                <div className="premium-accuracy-details">
                  <div className="premium-accuracy-detail">
                    <span className="premium-detail-icon">
                      <PencilLine size={17} />
                    </span>
                    <div>
                      <strong>{formatNumber(questionsAnswered, '0')}</strong>
                      <span>Questions answered</span>
                    </div>
                  </div>

                  <div className="premium-accuracy-detail">
                    <span className="premium-detail-icon">
                      <GraduationCap size={18} />
                    </span>
                    <div>
                      <strong>{formatNumber(attempts, '0')}</strong>
                      <span>Exam attempts</span>
                    </div>
                  </div>

                  <div className="premium-accuracy-detail">
                    <span className="premium-detail-icon">
                      <TrendingUp size={17} />
                    </span>
                    <div>
                      <strong>
                        {history.length > 1
                          ? `${history[history.length - 1].score >= history[history.length - 2].score ? '+' : ''}${Math.round(history[history.length - 1].score - history[history.length - 2].score)}%`
                          : '—'}
                      </strong>
                      <span>Latest score change</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="premium-data-note">
                Figures reflect the information currently recorded in your account.
              </p>
            </article>
          </section>

          <section className="premium-content-grid premium-content-grid-lower">
            <article className="premium-panel premium-history-panel">
              <PanelHeading
                eyebrow="YOUR PROGRESS"
                title="Performance history"
              />

              {history.length > 0 ? (
                <div className="premium-history-chart">
                  <div className="premium-chart-y-labels" aria-hidden="true">
                    <span>100%</span>
                    <span>75%</span>
                    <span>50%</span>
                    <span>25%</span>
                    <span>0%</span>
                  </div>

                  <div className="premium-chart-main">
                    <div className="premium-chart-grid-lines" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>

                    <div className="premium-chart-bars">
                      {history.map((item) => (
                        <div className="premium-chart-column" key={item.id}>
                          <span className="premium-chart-value">
                            {Math.round(item.score)}%
                          </span>
                          <div className="premium-chart-bar-track">
                            <div
                              className="premium-chart-bar"
                              style={{ height: `${item.score}%` }}
                              title={`${item.label}: ${Math.round(item.score)}%`}
                            />
                          </div>
                          <span className="premium-chart-label">
                            {formatDate(item.label) || item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="premium-empty-state">
                  <ChartNoAxesCombined size={27} strokeWidth={1.6} />
                  <h3>Your progress chart will appear here</h3>
                  <p>Complete a practice session to start building your history.</p>
                </div>
              )}
            </article>

            <article className="premium-panel premium-weakness-panel">
              <PanelHeading
                eyebrow="FOCUS AREAS"
                title="Needs more practice"
                action="Practise"
                onAction={() => navigate('/dashboard')}
              />

              {weaknesses.length > 0 ? (
                <div className="premium-weakness-list">
                  {weaknesses.map((item) => (
                    <div className="premium-weakness-item" key={item.id}>
                      <span className="premium-weakness-icon">
                        <Target size={17} strokeWidth={1.8} />
                      </span>
                      <div className="premium-weakness-copy">
                        <strong>{item.name}</strong>
                        <span>
                          {item.accuracy === null
                            ? 'Focus topic'
                            : `${formatPercent(item.accuracy)} accuracy`}
                        </span>
                      </div>
                      <ChevronRight size={17} />
                    </div>
                  ))}
                </div>
              ) : subjects.length > 0 ? (
                <div className="premium-weakness-list">
                  {subjects.slice(0, 3).map((subject) => (
                    <div className="premium-weakness-item" key={subject.id}>
                      <span className="premium-weakness-icon">
                        <BookOpen size={17} strokeWidth={1.8} />
                      </span>
                      <div className="premium-weakness-copy">
                        <strong>{subject.name}</strong>
                        <span>{formatPercent(subject.accuracy)} accuracy</span>
                      </div>
                      <ChevronRight size={17} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="premium-empty-state premium-empty-compact">
                  <Target size={25} strokeWidth={1.6} />
                  <h3>No focus areas yet</h3>
                  <p>Complete more questions to identify topics to work on.</p>
                </div>
              )}

              <div className="premium-coach-note">
                <Sparkles size={18} strokeWidth={1.8} />
                <p>{encouragement}</p>
              </div>
            </article>
          </section>

          <section className="premium-content-grid premium-content-grid-lower">
            <article className="premium-panel premium-subject-panel">
              <PanelHeading
                eyebrow="SUBJECT BREAKDOWN"
                title="Your subjects"
              />

              {subjects.length > 0 ? (
                <div className="premium-subject-list">
                  {subjects.slice(0, 6).map((subject) => (
                    <div className="premium-subject-row" key={subject.id}>
                      <div className="premium-subject-row-heading">
                        <span>{subject.name}</span>
                        <strong>{formatPercent(subject.accuracy)}</strong>
                      </div>
                      <div
                        className="premium-subject-track"
                        role="progressbar"
                        aria-label={`${subject.name} accuracy`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={subject.accuracy}
                      >
                        <span
                          className="premium-subject-fill"
                          style={{ width: `${subject.accuracy}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="premium-empty-state premium-empty-compact">
                  <BookOpen size={25} strokeWidth={1.6} />
                  <h3>Subject data will appear here</h3>
                  <p>Your subject breakdown will update as results are recorded.</p>
                </div>
              )}
            </article>

            <article className="premium-panel premium-activity-panel">
              <PanelHeading
                eyebrow="RECENT LEARNING"
                title="Recent activity"
                action="View all"
                onAction={() => navigate('/dashboard')}
              />

              {activities.length > 0 ? (
                <div className="premium-activity-list">
                  {activities.map((activity) => (
                    <div className="premium-activity-item" key={activity.id}>
                      <span className="premium-activity-icon">
                        <CheckCircle2 size={18} strokeWidth={1.8} />
                      </span>
                      <div className="premium-activity-copy">
                        <strong>{activity.title}</strong>
                        <span>{activity.detail}</span>
                      </div>
                      <div className="premium-activity-result">
                        {activity.score !== null && activity.score !== undefined
                          ? formatPercent(activity.score)
                          : ''}
                        <small>{formatDate(activity.date)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="premium-empty-state premium-empty-compact">
                  <Clock3 size={25} strokeWidth={1.6} />
                  <h3>No recent activity</h3>
                  <p>Your completed practice sessions will show up here.</p>
                </div>
              )}
            </article>
          </section>

          <footer className="premium-footer">
            <span>Overmaths Premium</span>
            <span className="premium-footer-separator" />
            <span>Built for better learning</span>
            <span className="premium-footer-spacer" />
            <button type="button" onClick={loadDashboard}>
              <RefreshCw size={14} />
              Refresh data
            </button>
          </footer>
        </div>
      </section>
    </main>
  );
}

export default PremiumDashboard;
