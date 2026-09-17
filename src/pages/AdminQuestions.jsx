import React, {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './AdminQuestions.css'

const API_URL = 'https://overmaths.onrender.com'

const normalizeCorrectionAnswer = (value) => {
  return String(value || '')
    .trim()
    .replace(/^OPTION\s+/i, '')
    .toUpperCase()
}

const EMPTY_FORM = {
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correction_answer: 'A',
  topic: '',
  explanation: '',
  image_url: '',
  subject: '',
  course_id: '',
  is_active: true,
}

function AdminQuestions() {
  const navigate = useNavigate()

  const [questions, setQuestions] = useState([])
  const [courses, setCourses] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [selectedQuestion, setSelectedQuestion] =
    useState(null)

  const [editingQuestion, setEditingQuestion] =
    useState(null)

  const [editForm, setEditForm] =
    useState(EMPTY_FORM)

  const [saving, setSaving] = useState(false)

  // --------------------------------------------------
  // LOAD QUESTIONS
  // --------------------------------------------------

  const loadQuestions = async () => {
    try {
      setLoading(true)
      setError('')

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        throw new Error(
          'Your login session could not be verified.'
        )
      }

      const session = sessionData?.session

      if (!session?.access_token) {
        throw new Error(
          'Please log in again to access the admin dashboard.'
        )
      }

      const response = await fetch(
        `${API_URL}/api/admin/questions`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const data = await response.json()

      if (response.status === 401) {
        throw new Error(
          'Your login session has expired. Please log in again.'
        )
      }

      if (response.status === 403) {
        throw new Error(
          'Administrator access is required.'
        )
      }

      if (!response.ok || !data.success) {
        throw new Error(
          'Unable to load the question bank.'
        )
      }

      setQuestions(data.questions || [])
      setCourses(data.courses || [])
    } catch (err) {
      console.error(
        'ADMIN QUESTIONS ERROR:',
        err
      )

      setError(
        err.message ||
        'Unable to load the question bank.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuestions()
  }, [])

  // --------------------------------------------------
  // FILTER OPTIONS
  // --------------------------------------------------

  const subjects = useMemo(() => {
    return [
      ...new Set(
        questions
          .map((question) => question.subject)
          .filter(Boolean)
      ),
    ].sort()
  }, [questions])

  const filteredQuestions = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase()

    return questions.filter((question) => {
      const matchesSearch =
        !searchValue ||
        String(question.id)
          .toLowerCase()
          .includes(searchValue) ||
        String(question.question_text || '')
          .toLowerCase()
          .includes(searchValue) ||
        String(question.topic || '')
          .toLowerCase()
          .includes(searchValue)

      const matchesSubject =
        !subjectFilter ||
        question.subject === subjectFilter

      const matchesCourse =
        !courseFilter ||
        String(question.course_id || '') ===
          String(courseFilter)

      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'active'
          ? question.is_active === true
          : question.is_active === false)

      return (
        matchesSearch &&
        matchesSubject &&
        matchesCourse &&
        matchesStatus
      )
    })
  }, [
    questions,
    search,
    subjectFilter,
    courseFilter,
    statusFilter,
  ])

  // --------------------------------------------------
  // VIEW QUESTION
  // --------------------------------------------------

  const openQuestion = (question) => {
    setSelectedQuestion(question)
    setSuccess('')
  }

  const closeQuestion = () => {
    setSelectedQuestion(null)
  }

  // --------------------------------------------------
  // EDIT QUESTION
  // --------------------------------------------------

  const openEditQuestion = (question) => {
    setEditingQuestion(question)

    setEditForm({
      question_text:
        question.question_text || '',
      option_a:
        question.option_a || '',
      option_b:
        question.option_b || '',
      option_c:
        question.option_c || '',
      option_d:
        question.option_d || '',
      correction_answer:
        normalizeCorrectionAnswer(
          question.correction_answer
        ) || 'A',
      topic:
        question.topic || '',
      explanation:
        question.explanation || '',
      image_url:
        question.image_url || '',
      subject:
        question.subject || '',
      course_id:
        question.course_id
          ? String(question.course_id)
          : '',
      is_active:
        question.is_active === true,
    })

    setSelectedQuestion(null)
    setError('')
    setSuccess('')
  }

  const closeEditQuestion = () => {
    if (saving) return

    setEditingQuestion(null)
    setEditForm(EMPTY_FORM)
  }

  const handleEditChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target

    setEditForm((previous) => ({
      ...previous,
      [name]:
        type === 'checkbox'
          ? checked
          : value,
    }))
  }

  // --------------------------------------------------
  // SAVE QUESTION
  // --------------------------------------------------

  const saveQuestion = async (event) => {
    event.preventDefault()

    if (!editingQuestion) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        throw new Error(
          'Your login session could not be verified.'
        )
      }

      const session = sessionData?.session

      if (!session?.access_token) {
        throw new Error(
          'Please log in again before saving changes.'
        )
      }

      // --------------------------------------------------
      // ONLY SEND FIELDS THAT ACTUALLY CHANGED
      // --------------------------------------------------

      const payload = {}

      const original = editingQuestion

      // --------------------------------------------------
      // QUESTION TEXT
      // --------------------------------------------------

      const originalQuestion =
        String(
          original.question_text || ''
        ).trim()

      const newQuestion =
        editForm.question_text.trim()

      if (
        newQuestion !==
        originalQuestion
      ) {
        if (!newQuestion) {
          throw new Error(
            'Question text cannot be empty.'
          )
        }

        payload.question_text =
          newQuestion
      }

      // --------------------------------------------------
      // OPTION A
      // --------------------------------------------------

      const originalOptionA =
        String(
          original.option_a || ''
        ).trim()

      const newOptionA =
        editForm.option_a.trim()

      if (
        newOptionA !==
        originalOptionA
      ) {
        if (!newOptionA) {
          throw new Error(
            'Option A cannot be empty.'
          )
        }

        payload.option_a =
          newOptionA
      }

      // --------------------------------------------------
      // OPTION B
      // --------------------------------------------------

      const originalOptionB =
        String(
          original.option_b || ''
        ).trim()

      const newOptionB =
        editForm.option_b.trim()

      if (
        newOptionB !==
        originalOptionB
      ) {
        if (!newOptionB) {
          throw new Error(
            'Option B cannot be empty.'
          )
        }

        payload.option_b =
          newOptionB
      }

      // --------------------------------------------------
      // OPTION C
      // --------------------------------------------------

      const originalOptionC =
        String(
          original.option_c || ''
        ).trim()

      const newOptionC =
        editForm.option_c.trim()

      if (
        newOptionC !==
        originalOptionC
      ) {
        if (!newOptionC) {
          throw new Error(
            'Option C cannot be empty.'
          )
        }

        payload.option_c =
          newOptionC
      }

      // --------------------------------------------------
      // OPTION D
      // --------------------------------------------------

      const originalOptionD =
        String(
          original.option_d || ''
        ).trim()

      const newOptionD =
        editForm.option_d.trim()

      if (
        newOptionD !==
        originalOptionD
      ) {
        if (!newOptionD) {
          throw new Error(
            'Option D cannot be empty.'
          )
        }

        payload.option_d =
          newOptionD
      }

      // --------------------------------------------------
      // CORRECT ANSWER
      // --------------------------------------------------

      const originalAnswer =
        normalizeCorrectionAnswer(
          original.correction_answer
        )

      const newAnswer =
        normalizeCorrectionAnswer(
          editForm.correction_answer
        )

      if (
        newAnswer !==
        originalAnswer
      ) {
        if (
          ![
            'A',
            'B',
            'C',
            'D'
          ].includes(newAnswer)
        ) {
          throw new Error(
            'Correct answer must be A, B, C or D.'
          )
        }

        payload.correction_answer =
          newAnswer
      }

      // --------------------------------------------------
      // TOPIC
      // --------------------------------------------------

      const originalTopic =
        String(
          original.topic || ''
        ).trim()

      const newTopic =
        editForm.topic.trim()

      if (
        newTopic !==
        originalTopic
      ) {
        if (!newTopic) {
          throw new Error(
            'Topic cannot be empty.'
          )
        }

        payload.topic =
          newTopic
      }

      // --------------------------------------------------
      // EXPLANATION
      // --------------------------------------------------

      const originalExplanation =
        String(
          original.explanation || ''
        ).trim()

      const newExplanation =
        editForm.explanation.trim()

      if (
        newExplanation !==
        originalExplanation
      ) {
        payload.explanation =
          newExplanation || null
      }

      // --------------------------------------------------
      // IMAGE URL
      // --------------------------------------------------

      const originalImage =
        String(
          original.image_url || ''
        ).trim()

      const newImage =
        editForm.image_url.trim()

      if (
        newImage !==
        originalImage
      ) {
        payload.image_url =
          newImage || null
      }

      // --------------------------------------------------
      // SUBJECT
      // --------------------------------------------------

      const originalSubject =
        String(
          original.subject || ''
        ).trim()

      const newSubject =
        editForm.subject.trim()

      if (
        newSubject !==
        originalSubject
      ) {
        payload.subject =
          newSubject || null
      }

      // --------------------------------------------------
      // COURSE
      // --------------------------------------------------

      const originalCourse =
        original.course_id
          ? String(original.course_id)
          : ''

      const newCourse =
        editForm.course_id
          ? String(editForm.course_id)
          : ''

      if (
        newCourse !==
        originalCourse
      ) {
        payload.course_id =
          newCourse
            ? Number(newCourse)
            : null
      }

      // --------------------------------------------------
      // ACTIVE STATUS
      // --------------------------------------------------

      const originalActive =
        original.is_active === true

      if (
        editForm.is_active !==
        originalActive
      ) {
        payload.is_active =
          editForm.is_active
      }

      // --------------------------------------------------
      // NOTHING CHANGED
      // --------------------------------------------------

      if (
        Object.keys(payload).length === 0
      ) {
        throw new Error(
          'No changes were made to this question.'
        )
      }

      console.log(
        `UPDATING QUESTION ${editingQuestion.id}:`,
        payload
      )

      // --------------------------------------------------
      // SEND PATCH REQUEST
      // --------------------------------------------------

      const response = await fetch(
        `${API_URL}/api/admin/questions/${editingQuestion.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      const data = await response.json()

      // --------------------------------------------------
      // AUTH ERRORS
      // --------------------------------------------------

      if (response.status === 401) {
        throw new Error(
          'Your login session has expired. Please log in again.'
        )
      }

      if (response.status === 403) {
        throw new Error(
          'Administrator access is required.'
        )
      }

      // --------------------------------------------------
      // API ERROR
      // --------------------------------------------------

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
          'Unable to save the question.'
        )
      }

      // --------------------------------------------------
      // SUCCESS
      // --------------------------------------------------

      setEditingQuestion(null)
      setEditForm(EMPTY_FORM)

      setSuccess(
        `Question #${editingQuestion.id} was updated successfully.`
      )

      await loadQuestions()

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })

    } catch (err) {

      console.error(
        'UPDATE QUESTION ERROR:',
        err
      )

      setError(
        err.message ||
        'Unable to save the question.'
      )

    } finally {

      setSaving(false)
    }
  }

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="admin-page">

      {/* SIDEBAR */}

      <aside className="admin-sidebar">

        <div className="admin-brand">
          <h2>OVERMATHS</h2>
          <span>ADMIN PANEL</span>
        </div>

        <nav className="admin-nav">

          <button
            className="admin-nav-item"
            onClick={() => navigate('/admin')}
          >
            <span>⌂</span>
            Overview
          </button>

          <button
            className="admin-nav-item active"
            onClick={() =>
              navigate('/admin/questions')
            }
          >
            <span>▣</span>
            Questions
          </button>

          <button className="admin-nav-item">
            <span>◈</span>
            Courses
          </button>

          <button className="admin-nav-item">
            <span>♙</span>
            Students
          </button>

          <button className="admin-nav-item">
            <span>◷</span>
            Quiz Attempts
          </button>

          <button className="admin-nav-item">
            <span>◇</span>
            Subscriptions
          </button>

          <button className="admin-nav-item">
            <span>₦</span>
            Payments
          </button>

        </nav>

      </aside>

      {/* MAIN */}

      <main className="admin-main">

        <header className="admin-header">

          <div>

            <p className="admin-label">
              QUESTION MANAGEMENT
            </p>

            <h1>
              Question Bank
            </h1>

            <p className="admin-subtitle">
              Search, review and manage questions in Overmaths.
            </p>

          </div>

          <div className="admin-user">

            <div className="admin-avatar">
              A
            </div>

            <div>
              <strong>
                Administrator
              </strong>

              <span>
                Admin
              </span>
            </div>

          </div>

        </header>

        {/* MESSAGES */}

        {error && (
          <div className="admin-error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="admin-success-message">
            {success}
          </div>
        )}

        {/* QUESTION MANAGEMENT */}

        <section className="admin-section">

          <div className="section-heading">

            <div>

              <p className="admin-label">
                DATABASE
              </p>

              <h2>
                Manage Questions
              </h2>

            </div>

            <div className="question-count">

              {filteredQuestions.length} question
              {filteredQuestions.length !== 1
                ? 's'
                : ''}

            </div>

          </div>

          {/* FILTERS */}

          <div className="question-filters">

            <div className="question-search">

              <input
                type="text"
                placeholder="Search question, topic or ID..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

            </div>

            <select
              value={subjectFilter}
              onChange={(event) =>
                setSubjectFilter(event.target.value)
              }
            >

              <option value="">
                All Subjects
              </option>

              {subjects.map((subject) => (
                <option
                  key={subject}
                  value={subject}
                >
                  {subject}
                </option>
              ))}

            </select>

            <select
              value={courseFilter}
              onChange={(event) =>
                setCourseFilter(event.target.value)
              }
            >

              <option value="">
                All Courses
              </option>

              {courses.map((course) => (
                <option
                  key={course.id}
                  value={course.id}
                >
                  {course.code
                    ? `${course.code} — ${course.name}`
                    : course.name}
                </option>
              ))}

            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >

              <option value="">
                All Status
              </option>

              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>

            </select>

          </div>

          {/* TABLE */}

          <div className="questions-table-wrapper">

            {loading ? (

              <div className="admin-loading">
                Loading question bank...
              </div>

            ) : filteredQuestions.length === 0 ? (

              <div className="admin-empty">

                <h3>
                  No questions found
                </h3>

                <p>
                  Try changing your search or filters.
                </p>

              </div>

            ) : (

              <table className="questions-table">

                <thead>

                  <tr>
                    <th>ID</th>
                    <th>Question</th>
                    <th>Subject</th>
                    <th>Course</th>
                    <th>Topic</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>

                </thead>

                <tbody>

                  {filteredQuestions.map(
                    (question) => (

                      <tr key={question.id}>

                        <td>
                          #{question.id}
                        </td>

                        <td className="question-preview">
                          {question.question_text}
                        </td>

                        <td>
                          {question.subject || '—'}
                        </td>

                        <td>
                          {question.course_code ||
                            question.course_name ||
                            '—'}
                        </td>

                        <td>
                          {question.topic || '—'}
                        </td>

                        <td>

                          <span
                            className={
                              question.is_active
                                ? 'status-badge active'
                                : 'status-badge inactive'
                            }
                          >

                            {question.is_active
                              ? 'Active'
                              : 'Inactive'}

                          </span>

                        </td>

                        <td>

                          <button
                            className="view-question-btn"
                            onClick={() =>
                              openQuestion(question)
                            }
                          >
                            View
                          </button>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            )}

          </div>

        </section>

      </main>

      {/* VIEW MODAL */}

      {selectedQuestion && (

        <div
          className="admin-modal-overlay"
          onClick={closeQuestion}
        >

          <div
            className="admin-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="admin-modal-header">

              <div>

                <p className="admin-label">
                  QUESTION #{selectedQuestion.id}
                </p>

                <h2>
                  Question Details
                </h2>

              </div>

              <button
                className="modal-close"
                onClick={closeQuestion}
              >
                ×
              </button>

            </div>

            <div className="question-detail">

              <div className="detail-row">

                <span>
                  Question
                </span>

                <p>
                  {selectedQuestion.question_text}
                </p>

              </div>

              {selectedQuestion.image_url && (

                <div className="detail-row">

                  <span>
                    Image
                  </span>

                  <img
                    src={selectedQuestion.image_url}
                    alt="Question"
                    className="question-detail-image"
                  />

                </div>

              )}

              <div className="detail-row">

                <span>
                  Options
                </span>

                <div className="question-options">

                  <div>
                    <strong>A.</strong>
                    {selectedQuestion.option_a}
                  </div>

                  <div>
                    <strong>B.</strong>
                    {selectedQuestion.option_b}
                  </div>

                  <div>
                    <strong>C.</strong>
                    {selectedQuestion.option_c}
                  </div>

                  <div>
                    <strong>D.</strong>
                    {selectedQuestion.option_d}
                  </div>

                </div>

              </div>

              <div className="detail-grid">

                <div className="detail-row">

                  <span>
                    Correct Answer
                  </span>

                  <strong className="correct-answer">
                    {selectedQuestion.correction_answer}
                  </strong>

                </div>

                <div className="detail-row">

                  <span>
                    Topic
                  </span>

                  <p>
                    {selectedQuestion.topic || '—'}
                  </p>

                </div>

                <div className="detail-row">

                  <span>
                    Subject
                  </span>

                  <p>
                    {selectedQuestion.subject || '—'}
                  </p>

                </div>

                <div className="detail-row">

                  <span>
                    Course
                  </span>

                  <p>
                    {selectedQuestion.course_code ||
                      selectedQuestion.course_name ||
                      '—'}
                  </p>

                </div>

              </div>

              <div className="detail-row">

                <span>
                  Explanation
                </span>

                <p>
                  {selectedQuestion.explanation ||
                    'No explanation provided.'}
                </p>

              </div>

              <div className="detail-row">

                <span>
                  Status
                </span>

                <span
                  className={
                    selectedQuestion.is_active
                      ? 'status-badge active'
                      : 'status-badge inactive'
                  }
                >

                  {selectedQuestion.is_active
                    ? 'Active'
                    : 'Inactive'}

                </span>

              </div>

              <div className="question-modal-actions">

                <button
                  className="edit-question-btn"
                  onClick={() =>
                    openEditQuestion(
                      selectedQuestion
                    )
                  }
                >
                  Edit Question
                </button>

                <button
                  className="modal-secondary-btn"
                  onClick={closeQuestion}
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

      {/* EDIT MODAL */}

      {editingQuestion && (

        <div
          className="admin-modal-overlay"
          onClick={closeEditQuestion}
        >

          <div
            className="admin-modal edit-question-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="admin-modal-header">

              <div>

                <p className="admin-label">
                  EDIT QUESTION #{editingQuestion.id}
                </p>

                <h2>
                  Update Question
                </h2>

              </div>

              <button
                className="modal-close"
                onClick={closeEditQuestion}
                disabled={saving}
              >
                ×
              </button>

            </div>

            <form
              className="question-edit-form"
              onSubmit={saveQuestion}
            >

              {/* QUESTION */}

              <div className="edit-form-group full-width">

                <label>
                  Question Text
                </label>

                <textarea
                  name="question_text"
                  value={editForm.question_text}
                  onChange={handleEditChange}
                  rows="5"
                  required
                />

              </div>

              {/* OPTIONS */}

              <div className="edit-form-section">

                <div className="edit-section-title">
                  Answer Options
                </div>

                <div className="edit-options-grid">

                  <div className="edit-form-group">

                    <label>
                      Option A
                    </label>

                    <textarea
                      name="option_a"
                      value={editForm.option_a}
                      onChange={handleEditChange}
                      rows="3"
                      required
                    />

                  </div>

                  <div className="edit-form-group">

                    <label>
                      Option B
                    </label>

                    <textarea
                      name="option_b"
                      value={editForm.option_b}
                      onChange={handleEditChange}
                      rows="3"
                      required
                    />

                  </div>

                  <div className="edit-form-group">

                    <label>
                      Option C
                    </label>

                    <textarea
                      name="option_c"
                      value={editForm.option_c}
                      onChange={handleEditChange}
                      rows="3"
                      required
                    />

                  </div>

                  <div className="edit-form-group">

                    <label>
                      Option D
                    </label>

                    <textarea
                      name="option_d"
                      value={editForm.option_d}
                      onChange={handleEditChange}
                      rows="3"
                      required
                    />

                  </div>

                </div>

              </div>

              {/* DETAILS */}

              <div className="edit-form-grid">

                <div className="edit-form-group">

                  <label>
                    Correct Answer
                  </label>

                  <select
                    name="correction_answer"
                    value={editForm.correction_answer}
                    onChange={handleEditChange}
                    required
                  >

                    <option value="A">
                      A
                    </option>

                    <option value="B">
                      B
                    </option>

                    <option value="C">
                      C
                    </option>

                    <option value="D">
                      D
                    </option>

                  </select>

                </div>

                <div className="edit-form-group">

                  <label>
                    Topic
                  </label>

                  <input
                    type="text"
                    name="topic"
                    value={editForm.topic}
                    onChange={handleEditChange}
                    required
                  />

                </div>

                <div className="edit-form-group">

                  <label>
                    Subject
                  </label>

                  <input
                    type="text"
                    name="subject"
                    value={editForm.subject}
                    onChange={handleEditChange}
                    placeholder="e.g. Mathematics"
                  />

                </div>

                <div className="edit-form-group">

                  <label>
                    Course
                  </label>

                  <select
                    name="course_id"
                    value={editForm.course_id}
                    onChange={handleEditChange}
                  >

                    <option value="">
                      No Course / O-Level
                    </option>

                    {courses.map((course) => (

                      <option
                        key={course.id}
                        value={course.id}
                      >

                        {course.code
                          ? `${course.code} — ${course.name}`
                          : course.name}

                      </option>

                    ))}

                  </select>

                </div>

              </div>

              {/* EXPLANATION */}

              <div className="edit-form-group full-width">

                <label>
                  Explanation
                </label>

                <textarea
                  name="explanation"
                  value={editForm.explanation}
                  onChange={handleEditChange}
                  rows="5"
                  placeholder="Explain the correct answer..."
                />

              </div>

              {/* IMAGE */}

              <div className="edit-form-group full-width">

                <label>
                  Image URL
                </label>

                <input
                  type="text"
                  name="image_url"
                  value={editForm.image_url}
                  onChange={handleEditChange}
                  placeholder="Paste image URL if the question has an image"
                />

              </div>

              {/* STATUS */}

              <label className="active-toggle">

                <input
                  type="checkbox"
                  name="is_active"
                  checked={editForm.is_active}
                  onChange={handleEditChange}
                />

                <span>
                  Question is active
                </span>

              </label>

              {/* ACTIONS */}

              <div className="question-edit-actions">

                <button
                  type="button"
                  className="modal-secondary-btn"
                  onClick={closeEditQuestion}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="edit-question-btn"
                  disabled={saving}
                >

                  {saving
                    ? 'Saving Changes...'
                    : 'Save Changes'}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  )
}

export default AdminQuestions