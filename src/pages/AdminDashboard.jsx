import React from 'react'
import './AdminDashboard.css'

function AdminDashboard() {
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


        {/* Statistics */}
        <section className="admin-stats">

          <div className="admin-stat-card">
            <span className="stat-title">Total Questions</span>
            <strong>—</strong>
            <small>Question bank</small>
          </div>

          <div className="admin-stat-card">
            <span className="stat-title">Students</span>
            <strong>—</strong>
            <small>Registered users</small>
          </div>

          <div className="admin-stat-card">
            <span className="stat-title">Quiz Attempts</span>
            <strong>—</strong>
            <small>Total attempts</small>
          </div>

          <div className="admin-stat-card">
            <span className="stat-title">Active Subscriptions</span>
            <strong>—</strong>
            <small>Current subscribers</small>
          </div>

        </section>


        {/* Management */}
        <section className="admin-section">

          <div className="section-heading">
            <div>
              <p className="admin-label">MANAGEMENT</p>
              <h2>Control Overmaths</h2>
            </div>
          </div>


          <div className="admin-management-grid">

            <div className="admin-management-card">
              <div className="management-icon">▣</div>

              <h3>Question Bank</h3>

              <p>
                Search, review and correct questions in the database.
              </p>

              <button>
                Manage Questions →
              </button>
            </div>


            <div className="admin-management-card">
              <div className="management-icon">◈</div>

              <h3>Courses</h3>

              <p>
                Manage the courses available to students.
              </p>

              <button>
                Manage Courses →
              </button>
            </div>


            <div className="admin-management-card">
              <div className="management-icon">♙</div>

              <h3>Students</h3>

              <p>
                View registered students and their activity.
              </p>

              <button>
                Manage Students →
              </button>
            </div>


            <div className="admin-management-card">
              <div className="management-icon">◷</div>

              <h3>Quiz Activity</h3>

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