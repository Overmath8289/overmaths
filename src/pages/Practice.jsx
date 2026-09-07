import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './Practice.css'

function Practice() {
  const navigate = useNavigate()

  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('mixed')
  const [topics, setTopics] = useState([])
  const [questionCount, setQuestionCount] = useState(20)

  const [loadingTopics, setLoadingTopics] = useState(false)
  const [error, setError] = useState('')

  const subjects = [
    'Physics',
    'Mathematics',
    'English',
  ]

  const questionNumbers = [10, 20, 30, 40, 50]

  /*
    Load topics from Supabase whenever
    the student changes subject.
  */
  useEffect(() => {
    const loadTopics = async () => {
      if (!subject) {
        setTopics([])
        setTopic('mixed')
        return
      }

      setLoadingTopics(true)
      setError('')
      setTopic('mixed')

      const { data, error } = await supabase
        .from('questions')
        .select('topic')
        .eq('subject', subject)
        .not('topic', 'is', null)

      if (error) {
        console.error('Error loading topics:', error)
        setError('Unable to load topics. Please try again.')
        setTopics([])
        setLoadingTopics(false)
        return
      }

      /*
        Remove duplicate topic names.
      */
      const uniqueTopics = [
        ...new Set(
          (data || [])
            .map((item) => item.topic?.trim())
            .filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b))

      setTopics(uniqueTopics)
      setLoadingTopics(false)
    }

    loadTopics()
  }, [subject])

  /*
    Start the practice session.
    The selected settings are passed to the Quiz page.
  */
  const handleStart = () => {
    if (!subject) {
      return
    }

    navigate('/quiz', {
      state: {
        subject,
        topic,
        questionCount,
      },
    })
  }

  return (
    <div className="practice-page">

      {/* HEADER */}
      <header className="practice-header">

        <div className="practice-brand">
          <img
            src="/src/assets/overmaths-logo.png"
            alt="Overmaths"
          />
        </div>

        <div className="practice-header-label">
          PRACTICE
        </div>

      </header>


      {/* MAIN */}
      <main className="practice-main">

        {/* INTRO */}
        <section className="practice-intro">

          <p className="practice-eyebrow">
            YOUR PRACTICE SESSION
          </p>

          <h1>
            What do you want
            <span> to practice?</span>
          </h1>

          <p>
            Choose your subject, focus area and how many questions
            you want to answer. Overmaths will handle the rest.
          </p>

        </section>


        {/* SUBJECT */}
        <section className="practice-section">

          <div className="practice-section-heading">

            <span>01</span>

            <div>
              <p>SUBJECT</p>
              <h2>Choose a subject</h2>
            </div>

          </div>


          <div className="subject-grid">

            {subjects.map((item) => (

              <button
                key={item}
                type="button"
                className={`subject-card ${
                  subject === item ? 'selected' : ''
                }`}
                onClick={() => setSubject(item)}
              >

                <span className="subject-mark">
                  {item.charAt(0)}
                </span>

                <span className="subject-name">
                  {item}
                </span>

                <span className="selection-indicator">
                  {subject === item ? '✓' : ''}
                </span>

              </button>

            ))}

          </div>

        </section>


        {/* TOPIC */}
        <section className="practice-section">

          <div className="practice-section-heading">

            <span>02</span>

            <div>
              <p>FOCUS</p>
              <h2>Choose your topic</h2>
            </div>

          </div>


          <div className="topic-select-wrapper">

            <label htmlFor="topic-select">
              PRACTICE TOPIC
            </label>

            <select
              id="topic-select"
              value={topic}
              disabled={!subject || loadingTopics}
              onChange={(event) => setTopic(event.target.value)}
            >

              <option value="mixed">
                Mixed — All {subject || 'subject'} topics
              </option>

              {topics.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}

            </select>

            <span className="select-arrow">
              <svg
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

          </div>


          {!subject && (
            <p className="topic-help">
              Select a subject first to see available topics.
            </p>
          )}

          {loadingTopics && (
            <p className="topic-help">
              Loading available topics...
            </p>
          )}

          {subject && !loadingTopics && topics.length === 0 && (
            <p className="topic-help">
              No topics have been added for this subject yet.
            </p>
          )}

          {error && (
            <p className="topic-error">
              {error}
            </p>
          )}

        </section>


        {/* QUESTION COUNT */}
        <section className="practice-section">

          <div className="practice-section-heading">

            <span>03</span>

            <div>
              <p>SESSION SIZE</p>
              <h2>How many questions?</h2>
            </div>

          </div>


          <div className="question-count-grid">

            {questionNumbers.map((number) => (

              <button
                key={number}
                type="button"
                className={`count-card ${
                  questionCount === number ? 'selected' : ''
                }`}
                onClick={() => setQuestionCount(number)}
              >

                <strong>
                  {number}
                </strong>

                <span>
                  questions
                </span>

              </button>

            ))}

          </div>

        </section>


        {/* SESSION SUMMARY */}
        <section className="practice-summary">

          <div>

            <span>
              YOUR SESSION
            </span>

            <strong>
              {subject || 'Choose a subject'}
            </strong>

            <p>
              {topic === 'mixed'
                ? 'Mixed topics'
                : topic}
              {' · '}
              {questionCount} questions
            </p>

          </div>


          <button
            type="button"
            className="start-practice-button"
            disabled={!subject}
            onClick={handleStart}
          >

            Start Practice

            <svg
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

          </button>

        </section>

      </main>


      {/* FOOTER */}
      <footer className="practice-footer">

        <span>
          © 2026 Overmaths
        </span>

        <span>
          Learn smarter. Prepare better.
        </span>

      </footer>

    </div>
  )
}

export default Practice