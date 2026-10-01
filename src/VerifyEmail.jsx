import { Link } from 'react-router-dom'
import logo from './assets/overmaths-logo.png'
import './VerifyEmail.css'

function VerifyEmail() {
  return (
    <div className="verify-page">

      {/* Background decoration */}
      <div className="verify-glow verify-glow-one" />
      <div className="verify-glow verify-glow-two" />

      <main className="verify-container">

        {/* Brand */}
        <div className="verify-brand-top">
          <img
            src={logo}
            alt="Overmaths"
          />

          <span>Smart Exam Practice</span>
        </div>

        {/* Main verification panel */}
        <section className="verify-panel">

          <div className="verify-success-icon">
            <span>✓</span>
          </div>

          <div className="verify-eyebrow">
            ACCOUNT VERIFICATION
          </div>

          <h1>
            Check your email
          </h1>

          <p className="verify-main-text">
            You're one step away from starting your Overmaths
            learning journey.
          </p>

          <p className="verify-description">
            We've sent a verification link to your email address.
            Open your inbox and click the link to activate your
            Overmaths account.
          </p>

          {/* Steps */}
          <div className="verify-process">

            <div className="verify-process-item">
              <div className="verify-number">01</div>

              <div>
                <strong>Open your inbox</strong>
                <p>
                  Check the email address you used to register.
                </p>
              </div>
            </div>

            <div className="verify-line" />

            <div className="verify-process-item">
              <div className="verify-number">02</div>

              <div>
                <strong>Find the Overmaths email</strong>
                <p>
                  Look for the account verification message.
                </p>
              </div>
            </div>

            <div className="verify-line" />

            <div className="verify-process-item">
              <div className="verify-number">03</div>

              <div>
                <strong>Verify your account</strong>
                <p>
                  Click the verification link to activate your account.
                </p>
              </div>
            </div>

          </div>

          {/* Login action */}
          <Link
            to="/login"
            className="verify-login-btn"
          >
            <span className="verify-btn-icon">→</span>
            Continue to Sign In
          </Link>

          {/* Help */}
          <div className="verify-help">

            <div className="verify-help-icon">
              ?
            </div>

            <div>
              <strong>Didn't receive the email?</strong>

              <p>
                Check your spam or junk folder. You can request
                another verification email from the sign-in page.
              </p>
            </div>

          </div>

          <Link
            to="/register"
            className="verify-back-link"
          >
            ← Back to Create Account
          </Link>

        </section>

        <footer className="verify-footer">
          © {new Date().getFullYear()} Overmaths
          <span>•</span>
          Smart Exam Practice
        </footer>

      </main>

    </div>
  )
}

export default VerifyEmail