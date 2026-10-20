
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, CalendarDays, Clock, FileText } from "lucide-react";
import "./MyExamSetup.css";

export default function MyExamSetup() {
  const navigate = useNavigate();

  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [subjectInput, setSubjectInput] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [questionCount, setQuestionCount] = useState("20");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [error, setError] = useState("");

  function addSubject() {
    const subject = subjectInput.trim();

    if (!subject) return;

    const alreadyAdded = subjects.some(
      (item) => item.toLowerCase() === subject.toLowerCase()
    );

    if (alreadyAdded) {
      setError("You have already added this subject.");
      return;
    }

    setSubjects((current) => [...current, subject]);
    setSubjectInput("");
    setError("");
  }

  function removeSubject(subjectToRemove) {
    setSubjects((current) =>
      current.filter((subject) => subject !== subjectToRemove)
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!examTitle.trim()) {
      setError("Enter a title for your exam.");
      return;
    }

    if (subjects.length === 0) {
      setError("Add at least one subject.");
      return;
    }

    if (Number(questionCount) < 1 || Number(questionCount) > 100) {
      setError("Choose between 1 and 100 questions.");
      return;
    }

    if (Number(durationMinutes) < 1 || Number(durationMinutes) > 300) {
      setError("Choose an exam duration between 1 and 300 minutes.");
      return;
    }

    navigate("/premium-quiz", {
      state: {
        examPurpose: "my_exam",
        exam_purpose: "my_exam",
        examTitle: examTitle.trim(),
        exam_title: examTitle.trim(),
        examDate: examDate || null,
        exam_date: examDate || null,
        subjects,
        subject: subjects[0],
        questionCount: Number(questionCount),
        question_count: Number(questionCount),
        durationMinutes: Number(durationMinutes),
        mode: "examination",
        isExamMode: true,
      },
    });
  }

  return (
    <main className="my-exam-setup">
      <div className="my-exam-setup__container">
        <button
          type="button"
          className="my-exam-setup__back"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <header className="my-exam-setup__header">
          <div className="my-exam-setup__icon">
            <BookOpen size={28} />
          </div>

          <p className="my-exam-setup__eyebrow">OVERMATHS PREMIUM</p>
          <h1>Set up your exam</h1>
          <p>
            Choose your subjects and exam settings. Your submitted results
            will belong to My Exam, separately from Practice.
          </p>
        </header>

        <form className="my-exam-setup__card" onSubmit={handleSubmit}>
          <div className="my-exam-setup__field">
            <label htmlFor="exam-title">
              <FileText size={17} />
              Exam title
            </label>

            <input
              id="exam-title"
              type="text"
              placeholder="e.g. WAEC Mathematics Preparation"
              value={examTitle}
              onChange={(event) => setExamTitle(event.target.value)}
              maxLength={100}
              required
            />
          </div>

          <div className="my-exam-setup__field">
            <label htmlFor="exam-date">
              <CalendarDays size={17} />
              Exam date (optional)
            </label>

            <input
              id="exam-date"
              type="date"
              value={examDate}
              onChange={(event) => setExamDate(event.target.value)}
            />
          </div>

          <div className="my-exam-setup__field">
            <label htmlFor="subject-input">Subjects</label>

            <p className="my-exam-setup__hint">
              Enter one subject at a time and click Add subject.
            </p>

            <div className="my-exam-setup__subject-entry">
              <input
                id="subject-input"
                type="text"
                placeholder="e.g. Mathematics"
                value={subjectInput}
                onChange={(event) => setSubjectInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addSubject();
                  }
                }}
              />

              <button
                type="button"
                className="my-exam-setup__add"
                onClick={addSubject}
              >
                Add subject
              </button>
            </div>

            {subjects.length > 0 && (
              <div className="my-exam-setup__subjects">
                {subjects.map((subject) => (
                  <span className="my-exam-setup__subject" key={subject}>
                    {subject}
                    <button
                      type="button"
                      aria-label={`Remove ${subject}`}
                      onClick={() => removeSubject(subject)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="my-exam-setup__grid">
            <div className="my-exam-setup__field">
              <label htmlFor="question-count">Number of questions</label>

              <select
                id="question-count"
                value={questionCount}
                onChange={(event) => setQuestionCount(event.target.value)}
              >
                <option value="10">10 questions</option>
                <option value="20">20 questions</option>
                <option value="30">30 questions</option>
                <option value="40">40 questions</option>
                <option value="50">50 questions</option>
                <option value="100">100 questions</option>
              </select>
            </div>

            <div className="my-exam-setup__field">
              <label htmlFor="exam-duration">
                <Clock size={17} />
                Duration
              </label>

              <select
                id="exam-duration"
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1 hour 30 minutes</option>
                <option value="120">2 hours</option>
                <option value="180">3 hours</option>
                <option value="300">5 hours</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="my-exam-setup__error" role="alert">
              {error}
            </p>
          )}

          <div className="my-exam-setup__notice">
            <strong>Exam mode</strong>
            <p>
              Questions are presented as an examination. Answers and
              explanations should be reviewed after submission.
            </p>
          </div>

          <button className="my-exam-setup__start" type="submit">
            Start My Exam
          </button>
        </form>
      </div>
    </main>
  );
}
