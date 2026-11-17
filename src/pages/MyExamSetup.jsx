
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  FileText,
  GraduationCap,
  Plus,
  Settings2,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Shuffle,
  Eye,
  Brain,
  ListChecks,
} from "lucide-react";
import "./MyExamSetup.css";

const SUBJECT_OPTIONS = [
  { name: "Mathematics", icon: "∑", color: "purple" },
  { name: "English Language", icon: "Aa", color: "blue" },
  { name: "Physics", icon: "⚛", color: "cyan" },
  { name: "Chemistry", icon: "⚗", color: "green" },
  { name: "Biology", icon: "🧬", color: "pink" },
  { name: "Further Mathematics", icon: "ƒ", color: "orange" },
  { name: "Economics", icon: "₦", color: "green" },
  { name: "Government", icon: "§", color: "blue" },
  { name: "Geography", icon: "🌍", color: "cyan" },
  { name: "Computer Science", icon: "⌘", color: "purple" },
];

const DEFAULT_ENVIRONMENT = {
  shuffleQuestions: true,
  shuffleOptions: false,
  allowQuestionNavigation: true,
  allowReview: true,
  showTimer: true,
  showProgress: true,
  explanationsAfterSubmission: true,
};

const makeSubject = (name) => ({
  subject: name,
  question_count: 20,
  difficulty: "mixed",
  topics: "",
});

