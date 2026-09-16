
import React, { useEffect, useState } from 'react'
import './AdminDashboard.css'

const API_URL = 'https://overmaths.onrender.com'

function AdminDashboard() {
  const [overview, setOverview] = useState({
    total_questions: 0,
    students: 0,
    quiz_attempts: 0,
    active_subscriptions: 0,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadOverview = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(
          `${API_URL}/api/admin/overview`
        )

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || 'Unable to load admin overview.'
          )
        }

        setOverview(
          data.overview || {
            total_questions: 0,
            students: 0,
            quiz_attempts: 0,
            active_subscriptions: 0,
          }
        )
      } catch (err) {
        console.error('ADMIN OVERVIEW ERROR:', err)
        setError(
          err.message || 'Unable to load admin overview.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadOverview()
  }, [])

  return (
    <div className="admin-page">

      {/* Sidebar */}
      <aside className="admin-sidebar">

        <div className="admin-brand">
          <h2>OVERMATHS</h2>
          <span>ADMIN PANEL</span>
        </div>

        <nav className="admin-nav">

          <button className="admin-nav-item active">
            <span>⌂</span>
            Overview
          </button>

          <button className="admin-nav-item">
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


      {/* Main Content */}
      <main className="admin-main">

        <header className="admin-header">

          <div>
            <p className="admin-label">OVERMATHS CONTROL CENTRE</p>
            <h1>Admin Dashboard</h1>
            <p className="admin-subtitle">
              Manage questions, students, courses and platform activity.
            </p>
          </div>

          <div className="admin-user">
            <div className="admin-avatar">
              A
            </div>

            <div>
              <strong>Administrator</strong>
              <span>Admin</span>
            </div>
          </div>

        </header>


        {/* Error Message */}
        {error && (
          <div className="admin-error-message">
            {error}
          </div>
        )}


        {/* Statistics */}
        <section className="admin-stats">

          <div className="admin-stat-card">
            <span className="stat-title">
              Total Questions
            </span>

            <strong>
              {loading
                ? '...'
                : overview.total_questions}
            </strong>

            <small>
              Question bank
            </small>
          </div>


          <div className="admin-stat-card">
            <span className="stat-title">
              Students
            </span>

            <strong>
              {loading
                ? '...'
                : overview.students}
            </strong>

            <small>
              Registered users
            </small>
          </div>


          <div className="admin-stat-card">
            <span className="stat-title">
              Quiz Attempts
            </span>

            <strong>
              {loading
                ? '...'
                : overview.quiz_attempts}
            </strong>

            <small>
              Total attempts
            </small>
          </div>


          <div className="admin-stat-card">
            <span className="stat-title">
              Active Subscriptions
            </span>

            <strong>
              {loading
                ? '...'
                : overview.active_subscriptions}
            </strong>

            <small>
              Current subscribers
            </small>
          </div>

        </section>


        {/* Management */}
        <section className="admin-section">

          <div className="section-heading">
            <div>
              <p className="admin-label">
                MANAGEMENT
              </p>

              <h2>
                Control Overmaths
              </h2>
            </div>
          </div>


          <div className="admin-management-grid">

            <div className="admin-management-card">

              <div className="management-icon">
                ▣
              </div>

              <h3>
                Question Bank
              </h3>

              <p>
                Search, review and correct questions in the database.
              </p>

              <button>
                Manage Questions →
              </button>

            </div>


            <div className="admin-management-card">

              <div className="management-icon">
                ◈
              </div>

              <h3>
                Courses
              </h3>

              <p>
                Manage the courses available to students.
              </p>

              <button>
                Manage Courses →
              </button>

            </div>


            <div className="admin-management-card">

              <div className="management-icon">
                ♙
              </div>

              <h3>
                Students
              </h3>

              <p>
                View registered students and their activity.
              </p>

              <button>
                Manage Students →
              </button>

            </div>


            <div className="admin-management-card">

              <div className="management-icon">
                ◷
              </div>

              <h3>
                Quiz Activity
              </h3>

              <p>
                Monitor examinations, attempts and performance.
              </p>

              <button>
                View Activity →
              </button>

            </div>

          </div>

        </section>

      </main>

    </div>
  )
}

export default AdminDashboard

