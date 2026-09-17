
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./AdminQuestions.css";

const API_URL = "https://overmaths.onrender.com";

function AdminQuestions() {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [examTypes, setExamTypes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [courseId, setCourseId] = useState("");
  const [status, setStatus] = useState("");

  const [selectedQuestion, setSelectedQuestion] = useState(null);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/login");
        return;
      }

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (subject) {
        params.set("subject", subject);
      }

      if (courseId) {
        params.set("course_id", courseId);
      }

      if (status) {
        params.set("is_active", status);
      }

      const response = await fetch(
        `${API_URL}/api/admin/questions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        navigate("/login");
        return;
      }

      if (response.status === 403) {
        setError("Administrator access required.");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to load question bank."
        );
      }

      setQuestions(data.questions || []);
      setCourses(data.courses || []);
      setExamTypes(data.exam_types || []);
    } catch (err) {
      console.error("Question bank error:", err);
      setError(
        err.message || "Unable to load question bank."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [search, subject, courseId, status]);

  const subjects = useMemo(() => {
    return [
      ...new Set(
        questions
          .map((question) => question.subject)
          .filter(Boolean)
      ),
    ].sort();
  }, [questions]);

  const getCourseName = (question) => {
    if (!question.course) {
      return question.subject || "O-Level";
    }

    return (
      question.course.code ||
      question.course.name ||
      "University Course"
    );
  };

  const getStatusLabel = (question) => {
    return question.is_active ? "Active" : "Inactive";
  };

  const getAnswerLabel = (answer) => {
    if (!answer) return "";

    const normalized = String(answer)
      .trim()
      .toLowerCase();

    if (normalized === "a") return "A";
    if (normalized === "b") return "B";
    if (normalized === "c") return "C";
    if (normalized === "d") return "D";

    return answer;
  };

  return (
    <div className="admin-questions-page">
      <div className="admin-questions-header">
        <div>
          <button
            className="back-button"
            onClick={() => navigate("/admin")}
          >
            ← Dashboard
          </button>

          <h1>Question Bank</h1>

          <p>
            Manage questions, topics, answers, explanations
            and exam assignments.
          </p>
        </div>

        <div className="question-count">
          <strong>{questions.length}</strong>
          <span>Questions</span>
        </div>
      </div>

      <div className="question-filters">
        <div className="search-box">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search question or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setCourseId("");
          }}
        >
          <option value="">All Subjects</option>

          {subjects.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
        >
          <option value="">All Courses</option>

          {courses.map((course) => (
            <option
              key={course.id}
              value={course.id}
            >
              {course.code} — {course.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {error && (
        <div className="admin-question-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="question-loading">
          Loading question bank...
        </div>
      ) : questions.length === 0 ? (
        <div className="question-empty">
          <div className="empty-icon">📚</div>

          <h2>No questions found</h2>

          <p>
            Try changing your search or filters.
          </p>
        </div>
      ) : (
        <div className="questions-table-wrapper">
          <table className="questions-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Question</th>
                <th>Subject / Course</th>
                <th>Topic</th>
                <th>Exams</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {questions.map((question) => (
                <tr key={question.id}>
                  <td className="question-id">
                    #{question.id}
                  </td>

                  <td className="question-preview">
                    <strong>
                      {question.question_text}
                    </strong>

                    {question.image_url && (
                      <span className="image-badge">
                        🖼 Image
                      </span>
                    )}
                  </td>

                  <td>
                    <span className="course-badge">
                      {getCourseName(question)}
                    </span>
                  </td>

                  <td>
                    {question.topic}
                  </td>

                  <td>
                    <div className="exam-list">
                      {question.exam_types?.length ? (
                        question.exam_types.map(
                          (exam) => (
                            <span
                              className="exam-badge"
                              key={exam.id}
                            >
                              {exam.name}
                            </span>
                          )
                        )
                      ) : (
                        <span className="muted">
                          None
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    <span
                      className={
                        question.is_active
                          ? "status-badge active"
                          : "status-badge inactive"
                      }
                    >
                      {getStatusLabel(question)}
                    </span>
                  </td>

                  <td>
                    <button
                      className="view-button"
                      onClick={() =>
                        setSelectedQuestion(question)
                      }
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedQuestion && (
        <div
          className="question-modal-overlay"
          onClick={() => setSelectedQuestion(null)}
        >
          <div
            className="question-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="modal-question-id">
                  Question #{selectedQuestion.id}
                </span>

                <h2>Question Details</h2>
              </div>

              <button
                className="close-modal"
                onClick={() =>
                  setSelectedQuestion(null)
                }
              >
                ×
              </button>
            </div>

            <div className="modal-meta">
              <span>
                {getCourseName(selectedQuestion)}
              </span>

              <span>
                {selectedQuestion.topic}
              </span>

              <span
                className={
                  selectedQuestion.is_active
                    ? "status-badge active"
                    : "status-badge inactive"
                }
              >
                {getStatusLabel(selectedQuestion)}
              </span>
            </div>

            <div className="modal-section">
              <h3>Question</h3>

              <p className="modal-question-text">
                {selectedQuestion.question_text}
              </p>
            </div>

            {selectedQuestion.image_url && (
              <div className="modal-section">
                <h3>Question Image</h3>

                <img
                  src={selectedQuestion.image_url}
                  alt="Question"
                  className="question-image"
                />
              </div>
            )}

            <div className="modal-section">
              <h3>Options</h3>

              <div className="options-grid">
                <div
                  className={
                    getAnswerLabel(
                      selectedQuestion.correction_answer
                    ) === "A"
                      ? "answer-option correct"
                      : "answer-option"
                  }
                >
                  <strong>A</strong>
                  <span>
                    {selectedQuestion.option_a}
                  </span>
                </div>

                <div
                  className={
                    getAnswerLabel(
                      selectedQuestion.correction_answer
                    ) === "B"
                      ? "answer-option correct"
                      : "answer-option"
                  }
                >
                  <strong>B</strong>
                  <span>
                    {selectedQuestion.option_b}
                  </span>
                </div>

                <div
                  className={
                    getAnswerLabel(
                      selectedQuestion.correction_answer
                    ) === "C"
                      ? "answer-option correct"
                      : "answer-option"
                  }
                >
                  <strong>C</strong>
                  <span>
                    {selectedQuestion.option_c}
                  </span>
                </div>

                <div
                  className={
                    getAnswerLabel(
                      selectedQuestion.correction_answer
                    ) === "D"
                      ? "answer-option correct"
                      : "answer-option"
                  }
                >
                  <strong>D</strong>
                  <span>
                    {selectedQuestion.option_d}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-section">
              <h3>Correct Answer</h3>

              <div className="correct-answer">
                {getAnswerLabel(
                  selectedQuestion.correction_answer
                )}
              </div>
            </div>

            {selectedQuestion.explanation && (
              <div className="modal-section">
                <h3>Explanation</h3>

                <p className="explanation">
                  {selectedQuestion.explanation}
                </p>
              </div>
            )}

            <div className="modal-section">
              <h3>Exam Types</h3>

              <div className="exam-list">
                {selectedQuestion.exam_types?.length ? (
                  selectedQuestion.exam_types.map(
                    (exam) => (
                      <span
                        className="exam-badge"
                        key={exam.id}
                      >
                        {exam.name}
                      </span>
                    )
                  )
                ) : (
                  <span className="muted">
                    No exam assigned
                  </span>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="secondary-modal-button"
                onClick={() =>
                  setSelectedQuestion(null)
                }
              >
                Close
              </button>

              <button
                className="primary-modal-button"
                disabled
              >
                Edit Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminQuestions;