export default function MyExamSetup() {
  const navigate = useNavigate();

  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [targetScore, setTargetScore] = useState("70");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [subjects, setSubjects] = useState([]);
  const [subjectInput, setSubjectInput] = useState("");
  const [environment, setEnvironment] = useState(DEFAULT_ENVIRONMENT);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("subjects");

  const totalQuestions = useMemo(
    () =>
      subjects.reduce(
        (total, subject) => total + Number(subject.question_count || 0),
        0
      ),
    [subjects]
  );

  const updateSubject = (name, field, value) => {
    setSubjects((current) =>
      current.map((item) =>
        item.subject === name ? { ...item, [field]: value } : item
      )
    );
  };

  const addSubject = (name) => {
    const cleanName = name.trim();

    if (!cleanName) return;

    if (
      subjects.some(
        (item) => item.subject.toLowerCase() === cleanName.toLowerCase()
      )
    ) {
      setError(`${cleanName} has already been selected.`);
      return;
    }

    if (subjects.length >= 10) {
      setError("You can select a maximum of 10 subjects.");
      return;
    }

    setSubjects((current) => [...current, makeSubject(cleanName)]);
    setSubjectInput("");
    setError("");
  };

  const removeSubject = (name) => {
    setSubjects((current) =>
      current.filter((item) => item.subject !== name)
    );
    setError("");
  };

  const toggleEnvironment = (key) => {
    setEnvironment((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (!examTitle.trim()) {
      setError("Please give your examination a title.");
      return;
    }

    if (!subjects.length) {
      setError("Select at least one subject.");
      setActiveSection("subjects");
      return;
    }

    if (
      subjects.some(
        (item) =>
          !Number.isInteger(Number(item.question_count)) ||
          Number(item.question_count) < 1
      )
    ) {
      setError("Every selected subject must have at least one question.");
      return;
    }

    if (totalQuestions > 100) {
      setError("Your total question allocation cannot exceed 100.");
      return;
    }

    const duration = Number(durationMinutes);

    if (!Number.isInteger(duration) || duration < 1 || duration > 180) {
      setError("Choose an examination duration between 1 and 180 minutes.");
      return;
    }

    const allocations = subjects.map((item) => ({
      subject: item.subject,
      question_count: Number(item.question_count),
      difficulty: item.difficulty,
      topics: item.topics
        .split(",")
        .map((topic) => topic.trim())
        .filter(Boolean),
    }));

    navigate("/premium-quiz", {
      state: {
        examPurpose: "my_exam",
        exam_purpose: "my_exam",
        examTitle: examTitle.trim(),
        exam_title: examTitle.trim(),
        examDate: examDate || null,
        exam_date: examDate || null,

        subjects: allocations.map((item) => item.subject),
        subject: allocations[0].subject,
        subjectAllocations: allocations,
        subject_allocations: allocations,

        questionCount: totalQuestions,
        question_count: totalQuestions,
        durationMinutes: duration,
        duration_minutes: duration,

        targetScore: Number(targetScore),
        target_score: Number(targetScore),

        difficulty:
          allocations.every((item) => item.difficulty === allocations[0].difficulty)
            ? allocations[0].difficulty
            : "mixed",

        mode: "examination",
        isExamMode: true,

        examEnvironment: environment,
        exam_environment: environment,
      },
    });
  };

  const environmentOptions = [
    {
      key: "shuffleQuestions",
      title: "Shuffle questions",
      description: "Show questions in a different order.",
      icon: Shuffle,
    },
    {
      key: "shuffleOptions",
      title: "Shuffle answer options",
      description: "Mix the order of multiple-choice answers.",
      icon: ListChecks,
    },
    {
      key: "allowQuestionNavigation",
      title: "Free question navigation",
      description: "Move between questions whenever you want.",
      icon: ArrowRight,
    },
    {
      key: "allowReview",
      title: "Review before submission",
      description: "Return to questions before finishing.",
      icon: Eye,
    },
    {
      key: "showTimer",
      title: "Display examination timer",
      description: "Keep the remaining time visible.",
      icon: Clock3,
    },
    {
      key: "showProgress",
      title: "Display progress",
      description: "See how many questions you have answered.",
      icon: Target,
    },
    {
      key: "explanationsAfterSubmission",
      title: "Show explanations after submission",
      description: "Learn from your answers after the exam.",
      icon: Brain,
    },
  ];

  return (
    <main className="my-exam-setup">
      <div className="my-exam-setup__container">

        <button
          type="button"
          className="my-exam-setup__back"
          onClick={() => navigate("/my-exam")}
        >
          <ArrowLeft size={17} />
          Back to My Exam
        </button>

        <header className="my-exam-setup__header">
          <div className="my-exam-setup__eyebrow">
            <Sparkles size={15} />
            YOUR EXAM. YOUR RULES.
          </div>

          <h1>Create your <span>exam experience.</span></h1>

          <p>
            Build an examination that matches your goals.
            Choose your subjects, set your own targets and
            personalise the way you want to take your exam.
          </p>

          <div className="my-exam-setup__hero-stats">
            <div>
              <GraduationCap size={19} />
              <span>Personalised learning</span>
            </div>
            <div>
              <Target size={19} />
              <span>Your own targets</span>
            </div>
            <div>
              <Trophy size={19} />
              <span>Progress towards success</span>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit}>

          <div className="my-exam-setup__workspace">

            <div className="my-exam-setup__main">

              <section
                className="my-exam-setup__panel"
                id="exam-details"
              >
                <div className="my-exam-setup__section-heading">
                  <div className="my-exam-setup__section-icon">
                    <FileText size={21} />
                  </div>
                  <div>
                    <span>STEP 01</span>
                    <h2>Give your exam an identity</h2>
                    <p>Set a name and define your examination goal.</p>
                  </div>
                </div>

                <div className="my-exam-setup__field">
                  <label htmlFor="exam-title">Examination title</label>
                  <input
                    id="exam-title"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder="e.g. My WAEC Preparation Exam"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="my-exam-setup__two-columns">
                  <div className="my-exam-setup__field">
                    <label htmlFor="exam-date">
                      <CalendarDays size={16} />
                      Actual exam date (optional)
                    </label>
                    <input
                      id="exam-date"
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                    />
                  </div>

                  <div className="my-exam-setup__field">
                    <label htmlFor="target-score">
                      <Target size={16} />
                      My target score
                    </label>
                    <div className="my-exam-setup__input-suffix">
                      <input
                        id="target-score"
                        type="number"
                        min="1"
                        max="100"
                        value={targetScore}
                        onChange={(e) => setTargetScore(e.target.value)}
                      />
                      <span>%</span>
                    </div>
                  </div>
                </div>
              </section>

              <section
                className="my-exam-setup__panel"
                id="exam-subjects"
              >
                <div className="my-exam-setup__section-heading">
                  <div className="my-exam-setup__section-icon">
                    <BookOpen size={21} />
                  </div>
                  <div>
                    <span>STEP 02</span>
                    <h2>Choose your subjects</h2>
                    <p>
                      Select as many subjects as you need.
                      You can customise each one separately.
                    </p>
                  </div>
                </div>

                <div className="my-exam-setup__subject-library">
                  {SUBJECT_OPTIONS.filter(
                    (item) =>
                      !subjects.some(
                        (selected) =>
                          selected.subject.toLowerCase() ===
                          item.name.toLowerCase()
                      )
                  ).map((item) => (
                    <button
                      type="button"
                      key={item.name}
                      className={`my-exam-setup__subject-option ${item.color}`}
                      onClick={() => addSubject(item.name)}
                    >
                      <span className="my-exam-setup__subject-symbol">
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                      <Plus size={16} />
                    </button>
                  ))}
                </div>

                <div className="my-exam-setup__custom-subject">
                  <input
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSubject(subjectInput);
                      }
                    }}
                    placeholder="Add another subject..."
                    aria-label="Custom subject name"
                  />
                  <button
                    type="button"
                    onClick={() => addSubject(subjectInput)}
                  >
                    <Plus size={17} />
                    Add subject
                  </button>
                </div>

                {subjects.length > 0 && (
                  <div className="my-exam-setup__selected">
                    <div className="my-exam-setup__selected-heading">
                      <strong>Your selected subjects</strong>
                      <span>{subjects.length} selected</span>
                    </div>

                    {subjects.map((item, index) => (
                      <div
                        className="my-exam-setup__allocation"
                        key={item.subject}
                      >
                        <div className="my-exam-setup__allocation-top">
                          <div className="my-exam-setup__allocation-name">
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            <strong>{item.subject}</strong>
                          </div>

                          <button
                            type="button"
                            className="my-exam-setup__remove"
                            onClick={() => removeSubject(item.subject)}
                            aria-label={`Remove ${item.subject}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="my-exam-setup__allocation-fields">
                          <div className="my-exam-setup__field">
                            <label>
                              Number of questions
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={item.question_count}
                              onChange={(e) =>
                                updateSubject(
                                  item.subject,
                                  "question_count",
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          <div className="my-exam-setup__field">
                            <label>Difficulty</label>
                            <select
                              value={item.difficulty}
                              onChange={(e) =>
                                updateSubject(
                                  item.subject,
                                  "difficulty",
                                  e.target.value
                                )
                              }
                            >
                              <option value="mixed">Mixed difficulty</option>
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                          </div>
                        </div>

                        <div className="my-exam-setup__field">
                          <label>Topics (optional)</label>
                          <input
                            value={item.topics}
                            onChange={(e) =>
                              updateSubject(
                                item.subject,
                                "topics",
                                e.target.value
                              )
                            }
                            placeholder="e.g. Algebra, Geometry, Statistics"
                          />
                          <small>
                            Separate multiple topics with commas.
                            Leave blank to cover the available subject topics.
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="my-exam-setup__panel">
                <div className="my-exam-setup__section-heading">
                  <div className="my-exam-setup__section-icon">
                    <Clock3 size={21} />
                  </div>
                  <div>
                    <span>STEP 03</span>
                    <h2>Set your examination time</h2>
                    <p>Choose how much time you want for this exam.</p>
                  </div>
                </div>

                <div className="my-exam-setup__field">
                  <label htmlFor="duration">Examination duration</label>
                  <select
                    id="duration"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1 hour 30 minutes</option>
                    <option value="120">2 hours</option>
                    <option value="150">2 hours 30 minutes</option>
                    <option value="180">3 hours</option>
                  </select>
                </div>
              </section>

              <section className="my-exam-setup__panel">
                <div className="my-exam-setup__section-heading">
                  <div className="my-exam-setup__section-icon">
                    <Settings2 size={21} />
                  </div>
                  <div>
                    <span>STEP 04</span>
                    <h2>Make the exam yours</h2>
                    <p>
                      Choose how you want your examination
                      environment to behave.
                    </p>
                  </div>
                </div>

                <div className="my-exam-setup__environment">
                  {environmentOptions.map((option) => {
                    const Icon = option.icon;
                    const enabled = environment[option.key];

                    return (
                      <div
                        className="my-exam-setup__environment-item"
                        key={option.key}
                      >
                        <div className="my-exam-setup__environment-icon">
                          <Icon size={19} />
                        </div>

                        <div className="my-exam-setup__environment-copy">
                          <strong>{option.title}</strong>
                          <p>{option.description}</p>
                        </div>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={enabled}
                          aria-label={option.title}
                          className={`my-exam-setup__switch ${
                            enabled ? "is-on" : ""
                          }`}
                          onClick={() => toggleEnvironment(option.key)}
                        >
                          <span />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              {error && (
                <div className="my-exam-setup__error" role="alert">
                  {error}
                </div>
              )}

              <button
                className="my-exam-setup__start"
                type="submit"
              >
                <Sparkles size={19} />
                Create my examination
                <ArrowRight size={19} />
              </button>
            </div>

            <aside className="my-exam-setup__sidebar">
              <div className="my-exam-setup__summary">
                <div className="my-exam-setup__summary-top">
                  <span>YOUR EXAM PLAN</span>
                  <Target size={20} />
                </div>

                <h3>Ready when you are.</h3>
                <p>
                  Your personal examination plan updates
                  as you make your selections.
                </p>

                <div className="my-exam-setup__summary-stat">
                  <span>Total questions</span>
                  <strong>{totalQuestions}<small> / 100</small></strong>
                </div>

                <div className="my-exam-setup__progress">
                  <span
                    style={{
                      width: `${Math.min(totalQuestions, 100)}%`,
                    }}
                  />
                </div>

                <div className="my-exam-setup__summary-stat">
                  <span>Selected subjects</span>
                  <strong>{subjects.length}</strong>
                </div>

                <div className="my-exam-setup__summary-stat">
                  <span>Duration</span>
                  <strong>{durationMinutes} min</strong>
                </div>

                <div className="my-exam-setup__summary-stat">
                  <span>Target score</span>
                  <strong>{targetScore || 0}%</strong>
                </div>

                <div className="my-exam-setup__summary-divider" />

                <div className="my-exam-setup__summary-subjects">
                  <strong>Question allocation</strong>

                  {subjects.length === 0 ? (
                    <p>Your chosen subjects will appear here.</p>
                  ) : (
                    subjects.map((item) => (
                      <div key={item.subject}>
                        <span>{item.subject}</span>
                        <strong>{item.question_count}</strong>
                      </div>
                    ))
                  )}
                </div>

                <div className="my-exam-setup__summary-note">
                  <Check size={17} />
                  <span>
                    Your exam configuration is prepared
                    specifically for your study goals.
                  </span>
                </div>
              </div>

              <div className="my-exam-setup__tip">
                <Sparkles size={20} />
                <strong>A little advice</strong>
                <p>
                  Choose a realistic target and give each
                  subject enough time. Consistency is more
                  powerful than rushing.
                </p>
              </div>
            </aside>
          </div>
        </form>

        <footer className="my-exam-setup__footer">
          OVERMATHS PREMIUM · YOUR JOURNEY. YOUR PROGRESS.
        </footer>
      </div>
    </main>
  );
}
