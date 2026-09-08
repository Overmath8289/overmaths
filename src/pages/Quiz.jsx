import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function Quiz() {
  const location = useLocation()
  const navigate = useNavigate()

  const {
    subject,
    topic = 'mixed',
    questionCount = 20,
  } = location.state || {}

  const [questions, setQuestions] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    const loadQuestions = async () => {
      if (!subject) {
        setError('No subject was selected.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams({
          subject,
          limit: questionCount,
        })

        if (topic && topic !== 'mixed') {
          params.set('topic', topic)
        }

        const response = await fetch(
          `http://127.0.0.1:5050/api/questions?${params.toString()}`
        )

        const result = await response.json()

        console.log('SUBJECT:', subject)
        console.log('TOPIC:', topic)
        console.log('QUESTIONS FROM PYTHON:', result)

        if (!response.ok) {
          console.error('PYTHON API ERROR:', result)

          setError(
            result?.error ||
              'Unable to load questions. Please try again.'
          )

          setLoading(false)
          return
        }

        const data = result?.questions || []

        if (data.length === 0) {
          setError(
            topic && topic !== 'mixed'
              ? `No questions are available for ${subject} — ${topic}.`
              : `No questions are available for ${subject}.`
          )

          setLoading(false)
          return
        }

        // Randomize the questions so each practice session
        // can feel different.
        const shuffledQuestions = [...data].sort(
          () => Math.random() - 0.5
        )

        const selectedQuestions = shuffledQuestions.slice(
          0,
          Math.min(
            Number(questionCount),
            shuffledQuestions.length
          )
        )

        setQuestions(selectedQuestions)
        setCurrentQuestion(0)
        setSelectedAnswer(null)
        setAnswers({})
        setFinished(false)
        setLoading(false)
      } catch (fetchError) {
        console.error(
          'PYTHON CONNECTION ERROR:',
          fetchError
        )

        setError(
          'Unable to connect to the Overmaths question server. Please make sure the Python backend is running.'
        )

        setLoading(false)
      }
    }

    loadQuestions()
  }, [subject, topic, questionCount])

  const current = questions[currentQuestion]

  const handleAnswer = (answer) => {
    // Do not allow the student to change an answer
    // after selecting one.
    if (selectedAnswer !== null) {
      return
    }

    setSelectedAnswer(answer)

    setAnswers((previous) => ({
      ...previous,
      [current.id]: answer,
    }))
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((previous) => previous + 1)

      const nextQuestion = questions[currentQuestion + 1]

      setSelectedAnswer(
        answers[nextQuestion.id] || null
      )
    } else {
      setFinished(true)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((previous) => previous - 1)

      const previousQuestion =
        questions[currentQuestion - 1]

      setSelectedAnswer(
        answers[previousQuestion.id] || null
      )
    }
  }

  const getOptionClass = (option) => {
    if (selectedAnswer === option) {
      return 'selected'
    }

    return ''
  }

  if (loading) {
    return (
      <div>
        <h2>Loading questions...</h2>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h2>Something went wrong</h2>

        <p>{error}</p>

        <button onClick={() => navigate('/practice')}>
          Back to Practice
        </button>
      </div>
    )
  }

  if (finished) {
    return (
      <div>
        <h1>Practice Complete</h1>

        <p>
          You completed {questions.length} question
          {questions.length !== 1 ? 's' : ''}.
        </p>

        <button onClick={() => navigate('/practice')}>
          Practice Again
        </button>
      </div>
    )
  }

  if (!current) {
    return null
  }

  const options = [
    {
      letter: 'A',
      text: current.option_a,
    },
    {
      letter: 'B',
      text: current.option_b,
    },
    {
      letter: 'C',
      text: current.option_c,
    },
    {
      letter: 'D',
      text: current.option_d,
    },
  ]

  return (
    <div>
      <header>
        <button onClick={() => navigate('/practice')}>
          Exit Practice
        </button>

        <div>
          {subject}
          {topic !== 'mixed' ? ` • ${topic}` : ''}
        </div>

        <div>
          Question {currentQuestion + 1} of {questions.length}
        </div>
      </header>

      <main>
        <section>
          <p>
            Question {currentQuestion + 1}
          </p>

          {/*
            Mathematical rendering will be added here later.
            For now, question_text is displayed directly.
          */}
          <h2>{current.question_text}</h2>

          {current.image_url && (
            <img
              src={current.image_url}
              alt="Question"
            />
          )}

          <div>
            {options.map((option) => (
              <button
                key={option.letter}
                className={getOptionClass(option.letter)}
                onClick={() =>
                  handleAnswer(option.letter)
                }
                disabled={selectedAnswer !== null}
              >
                <span>{option.letter}</span>

                <span>{option.text}</span>
              </button>
            ))}
          </div>
        </section>

        <div>
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          >
            Previous
          </button>

          <button
            onClick={handleNext}
            disabled={selectedAnswer === null}
          >
            {currentQuestion === questions.length - 1
              ? 'Finish'
              : 'Next'}
          </button>
        </div>
      </main>
    </div>
  )
}

export default Quiz