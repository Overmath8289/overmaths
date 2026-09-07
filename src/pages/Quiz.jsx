import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function Quiz() {
  const location = useLocation()
  const navigate = useNavigate()

  const {
    subject,
    topic,
    questionCount,
  } = location.state || {}

  const [questions, setQuestions] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (!subject || !questionCount) {
      navigate('/practice')
      return
    }

    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    setLoading(true)
    setError('')

    try {
      let query = supabase
        .from('questions')
        .select(`
          id,
          subject,
          topic,
          question,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_answer
        `)
        .eq('subject', subject)

      if (topic && topic !== 'mixed') {
        query = query.eq('topic', topic)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      if (!data || data.length === 0) {
        setError('No questions were found for this selection.')
        setLoading(false)
        return
      }

      // Shuffle questions
      const shuffled = [...data].sort(() => Math.random() - 0.5)

      // Take only the requested number
      const selectedQuestions = shuffled.slice(
        0,
        Math.min(Number(questionCount), shuffled.length)
      )

      setQuestions(selectedQuestions)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setError('Unable to load questions. Please try again.')
      setLoading(false)
    }
  }

  const handleAnswer = (answer) => {
    if (selectedAnswer !== null) return

    setSelectedAnswer(answer)

    setAnswers((prev) => ({
      ...prev,
      [questions[currentQuestion].id]: answer,
    }))
  }

  const handleNext = () => {
    if (selectedAnswer === null) return

    if (currentQuestion < questions.length - 1) {
      const nextIndex = currentQuestion + 1

      setCurrentQuestion(nextIndex)

      const previousAnswer =
        answers[questions[nextIndex].id] || null

      setSelectedAnswer(previousAnswer)
    } else {
      setFinished(true)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion === 0) return

    const previousIndex = currentQuestion - 1

    setCurrentQuestion(previousIndex)

    const previousAnswer =
      answers[questions[previousIndex].id] || null

    setSelectedAnswer(previousAnswer)
  }

  const getOptionClass = (option) => {
    if (selectedAnswer === null) {
      return ''
    }

    if (option === selectedAnswer) {
      return 'selected'
    }

    return ''
  }

  if (loading) {
    return (
      <div className="quiz-page">
        <div className="quiz-loading">
          <div className="loading-spinner"></div>
          <h2>Preparing your practice session...</h2>
          <p>Fetching your questions.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="quiz-page">
        <div className="quiz-error">
          <h2>Unable to start practice</h2>
          <p>{error}</p>

          <button onClick={() => navigate('/practice')}>
            Back to Practice
          </button>
        </div>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="quiz-page">
        <div className="quiz-complete">
          <div className="complete-icon">
            ✓
          </div>

          <span className="eyebrow">
            PRACTICE COMPLETE
          </span>

          <h1>
            Well done.
          </h1>

          <p>
            You have completed this practice session.
          </p>

          <div className="complete-summary">
            <div>
              <strong>{questions.length}</strong>
              <span>Questions</span>
            </div>

            <div>
              <strong>{Object.keys(answers).length}</strong>
              <span>Answered</span>
            </div>
          </div>

          <button
            className="primary-button"
            onClick={() => navigate('/practice')}
          >
            Practice Again
          </button>
        </div>
      </div>
    )
  }

  const question = questions[currentQuestion]

  const options = [
    {
      key: 'A',
      value: question.option_a,
    },
    {
      key: 'B',
      value: question.option_b,
    },
    {
      key: 'C',
      value: question.option_c,
    },
    {
      key: 'D',
      value: question.option_d,
    },
  ]

  const progress =
    ((currentQuestion + 1) / questions.length) * 100

  return (
    <div className="quiz-page">

      <header className="quiz-header">

        <button
          className="quiz-back"
          onClick={() => navigate('/practice')}
        >
          ←
          <span>Practice</span>
        </button>

        <div className="quiz-brand">
          <img
            src="/src/assets/overmaths-logo.png"
            alt="Overmaths"
          />
        </div>

        <div className="quiz-counter">
          <span>
            {String(currentQuestion + 1).padStart(2, '0')}
          </span>
          <small>
            / {String(questions.length).padStart(2, '0')}
          </small>
        </div>

      </header>

      <main className="quiz-container">

        <div className="quiz-meta">

          <div>
            <span className="quiz-label">
              SUBJECT
            </span>

            <strong>
              {subject}
            </strong>
          </div>

          <div>
            <span className="quiz-label">
              TOPIC
            </span>

            <strong>
              {topic === 'mixed' ? 'Mixed Topics' : topic}
            </strong>
          </div>

        </div>

        <div className="quiz-progress">
          <div
            className="quiz-progress-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <section className="question-card">

          <div className="question-number">
            QUESTION {String(currentQuestion + 1).padStart(2, '0')}
          </div>

          <h1 className="question-text">
            {question.question}
          </h1>

          <div className="options-list">

            {options.map((option) => (

              <button
                key={option.key}
                className={`option ${getOptionClass(option.key)}`}
                onClick={() => handleAnswer(option.key)}
              >

                <span className="option-letter">
                  {option.key}
                </span>

                <span className="option-text">
                  {option.value}
                </span>

              </button>

            ))}

          </div>

        </section>

        <div className="quiz-navigation">

          <button
            className="secondary-button"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          >
            ← Previous
          </button>

          <button
            className="primary-button"
            onClick={handleNext}
            disabled={selectedAnswer === null}
          >
            {currentQuestion === questions.length - 1
              ? 'Finish Practice'
              : 'Next Question →'}
          </button>

        </div>

      </main>

    </div>
  )
}

export default Quiz